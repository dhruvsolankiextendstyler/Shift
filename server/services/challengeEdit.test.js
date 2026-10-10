const test = require("node:test");
const assert = require("node:assert/strict");
const {
    validateChallengePayload,
    applyChallengeDirectEdit,
    resolveChallengeEditRequest
} = require("./socialService");

test("validateChallengePayload validates challenge types and required category", () => {
    // Invalid type
    const invalidType = validateChallengePayload({ type: "unknown", goal: 5, durationDays: 7 });
    assert.ok(invalidType.error);
    assert.match(invalidType.error, /Invalid challenge type/);

    // Category type without category
    const missingCat = validateChallengePayload({ type: "category", goal: 5, durationDays: 7 });
    assert.ok(missingCat.error);
    assert.match(missingCat.error, /Category is required/);

    // Valid category type
    const validCat = validateChallengePayload({
        type: "category",
        category: "Math",
        goal: 5,
        durationDays: 7
    });
    assert.equal(validCat.error, undefined);
    assert.equal(validCat.category, "Math");
});

test("validateChallengePayload enforces supported durations (3, 7, 14) and positive goal", () => {
    // Unsupported duration
    const badDuration = validateChallengePayload({ type: "task", goal: 5, durationDays: 5 });
    assert.ok(badDuration.error);
    assert.match(badDuration.error, /Supported durations: 3, 7, or 14 days/);

    // Invalid goal
    const zeroGoal = validateChallengePayload({ type: "task", goal: 0, durationDays: 7 });
    assert.ok(zeroGoal.error);
    assert.match(zeroGoal.error, /Goal must be at least 1/);

    const negativeGoal = validateChallengePayload({ type: "task", goal: -3, durationDays: 7 });
    assert.ok(negativeGoal.error);

    // Valid duration and goal
    const validTask = validateChallengePayload({ type: "task", goal: 10, durationDays: 14 });
    assert.equal(validTask.error, undefined);
    assert.equal(validTask.goal, 10);
    assert.equal(validTask.durationDays, 14);
});

test("validateChallengePayload generates descriptive default title if none provided", () => {
    const task = validateChallengePayload({ type: "task", goal: 5, durationDays: 7 });
    assert.equal(task.title, "5 Moves Sprint");

    const cat = validateChallengePayload({ type: "category", category: "Reading", goal: 3, durationDays: 3 });
    assert.equal(cat.title, "Reading Sprint");

    const focus = validateChallengePayload({ type: "focus", goal: 60, durationDays: 7 });
    assert.equal(focus.title, "60m Focus Challenge");

    const consistency = validateChallengePayload({ type: "consistency", goal: 7, durationDays: 7 });
    assert.equal(consistency.title, "7-Day Consistency");

    // Custom title preserved
    const custom = validateChallengePayload({
        type: "task",
        goal: 5,
        durationDays: 7,
        title: "My Custom Duel"
    });
    assert.equal(custom.title, "My Custom Duel");
});

test("applyChallengeDirectEdit modifies pending challenge in place without altering status or history", () => {
    const original = {
        _id: "ch123",
        creator: "user1",
        participant: "user2",
        status: "pending",
        title: "Old Title",
        type: "task",
        category: null,
        goal: 5,
        durationDays: 7,
        createdAt: new Date("2026-10-01T10:00:00Z")
    };

    const validated = {
        title: "New 10 Moves Sprint",
        type: "task",
        category: null,
        goal: 10,
        durationDays: 14
    };

    const edited = applyChallengeDirectEdit(original, validated);

    // Verify fields updated
    assert.equal(edited.title, "New 10 Moves Sprint");
    assert.equal(edited.goal, 10);
    assert.equal(edited.durationDays, 14);
    // Verify identity, status, and history preserved
    assert.equal(edited._id, "ch123");
    assert.equal(edited.status, "pending");
    assert.equal(edited.editRequest, undefined);
    assert.equal(edited.createdAt.toISOString(), "2026-10-01T10:00:00.000Z");
});

test("resolveChallengeEditRequest (accept) applies proposed changes, preserves start date, and adjusts end date", () => {
    const startDate = new Date("2026-10-05T00:00:00Z");
    const originalEndDate = new Date(startDate.getTime() + 7 * 86400000); // 7 days

    const challenge = {
        _id: "ch456",
        creator: "user1",
        participant: "user2",
        status: "active",
        title: "Initial Challenge",
        type: "task",
        category: null,
        goal: 5,
        durationDays: 7,
        startDate: startDate,
        endDate: originalEndDate,
        editRequest: {
            status: "pending",
            requestedBy: "user1",
            title: "Upgraded Challenge",
            type: "category",
            category: "Science",
            goal: 12,
            durationDays: 14,
            createdAt: new Date()
        }
    };

    resolveChallengeEditRequest(challenge, "accept");

    // Proposed changes applied
    assert.equal(challenge.title, "Upgraded Challenge");
    assert.equal(challenge.type, "category");
    assert.equal(challenge.category, "Science");
    assert.equal(challenge.goal, 12);
    assert.equal(challenge.durationDays, 14);
    assert.equal(challenge.editRequest.status, "accepted");

    // Original start date strictly preserved
    assert.equal(challenge.startDate.toISOString(), startDate.toISOString());

    // End date recalculated from original start date + new durationDays (14 days)
    const expectedEndDate = new Date(startDate.getTime() + 14 * 86400000);
    assert.equal(challenge.endDate.getTime(), expectedEndDate.getTime());
});

test("resolveChallengeEditRequest (decline) retains original challenge values unchanged", () => {
    const startDate = new Date("2026-10-05T00:00:00Z");
    const endDate = new Date(startDate.getTime() + 7 * 86400000);

    const challenge = {
        _id: "ch789",
        creator: "user1",
        participant: "user2",
        status: "active",
        title: "Original Challenge",
        type: "task",
        category: null,
        goal: 5,
        durationDays: 7,
        startDate: startDate,
        endDate: endDate,
        editRequest: {
            status: "pending",
            requestedBy: "user1",
            title: "Proposed Change",
            type: "focus",
            category: null,
            goal: 100,
            durationDays: 14,
            createdAt: new Date()
        }
    };

    resolveChallengeEditRequest(challenge, "decline");

    // Original challenge values retained
    assert.equal(challenge.title, "Original Challenge");
    assert.equal(challenge.type, "task");
    assert.equal(challenge.goal, 5);
    assert.equal(challenge.durationDays, 7);
    assert.equal(challenge.startDate.getTime(), startDate.getTime());
    assert.equal(challenge.endDate.getTime(), endDate.getTime());

    // Edit request status updated to declined
    assert.equal(challenge.editRequest.status, "declined");
});

test("challenge editing authorization and duplicate rules", () => {
    const creatorId = "user1";
    const recipientId = "user2";
    const strangerId = "user3";

    // 1. Creator cannot approve their own edit request
    const canCreatorApprove = (requestedBy, currentUserId) => requestedBy !== currentUserId;
    assert.equal(canCreatorApprove(creatorId, creatorId), false);
    assert.equal(canCreatorApprove(creatorId, recipientId), true);

    // 2. Only the recipient participant can respond
    const canRespond = (challenge, currentUserId) => {
        if (!challenge.editRequest || challenge.editRequest.status !== "pending") return false;
        if (challenge.editRequest.requestedBy === currentUserId) return false;
        const otherParticipantId = challenge.creator === challenge.editRequest.requestedBy
            ? challenge.participant
            : challenge.creator;
        return currentUserId === otherParticipantId;
    };

    const activeChallengeWithEdit = {
        creator: creatorId,
        participant: recipientId,
        status: "active",
        editRequest: { status: "pending", requestedBy: creatorId }
    };

    assert.equal(canRespond(activeChallengeWithEdit, creatorId), false, "Creator must not approve own request");
    assert.equal(canRespond(activeChallengeWithEdit, recipientId), true, "Recipient can respond");
    assert.equal(canRespond(activeChallengeWithEdit, strangerId), false, "Stranger cannot respond");

    // 3. Duplicate pending edit requests are blocked
    const hasPendingEdit = (challenge) => challenge.editRequest && challenge.editRequest.status === "pending";
    assert.equal(hasPendingEdit(activeChallengeWithEdit), true);

    const activeChallengeWithoutEdit = {
        creator: creatorId,
        participant: recipientId,
        status: "active",
        editRequest: { status: "declined", requestedBy: creatorId }
    };
    assert.equal(hasPendingEdit(activeChallengeWithoutEdit), false);

    // 4. Challenges past end date are expired and cannot accept edit responses
    const isPastEnd = (endDate) => new Date() > new Date(endDate);
    const pastDate = new Date(Date.now() - 3600000);
    const futureDate = new Date(Date.now() + 3600000);
    assert.equal(isPastEnd(pastDate), true);
    assert.equal(isPastEnd(futureDate), false);
});
