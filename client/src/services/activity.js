import { apiFetch } from "./api";

// Fire-and-forget: log one finished downtime session (Deep Read / Word Forge
// "Done"). Best-effort — a failed log must never block closing the sheet.
export function logActivity(kind) {
    apiFetch("/activity/log", {
        method: "POST",
        body: JSON.stringify({ kind })
    }).catch(() => {});
}
