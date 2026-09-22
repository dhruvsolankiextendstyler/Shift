import { useSyncExternalStore } from "react";

// The task the user has STARTED. Persisted so a started task survives a
// reload and locks the whole app (no nav, only complete/skip) until it's
// resolved. Read at the app root — see FocusLock + App.jsx.
const KEY = "shift_active_action";

const listeners = new Set();
let cache = read();

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
    localStorage.setItem(KEY, JSON.stringify(action));
    emit();
}

export function clearActiveAction() {
    localStorage.removeItem(KEY);
    emit();
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
