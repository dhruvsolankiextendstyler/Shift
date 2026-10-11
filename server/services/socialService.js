const Action = require("../models/Action");
const Activity = require("../models/Activity");

function dayKey(d) {
    const x = new Date(d);
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${x.getFullYear()}-${m}-${day}`;
}

// Actual focused minutes for a completed action — the single source of truth
// for "time spent". Returns the timer-measured actualMinutes, or 0 when it's
// unknown (null). We deliberately do NOT fall back to the task's estimatedTime:
// counting an estimate as time actually focused is exactly the bug this fixes.
function actionFocusMinutes(action) {
    const m = action && action.actualMinutes;
    return Number.isFinite(m) && m >= 0 ? m : 0;
}

// Calculate high-level weekly summary for a friend profile view.
// STRICT PRIVACY: Returns only aggregate numbers and category counts.
// Never exposes individual task titles, notes, timestamps, or history.
async function getWeeklyStatsForUser(userId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [actions, activities] = await Promise.all([
        Action.find({
            user: userId,
            status: "completed",
            $or: [
                { completedAt: { $gte: sevenDaysAgo, $lte: now } },
                { completedAt: null, createdAt: { $gte: sevenDaysAgo, $lte: now } }
            ]
        }).populate("taskId", "category estimatedTime"),
        Activity.find({
            user: userId,
            $or: [
                { completedAt: { $gte: sevenDaysAgo, $lte: now } },
                { completedAt: null, createdAt: { $gte: sevenDaysAgo, $lte: now } }
            ]
        })
    ]);

    const activeDays = new Set();
    const categoryMap = {};
    let focusMinutes = 0;

    actions.forEach((a) => {
        const refDate = a.completedAt || a.createdAt;
        if (refDate) {
            activeDays.add(dayKey(refDate));
        }

        const cat = a.taskId?.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;

        // Friend-facing "focus time" = actual focused minutes, not the estimate.
        focusMinutes += actionFocusMinutes(a);
    });

    activities.forEach((v) => {
        const refDate = v.completedAt || v.createdAt;
        if (refDate) {
            activeDays.add(dayKey(refDate));
        }

        const cat = v.type === "read" ? "Reading" : "Vocabulary";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;

        focusMinutes += v.type === "read" ? 3 : 1;
    });

    const categories = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

    return {
        activitiesCount: actions.length + activities.length,
        focusMinutes,
        activeDaysCount: activeDays.size,
        categories
    };
}

// Calculate actual qualifying progress for a challenge participant using real activity data.
async function calculateChallengeParticipantProgress(userId, challenge) {
    if (!challenge.startDate || !challenge.endDate || challenge.status === "pending") {
        return 0;
    }

    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);

    const [actions, activities] = await Promise.all([
        Action.find({
            user: userId,
            status: "completed",
            $or: [
                { completedAt: { $gte: startDate, $lte: endDate } },
                { completedAt: null, createdAt: { $gte: startDate, $lte: endDate } }
            ]
        }).populate("taskId", "category estimatedTime"),
        Activity.find({
            user: userId,
            $or: [
                { completedAt: { $gte: startDate, $lte: endDate } },
                { completedAt: null, createdAt: { $gte: startDate, $lte: endDate } }
            ]
        })
    ]);

    switch (challenge.type) {
        case "task": {
            // Task Challenge: total qualifying completed moves
            return actions.length + activities.length;
        }

        case "category": {
            // Category/Subject Challenge: only moves in that specific category
            const targetCat = (challenge.category || "").trim().toLowerCase();
            let count = 0;

            actions.forEach((a) => {
                const cat = (a.taskId?.category || "").trim().toLowerCase();
                if (cat === targetCat) {
                    count++;
                }
            });

            activities.forEach((v) => {
                if (
                    (v.type === "read" && targetCat === "reading") ||
                    (v.type === "vocab" && targetCat === "vocabulary")
                ) {
                    count++;
                }
            });

            return count;
        }

        case "focus": {
            // Focus-Time Challenge: accumulated qualifying ACTUAL focused minutes.
            let mins = 0;

            actions.forEach((a) => {
                mins += actionFocusMinutes(a);
            });

            activities.forEach((v) => {
                mins += v.type === "read" ? 3 : 1;
            });

            return mins;
        }

        case "consistency": {
            // Consistency Challenge: number of distinct days with qualifying completed activity
            const days = new Set();

            actions.forEach((a) => {
                const d = a.completedAt || a.createdAt;
                if (d) days.add(dayKey(d));
            });

            activities.forEach((v) => {
                const d = v.completedAt || v.createdAt;
                if (d) days.add(dayKey(d));
            });

            return days.size;
        }

        default:
            return 0;
    }
}

// Evaluates challenge status and dynamic outcome based on current progress and time.
function evaluateChallengeState(challenge, creatorProgress, participantProgress) {
    if (["pending", "declined", "cancelled"].includes(challenge.status)) {
        return {
            status: challenge.status,
            outcome: challenge.status === "pending" ? null : challenge.status
        };
    }

    const now = new Date();
    const isPastEnd = now > new Date(challenge.endDate);
    const creatorMet = creatorProgress >= challenge.goal;
    const participantMet = participantProgress >= challenge.goal;

    if (creatorMet && participantMet) {
        return { status: "completed", outcome: "both_completed" };
    }

    if (isPastEnd) {
        if (creatorMet && !participantMet) {
            return { status: "completed", outcome: "creator_won" };
        }
        if (participantMet && !creatorMet) {
            return { status: "completed", outcome: "participant_won" };
        }
        return { status: "expired", outcome: "expired" };
    }

    return { status: "active", outcome: null };
}

function validateChallengePayload({ type, category, goal, durationDays, title }) {
    const validTypes = ["task", "category", "focus", "consistency"];
    if (!validTypes.includes(type)) {
        return { error: `Invalid challenge type. Allowed: ${validTypes.join(", ")}` };
    }

    if (type === "category" && (!category || !category.trim())) {
        return { error: "Category is required for category challenges" };
    }

    const allowedDurations = [3, 7, 14];
    const duration = Number(durationDays);
    if (!allowedDurations.includes(duration)) {
        return { error: "Supported durations: 3, 7, or 14 days" };
    }

    const parsedGoal = Number(goal);
    if (!parsedGoal || parsedGoal < 1) {
        return { error: "Goal must be at least 1" };
    }

    let challengeTitle = (title || "").trim();
    if (!challengeTitle) {
        if (type === "task") challengeTitle = `${parsedGoal} Moves Sprint`;
        else if (type === "category") challengeTitle = `${category.trim()} Sprint`;
        else if (type === "focus") challengeTitle = `${parsedGoal}m Focus Challenge`;
        else if (type === "consistency") challengeTitle = `${duration}-Day Consistency`;
    }

    return {
        type,
        category: type === "category" ? category.trim() : null,
        durationDays: duration,
        goal: parsedGoal,
        title: challengeTitle
    };
}

function applyChallengeDirectEdit(challenge, validatedPayload) {
    challenge.title = validatedPayload.title;
    challenge.type = validatedPayload.type;
    challenge.category = validatedPayload.category;
    challenge.goal = validatedPayload.goal;
    challenge.durationDays = validatedPayload.durationDays;
    return challenge;
}

function resolveChallengeEditRequest(challenge, action) {
    if (action === "accept") {
        challenge.title = challenge.editRequest.title;
        challenge.type = challenge.editRequest.type;
        challenge.category = challenge.editRequest.category;
        challenge.goal = challenge.editRequest.goal;

        if (challenge.durationDays !== challenge.editRequest.durationDays) {
            challenge.durationDays = challenge.editRequest.durationDays;
            if (challenge.startDate) {
                challenge.endDate = new Date(
                    new Date(challenge.startDate).getTime() +
                    challenge.durationDays * 24 * 60 * 60 * 1000
                );
            }
        }
        challenge.editRequest.status = "accepted";
    } else {
        challenge.editRequest.status = "declined";
    }
    return challenge;
}

module.exports = {
    dayKey,
    actionFocusMinutes,
    getWeeklyStatsForUser,
    calculateChallengeParticipantProgress,
    evaluateChallengeState,
    validateChallengePayload,
    applyChallengeDirectEdit,
    resolveChallengeEditRequest
};
