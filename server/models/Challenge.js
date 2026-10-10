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
        },
        editRequest: {
            status: {
                type: String,
                enum: ["pending", "accepted", "declined", "cancelled"],
                default: null
            },
            requestedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },
            title: {
                type: String,
                trim: true,
                maxlength: 100
            },
            type: {
                type: String,
                enum: ["task", "category", "focus", "consistency"]
            },
            category: {
                type: String,
                trim: true,
                default: null
            },
            goal: {
                type: Number,
                min: 1
            },
            durationDays: {
                type: Number,
                enum: [3, 7, 14]
            },
            createdAt: {
                type: Date,
                default: null
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Challenge", challengeSchema);
