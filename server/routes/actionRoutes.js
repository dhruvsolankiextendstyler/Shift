const express = require("express");
const Action = require("../models/Action");
const Session = require("../models/Session");
const Task = require("../models/Task");

const router = express.Router();

// START ACTION
router.post("/", async (req, res) => {
    try {
        const { sessionId, taskId } = req.body;

        // Confirm the referenced session and task belong to this user
        // before creating an action against them.
        const [session, task] = await Promise.all([
            Session.findOne({ _id: sessionId, user: req.userId }),
            Task.findOne({ _id: taskId, user: req.userId })
        ]);

        if (!session || !task) {
            return res.status(404).json({
                error: "Session or task not found"
            });
        }

        const action = await Action.create({
            sessionId,
            taskId,
            status: "started",
            user: req.userId
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
        // Never let the client reassign ownership.
        const { user, ...updates } = req.body;

        const action = await Action.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            updates,
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

// GET ACTION HISTORY (this user only)
router.get("/", async (req, res) => {
    try {
        const actions = await Action.find({ user: req.userId })
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

// THE LIVE ACTION — the single "started" action fresh enough to still be in
// motion. Used to mirror the focus lock onto the user's other devices.
// ponytail: 90-min freshness window so a day-old stuck "started" action
// doesn't re-lock a fresh session.
router.get("/live", async (req, res) => {
    try {
        const cutoff = new Date(Date.now() - 90 * 60 * 1000);
        const action = await Action.findOne({
            user: req.userId,
            status: "started",
            startedAt: { $gte: cutoff }
        })
            .sort({ startedAt: -1 })
            .populate("taskId");

        res.json(action || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// A single action — lets a device check whether a lock it's holding was
// resolved on another device.
router.get("/:id", async (req, res) => {
    try {
        const action = await Action.findOne({
            _id: req.params.id,
            user: req.userId
        }).populate("taskId");

        if (!action) {
            return res.status(404).json({ error: "Action not found" });
        }

        res.json(action);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
