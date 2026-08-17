# Data Models

This document describes all data models in LITHA.

## Location Hierarchy

LITHA uses a strict geographic hierarchy:

```
Country (Nigeria)
  └── State
       └── LGA (Local Government Area)
            └── Ward
                 └── Feeder
```

### State Model
**File**: `backend/models/Location/State.js`

```javascript
{
  _id: ObjectId,
  name: String (required, unique),        // e.g., "Kano"
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### LGA Model
**File**: `backend/models/Location/LGA.js`

```javascript
{
  _id: ObjectId,
  name: String (required),                // e.g., "Dala"
  id: String (unique, sparse),
  lgaId: String (required),
  slug: String (required, unique, lowercase),
  state: ObjectId (ref: State, required),
  status: Enum ["active", "inactive", "archived"] (default: "active"),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Ward Model
**File**: `backend/models/Location/Ward.js`

```javascript
{
  _id: ObjectId,
  name: String (required),
  id: String (unique, sparse),
  wardName: String (required),
  areaId: String (required),
  slug: String (required, unique, lowercase),
  lga: ObjectId (ref: LGA, required),
  lgaId: String (required),
  lgaName: String (required),
  state: ObjectId (ref: State, required),
  country: String (default: "Nigeria"),
  aliases: [String],
  latitude: Number,
  longitude: Number,
  coordinates: { latitude: Number, longitude: Number },
  isUrban: Boolean (default: true),
  status: Enum ["active", "inactive", "archived"] (default: "active"),
  feederIds: [ObjectId (ref: Feeder)],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Feeder Model
**File**: `backend/models/Location/Feeder.js`

```javascript
{
  _id: ObjectId,
  uniqueId: String (unique, sparse),
  slug: String (unique, sparse, lowercase),
  name: String (required),                  // e.g., "Dala 11kV Feeder"
  displayName: String,
  band: String,
  voltageLevel: String,
  color: String,
  injectionSubstation: String,
  injectionSubstationId: ObjectId (ref: InjectionSubstation),
  communityIds: [ObjectId (ref: Ward)],
  wards: [ObjectId (ref: Ward)],
  wardIds: [ObjectId (ref: Ward)],
  ward: ObjectId (ref: Ward),
  lgaId: ObjectId (ref: LGA),
  source: String (default: "KEDCO"),
  verificationStatus: Enum ["Verified", "Unverified", "Uncertain"] (default: "Unverified"),
  confidenceScore: Number (0-100, default: 0),
  status: String (default: "active"),
  coordinates: { latitude: Number, longitude: Number },
  isActive: Boolean (default: true),
  isAssigned: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

## Core Models

### User Model
**File**: `backend/models/UserModel.js`

```javascript
{
  _id: ObjectId,
  fullName: String (required),
  email: String (required, unique, lowercase, trim),
  password: String (required, hashed),
  phone: String,
  role: Enum ["super-admin", "admin", "user"] (default: "user"),
  state: String,
  lga: String,
  ward: String,
  feeder: String,
  isActive: Boolean (default: true),
  notificationPreference: Enum ["email", "push", "in-app", "off"] (default: "push"),
  businessModeEnabled: Boolean (default: false),
  businessType: Enum ["retail", "manufacturing", "hospitality", "office", "agriculture", "services", "other"] (default: "other"),
  businessRiskScore: Number (default: 0),
  deviceTokens: [
    {
      token: String,
      deviceType: Enum ["web", "mobile", "other"] (default: "web"),
      lastUpdated: Date (default: Date.now)
    }
  ],
  assignedFeeders: [ObjectId (ref: Feeder)],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  otpCode: String (hashed),
  otpExpire: Date,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### PowerStatus Model
**File**: `backend/models/PowerStatus.js`

```javascript
{
  _id: ObjectId,
  status: Enum ["on", "off", "maintenance"] (default: "off"),
  isActive: Boolean (required, default: false),
  feeder: ObjectId (ref: Feeder, required, unique),
  lastUpdated: Date (default: Date.now),
  expectedOutageTime: Date,
  expectedRestoreTime: Date,
  maintenanceStart: Date,
  maintenanceEnd: Date,
  reason: String (default: "Scheduled maintenance"),
  estimatedNextOutage: Date,
  maintenanceReason: String (default: "Scheduled maintenance"),
  updatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### PowerLog Model
**File**: `backend/models/PowerLog.js`

```javascript
{
  _id: ObjectId,
  feeder: ObjectId (ref: Feeder, required),
  feederName: String,
  status: Enum ["on", "off", "maintenance"] (required),
  timestamp: Date (default: Date.now),
  updatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Database Collections

- `users`: User accounts (Platform Owner / Admins / Users)
- `platforms`: Nikola Platform singleton entity
- `countries`: Global Geography roots (e.g. Nigeria)
- `companies`: Energy distribution companies
- `states`: States within countries (provisioned by Platform Owner)
- `lgas`: Local Government Areas (provisioned by Super Admin)
- `wards`: Wards within LGAs (provisioned by Super Admin)
- `injectionsubstations`: Substation infrastructure (provisioned by Super Admin)
- `feeders`: Power distribution feeders (provisioned by Super Admin)
- `feedercoverages`: Feeder to community/ward mappings
- `coordinates`: Geographic coordinates
- `powerstatuses`: Current power status per feeder
- `powerlogs`: Historical power status changes
- `reports`: Citizen outage and fault reports
- `outages`: Outage event logs
- `notifications`: User notification delivery logs
- `predictions`: Predictive maintenance outputs
- `reminders`: Scheduled maintenance alerts
- `featureflags`: Enterprise feature toggle configuration
- `companymessages`: Inter-company messaging
- `analyticsevents`: Product analytics event logging
- `audits`: Enterprise audit trail
- `approvals`: Enterprise approval workflows
- `activitytimelines`: Activity feeds

---

## Infrastructure Baseline & Controlled Cleanup Audit

A controlled infrastructure reset was completed to allow clean geographic and electrical provisioning:

### 1. Collections Cleaned (Documents removed, collections & indexes preserved)
- `feeders`: Cleaned 194 documents -> Current: 0
- `injectionsubstations`: Cleaned 69 documents -> Current: 0
- `reports`: Cleaned 15 documents -> Current: 0
- `coordinates`: Cleaned 510 documents -> Current: 0
- `states`: Cleaned 37 documents -> Current: 0
- `lgas`: Cleaned 44 documents -> Current: 0
- `notifications`: Cleaned 898 documents -> Current: 0
- `outages`: Cleaned 0 documents -> Current: 0
- `wards`: Cleaned 957 documents -> Current: 0 (reset with parent geography)
- `feedercoverages`: Cleaned 167 documents -> Current: 0 (reset with parent feeders)
- `powerstatuses`: Cleaned 22 documents -> Current: 0 (reset with parent feeders)

### 2. Collections Preserved Intact
- `users`: Platform Owner account preserved (`um218194@gmail.com`)
- `platforms`: Platform entity preserved (`LITHA_PLATFORM`)
- `countries`: Global Geography preserved (`Nigeria`, code `NG`)
- `companies`, `featureflags`, `analyticsevents`, `companymessages`, `powerlogs`, `predictions`, `reminders`, `audits` preserved.

### 3. Reference Cleanup Performed
- Cleared obsolete location strings (`feeder`, `ward`, `lga`, `state`) and empty `assignedFeeders` on preserved user records.
- Obsolete powerstatus and feedercoverage documents tied to deleted feeder ObjectIds were cleared.

### 4. Seeder Verification
- Verified that `seedDatabase.js`, `seedCompany.js`, `seedGeography.js`, and `bootstrapService.js` maintain zero-state on startup and do not automatically recreate Kano, KEDCO, or obsolete default infrastructure.

### 5. Infrastructure Hierarchy Rebuilding Workflow
The system is in a clean baseline state ready for the hierarchical build:
```
PLATFORM OWNER:
  Countries (Preserved) ──► States ──► Company Coverage
SUPER ADMIN:
  LGAs ──► Wards ──► Injection Substations ──► Feeders ──► Admins
```

