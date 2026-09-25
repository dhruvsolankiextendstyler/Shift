const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        // Downtime engagement — bumped when the user hits "Done" in Deep Read
        // / Word Forge (see activityRoutes). Surfaced in Insights.
        readCount: {
            type: Number,
            default: 0
        },

        vocabCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Hash the password before saving whenever it has changed.
// Async middleware in Mongoose resolves on return; no next() needed.
userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plain-text candidate against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
