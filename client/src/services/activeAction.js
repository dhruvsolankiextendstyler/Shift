import { useSyncExternalStore } from "react";
import { apiFetch } from "./api";

// The task the user has STARTED. Persisted so a started task survives a
// reload and locks the whole app (no nav, only complete/skip) until it's
// resolved. Read at the app root — see FocusLock + App.jsx.
const KEY = "shift_active_action";
// "Not now" on this device: the actionId the user released so the poll won't
// re-lock this same started task. Per-device (localStorage), on purpose.
const DISMISS_KEY = "shift_dismissed_action";

const listeners = new Set();
let cache = read();

// While a device is resolving its own lock (complete → gut-check), the poll
// below must not yank the lock away — it holds until clearActiveAction.
let syncSuspended = false;

function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
        return null;
    }
}

function emit() {
    cache = read();
    listeners.forEach((l) => l());
}

// Another tab starting/clearing an action.
window.addEventListener("storage", emit);

// { actionId, task }
export function startActiveAction(action) {
    syncSuspended = false;
    localStorage.removeItem(DISMISS_KEY);
    localStorage.setItem(KEY, JSON.stringify(action));
    emit();
}

export function clearActiveAction() {
    syncSuspended = false;
    localStorage.removeItem(KEY);
    emit();
}

// Called by the focus lock the moment the user starts resolving, so an
// in-flight poll can't clear the lock out from under the gut-check.
export function suspendSync() {
    syncSuspended = true;
}

// Undo suspendSync — call this if a complete/skip fails, so the poll doesn't
// stay frozen for the rest of the session.
export function resumeSync() {
    syncSuspended = false;
}

// "Not now" — drop the lock on this device without resolving the task. The
// action stays "started" server-side (so it still shows in History to finish
// later), and the poll won't re-lock this device with the same task.
export function dismissActiveAction(actionId) {
    if (actionId) localStorage.setItem(DISMISS_KEY, actionId);
    clearActiveAction();
}

// Poll the server so a focus lock started on one device mirrors onto the
// user's other devices, and releases everywhere once it's resolved.
// ponytail: 8s poll (chatty but simple) — upgrade to websockets/SSE only if
// instant sync or the idle request volume ever becomes a problem.
export function startActionSync() {
    let stopped = false;

    const tick = async () => {
        // Skip while hidden — a backgrounded tab has nothing to update.
        if (stopped || syncSuspended || document.hidden) return;
        const local = read();

        try {
            if (local) {
                // Holding a lock — release it if resolved on another device.
                const res = await apiFetch(`/actions/${local.actionId}`);
                if (stopped || syncSuspended) return;
                if (res.status === 404) {
                    clearActiveAction();
                } else if (res.ok) {
                    const a = await res.json();
                    if (stopped || syncSuspended) return;
                    if (a && a.status !== "started") clearActiveAction();
                }
            } else {
                // Free — pick up a lock another device just started, unless
                // this device already said "not now" to it.
                const res = await apiFetch("/actions/live");
                if (stopped || syncSuspended) return;
                if (res.ok) {
                    const a = await res.json();
                    if (stopped || syncSuspended || read()) return;
                    const dismissed = localStorage.getItem(DISMISS_KEY);
                    if (a && a.taskId && a._id !== dismissed) {
                        startActiveAction({
                            actionId: a._id,
                            task: a.taskId
                        });
                    }
                }
            }
        } catch {
            // network hiccup — try again next tick
        }
    };

    const id = setInterval(tick, 8000);
    // Catch up the moment the tab comes back to the foreground.
    const onVisible = () => {
        if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    tick();

    return () => {
        stopped = true;
        clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
    };
}

export function useActiveAction() {
    return useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => cache
    );
}
