# EIP-07: Product Analytics & Growth Infrastructure (AARRR + DAU/WAU/MAU)

## Executive Overview
Nikola Platform provides a production-grade Product Analytics and Growth system. It instruments feature tracking (such as the **Report Feature Journey**) and calculates complete **AARRR Framework Metrics** (Acquisition, Activation, Retention, Revenue Status, Referral Status) alongside **DAU/WAU/MAU Stickiness** and **Cohort Retention Rates**.

---

## 1. Architectural Principles

1. **Non-Blocking & Fail-Soft Execution**:
   - Analytics logging failures must **never** block or fail a user's report submission, registration, login, or core application HTTP response.
   - All backend event tracking is wrapped in isolated `try/catch` handlers that fail quietly.

2. **Strict Multi-Tenant Data Isolation**:
   - Platform Owners have global visibility across all utility companies and states with options to filter by company.
   - Company Super Admins are strictly scoped to their authenticated `req.user.companyId`. Cross-tenant parameter manipulation is rejected by server-side authorization enforcement.

3. **Privacy-First (Zero PII Policy)**:
   - No personal identifiable information (PII), full names, phone numbers, raw passwords, tokens, or issue descriptions are stored inside analytics events.
   - Metadata stores non-sensitive attributes such as `issueType`, `reportId`, `errorReason`, and `source`.

4. **Unique User Calculation**:
   - All active user metrics (DAU, WAU, MAU, Retention, Activation) are computed using unique user ObjectIds (`$distinct`), eliminating duplicate event inflation or page refresh bias.

---

## 2. AARRR Framework & Growth Metrics

### A. Acquisition
- **New Registrations**: Count of new user accounts created within the date range.
- **New Companies**: Count of new utility tenant companies provisioned (Platform Owner view).
- **Registration Trends**: Time-series curve tracking daily user registrations.
- **Breakdown**: Acquisition grouped by Company and State.

### B. Activation
- **Definition**: Fired when a newly registered user completes a value-adding product action (e.g. submitting a report or initiating an operational status change).
- **Activated Users**: Count of new registered users in the period who completed an activation event.
- **Activation Rate %**: `(Activated Users / New Registrations) * 100`.
- **Activation Trend**: Daily activation count and conversion rate.

### C. Retention & Stickiness
- **DAU (Daily Active Users)**: Unique users with meaningful activity during a single calendar day.
- **WAU (Weekly Active Users)**: Unique users with meaningful activity during a rolling 7-day period.
- **MAU (Monthly Active Users)**: Unique users with meaningful activity during a rolling 30-day period.
- **DAU / MAU Stickiness %**: `(DAU / MAU) * 100`. Core product health indicator distinguishing monthly audience size from daily habits.
- **7-Day Retention %**: Percentage of users registered 7 to 14 days ago who returned with active events 7 to 14 days post-registration.
- **30-Day Retention %**: Percentage of users registered 60 to 30 days ago who returned with active events 30 to 60 days post-registration.
- **New vs. Returning Active Users**: Split of active users who registered inside the date range vs. before the date range.

### D. Revenue (Unavailable / Pending)
- Clearly flagged in the UI and API as `Subscription / Billing Model Unavailable`.
- Ready for future subscription tiers, company billing, transactions, and platform fees.

### E. Referral (Pending Attribution)
- Flagged in the UI and API as `Referral Attribution Pending`.
- Prepared for future referral codes, invitation tracking, and viral growth analytics.

---

## 3. Data Schema (`AnalyticsEvent`)

Located at [AnalyticsEvent.js](file:///e:/PowerSense/backend/models/AnalyticsEvent.js):

```javascript
{
  eventName: String, // 'user_registered' | 'user_login' | 'report_viewed' | 'report_started' | 'report_submitted' | 'report_created' | 'report_submission_failed'
  feature: String,   // 'acquisition' | 'retention' | 'report'
  user: ObjectId,    // ref: 'User' (indexed)
  companyId: ObjectId, // ref: 'Company' (indexed)
  role: String,      // User role at event time
  state: String,     // Geographical state (e.g. 'Kano')
  sessionId: String, // Anonymous session identifier
  metadata: Mixed,   // { issueType, reportId, errorReason }
  timestamp: Date    // Indexed
}
```

---

## 4. API Endpoints

1. **POST `/api/platform-analytics/events`** (Authenticated Users)
   - Dispatches client-side product events (`report_viewed`, `report_started`, `report_submitted`).
   - Populates `user`, `companyId`, `role`, and `state` from server session context.

2. **GET `/api/platform-analytics/reports`** (Platform Owner, Company Super Admin, Admin)
   - Returns Report Feature analytics (Core Metrics, Funnel Steps, Daily Usage Trends, Company & State Breakdown, Decision Indicators).

3. **GET `/api/platform-analytics/growth`** (Platform Owner, Company Super Admin)
   - Returns Product Growth analytics (AARRR Framework, DAU/WAU/MAU, Stickiness %, 7d & 30d Retention %, Growth Time-Series Trends, Tenant Breakdowns, Decision Guidance).

---

## 5. UI Dashboard Components

1. **Growth Analytics Dashboard** ([GrowthAnalyticsView.jsx](file:///e:/PowerSense/frontend/src/components/GrowthAnalyticsView.jsx)):
   - Visualizes DAU, WAU, MAU, DAU/MAU Stickiness %, Activation Rate %, 7-Day & 30-Day Retention, AARRR metric cards, daily time-series trends, and Strategic Growth Decision Guidance (*PERSEVERE → IMPROVE → INVESTIGATE → PIVOT*).

2. **Report Feature Tracking Dashboard** ([ReportAnalyticsView.jsx](file:///e:/PowerSense/frontend/src/components/ReportAnalyticsView.jsx)):
   - Visualizes report completion conversion funnel, submission success/failure rates, unique reporting users, and funnel drop-off stages.

3. **Integration Points**:
   - **Platform Owner**: Integrated into [GlobalAnalytics.jsx](file:///e:/PowerSense/frontend/src/components/GlobalAnalytics.jsx) under **Product Growth (AARRR)** and **Report Feature Tracking**.
   - **Company Super Admin**: Integrated into [SuperAdminDashboard.jsx](file:///e:/PowerSense/frontend/src/pages/SuperAdminDashboard.jsx) under **Product Analytics** (strictly company-scoped).

---

## 6. Future Extension Points

The growth architecture exports structured `extensionPoints`:
- **Feature Flags Supported**: Ready for feature toggle adoption analytics.
- **A/B Testing Ready**: Prepared for experiment cohort comparison tracking.
- **Feature-Level Retention Ready**: Extension hooks for feature-specific retention curves.
