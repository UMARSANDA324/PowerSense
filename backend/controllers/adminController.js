import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";

// @desc    Admin test route
// @route   GET /api/admin/test
// @access  Private/Admin
export const adminTest = async (req, res) => {
    res.json({
        message: "Admin access verified! You are authorized as " + req.user.role,
        user: {
            _id: req.user._id,
            fullName: req.user.fullName,
            role: req.user.role
        }
    });
};

// Create Admin
export const createAdmin = async (req, res) => {
    try {
        const { fullName, email, password, state, lga } = req.body;

        const adminExists = await User.findOne({ email });

        if (adminExists) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        const admin = await User.create({
            fullName,
            email,
            password,
            role: "admin",
            state,
            lga,
        });

        res.status(201).json({
            message: "Admin created successfully",
            admin,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
