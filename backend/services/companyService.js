import mongoose from "mongoose";
import Company from "../models/Company.js";
import User from "../models/UserModel.js";
import Audit from "../models/Audit.js";
import Country from "../models/Location/Country.js";
import State from "../models/Location/State.js";
import sendEmail from "../utils/sendEmail.js";
import { validateCompanyData } from "../utils/companyValidation.js";
import { normalizeCompanyStatus } from "../utils/companyLifecycle.js";
import {
    normalizeLifecycleState,
    buildLifecycleStatus,
    validateGovernanceRoleBoundary
} from "../utils/companyGovernanceValidation.js";

/**
 * Validates country exists and coverage states belong to the selected country
 */
export const validateCompanyCountryAndCoverage = async (companyData, existingCompany = null) => {
    const rawCountry = companyData.country || companyData.countryId || companyData.headquarters?.country || existingCompany?.headquarters?.country;
    const coverageStates = companyData.coverageStates !== undefined ? companyData.coverageStates : existingCompany?.coverageStates;

    if (!rawCountry && (!coverageStates || coverageStates.length === 0)) {
        return;
    }

    let countryDoc = null;
    if (rawCountry) {
        if (mongoose.Types.ObjectId.isValid(rawCountry)) {
            countryDoc = await Country.findById(rawCountry);
        } else {
            const countryStr = String(rawCountry).trim();
            countryDoc = await Country.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${countryStr}$`, "i") } },
                    { code: countryStr.toUpperCase() }
                ]
            });
        }

        if (!countryDoc && rawCountry) {
            throw new Error(`Selected country '${rawCountry}' does not exist.`);
        }
    }

    if (coverageStates && Array.isArray(coverageStates) && coverageStates.length > 0) {
        for (const stateItem of coverageStates) {
            const stateStr = typeof stateItem === "string" ? stateItem.trim() : stateItem?.name || String(stateItem);
            let stateDoc = null;
            if (mongoose.Types.ObjectId.isValid(stateStr)) {
                stateDoc = await State.findById(stateStr).populate("country");
            } else {
                const query = { name: { $regex: new RegExp(`^${stateStr}$`, "i") } };
                if (countryDoc) query.country = countryDoc._id;
                stateDoc = await State.findOne(query).populate("country");
            }

            if (!stateDoc) {
                throw new Error(`Coverage state '${stateStr}' not found.`);
            }

            if (countryDoc && stateDoc.country) {
                const stateCountryId = stateDoc.country._id ? stateDoc.country._id.toString() : stateDoc.country.toString();
                if (stateCountryId !== countryDoc._id.toString()) {
                    throw new Error(`Coverage state '${stateDoc.name}' does not belong to ${countryDoc.name}.`);
                }
            }
        }
    }
};

/**
 * Creates a new company
 * @param {Object} companyData - Company data to create
 * @returns {Promise<Object>} - Created company document
 */
export const createCompany = async (companyData) => {
    const normalizedStatus = normalizeCompanyStatus(companyData?.status || "pending-setup");
    const normalizedPayload = {
        ...companyData,
        status: normalizedStatus,
        lifecycleState: normalizedStatus === "active"
            ? "active"
            : normalizedStatus === "suspended"
                ? "suspended"
                : normalizedStatus === "archived"
                    ? "archived"
                    : "draft"
    };

    // Validate company data
    const validation = validateCompanyData(normalizedPayload);
    if (!validation.valid) {
        throw new Error(`Company validation failed: ${validation.errors.join(", ")}`);
    }

    // Validate country & coverage states
    await validateCompanyCountryAndCoverage(normalizedPayload);

    // Check if company with same name, short name, or code already exists
    const existingCompany = await Company.findOne({
        $or: [
            { name: normalizedPayload.name },
            { shortName: normalizedPayload.shortName },
            { code: normalizedPayload.code.toUpperCase() }
        ]
    });

    if (existingCompany) {
        if (existingCompany.name === normalizedPayload.name) {
            throw new Error("Company with this name already exists");
        }
        if (existingCompany.shortName === normalizedPayload.shortName) {
            throw new Error("Company with this short name already exists");
        }
        if (existingCompany.code === normalizedPayload.code.toUpperCase()) {
            throw new Error("Company with this code already exists");
        }
    }

    // Ensure code is uppercase
    normalizedPayload.code = normalizedPayload.code.toUpperCase();

    // Create company
    const company = new Company(normalizedPayload);
    return await company.save();
};

/**
 * Gets a company by ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} - Company document or null
 */
export const getCompanyById = async (companyId) => {
    return await Company.findById(companyId).populate("governance.ownerUserId", "fullName email phone lastLogin isActive");
};

/**
 * Gets a company by code
 * @param {string} code - Company code
 * @returns {Promise<Object|null>} - Company document or null
 */
export const getCompanyByCode = async (code) => {
    return await Company.findOne({ code: code.toUpperCase() });
};

/**
 * Gets all companies
 * @param {Object} filters - Optional filters (status, tier, etc.)
 * @returns {Promise<Array>} - Array of company documents
 */
export const getAllCompanies = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.subscriptionTier) {
        query["subscription.tier"] = filters.subscriptionTier;
    }

    return await Company.find(query).sort({ createdAt: -1 });
};

/**
 * Updates a company by ID
 * @param {string} companyId - Company ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated company document
 */
export const updateCompany = async (companyId, updateData) => {
    // Validate update data
    const validation = validateCompanyData(updateData, true);
    if (!validation.valid) {
        throw new Error(`Company validation failed: ${validation.errors.join(", ")}`);
    }

    const currentCompany = await Company.findById(companyId);
    if (!currentCompany) {
        throw new Error("Company not found");
    }

    // Validate country & coverage states
    await validateCompanyCountryAndCoverage(updateData, currentCompany);

    // Check for duplicate name, short name, or code
    if (updateData.name || updateData.shortName || updateData.code) {
        const existingCompany = await Company.findOne({
            _id: { $ne: companyId },
            $or: [
                { name: updateData.name },
                { shortName: updateData.shortName },
                { code: updateData.code ? updateData.code.toUpperCase() : undefined }
            ].filter(condition => condition.name || condition.shortName || condition.code)
        });

        if (existingCompany) {
            if (existingCompany.name === updateData.name) {
                throw new Error("Company with this name already exists");
            }
            if (existingCompany.shortName === updateData.shortName) {
                throw new Error("Company with this short name already exists");
            }
            if (existingCompany.code === updateData.code.toUpperCase()) {
                throw new Error("Company with this code already exists");
            }
        }
    }

    // Ensure code is uppercase if provided
    if (updateData.code) {
        updateData.code = updateData.code.toUpperCase();
    }

    return await Company.findByIdAndUpdate(
        companyId,
        updateData,
        { new: true, runValidators: true }
    );
};

/**
 * Updates company status
 * @param {string} companyId - Company ID
 * @param {string} status - New status (active, suspended, inactive)
 * @returns {Promise<Object>} - Updated company document
 */
export const updateCompanyStatus = async (companyId, status, suspensionData = {}) => {
    const normalizedStatus = normalizeCompanyStatus(status);
    const validStatuses = ["pending-setup", "active", "suspended", "inactive", "archived"];
    
    if (!validStatuses.includes(normalizedStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const update = { status: normalizedStatus, lifecycleState: normalizedStatus === "active" ? "active" : normalizedStatus === "suspended" ? "suspended" : normalizedStatus === "archived" ? "archived" : "draft" };
    if (normalizedStatus === "suspended") {
        update.suspension = {
            reason: suspensionData.reason || "No reason specified",
            suspendedAt: new Date(),
            suspendedBy: suspensionData.suspendedBy
        };
    } else if (normalizedStatus === "active") {
        update.suspension = {
            reason: "",
            suspendedAt: null,
            suspendedBy: null
        };
    }

    return await Company.findByIdAndUpdate(
        companyId,
        update,
        { new: true, runValidators: true }
    );
};

/**
 * Deletes a company by ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} - Deleted company document
 */
export const deleteCompany = async (companyId) => {
    const company = await Company.findById(companyId);
    
    if (!company) {
        throw new Error("Company not found");
    }

    // Check if company has any dependencies (future implementation)
    // For now, we'll allow deletion but this should be enhanced in future sprints

    return await Company.findByIdAndDelete(companyId);
};

/**
 * Gets active companies only
 * @returns {Promise<Array>} - Array of active company documents
 */
export const getActiveCompanies = async () => {
    return await Company.find({ status: "active" }).sort({ name: 1 });
};

/**
 * Gets company count by status
 * @param {string} status - Company status
 * @returns {Promise<number>} - Count of companies with given status
 */
export const getCompanyCountByStatus = async (status) => {
    return await Company.countDocuments({ status });
};

/**
 * Searches companies by name or short name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching company documents
 */
export const searchCompanies = async (searchTerm) => {
    const regex = new RegExp(searchTerm, "i");
    return await Company.find({
        $or: [
            { name: regex },
            { shortName: regex },
            { code: regex }
        ]
    }).sort({ name: 1 });
};

/**
 * Gets company settings
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} - Company settings object
 */
export const getCompanySettings = async (companyId) => {
    const company = await Company.findById(companyId).select("settings");
    
    if (!company) {
        throw new Error("Company not found");
    }

    return company.settings;
};

/**
 * Updates company settings
 * @param {string} companyId - Company ID
 * @param {Object} settingsData - Settings data to update
 * @returns {Promise<Object>} - Updated company document
 */
export const updateCompanySettings = async (companyId, settingsData) => {
    return await Company.findByIdAndUpdate(
        companyId,
        { $set: { settings: settingsData } },
        { new: true, runValidators: true }
    );
};

/**
 * Gets all companies formatted for Platform Owner registry with stats and server pagination
 * @param {Object} options - pagination, sort, and query options
 * @returns {Promise<Object>} - Paginated companies registry payload
 */
export const getCompaniesRegistry = async (options = {}) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    // Search filter (Task 8)
    if (options.search) {
        const regex = new RegExp(options.search, "i");
        query.$or = [
            { name: regex },
            { code: regex },
            { "headquarters.state": regex },
            { "headquarters.country": regex }
        ];
    }
    
    // Exact filters
    if (options.status) {
        query.status = options.status;
    }
    if (options.state) {
        query["headquarters.state"] = new RegExp(options.state, "i");
    }
    if (options.country) {
        query["headquarters.country"] = new RegExp(options.country, "i");
    }
    if (options.code) {
        query.code = options.code.toUpperCase();
    }

    // Sorting (Task 2)
    const sort = {};
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    sort[sortBy] = sortOrder;

    const total = await Company.countDocuments(query);
    const companies = await Company.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

    // Fetch all registry counts in one aggregation so cards stay consistent without N+1 queries.
    const data = [];
    const companyIds = companies.map((company) => company._id);
    const UserModel = mongoose.model("User");
    const companyUsers = await UserModel.find({
        companyId: { $in: companyIds },
        role: { $in: ["super-admin", "company-super-admin"] },
        isActive: { $ne: false }
    }).select("companyId fullName email phone lastLogin isActive role").lean();

    const userCounts = await UserModel.aggregate([
        { $match: { companyId: { $in: companyIds }, isActive: { $ne: false } } },
        { $group: { _id: { companyId: "$companyId", role: "$role" }, count: { $sum: 1 } } }
    ]);
    const countByCompanyAndRole = new Map(userCounts.map((row) => [
        `${row._id.companyId ? row._id.companyId.toString() : row._id.companyId}:${row._id.role}`,
        row.count
    ]));

    const superAdminByCompany = new Map();
    companyUsers.forEach((user) => {
        if (!superAdminByCompany.has(user.companyId.toString())) {
            superAdminByCompany.set(user.companyId.toString(), user);
        }
    });

    for (const company of companies) {
        const companyId = company._id;

        // Count active accounts belonging to this company only.
        const companyKey = companyId.toString();
        const superAdminsCount = ["super-admin", "company-super-admin"].reduce((total, role) => total + (countByCompanyAndRole.get(`${companyKey}:${role}`) || 0), 0);
        const adminsCount = ["admin", "regional-admin"].reduce((total, role) => total + (countByCompanyAndRole.get(`${companyKey}:${role}`) || 0), 0);
        const usersCount = countByCompanyAndRole.get(`${companyKey}:user`) || 0;

        // Last Activity (Task 2)
        // Check latest login from Users
        const latestUser = await UserModel.findOne({ companyId }).sort({ lastLogin: -1 }).select("lastLogin");
        // Check latest action from Audits
        const latestAudit = await mongoose.model("Audit").findOne({ companyId }).sort({ timestamp: -1 }).select("timestamp");

        const assignedSuperAdmin = superAdminByCompany.get(companyId.toString()) || null;
        let lastActivity = company.updatedAt || company.createdAt;
        if (latestUser?.lastLogin && latestUser.lastLogin > lastActivity) {
            lastActivity = latestUser.lastLogin;
        }
        if (latestAudit?.timestamp && latestAudit.timestamp > lastActivity) {
            lastActivity = latestAudit.timestamp;
        }

        data.push({
            ...company.toObject(),
            superAdminsCount,
            adminsCount,
            usersCount,
            assignedSuperAdmin,
            assignedSuperAdminName: assignedSuperAdmin?.fullName || null,
            assignedSuperAdminEmail: assignedSuperAdmin?.email || null,
            companyOwnerName: company.governance?.ownerUserId ? company.governance.ownerUserId.fullName || null : null,
            companyOwnerEmail: company.governance?.ownerUserId ? company.governance.ownerUserId.email || null : null,
            lastActivity
        });
    }

    return {
        companies: data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
    };
};

/**
 * Gets dashboard statistics for Platform Owner dashboard
 * @returns {Promise<Object>} - Dashboard stats object
 */
export const getCompanyDashboardStats = async () => {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: "active" });
    const suspendedCompanies = await Company.countDocuments({ status: "suspended" });

    // Total Users and Admins in the entire system (across all companies)
    const totalUsers = await mongoose.model("User").countDocuments({ role: "user", companyId: { $ne: null } });
    const totalAdmins = await mongoose.model("User").countDocuments({ role: { $in: ["admin", "super-admin", "company-super-admin", "regional-admin"] }, companyId: { $ne: null } });

    // Companies added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const companiesAddedThisMonth = await Company.countDocuments({
        createdAt: { $gte: startOfMonth }
    });

    return {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        totalUsers,
        totalAdmins,
        companiesAddedThisMonth
    };
};

export const provisionCompanySuperAdmin = async (companyId, provisionData, performedBy, reason = "Provisioned by Platform Owner") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const { fullName, email, phone, temporaryPassword } = provisionData || {};
    if (!fullName || !email || !phone || !temporaryPassword) {
        throw new Error("fullName, email, phone, and temporaryPassword are required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        const existingCompany = existingUser.companyId ? existingUser.companyId.toString() : null;
        if (existingCompany && existingCompany !== companyId.toString()) {
            throw new Error("A user with this email already exists for another company");
        }
    }

    const boundaryCheck = validateGovernanceRoleBoundary("platform-owner", "company-super-admin");
    if (!boundaryCheck.valid) {
        throw new Error(boundaryCheck.reason);
    }

    const existingSuperAdmin = await User.findOne({
        companyId,
        role: { $in: ["company-super-admin", "super-admin"] },
        isActive: { $ne: false }
    });

    if (existingSuperAdmin && existingSuperAdmin.email !== normalizedEmail) {
        existingSuperAdmin.isActive = false;
        existingSuperAdmin.role = "user";
        await existingSuperAdmin.save({ validateBeforeSave: false });
    }

    const createdUser = await User.create({
        fullName,
        email: normalizedEmail,
        password: temporaryPassword,
        phone,
        role: "company-super-admin",
        companyId,
        isActive: true
    });

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                status: "active",
                lifecycleState: "active",
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason,
                "governance.ownerUserId": createdUser._id,
                "governance.ownerAssignedAt": new Date(),
                "governance.ownerAssignedBy": performedBy
            }
        },
        { new: true, runValidators: true }
    );

    try {
        await sendEmail({
            email: normalizedEmail,
            subject: "Welcome to your company portal",
            message: `Hello ${fullName},\n\nYou have been provisioned as the Company Super Admin for ${company.name}.\nYour temporary password is: ${temporaryPassword}\nPlease change it after your first sign-in.`,
            html: `<p>Hello ${fullName},</p><p>You have been provisioned as the Company Super Admin for ${company.name}.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>Please change it after your first sign-in.</p>`
        });
    } catch (emailError) {
        console.error("[Company Governance] Failed to send onboarding invitation:", emailError);
    }

    await Audit.createAudit({
        actionType: "company-super-admin-provisioned",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Super Admin Provisioned",
        description: `Platform Owner provisioned a Company Super Admin for ${updatedCompany.name}`,
        resourceType: "user",
        resourceId: createdUser._id,
        resourceName: createdUser.fullName,
        result: "success",
        reason,
        changes: { before: {}, after: { userId: createdUser._id, role: "company-super-admin", status: "active" } }
    });

    return { company: updatedCompany, user: createdUser };
};

export const assignCompanyOwner = async (companyId, userId, performedBy, reason = "Assigned by Platform Owner") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        throw new Error("Target user not found");
    }

    if (targetUser.companyId && targetUser.companyId.toString() !== companyId.toString()) {
        throw new Error("Target user is already assigned to a different company");
    }

    const currentOwner = company.governance?.ownerUserId;
    if (currentOwner && currentOwner.toString() === userId.toString()) {
        return company;
    }

    targetUser.companyId = companyId;
    targetUser.role = "company-super-admin";
    await targetUser.save();

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                "governance.ownerUserId": userId,
                "governance.ownerAssignedAt": new Date(),
                "governance.ownerAssignedBy": performedBy,
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason,
                "governance.lastOwnershipTransferAt": new Date(),
                "governance.lastOwnershipTransferBy": performedBy
            }
        },
        { new: true, runValidators: true }
    );

    if (updatedCompany) {
        await Audit.createAudit({
            actionType: "governance-owner-assigned",
            companyId: updatedCompany._id,
            performedBy,
            userRole: "platform-owner",
            action: "Company Owner Assigned",
            description: `Platform Owner assigned company owner for ${updatedCompany.name}`,
            resourceType: "company",
            resourceId: updatedCompany._id,
            resourceName: updatedCompany.name,
            result: "success",
            reason,
            changes: { before: { ownerUserId: currentOwner || null }, after: { ownerUserId: userId } }
        });
    }

    return updatedCompany;
};

export const transferCompanyOwnership = async (companyId, newOwnerUserId, performedBy, reason = "Ownership transferred") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const previousOwner = company.governance?.ownerUserId;
    const boundaryCheck = validateGovernanceRoleBoundary("platform-owner", "company-super-admin");
    if (!boundaryCheck.valid) {
        throw new Error(boundaryCheck.reason);
    }

    const newOwnerUser = await User.findById(newOwnerUserId);
    if (!newOwnerUser) {
        throw new Error("New owner user not found");
    }

    newOwnerUser.companyId = companyId;
    newOwnerUser.role = "company-super-admin";
    await newOwnerUser.save();

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                "governance.ownerUserId": newOwnerUserId,
                "governance.ownerAssignedAt": new Date(),
                "governance.ownerAssignedBy": performedBy,
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason,
                "governance.lastOwnershipTransferAt": new Date(),
                "governance.lastOwnershipTransferBy": performedBy
            }
        },
        { new: true, runValidators: true }
    );

    await Audit.createAudit({
        actionType: "governance-owner-transferred",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Ownership Transferred",
        description: `Platform Owner transferred company ownership for ${updatedCompany.name}`,
        resourceType: "company",
        resourceId: updatedCompany._id,
        resourceName: updatedCompany.name,
        result: "success",
        reason,
        changes: { before: { ownerUserId: previousOwner || null }, after: { ownerUserId: newOwnerUserId } }
    });

    return updatedCompany;
};

export const removeCompanyOwnership = async (companyId, performedBy, reason = "Ownership removed") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const previousOwner = company.governance?.ownerUserId;
    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                "governance.ownerUserId": null,
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason,
                "governance.lastOwnershipTransferAt": new Date(),
                "governance.lastOwnershipTransferBy": performedBy
            }
        },
        { new: true, runValidators: true }
    );

    await Audit.createAudit({
        actionType: "governance-owner-removed",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Owner Removed",
        description: `Platform Owner removed company ownership for ${updatedCompany.name}`,
        resourceType: "company",
        resourceId: updatedCompany._id,
        resourceName: updatedCompany.name,
        result: "success",
        reason,
        changes: { before: { ownerUserId: previousOwner || null }, after: { ownerUserId: null } }
    });

    return updatedCompany;
};

export const setCompanyLifecycleState = async (companyId, lifecycleState, performedBy, reason = "Lifecycle updated") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const normalizedState = normalizeLifecycleState(lifecycleState);
    const legacyStatus = buildLifecycleStatus(normalizedState);

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                lifecycleState: normalizedState,
                status: legacyStatus,
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason
            }
        },
        { new: true, runValidators: true }
    );

    await Audit.createAudit({
        actionType: "governance-lifecycle-changed",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Lifecycle Changed",
        description: `Platform Owner changed lifecycle for ${updatedCompany.name} to ${normalizedState}`,
        resourceType: "company",
        resourceId: updatedCompany._id,
        resourceName: updatedCompany.name,
        result: "success",
        reason,
        changes: { before: { lifecycleState: company.lifecycleState, status: company.status }, after: { lifecycleState: normalizedState, status: legacyStatus } }
    });

    return updatedCompany;
};

export const updateCompanyBranding = async (companyId, brandingData, performedBy, reason = "Brand updated") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                branding: {
                    ...company.branding?.toObject?.() || company.branding,
                    ...brandingData
                },
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason
            }
        },
        { new: true, runValidators: true }
    );

    await Audit.createAudit({
        actionType: "governance-brand-updated",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Branding Updated",
        description: `Platform Owner updated branding for ${updatedCompany.name}`,
        resourceType: "company",
        resourceId: updatedCompany._id,
        resourceName: updatedCompany.name,
        result: "success",
        reason,
        changes: { before: { branding: company.branding }, after: { branding: updatedCompany.branding } }
    });

    return updatedCompany;
};

export const updateCompanyConfiguration = async (companyId, configurationData, performedBy, reason = "Configuration updated") => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        {
            $set: {
                configuration: {
                    ...company.configuration?.toObject?.() || company.configuration,
                    ...configurationData
                },
                "governance.lastChangedAt": new Date(),
                "governance.lastChangedBy": performedBy,
                "governance.lastChangedReason": reason
            }
        },
        { new: true, runValidators: true }
    );

    await Audit.createAudit({
        actionType: "governance-settings-updated",
        companyId: updatedCompany._id,
        performedBy,
        userRole: "platform-owner",
        action: "Company Configuration Updated",
        description: `Platform Owner updated configuration for ${updatedCompany.name}`,
        resourceType: "company",
        resourceId: updatedCompany._id,
        resourceName: updatedCompany.name,
        result: "success",
        reason,
        changes: { before: { configuration: company.configuration }, after: { configuration: updatedCompany.configuration } }
    });

    return updatedCompany;
};

export const getCompanyOverview = async (companyId) => {
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Company not found");
    }

    const [activeUsers, activeAdmins, totalFeeders, totalOutages, aiHealthScore] = await Promise.all([
        User.countDocuments({ companyId, isActive: true, role: "user" }),
        User.countDocuments({ companyId, isActive: true, role: { $in: ["admin", "company-super-admin", "regional-admin"] } }),
        mongoose.model("Feeder").countDocuments({ companyId }),
        mongoose.model("Outage").countDocuments({ companyId }),
        100
    ]);

    return {
        companyHealth: company.status === "active" ? "healthy" : "attention",
        activeUsers,
        activeAdmins,
        totalFeeders,
        totalOutages,
        aiHealthScore,
        platformStatus: company.status,
        lifecycleState: company.lifecycleState,
        ownerUserId: company.governance?.ownerUserId || null
    };
};
