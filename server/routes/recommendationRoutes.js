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

        // Don't immediately recommend recently acted-on tasks
        const recentTaskIds = recentActions
            .filter((action) => action.taskId)
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

        const recommendation = recommendTask(
            availableTasks,
            session,
            recentTasks,
            pastActions
        );

        if (!recommendation) {
            return res.status(404).json({
                error: "No active tasks available"
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