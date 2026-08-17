/**
 * Company Validation Utilities
 * Provides validation functions for Company entity business logic
 */

/**
 * Validates company code format
 * @param {string} code - Company code to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateCompanyCode = (code) => {
    if (!code) {
        return { valid: false, error: "Company code is required" };
    }

    if (typeof code !== "string") {
        return { valid: false, error: "Company code must be a string" };
    }

    const upperCode = code.toUpperCase();
    if (!/^[A-Z0-9]+$/.test(upperCode)) {
        return { valid: false, error: "Company code must contain only uppercase letters and numbers" };
    }

    if (upperCode.length < 3 || upperCode.length > 10) {
        return { valid: false, error: "Company code must be between 3 and 10 characters" };
    }

    return { valid: true };
};

/**
 * Validates company email format
 * @param {string} email - Company email to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateCompanyEmail = (email) => {
    if (!email) {
        return { valid: false, error: "Company email is required" };
    }

    if (typeof email !== "string") {
        return { valid: false, error: "Company email must be a string" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: "Invalid email format" };
    }

    return { valid: true };
};

/**
 * Validates company phone number format
 * @param {string} phone - Company phone to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateCompanyPhone = (phone) => {
    if (!phone) {
        return { valid: false, error: "Company phone is required" };
    }

    if (typeof phone !== "string") {
        return { valid: false, error: "Company phone must be a string" };
    }

    // Remove spaces and special characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    
    // Check if it's a valid phone number (basic validation)
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return { valid: false, error: "Invalid phone number format" };
    }

    return { valid: true };
};

/**
 * Validates company status
 * @param {string} status - Company status to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateCompanyStatus = (status) => {
    const validStatuses = ["pending-setup", "active", "suspended", "inactive", "archived"];
    
    if (!status) {
        return { valid: false, error: "Company status is required" };
    }

    if (!validStatuses.includes(status)) {
        return { valid: false, error: `Company status must be one of: ${validStatuses.join(", ")}` };
    }

    return { valid: true };
};

/**
 * Validates company subscription tier
 * @param {string} tier - Subscription tier to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateSubscriptionTier = (tier) => {
    const validTiers = ["basic", "standard", "premium"];
    
    if (!tier) {
        return { valid: false, error: "Subscription tier is required" };
    }

    if (!validTiers.includes(tier)) {
        return { valid: false, error: `Subscription tier must be one of: ${validTiers.join(", ")}` };
    }

    return { valid: true };
};

/**
 * Validates company time zone
 * @param {string} timeZone - Time zone to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateTimeZone = (timeZone) => {
    if (!timeZone) {
        return { valid: false, error: "Time zone is required" };
    }

    if (typeof timeZone !== "string") {
        return { valid: false, error: "Time zone must be a string" };
    }

    // Basic validation for IANA time zone format
    const timeZoneRegex = /^[A-Za-z]+\/[A-Za-z_]+$/;
    if (!timeZoneRegex.test(timeZone)) {
        return { valid: false, error: "Invalid time zone format. Expected IANA format (e.g., Africa/Lagos)" };
    }

    return { valid: true };
};

/**
 * Validates hex color format
 * @param {string} color - Hex color to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateHexColor = (color) => {
    if (!color) {
        return { valid: false, error: "Color is required" };
    }

    if (typeof color !== "string") {
        return { valid: false, error: "Color must be a string" };
    }

    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(color)) {
        return { valid: false, error: "Invalid hex color format. Expected format: #RRGGBB" };
    }

    return { valid: true };
};

/**
 * Validates company headquarters address
 * @param {Object} headquarters - Headquarters object to validate
 * @returns {Object} - { valid: boolean, errors: array }
 */
export const validateHeadquarters = (headquarters) => {
    const errors = [];

    if (!headquarters) {
        return { valid: false, errors: ["Headquarters is required"] };
    }

    if (!headquarters.address || typeof headquarters.address !== "string" || headquarters.address.trim() === "") {
        errors.push("Headquarters address is required");
    }

    if (!headquarters.city || typeof headquarters.city !== "string" || headquarters.city.trim() === "") {
        errors.push("Headquarters city is required");
    }

    if (!headquarters.state || typeof headquarters.state !== "string" || headquarters.state.trim() === "") {
        errors.push("Headquarters state is required");
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validates company data before creation/update
 * @param {Object} companyData - Company data to validate
 * @returns {Object} - { valid: boolean, errors: array }
 */
export const validateCompanyData = (companyData, isUpdate = false) => {
    const errors = [];

    // Validate name
    if (!isUpdate || companyData.name !== undefined) {
        if (!companyData.name || typeof companyData.name !== "string" || companyData.name.trim().length < 3) {
            errors.push("Company name must be at least 3 characters");
        }
    }

    // Validate short name
    if (!isUpdate || companyData.shortName !== undefined) {
        if (!companyData.shortName || typeof companyData.shortName !== "string" || companyData.shortName.trim().length < 2) {
            errors.push("Company short name must be at least 2 characters");
        }
    }

    // Validate code
    if (!isUpdate || companyData.code !== undefined) {
        const codeValidation = validateCompanyCode(companyData.code);
        if (!codeValidation.valid) {
            errors.push(codeValidation.error);
        }
    }

    // Validate email
    if (!isUpdate || companyData.officialEmail !== undefined) {
        const emailValidation = validateCompanyEmail(companyData.officialEmail);
        if (!emailValidation.valid) {
            errors.push(emailValidation.error);
        }
    }

    // Validate phone
    if (!isUpdate || companyData.officialPhone !== undefined) {
        const phoneValidation = validateCompanyPhone(companyData.officialPhone);
        if (!phoneValidation.valid) {
            errors.push(phoneValidation.error);
        }
    }

    // Validate headquarters
    if (!isUpdate || companyData.headquarters !== undefined) {
        const headquartersValidation = validateHeadquarters(companyData.headquarters);
        if (!headquartersValidation.valid) {
            errors.push(...headquartersValidation.errors);
        }
    }

    // Validate status if provided
    if (companyData.status) {
        const statusValidation = validateCompanyStatus(companyData.status);
        if (!statusValidation.valid) {
            errors.push(statusValidation.error);
        }
    }

    // Validate time zone if provided
    if (companyData.timeZone) {
        const timeZoneValidation = validateTimeZone(companyData.timeZone);
        if (!timeZoneValidation.valid) {
            errors.push(timeZoneValidation.error);
        }
    }

    // Validate subscription tier if provided
    if (companyData.subscription && companyData.subscription.tier) {
        const tierValidation = validateSubscriptionTier(companyData.subscription.tier);
        if (!tierValidation.valid) {
            errors.push(tierValidation.error);
        }
    }

    // Validate theme colors if provided
    if (companyData.settings && companyData.settings.theme) {
        const theme = companyData.settings.theme;
        
        if (theme.primaryColor) {
            const colorValidation = validateHexColor(theme.primaryColor);
            if (!colorValidation.valid) {
                errors.push(`Invalid primary color: ${colorValidation.error}`);
            }
        }
        
        if (theme.secondaryColor) {
            const colorValidation = validateHexColor(theme.secondaryColor);
            if (!colorValidation.valid) {
                errors.push(`Invalid secondary color: ${colorValidation.error}`);
            }
        }
        
        if (theme.accentColor) {
            const colorValidation = validateHexColor(theme.accentColor);
            if (!colorValidation.valid) {
                errors.push(`Invalid accent color: ${colorValidation.error}`);
            }
        }
    }

    // Validate coverage states if provided
    if (companyData.coverageStates !== undefined) {
        const coverageValidation = validateCoverageStates(companyData.coverageStates);
        if (!coverageValidation.valid) {
            errors.push(coverageValidation.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validates company coverage states
 * @param {Array<string>} states - Array of coverage state names
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateCoverageStates = (states) => {
    if (!states || !Array.isArray(states)) {
        return { valid: false, error: "Coverage states must be an array" };
    }

    if (states.length < 1) {
        return { valid: false, error: "At least one coverage state must be selected" };
    }

    if (states.length > 10) {
        return { valid: false, error: "A company cannot have more than 10 coverage states" };
    }

    const stringStates = states.map(s => s ? String(s).trim() : "").filter(Boolean);
    const uniqueStates = new Set(stringStates);
    if (uniqueStates.size !== states.length) {
        return { valid: false, error: "Duplicate coverage states are not allowed" };
    }

    for (const state of stringStates) {
        if (!state || state.length < 2) {
            return { valid: false, error: `Invalid state: '${state}'` };
        }
    }

    return { valid: true };
};

