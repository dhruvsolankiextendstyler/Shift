const express = require("express");
const Task = require("../models/Task");

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
    try {
        const task = await Task.create({
            title: req.body.title,
            category: req.body.category,
            estimatedTime: req.body.estimatedTime,
            priority: req.body.priority,
            user: req.userId
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET TASKS (this user only)
router.get("/", async (req, res) => {
    try {
        const tasks = await Task.find({
            user: req.userId,
            status: { $ne: "deleted" }
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE
router.put("/:id", async (req, res) => {
    try {
        // Never let the client reassign ownership.
        const { user, ...updates } = req.body;

        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            updates,
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// SOFT DELETE
router.delete("/:id", async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            { status: "deleted" },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully",
            task
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
