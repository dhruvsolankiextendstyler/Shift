const express = require("express");
const Action = require("../models/Action");

const router = express.Router();

// START ACTION
router.post("/", async (req, res) => {
    try {
        const action = await Action.create({
            sessionId: req.body.sessionId,
            taskId: req.body.taskId,
            status: "started"
        });

        res.status(201).json(action);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// UPDATE ACTION
router.put("/:id", async (req, res) => {
    try {
        const action = await Action.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!action) {
            return res.status(404).json({
                error: "Action not found"
            });
        }

        res.json(action);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// GET ACTION HISTORY
router.get("/", async (req, res) => {
    try {
        const actions = await Action.find()
            .populate("sessionId")
            .populate("taskId")
            .sort({ createdAt: -1 });

        res.json(actions);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;