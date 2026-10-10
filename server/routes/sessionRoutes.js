const express = require("express");
const Session = require("../models/Session");

const router = express.Router();

// CREATE SESSION
router.post("/", async (req, res) => {
    try {
        const rawTime = req.body.availableTime;
        const parsedTime = Number(rawTime);

        if (
            rawTime === undefined ||
            rawTime === null ||
            rawTime === "" ||
            !Number.isInteger(parsedTime) ||
            parsedTime <= 0 ||
            parsedTime > 1440
        ) {
            return res.status(400).json({
                error: "Available time must be a positive whole number of minutes (1 to 1440)."
            });
        }

        const session = await Session.create({
            category: req.body.category || null,
            mood: req.body.mood || null,
            energy: req.body.energy || null,
            availableTime: parsedTime,
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
