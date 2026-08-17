import User from "../models/UserModel.js";
import Report from "../models/Report.js";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";
import mongoose from "mongoose";
import { getAccessibleFeeders, getFeederQuery } from "../utils/feederAccess.js";
import { normalizeRole, hasHigherOrEqualPrivilege, getManageableRoles, validateRoleAssignment } from "../config/identityConfig.js";
import { getDefaultCompany } from "../services/tenantResolver.js";
import { publishPlatformEvent } from "../services/platformEventDispatcher.js";

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

        // Get appropriate queries for users and reports
        const userFeederQuery = req.user.role === "admin" 
            ? await getFeederQuery(req.user, "assignedFeeders") 
            : {};
        
        const reportFeederQuery = req.user.role === "admin" 
            ? await getFeederQuery(req.user, "feeder") 
            : {};
        
        // Run counts in parallel
        const [totalUsers, pendingReports, totalReports] = await Promise.all([
            User.countDocuments(userFeederQuery),
            Report.countDocuments({ status: "Pending", ...reportFeederQuery }),
            Report.countDocuments(reportFeederQuery)
        ]);

        // Fetch the most recent power status
        let powerStatusQuery = {};
        if (req.user.role === "admin" && req.user.assignedFeeders?.length > 0) {
            powerStatusQuery = { feeder: { $in: req.user.assignedFeeders } };
        }

        const powerStatus = await PowerStatus.findOne(powerStatusQuery)
            .sort({ updatedAt: -1 })
            .select("feeder status isActive updatedAt lastUpdated")
            .populate("feeder", "name")
            .lean(); // Use lean() for faster queries

        res.json({
            totalUsers,
            pendingReports,
            totalReports,
            powerStatus: powerStatus || { status: "on", isActive: true, message: "System operational" }
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
        const userFeederQuery = req.user.role === "admin" 
            ? await getFeederQuery(req.user, "assignedFeeders") 
            : {};
        
        const users = await User.find(userFeederQuery)
            .select("-password")
            .sort({ createdAt: -1 })
            .lean(); // Faster
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
            // Validate role assignment if role is being changed
            if (req.body.role && req.body.role !== user.role) {
                const validation = validateRoleAssignment(req.user.role, req.body.role);
                if (!validation.valid) {
                    return res.status(403).json({ 
                        message: validation.reason,
                        code: 'ROLE_ASSIGNMENT_INVALID'
                    });
                }
                user.role = req.body.role;
            }
            
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

            const updatedUser = await user.save();
            const normalizedRole = normalizeRole(updatedUser.role);

            publishPlatformEvent({
                type: "user.updated",
                companyId: updatedUser.companyId,
                data: { user: { _id: updatedUser._id, role: updatedUser.role, isActive: updatedUser.isActive } }
            });
            
            res.json({
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role,
                normalizedRole: normalizedRole,
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
            const normalizedRole = normalizeRole(user.role);
            const requesterNormalizedRole = normalizeRole(req.user.role);
            
            // Check if user can be deleted based on role hierarchy
            if (!hasHigherOrEqualPrivilege(requesterNormalizedRole, normalizedRole)) {
                return res.status(403).json({ 
                    message: "Cannot delete user with equal or higher privilege" 
                });
            }
            
            // Prevent deletion of platform-owner and company-super-admin by lower roles
            if (normalizedRole === 'platform-owner' && requesterNormalizedRole !== 'platform-owner') {
                return res.status(400).json({ message: "Cannot delete platform owner" });
            }
            
            // Legacy check for backward compatibility
            if (user.role === "super-admin" && req.user.role !== "super-admin") {
                return res.status(400).json({ message: "Cannot delete super-admin" });
            }
            
            // Clear assigned status on feeders if they exist
            if (user.assignedFeeders && user.assignedFeeders.length > 0) {
                await Feeder.updateMany(
                    { _id: { $in: user.assignedFeeders } },
                    { isAssigned: false }
                );
            }
            await user.deleteOne();
            publishPlatformEvent({
                type: "user.deleted",
                companyId: user.companyId,
                data: { user: { _id: user._id, role: user.role } }
            });
            res.json({ message: "User removed and associated grid permissions released" });
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
        const { fullName, email, password, state, lga, ward, assignedFeederId, role } = req.body;

        const adminExists = await User.findOne({ email });

        if (adminExists) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        // Validate role assignment if provided
        const userRole = role || "admin"; // Default to admin for backward compatibility
        const validation = validateRoleAssignment(req.user.role, userRole);
        if (!validation.valid) {
            return res.status(403).json({ 
                message: validation.reason,
                code: 'ROLE_ASSIGNMENT_INVALID'
            });
        }

        const companyId = req.user.role === "platform-owner"
            ? req.body.companyId
            : req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ message: "Company context is required" });
        }

        // Validate state against company coverage
        if (req.user.role !== "platform-owner" && state) {
            const allowedStates = req.coverageStateNames || [];
            if (allowedStates.length > 0 && !allowedStates.includes(String(state).trim())) {
                return res.status(403).json({
                    message: `State '${state}' is outside your company's coverage area.`
                });
            }
        }

        // Fetch the feeder to set the feeder string for backwards compatibility
        let feederName = "";
        if (assignedFeederId) {
            const feederObj = await Feeder.findById(assignedFeederId);
            if (feederObj) {
                feederName = feederObj.name;
            }
        }

        const admin = await User.create({
            fullName,
            email,
            password,
            role: userRole,
            state,
            lga,
            ward,
            feeder: feederName,
            assignedFeeders: assignedFeederId ? [assignedFeederId] : [],
            companyId: companyId
        });

        // If we assigned a feeder, update Feeder.isAssigned
        if (assignedFeederId) {
            await Feeder.findByIdAndUpdate(assignedFeederId, { isAssigned: true });
        }

        publishPlatformEvent({
            type: userRole === "company-super-admin" || userRole === "super-admin" ? "superadmin.created" : "admin.created",
            companyId: admin.companyId,
            data: { user: { _id: admin._id, fullName: admin.fullName, role: admin.role } }
        });

        const normalizedRole = normalizeRole(admin.role);

        res.status(201).json({
            message: "Admin created successfully",
            admin: {
                _id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                normalizedRole: normalizedRole,
                feeder: admin.feeder,
                assignedFeeders: admin.assignedFeeders
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
        // CRITICAL: Apply tenant filtering to prevent cross-tenant data leakage
        const filter = { role: "admin" };
        
        // Only filter by companyId if user is not platform owner
        if (req.user?.role !== 'platform-owner') {
            if (req.user?.companyId) {
                filter.companyId = req.user.companyId;
            } else {
                // If no companyId and not platform owner, return empty
                filter.companyId = null;
            }
        }
        
        const admins = await User.find(filter)
            .select("-password")
            .populate({
                path: 'assignedFeeders',
                match: { isActive: { $ne: false } },
                select: 'name _id' // Only get needed fields
            })
            .sort({ createdAt: -1 })
            .lean();

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
        
        // CRITICAL: Apply tenant filtering to prevent cross-tenant data leakage
        const filter = { isActive: { $ne: false } };
        
        // Only filter by companyId if user is not platform owner
        if (req.user?.role !== 'platform-owner') {
            if (req.user?.companyId) {
                filter.companyId = req.user.companyId;
            } else {
                filter.companyId = null;
            }
        }
        
        const feeders = await Feeder.find(filter)
            .select('name _id isAssigned') // Only select what frontend needs
            .sort({ name: 1 })
            .lean(); // Lean makes it faster

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

        // Strict validation: Check if any of these feeders are already assigned to OTHER admins
        // CRITICAL: Apply tenant filtering to prevent cross-tenant data leakage
        const conflictFilter = {
            _id: { $ne: adminId },
            assignedFeeders: { $in: feederIds }
        };
        
        // Only filter by companyId if user is not platform owner
        if (req.user?.role !== 'platform-owner') {
            if (req.user?.companyId) {
                conflictFilter.companyId = req.user.companyId;
            } else {
                conflictFilter.companyId = null;
            }
        }
        
        const conflictingUsers = await User.find(conflictFilter).select("fullName assignedFeeders");

        if (conflictingUsers.length > 0) {
            const conflictDetails = conflictingUsers.map(u => ({
                admin: u.fullName,
                feederIds: u.assignedFeeders.filter(f => feederIds.includes(f.toString()))
            }));

            return res.status(400).json({
                message: "One or more feeders are already assigned to other administrators.",
                conflicts: conflictDetails
            });
        }

        // Get the current feeders of this admin to handle cleanup
        const previousFeeders = admin.assignedFeeders || [];

        // Apply new assignments
        admin.assignedFeeders = feederIds;

        // Update the feeder string for backwards compatibility (use first feeder if exists)
        if (feederIds && feederIds.length > 0) {
            const firstFeeder = await Feeder.findById(feederIds[0]);
            if (firstFeeder) {
                admin.feeder = firstFeeder.name;
            }
        } else {
            admin.feeder = "";
        }

        await admin.save();

        // Sync with Feeder model: Update isAssigned status
        // 1. Mark feeders being REMOVED as not assigned
        const removedFeeders = previousFeeders.filter(f => !feederIds.includes(f.toString()));
        if (removedFeeders.length > 0) {
            await Feeder.updateMany(
                { _id: { $in: removedFeeders } },
                { isAssigned: false }
            );
        }

        // 2. Mark feeders being ADDED as assigned
        if (feederIds.length > 0) {
            await Feeder.updateMany(
                { _id: { $in: feederIds } },
                { isAssigned: true }
            );
        }

        const updatedAdmin = await User.findById(adminId)
            .populate({
                path: 'assignedFeeders',
                match: { isActive: { $ne: false } },
                populate: {
                    path: 'wards',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                }
            })
            .select("-password");

        const adminObj = updatedAdmin.toObject();
        adminObj.assignedFeeders = adminObj.assignedFeeders.filter(f => f !== null);

        res.json({
            message: "Grid permissions propagated successfully",
            admin: adminObj
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
                match: { isActive: { $ne: false } },
                select: 'name _id' // Only get needed fields for frontend
            })
            .select("-password")
            .lean();

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

// @desc    Promote a User to Admin with substation and feeder assignment
// @route   PUT /api/admin/promote-to-admin/:id
// @access  Private/SuperAdmin
export const promoteUserToAdmin = async (req, res) => {
    try {
        const { injectionSubstationId, feederId, role } = req.body;
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const normalizedCurrentRole = normalizeRole(user.role);
        const targetRole = role || "admin"; // Default to admin for backward compatibility
        const normalizedTargetRole = normalizeRole(targetRole);

        // Validate role assignment
        const validation = validateRoleAssignment(req.user.role, targetRole);
        if (!validation.valid) {
            return res.status(403).json({ 
                message: validation.reason,
                code: 'ROLE_ASSIGNMENT_INVALID'
            });
        }

        // Legacy checks for backward compatibility
        if (user.role === "super-admin") {
            return res.status(400).json({ message: "Cannot promote super-admin" });
        }

        if (normalizedCurrentRole === 'admin' || normalizedCurrentRole === 'company-super-admin' || normalizedCurrentRole === 'platform-owner') {
            return res.status(400).json({ message: "User is already an admin or higher" });
        }

        // Validate feeder belongs to selected injection substation
        if (feederId && injectionSubstationId) {
            const feeder = await Feeder.findById(feederId);
            if (!feeder) {
                return res.status(404).json({ message: "Feeder not found" });
            }
            
            if (feeder.injectionSubstationId?.toString() !== injectionSubstationId.toString()) {
                return res.status(400).json({ message: "Selected feeder does not belong to the selected injection substation" });
            }
        }

        // Update user role and assignments
        user.role = targetRole;
        
        if (feederId) {
            user.assignedFeeders = [feederId];
            const feeder = await Feeder.findById(feederId);
            if (feeder) {
                user.feeder = feeder.name;
            }
            // Mark feeder as assigned
            await Feeder.findByIdAndUpdate(feederId, { isAssigned: true });
        }

        await user.save();

        // Populate and return updated user
        const updatedUser = await User.findById(userId)
            .populate({
                path: 'assignedFeeders',
                match: { isActive: { $ne: false } },
                select: 'name _id'
            })
            .select("-password");

        res.json({
            message: "User promoted successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error in promoteUserToAdmin:", error);
        res.status(500).json({
            message: "Error promoting user",
            error: error.message
        });
    }
};

// @desc    Get all injection substations with associated feeders
// @route   GET /api/admin/injection-substations
// @access  Private/Admin
export const getInjectionSubstations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User context missing" });
        }

        console.log(`Fetching injection substations for user: ${req.user._id} (role: ${req.user.role})`);

        // Get accessible feeder IDs based on user role
        let accessibleFeederIds = [];
        const hasGlobalAccess = ["super-admin", "platform-owner", "company-super-admin"].includes(req.user.role);
        if (hasGlobalAccess) {
            // Super admin & platform owner can see all feeders
            const allFeeders = await Feeder.find({ isActive: { $ne: false } }).select("_id").lean();
            accessibleFeederIds = allFeeders.map(f => f._id.toString());
        } else if (req.user.role === "admin" && req.user.assignedFeeders?.length > 0) {
            // Feeder admin only sees their assigned feeders
            accessibleFeederIds = req.user.assignedFeeders.map(id => id.toString());
        }

        console.log(`Accessible feeder count: ${accessibleFeederIds.length}`);

        // Find relevant injection substations
        let substations = [];

        if (req.user.role === "platform-owner") {
            // Platform owner gets all substations
            substations = await InjectionSubstation.find({ status: { $ne: "inactive" } })
                .sort({ name: 1 })
                .lean();
        } else if (req.user.role === "super-admin" || req.user.role === "company-super-admin") {
            // Super admin gets substations in their company
            const query = { status: { $ne: "inactive" } };
            if (req.user.companyId) {
                query.companyId = req.user.companyId;
            }
            substations = await InjectionSubstation.find(query)
                .sort({ name: 1 })
                .lean();
        } else {
            // Feeder admin only gets substations that have at least one of their assigned feeders
            const feederSubstationIds = await Feeder.distinct("injectionSubstationId", {
                _id: { $in: accessibleFeederIds.map(id => new mongoose.Types.ObjectId(id)) },
                isActive: { $ne: false }
            });

            if (feederSubstationIds.length > 0) {
                substations = await InjectionSubstation.find({
                    _id: { $in: feederSubstationIds },
                    status: { $ne: "inactive" }
                }).sort({ name: 1 }).lean();
            }
        }

        console.log(`Found ${substations.length} relevant injection substations`);

        // Attach feeders to each substation
        for (const substation of substations) {
            const substationFeeders = await Feeder.find({
                injectionSubstationId: substation._id,
                isActive: { $ne: false },
                ...(req.user.role === "admin" ? { _id: { $in: accessibleFeederIds } } : {})
            }).select('name _id isAssigned injectionSubstationId').sort({ name: 1 }).lean();

            substation.feeders = substationFeeders;
        }

        res.json(substations);
    } catch (error) {
        console.error("Error in getInjectionSubstations:", error);
        res.status(500).json({
            message: "Error fetching injection substations",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export default { adminTest, getSystemStats, getAllUsers, updateUser, deleteUser, createAdmin, getAllAdmins, getAllFeeders, assignFeedersToAdmin, getProfile, promoteUserToAdmin, getInjectionSubstations };
