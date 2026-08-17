/**
 * Company Configuration
 * Centralized configuration for Company entity
 */

/**
 * Company Status Constants
 */
export const COMPANY_STATUS = {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    INACTIVE: "inactive"
};

/**
 * Company Subscription Tiers
 */
export const SUBSCRIPTION_TIER = {
    BASIC: "basic",
    STANDARD: "standard",
    PREMIUM: "premium"
};

/**
 * Default Company Settings
 */
export const DEFAULT_COMPANY_SETTINGS = {
    theme: {
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
        accentColor: "#F59E0B",
        logo: null,
        favicon: null
    },
    language: "en",
    notificationDefaults: {
        channels: ["in-app", "push"],
        emergencyChannels: ["in-app", "push", "sms", "email"],
        defaultPriority: "normal"
    },
    features: {
        aiAnalytics: true,
        predictiveMaintenance: true,
        advancedReporting: true,
        customIntegrations: false
    }
};

/**
 * Default Subscription Limits by Tier
 */
export const SUBSCRIPTION_LIMITS = {
    [SUBSCRIPTION_TIER.BASIC]: {
        maxUsers: 100,
        maxStates: 3,
        maxFeeders: 100
    },
    [SUBSCRIPTION_TIER.STANDARD]: {
        maxUsers: 1000,
        maxStates: 10,
        maxFeeders: 1000
    },
    [SUBSCRIPTION_TIER.PREMIUM]: {
        maxUsers: 10000,
        maxStates: 50,
        maxFeeders: 10000
    }
};

/**
 * Default Time Zone
 */
export const DEFAULT_TIME_ZONE = "Africa/Lagos";

/**
 * Supported Time Zones for Nigerian DISCOs
 */
export const SUPPORTED_TIME_ZONES = [
    "Africa/Lagos",
    "Africa/Abuja",
    "Africa/Niamey",
    "Africa/Porto-Novo",
    "Africa/Accra"
];

/**
 * Supported Languages
 */
export const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "ha", name: "Hausa" },
    { code: "yo", name: "Yoruba" },
    { code: "ig", name: "Igbo" },
    { code: "ff", name: "Fulfulde" }
];

/**
 * Notification Channels
 */
export const NOTIFICATION_CHANNELS = {
    IN_APP: "in-app",
    PUSH: "push",
    SMS: "sms",
    EMAIL: "email"
};

/**
 * Message Priority Levels
 */
export const MESSAGE_PRIORITY = {
    NORMAL: "normal",
    HIGH: "high"
};

/**
 * Company Validation Rules
 */
export const COMPANY_VALIDATION_RULES = {
    name: {
        minLength: 3,
        maxLength: 255
    },
    shortName: {
        minLength: 2,
        maxLength: 50
    },
    code: {
        minLength: 3,
        maxLength: 10,
        pattern: /^[A-Z0-9]+$/
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
        pattern: /^\+?[0-9]{10,15}$/
    },
    hexColor: {
        pattern: /^#[0-9A-Fa-f]{6}$/
    },
    timeZone: {
        pattern: /^[A-Za-z]+\/[A-Za-z_]+$/
    }
};

/**
 * Company Status Behaviors
 */
export const COMPANY_STATUS_BEHAVIORS = {
    [COMPANY_STATUS.ACTIVE]: {
        canAccessPlatform: true,
        canManageUsers: true,
        canManageInfrastructure: true,
        billingActive: true
    },
    [COMPANY_STATUS.SUSPENDED]: {
        canAccessPlatform: true,
        canManageUsers: false,
        canManageInfrastructure: false,
        billingActive: false
    },
    [COMPANY_STATUS.INACTIVE]: {
        canAccessPlatform: false,
        canManageUsers: false,
        canManageInfrastructure: false,
        billingActive: false
    }
};

/**
 * Default KEDCO Company Configuration
 */
export const DEFAULT_KEDCO_COMPANY = {
    name: "Kano Electricity Distribution Company",
    shortName: "KEDCO",
    code: "KEDCO",
    officialEmail: "contact@kedco.com.ng",
    officialPhone: "+234 812 345 6789",
    headquarters: {
        address: "No. 1, Kano Industrial Estate",
        city: "Kano",
        state: "Kano",
        postalCode: "700211",
        country: "Nigeria"
    },
    timeZone: DEFAULT_TIME_ZONE,
    status: COMPANY_STATUS.ACTIVE,
    settings: DEFAULT_COMPANY_SETTINGS,
    subscription: {
        tier: SUBSCRIPTION_TIER.STANDARD,
        maxUsers: SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIER.STANDARD].maxUsers,
        maxStates: SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIER.STANDARD].maxStates,
        maxFeeders: SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIER.STANDARD].maxFeeders
    },
    metadata: {
        licenseNumber: "NERC/KEDCO/001",
        regulatoryBody: "Nigerian Electricity Regulatory Commission (NERC)",
        establishedDate: new Date("2013-11-01"),
        website: "https://www.kedco.com.ng",
        description: "Kano Electricity Distribution Company is responsible for electricity distribution in Kano, Katsina, and Jigawa states."
    }
};
