# Geocoding Feature Documentation

This document describes the design, implementation, and operation of the LITHA geocoding system, powered by the Geoapify Geocoding API.

---

## Coordinates Architecture

To provide robust geospatial search and interactive maps without overloading external geocoding services, LITHA employs a standalone `Coordinates` collection. 

By separating coordinates into a dedicated, indexed collection:
1. **Separation of Concerns**: The location hierarchy (Country → State → LGA → Ward/Community) remains clean and light.
2. **Database Coordinates Caching**: Repeated lookups for coordinates are resolved instantly from MongoDB instead of making outbound API requests.
3. **Future Scalability**: The coordinates collection can easily be linked to future entities like transformers, meters, and customers, using a polymorphic configuration without changing the schema.

```
+-------------+
|    Ward     |  (Represents a Kano community)
+-------------+
       | (Links via id <-> communityId)
       v
+-------------+
| Coordinates |  (Stores latitude, longitude, and accuracy details)
+-------------+
```

---

## Database Schema

The `Coordinates` collection is defined in `backend/models/Location/Coordinates.js`.

### Fields
*   `country` (String): Defaults to `"Nigeria"`.
*   `state` (String): State name (e.g., `"Kano"`).
*   `lgaId` (String): Stable identifier for the LGA.
*   `wardId` (String): Stable identifier for the Ward.
*   `communityId` (String, Required, Unique): Corresponds to the `Ward.id` representing the community.
*   `communityName` (String, Required): Name of the community.
*   `latitude` (Number, Required): GIS latitude.
*   `longitude` (Number, Required): GIS longitude.
*   `source` (String): Provider of coordinates (e.g., `"Geoapify Geocoding API"`).
*   `accuracy` (String): Quality of match (`"high"`, `"medium"`, `"low"`).
*   `verified` (Boolean): Flag indicating if the coordinate has been verified/processed.
*   `lastUpdated` (Date): Date of last update.

### Indexes
*   `communityId` (unique)
*   `communityName`
*   `wardId`
*   `lgaId`
*   `latitude`
*   `longitude`

---

## Geoapify Integration

LITHA connects to the **Geoapify Geocoding API** at `https://api.geoapify.com/v1/geocode/search` via the backend services. 
*   **Authentication**: Authenticated via API key, configured in `.env` as `GEOAPIFY_API_KEY`.
*   **Security**: The frontend never directly contacts Geoapify. All geocoding occurs entirely on the backend to prevent API key exposure.

### Rate Limiting & Backoff
To respect Geoapify API limits and prevent client socket errors:
1.  **Serialized Requests**: Requests are throttled sequentially with a minimum sleep interval of `350ms` between calls.
2.  **Error Handling**: If a `429 (Too Many Requests)` or `5xx` error is received, the client utilizes an exponential backoff starting at `1000ms`, doubling up to 5 times.

### Query Fallback Logic
When a search query returns no results (`ZERO_RESULTS`), the system automatically tries looser query variations to find a match:

*   **Initial Query**: `Community, Ward, LGA, Kano State, Nigeria`
*   **Fallback 1**: `Community, Ward, LGA, Nigeria`
*   **Fallback 2**: `Ward, LGA, Nigeria`
*   **Fallback 3**: `Community, Kano State, Nigeria`
*   **Fallback 4**: `LGA, Kano State, Nigeria`

Every fallback attempt is logged to the console/progress logs.

---

## Geocoding Script

The backend geocoding script is located at `backend/scripts/geocodeCommunities.js`.

### How it Works
1.  Connects to MongoDB using credentials in `.env`.
2.  Fetches all active Kano communities (`Ward` documents).
3.  Compares community IDs against already geocoded coordinates in the `Coordinates` collection and skips them.
4.  Processes each remaining community, querying Geoapify with the fallbacks above.
5.  Stores coordinates in the `Coordinates` collection.
6.  Updates the community (`Ward`) document coordinates to ensure backward compatibility.
7.  Generates a detailed execution report at `backend/reports/geocode-report.json`.
8.  Validates the entire location database and generates a validation report at `backend/reports/geocode-validation-report.json`.

### How to Run / Rerun the Script
To run the geocoder manually, execute:
```bash
node backend/scripts/geocodeCommunities.js
```
The script is safe to stop and resume. It automatically skips already geocoded records.

---

## Recovery Procedure

If the script fails due to rate limits, network outages, or API key exhaustion:
1.  Check the logs to find the error code.
2.  Ensure that `GEOAPIFY_API_KEY` is correctly defined in `.env`.
3.  Wait for the rate limit cooldown to expire if applicable.
4.  Simply restart the script: `node backend/scripts/geocodeCommunities.js`. It will resume from the last ungeocoded community.

---

## Validation Process

Validation verifies that no communities in the system remain without GIS coordinates.
*   **Automated Validation**: Handled automatically at the end of the geocoding script, outputting results to `backend/reports/geocode-validation-report.json`.
*   **Manual Verification**: You can verify that all active Kano communities have successfully resolved coordinates in MongoDB by running:
    ```javascript
    db.wards.find({ state: kanoStateId, isActive: true, latitude: null }).count()
    ```
    This query should return `0`.
