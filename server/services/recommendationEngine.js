const moodScore = {
    low: 1,
    okay: 2,
    good: 3,
    great: 4,
    angry: 2,
    overwhelmed: 1
};

const energyScore = {
    low: 1,
    medium: 2,
    high: 3
};

function getRecommendationScore(
    task,
    session,
    recentTasks = [],
    pastActions = []
) {
    let score = 50;

    const mood = moodScore[session.mood] || 2;
    const energy = energyScore[session.energy] || 2;

    // STATE FIT
    if (energy === 1) {
        score += task.estimatedTime <= 30 ? 20 : -15;
    }

    if (energy === 3) {
        score += task.estimatedTime >= 30 ? 15 : 5;
    }

    if (mood <= 2) {
        score += task.estimatedTime <= 30 ? 10 : -5;
    }

    if (mood >= 3) {
        score += 10;
    }

    // TIME FIT
    if (task.estimatedTime <= session.availableTime) {
        score += 20;
    } else if (
        task.estimatedTime <= session.availableTime + 15
    ) {
        score += 5;
    } else {
        score -= 25;
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

    // Available time is a hard limit, not a soft nudge: never hand back a task
    // that can't finish in the window the user says they have (15 min chosen
    // must not surface a 30 min task). Only fall back to the full pool if
    // literally nothing fits, so the user still gets their closest option.
    const fitting = tasks.filter(
        (task) => task.estimatedTime <= session.availableTime
    );
    const pool = fitting.length ? fitting : tasks;

    const scoredTasks = pool.map((task) => ({
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