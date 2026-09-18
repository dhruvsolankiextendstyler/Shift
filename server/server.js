const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const actionRoutes = require("./routes/actionRoutes");
const authMiddleware = require("./middleware/authMiddleware");

app.use("/api/auth", authRoutes);

// Everything below requires a valid token; req.userId is set by the
// middleware and used to scope all data to the authenticated user.
app.use("/api/tasks", authMiddleware, taskRoutes);
app.use("/api/sessions", authMiddleware, sessionRoutes);
app.use("/api/recommendation", authMiddleware, recommendationRoutes);
app.use("/api/actions", authMiddleware, actionRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "SHIFT backend is running ⚡"
    });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully ⚡");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SHIFT server running on port ${PORT}`);
});