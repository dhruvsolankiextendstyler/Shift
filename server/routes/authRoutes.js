const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function signToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
}

function publicUser(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email
    };
}

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email, and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters"
            });
        }

        const existing = await User.findOne({
            email: email.toLowerCase()
        });

        if (existing) {
            return res.status(409).json({
                error: "An account with this email already exists"
            });
        }

        const user = await User.create({ name, email, password });
        const token = signToken(user._id);

        res.status(201).json({
            token,
            user: publicUser(user)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase()
        });

        // Same message for missing user and wrong password so we don't
        // reveal which emails are registered.
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const token = signToken(user._id);

        res.json({
            token,
            user: publicUser(user)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// CURRENT USER
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
