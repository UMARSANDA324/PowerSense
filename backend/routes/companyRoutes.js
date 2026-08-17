import express from "express";
import {
    createCompanyController,
    getCompanyByIdController,
    getCompanyByCodeController,
    getAllCompaniesController,
    updateCompanyController,
    updateCompanyStatusController,
    deleteCompanyController,
    getActiveCompaniesController,
    getCompanyCountByStatusController,
    searchCompaniesController,
    getCompanySettingsController,
    updateCompanySettingsController,
    getCompanyDashboardStatsController,
    assignCompanyOwnerController,
    transferCompanyOwnershipController,
    removeCompanyOwnershipController,
    setCompanyLifecycleStateController,
    updateCompanyBrandingController,
    updateCompanyConfigurationController,
    getCompanyOverviewController,
    provisionCompanySuperAdminController,
    updateCompanyLogoController
} from "../controllers/companyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

// Platform Owner-only middleware (Task 11 — only platform-owner may manage companies)
const platformOwnerOnly = authorize("platform-owner");

// Platform Owner reads — any authenticated user can read their own company info
// Platform Owner writes — only platform-owner role
// Backward compatibility: existing routes still work for authenticated users

// --- Stats (Task 9) ---
router.get("/platform/stats", protect, platformOwnerOnly, getCompanyDashboardStatsController);

// --- Read routes (accessible to any authenticated user for backward compat) ---
router.get("/", protect, getAllCompaniesController);
router.get("/active", protect, getActiveCompaniesController);
router.get("/search/:term", protect, searchCompaniesController);
router.get("/code/:code", protect, getCompanyByCodeController);
router.get("/count/:status", protect, getCompanyCountByStatusController);
router.get("/:id", protect, getCompanyByIdController);
router.get("/:id/settings", protect, getCompanySettingsController);
router.get("/:id/overview", protect, getCompanyOverviewController);

// --- Write routes (Platform Owner only — Tasks 3, 5, 6, 7, 11) ---
router.post("/", protect, platformOwnerOnly, createCompanyController);
router.put("/:id", protect, platformOwnerOnly, updateCompanyController);
router.put("/:id/logo", protect, updateCompanyLogoController);
router.put("/:id/settings", protect, platformOwnerOnly, updateCompanySettingsController);
router.patch("/:id/status", protect, platformOwnerOnly, updateCompanyStatusController);
router.post("/:id/owner", protect, platformOwnerOnly, assignCompanyOwnerController);
router.post("/:id/transfer-ownership", protect, platformOwnerOnly, transferCompanyOwnershipController);
router.post("/:id/remove-ownership", protect, platformOwnerOnly, removeCompanyOwnershipController);
router.post("/:id/lifecycle", protect, platformOwnerOnly, setCompanyLifecycleStateController);
router.post("/:id/branding", protect, platformOwnerOnly, updateCompanyBrandingController);
router.post("/:id/configuration", protect, platformOwnerOnly, updateCompanyConfigurationController);
router.post("/:id/provision-super-admin", protect, platformOwnerOnly, provisionCompanySuperAdminController);

// Delete is kept for Platform Owner only — soft delete only, no cascade
router.delete("/:id", protect, platformOwnerOnly, deleteCompanyController);

export default router;
