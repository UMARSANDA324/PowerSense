import Company from "../models/Company.js";
import { DEFAULT_KEDCO_COMPANY } from "../config/companyConfig.js";

/**
 * Seeds the default KEDCO company if no companies exist
 * This maintains compatibility while the platform is still single-company
 */
export const seedDefaultCompany = async () => {
    try {
        const companyCount = await Company.countDocuments();
        
        if (companyCount === 0) {
            console.log("[Seed Company] No companies found. Skipping company seeding.");
            return false;
        } else {
            console.log(`[Seed Company] Database already has ${companyCount} company/companies. Skipping default company seeding.`);
            return false;
        }
    } catch (error) {
        console.error("[Seed Company] Error checking companies:", error);
        return false;
    }
};

/**
 * Verifies company count in database
 */
export const verifyCompanyCount = async () => {
    try {
        const companyCount = await Company.countDocuments();
        console.log(`[Company] Current company count: ${companyCount}`);
        
        if (companyCount === 0) {
            console.log("[Company] ⚠️  No companies found. Default company seeding may be needed.");
        } else {
            console.log("[Company] ✅ Companies exist in database.");
        }
        
        return companyCount;
    } catch (error) {
        console.error("[Company] Error verifying company count:", error);
        return 0;
    }
};
