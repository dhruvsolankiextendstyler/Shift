// Focused Task Timer — 5-Minute Break System
// Core rules:
// - breaksAllowed = Math.floor(taskDurationMinutes / 25)
// - Break is ALWAYS exactly 5 minutes (300 seconds)
// - Break becomes available after 25 min (1500s) of ACTIVE WORK
// - 1-minute grace period (25:00 - 25:59): manual "Take a 5 min break"
// - At 26:00 (1560s) of active work: automatic break starts if not taken/skipped
// - Pausing the task pauses active work accumulation & auto-break countdown
// - Break time NEVER counts as work or toward task completion
// - Survives page refresh and tab switching using timestamp-anchored tracking

export const BREAK_DURATION_SECONDS = 300; // 5 minutes
export const WORK_BLOCK_SECONDS = 1500; // 25 minutes
export const AUTO_BREAK_GRACE_SECONDS = 60; // 1 minute (triggers at 26:00)

export function getBreaksAllowed(durationMinutes) {
    if (!durationMinutes || typeof durationMinutes !== "number") return 0;
    return Math.floor(durationMinutes / 25);
}

export function getStorageKey(actionId) {
    return `shift_task_timer_${actionId}`;
}

export function loadTimerState(actionId, fallbackStartedAt) {
    if (!actionId) return null;
    const key = getStorageKey(actionId);
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const data = JSON.parse(raw);
            return data;
        }
    } catch {
        /* storage read failed */
    }

    // Default initial state anchored to action startedAt
    const startMs = fallbackStartedAt ? new Date(fallbackStartedAt).getTime() : Date.now();
    const initial = {
        actionId,
        accumulatedActiveSeconds: 0,
        lastActiveStart: startMs,
        status: "WORKING", // "WORKING" | "PAUSED" | "BREAK"
        currentBreakNumber: 0,
        breaksTaken: [],
        breaksSkipped: [],
        breakStartTime: null
    };

    saveTimerState(actionId, initial);
    return initial;
}

export function saveTimerState(actionId, state) {
    if (!actionId || !state) return;
    try {
        localStorage.setItem(getStorageKey(actionId), JSON.stringify(state));
    } catch {
        /* storage write failed */
    }
}

export function clearTimerState(actionId) {
    if (!actionId) return;
    try {
        localStorage.removeItem(getStorageKey(actionId));
    } catch {
        /* storage remove failed */
    }
}

// Computes current active work seconds accurately anchored by timestamps
export function calculateActiveWorkSeconds(state, nowMs = Date.now()) {
    if (!state) return 0;
    let total = state.accumulatedActiveSeconds || 0;
    if (state.status === "WORKING" && state.lastActiveStart) {
        const currentSegment = Math.max(0, (nowMs - state.lastActiveStart) / 1000);
        total += currentSegment;
    }
    return total;
}

// Computes remaining seconds for the active 5-minute break
export function calculateRemainingBreakSeconds(state, nowMs = Date.now()) {
    if (!state || state.status !== "BREAK" || !state.breakStartTime) return 0;
    const elapsed = Math.max(0, (nowMs - state.breakStartTime) / 1000);
    return Math.max(0, BREAK_DURATION_SECONDS - elapsed);
}

// Determines if any break is eligible or overdue for automatic trigger
export function checkBreakEligibility(activeSeconds, breaksAllowed, breaksTaken = [], breaksSkipped = []) {
    if (breaksAllowed <= 0) {
        return { isEligible: false, isAutoTrigger: false, breakNumber: 0 };
    }

    // Look for the next unused break number (1-indexed)
    for (let k = 1; k <= breaksAllowed; k++) {
        if (breaksTaken.includes(k) || breaksSkipped.includes(k)) {
            continue;
        }

        const threshold = k * WORK_BLOCK_SECONDS;
        const autoThreshold = threshold + AUTO_BREAK_GRACE_SECONDS;

        if (activeSeconds >= autoThreshold) {
            return {
                isEligible: true,
                isAutoTrigger: true,
                breakNumber: k,
                threshold,
                autoThreshold
            };
        } else if (activeSeconds >= threshold) {
            return {
                isEligible: true,
                isAutoTrigger: false,
                breakNumber: k,
                threshold,
                autoThreshold
            };
        } else {
            // Future break not reached yet
            break;
        }
    }

    return { isEligible: false, isAutoTrigger: false, breakNumber: 0 };
}

// Dispatches system/browser notification if permission granted
export function notifyUser(title, body) {
    try {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification(title, {
                    body,
                    icon: "/favicon.ico"
                });
            }
        }
    } catch {
        /* notification failed or blocked */
    }
}
