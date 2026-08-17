import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 255
        },

        shortName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 3,
            maxlength: 10,
            match: /^[A-Z0-9]+$/
        },

        logo: {
            type: String,
            trim: true
        },

        officialEmail: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },

        officialPhone: {
            type: String,
            required: true,
            trim: true
        },

        headquarters: {
            address: {
                type: String,
                required: true,
                trim: true
            },
            city: {
                type: String,
                required: true,
                trim: true
            },
            state: {
                type: String,
                required: true,
                trim: true
            },
            postalCode: {
                type: String,
                trim: true
            },
            country: {
                type: String,
                default: "Nigeria",
                trim: true
            }
        },

        coverageStates: {
            type: [mongoose.Schema.Types.Mixed],
            default: function() {
                return this.headquarters?.state ? [this.headquarters.state] : [];
            },
            validate: {
                validator: function(val) {
                    if (!Array.isArray(val) || val.length < 1 || val.length > 10) return false;
                    const stringVals = val.map(v => v ? String(v).trim() : "");
                    const unique = new Set(stringVals);
                    if (unique.size !== stringVals.length) return false;
                    return stringVals.every(state => state && state.length > 0);
                },
                message: "coverageStates must contain between 1 and 10 unique valid states."
            }
        },

        timeZone: {
            type: String,
            default: "Africa/Lagos",
            trim: true
        },

        status: {
            type: String,
            enum: ["pending-setup", "active", "suspended", "inactive", "archived"],
            default: "pending-setup"
        },

        lifecycleState: {
            type: String,
            enum: ["draft", "active", "suspended", "archived"],
            default: "draft"
        },

        governance: {
            ownerUserId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            ownerAssignedAt: {
                type: Date
            },
            ownerAssignedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            lastChangedAt: {
                type: Date
            },
            lastChangedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            lastChangedReason: {
                type: String,
                trim: true
            },
            lastOwnershipTransferAt: {
                type: Date
            },
            lastOwnershipTransferBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        },

        branding: {
            companyName: {
                type: String,
                trim: true
            },
            logo: {
                type: String,
                trim: true
            },
            primaryColor: {
                type: String,
                trim: true,
                match: /^#[0-9A-Fa-f]{6}$/
            },
            secondaryColor: {
                type: String,
                trim: true,
                match: /^#[0-9A-Fa-f]{6}$/
            }
        },

        limits: {
            maxUsers: {
                type: Number,
                default: 1000
            },
            maxAdmins: {
                type: Number,
                default: 100
            },
            maxFeeders: {
                type: Number,
                default: 500
            },
            maxAiRequests: {
                type: Number,
                default: 5000
            },
            maxNotifications: {
                type: Number,
                default: 10000
            },
            maxStorage: {
                type: Number,
                default: 5000
            }
        },

        configuration: {
            timezone: {
                type: String,
                default: "Africa/Lagos",
                trim: true
            },
            country: {
                type: String,
                default: "Nigeria",
                trim: true
            },
            language: {
                type: String,
                default: "en",
                trim: true
            },
            notificationPreferences: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },
            operationalPolicies: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },
            aiConfiguration: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },
            featureToggles: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            }
        },

        settings: {
            theme: {
                primaryColor: {
                    type: String,
                    default: "#3B82F6",
                    match: /^#[0-9A-Fa-f]{6}$/
                },
                secondaryColor: {
                    type: String,
                    default: "#10B981",
                    match: /^#[0-9A-Fa-f]{6}$/
                },
                accentColor: {
                    type: String,
                    default: "#F59E0B",
                    match: /^#[0-9A-Fa-f]{6}$/
                },
                logo: {
                    type: String,
                    trim: true
                },
                favicon: {
                    type: String,
                    trim: true
                }
            },
            language: {
                type: String,
                default: "en",
                trim: true,
                minlength: 2,
                maxlength: 5
            },
            notificationDefaults: {
                channels: {
                    type: [String],
                    default: ["in-app", "push"],
                    enum: ["in-app", "push", "sms", "email"]
                },
                emergencyChannels: {
                    type: [String],
                    default: ["in-app", "push", "sms", "email"],
                    enum: ["in-app", "push", "sms", "email"]
                },
                defaultPriority: {
                    type: String,
                    default: "normal",
                    enum: ["normal", "high"]
                }
            },
            features: {
                aiAnalytics: {
                    type: Boolean,
                    default: true
                },
                predictiveMaintenance: {
                    type: Boolean,
                    default: true
                },
                advancedReporting: {
                    type: Boolean,
                    default: true
                },
                customIntegrations: {
                    type: Boolean,
                    default: false
                }
            }
        },

        subscription: {
            tier: {
                type: String,
                enum: ["basic", "standard", "premium"],
                default: "standard"
            },
            startDate: {
                type: Date
            },
            endDate: {
                type: Date
            },
            maxUsers: {
                type: Number,
                default: 1000
            },
            maxStates: {
                type: Number,
                default: 10
            },
            maxFeeders: {
                type: Number,
                default: 1000
            }
        },

        metadata: {
            licenseNumber: {
                type: String,
                trim: true
            },
            regulatoryBody: {
                type: String,
                trim: true
            },
            establishedDate: {
                type: Date
            },
            website: {
                type: String,
                trim: true
            },
            description: {
                type: String,
                trim: true,
                maxlength: 1000
            }
        },

        suspension: {
            reason: {
                type: String,
                trim: true
            },
            suspendedAt: {
                type: Date
            },
            suspendedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        }
    },
    {
        timestamps: true
    }
);

// Indexes for performance (unique indexes are already defined in schema)
companySchema.index({ status: 1 });
companySchema.index({ "subscription.tier": 1 });

export default mongoose.model("Company", companySchema, "companies");
