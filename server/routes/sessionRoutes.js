const express = require("express");
const Session = require("../models/Session");

const router = express.Router();

// CREATE SESSION
router.post("/", async (req, res) => {
    try {
        const session = await Session.create({
            mood: req.body.mood,
            energy: req.body.energy,
            availableTime: req.body.availableTime,
            user: req.userId
        });

        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// GET THIS USER'S SESSIONS
router.get("/", async (req, res) => {
    try {
        const sessions = await Session.find({ user: req.userId })
            .sort({ createdAt: -1 });

        res.json(sessions);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;
