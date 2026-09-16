const express = require("express");
const Task = require("../models/Task");

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET ACTIVE TASKS
router.get("/", async (req, res) => {
    try {
        const tasks = await Task.find({
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
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
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
        const task = await Task.findByIdAndUpdate(
            req.params.id,
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