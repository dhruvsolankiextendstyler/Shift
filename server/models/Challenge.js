const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
    {
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        type: {
            type: String,
            enum: ["task", "category", "focus", "consistency"],
            required: true
        },
        category: {
            type: String,
            default: null,
            trim: true
        },
        goal: {
            type: Number,
            required: true,
            min: 1
        },
        durationDays: {
            type: Number,
            enum: [3, 7, 14],
            required: true
        },
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ["pending", "active", "completed", "expired", "declined", "cancelled"],
            default: "pending",
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Challenge", challengeSchema);
