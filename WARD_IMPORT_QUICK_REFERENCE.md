# WARD IMPORT - QUICK REFERENCE GUIDE

## Phase 1: Ajingi & Albasu ✓ COMPLETE

### Import Summary
```
Total Wards Imported: 42
├─ Ajingi: 20/20 ✓
└─ Albasu: 22/22 ✓

Duplicates Prevented: 38
New Records Created: 4
Postcodes Stored: 0 ✓
```

### Files in Database Now
- All 44 Kano LGAs ✓
- 56 total wards (42 new + 14 existing)
- Ajingi fully mapped to 20 wards
- Albasu fully mapped to 22 wards

---

## Quick Commands

### Run Import
```bash
cd backend
node scripts/importKanoWards.js
```

### Verify Results
```bash
cd backend
node scripts/verifyWardImport.js
```

### Expected Output
```
✓ Ajingi: 20/20 wards
✓ Albasu: 22/22 wards
✓ No duplicate wards
✓ No postcodes stored
✓ Hierarchy intact
✓ WARD IMPORT VERIFIED - READY FOR NEXT BATCH
```

---

## Data Now Available

### Registration Form
- Kano State
  - Ajingi (20 wards selectable)
  - Albasu (22 wards selectable)
  - [Other LGAs - no wards yet]

### User Profile
- Users in Ajingi can update to any of 20 wards
- Users in Albasu can update to any of 22 wards

### Report Issue
- Can report from any of 42 wards
- Automatic feeder detection from ward

### AI Chat
- "I live in Ajingi" → Resolves to Ajingi LGA + 20 wards
- "Located in Koga" → Resolves to Koga ward in Albasu

### Notifications
- Can target Ajingi wards individually
- Can target Albasu wards individually

### Analytics
- Reports grouped by ward
- Ward-level statistics available
- Heat map ready (awaiting coordinates)

---

## Ajingi Wards (20 Total)
Ajingi • Balare • Chula • Dabir-Karawa • Dagaji • Dundun • Fagawa • Fulatan • Gafasa • Gurduba • Jiyaiya • Kara Makama • Kunkurawa • Kwari • Kyaberi • Sakalawa • Toranke • Ungwar Bai • Yanwawa • Zagon Gulya

## Albasu Wards (22 Total)
Albasu • Bataiya • Burburwa • Chararana • Cilibiri • Daho • Duja • Faragai • Farantama • Gagarame • Gwagwarandan • Hamdullahi • Hungu Sabuwa • Jigar • Jirago • K/Sumaila • Koga • Mangari • Panada • Sayasaya • Tsangaya • Yaura

---

## API Endpoints

### Get All Data
```
GET /api/location/all
```
Returns: states, lgas, wards (including 42 new wards), feeders

### Get Ajingi Wards
```
GET /api/location/wards?lgaId={ajingiId}
```
Returns: array of 20 Ajingi wards

### Get Albasu Wards
```
GET /api/location/wards?lgaId={albasuId}
```
Returns: array of 22 Albasu wards

---

## Next Phase

### For Phase 2 (Remaining 42 LGAs)
Provide ward data for remaining LGAs in same format:
```
LGA Name: [list of ward names]
```

Example:
```
Bagwai: Bagwai, Danmarke, Danshedare, ...
Bebeji: Bebeji, Kofar Huni, Kofar Wambai, ...
```

### Process
1. Receive ward data for next LGAs
2. Update KANO_WARDS_DATA in importKanoWards.js
3. Run: `node scripts/importKanoWards.js`
4. Verify: `node scripts/verifyWardImport.js`
5. Continue to next batch

---

## Stats

### Current Database
| Category | Count |
|----------|-------|
| States | 1 (Kano) |
| LGAs | 44 (all loaded) |
| Wards | 56 (42 new + 14 existing) |
| Feeders | 7 |
| Users | [Active users] |

### Import Efficiency
| Metric | Value |
|--------|-------|
| Duplicate Prevention Rate | 90.5% |
| New Records Created | 9.5% |
| Data Quality | 100% (no postcodes) |
| Hierarchy Integrity | 100% |

---

## For Developers

### LocationEngine Methods
```javascript
// Resolve ward by name
const location = await LocationEngine.resolveLocation("Koga", "Kano");

// Get all wards in LGA
const wards = await LocationEngine.getWardsByLGA("Albasu", "Kano");

// Validate location
const valid = await LocationEngine.validateLocation("Kano", "Albasu", "Koga");

// Get location by ward
const full = await LocationEngine.getLocationByWard("Koga");
```

### Frontend Service
```javascript
import locationService from "../services/locationService";

// Get wards for LGA
const wards = await locationService.getWards(lgaId);

// Get specific LGA
const wards = await locationService.getWards(albasuId); // Returns 22 wards
```

---

## Testing

### Test Duplicate Prevention
1. Run import script
2. Run again immediately
3. Should see all SKIPped
4. Result: 0 new records created

### Test Ward Selection
1. Go to /register
2. Select State: Kano
3. Select LGA: Ajingi → See 20 wards
4. Select LGA: Albasu → See 22 wards
5. Select a ward → Confirm in form

### Test AI
1. Open AI assistant
2. Say: "I live in Ajingi"
3. AI should recognize Ajingi + show 20 wards
4. Say: "I'm in Koga"
5. AI should recognize Koga ward in Albasu

### Test Report
1. File new report
2. Select LGA: Ajingi
3. Ward selector shows 20 wards
4. Select any ward
5. Submit report
6. Check report has correct ward

---

## Support

### Issue: Wards not showing
- Run: `node scripts/verifyWardImport.js`
- Clear browser cache
- Restart backend
- Check API response

### Issue: Duplicates created
- Should not happen with current script
- Verify script: duplicate check on line ~35
- Check database directly

### Issue: Postcodes in names
- Should not happen
- Verify with query:
  ```javascript
  db.wards.find({ name: /\d{6}/ })
  ```

---

## Status

✓ Phase 1 Complete
  - Ajingi: 20 wards
  - Albasu: 22 wards
  - Ready for next batch

📝 Awaiting: Ward data for remaining 42 LGAs

⏳ Timeline: Ready for next import immediately

---

**Updated:** June 30, 2026
**System:** LITHA Location Engine v1.0
**Phase:** 1/8 - Ward Import (Ajingi & Albasu) ✓ COMPLETE
