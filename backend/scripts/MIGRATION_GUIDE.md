# Multi-Tenant Data Ownership Migration Guide

## CRITICAL SECURITY FIX - READ BEFORE EXECUTING

This migration fixes the root cause of cross-tenant data leakage in the LITHA Enterprise system. The `Coordinates` and `FeederCoverage` collections lacked `companyId` fields, causing all companies to see each other's operational data.

## PRE-MIGRATION CHECKLIST

1. **BACKUP YOUR DATABASE** - This is critical. Run:
   ```bash
   mongodump --uri="MONGODB_URI" --out=backup_$(date +%Y%m%d_%H%M%S)
   ```

2. **Stop the application** - Ensure no users are logged in and no API requests are being processed

3. **Verify environment variables** - Ensure `MONGO_URI` or `MONGODB_URI` is set in your `.env` file

## MIGRATION STEPS

### Step 1: Deploy Schema Changes

The following model files have been updated with `companyId` fields:

- `backend/models/Location/Coordinates.js` - Added required `companyId` field
- `backend/models/Location/FeederCoverage.js` - Added required `companyId` field

These changes are already committed. Deploy them first.

### Step 2: Run Migration Script

Execute the migration script to assign existing data to the default company:

```bash
cd backend
node scripts/migrateTenantOwnership.js
```

**What this script does:**
- Finds all `Coordinates` documents without `companyId`
- Assigns them to the first/default company in the database
- Finds all `FeederCoverage` documents without `companyId`
- Assigns them to the default company
- Verifies all records now have `companyId`

**Expected output:**
```
🔄 Starting tenant ownership migration...
✅ Connected to MongoDB
📋 Default company found: KEDCO (ID: 507f1f77bcf86cd799439011)

📍 Migrating Coordinates...
   Found 1234 coordinates without companyId
   ✅ Updated 1234 coordinates

⚡ Migrating FeederCoverage...
   Found 5678 feeder coverage records without companyId
   ✅ Updated 5678 feeder coverage records

🔍 Verifying migration...
✅ Migration successful! All records now have companyId.

🎉 Tenant ownership migration complete!
```

### Step 3: Verify Migration

Run verification queries in MongoDB shell:

```javascript
// Check for any Coordinates without companyId
db.coordinates.countDocuments({ companyId: { $exists: false } })
// Should return: 0

// Check for any FeederCoverage without companyId
db.feedercoverage.countDocuments({ companyId: { $exists: false } })
// Should return: 0

// Verify all data belongs to companies
db.coordinates.distinct("companyId")
db.feedercoverage.distinct("companyId")
```

### Step 4: Restart Application

After successful migration, restart the backend server:

```bash
npm start
# or
node server.js
```

### Step 5: Test Tenant Isolation

**Test Scenario:**

1. Create Company B (e.g., "Kaduna Electric")
2. Create a Super Admin for Company B
3. Login as Company B Super Admin
4. Verify:
   - LGAs = 0
   - Wards = 0
   - Feeders = 0
   - Coordinates = 0
   - FeederCoverage = 0

**Expected Result:** Company B should see an empty workspace with no data from Company A (KEDCO).

## POST-MIGRATION VERIFICATION

### Backend API Verification

Test these endpoints with Company B credentials:

```bash
# Get all locations (should be empty for new company)
GET /api/location/all

# Get all feeders (should be empty for new company)
GET /api/admin/all-feeders

# Get all wards (should be empty for new company)
GET /api/location/wards
```

### Frontend Verification

1. Clear browser cache and localStorage
2. Login as Company B user
3. Navigate to dashboard
4. Verify no data from Company A is visible

## ROLLBACK PROCEDURE (IF NEEDED)

If migration fails, restore from backup:

```bash
mongorestore --uri="MONGODB_URI" --drop backup_YYYYMMDD_HHMMSS
```

Then revert the schema changes in:
- `backend/models/Location/Coordinates.js`
- `backend/models/Location/FeederCoverage.js`

## FILES MODIFIED

### Schema Changes
- `backend/models/Location/Coordinates.js` - Added `companyId` field (required, indexed)
- `backend/models/Location/FeederCoverage.js` - Added `companyId` field (required, indexed)

### Service Changes
- `backend/services/coordinatesService.js` - Added `companyId` requirement to all methods

### Script Changes
- `backend/scripts/importFeederCoverage.js` - Added `companyId` filtering
- `backend/scripts/geocodeCommunities.js` - Added `companyId` filtering
- `backend/scripts/geocodeKanoWards.js` - Added `companyId` filtering

### Controller Changes
- `backend/controllers/locationController.js` - Added `companyId` filtering to Coordinates queries

### New Files
- `backend/scripts/migrateTenantOwnership.js` - Migration script
- `backend/scripts/MIGRATION_GUIDE.md` - This guide

## SECURITY IMPLICATIONS

**Before Migration:**
- All companies could see all coordinates and feeder coverage data
- Cross-tenant data leakage was possible
- New companies started with existing operational data

**After Migration:**
- Each company only sees its own coordinates and feeder coverage
- Complete tenant isolation enforced
- New companies start with empty workspace
- Platform owner retains global visibility

## SUPPORT

If you encounter issues during migration:

1. Check MongoDB connection string in `.env`
2. Verify a default company exists in the database
3. Check MongoDB logs for errors
4. Review migration script output for specific error messages

## TIMELINE ESTIMATE

- Pre-migration backup: 5-10 minutes
- Schema deployment: 5 minutes
- Migration execution: 1-5 minutes (depends on data volume)
- Verification: 5-10 minutes
- Testing: 15-30 minutes

**Total estimated time: 30-60 minutes**
