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
        effort: "medium",
        status: "active",
        ...overrides
    };
}

function session(mood, energy, availableTime) {
    return { mood, energy, availableTime };
}

function completed(task, feedback) {
    return { status: "completed", feedback, taskId: task };
}

function skipped(task) {
    return { status: "skipped", feedback: null, taskId: task };
}

// ---- The core change: ENERGY ↔ EFFORT, not energy ↔ duration -----------
// Low energy must favor a LOW-EFFORT task, even when both fit the window and
// the low-effort one is the longer of the two. Duration no longer stands in
// for energy.

test("low energy favors the low-effort task over a high-effort one", () => {
    const light = makeTask({
        effort: "low",
        estimatedTime: 45,
        title: "Light but long"
    });
    const heavy = makeTask({
        effort: "high",
        estimatedTime: 10,
        title: "Heavy but short"
    });

    const picked = recommendTask(
        [heavy, light],
        session("okay", "low", 60)
    );

    assert.equal(picked.title, "Light but long");
});

test("high energy allows a high-effort task (not penalized)", () => {
    const heavy = makeTask({ effort: "high", title: "Deep work" });
    const trivial = makeTask({ effort: "low", title: "Busywork" });

    const picked = recommendTask(
        [trivial, heavy],
        session("good", "high", 60)
    );

    assert.equal(picked.title, "Deep work");
});

test("a task demanding more energy than you have is penalized", () => {
    const sess = session("okay", "low", 60);
    const match = getRecommendationScore(
        makeTask({ effort: "low" }),
        sess
    );
    const wall = getRecommendationScore(
        makeTask({ effort: "high" }),
        sess
    );

    assert.ok(match > wall);
});

// ---- PRIORITY is a separate axis from energy/effort --------------------
// With the energy match equal, higher priority (importance) wins.

test("priority breaks ties when the energy match is equal", () => {
    const low = makeTask({ priority: "low", title: "Nice to do" });
    const high = makeTask({ priority: "high", title: "Matters most" });

    const picked = recommendTask(
        [low, high],
        session("okay", "medium", 60)
    );

    assert.equal(picked.title, "Matters most");
});

// ---- MOOD lowers tolerance for the most demanding work -----------------

test("a rough mood penalizes a high-effort task", () => {
    const heavy = makeTask({ effort: "high" });
    const rough = getRecommendationScore(heavy, session("overwhelmed", "high", 60));
    const fine = getRecommendationScore(heavy, session("good", "high", 60));

    assert.ok(rough < fine);
});

// ---- TIME is a HARD limit, unchanged -----------------------------------

test("15 min available never surfaces a 30 min task when one fits", () => {
    const fits = makeTask({
        estimatedTime: 15,
        priority: "low",
        title: "Fits the window"
    });
    const overflows = makeTask({
        estimatedTime: 30,
        priority: "high",
        title: "Overflows the window"
    });

    const picked = recommendTask(
        [overflows, fits],
        session("good", "high", 15)
    );

    assert.equal(picked.title, "Fits the window");
});

test("returns null when nothing fits the window", () => {
    const long = makeTask({ estimatedTime: 45, title: "Too long" });

    const picked = recommendTask([long], session("okay", "medium", 15));

    assert.equal(picked, null);
});

test("no tasks returns null", () => {
    assert.equal(recommendTask([], session("okay", "medium", 30)), null);
});

// ---- VARIETY -----------------------------------------------------------

test("variety beats a recently over-used category", () => {
    const overused = makeTask({ category: "cs", title: "More CS" });
    const fresh = makeTask({ category: "health", title: "Fresh area" });

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

// ---- PERSONAL FEEDBACK -------------------------------------------------

test("completed + better raises future score; worse lowers it", () => {
    const task = makeTask();
    const sess = session("okay", "medium", 60);

    const baseline = getRecommendationScore(task, sess, [], []);
    const better = getRecommendationScore(task, sess, [], [completed(task, "better")]);
    const worse = getRecommendationScore(task, sess, [], [completed(task, "worse")]);

    assert.ok(better > baseline);
    assert.ok(worse < baseline);
});

test("a skip is treated differently from a completed+worse", () => {
    const task = makeTask();
    const sess = session("okay", "medium", 60);

    const skip = getRecommendationScore(task, sess, [], [skipped(task)]);
    const worse = getRecommendationScore(task, sess, [], [completed(task, "worse")]);

    assert.notEqual(skip, worse);
});

// ---- Back-compat: tasks with no effort default to "medium" -------------

test("a task with no effort field is treated as medium", () => {
    const noEffort = makeTask();
    delete noEffort.effort;

    const sess = session("okay", "medium", 60);
    const asMedium = getRecommendationScore(makeTask({ effort: "medium" }), sess);
    const asUndefined = getRecommendationScore(noEffort, sess);

    assert.equal(asUndefined, asMedium);
});
