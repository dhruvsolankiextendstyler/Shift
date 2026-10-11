const test = require("node:test");
const assert = require("node:assert/strict");
const {
    dayKey,
    actionFocusMinutes,
    evaluateChallengeState
} = require("./socialService");

test("dayKey formats dates consistently as YYYY-MM-DD", () => {
    const d = new Date("2026-10-07T12:00:00Z");
    const key = dayKey(d);
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test("actionFocusMinutes returns actual focused time, never the estimate", () => {
    // Core bug fix: estimated 135 min but only 5 min actually focused.
    assert.equal(actionFocusMinutes({ actualMinutes: 5, taskId: { estimatedTime: 135 } }), 5);
    // Zero focused is a real, known value — not treated as unknown.
    assert.equal(actionFocusMinutes({ actualMinutes: 0, taskId: { estimatedTime: 60 } }), 0);
    // Unknown (null / missing) contributes nothing — no estimate fallback.
    assert.equal(actionFocusMinutes({ actualMinutes: null, taskId: { estimatedTime: 90 } }), 0);
    assert.equal(actionFocusMinutes({ taskId: { estimatedTime: 90 } }), 0);
    // Garbage is ignored.
    assert.equal(actionFocusMinutes({ actualMinutes: -4 }), 0);
    assert.equal(actionFocusMinutes({ actualMinutes: "nope" }), 0);
});

test("evaluateChallengeState respects pending, declined, and cancelled states", () => {
    const pendingChallenge = { status: "pending" };
    assert.deepEqual(evaluateChallengeState(pendingChallenge, 5, 5), {
        status: "pending",
        outcome: null
    });

    const declinedChallenge = { status: "declined" };
    assert.deepEqual(evaluateChallengeState(declinedChallenge, 0, 0), {
        status: "declined",
        outcome: "declined"
    });

    const cancelledChallenge = { status: "cancelled" };
    assert.deepEqual(evaluateChallengeState(cancelledChallenge, 0, 0), {
        status: "cancelled",
        outcome: "cancelled"
    });
});

test("evaluateChallengeState detects both participants completing", () => {
    const challenge = {
        status: "active",
        goal: 10,
        endDate: new Date(Date.now() + 86400000) // tomorrow
    };

    const res = evaluateChallengeState(challenge, 10, 12);
    assert.equal(res.status, "completed");
    assert.equal(res.outcome, "both_completed");
});

test("evaluateChallengeState keeps ongoing challenge active if not past end date", () => {
    const challenge = {
        status: "active",
        goal: 10,
        endDate: new Date(Date.now() + 86400000 * 3) // 3 days remaining
    };

    const res = evaluateChallengeState(challenge, 4, 7);
    assert.equal(res.status, "active");
    assert.equal(res.outcome, null);
});

test("evaluateChallengeState handles time expiration and winners", () => {
    const pastChallenge = {
        status: "active",
        goal: 10,
        endDate: new Date(Date.now() - 3600000) // 1 hour ago
    };

    // Creator won
    const res1 = evaluateChallengeState(pastChallenge, 10, 8);
    assert.equal(res1.status, "completed");
    assert.equal(res1.outcome, "creator_won");

    // Participant won
    const res2 = evaluateChallengeState(pastChallenge, 6, 11);
    assert.equal(res2.status, "completed");
    assert.equal(res2.outcome, "participant_won");

    // Neither finished before time expired
    const res3 = evaluateChallengeState(pastChallenge, 5, 7);
    assert.equal(res3.status, "expired");
    assert.equal(res3.outcome, "expired");
});
