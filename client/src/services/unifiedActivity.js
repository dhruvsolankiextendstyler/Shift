// Unified Activity History source of truth.
// Normalizes task actions (recommended & manual) and downtime activities
// (words & articles) into a single, cohesive source of truth for History and Insights.

export function toUnifiedActivities(actions = [], activities = []) {
    const fromActions = (actions || []).map((a) => {
        const task = a.taskId || {};
        const date = new Date(a.completedAt || a.createdAt);
        const origin = a.source === "manual" ? "manual" : "recommended";
        return {
            id: a._id,
            kind: "task",
            type: "task",
            source: origin, // "recommended" | "manual"
            title: task.title || "Task",
            category: task.category || "General",
            minutes: task.estimatedTime ?? null,
            status: a.status,
            feedback: a.feedback || null,
            note: a.note || "",
            date,
            action: a
        };
    });

    const fromActivities = (activities || []).map((v) => {
        const isArticle = v.type === "read";
        const date = new Date(v.completedAt || v.createdAt);
        return {
            id: v._id,
            kind: v.type, // "read" | "vocab"
            type: isArticle ? "article" : "word",
            source: isArticle ? "article" : "word",
            title: v.title || (isArticle ? "Article Briefing" : "Word Forge"),
            category: isArticle ? "Reading" : "Vocabulary",
            minutes: isArticle ? 3 : 1,
            status: "completed",
            feedback: null,
            note: "",
            date,
            activity: v
        };
    });

    return [...fromActions, ...fromActivities]
        .filter((e) => e.date && !Number.isNaN(e.date.getTime()))
        .sort((a, b) => b.date - a.date);
}
