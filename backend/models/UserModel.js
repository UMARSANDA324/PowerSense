import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        password: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
        },

        role: {
            type: String,
            enum: ["super-admin", "admin", "user"],
            default: "user",
        },

        state: String,
        lga: String,
        ward: String,
        feeder: String,

        isActive: {
            type: Boolean,
            default: true,
        },
        
        notificationPreference: {
            type: String,
            enum: ["email", "phone", "off"],
            default: "phone"
        }
    },
    { timestamps: true }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model("User", userSchema);  