import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../services/api";
import { getReports } from "../services/reportService";
import { MapPin, Filter, AlertTriangle, ShieldAlert, Wrench, RefreshCw } from "lucide-react";

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ===== DEBUGGING UTILITIES =====
const DEBUG = true;
const debugLog = (category, message, data = null) => {
  if (DEBUG) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] MAP DEBUG - ${category}: ${message}`, data || "");
  }
};

// ===== COORDINATE VALIDATION =====
const isValidCoordinate = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  return !isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
};

const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const MapPage = () => {
  const [feeders, setFeeders] = useState([]);
  const [wardLocations, setWardLocations] = useState([]);
  const [wardLoadingError, setWardLoadingError] = useState(null);
  const [viewMode, setViewMode] = useState("feeders");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [debugInfo, setDebugInfo] = useState({
    apiResponseTime: 0,
    totalFeeders: 0,
    invalidCoordinates: 0,
    totalMarkers: 0,
    totalWards: 0,
    invalidWardCoordinates: 0
  });

  useEffect(() => {
    const fetchMapData = async () => {
      const startTime = Date.now();
      debugLog("LIFECYCLE", "Starting map data fetch");
      setLoading(true);
      setError(null);
      setWardLoadingError(null);

      try {
        debugLog("API", "Fetching feeder status and ward locations");

        const statusPromise = api.get("/power/all-status", { timeout: 15000 });
        const wardPromise = api.get("/location/wards", { timeout: 15000 });
        const [statusResult, wardResult] = await Promise.allSettled([statusPromise, wardPromise]);

        if (statusResult.status !== "fulfilled") {
          throw new Error(statusResult.reason?.message || "Failed to load feeder status data");
        }

        const statusRes = statusResult.value;
        debugLog("API", "Received feeder status response", statusRes.data?.length || 0);
        if (!statusRes.data || !Array.isArray(statusRes.data)) {
          throw new Error("API returned invalid feeder data format");
        }

        let invalidCount = 0;
        const feederData = statusRes.data
          .map((item) => {
            const lat = item.feeder?.latitude;
            const lng = item.feeder?.longitude;
            const isValid = isValidCoordinate(lat, lng);
            
            if (!isValid) {
              invalidCount++;
              debugLog("VALIDATION", `Invalid coordinates for feeder ${item.feeder?.name}: lat=${lat}, lng=${lng}`);
            }

            return {
              ...item,
              lat: isValid ? lat : 9.0820,
              lng: isValid ? lng : 8.6753,
              name: item.feeder?.name || "Unknown Feeder",
              isCoordinateValid: isValid
            };
          })
          .filter(f => f && f._id);

        debugLog("VALIDATION", `Invalid coordinates found: ${invalidCount}/${feederData.length}`);
        setFeeders(feederData);

        if (wardResult.status === "fulfilled" && Array.isArray(wardResult.value.data)) {
          const wards = wardResult.value.data;
          const wardData = wards.map((ward) => {
            const lat = ward.latitude ?? ward.coordinates?.latitude;
            const lng = ward.longitude ?? ward.coordinates?.longitude;
            const isValid = isValidCoordinate(lat, lng);
            if (!isValid) {
              debugLog("VALIDATION", `Invalid community coordinates for ward ${ward.name}: lat=${lat}, lng=${lng}`);
            }
            return {
              ...ward,
              lat: isValid ? lat : null,
              lng: isValid ? lng : null,
              isCoordinateValid: isValid
            };
          });

          setWardLocations(wardData);
          setWardLoadingError(null);
          debugLog("API", `Received ${wardData.length} ward locations`, wardData.length);
        } else {
          const message = wardResult.status === "rejected" ? wardResult.reason?.message || "Ward location fetch failed" : "Ward locations returned invalid payload";
          setWardLocations([]);
          setWardLoadingError(message);
          debugLog("API", message);
        }

        // ===== FETCH REPORTS =====
        debugLog("API", "Fetching community reports");
        let reportData = [];
        try {
          const reportRes = await api.get("/reports/dev-list/all", {
            timeout: 10000
          });
          reportData = reportRes.data?.reports || [];
          debugLog("API", `Received ${reportData.length} reports`);
        } catch (reportError) {
          debugLog("API", "dev-list/all failed, trying fallback", reportError.message);
          try {
            const allReports = await getReports();
            reportData = Array.isArray(allReports) ? allReports : [];
            debugLog("API", `Fallback received ${reportData.length} reports`);
          } catch (fallbackError) {
            debugLog("API", "Both report endpoints failed", fallbackError.message);
            // Continue without reports - it's not critical
          }
        }
        setReports(reportData);

        const responseTime = Date.now() - startTime;
        debugLog("PERFORMANCE", `Complete map data fetch time: ${responseTime}ms`);
        
        setDebugInfo({
          apiResponseTime: responseTime,
          totalFeeders: feederData.length,
          invalidCoordinates: invalidCount,
          totalMarkers: feederData.filter(f => isValidCoordinate(f.lat, f.lng)).length,
          totalWards: (typeof wardData !== 'undefined' ? wardData.length : 0),
          invalidWardCoordinates: (typeof wardData !== 'undefined' ? wardData.filter(w => !w.isCoordinateValid).length : 0)
        });

        // Validate that we have at least some data
        if (feederData.length === 0) {
          debugLog("ERROR", "No feeders returned from API");
          setError("No feeder data available. Please try again.");
        }
      } catch (error) {
        debugLog("ERROR", "Fatal error fetching map data", error.message);
        console.error("MapPage Error:", error);
        setError(error.message || "Failed to load map data. Please check your connection and try again.");
        setFeeders([]);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Determine marker color based on status
  const getStatusColor = (feeder) => {
    if (feeder.status === "maintenance") return "blue";
    if (!feeder.isActive || feeder.status === "off") return "red";
    if (feeder.status === "unstable") return "yellow";
    return "green";
  };

  // Memoize report count calculation
  const reportCountMap = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const key = r.feeder || "unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [reports]);

  const getReportCountForFeeder = (feederName) => {
    return reportCountMap[feederName] || 0;
  };

  // Filter feeders with valid coordinates
  const validFeeders = useMemo(() => {
    return feeders.filter(f => isValidCoordinate(f.lat, f.lng));
  }, [feeders]);

  const filteredFeeders = useMemo(() => {
    return validFeeders.filter(f => {
      if (filterType === "all") return true;
      if (filterType === "outage") return !f.isActive || f.status === "off";
      if (filterType === "maintenance") return f.status === "maintenance";
      if (filterType === "unstable") return f.status === "unstable";
      return true;
    });
  }, [validFeeders, filterType]);

  const validWardLocations = useMemo(() => {
    return wardLocations.filter(w => isValidCoordinate(w.lat, w.lng));
  }, [wardLocations]);

  const activeMarkers = viewMode === "wards" ? validWardLocations.length : filteredFeeders.length;

  const center = [9.0820, 8.6753]; // Default to Nigeria center roughly
  const defaultZoom = 6;

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 pb-20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
          <p className="text-gray-600 font-semibold">Loading map...</p>
          <p className="text-xs text-gray-400 max-w-xs text-center">Fetching feeder locations and status data</p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 pb-20 px-4">
        <div className="flex flex-col items-center gap-6 max-w-md">
          <div className="bg-red-50 p-6 rounded-3xl border border-red-200 flex items-center justify-center">
            <AlertTriangle size={48} className="text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Map Failed to Load</h2>
            <p className="text-gray-600 text-sm mb-6">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ===== NO DATA STATE =====
  if (activeMarkers === 0) {
    const emptyMessage = viewMode === "wards"
      ? "No community locations with valid coordinates are available yet."
      : feeders.length === 0
        ? "No feeder data is currently available."
        : "All feeders are missing coordinate data. Switch to Community View if available.";

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 pb-20 px-4">
        <div className="flex flex-col items-center gap-6 max-w-md">
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 flex items-center justify-center">
            <MapPin size={48} className="text-blue-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">No Map Markers Available</h2>
            <p className="text-gray-600 text-sm mb-2">{emptyMessage}</p>
            <p className="text-xs text-gray-500 mb-6">
              Debug Info: {debugInfo.totalFeeders} feeders, {debugInfo.invalidCoordinates} invalid feeder coordinates, {debugInfo.totalWards} wards, {debugInfo.invalidWardCoordinates} invalid ward coordinates
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 p-4 shadow-sm z-10 relative mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <MapPin className="text-blue-600" />
              Community Reports Map
            </h1>
            <p className="text-gray-500 text-sm font-medium">Real-time grid intelligence and outage zones • {viewMode === "feeders" ? `${filteredFeeders.length} feeder markers visible` : `${validWardLocations.length} community markers visible`}</p>
            {DEBUG && (
              <p className="text-xs text-gray-400 mt-1">
                Render: {debugInfo.apiResponseTime}ms | Feeder rows: {debugInfo.totalFeeders} | Wards: {debugInfo.totalWards} | Invalid: {debugInfo.invalidCoordinates} | Markers: {viewMode === "feeders" ? debugInfo.totalMarkers : validWardLocations.length}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <Filter size={18} className="text-gray-400" />
            <button 
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterType === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All Zones
            </button>
            <button 
              onClick={() => setFilterType("outage")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterType === "outage" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
            >
              Active Outages
            </button>
            <button 
              onClick={() => setFilterType("unstable")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterType === "unstable" ? "bg-yellow-500 text-white" : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"}`}
            >
              Unstable
            </button>
            <button 
              onClick={() => setFilterType("maintenance")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterType === "maintenance" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              Maintenance
            </button>
            <button
              onClick={() => setViewMode("feeders")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${viewMode === "feeders" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Feeder View
            </button>
            <button
              onClick={() => setViewMode("wards")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${viewMode === "wards" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}
            >
              Community View
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative z-0" style={{ height: "calc(100vh - 200px)" }}>
        <MapContainer center={center} zoom={defaultZoom} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {viewMode === "wards" ? (
            validWardLocations.map((ward) => {
              if (!isValidCoordinate(ward.lat, ward.lng)) {
                debugLog("RENDER", `Skipping ward marker for ${ward.name} - invalid coordinates`);
                return null;
              }

              return (
                <CircleMarker
                  key={ward._id}
                  center={[ward.lat, ward.lng]}
                  radius={6}
                  pathOptions={{ color: '#7c3aed', fillColor: '#c084fc', fillOpacity: 0.45 }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 max-w-xs">
                      <h3 className="font-bold text-gray-800 text-base">{ward.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{ward.lga?.name || ward.lgaName || "Unknown LGA"}, Kano</p>
                      <p className="text-xs text-gray-500 mt-2">Lat: {ward.lat.toFixed(4)} | Lng: {ward.lng.toFixed(4)}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          ) : (
            filteredFeeders.map((feeder) => {
              if (!isValidCoordinate(feeder.lat, feeder.lng)) {
                debugLog("RENDER", `Skipping marker for ${feeder.name} - invalid coordinates`);
                return null;
              }

              const reportCount = getReportCountForFeeder(feeder.name);
              const color = getStatusColor(feeder);
              const icon = createCustomIcon(color);
              
              return (
                <React.Fragment key={feeder._id}>
                  <Marker position={[feeder.lat, feeder.lng]} icon={icon}>
                    <Popup className="custom-popup">
                      <div className="p-2">
                        <h3 className="font-bold text-gray-800 text-base">{feeder.name}</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              color === 'red' ? 'bg-red-500' : 
                              color === 'green' ? 'bg-green-500' : 
                              color === 'yellow' ? 'bg-yellow-500' : 
                              'bg-blue-500'
                            }`}></span>
                            <span className="capitalize">{!feeder.isActive ? "Outage" : feeder.status || "Stable"}</span>
                          </p>
                          <p className="text-gray-600 flex justify-between">
                            <span>Active Complaints:</span>
                            <span className="font-bold text-gray-800">{reportCount}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {feeder.lat.toFixed(4)} | Lng: {feeder.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {reportCount > 0 && (
                    <CircleMarker
                      center={[feeder.lat, feeder.lng]}
                      radius={Math.min(15 + reportCount * 5, 50)}
                      pathOptions={{ 
                        fillColor: color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : '#3b82f6', 
                        fillOpacity: 0.2, 
                        color: 'transparent' 
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })
          )}
        </MapContainer>
      </div>
      
      {/* Legend overlay for mobile visibility */}
      <div className="fixed bottom-24 right-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-lg border border-gray-100 z-[1000] text-xs max-w-xs">
        <h4 className="font-bold text-gray-800 mb-2">Map Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> <span>Stable Grid</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> <span>Unstable</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> <span>Outage</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> <span>Maintenance</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full"></div> <span>Community Marker</span></div>
        </div>
        {DEBUG && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-[10px] text-gray-500 space-y-1">
            <p>📊 Total Feeders: {feeders.length}</p>
            <p>✓ Valid Coords: {validFeeders.length}</p>
            <p>✗ Invalid: {debugInfo.invalidCoordinates}</p>
            <p>⏱️  Load: {debugInfo.apiResponseTime}ms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
