const express = require("express");
const router = express.Router();
const Challenge = require("../models/Challenge");
const Friendship = require("../models/Friendship");
const {
    calculateChallengeParticipantProgress,
    evaluateChallengeState
} = require("../services/socialService");

// Enrich a challenge with live progress, friend metadata, and remaining time
async function enrichChallenge(challengeDoc, currentUserId) {
    const c = challengeDoc.toObject ? challengeDoc.toObject() : challengeDoc;
    const isCreator = c.creator._id.toString() === currentUserId;
    const friendUser = isCreator ? c.participant : c.creator;

    let creatorProgress = 0;
    let participantProgress = 0;

    if (["active", "completed", "expired"].includes(c.status) && c.startDate) {
        [creatorProgress, participantProgress] = await Promise.all([
            calculateChallengeParticipantProgress(c.creator._id, c),
            calculateChallengeParticipantProgress(c.participant._id, c)
        ]);
    }

    const evaluation = evaluateChallengeState(c, creatorProgress, participantProgress);
    if (evaluation.status !== c.status) {
        c.status = evaluation.status;
        await Challenge.findByIdAndUpdate(c._id, { status: evaluation.status });
    }

    const now = new Date();
    let remainingMs = 0;
    let remainingLabel = "";

    if (c.endDate && c.status === "active") {
        remainingMs = Math.max(0, new Date(c.endDate).getTime() - now.getTime());
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        if (days > 0) {
            remainingLabel = `${days} day${days === 1 ? "" : "s"} remaining`;
        } else if (hours > 0) {
            remainingLabel = `${hours} hour${hours === 1 ? "" : "s"} remaining`;
        } else {
            remainingLabel = "Ending soon";
        }
    } else if (c.status === "pending") {
        remainingLabel = "Pending acceptance";
    } else if (c.status === "completed") {
        remainingLabel = "Completed";
    } else if (c.status === "expired") {
        remainingLabel = "Ended";
    } else {
        remainingLabel = c.status;
    }

    return {
        ...c,
        userIsCreator: isCreator,
        friendUser: {
            _id: friendUser?._id,
            name: friendUser?.name,
            email: friendUser?.email
        },
        userProgress: isCreator ? creatorProgress : participantProgress,
        friendProgress: isCreator ? participantProgress : creatorProgress,
        creatorProgress,
        participantProgress,
        outcome: evaluation.outcome,
        remainingLabel,
        remainingMs
    };
}

// GET /api/challenges — List challenges involving the user
router.get("/", async (req, res, next) => {
    try {
        const challenges = await Challenge.find({
            $or: [{ creator: req.userId }, { participant: req.userId }]
        })
            .populate("creator", "name email")
            .populate("participant", "name email")
            .sort({ createdAt: -1 });

        const enriched = await Promise.all(
            challenges.map((c) => enrichChallenge(c, req.userId))
        );

        const active = enriched.filter((c) => c.status === "active");
        const pending = enriched.filter((c) => c.status === "pending");
        const past = enriched.filter((c) =>
            ["completed", "expired", "declined", "cancelled"].includes(c.status)
        );

        res.json({ active, pending, past, all: enriched });
    } catch (err) {
        next(err);
    }
});

// GET /api/challenges/:id — Single challenge details
router.get("/:id", async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id)
            .populate("creator", "name email")
            .populate("participant", "name email");

        if (!challenge) {
            return res.status(404).json({ error: "Challenge not found" });
        }

        const isMember =
            challenge.creator._id.toString() === req.userId ||
            challenge.participant._id.toString() === req.userId;

        if (!isMember) {
            return res.status(403).json({ error: "Not authorized to view this challenge" });
        }

        const enriched = await enrichChallenge(challenge, req.userId);
        res.json(enriched);
    } catch (err) {
        next(err);
    }
});

// POST /api/challenges — Create a new 1-on-1 challenge with a friend
router.post("/", async (req, res, next) => {
    try {
        const { participantId, type, category, goal, durationDays, title } = req.body;

        if (!participantId) {
            return res.status(400).json({ error: "Friend/participant is required" });
        }

        if (participantId.toString() === req.userId) {
            return res.status(400).json({ error: "Cannot create a challenge with yourself" });
        }

        // Verify mutual friendship
        const isFriend = await Friendship.findOne({
            $or: [
                { requester: req.userId, recipient: participantId },
                { requester: participantId, recipient: req.userId }
            ],
            status: "accepted"
        });

        if (!isFriend) {
            return res.status(403).json({ error: "You can only challenge accepted friends" });
        }

        // Validate type
        const validTypes = ["task", "category", "focus", "consistency"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid challenge type. Allowed: ${validTypes.join(", ")}` });
        }

        if (type === "category" && (!category || !category.trim())) {
            return res.status(400).json({ error: "Category is required for category challenges" });
        }

        // Validate duration
        const allowedDurations = [3, 7, 14];
        const duration = Number(durationDays);
        if (!allowedDurations.includes(duration)) {
            return res.status(400).json({ error: "Supported durations: 3, 7, or 14 days" });
        }

        // Validate goal
        const parsedGoal = Number(goal);
        if (!parsedGoal || parsedGoal < 1) {
            return res.status(400).json({ error: "Goal must be at least 1" });
        }

        // Default title generation if omitted
        let challengeTitle = (title || "").trim();
        if (!challengeTitle) {
            if (type === "task") challengeTitle = `${parsedGoal} Moves Sprint`;
            else if (type === "category") challengeTitle = `${category} Sprint`;
            else if (type === "focus") challengeTitle = `${parsedGoal}m Focus Challenge`;
            else if (type === "consistency") challengeTitle = `${duration}-Day Consistency`;
        }

        const challenge = await Challenge.create({
            creator: req.userId,
            participant: participantId,
            title: challengeTitle,
            type,
            category: type === "category" ? category.trim() : null,
            goal: parsedGoal,
            durationDays: duration,
            status: "pending"
        });

        const populated = await Challenge.findById(challenge._id)
            .populate("creator", "name email")
            .populate("participant", "name email");

        const enriched = await enrichChallenge(populated, req.userId);
        res.status(201).json(enriched);
    } catch (err) {
        next(err);
    }
});

// PUT /api/challenges/:id/respond — Accept or decline a challenge
router.put("/:id/respond", async (req, res, next) => {
    try {
        const { action } = req.body;
        if (!["accept", "decline"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
        }

        const challenge = await Challenge.findOne({
            _id: req.params.id,
            participant: req.userId,
            status: "pending"
        });

        if (!challenge) {
            return res.status(404).json({ error: "Pending challenge not found or already handled" });
        }

        if (action === "accept") {
            const now = new Date();
            const endDate = new Date(now.getTime() + challenge.durationDays * 24 * 60 * 60 * 1000);
            challenge.status = "active";
            challenge.startDate = now;
            challenge.endDate = endDate;
        } else {
            challenge.status = "declined";
        }

        await challenge.save();

        const populated = await Challenge.findById(challenge._id)
            .populate("creator", "name email")
            .populate("participant", "name email");

        const enriched = await enrichChallenge(populated, req.userId);
        res.json(enriched);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/challenges/:id — Cancel a pending challenge
router.delete("/:id", async (req, res, next) => {
    try {
        const challenge = await Challenge.findOne({
            _id: req.params.id,
            creator: req.userId,
            status: "pending"
        });

        if (!challenge) {
            return res.status(404).json({ error: "Pending challenge created by you not found" });
        }

        challenge.status = "cancelled";
        await challenge.save();

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
