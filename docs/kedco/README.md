# KEDCO Integration

This document describes LITHA's integration with Kano Electricity Distribution Company (KEDCO).

## Overview

LITHA is designed specifically for KEDCO customers in Kano State, Nigeria. It provides real-time power status monitoring, outage notifications, and AI-powered predictions for KEDCO's service area.

## KEDCO Service Area

KEDCO serves:
- **Primary**: Kano State
- **Secondary**: Parts of Jigawa and Katsina States

## Location Hierarchy for Kano

LITHA models KEDCO's distribution network using the standard Nigerian geographic hierarchy:

```
Nigeria
  └── Kano State
       ├── Dala LGA
       │    ├── Sabon Gari Ward
       │    │    └── Dala 11kV Feeder
       │    └── ...
       ├── Fagge LGA
       ├── Kano Municipal LGA
       ├── Tarauni LGA
       └── ... (44 LGAs total in Kano)
```

## Data Import

LITHA includes scripts to import KEDCO's feeder and location data:

### Available Scripts (in `backend/scripts/`)

- `geocodeKanoWards.js`: Geocodes Kano wards with coordinates
- `importKanoFeeders.js`: Imports Kano feeders
- `importKanoWards.js`: Imports Kano wards
- `seedKanoLGAs.js`: Seeds Kano LGAs
- And many more data processing scripts

## Feeder Data Model

KEDCO feeders in LITHA include:
- Feeder name
- Display name
- Voltage level (11kV, 33kV, etc.)
- Injection substation
- Associated wards
- Coordinates (latitude/longitude)
- Verification status
- Source (default: "KEDCO")

## Verification Status

Feeders have a verification status:
- **Unverified**: Initial state, needs confirmation
- **Verified**: Confirmed by KEDCO staff or admin
- **Uncertain**: Data quality is questionable

## KEDCO-Specific Features

### Scheduled Maintenance
LITHA integrates KEDCO's scheduled maintenance windows:
- Maintenance start/end times
- Reason for maintenance
- Affected feeders
- Notifications sent in advance

### Outage Reporting
Users can report outages directly through LITHA, which can be shared with KEDCO:
- Outage location
- Start time
- Description
- Photos (optional)

## Future KEDCO Integration

Planned deeper integration with KEDCO:
- Direct API integration for real-time feeder status
- Automatic maintenance schedule sync
- Outage confirmation from KEDCO
- Billing integration
- Customer support ticketing integration

## Additional Resources

- [kedco-master.pdf](kedco-master.pdf)
