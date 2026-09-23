import { useSyncExternalStore } from "react";
import { apiFetch } from "./api";

// The task the user has STARTED. Persisted so a started task survives a
// reload and locks the whole app (no nav, only complete/skip) until it's
// resolved. Read at the app root — see FocusLock + App.jsx.
const KEY = "shift_active_action";

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

// Poll the server so a focus lock started on one device mirrors onto the
// user's other devices, and releases everywhere once it's resolved.
// ponytail: 8s poll (chatty but simple) — upgrade to websockets/SSE only if
// instant sync or the idle request volume ever becomes a problem.
export function startActionSync() {
    let stopped = false;

    const tick = async () => {
        if (stopped || syncSuspended) return;
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
                // Free — pick up a lock another device just started.
                const res = await apiFetch("/actions/live");
                if (stopped || syncSuspended) return;
                if (res.ok) {
                    const a = await res.json();
                    if (stopped || syncSuspended || read()) return;
                    if (a && a.taskId) {
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
    tick();

    return () => {
        stopped = true;
        clearInterval(id);
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
