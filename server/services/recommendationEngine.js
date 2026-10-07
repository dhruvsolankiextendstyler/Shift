// Level 1/2/3 for both the energy you HAVE and the effort a task DEMANDS.
// They share one scale on purpose: matching one to the other is the engine's
// whole job. The old engine faked this with task DURATION, which is why "low
// energy" used to wrongly mean "short task".
const levelScore = {
    low: 1,
    medium: 2,
    high: 3
};

// Mood is a separate, emotional axis — not the same thing as energy.
const moodScore = {
    low: 1,
    okay: 2,
    good: 3,
    great: 4,
    angry: 2,
    overwhelmed: 1
};

function getRecommendationScore(
    task,
    session,
    recentTasks = [],
    pastActions = []
) {
    let score = 50;

    const mood = moodScore[session.mood] || 2;
    const energy = levelScore[session.energy] || 2;
    const effort = levelScore[task.effort] || 2;

    // ENERGY ↔ EFFORT — the axis the engine is built around. Match the gas you
    // HAVE against the gas the task DEMANDS. Time (duration) is a hard filter in
    // recommendTask; priority (importance) is scored below. Neither stands in
    // for energy any more — that was the old bug.
    const gap = effort - energy; // > 0 means the task wants more than you've got
    if (gap <= 0) {
        // Dead-on match, or energy to spare (comfortably doable).
        score += gap === 0 ? 30 : 15;
    } else {
        // A stretch (one level over) or a wall (two levels over).
        score -= gap === 1 ? 15 : 35;
    }

    // MOOD — a rough headspace lowers tolerance for the most demanding work.
    // Layers on top of the energy match; never touches time.
    if (mood <= 2 && effort === 3) {
        score -= 15;
    }

    if (mood >= 3) {
        score += 5;
    }

    // PRIORITY
    if (task.priority === "high") {
        score += 20;
    } else if (task.priority === "medium") {
        score += 10;
    }

    // RECENT CATEGORY REPETITION
    const sameCategoryCount = recentTasks.filter(
        (recentTask) =>
            recentTask.category === task.category
    ).length;

    score -= sameCategoryCount * 20;

    // VARIETY
    if (sameCategoryCount === 0) {
        score += 10;
    }

    // DURATION FIT: bonus when the task effectively uses the available window
    if (session.availableTime && task.estimatedTime) {
        const timeRatio = task.estimatedTime / session.availableTime;
        if (timeRatio >= 0.75 && timeRatio <= 1.0) {
            score += 10;
        }
    }

    // RECENT "NOT THIS" REJECTION SIGNAL:
    // If a task in this category was rejected within the last 3 actions, apply a soft category cooldown
    const recentSkips = pastActions.slice(0, 3).filter((a) => a.status === "skipped");
    const categoryRejectedRecently = recentSkips.some(
        (a) => a.taskId && a.taskId.category === task.category
    );
    if (categoryRejectedRecently) {
        score -= 15;
    }

    // PERSONAL FEEDBACK & COMPLETION HISTORY
    const taskActions = pastActions.filter(
        (action) =>
            action.taskId &&
            action.taskId._id.toString() ===
                task._id.toString()
    );

    let completedCount = 0;
    taskActions.forEach((action, idx) => {
        if (action.status === "completed") {
            completedCount++;
            if (action.feedback === "better") {
                score += 25;
            }

            if (action.feedback === "same") {
                score += 5;
            }

            if (action.feedback === "worse") {
                score -= 25;
            }
        }

        if (action.status === "skipped") {
            // Decaying penalty: recent rejections carry more weight, older ones decay so options resurface
            const recencyPenalty = idx === 0 ? 20 : idx < 3 ? 15 : 10;
            score -= recencyPenalty;
        }
    });

    // Proven task completion track record
    if (completedCount > 0 || (task.completionCount && task.completionCount > 0)) {
        score += 12;
    }

    return score;
}

function generateWhyThis(task, session, recentTasks = [], pastActions = []) {
    const reasons = [];

    // 1. Duration signal
    if (session.availableTime) {
        reasons.push(`Fits your ${session.availableTime}m window`);
    }

    // 2. Energy signal
    const energy = levelScore[session.energy] || 2;
    const effort = levelScore[task.effort] || 2;
    if (energy === effort) {
        reasons.push("Matches your current energy");
    } else if (effort < energy) {
        reasons.push("Low effort for quick momentum");
    }

    // 3. Category variety signal
    const sameCategoryCount = recentTasks.filter(
        (r) => r.category === task.category
    ).length;
    if (sameCategoryCount === 0) {
        reasons.push(`Fresh category you haven't done recently`);
    }

    // 4. Track record / Priority signal
    const isCompletedBefore = pastActions.some(
        (a) =>
            a.taskId &&
            a.taskId._id.toString() === task._id.toString() &&
            a.status === "completed"
    ) || (task.completionCount && task.completionCount > 0);

    if (isCompletedBefore) {
        reasons.push("Proven track record of completion");
    } else if (task.priority === "high") {
        reasons.push("High priority in your pool");
    }

    // Combine 1 or 2 strongest grounded signals
    return reasons.slice(0, 2).join(" • ");
}

function recommendTask(
    tasks,
    session,
    recentTasks = [],
    pastActions = []
) {
    if (!tasks.length) {
        return null;
    }

    // Available time is a HARD limit, not a soft nudge: a task the user cannot
    // finish in the window they gave must never be recommended.
    const fitting = tasks.filter(
        (task) => task.estimatedTime <= session.availableTime
    );

    if (!fitting.length) {
        return null;
    }

    const scoredTasks = fitting.map((task) => ({
        task,
        score: getRecommendationScore(
            task,
            session,
            recentTasks,
            pastActions
        )
    }));

    scoredTasks.sort((a, b) => b.score - a.score);

    // If multiple tasks tie for the highest score, pick among them rather than
    // always deterministically picking the first in array order.
    const topScore = scoredTasks[0].score;
    const topTied = scoredTasks.filter((item) => item.score === topScore);
    let chosenTask;
    if (topTied.length > 1) {
        const randomIndex = Math.floor(Math.random() * topTied.length);
        chosenTask = topTied[randomIndex].task;
    } else {
        chosenTask = scoredTasks[0].task;
    }

    // Clone and attach whyThis explanation
    const whyThis = generateWhyThis(chosenTask, session, recentTasks, pastActions);
    if (typeof chosenTask.toObject === "function") {
        const obj = chosenTask.toObject();
        obj.whyThis = whyThis;
        return obj;
    }

    return { ...chosenTask, whyThis };
}

module.exports = {
    recommendTask,
    getRecommendationScore,
    generateWhyThis
};