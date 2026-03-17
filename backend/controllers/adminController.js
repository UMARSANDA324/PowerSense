import User from "../models/UserModel.js";
import Report from "../models/Report.js";
import PowerStatus from "../models/PowerStatus.js";
import mongoose from "mongoose";
import { getAccessibleFeeders, getFeederQuery } from "../utils/feederAccess.js";

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

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = async (req, res) => {
    try {
        const feederQuery = await getFeederQuery(req.user);
        const totalUsers = await User.countDocuments();
        const pendingReports = await Report.countDocuments({ status: "Pending", ...feederQuery });
        const totalReports = await Report.countDocuments(feederQuery);
        const powerStatus = await PowerStatus.findOne();

        res.json({
            totalUsers,
            pendingReports,
            totalReports,
            powerStatus: powerStatus || { isActive: true }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user (Role/Status)
// @route   PUT /api/admin/users/:id
// @access  Private/SuperAdmin
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.role = req.body.role || user.role;
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/SuperAdmin
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            if (user.role === "super-admin") {
                return res.status(400).json({ message: "Cannot delete super-admin" });
            }
            await user.deleteOne();
            res.json({ message: "User removed" });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create Admin (SuperAdmin only)
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
            admin: {
                _id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all admins
// @route   GET /api/admin/admins
// @access  Private/SuperAdmin
export const getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "admin" })
            .select("-password")
            .populate("assignedFeeders", "name ward")
            .sort({ createdAt: -1 });

        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all available feeders (for assignment)
// @route   GET /api/admin/all-feeders
// @access  Private/SuperAdmin
export const getAllFeeders = async (req, res) => {
    try {
        const Feeder = mongoose.model("Feeder");
        const feeders = await Feeder.find()
            .populate("ward", "name lga")
            .sort({ name: 1 });

        res.json(feeders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Assign feeders to an admin
// @route   PUT /api/admin/assign-feeders/:id
// @access  Private/SuperAdmin
export const assignFeedersToAdmin = async (req, res) => {
    try {
        const { feederIds } = req.body;
        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin || admin.role !== "admin") {
            return res.status(404).json({ message: "Admin not found" });
        }

        admin.assignedFeeders = feederIds;
        await admin.save();

        const updatedAdmin = await User.findById(adminId)
            .populate("assignedFeeders", "name ward")
            .select("-password");

        res.json({
            message: "Feeders assigned successfully",
            admin: updatedAdmin
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user's profile with assigned feeders
// @route   GET /api/admin/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("assignedFeeders", "name ward")
            .select("-password");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

