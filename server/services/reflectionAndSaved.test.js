const { test } = require("node:test");
const assert = require("node:assert/strict");

// Pure reflection analysis matching client/src/services/reflection.js
function dayKey(d) {
    const x = new Date(d);
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${x.getFullYear()}-${m}-${day}`;
}

function computeDailyReflection(actions = [], activities = [], targetDate = new Date()) {
    const targetKey = dayKey(targetDate);

    const dayActions = actions.filter((a) => {
        if (a.status !== "completed") return false;
        const ref = a.completedAt || a.createdAt;
        return ref && dayKey(ref) === targetKey;
    });

    const dayActivities = activities.filter((v) => {
        const ref = v.completedAt || v.createdAt;
        return ref && dayKey(ref) === targetKey;
    });

    const taskCount = dayActions.length;
    const readCount = dayActivities.filter((v) => v.type === "read").length;
    const vocabCount = dayActivities.filter((v) => v.type === "vocab").length;
    const totalCompleted = taskCount + readCount + vocabCount;

    const categoryCounts = {};
    let totalMinutes = 0;
    let manualCount = 0;

    for (const a of dayActions) {
        const cat = a.taskId?.category;
        if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
        if (typeof a.taskId?.estimatedTime === "number") {
            totalMinutes += a.taskId.estimatedTime;
        }
        if (a.source === "manual") {
            manualCount++;
        }
    }

    const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const strongestCategory = categories[0]?.[0] || null;

    let observation = "";
    if (totalCompleted === 0) {
        observation = "No activities logged for this day yet.";
    } else if (categories.length > 1) {
        observation = `Today you moved across ${categories.length} categories and completed ${totalCompleted} activities.`;
    } else if (categories.length === 1) {
        observation = `Today you completed ${totalCompleted} activities in ${categories[0][0]}.`;
    } else {
        observation = `Today you completed ${totalCompleted} downtime sessions.`;
    }

    return {
        dateKey: targetKey,
        totalCompleted,
        taskCount,
        readCount,
        vocabCount,
        categoryCount: categories.length,
        strongestCategory,
        totalMinutes,
        manualCount,
        observation,
        hasData: totalCompleted > 0
    };
}

function computeWeeklyReflection(actions = [], activities = [], referenceDate = new Date()) {
    const end = new Date(referenceDate);
    end.setHours(23, 59, 59, 999);

    const startCurrent = new Date(end);
    startCurrent.setDate(startCurrent.getDate() - 6);
    startCurrent.setHours(0, 0, 0, 0);

    const startPrev = new Date(startCurrent);
    startPrev.setDate(startPrev.getDate() - 7);

    const endPrev = new Date(startCurrent);
    endPrev.setMilliseconds(endPrev.getMilliseconds() - 1);

    const filterRange = (items, start, end) =>
        items.filter((it) => {
            const ref = it.completedAt || it.createdAt;
            if (!ref) return false;
            const d = new Date(ref);
            return d >= start && d <= end;
        });

    const currentActions = filterRange(
        actions.filter((a) => a.status === "completed"),
        startCurrent,
        end
    );
    const currentActivities = filterRange(activities, startCurrent, end);

    const prevActions = filterRange(
        actions.filter((a) => a.status === "completed"),
        startPrev,
        endPrev
    );
    const prevActivities = filterRange(activities, startPrev, endPrev);

    const totalCurrent = currentActions.length + currentActivities.length;
    const totalPrev = prevActions.length + prevActivities.length;

    const categoryCounts = {};
    for (const a of currentActions) {
        const cat = a.taskId?.category;
        if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
    }

    const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const topCategory = categories[0]?.[0] || null;

    let comparison = null;
    if (totalPrev > 0) {
        const diff = totalCurrent - totalPrev;
        comparison = diff > 0
            ? `Up +${diff} activity compared to previous week (${totalCurrent} vs ${totalPrev}).`
            : `${totalCurrent} activities this week vs ${totalPrev} last week.`;
    }

    return {
        totalCompleted: totalCurrent,
        topCategory,
        hasPrevData: totalPrev > 0,
        prevTotalCompleted: totalPrev,
        comparison,
        hasData: totalCurrent > 0
    };
}

// Tests
test("Daily reflection computes accurate totals and categories from real actions", () => {
    const today = new Date();
    const actions = [
        {
            status: "completed",
            completedAt: today,
            taskId: { title: "Study B-Trees", category: "Computer Science", estimatedTime: 30 }
        },
        {
            status: "completed",
            completedAt: today,
            taskId: { title: "Review BrahMos Paper", category: "Defence", estimatedTime: 20 }
        },
        {
            status: "skipped", // Should NOT count toward completed reflection
            completedAt: today,
            taskId: { title: "Skipped task", category: "General", estimatedTime: 10 }
        }
    ];

    const activities = [
        { type: "vocab", title: "tenacious", completedAt: today }
    ];

    const reflection = computeDailyReflection(actions, activities, today);
    assert.equal(reflection.totalCompleted, 3);
    assert.equal(reflection.taskCount, 2);
    assert.equal(reflection.vocabCount, 1);
    assert.equal(reflection.readCount, 0);
    assert.equal(reflection.categoryCount, 2);
    assert.equal(reflection.totalMinutes, 50);
    assert.equal(reflection.hasData, true);
    assert.ok(reflection.observation.includes("2 categories"));
});

test("Daily reflection handles empty state cleanly without fabricating insights", () => {
    const today = new Date();
    const reflection = computeDailyReflection([], [], today);
    assert.equal(reflection.totalCompleted, 0);
    assert.equal(reflection.hasData, false);
    assert.equal(reflection.observation, "No activities logged for this day yet.");
    assert.equal(reflection.strongestCategory, null);
});

test("Weekly reflection compares previous week only when prior data exists", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);

    const actions = [
        { status: "completed", completedAt: threeDaysAgo, taskId: { category: "AI & ML" } },
        { status: "completed", completedAt: threeDaysAgo, taskId: { category: "AI & ML" } },
        { status: "completed", completedAt: tenDaysAgo, taskId: { category: "AI & ML" } }
    ];

    const weekly = computeWeeklyReflection(actions, [], now);
    assert.equal(weekly.totalCompleted, 2);
    assert.equal(weekly.topCategory, "AI & ML");
    assert.equal(weekly.hasPrevData, true);
    assert.equal(weekly.prevTotalCompleted, 1);
    assert.ok(weekly.comparison.includes("+1"));
});

test("Weekly reflection with zero prior data omits fabricated comparison", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const actions = [
        { status: "completed", completedAt: yesterday, taskId: { category: "Robotics" } }
    ];

    const weekly = computeWeeklyReflection(actions, [], now);
    assert.equal(weekly.totalCompleted, 1);
    assert.equal(weekly.hasPrevData, false);
    assert.equal(weekly.comparison, null);
});
