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

    // PERSONAL FEEDBACK
    const taskActions = pastActions.filter(
        (action) =>
            action.taskId &&
            action.taskId._id.toString() ===
                task._id.toString()
    );

    taskActions.forEach((action) => {
        if (action.status === "completed") {
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
            score -= 10;
        }
    });

    return score;
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
    // finish in the window they gave must never be recommended. Choosing 15 min
    // must never surface a 30 min task — not even when nothing shorter exists.
    // If nothing fits, return null so the caller can say so plainly instead of
    // silently handing back an over-long task. Allowed range: estimatedTime <=
    // availableTime (exact fit counts).
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

    return scoredTasks[0].task;
}

module.exports = {
    recommendTask,
    getRecommendationScore
};