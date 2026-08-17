# KANO STATE LOCATION ENGINE - IMPLEMENTATION GUIDE

## Overview

The Location Engine is a hierarchical, scalable system for managing geographic locations across LITHA. It supports the complete Kano State coverage under KEDCO and is designed to scale to additional Nigerian states without code changes.

## Architecture

### Hierarchical Structure

```
Nigeria (Future)
    ↓
Kano State (Current)
    ↓
Local Government Areas (LGAs) - 44 total
    ↓
Wards / Areas
    ↓
Feeders
    ↓
Users
```

### Current Implementation: Kano State

- **State**: Kano
- **LGAs**: 44 official Local Government Areas
- **Wards**: Expandable (ready for import)
- **Feeders**: Power distribution feeders
- **Users**: Registered users assigned to specific feeders

## Database Models

All models are located in `backend/models/Location/`:

### State.js
```javascript
{
  name: String (unique, required)
  isActive: Boolean (default: true)
  timestamps: true
}
```

### LGA.js (Local Government Area)
```javascript
{
  name: String (required)
  state: ObjectId → State (required)
  isActive: Boolean (default: true)
  timestamps: true
  index: { name: 1, state: 1 } (compound unique)
}
```

### Ward.js
```javascript
{
  name: String (required)
  lga: ObjectId → LGA (required)
  isActive: Boolean (default: true)
  timestamps: true
  index: { name: 1, lga: 1 } (compound unique)
}
```

### Feeder.js
```javascript
{
  name: String (required, unique)
  wards: [ObjectId] → Ward[] (required)
  isActive: Boolean (default: true)
  isAssigned: Boolean (default: false)
  latitude: Number (default: 0)
  longitude: Number (default: 0)
  timestamps: true
}
```

## The 44 Kano State LGAs

1. Ajingi
2. Albasu
3. Bagwai
4. Bebeji
5. Bichi
6. Bunkure
7. Dala
8. Dambatta
9. Dawakin Kudu
10. Dawakin Tofa
11. Doguwa
12. Fagge
13. Gabasawa
14. Garko
15. Garum Mallam
16. Gaya
17. Gezawa
18. Gwale
19. Gwarzo
20. Kabo
21. Kano Municipal
22. Karaye
23. Kibiya
24. Kiru
25. Kumbotso
26. Kunchi
27. Kura
28. Madobi
29. Makoda
30. Minjibir
31. Nasarawa
32. Rano
33. Rimin Gado
34. Rogo
35. Shanono
36. Sumaila
37. Takai
38. Tarauni
39. Tofa
40. Tsanyawa
41. Tudun Wada
42. Ungogo
43. Warawa
44. Wudil

## API Endpoints

### Public Endpoints (No Authentication)

#### GET `/api/location/all`
Returns complete location hierarchy (states, LGAs, wards, feeders)
```javascript
{
  states: [...],
  lgas: [...],
  wards: [...],
  feeders: [...]
}
```

#### GET `/api/location/states`
Returns all active states
```javascript
[{ _id, name, isActive, createdAt, updatedAt }, ...]
```

#### GET `/api/location/lgas?stateId={id}`
Returns LGAs for a state
- Query params: `stateId` (optional)
- Returns: Array of LGAs

#### GET `/api/location/wards?lgaId={id}`
Returns wards for an LGA
- Query params: `lgaId` (optional), `lgaIds` (comma-separated)
- Returns: Array of wards

#### GET `/api/location/feeders`
Returns all active feeders with their wards
- Returns: Array of feeders with populated wards

### Protected Endpoints (Super-Admin/Admin)

#### POST `/api/location/lga`
Create new LGA
```json
{
  "name": "LGA Name",
  "stateId": "state_id"
}
```

#### POST `/api/location/ward`
Create new ward
```json
{
  "name": "Ward Name",
  "lgaId": "lga_id"
}
```

#### POST `/api/location/feeder`
Create new feeder
```json
{
  "name": "Feeder Name",
  "wardIds": ["ward_id_1", "ward_id_2"]
}
```

#### PUT `/api/location/feeder/:id`
Update feeder

#### DELETE `/api/location/lga/:id`
Delete LGA (deactivates it)

#### DELETE `/api/location/ward/:id`
Delete ward (deactivates it)

#### DELETE `/api/location/feeder/:id`
Delete feeder (deactivates it)

## Location Service (Frontend)

Located in `frontend/src/services/locationService.js`

### Methods

```javascript
// Get complete hierarchy
locationService.getAll()

// Get all states
locationService.getStates()

// Get LGAs for a state
locationService.getLGAs(stateId)

// Get wards for an LGA
locationService.getWards(lgaId)

// Get feeders for ward(s)
locationService.getFeeders(wardIds)

// Get state by name
locationService.getStateByName(stateName)

// Get LGAs for a state by state name
locationService.getLGAsByStateName(stateName)
```

## Location Engine (Backend)

Located in `backend/services/locationEngine.js`

### Static Methods

```javascript
// Get location hierarchy by LGA name
LocationEngine.getLocationByLGA(lgaName, stateName)
// Returns: { state, lga, wards[], feeders[] }

// Get location hierarchy by Ward name
LocationEngine.getLocationByWard(wardName)
// Returns: { state, lga, ward, feeders[] }

// Get location hierarchy by Feeder name
LocationEngine.getLocationByFeeder(feederName)
// Returns: { state, lga, wards[], feeder }

// Get LGAs in a state
LocationEngine.getLGAsByState(stateName)

// Get wards in an LGA
LocationEngine.getWardsByLGA(lgaName, stateName)

// Get feeders serving wards
LocationEngine.getFeedersByWards(wardIds)

// Resolve ambiguous location reference
LocationEngine.resolveLocation(locationName, stateName)
// Returns: { type: "lga|ward|feeder", location: {...} }

// Validate location path
LocationEngine.validateLocation(state, lga, ward)
// Returns: { isValid: boolean, errors: [], hierarchy: {...} }
```

## Setup & Maintenance Scripts

### 1. Seed Kano LGAs
```bash
cd backend
node scripts/seedKanoLGAs.js
```
- Creates Kano State (if not exists)
- Creates all 44 official LGAs
- Prevents duplicates
- Output: Creation summary

### 2. Cleanup & Remove Duplicates
```bash
cd backend
node scripts/cleanupKanoLGAs.js
```
- Removes invalid/non-official LGAs
- Removes duplicate LGA entries
- Deactivates invalid records
- Cleans up linked wards
- Output: Detailed cleanup report

### 3. Verify Location Database
```bash
cd backend
node scripts/verifyKanoLocations.js
```
- Verifies all 44 LGAs present
- Checks for duplicates
- Verifies capitalization
- Reports hierarchy structure
- Output: Comprehensive verification report

## Integration Points

### Registration (frontend/src/pages/Register.jsx)
- Users select: State → LGA → Ward → Feeder
- Uses centralized locationService
- Validates location exists before registration

### User Profile (frontend/src/pages/Profile.jsx)
- Users can update their location
- Uses same location hierarchy

### Report Issue (frontend/src/components/ReportForm.jsx)
- Users report issues with location context
- Selects Ward → Auto-detects Feeder
- Uses locationService.getAll()

### Admin Dashboard (backend + frontend)
- Admins assigned to specific feeders
- Can manage locations
- Verify feeder assignments

### AI Assistant (backend/services/aiService.js)
- AI understands location hierarchy
- Resolves ambiguous references
- Uses LocationEngine for context
- Example: "I live in Gwale" → Auto-resolves to Gwale LGA

### Notifications (backend/utils/notificationHelper.js)
- Targets by State, LGA, Ward, or Feeder
- Uses location hierarchy for scoping

### Map/Analytics (frontend + backend)
- Reports tagged with location hierarchy
- Coordinates per feeder
- Future: Heat maps by LGA

## Data Quality Rules

### Capitalization
- All names properly capitalized
- Example: "Garum Mallam" NOT "garummallam" or "GARUM MALLAM"

### Uniqueness
- No duplicate LGAs within a state
- No duplicate wards within an LGA
- No duplicate feeder names globally

### Relationships
- Every LGA must belong to a state
- Every ward must belong to an LGA
- Every feeder must serve at least one ward

### Hierarchical Integrity
- Cannot delete state with active LGAs
- Cannot delete LGA with active wards
- Cannot delete ward with active feeders
- Deletions are soft (isActive = false)

## Future Scalability

### Adding New States

To add a new state (e.g., Lagos):

1. Create state:
```javascript
// scripts/seedLagosLGAs.js
const LAGOS_LGAS = [/* 20 LGAs */];
// Same pattern as Kano
```

2. No code changes needed - just run new seed script

3. Frontend automatically adapts:
   - State selector shows Kano + Lagos
   - LGAs filtered by selected state
   - Wards filtered by selected LGA

### Adding New Wards

When Kano ward data is provided:

1. Run ward import script
2. No changes to existing structure
3. Automatically available in all dropdowns

### Adding Coordinates

Feeders now have `latitude` and `longitude` fields:

```javascript
await Feeder.findByIdAndUpdate(feederId, {
  latitude: 12.0011,
  longitude: 8.6753
});
```

Future: Heat maps, geo-fencing, map visualization

## Common Operations

### Register New User with Location
```javascript
const user = await register({
  fullName: "John Doe",
  email: "john@example.com",
  state: "Kano",
  lga: "Gwale",
  ward: "Unguwar Rimi",
  feeder: "Sheka 11kV"
});
```

### Find All Users in an LGA
```javascript
const User = mongoose.model("User");
const users = await User.find({
  state: "Kano",
  lga: "Gwale"
});
```

### Find All Reports in an LGA
```javascript
const reports = await Report.find({
  lga: "Gwale"
}).sort({ createdAt: -1 });
```

### Resolve User Location Context (AI)
```javascript
const resolved = await LocationEngine.resolveLocation("Gwale", "Kano");
// Returns: { type: "lga", location: { state, lga, wards[], feeders[] } }
```

### Add Ward to Existing Feeder
```javascript
const ward = await Ward.create({ name: "New Ward", lga: lgaId });
const feeder = await Feeder.findByIdAndUpdate(feederId, {
  $push: { wards: ward._id }
});
```

## Validation Examples

### Valid Location Path
```javascript
const result = await LocationEngine.validateLocation(
  "Kano",           // State
  "Gwale",          // LGA
  "Unguwar Rimi"    // Ward
);
// Returns: { isValid: true, hierarchy: {...} }
```

### Invalid Location Path
```javascript
const result = await LocationEngine.validateLocation(
  "Kano",           // State
  "InvalidLGA",     // Does not exist
  "Any Ward"
);
// Returns: { isValid: false, errors: ["LGA 'InvalidLGA' not found in Kano"] }
```

## Monitoring

### Check Database Health
```bash
node scripts/verifyKanoLocations.js
# Should show:
# ✓ All 44 LGAs present
# ✓ No duplicates
# ✓ Proper capitalization
```

### Monitor Location Usage
- Dashboard: Number of users by LGA
- Reports: Count by location
- Feeders: Uptime by location

## Performance Considerations

### Indexes
- Compound index on LGA.name + LGA.state
- Compound index on Ward.name + Ward.lga
- Unique index on Feeder.name

### Queries
- Use `.lean()` for read-only queries
- Populate relationships only when needed
- Cache location lists in frontend

### Caching (Future)
- Cache LGA list (changes rarely)
- Cache ward list per LGA
- Cache feeder list per ward

## Support

### Known Issues
- None at this time

### Troubleshooting

**LGAs not showing in dropdown:**
1. Run: `node scripts/verifyKanoLocations.js`
2. Check: isActive = true for all LGAs
3. Check: stateId correctly references Kano state

**Duplicate LGAs found:**
1. Run: `node scripts/cleanupKanoLGAs.js`
2. Verify results with verification script

**Ward not appearing in LGA:**
1. Check: Ward.lga field references correct LGA
2. Check: Ward.isActive = true

## Release Notes

### Version 1.0 - Kano State Complete
- ✓ 44 official Kano LGAs loaded
- ✓ Hierarchical location model
- ✓ Duplicate prevention
- ✓ AI location resolution
- ✓ Centralized location service
- ✓ Future-ready architecture
- Awaiting: Ward data import

### Future Versions
- Ward import and management
- Geographic coordinates for all locations
- Map-based location selection
- Multi-state support
- Location-based analytics
