# Quick Reference: Testing the Role-Based Feeder Assignment System

## 🎯 What Was Implemented

### Role-Based Access Control (RBAC) with Feeder Assignment
- **Super Admin**: Can assign feeders to admins and manage all data
- **Admin**: Can only access and manage users/reports from assigned feeders  
- **User**: Can submit reports and view their own data

### Multi-Feeder Support
- Admins can manage 1 to 50+ feeders
- Flexible assignment and modification
- Real-time access control

---

## 🧪 Testing Steps

### 1️⃣ Super Admin - Assign Feeders

1. **Login as Super Admin**
   - Go to Dashboard → Admin Panel
   - Navigate to "Admin Fleet" tab

2. **Assign Feeders to Admin**
   - Click "Manage Feeders (0)" button on any admin
   - A modal appears with all available feeders
   - Check multiple feeders (e.g., Sheka, Sallari, Tagarashi)
   - Click "Authorize Assignment"
   - ✅ Modal closes and feeder count updates

3. **Verify Assignment**
   - Feeder count button now shows "(3)" if you selected 3 feeders
   - Super Admin dashboard shows the admin has access

### 2️⃣ Admin - Verify Feeder Filtering

1. **Login as Admin A**
   - Assigned Feeders: Sheka, Sallari
   
2. **Check Dashboard Stats**
   - Stats shown only for "Sheka" and "Sallari" feeders
   - Reports from "Tagarashi" should NOT be included

3. **View Users**
   - Click Users tab
   - See only users from Sheka & Sallari
   - Users from Tagarashi are hidden

4. **View Reports**
   - Click Reports tab
   - See only reports from Sheka & Sallari
   - Cannot see Tagarashi reports

5. **Try to Update Report**
   - From a Sheka report: ✅ Can update status
   - Try to update Tagarashi report via API: ❌ Returns 403 Forbidden
     ```
     Response: "You do not have access to manage reports in the Tagarashi feeder"
     ```

### 3️⃣ Multiple Feeder Assignment

1. **Assign 5+ feeders to one admin**
   - Open feeder assignment modal
   - Select 5 different feeders
   - Save assignment
   - ✅ Admin now has access to all 5

2. **Modify Assignment**
   - Open modal again
   - Deselect 2 feeders
   - Add 3 new feeders
   - ✅ Admin now has 6 feeders

### 4️⃣ Data Isolation Test

1. **Create Test Data**
   - User U1 in Sheka (Admin A manages)
   - User U2 in Sallari (Admin A manages)
   - User U3 in Tagarashi (Admin B manages)

2. **Login as Admin A**
   - Get /api/admin/users → See U1, U2 only
   - Get /api/admin/stats → Counts include U1, U2 only
   - ✅ U3 data is completely hidden

3. **Login as Admin B**
   - Get /api/admin/users → See U3 only
   - ✅ Cannot see U1, U2

### 5️⃣ Super Admin Full Access

1. **Login as Super Admin**
   - Get /api/admin/users → See ALL users (U1, U2, U3)
   - Get /api/admin/stats → ALL stats (no filtering)
   - ✅ Super Admin sees everything

---

## 📡 API Endpoints Reference

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| `/api/admin/admins` | GET | Super-Admin | Get all admins with feeders |
| `/api/admin/all-feeders` | GET | Super-Admin | Get all available feeders |
| `/api/admin/assign-feeders/:id` | PUT | Super-Admin | Assign feeders to admin |
| `/api/admin/stats` | GET | Both | System stats (filtered by role) |
| `/api/admin/users` | GET | Both | User list (filtered by role) |
| `/api/reports` | GET | Both | Reports (filtered by role) |
| `/api/reports/:id/status` | PUT | Both | Update report (access checked) |

---

## ✅ Verification Checklist

- [ ] Super admin can see feeder assignment UI
- [ ] Super admin can assign multiple feeders to admin
- [ ] Feeder count updates after assignment
- [ ] Admin sees only their assigned feeders' data
- [ ] Admin cannot see other feeders' data
- [ ] Admin status updates are reflected immediately
- [ ] 403 error when accessing forbidden feeder
- [ ] Multiple feeders (5+) work correctly
- [ ] Super admin has unrestricted access
- [ ] Data is properly isolated by feeder

---

## 🐛 Troubleshooting

**Issue: Modal doesn't show feeders**
- Solution: Check that `getAllFeeders` endpoint returns data
- Verify: `GET /api/admin/all-feeders` in API client

**Issue: Feeder assignment button disabled**
- Solution: Check admin role is "admin" not "super-admin"
- Only regular admins can have feeder assignments

**Issue: Can't see assigned feeders in modal**
- Solution: Refresh the page or re-fetch admin data
- The modal extracts IDs from `assignedFeeders` array

**Issue: Admin sees all data after assignment**
- Solution: Check feeder filtering logic in backend
- Verify: Queries use `getFeederQuery()` helper

---

## 📊 Database Query Examples

**Get all reports for Admin with feeder access control:**
```javascript
const query = await getFeederQuery(req.user);
const reports = await Report.find(query).sort({ createdAt: -1 });
```

**Check if admin can update a report:**
```javascript
const hasAccess = await hasFeederAccess(req.user, report.feeder);
if (!hasAccess) return res.status(403).json({ message: "Access denied" });
```

---

## 🎓 Key Concepts

1. **Feeder**: A power distribution line/zone managed by admins
2. **Super Admin**: Can manage all feeders and assign them to admins
3. **Admin**: Restricted to their assigned feeders
4. **User**: Regular user, no special access
5. **assignedFeeders**: Array of feeder IDs assigned to an admin

---

**Status**: ✅ All features implemented and ready for testing
**Last Updated**: 2026-03-16
