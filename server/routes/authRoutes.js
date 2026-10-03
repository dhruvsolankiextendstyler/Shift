const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const googleClient = new OAuth2Client();
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

// GOOGLE AUTH (SIGN IN / SIGN UP)
router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                error: "Google credential is required"
            });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({
                error: "Google authentication is not configured on the server. Please set GOOGLE_CLIENT_ID in server/.env."
            });
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: clientId
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error("Google token verification failed:", verifyError.message);
            return res.status(401).json({
                error: "Invalid or expired Google token"
            });
        }

        if (!payload || !payload.email) {
            return res.status(400).json({
                error: "Google token did not provide an email address"
            });
        }

        if (!payload.email_verified) {
            return res.status(400).json({
                error: "Google account email is not verified"
            });
        }

        const normalizedEmail = payload.email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            // Existing user: link googleId if not yet set
            if (!user.googleId) {
                user.googleId = payload.sub;
                if (!user.name && payload.name) {
                    user.name = payload.name.trim();
                }
                await user.save();
            }
        } else {
            // New user: create record with Google profile details
            user = await User.create({
                name: (payload.name || normalizedEmail.split("@")[0]).trim(),
                email: normalizedEmail,
                googleId: payload.sub,
                authProvider: "google"
            });
        }

        const token = signToken(user._id);

        res.json({
            token,
            user: publicUser(user)
        });
    } catch (error) {
        console.error("Google auth route error:", error);
        res.status(500).json({ error: error.message || "Failed to authenticate with Google" });
    }
});

module.exports = router;
