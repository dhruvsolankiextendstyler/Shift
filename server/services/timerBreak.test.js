const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Mirror pure logic from timerBreak.js to test in Node test runner
const BREAK_DURATION_SECONDS = 300;
const WORK_BLOCK_SECONDS = 1500;
const AUTO_BREAK_GRACE_SECONDS = 60;
const FOCUS_SESSION_SECONDS = 300;
const NOT_THIS_WINDOW_SECONDS = 15;

function calculateRemainingFocusSession(activeSeconds) {
    return Math.max(0, FOCUS_SESSION_SECONDS - Math.max(0, activeSeconds));
}

function isNotThisEligible(activeSeconds) {
    return (activeSeconds || 0) < NOT_THIS_WINDOW_SECONDS;
}

function calculateRemainingNotThisSeconds(activeSeconds) {
    return Math.max(0, Math.ceil(NOT_THIS_WINDOW_SECONDS - Math.max(0, activeSeconds)));
}

function formatTimeMMSS(totalSeconds) {
    const s = Math.round(Math.max(0, totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getBreaksAllowed(durationMinutes) {
    if (!durationMinutes || typeof durationMinutes !== "number") return 0;
    return Math.floor(durationMinutes / 25);
}

function calculateActiveWorkSeconds(state, nowMs = Date.now()) {
    if (!state) return 0;
    let total = state.accumulatedActiveSeconds || 0;
    if (state.status === "WORKING" && state.lastActiveStart) {
        const currentSegment = Math.max(0, (nowMs - state.lastActiveStart) / 1000);
        total += currentSegment;
    }
    return total;
}

function calculateRemainingBreakSeconds(state, nowMs = Date.now()) {
    if (!state || state.status !== "BREAK" || !state.breakStartTime) return 0;
    const elapsed = Math.max(0, (nowMs - state.breakStartTime) / 1000);
    return Math.max(0, BREAK_DURATION_SECONDS - elapsed);
}

function checkBreakEligibility(activeSeconds, breaksAllowed, breaksTaken = [], breaksSkipped = []) {
    if (breaksAllowed <= 0) {
        return { isEligible: false, isAutoTrigger: false, breakNumber: 0 };
    }

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
            break;
        }
    }

    return { isEligible: false, isAutoTrigger: false, breakNumber: 0 };
}

describe("Focused Task Timer — 5-Minute Break System", () => {
    it("correctly computes breaksAllowed for various task durations", () => {
        assert.equal(getBreaksAllowed(15), 0);
        assert.equal(getBreaksAllowed(20), 0);
        assert.equal(getBreaksAllowed(25), 1);
        assert.equal(getBreaksAllowed(30), 1);
        assert.equal(getBreaksAllowed(49), 1);
        assert.equal(getBreaksAllowed(50), 2);
        assert.equal(getBreaksAllowed(60), 2);
        assert.equal(getBreaksAllowed(75), 3);
        assert.equal(getBreaksAllowed(90), 3);
        assert.equal(getBreaksAllowed(100), 4);
    });

    it("does not offer breaks prior to 25 minutes of active work", () => {
        const res = checkBreakEligibility(1499, 1, [], []);
        assert.equal(res.isEligible, false);
        assert.equal(res.isAutoTrigger, false);
    });

    it("makes break eligible at 25:00 without auto-triggering", () => {
        const res = checkBreakEligibility(1500, 1, [], []);
        assert.equal(res.isEligible, true);
        assert.equal(res.isAutoTrigger, false);
        assert.equal(res.breakNumber, 1);
    });

    it("grace period: 25:30 is still manual break eligibility", () => {
        const res = checkBreakEligibility(1530, 2, [], []);
        assert.equal(res.isEligible, true);
        assert.equal(res.isAutoTrigger, false);
        assert.equal(res.breakNumber, 1);
    });

    it("auto-triggers break at exactly 26:00 of active work if unused", () => {
        const res = checkBreakEligibility(1560, 2, [], []);
        assert.equal(res.isEligible, true);
        assert.equal(res.isAutoTrigger, true);
        assert.equal(res.breakNumber, 1);
    });

    it("respects skipped breaks and waits until next 25-min milestone", () => {
        // Break 1 skipped
        const resBefore50 = checkBreakEligibility(2800, 2, [], [1]);
        assert.equal(resBefore50.isEligible, false);

        // At 50:00 (3000s)
        const resAt50 = checkBreakEligibility(3000, 2, [], [1]);
        assert.equal(resAt50.isEligible, true);
        assert.equal(resAt50.isAutoTrigger, false);
        assert.equal(resAt50.breakNumber, 2);

        // At 51:00 (3060s)
        const resAt51 = checkBreakEligibility(3060, 2, [], [1]);
        assert.equal(resAt51.isEligible, true);
        assert.equal(resAt51.isAutoTrigger, true);
        assert.equal(resAt51.breakNumber, 2);
    });

    it("measures active work accurately using timestamps and ignores pause duration", () => {
        const start = 1000000;
        const state = {
            accumulatedActiveSeconds: 120, // 2 minutes from earlier segments
            lastActiveStart: start,
            status: "WORKING"
        };
        // 30 seconds later
        const active = calculateActiveWorkSeconds(state, start + 30000);
        assert.equal(active, 150);

        // Paused state: time moves forward 60 seconds, but active work does not advance
        const pausedState = {
            accumulatedActiveSeconds: 150,
            lastActiveStart: null,
            status: "PAUSED"
        };
        const activeWhilePaused = calculateActiveWorkSeconds(pausedState, start + 90000);
        assert.equal(activeWhilePaused, 150);
    });

    it("tracks 5-minute break countdown correctly and finishes at 300s", () => {
        const breakStart = 2000000;
        const breakState = {
            status: "BREAK",
            breakStartTime: breakStart
        };

        // At start: 300s remaining
        assert.equal(calculateRemainingBreakSeconds(breakState, breakStart), 300);

        // 120s into break: 180s remaining
        assert.equal(calculateRemainingBreakSeconds(breakState, breakStart + 120000), 180);

        // After 300s: 0s remaining (capped at 0)
        assert.equal(calculateRemainingBreakSeconds(breakState, breakStart + 350000), 0);
    });

    it("5-minute focus session timer counts down from 300s to 0s", () => {
        assert.equal(calculateRemainingFocusSession(0), 300);
        assert.equal(formatTimeMMSS(calculateRemainingFocusSession(0)), "5:00");
        assert.equal(calculateRemainingFocusSession(30), 270);
        assert.equal(formatTimeMMSS(calculateRemainingFocusSession(30)), "4:30");
        assert.equal(calculateRemainingFocusSession(300), 0);
        assert.equal(formatTimeMMSS(calculateRemainingFocusSession(300)), "0:00");
        // Beyond 5 minutes, stays at 0 (does not go negative)
        assert.equal(calculateRemainingFocusSession(400), 0);
    });

    it("Not This 15-second eligibility window works accurately with pausing", () => {
        // Active work = 0s -> eligible
        assert.equal(isNotThisEligible(0), true);
        assert.equal(calculateRemainingNotThisSeconds(0), 15);

        // Active work = 8s -> eligible, 7s remaining
        assert.equal(isNotThisEligible(8), true);
        assert.equal(calculateRemainingNotThisSeconds(8), 7);

        // Paused at 8s: active work stays 8s, remains eligible
        const pausedState = {
            accumulatedActiveSeconds: 8,
            lastActiveStart: null,
            status: "PAUSED"
        };
        const activeWhilePaused = calculateActiveWorkSeconds(pausedState, 99999999);
        assert.equal(activeWhilePaused, 8);
        assert.equal(isNotThisEligible(activeWhilePaused), true);
        assert.equal(calculateRemainingNotThisSeconds(activeWhilePaused), 7);

        // Active work = 14.9s -> eligible
        assert.equal(isNotThisEligible(14.9), true);

        // Active work = 15s -> disabled!
        assert.equal(isNotThisEligible(15), false);
        assert.equal(calculateRemainingNotThisSeconds(15), 0);

        // Active work > 15s -> disabled
        assert.equal(isNotThisEligible(30), false);
        assert.equal(calculateRemainingNotThisSeconds(30), 0);
    });
});
