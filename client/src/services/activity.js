import { apiFetch } from "./api";

// Log one finished downtime session (Deep Read / Word Forge "Done"): creates a
// dated Activity record on the server. `title` is the topic/word so it can show
// in the History calendar's day detail. Best-effort — a failed log must never
// block the UI — but the promise is returned so the caller can guard against
// double-submits (see the Done handlers). Resolves either way; never rejects.
export function logActivity(kind, title) {
    return apiFetch("/activity/log", {
        method: "POST",
        body: JSON.stringify({ kind, title })
    }).catch(() => {});
}
