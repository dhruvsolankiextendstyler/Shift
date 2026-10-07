import { useSyncExternalStore } from "react";
import { apiFetch } from "./api";

const QUEUE_KEY = "shift_offline_queue";

let onlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;
const statusListeners = new Set();
const syncListeners = new Set();

function emitStatus() {
    statusListeners.forEach((fn) => fn());
}

function emitSync(result) {
    syncListeners.forEach((fn) => fn(result));
}

if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        onlineStatus = true;
        emitStatus();
        flushOfflineQueue();
    });

    window.addEventListener("offline", () => {
        onlineStatus = false;
        emitStatus();
    });
}

export function isOnline() {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function useOnlineStatus() {
    return useSyncExternalStore(
        (listener) => {
            statusListeners.add(listener);
            return () => statusListeners.delete(listener);
        },
        () => onlineStatus
    );
}

export function getOfflineQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveOfflineQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
        console.error("Failed to save offline queue", err);
    }
}

export function queueOfflineAction(action) {
    const queue = getOfflineQueue();
    const item = {
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        queuedAt: new Date().toISOString(),
        ...action
    };
    queue.push(item);
    saveOfflineQueue(queue);
    emitStatus();
    return item;
}

let isFlushing = false;

export async function flushOfflineQueue() {
    if (isFlushing || !isOnline()) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    isFlushing = true;
    const remaining = [];
    let syncedCount = 0;

    for (const item of queue) {
        try {
            const res = await apiFetch(item.endpoint, {
                method: item.method || "POST",
                body: item.body ? JSON.stringify(item.body) : undefined
            });

            if (res.ok) {
                syncedCount++;
            } else if (res.status >= 400 && res.status < 500 && res.status !== 408) {
                // Drop client errors that cannot succeed on retry (e.g. 404 or bad payload)
                console.warn("Dropping invalid offline action:", item, res.status);
            } else {
                remaining.push(item);
            }
        } catch {
            // Network still unstable, keep in queue
            remaining.push(item);
            break;
        }
    }

    saveOfflineQueue(remaining);
    isFlushing = false;

    if (syncedCount > 0) {
        emitSync({ count: syncedCount, remaining: remaining.length });
    }
}

export function onOfflineSync(callback) {
    syncListeners.add(callback);
    return () => syncListeners.delete(callback);
}
