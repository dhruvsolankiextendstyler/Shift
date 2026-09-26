const express = require("express");
const Task = require("../models/Task");
const Session = require("../models/Session");
const Action = require("../models/Action");
const { recommendTask } = require("../services/recommendationEngine");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { sessionId } = req.body;

        const session = await Session.findOne({
            _id: sessionId,
            user: req.userId
        });

        if (!session) {
            return res.status(404).json({
                error: "Session not found"
            });
        }

        const tasks = await Task.find({
            user: req.userId,
            status: "active"
        });

        const recentActions = await Action.find({ user: req.userId })
            .populate("taskId")
            .sort({ createdAt: -1 })
            .limit(10);

        const recentTasks = recentActions
            .filter((action) => action.taskId)
            .map((action) => action.taskId);

        // Don't immediately re-recommend a task the user just RESOLVED
        // (completed or skipped). A merely "started" task that was never
        // finished stays eligible: an unfinished task must not be treated as
        // though it were completed — the user should be able to pick it up
        // again rather than have it quietly withheld.
        const recentTaskIds = recentActions
            .filter(
                (action) =>
                    action.taskId &&
                    (action.status === "completed" ||
                        action.status === "skipped")
            )
            .map((action) => action.taskId._id.toString());

        let availableTasks = tasks.filter(
            (task) => !recentTaskIds.includes(task._id.toString())
        );

        // If every task was recently used, allow the full pool again
        if (availableTasks.length === 0) {
            availableTasks = tasks;
        }

        const pastActions = await Action.find({ user: req.userId })
            .populate("taskId")
            .sort({ createdAt: -1 });

        let recommendation = recommendTask(
            availableTasks,
            session,
            recentTasks,
            pastActions
        );

        // Recency is a soft preference, the time window is a hard limit: if
        // nothing recency-eligible fits the window, retry against the full pool
        // before giving up, so a fitting task is never hidden purely because it
        // was used recently. (recommendTask itself still refuses over-long tasks.)
        if (!recommendation && availableTasks !== tasks) {
            recommendation = recommendTask(
                tasks,
                session,
                recentTasks,
                pastActions
            );
        }

        if (!recommendation) {
            // Two different dead-ends the user should hear differently: an empty
            // pool ("add a task") vs. a pool where nothing fits the chosen window
            // ("nothing fits your 15 min"). Never silently stretch the window.
            return res.status(404).json({
                error: tasks.length
                    ? "No task fits your time window"
                    : "No active tasks available",
                reason: tasks.length ? "no-fit" : "empty",
                availableTime: session.availableTime
            });
        }

        res.json({
            task: recommendation
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;