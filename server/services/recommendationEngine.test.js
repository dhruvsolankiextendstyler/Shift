const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    recommendTask,
    getRecommendationScore
} = require("./recommendationEngine");

// ---- helpers -----------------------------------------------------------

let idCounter = 0;

function makeTask(overrides = {}) {
    idCounter += 1;

    return {
        _id: { toString: () => `task-${idCounter}` },
        title: `Task ${idCounter}`,
        category: "general",
        estimatedTime: 30,
        priority: "medium",
        status: "active",
        ...overrides
    };
}

function session(mood, energy, availableTime) {
    return { mood, energy, availableTime };
}

// A completed action with feedback, referencing a task by identity.
function completed(task, feedback) {
    return {
        status: "completed",
        feedback,
        taskId: task
    };
}

function skipped(task) {
    return {
        status: "skipped",
        feedback: null,
        taskId: task
    };
}

// ---- Scenario 1: Low mood + Low energy + short time --------------------
// Expect: favor a short, manageable action over a demanding one.

test("low + low + short time favors the manageable action", () => {
    const short = makeTask({ estimatedTime: 5, title: "Quick win" });
    const long = makeTask({ estimatedTime: 60, title: "Deep work" });

    const picked = recommendTask(
        [long, short],
        session("low", "low", 5)
    );

    assert.equal(picked.title, "Quick win");
});

// ---- Scenario 2: Good mood + High energy + long time -------------------
// Expect: a demanding action is allowed (not penalized into last place).

test("good + high + long time allows a demanding action", () => {
    const demanding = makeTask({
        estimatedTime: 60,
        priority: "high",
        title: "Big project"
    });
    const trivial = makeTask({
        estimatedTime: 5,
        priority: "low",
        title: "Tiny errand"
    });

    const picked = recommendTask(
        [trivial, demanding],
        session("good", "high", 60)
    );

    assert.equal(picked.title, "Big project");
});

// ---- Scenario 3: Angry + High ------------------------------------------
// Expect: a sensible choice that fits history and available time.

test("angry + high still fits the action to available time", () => {
    const fits = makeTask({ estimatedTime: 20, title: "Fits window" });
    const overflows = makeTask({
        estimatedTime: 90,
        title: "Way too long"
    });

    const picked = recommendTask(
        [overflows, fits],
        session("angry", "high", 30)
    );

    assert.equal(picked.title, "Fits window");
});

// ---- Scenario 4: Overwhelmed + High ------------------------------------
// Expect: reset/decompression — a manageable action over a heavy one.

test("overwhelmed + high favors a manageable reset action", () => {
    const reset = makeTask({ estimatedTime: 10, title: "Short reset" });
    const heavy = makeTask({ estimatedTime: 60, title: "Heavy task" });

    const picked = recommendTask(
        [heavy, reset],
        session("overwhelmed", "high", 60)
    );

    assert.equal(picked.title, "Short reset");
});

// ---- Scenario 5: Repeated same category --------------------------------
// Expect: variety reduces repetitive recommendations.

test("variety beats a recently over-used category", () => {
    const overused = makeTask({ category: "cs", title: "More CS" });
    const fresh = makeTask({ category: "health", title: "Fresh area" });

    // recentTasks shows the "cs" category was just used twice.
    const recentTasks = [
        makeTask({ category: "cs" }),
        makeTask({ category: "cs" })
    ];

    const picked = recommendTask(
        [overused, fresh],
        session("okay", "medium", 60),
        recentTasks
    );

    assert.equal(picked.title, "Fresh area");
});

// ---- Scenario 6: Recently used task ------------------------------------
// Recent-task avoidance is enforced at the route layer (the recommend
// route filters out recently acted-on task ids before scoring). Here we
// confirm the scoring at least does not *prefer* a same-category recent
// task over a fresh one.

test("recently used category is not preferred over a fresh one", () => {
    const recent = makeTask({ category: "cs", title: "Recent CS" });
    const fresh = makeTask({ category: "art", title: "Fresh art" });

    const recentTasks = [makeTask({ category: "cs" })];

    const scoreRecent = getRecommendationScore(
        recent,
        session("okay", "medium", 60),
        recentTasks
    );
    const scoreFresh = getRecommendationScore(
        fresh,
        session("okay", "medium", 60),
        recentTasks
    );

    assert.ok(scoreFresh > scoreRecent);
});

// ---- Scenario 7: Repeated skipped task ---------------------------------
// Expect: repeatedly skipping a task lowers its future score.

test("repeated skips reduce a task's future score", () => {
    const task = makeTask({ title: "Often skipped" });
    const sess = session("okay", "medium", 60);

    const baseline = getRecommendationScore(task, sess, [], []);

    const withSkips = getRecommendationScore(task, sess, [], [
        skipped(task),
        skipped(task),
        skipped(task)
    ]);

    assert.ok(withSkips < baseline);
});

// ---- Scenario 8: Completed + Better ------------------------------------
// Expect: positive feedback raises the task's future score.

test("completed + better raises future score", () => {
    const task = makeTask({ title: "Felt great" });
    const sess = session("okay", "medium", 60);

    const baseline = getRecommendationScore(task, sess, [], []);
    const withBetter = getRecommendationScore(task, sess, [], [
        completed(task, "better")
    ]);

    assert.ok(withBetter > baseline);
});

// ---- Scenario 9: Completed + Worse -------------------------------------
// Expect: negative feedback lowers the task's future score.

test("completed + worse lowers future score", () => {
    const task = makeTask({ title: "Felt worse" });
    const sess = session("okay", "medium", 60);

    const baseline = getRecommendationScore(task, sess, [], []);
    const withWorse = getRecommendationScore(task, sess, [], [
        completed(task, "worse")
    ]);

    assert.ok(withWorse < baseline);
});

// ---- Cross-check: skipped treated differently from completed -----------
// Step 5 requires skipped actions to be handled differently from
// completed ones. A skip should hurt less than a completed+worse.

test("a skip is treated differently from a completed+worse", () => {
    const task = makeTask();
    const sess = session("okay", "medium", 60);

    const skipScore = getRecommendationScore(task, sess, [], [
        skipped(task)
    ]);
    const worseScore = getRecommendationScore(task, sess, [], [
        completed(task, "worse")
    ]);

    assert.notEqual(skipScore, worseScore);
});

// ---- Edge case: empty task pool ----------------------------------------

test("no tasks returns null", () => {
    assert.equal(recommendTask([], session("okay", "medium", 30)), null);
});
