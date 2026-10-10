import { apiFetch, registerCacheClearHandler } from "./api";

export async function fetchFriends() {
    const res = await apiFetch("/friends");
    if (!res.ok) throw new Error("Failed to fetch friends");
    return res.json();
}

export async function searchUsers(q) {
    const res = await apiFetch(`/friends/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
}

export async function sendFriendRequest({ recipientId, email }) {
    const res = await apiFetch("/friends/request", {
        method: "POST",
        body: JSON.stringify({ recipientId, email })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send friend request");
    }
    return res.json();
}

export async function respondFriendRequest(requestId, action) {
    const res = await apiFetch(`/friends/request/${requestId}`, {
        method: "PUT",
        body: JSON.stringify({ action })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to respond to request");
    }
    const result = await res.json();
    refreshSocialCount();
    return result;
}

export async function removeFriend(friendId) {
    const res = await apiFetch(`/friends/${friendId}`, {
        method: "DELETE"
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove friend");
    }
    return res.json();
}

export async function fetchFriendProgress(friendId) {
    const res = await apiFetch(`/friends/${friendId}/progress`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch friend progress");
    }
    return res.json();
}

export async function fetchChallenges() {
    const res = await apiFetch("/challenges");
    if (!res.ok) throw new Error("Failed to fetch challenges");
    return res.json();
}

export async function fetchChallengeDetail(id) {
    const res = await apiFetch(`/challenges/${id}`);
    if (!res.ok) throw new Error("Failed to challenge details");
    return res.json();
}

export async function createChallenge(payload) {
    const res = await apiFetch("/challenges", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create challenge");
    }
    return res.json();
}

export async function respondChallenge(id, action) {
    const res = await apiFetch(`/challenges/${id}/respond`, {
        method: "PUT",
        body: JSON.stringify({ action })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to respond to challenge");
    }
    const result = await res.json();
    refreshSocialCount();
    return result;
}

export async function cancelChallenge(id) {
    const res = await apiFetch(`/challenges/${id}`, {
        method: "DELETE"
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel challenge");
    }
    return res.json();
}

// -------------------------------------------------------------
// Actionable Pending Notifications Store & Subscriber Pattern
// -------------------------------------------------------------
const SOCIAL_COUNT_STORAGE_KEY = "shift_social_count";

function getInitialCount() {
    try {
        const val = localStorage.getItem(SOCIAL_COUNT_STORAGE_KEY);
        if (val !== null) {
            const parsed = parseInt(val, 10);
            return !isNaN(parsed) && parsed > 0 ? parsed : 0;
        }
    } catch {}
    return 0;
}

const listeners = new Set();
let cachedCount = getInitialCount();
let inFlightRefresh = null;

export function clearSocialCache() {
    cachedCount = 0;
    try {
        localStorage.removeItem(SOCIAL_COUNT_STORAGE_KEY);
    } catch {}
    listeners.forEach((fn) => {
        try {
            fn(0);
        } catch {}
    });
}
registerCacheClearHandler(clearSocialCache);

export function subscribeSocialCount(listener) {
    listeners.add(listener);
    listener(cachedCount);
    return () => listeners.delete(listener);
}

export function updateSocialCount(count) {
    const validCount = typeof count === "number" && !isNaN(count) ? Math.max(0, count) : 0;
    if (cachedCount !== validCount) {
        cachedCount = validCount;
        try {
            localStorage.setItem(SOCIAL_COUNT_STORAGE_KEY, String(cachedCount));
        } catch {}
        listeners.forEach((fn) => {
            try {
                fn(cachedCount);
            } catch (err) {
                console.error("Error in social count listener:", err);
            }
        });
    }
}

export async function refreshSocialCount() {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
        try {
            // First attempt ultra-fast dedicated count endpoint
            const countRes = await apiFetch("/friends/badge-count");
            if (countRes.ok) {
                const countData = await countRes.json();
                const total = typeof countData?.count === "number" ? Math.max(0, countData.count) : 0;
                updateSocialCount(total);
                return total;
            }
        } catch {
            // Fall back to full queries if dedicated route is not reachable
        }

        try {
            const [friendsRes, challengesRes] = await Promise.all([
                fetchFriends(),
                fetchChallenges()
            ]);
            const incomingFriends = Array.isArray(friendsRes?.incoming)
                ? friendsRes.incoming.length
                : 0;
            const pendingChallenges = Array.isArray(challengesRes?.pending)
                ? challengesRes.pending.filter((c) => !c.userIsCreator).length
                : 0;
            const total = incomingFriends + pendingChallenges;
            updateSocialCount(total);
            return total;
        } catch {
            return cachedCount;
        } finally {
            inFlightRefresh = null;
        }
    })();

    return inFlightRefresh;
}

