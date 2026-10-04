import { dayKey } from "../pages/Insights";

// Pure reflection analysis derived strictly from real Activity and Action records.
// Zero fabricated metrics or synthetic data.

export function computeDailyReflection(actions = [], activities = [], targetDate = new Date()) {
    const targetKey = dayKey(targetDate);

    // Completed task actions for target day
    const dayActions = actions.filter((a) => {
        if (a.status !== "completed") return false;
        const ref = a.completedAt || a.createdAt;
        return ref && dayKey(ref) === targetKey;
    });

    // Completed downtime sessions for target day
    const dayActivities = activities.filter((v) => {
        const ref = v.completedAt || v.createdAt;
        return ref && dayKey(ref) === targetKey;
    });

    const taskCount = dayActions.length;
    const readCount = dayActivities.filter((v) => v.type === "read").length;
    const vocabCount = dayActivities.filter((v) => v.type === "vocab").length;
    const totalCompleted = taskCount + readCount + vocabCount;

    // Categories
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
    const categoryCount = categories.length;

    let observation = "";
    let secondaryObservation = "";

    if (totalCompleted === 0) {
        observation = "No activities logged for this day yet.";
    } else {
        if (categoryCount > 1) {
            observation = `Today you moved across ${categoryCount} categories and completed ${totalCompleted} activit${totalCompleted === 1 ? "y" : "ies"}.`;
        } else if (categoryCount === 1) {
            observation = `Today you completed ${totalCompleted} activit${totalCompleted === 1 ? "y" : "ies"} in ${categories[0][0]}.`;
        } else {
            observation = `Today you completed ${totalCompleted} downtime session${totalCompleted === 1 ? "y" : "ies"}.`;
        }

        if (strongestCategory && categoryCount > 1) {
            secondaryObservation = `Your strongest area today was ${strongestCategory}.`;
        } else if (totalMinutes > 0) {
            secondaryObservation = `${totalMinutes} min invested in focused execution.`;
        } else if (readCount + vocabCount > 0) {
            secondaryObservation = `Enriched by ${readCount > 0 ? `${readCount} Deep Read${readCount > 1 ? "s" : ""}` : ""}${readCount > 0 && vocabCount > 0 ? " and " : ""}${vocabCount > 0 ? `${vocabCount} Word Forge word${vocabCount > 1 ? "s" : ""}` : ""}.`;
        }
    }

    return {
        dateKey: targetKey,
        totalCompleted,
        taskCount,
        readCount,
        vocabCount,
        categoryCount,
        categories,
        strongestCategory,
        totalMinutes,
        manualCount,
        observation,
        secondaryObservation,
        hasData: totalCompleted > 0
    };
}

export function computeWeeklyReflection(actions = [], activities = [], referenceDate = new Date()) {
    const end = new Date(referenceDate);
    end.setHours(23, 59, 59, 999);

    const startCurrent = new Date(end);
    startCurrent.setDate(startCurrent.getDate() - 6);
    startCurrent.setHours(0, 0, 0, 0);

    const startPrev = new Date(startCurrent);
    startPrev.setDate(startPrev.getDate() - 7);

    const endPrev = new Date(startCurrent);
    endPrev.setMilliseconds(endPrev.getMilliseconds() - 1);

    // Helpers to filter by date range
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

    // Categories in current week
    const categoryCounts = {};
    let totalMinutes = 0;
    const activeDays = new Set();

    for (const a of currentActions) {
        const cat = a.taskId?.category;
        if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
        if (typeof a.taskId?.estimatedTime === "number") {
            totalMinutes += a.taskId.estimatedTime;
        }
        const ref = a.completedAt || a.createdAt;
        if (ref) activeDays.add(dayKey(ref));
    }

    for (const v of currentActivities) {
        const ref = v.completedAt || v.createdAt;
        if (ref) activeDays.add(dayKey(ref));
    }

    const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const topCategory = categories[0]?.[0] || null;

    let comparison = null;
    if (totalPrev > 0) {
        const diff = totalCurrent - totalPrev;
        if (diff > 0) {
            comparison = `Up +${diff} activity compared to previous week (${totalCurrent} vs ${totalPrev}).`;
        } else if (diff < 0) {
            comparison = `${totalCurrent} activities this week vs ${totalPrev} last week.`;
        } else {
            comparison = `Matched previous week's pace at ${totalCurrent} activities.`;
        }
    }

    let trend = "";
    if (totalCurrent === 0) {
        trend = "No completed activities this week yet.";
    } else if (topCategory) {
        trend = `Your primary momentum this week centered on ${topCategory} (${categoryCounts[topCategory]} move${categoryCounts[topCategory] > 1 ? "s" : ""}).`;
    } else {
        trend = `You showed up on ${activeDays.size} active day${activeDays.size === 1 ? "" : "s"} this week.`;
    }

    return {
        totalCompleted: totalCurrent,
        taskCount: currentActions.length,
        downtimeCount: currentActivities.length,
        categories,
        topCategory,
        totalMinutes,
        activeDaysCount: activeDays.size,
        hasPrevData: totalPrev > 0,
        prevTotalCompleted: totalPrev,
        comparison,
        trend,
        hasData: totalCurrent > 0
    };
}
