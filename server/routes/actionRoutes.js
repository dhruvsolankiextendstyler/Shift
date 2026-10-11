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

// MANUAL COMPLETED ACTION — record a task the user finished independently.
// Creates the Task (applying the same rules as the Tasks page) and a
// pre-completed Action in one call, so History / Insights see it immediately.
router.post("/manual", async (req, res) => {
    try {
        const { title, category, estimatedTime, priority, effort, type, completedAt } = req.body;

        if (!title || !category || !estimatedTime) {
            return res.status(400).json({ error: "Title, category, and time are required." });
        }

        const resolvedAt = completedAt ? new Date(completedAt) : new Date();
        if (Number.isNaN(resolvedAt.getTime())) {
            return res.status(400).json({ error: "Invalid completedAt date." });
        }

        // One-off tasks become "completed" immediately; permanent tasks stay
        // active but get their completionCount bumped (same as the Now flow).
        const taskType   = type === "permanent" ? "permanent" : "oneoff";
        const taskStatus = taskType === "permanent" ? "active" : "completed";

        const task = await Task.create({
            user:          req.userId,
            title:         title.trim(),
            category:      category.trim(),
            estimatedTime: Number(estimatedTime),
            priority:      priority  || "medium",
            effort:        effort    || "medium",
            type:          taskType,
            status:        taskStatus,
            completionCount: taskType === "permanent" ? 1 : 0
        });

        const action = await Action.create({
            user:        req.userId,
            taskId:      task._id,
            sessionId:   null,
            source:      "manual",
            status:      "completed",
            startedAt:   resolvedAt,
            completedAt: resolvedAt,
            // Manual log = the user reporting a task they already finished. The
            // single time they enter IS their actual time spent (there was never
            // a separate plan), so it's a user-provided actual, not a fabricated
            // derivation from an estimate.
            actualMinutes: Number(estimatedTime)
        });

        // Populate taskId so the response mirrors GET /actions shape.
        const populated = await Action.findById(action._id).populate("taskId");
        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// UPDATE ACTION
router.put("/:id", async (req, res) => {
    try {
        // Never let the client reassign ownership.
        const { user, ...updates } = req.body;

        const action = await Action.findOne({
            _id: req.params.id,
            user: req.userId
        });

        if (!action) {
            return res.status(404).json({
                error: "Action not found"
            });
        }

        // Idempotent completion: once an action is completed, its actualMinutes
        // and completedAt are authoritative. A duplicate/retried "complete"
        // (double-tap, flaky network) must not rewrite them with a slightly
        // different reading. Feedback and note can still be updated afterwards.
        if (action.status === "completed" && updates.status === "completed") {
            delete updates.status;
            delete updates.completedAt;
            delete updates.actualMinutes;
        }

        // Validate actualMinutes when supplied: a finite, non-negative number.
        // Anything else is dropped rather than persisted as garbage.
        if ("actualMinutes" in updates) {
            const m = Number(updates.actualMinutes);
            if (Number.isFinite(m) && m >= 0) {
                updates.actualMinutes = Math.round(m);
            } else {
                delete updates.actualMinutes;
            }
        }

        Object.assign(action, updates);
        await action.save();

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
