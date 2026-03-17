# All Status Page - Implementation Guide

## Overview
The "All Status" page is a new feature in PowerSense that allows users to view the real-time electricity status of all feeders available in the system. It's designed with user experience in mind, providing a clean interface to browse feeder information and understand where they can report issues.

---

## Features Implemented

### 1. **Display All Feeders**
- Fetches all registered feeders from the database via `adminService.getAllFeeders()`
- Shows comprehensive information for each feeder:
  - **Feeder Name**: The unique identifier for the feeder
  - **Ward**: The immediate service area
  - **LGA (Local Government Area)**: Regional administrative division
  - **State**: The state where the feeder operates

### 2. **Real-Time Status Display**
Each feeder displays its current status with visual indicators:
- **Power On** ✅ (Green) - Normal operation
- **Power Off** 🔴 (Red) - No electricity supply
- **Maintenance** ⚠️ (Yellow) - Under maintenance

Status indicators include:
- Color-coded badges for quick visual recognition
- Dynamic icons (CheckCircle, Power, AlertCircle)
- Last updated timestamp

### 3. **Search and Filter Functionality**
The search bar allows users to dynamically filter feeders by:
- **Area/Ward name** - Search by the service area
- **Feeder name** - Search by specific feeder
- **LGA name** - Search by local government area
- **State name** - Search by state

Features:
- Real-time filtering as user types
- Displays count of results found
- Case-insensitive search
- Partial matching support

### 4. **Area Registration Indicator**
For each feeder card, users see:
- Visual indication if the feeder is in their registered area
- Green highlight for areas where they can report
- Clear message about their current registered area
- Helpful guidance on what to do if they want to report elsewhere

### 5. **Reporting Restrictions**
The page enforces the following rules:
- Users can only submit reports for feeders in their registered area
- "Report Issue" button is:
  - **Active (Blue)** for feeders in their registered area
  - **Disabled (Gray)** for feeders outside their registered area
- A modal dialog explains why they can't report for that area
- Direct link to Edit Profile to change their registered area

### 6. **User-Friendly Warning Modal**
When a user tries to report an issue in a different area:
- Clear explanation of the restriction
- Shows their current registered area
- Quick navigation link to edit profile
- Allows users to change their area and come back

---

## Technical Implementation

### New Component: `AllStatus.jsx`
**Location**: `/frontend/src/pages/AllStatus.jsx`

**Key Functions:**
```javascript
// Fetch all feeders
const feedersData = await adminService.getAllFeeders();

// Check if user can report for a specific feeder
const canReportForFeeder = (feeder) => {
  const feederWard = feeder.ward?.name?.toLowerCase().trim();
  const userArea = user.ward?.toLowerCase().trim() || user.area?.toLowerCase().trim();
  return feederWard === userArea;
};

// Handle report clicks with validation
const handleReportClick = (feeder) => {
  if (!canReportForFeeder(feeder)) {
    setSelectedFeederId(feeder._id);
    setShowReportWarning(true);
    return;
  }
  navigate("/report-issue", { state: { feeder: feeder.name } });
};
```

### Updated Files:
1. **`AppRoutes.jsx`**
   - Added new route: `/all-status` → `AllStatus` component
   - Import added for the new component

2. **`Navbar.jsx`**
   - Added "Feeder Status" link to main navigation
   - Uses Gauge icon for visual consistency
   - Accessible from desktop/mobile menu

3. **`BottomNav.jsx`**
   - Replaced the Status route with `/all-status`
   - Now displays all feeders instead of user's personal status
   - Updated icon and label

### API Integration:
- **Backend endpoint used**: `GET /api/admin/all-feeders`
- **Data structure**: Includes feeder details with ward and LGA information
- **Caching**: No caching; real-time data fetched on page load

---

## UI/UX Design

### Color Scheme (PowerSense Blue & White)
- **Primary Blue**: `#2563eb` - Buttons, active states, important elements
- **White**: Cards and background
- **Status Colors**:
  - Green (`#16a34a`) - Power On
  - Red (`#dc2626`) - Power Off  
  - Yellow (`#ca8a04`) - Maintenance
  - Gray - Default/unavailable actions

### Layout
- **Header Section**: Title, description, and system status overview
- **Search Bar**: Sticky, full-width with icon for easy access
- **Grid Layout**:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns
- **Responsive**: Fully mobile-optimized

### Card Components
Each feeder card includes:
1. Status header (colored bar at top)
2. Feeder name (prominent)
3. Location hierarchy (Ward > LGA > State)
4. User area indicator
5. Last updated timestamp
6. Action button (Report Issue or disabled state)

---

## User Workflow

### Scenario 1: View All Feeders (Basic)
1. User navigates to "Feeder Status" from the app menu
2. Page loads all feeders with their current status
3. User can see all available feeders and their status at a glance
4. Page is read-only for this view

### Scenario 2: Search for Specific Area
1. User opens "Feeder Status" page
2. User types in search bar (e.g., "Tudun Maliki")
3. Page automatically filters to show only matching feeders
4. User can see feeders in that area and their status
5. User can report if the area matches their registered area

### Scenario 3: Report Issue in Registered Area
1. User is on "Feeder Status" page
2. User finds a feeder in their area (indicated by green highlight)
3. User clicks "Report Issue" button (blue, active)
4. Page redirects to Report Issue page with feeder pre-selected
5. User completes the report form

### Scenario 4: Try to Report Outside Registered Area
1. User is on "Feeder Status" page
2. User finds a feeder NOT in their registered area
3. User clicks "Report Issue" button (gray, disabled)
4. Access warning modal appears
5. User is shown their current registered area
6. User has options to:
   - Go to Edit Profile to change area
   - Cancel and continue browsing

### Scenario 5: Change Area and Report
1. User encounters reporting restriction
2. User navigates to Edit Profile (via modal link)
3. User updates their registered area
4. User returns to "Feeder Status" page
5. Previously disabled areas now become available
6. User can now report in the new area

---

## Data Flow

```
AllStatus.jsx (Page)
  ↓
useEffect (on mount)
  ↓
adminService.getAllFeeders()
  ↓
Backend: GET /api/admin/all-feeders
  ↓
Database: Feeder.find().populate("ward")
  ↓
Returns: Array of feeders with ward/LGA/state details
  ↓
setFeeders() - Store in state
  ↓
Display in responsive grid
```

---

## API Expectations

### Feeder Data Structure (from backend):
```javascript
{
  _id: ObjectId,
  name: String,
  ward: {
    _id: ObjectId,
    name: String,
    lga: {
      _id: ObjectId,
      name: String,
      state: {
        _id: ObjectId,
        name: String
      }
    }
  },
  timestamps: [createdAt, updatedAt]
}
```

### User Data Structure (from AuthContext):
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  role: "user" | "admin" | "super-admin",
  ward: String,        // User's registered area
  area: String,        // Alternative field for area
  phone: String,
  notificationPreference: String,
  assignedFeeders: [ObjectId]
}
```

---

## Error Handling

### Loading State
- Spinner displayed while fetching feeders
- Prevents user interaction during load
- Timeout-friendly

### No Results
- Clear message when search returns no results
- Suggests adjusting search terms
- Shows total feeder count

### API Errors
- Try-catch blocks handle API failures gracefully
- Console errors logged for debugging
- User sees empty state instead of crash

###Access Control
- Non-authenticated users: Cannot report
- Non-admin users: Can view all feeders
- Admins: Full access (filtering by assigned feeders)

---

## Route Configuration

### New Route:
```javascript
<Route path="/all-status" element={<AllStatus />} />
```

**Path**: `/all-status`
**Component**: `AllStatus.jsx`
**Access**: All authenticated users
**Navigation**: Via Navbar menu or BottomNav

---

## Testing Checklist

- [ ] Page loads without errors
- [ ] All feeders display correctly
- [ ] Search filter works for area, feeder, LGA, state
- [ ] Status colors display correctly
- [ ] User area indicator shows accurately
- [ ] Report button enables for user's area
- [ ] Report button disables for other areas
- [ ] Modal warning appears when trying to report outside area
- [ ] Edit Profile link in modal works
- [ ] After profile update, user can report in new area
- [ ] Mobile responsive layout
- [ ] Icons load correctly
- [ ] Last updated timestamp displays

---

## Future Enhancement Ideas

1. **Status History**: Show historical status data for each feeder
2. **Notifications**: Alert users when a feeder's status changes
3. **Favorites**: Let users bookmark important feeders
4. **Map View**: Show feeders on an interactive map
5. **Status Trends**: Display status pattern over time
6. **Scheduled Maintenance**: Show upcoming maintenance windows
7. **Outage Predictions**: Predictive maintenance alerts
8. **Status API**: Real-time WebSocket updates for live status

---

## Troubleshooting

### Page shows "No Feeders"
- Check if feeders are created in the admin dashboard
- Verify database connection
- Check network tab for API errors

### Search not working
- Clear the search box and try again
- Ensure exact ward/area names
- Check for case sensitivity (shouldn't matter, but try)

### Report button disabled for correct area
- Verify user's registered area in profile
- Check feeder's ward name matches exactly
- Try updating profile and returning

### Modal won't open when clicking edit profile
- Check if `/profile` route exists
- Verify Profile component renders correctly
- Check navigation hasn't been overridden

---

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Fully responsive

## Performance Notes
- Grid uses CSS Grid (native, performant)
- Search filters in-memory (fast for typical feeder counts)
- Pagination not needed unless 1000+ feeders
- Consider virtual scrolling if scaling to 10,000+ feeders

---

## Summary
The "All Status" page provides a comprehensive view of all feeders in the PowerSense system. It combines information display with intelligent restrictions to ensure users can only report issues in their registered area, maintaining data integrity while remaining user-friendly. The search functionality enables quick discovery, and the warning modal guides users toward the proper workflow for changing their reporting area.
