import Company from "../models/Company.js";
import Audit from "../models/Audit.js";
import {
    createCompany,
    getCompanyById,
    getCompanyByCode,
    getAllCompanies,
    updateCompany,
    updateCompanyStatus,
    deleteCompany,
    getActiveCompanies,
    getCompanyCountByStatus,
    searchCompanies,
    getCompanySettings,
    updateCompanySettings,
    getCompaniesRegistry,
    getCompanyDashboardStats,
    assignCompanyOwner,
    transferCompanyOwnership,
    removeCompanyOwnership,
    setCompanyLifecycleState,
    updateCompanyBranding,
    updateCompanyConfiguration,
    getCompanyOverview,
    provisionCompanySuperAdmin
} from "../services/companyService.js";
import { publishPlatformEvent } from "../services/platformEventDispatcher.js";

const isPlatformOwner = (req) => req.user?.role === "platform-owner";
const canAccessCompany = (req, companyId) => (
    isPlatformOwner(req) || req.user?.companyId?.toString() === companyId?.toString()
);

const denyForeignCompany = (req, res, companyId) => {
    if (!canAccessCompany(req, companyId)) {
        res.status(403).json({ success: false, message: "Access denied to this company" });
        return true;
    }
    return false;
};

/**
 * @desc    Create a new company
 * @route   POST /api/companies
 * @access  Private (Platform Owner only in future)
 */
export const createCompanyController = async (req, res) => {
    try {
        const companyData = req.body;
        
        const company = await createCompany(companyData);
        
        // Log Audit Event (Task 10)
        try {
            await Audit.createAudit({
                actionType: "company-create",
                companyId: company._id,
                performedBy: req.user._id,
                userRole: req.user.role,
                action: "Company Created",
                description: `Company ${company.name} (${company.code}) created successfully by Platform Owner.`,
                resourceType: "company",
                resourceId: company._id,
                resourceName: company.name,
                result: "success",
                changes: { before: {}, after: company.toObject() }
            });
        } catch (auditErr) {
            console.error("[Audit Logging Error] Failed to log company creation:", auditErr);
        }

        publishPlatformEvent({
            type: "company.created",
            companyId: company._id,
            data: { company: { _id: company._id, name: company.name, code: company.code, status: company.status } }
        });

        res.status(201).json({
            success: true,
            message: "Company created successfully",
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error creating company:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create company"
        });
    }
};

/**
 * @desc    Get company by ID
 * @route   GET /api/companies/:id
 * @access  Private
 */
export const getCompanyByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (denyForeignCompany(req, res, id)) return;
        
        const company = await getCompanyById(id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        publishPlatformEvent({
            type: "company.deleted",
            companyId: company._id,
            data: { company: { _id: company._id, name: company.name, code: company.code } }
        });
        
        res.status(200).json({
            success: true,
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error getting company:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get company"
        });
    }
};

/**
 * @desc    Get company by code
 * @route   GET /api/companies/code/:code
 * @access  Private
 */
export const getCompanyByCodeController = async (req, res) => {
    try {
        const { code } = req.params;
        
        const company = await getCompanyByCode(code);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        if (denyForeignCompany(req, res, company._id)) return;
        
        res.status(200).json({
            success: true,
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error getting company by code:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get company"
        });
    }
};

/**
 * @desc    Get all companies with optional filters
 * @route   GET /api/companies
 * @access  Private
 */
export const getAllCompaniesController = async (req, res) => {
    try {
        if (!isPlatformOwner(req)) {
            const company = await getCompanyById(req.user.companyId);
            return res.status(200).json({ success: true, count: company ? 1 : 0, data: company ? [company] : [] });
        }
        // If pagination, search, or sorting query params are present, use the registry service (Task 2)
        if (req.query.page || req.query.limit || req.query.search || req.query.sortBy || req.query.state || req.query.country) {
            const options = {
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                status: req.query.status,
                state: req.query.state,
                country: req.query.country,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await getCompaniesRegistry(options);
            return res.status(200).json({
                success: true,
                ...result
            });
        }

        // Backward compatibility fallback
        const filters = {
            status: req.query.status,
            subscriptionTier: req.query.subscriptionTier
        };
        
        // Remove undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });
        
        const companies = await getAllCompanies(filters);
        
        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });
    } catch (error) {
        console.error("[Company Controller] Error getting companies:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get companies"
        });
    }
};

/**
 * @desc    Update company by ID
 * @route   PUT /api/companies/:id
 * @access  Private
 */
export const updateCompanyController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const beforeCompany = await Company.findById(id);
        if (!beforeCompany) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        const company = await updateCompany(id, updateData);
        
        // Log Audit Event (Task 10)
        try {
            await Audit.createAudit({
                actionType: "company-update",
                companyId: company._id,
                performedBy: req.user._id,
                userRole: req.user.role,
                action: "Company Updated",
                description: `Company ${company.name} profile settings updated by Platform Owner.`,
                resourceType: "company",
                resourceId: company._id,
                resourceName: company.name,
                result: "success",
                changes: { 
                    before: beforeCompany.toObject(), 
                    after: company.toObject() 
                }
            });
        } catch (auditErr) {
            console.error("[Audit Logging Error] Failed to log company update:", auditErr);
        }

        publishPlatformEvent({
            type: "company.updated",
            companyId: company._id,
            data: { company: { _id: company._id, name: company.name, code: company.code, status: company.status } }
        });

        res.status(200).json({
            success: true,
            message: "Company updated successfully",
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error updating company:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update company"
        });
    }
};

/**
 * @desc    Update company status
 * @route   PATCH /api/companies/:id/status
 * @access  Private
 */
export const updateCompanyStatusController = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }
        if (status === "suspended" && !reason) {
            return res.status(400).json({
                success: false,
                message: "Suspension reason is required when suspending a company"
            });
        }

        const beforeCompany = await Company.findById(id);
        if (!beforeCompany) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        
        const suspensionData = status === "suspended" ? { reason, suspendedBy: req.user._id } : {};
        const company = await updateCompanyStatus(id, status, suspensionData);

        // Audit Logging (Task 10)
        const actionType = status === "suspended" ? "company-update" : "company-update";
        const actionLabel = status === "suspended" ? "Company Suspended" : status === "active" ? "Company Reactivated" : "Company Status Updated";
        try {
            await Audit.createAudit({
                actionType,
                companyId: company._id,
                performedBy: req.user._id,
                userRole: req.user.role,
                action: actionLabel,
                description: status === "suspended"
                    ? `Company ${company.name} suspended. Reason: ${reason}`
                    : `Company ${company.name} reactivated by Platform Owner.`,
                resourceType: "company",
                resourceId: company._id,
                resourceName: company.name,
                result: "success",
                reason: reason || undefined,
                changes: {
                    before: { status: beforeCompany.status },
                    after: { status: company.status }
                }
            });
        } catch (auditErr) {
            console.error("[Audit Logging Error] Failed to log status change:", auditErr);
        }

        publishPlatformEvent({
            type: status === "suspended" ? "company.suspended" : status === "active" ? "company.activated" : "company.updated",
            companyId: company._id,
            data: { company: { _id: company._id, name: company.name, code: company.code, status: company.status } }
        });
        
        res.status(200).json({
            success: true,
            message: `Company ${actionLabel.toLowerCase()} successfully`,
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error updating company status:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update company status"
        });
    }
};

/**
 * @desc    Delete company by ID
 * @route   DELETE /api/companies/:id
 * @access  Private (Platform Owner only in future)
 */
export const deleteCompanyController = async (req, res) => {
    try {
        const { id } = req.params;
        
        const company = await deleteCompany(id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Company deleted successfully",
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error deleting company:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete company"
        });
    }
};

/**
 * @desc    Get active companies only
 * @route   GET /api/companies/active
 * @access  Private
 */
export const getActiveCompaniesController = async (req, res) => {
    try {
        if (!isPlatformOwner(req)) {
            const company = await getCompanyById(req.user.companyId);
            return res.status(200).json({ success: true, count: company?.status === "active" ? 1 : 0, data: company?.status === "active" ? [company] : [] });
        }
        const companies = await getActiveCompanies();
        
        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });
    } catch (error) {
        console.error("[Company Controller] Error getting active companies:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get active companies"
        });
    }
};

/**
 * @desc    Get company count by status
 * @route   GET /api/companies/count/:status
 * @access  Private
 */
export const getCompanyCountByStatusController = async (req, res) => {
    try {
        const { status } = req.params;
        if (!isPlatformOwner(req)) {
            const company = await getCompanyById(req.user.companyId);
            return res.status(200).json({ success: true, status, count: company?.status === status ? 1 : 0 });
        }
        
        const count = await getCompanyCountByStatus(status);
        
        res.status(200).json({
            success: true,
            status,
            count
        });
    } catch (error) {
        console.error("[Company Controller] Error getting company count:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get company count"
        });
    }
};

/**
 * @desc    Search companies by name, short name, or code
 * @route   GET /api/companies/search/:term
 * @access  Private
 */
export const searchCompaniesController = async (req, res) => {
    try {
        const { term } = req.params;

        if (!isPlatformOwner(req)) {
            const company = await getCompanyById(req.user.companyId);
            const normalizedTerm = term.toLowerCase();
            const matches = company && [company.name, company.shortName, company.code]
                .some(value => String(value || "").toLowerCase().includes(normalizedTerm))
                ? [company] : [];
            return res.status(200).json({ success: true, count: matches.length, data: matches });
        }
        
        if (!term || term.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search term must be at least 2 characters"
            });
        }
        
        const companies = await searchCompanies(term);
        
        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });
    } catch (error) {
        console.error("[Company Controller] Error searching companies:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to search companies"
        });
    }
};

/**
 * @desc    Get company settings
 * @route   GET /api/companies/:id/settings
 * @access  Private
 */
export const getCompanySettingsController = async (req, res) => {
    try {
        const { id } = req.params;
        if (denyForeignCompany(req, res, id)) return;
        
        const settings = await getCompanySettings(id);
        
        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error("[Company Controller] Error getting company settings:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get company settings"
        });
    }
};

/**
 * @desc    Update company settings
 * @route   PUT /api/companies/:id/settings
 * @access  Private
 */
export const updateCompanySettingsController = async (req, res) => {
    try {
        const { id } = req.params;
        const settingsData = req.body;
        
        const company = await updateCompanySettings(id, settingsData);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Company settings updated successfully",
            data: company
        });
    } catch (error) {
        console.error("[Company Controller] Error updating company settings:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update company settings"
        });
    }
};

/**
 * @desc    Get Platform Owner dashboard stats
 * @route   GET /api/companies/platform/stats
 * @access  Private (Platform Owner only)
 */
export const provisionCompanySuperAdminController = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, temporaryPassword, reason } = req.body;

        const result = await provisionCompanySuperAdmin(id, { fullName, email, phone, temporaryPassword }, req.user._id, reason);
        publishPlatformEvent({
            type: "superadmin.created",
            companyId: id,
            data: { user: { _id: result.user._id, fullName: result.user.fullName, role: result.user.role } }
        });
        res.status(201).json({ success: true, message: "Company Super Admin provisioned successfully", data: result });
    } catch (error) {
        console.error("[Company Controller] Error provisioning company super admin:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to provision company super admin" });
    }
};

export const getCompanyDashboardStatsController = async (req, res) => {
    try {
        const stats = await getCompanyDashboardStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error("[Company Controller] Error getting dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get dashboard stats"
        });
    }
};

export const assignCompanyOwnerController = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, reason } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }

        const company = await assignCompanyOwner(id, userId, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company owner assigned successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error assigning company owner:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to assign company owner" });
    }
};

export const transferCompanyOwnershipController = async (req, res) => {
    try {
        const { id } = req.params;
        const { newOwnerUserId, reason } = req.body;

        if (!newOwnerUserId) {
            return res.status(400).json({ success: false, message: "newOwnerUserId is required" });
        }

        const company = await transferCompanyOwnership(id, newOwnerUserId, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company ownership transferred successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error transferring company ownership:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to transfer company ownership" });
    }
};

export const removeCompanyOwnershipController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const company = await removeCompanyOwnership(id, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company ownership removed successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error removing company ownership:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to remove company ownership" });
    }
};

export const setCompanyLifecycleStateController = async (req, res) => {
    try {
        const { id } = req.params;
        const { lifecycleState, reason } = req.body;

        if (!lifecycleState) {
            return res.status(400).json({ success: false, message: "lifecycleState is required" });
        }

        const company = await setCompanyLifecycleState(id, lifecycleState, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company lifecycle updated successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error updating company lifecycle:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to update company lifecycle" });
    }
};

export const updateCompanyBrandingController = async (req, res) => {
    try {
        const { id } = req.params;
        const { branding, reason } = req.body;

        const company = await updateCompanyBranding(id, branding, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company branding updated successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error updating company branding:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to update company branding" });
    }
};

export const updateCompanyLogoController = async (req, res) => {
    try {
        const { id } = req.params;
        const { logoUrl, reason } = req.body;

        if (!logoUrl) {
            return res.status(400).json({ success: false, message: "logoUrl is required" });
        }

        const company = await updateCompanyBranding(id, { logoUrl }, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company logo updated successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error updating company logo:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to update company logo" });
    }
};

export const updateCompanyConfigurationController = async (req, res) => {
    try {
        const { id } = req.params;
        const { configuration, reason } = req.body;

        const company = await updateCompanyConfiguration(id, configuration, req.user._id, reason);
        res.status(200).json({ success: true, message: "Company configuration updated successfully", data: company });
    } catch (error) {
        console.error("[Company Controller] Error updating company configuration:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to update company configuration" });
    }
};

export const getCompanyOverviewController = async (req, res) => {
    try {
        const { id } = req.params;
        if (denyForeignCompany(req, res, id)) return;
        const overview = await getCompanyOverview(id);
        res.status(200).json({ success: true, data: overview });
    } catch (error) {
        console.error("[Company Controller] Error getting company overview:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to get company overview" });
    }
};
