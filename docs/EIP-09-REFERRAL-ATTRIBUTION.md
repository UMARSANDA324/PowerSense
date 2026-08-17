# EIP-09: Nikola Referral Attribution System Architecture (Phase 1)

## Executive Summary
This document specifies the technical design, data schema, attribution lifecycle, security controls, and analytics integration of the **Nikola Referral Attribution System (Phase 1)**.

The primary objective of Phase 1 is **organic growth measurement and referral attribution**. It does NOT include monetary payouts, reward points, or multi-level commission structures.

---

## 1. Core Principles & Architecture
1. **Durable Database Relationship**: Referral links map an 8-character unique referral code to the inviter's `User` ObjectId (`referredBy`).
2. **First-Party Attribution Integrity**: Attribution is stored in `localStorage` (`nikola_referral_code`) during link redirection and attached at user registration.
3. **Idempotency & Non-Overwrite Guarantee**: Once a user has `referredBy` set, subsequent referral codes are rejected.
4. **Anti-Self-Referral**: A user cannot refer themselves.
5. **Tenant Scoping & Multi-Company Isolation**: Referral codes map users across companies for viral acquisition, but tenant isolation is strictly enforced. A referral link does not grant permissions or cross-tenant access.

---

## 2. Data Schema Extension (`UserModel.js`)

```javascript
referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
},
referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},
referralCodeUsed: {
    type: String,
    default: null
},
referralCapturedAt: {
    type: Date,
    default: null
}
```

---

## 3. Referral Code Generation Specification

- **Length**: 8 characters
- **Charset**: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (30 ambiguous-free characters excluding `0`, `O`, `1`, `I`, `L`).
- **Randomness**: Cryptographically secure using Node `crypto.randomBytes()`.
- **Uniqueness Loop**: Up to 10 retries with database existence checks.

---

## 4. API Endpoints

### Public Endpoints
- `GET /api/referral/resolve/:code`
  - Validates code existence and active referrer user status.
  - Asynchronously tracks `referral_clicked` event.
  - Response: `{ valid: true, referrerName: "Umar" }`

### Protected Endpoints
- `GET /api/referral/me` (Header: `Authorization: Bearer <token>`)
  - Retrieves current user's referral code, link, and performance stats.
  - Response:
    ```json
    {
      "referralCode": "UMAR8X2K",
      "referralPath": "/r/UMAR8X2K",
      "stats": {
        "clicks": 14,
        "signups": 5,
        "activations": 3
      }
    }
    ```

---

## 5. User Onboarding & Redirect Flow

```text
Inviter shares link (e.g. https://nikola.com/r/UMAR8X2K)
       │
       ▼
ReferralRedirect component (/r/:code)
       │
       ▼
GET /api/referral/resolve/UMAR8X2K
  ├── Valid: Store "UMAR8X2K" in localStorage ("nikola_referral_code")
  └── Invalid: Clear referral code
       │
       ▼
Redirect to /register
       │
       ▼
Registration form attaches referralCode: "UMAR8X2K"
       │
       ▼
POST /api/auth/register
  ├── Creates User
  ├── Applies referral attribution (sets referredBy, referralCodeUsed, referralCapturedAt)
  ├── Emits referral_signup analytics event
  └── Generates new user's own referralCode
```

---

## 6. Product Analytics Integration (AARRR Framework)

The Referral System directly feeds the **AARRR Growth Analytics Engine**:
- `referral_clicked`: Fired when a referral link is resolved.
- `referral_signup`: Fired when a referred user successfully registers.
- `referral_activation`: Measured when a referred user completes their first outage report or status check.

### Metrics Computed:
- **Referral Conversion Rate**: `(Referral Signups / Referral Clicks) * 100`
- **Referral Activation Rate**: `(Referred Activated Users / Referral Signups) * 100`

---

## 7. Backfill Procedure

Existing users without referral codes are backfilled using the idempotent script:

```bash
node backend/scripts/backfillReferralCodes.js
```

---

## 8. Verification & Test Plan

1. **Idempotency**: Run backfill script multiple times — zero duplicate codes generated.
2. **Registration with Referral**: Register new user via `/r/:code` flow — verify `referredBy` ObjectId is populated in DB.
3. **Invalid Code Handling**: Visit `/r/INVALID` — user gracefully lands on registration form without crash.
4. **Self-Referral Guard**: User attempts to register with own referral code — attribution rejected.
