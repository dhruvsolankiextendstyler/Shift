const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { getWeeklyStatsForUser } = require("../services/socialService");

// GET /api/friends — List accepted friends, incoming requests, and outgoing requests
router.get("/", async (req, res, next) => {
    try {
        const friendships = await Friendship.find({
            $or: [{ requester: req.userId }, { recipient: req.userId }]
        })
            .populate("requester", "name email")
            .populate("recipient", "name email")
            .sort({ updatedAt: -1 });

        const friends = [];
        const incoming = [];
        const outgoing = [];

        for (const f of friendships) {
            if (f.status === "accepted") {
                const isRequester = f.requester._id.toString() === req.userId;
                const friendUser = isRequester ? f.recipient : f.requester;
                if (!friendUser) continue;

                // Load high-level weekly stats
                const stats = await getWeeklyStatsForUser(friendUser._id);

                friends.push({
                    friendshipId: f._id,
                    user: {
                        _id: friendUser._id,
                        name: friendUser.name,
                        email: friendUser.email
                    },
                    stats,
                    since: f.updatedAt
                });
            } else if (f.status === "pending") {
                if (f.recipient?._id?.toString() === req.userId) {
                    incoming.push({
                        requestId: f._id,
                        from: f.requester,
                        createdAt: f.createdAt
                    });
                } else if (f.requester?._id?.toString() === req.userId) {
                    outgoing.push({
                        requestId: f._id,
                        to: f.recipient,
                        createdAt: f.createdAt
                    });
                }
            }
        }

        res.json({ friends, incoming, outgoing });
    } catch (err) {
        next(err);
    }
});

// GET /api/friends/search?q=... — Search for users by name or email
router.get("/search", async (req, res, next) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safeQuery, "i");

        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [{ name: regex }, { email: regex }]
        })
            .select("name email")
            .limit(10);

        if (users.length === 0) {
            return res.json([]);
        }

        const userIds = users.map((u) => u._id);
        const existingFriendships = await Friendship.find({
            $or: [
                { requester: req.userId, recipient: { $in: userIds } },
                { requester: { $in: userIds }, recipient: req.userId }
            ]
        });

        const statusMap = new Map();
        existingFriendships.forEach((f) => {
            const otherId = f.requester.toString() === req.userId
                ? f.recipient.toString()
                : f.requester.toString();
            statusMap.set(otherId, f.status);
        });

        const results = users.map((u) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            relationship: statusMap.get(u._id.toString()) || "none"
        }));

        res.json(results);
    } catch (err) {
        next(err);
    }
});

// POST /api/friends/request — Send a friend request
router.post("/request", async (req, res, next) => {
    try {
        const { recipientId, email } = req.body;
        let targetUserId = recipientId;

        if (!targetUserId && email) {
            const targetUser = await User.findOne({ email: email.trim().toLowerCase() });
            if (!targetUser) {
                return res.status(404).json({ error: "User with this email not found" });
            }
            targetUserId = targetUser._id.toString();
        }

        if (!targetUserId) {
            return res.status(400).json({ error: "Recipient ID or email is required" });
        }

        if (targetUserId.toString() === req.userId) {
            return res.status(400).json({ error: "Cannot send a friend request to yourself" });
        }

        const recipientUser = await User.findById(targetUserId);
        if (!recipientUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check existing friendship in either direction
        let existing = await Friendship.findOne({
            $or: [
                { requester: req.userId, recipient: targetUserId },
                { requester: targetUserId, recipient: req.userId }
            ]
        });

        if (existing) {
            if (existing.status === "accepted") {
                return res.status(400).json({ error: "You are already friends with this user" });
            }
            if (existing.status === "pending") {
                return res.status(400).json({ error: "A friend request is already pending" });
            }
            // If previously declined, allow re-requesting
            existing.requester = req.userId;
            existing.recipient = targetUserId;
            existing.status = "pending";
            await existing.save();
            return res.json({ success: true, friendship: existing });
        }

        const friendship = await Friendship.create({
            requester: req.userId,
            recipient: targetUserId,
            status: "pending"
        });

        res.status(201).json({ success: true, friendship });
    } catch (err) {
        next(err);
    }
});

// PUT /api/friends/request/:id — Accept or decline a friend request
router.put("/request/:id", async (req, res, next) => {
    try {
        const { action } = req.body;
        if (!["accept", "decline"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
        }

        const friendship = await Friendship.findOne({
            _id: req.params.id,
            recipient: req.userId,
            status: "pending"
        });

        if (!friendship) {
            return res.status(404).json({ error: "Friend request not found or already handled" });
        }

        friendship.status = action === "accept" ? "accepted" : "declined";
        await friendship.save();

        res.json({ success: true, status: friendship.status });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/friends/:friendId — Remove an existing friend
router.delete("/:friendId", async (req, res, next) => {
    try {
        const result = await Friendship.findOneAndDelete({
            $or: [
                { requester: req.userId, recipient: req.params.friendId },
                { requester: req.params.friendId, recipient: req.userId }
            ],
            status: "accepted"
        });

        if (!result) {
            return res.status(404).json({ error: "Friendship not found" });
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// GET /api/friends/:friendId/progress — Dedicated Friend Profile progress view
// STRICT PRIVACY: Only accepted friends can view, and only high-level aggregates are returned.
router.get("/:friendId/progress", async (req, res, next) => {
    try {
        const isFriend = await Friendship.findOne({
            $or: [
                { requester: req.userId, recipient: req.params.friendId },
                { requester: req.params.friendId, recipient: req.userId }
            ],
            status: "accepted"
        });

        if (!isFriend) {
            return res.status(403).json({ error: "You can only view progress of accepted friends" });
        }

        const friendUser = await User.findById(req.params.friendId).select("name email");
        if (!friendUser) {
            return res.status(404).json({ error: "Friend not found" });
        }

        const stats = await getWeeklyStatsForUser(friendUser._id);

        res.json({
            friend: friendUser,
            stats
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
