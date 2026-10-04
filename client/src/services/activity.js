import { apiFetch } from "./api";
import { isOnline, queueOfflineAction } from "./offline";

// Log one finished downtime session (Deep Read / Word Forge "Done"): creates a
// dated Activity record on the server. `title` is the topic/word so it can show
// in the History calendar's day detail. Best-effort — if offline, queues for sync
// once connection returns.
export function logActivity(kind, title) {
    const payload = { kind, title };
    if (!isOnline()) {
        queueOfflineAction({
            endpoint: "/activity/log",
            method: "POST",
            body: payload
        });
        return Promise.resolve();
    }
    return apiFetch("/activity/log", {
        method: "POST",
        body: JSON.stringify(payload)
    }).catch(() => {
        queueOfflineAction({
            endpoint: "/activity/log",
            method: "POST",
            body: payload
        });
    });
}

