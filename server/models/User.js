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
            minlength: 6,
            required: function () {
                return !this.googleId && this.authProvider !== "google";
            }
        },

        googleId: {
            type: String,
            default: null,
            sparse: true
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },

        onboardingCompleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Hash the password before saving whenever it has changed.
// Async middleware in Mongoose resolves on return; no next() needed.
userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password") || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plain-text candidate against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
    if (!this.password) {
        return false;
    }
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
