import { apiFetch } from "./api";

// Log one finished downtime session (Deep Read / Word Forge "Done").
// Best-effort — a failed log must never block the UI — but the promise is
// returned so the caller can guard against double-submits (see the Done
// handlers). Resolves either way; never rejects.
export function logActivity(kind) {
    return apiFetch("/activity/log", {
        method: "POST",
        body: JSON.stringify({ kind })
    }).catch(() => {});
}
