# EIP-08: Feature Flag & Controlled Rollout Infrastructure

## Executive Overview
Nikola Platform introduces a production-grade **Feature Flag & Controlled Rollout Infrastructure**. This subsystem empowers Platform Owners to gradually release new capabilities, perform deterministic percentage rollouts (0–100%), target specific user roles/tenant companies/geographic states, evaluate flags server-side, track feature exposure in Product Analytics, and perform zero-downtime emergency rollbacks without requiring application redeployments.

---

## 1. Architectural Principles

1. **Deterministic Cohort Allocation**:
   - Uses a cryptographic SHA-256 hash of `(flagKey + ":" + userId)` modulo 100.
   - Evaluated users consistently remain in the exact same cohort assignment across sessions, requests, and page reloads.

2. **Immediate Zero-Downtime Rollback**:
   - Toggling a flag `OFF` in the management UI immediately invalidates the in-memory flag cache and disables feature evaluation platform-wide. No server restart or build redeployment is required.

3. **Strict Multi-Tenant & Role Isolation**:
   - Management operations (create, update, toggle, delete, rollout) are restricted strictly to Platform Owners (`platform-owner`).
   - Super Admins can only view evaluated flags relevant to their authenticated company context. Parameter manipulation (e.g. attempting to query or configure another company's flags) is blocked on the backend.

4. **Fail-Soft Default Evaluation**:
   - If database or network connections are temporarily disrupted, flag evaluations fall back to safe default values (`defaultValue`) without throwing unhandled exceptions or crashing user requests.

---

## 2. Flag Evaluation Precedence

When `isFeatureEnabled(flagKey, userContext)` is invoked, it evaluates rules in the following strict order:

```text
1. Global isEnabled Check (If isEnabled === false -> return false / defaultValue)
        ↓
2. Environment Check (Matches development, staging, or production)
        ↓
3. Target Companies Filter (If targetCompanies specified & user companyId not matched -> return false)
        ↓
4. Target States Filter (If targetStates specified & user state not matched -> return false)
        ↓
5. Target Roles Filter (If targetRoles specified & user role not matched -> return false)
        ↓
6. Rollout Percentage Bucket Check (bucket < rolloutPercentage)
        ↓
7. Default State Fallback
```

---

## 3. Data Schemas

### FeatureFlag Schema ([FeatureFlag.js](file:///e:/PowerSense/backend/models/FeatureFlag.js))
```javascript
{
  key: String,               // Unique lowercase identifier (e.g. 'report_new_experience')
  displayName: String,       // Human-readable title
  description: String,       // Detailed feature scope
  isEnabled: Boolean,        // Global flag status (true/false)
  environment: String,       // 'development' | 'staging' | 'production'
  defaultValue: Boolean,     // Fallback state on failure/unmatched evaluation
  rolloutPercentage: Number, // 0 | 1 | 5 | 10 | 25 | 50 | 75 | 100
  targetRoles: [String],     // Roles targeted (e.g. ['platform-owner', 'super-admin'])
  targetCompanies: [ObjectId], // Specific company ObjectIds targeted
  targetStates: [String],    // Specific state names targeted (e.g. ['Kano'])
  createdBy: ObjectId,       // User ref
  updatedBy: ObjectId,       // User ref
  lastAuditReason: String    // Audit trail explanation
}
```

---

## 4. Developer Usage Guidelines

### Backend Evaluation Interface
```javascript
import { isFeatureEnabled } from "../services/featureFlagService.js";

// Inside any API route or service:
const isNewReportActive = await isFeatureEnabled("report_new_experience", req.user, false);
if (isNewReportActive) {
  // Execute new experience logic
}
```

### Frontend React Hook Interface
```javascript
import { useFeatureFlag } from "../hooks/useFeatureFlag";

const MyComponent = () => {
  const { enabled: isAiActive, loading } = useFeatureFlag("ai_outage_prediction", false);

  if (loading) return <Spinner />;
  return isAiActive ? <NewAiView /> : <LegacyView />;
};
```

---

## 5. Analytics & Exposure Integration

Whenever a feature flag is evaluated for a user session, an exposure event `feature_exposed` is dispatched to the Product Analytics system:

```javascript
{
  eventName: "feature_exposed",
  feature: "rollout",
  userId: req.user._id,
  companyId: req.user.companyId,
  role: req.user.role,
  state: req.user.state,
  metadata: { featureKey: "ai_outage_prediction", rolloutPercentage: 25 }
}
```

---

## 6. Audit Trail & Compliance

Every configuration change (creation, update, emergency toggle rollback, deletion) creates an immutable audit record in the `Audit` collection:
- `performedBy`: User ObjectId
- `action`: Action summary
- `changes`: `{ before, after }` object delta
- `reason`: Required explanation text
- `timestamp`: Event time

---

## 7. Future Experimentation & A/B Testing Extension

The Feature Flag system is architected as the foundation for future A/B testing and experimentation:
```text
Feature Flag (Deterministic Cohort)
        ↓
Targeted Cohort Allocation
        ↓
Feature Exposure Event (Product Analytics)
        ↓
Variant A vs. Variant B Metric Comparison
```
