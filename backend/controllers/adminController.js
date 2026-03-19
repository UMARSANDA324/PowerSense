import User from "../models/UserModel.js";
import Report from "../models/Report.js";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";
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
        if (!req.user) {
            return res.status(401).json({ message: "User context missing" });
        }

        const feederQuery = await getFeederQuery(req.user);
        const totalUsers = await User.countDocuments(feederQuery);
        const pendingReports = await Report.countDocuments({ status: "Pending", ...feederQuery });
        const totalReports = await Report.countDocuments(feederQuery);

        // Fetch the most recent power status, prioritizing the user's assigned feeder if it's a regular admin
        let powerStatusQuery = {};
        if (req.user.role === "admin" && req.user.assignedFeeders?.length > 0) {
            powerStatusQuery = { feeder: { $in: req.user.assignedFeeders } };
        }

        const powerStatus = await PowerStatus.findOne(powerStatusQuery)
            .sort({ updatedAt: -1 })
            .populate("feeder", "name");

        res.json({
            totalUsers,
            pendingReports,
            totalReports,
            powerStatus: powerStatus || { isActive: true, message: "System operational" }
        });
    } catch (error) {
        console.error("Error in getSystemStats:", error);
        res.status(500).json({ 
            message: "Error fetching system stats", 
            error: error.message 
        });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User context missing" });
        }
        const feederQuery = await getFeederQuery(req.user);
        const users = await User.find(feederQuery).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
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
        console.error("Error in updateUser:", error);
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
        const { fullName, email, password, state, lga, ward } = req.body;

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
            ward
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
            .populate({
                path: 'assignedFeeders',
                populate: {
                    path: 'ward',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                }
            })
            .sort({ createdAt: -1 });

        res.json(admins);
    } catch (error) {
        console.error("Error in getAllAdmins:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all available feeders (for assignment)
// @route   GET /api/admin/all-feeders
// @access  Private/SuperAdmin
export const getAllFeeders = async (req, res) => {
    try {
        console.log("Fetching all feeders...");
        const feeders = await Feeder.find({})
            .populate({
                path: 'ward',
                populate: {
                    path: 'lga',
                    populate: { path: 'state' }
                }
            })
            .sort({ name: 1 });

        console.log(`Successfully fetched ${feeders.length} feeders`);
        res.json(feeders);
    } catch (error) {
        console.error("Error in getAllFeeders:", error);
        res.status(500).json({ 
            message: "Error fetching feeders", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Assign feeders to an admin
// @route   PUT /api/admin/assign-feeders/:id
// @access  Private/SuperAdmin
export const assignFeedersToAdmin = async (req, res) => {
    try {
        const { feederIds, allowDuplicates = false } = req.body;
        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin || (admin.role !== "admin" && admin.role !== "super-admin")) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Production-level validation: Check if any of these feeders are already assigned to OTHER admins
        if (!allowDuplicates) {
            const alreadyAssigned = await User.find({
                _id: { $ne: adminId },
                assignedFeeders: { $in: feederIds }
            }).select("fullName assignedFeeders");

            if (alreadyAssigned.length > 0) {
                // Find specifically which feeders are conflicting
                const conflictingFeeders = [];
                for (const otherAdmin of alreadyAssigned) {
                    const overlaps = otherAdmin.assignedFeeders.filter(f => feederIds.includes(f.toString()));
                    if (overlaps.length > 0) {
                        conflictingFeeders.push({
                            admin: otherAdmin.fullName,
                            feeders: overlaps
                        });
                    }
                }
                
                return res.status(400).json({ 
                    message: "Duplicate assignment detected", 
                    conflicts: conflictingFeeders 
                });
            }
        }

        admin.assignedFeeders = feederIds;
        await admin.save();

        const updatedAdmin = await User.findById(adminId)
            .populate({
                path: 'assignedFeeders',
                populate: {
                    path: 'ward',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                }
            })
            .select("-password");

        res.json({
            message: "Grid permissions propagated successfully",
            admin: updatedAdmin
        });
    } catch (error) {
        console.error("Error in assignFeedersToAdmin:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user's profile with assigned feeders
// @route   GET /api/admin/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        console.log(`Fetching profile for user: ${req.user._id}`);
        const user = await User.findById(req.user._id)
            .populate({
                path: 'assignedFeeders',
                populate: {
                    path: 'ward',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                }
            })
            .select("-password");
        
        if (!user) {
            console.warn(`User profile not found: ${req.user._id}`);
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`Successfully fetched profile for: ${user.fullName}`);
        res.json(user);
    } catch (error) {
        console.error("Error in getProfile:", error);
        res.status(500).json({ 
            message: "Error fetching profile", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

