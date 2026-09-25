const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Fail fast if critical secrets are missing rather than starting a
// half-configured server (e.g. tokens signed with an undefined secret).
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
    console.error(
        `Missing required environment variables: ${missingEnv.join(", ")}`
    );
    process.exit(1);
}

const app = express();

// CORS: in production, allow only the configured frontend origin(s).
// CLIENT_ORIGIN may be a comma-separated list. If unset (local dev),
// fall back to allowing any origin.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : true
    })
);

app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const actionRoutes = require("./routes/actionRoutes");
const activityRoutes = require("./routes/activityRoutes");
const authMiddleware = require("./middleware/authMiddleware");

app.use("/api/auth", authRoutes);

// Everything below requires a valid token; req.userId is set by the
// middleware and used to scope all data to the authenticated user.
app.use("/api/tasks", authMiddleware, taskRoutes);
app.use("/api/sessions", authMiddleware, sessionRoutes);
app.use("/api/recommendation", authMiddleware, recommendationRoutes);
app.use("/api/actions", authMiddleware, actionRoutes);
app.use("/api/activity", authMiddleware, activityRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "SHIFT backend is running ⚡"
    });
});

// 404 for unmatched routes.
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Central error handler: log full detail server-side, return a safe,
// generic message to the client so internals/secrets aren't exposed.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: "Something went wrong"
    });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully ⚡");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SHIFT server running on port ${PORT}`);
});
