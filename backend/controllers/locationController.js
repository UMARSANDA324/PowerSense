import mongoose from "mongoose";
import Country from "../models/Location/Country.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import Coordinates from "../models/Location/Coordinates.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Company from "../models/Company.js";
import { buildAreaSlug, buildAreaStableId, buildLGAStableId, slugify } from "../utils/slugGenerator.js";
import { resolveTenantIdFromUser, getDefaultCompany } from "../services/tenantResolver.js";

// Helper function to get company ID from request
async function getCompanyIdFromRequest(req) {
  // If user is platform-owner, return null (no filter)
  if (req.user && req.user.role === "platform-owner") {
    return null;
  }
  // Try req.user.companyId first
  if (req.user && req.user.companyId) {
    return req.user.companyId;
  }
  // Fallback to resolveTenantIdFromUser
  if (req.user && req.user._id) {
    return await resolveTenantIdFromUser(req.user._id);
  }
  // CRITICAL: Do NOT fall back to default company - this causes cross-tenant data leakage
  return null;
}

// Helper function to build tenant query filter
async function buildTenantQuery(req) {
  const companyId = await getCompanyIdFromRequest(req);
  if (companyId) {
    return { companyId };
  }
  return { companyId: null };
}

const normalizeCountryLabel = (value) => String(value || "").trim();
const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["active", "inactive", "archived"].includes(normalized) ? normalized : "active";
};

const serializeCountry = (country) => {
  if (!country) return null;
  const record = country.toObject ? country.toObject() : country;
  return {
    ...record,
    status: record.status || (record.isActive === false ? "inactive" : "active"),
    isActive: record.isActive !== false,
    code: record.code || record.countryCode || ""
  };
};

const serializeState = (state) => {
  if (!state) return null;
  const record = state.toObject ? state.toObject() : state;
  return {
    ...record,
    status: record.status || (record.isActive === false ? "inactive" : "active"),
    isActive: record.isActive !== false,
    countryName: record.countryName || (record.country && typeof record.country === "object" ? record.country.name : "")
  };
};

export const resolveAllowedStateNamesForUser = async (user, companyOverride = null) => {
  if (!user || user.role === "platform-owner") return [];
  if (!user.companyId && !companyOverride?._id) return [];

  const companyId = companyOverride?._id || user.companyId;
  const company = companyOverride || await Company.findById(companyId).select("coverageStates");
  if (!company || !Array.isArray(company.coverageStates) || company.coverageStates.length === 0) {
    return [];
  }

  const stateIdsOrNames = company.coverageStates.map(st => {
    if (!st) return "";
    if (typeof st === "string") return st.trim();
    if (st.name) return String(st.name).trim();
    return String(st).trim();
  }).filter(Boolean);

  const objectIds = stateIdsOrNames.filter(st => mongoose.Types.ObjectId.isValid(st));
  const rawNames = stateIdsOrNames.filter(st => !mongoose.Types.ObjectId.isValid(st));

  let namesFromObjectIds = [];
  if (objectIds.length > 0) {
    const statesFound = await State.find({ _id: { $in: objectIds } }).select("name").lean();
    namesFromObjectIds = statesFound.map(s => s.name);
  }

  let canonicalNames = [];
  if (rawNames.length > 0) {
    const regexList = rawNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
    const statesFoundByName = await State.find({ name: { $in: regexList } }).select("name").lean();
    canonicalNames = statesFoundByName.map(s => s.name);
  }

  return [...new Set([...rawNames, ...namesFromObjectIds, ...canonicalNames])];
};

export const isStateAllowedForUser = (user, stateName, allowedStateNames = null) => {
  if (!user || user.role === "platform-owner") return true;
  if (!stateName) return false;

  const directStateName = String(stateName).trim().toLowerCase();
  if (!directStateName) return false;

  const allowedNames = (allowedStateNames || []).map(n => String(n).trim().toLowerCase());
  if (allowedNames.length === 0) {
    return false;
  }

  return allowedNames.includes(directStateName);
};

async function getCompanyStateAccess(req) {
  const user = req?.user;
  if (!user || !["super-admin", "company-super-admin"].includes(user.role)) {
    return null;
  }

  const allowedStateNames = await resolveAllowedStateNamesForUser(user);
  if (!allowedStateNames.length) {
    return { names: [], ids: [] };
  }

  const regexList = allowedStateNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
  const states = await State.find({
    $or: [
      { name: { $in: allowedStateNames } },
      { name: { $in: regexList } }
    ]
  }).select("_id name").lean();

  const matchedNames = states.map((state) => state.name);
  const matchedIds = states.map((state) => state._id);

  return {
    names: [...new Set([...allowedStateNames, ...matchedNames])],
    ids: matchedIds
  };
}

async function ensureAuthorizedStateAccess(req, stateId, stateName = null) {
  const user = req?.user;
  if (!user || user.role === "platform-owner") {
    return true;
  }
  if (!["super-admin", "company-super-admin"].includes(user.role)) {
    return true;
  }

  const access = await getCompanyStateAccess(req);
  if (!access || !access.names.length) {
    return false;
  }

  if (stateId) {
    const stateDoc = await State.findById(stateId).select("name");
    if (!stateDoc) {
      return false;
    }
    return isStateAllowedForUser(user, stateDoc.name, access.names);
  }

  return isStateAllowedForUser(user, stateName, access.names);
}

export const getCountries = async (req, res) => {
  try {
    const countries = await Country.find({}).sort({ name: 1 }).lean();
    res.json(countries.map(serializeCountry));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load countries" });
  }
};

export const getActiveCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isActive: { $ne: false }, status: { $ne: "inactive" } }).sort({ name: 1 }).lean();
    res.json(countries.map(serializeCountry));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load active countries" });
  }
};

export const createCountry = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "Country management is restricted exclusively to the Platform Owner" });
    }

    const { name, code, isoCode, isActive = true } = req.body;
    const countryName = normalizeCountryLabel(name);
    const countryCode = String(code || countryName).trim().toUpperCase();

    if (!countryName) {
      return res.status(400).json({ message: "Country name is required" });
    }
    if (!countryCode) {
      return res.status(400).json({ message: "Country code is required" });
    }

    const existing = await Country.findOne({ $or: [{ name: countryName }, { code: countryCode }] });
    if (existing) {
      return res.status(400).json({ message: "Country with this name or code already exists" });
    }

    const country = await Country.create({
      name: countryName,
      code: countryCode,
      isoCode: String(isoCode || "").trim().toUpperCase() || undefined,
      status: normalizeStatus(isActive === false ? "inactive" : "active"),
      isActive: isActive !== false,
      isDefault: false,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    res.status(201).json({ message: "Country created successfully", country: serializeCountry(country) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create country" });
  }
};

export const updateCountry = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "Country management is restricted exclusively to the Platform Owner" });
    }
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).json({ message: "Country not found" });

    const { name, code, isoCode, status, isActive } = req.body;
    if (name) country.name = normalizeCountryLabel(name);
    if (code) country.code = String(code).trim().toUpperCase();
    if (isoCode !== undefined) country.isoCode = String(isoCode).trim().toUpperCase() || undefined;

    const nextStatus = status ? normalizeStatus(status) : (isActive === false ? "inactive" : "active");
    country.status = nextStatus;
    country.isActive = nextStatus !== "inactive" && nextStatus !== "archived";
    country.updatedBy = req.user?._id || null;
    await country.save();

    res.json({ message: "Country updated successfully", country: serializeCountry(country) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update country" });
  }
};

export const toggleCountryStatus = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "Country management is restricted exclusively to the Platform Owner" });
    }
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).json({ message: "Country not found" });

    const nextActive = req.body.active !== undefined ? Boolean(req.body.active) : !country.isActive;
    country.isActive = nextActive;
    country.status = nextActive ? "active" : "inactive";
    country.updatedBy = req.user?._id || null;
    await country.save();

    res.json({ message: `Country ${nextActive ? "activated" : "deactivated"} successfully`, country: serializeCountry(country) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to change country status" });
  }
};

export const createState = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "State management is restricted exclusively to the Platform Owner" });
    }

    const { name, countryId, country, isActive = true } = req.body;
    const stateName = String(name || "").trim();
    if (!stateName) return res.status(400).json({ message: "State name is required" });

    const countryQuery = countryId ? { _id: countryId } : { name: normalizeCountryLabel(country) };
    const countryRecord = await Country.findOne(countryQuery);
    if (!countryRecord) {
      return res.status(400).json({ message: "A valid country is required before creating a state" });
    }

    const duplicateState = await State.findOne({ country: countryRecord._id, name: stateName });
    if (duplicateState) {
      return res.status(400).json({ message: "State already exists in this country" });
    }

    const state = await State.create({
      name: stateName,
      country: countryRecord._id,
      countryName: countryRecord.name,
      status: normalizeStatus(isActive === false ? "inactive" : "active"),
      isActive: isActive !== false,
      companyId: null,
    });

    res.status(201).json({ message: "State created successfully", state: serializeState(state) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create state" });
  }
};

export const updateState = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "State management is restricted exclusively to the Platform Owner" });
    }

    const state = await State.findById(req.params.id).populate("country");
    if (!state) return res.status(404).json({ message: "State not found" });

    const { name, countryId, isActive, status } = req.body;
    if (name) state.name = String(name).trim();
    if (countryId) {
      const countryRecord = await Country.findById(countryId);
      if (!countryRecord) return res.status(404).json({ message: "Country not found" });
      state.country = countryRecord._id;
      state.countryName = countryRecord.name;
    }

    const nextStatus = status ? normalizeStatus(status) : (isActive === false ? "inactive" : "active");
    state.status = nextStatus;
    state.isActive = nextStatus !== "inactive" && nextStatus !== "archived";
    await state.save();

    res.json({ message: "State updated successfully", state: serializeState(state) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update state" });
  }
};

export const toggleStateStatus = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "State management is restricted exclusively to the Platform Owner" });
    }

    const state = await State.findById(req.params.id).populate("country");
    if (!state) return res.status(404).json({ message: "State not found" });

    const nextActive = req.body.active !== undefined ? Boolean(req.body.active) : !state.isActive;
    state.isActive = nextActive;
    state.status = nextActive ? "active" : "inactive";
    await state.save();

    res.json({ message: `State ${nextActive ? "activated" : "deactivated"} successfully`, state: serializeState(state) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to change state status" });
  }
};

export const getStates = async (req, res) => {
  try {
    const { countryId, country, activeOnly } = req.query;
    const query = {};
    const companyStateAccess = await getCompanyStateAccess(req);

    if (countryId) {
      query.country = countryId;
    } else if (country) {
      const countryRecord = await Country.findOne({ name: String(country).trim() });
      if (countryRecord) query.country = countryRecord._id;
    }

    if (companyStateAccess !== null) {
      query.name = { $in: companyStateAccess.names };
    }

    if (activeOnly !== undefined) {
      query.isActive = { $ne: false };
      query.status = { $ne: "inactive" };
    }

    const states = await State.find(query).populate("country").sort({ name: 1 }).lean();
    res.json(states.map(serializeState));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveStates = async (req, res) => {
  try {
    const { countryId, country } = req.query;
    const companyStateAccess = await getCompanyStateAccess(req);
    const query = { isActive: { $ne: false }, status: { $ne: "inactive" } };

    if (countryId) {
      query.country = countryId;
    } else if (country) {
      const countryRecord = await Country.findOne({ name: String(country).trim() });
      if (countryRecord) query.country = countryRecord._id;
    }

    if (companyStateAccess !== null) {
      query.name = { $in: companyStateAccess.names };
    }

    const states = await State.find(query).populate("country").sort({ name: 1 }).lean();
    res.json(states.map(serializeState));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load active states" });
  }
};

// @desc    Create a new LGA
// @route   POST /api/location/lga
// @access  Private/Super-Admin
export const createLGA = async (req, res) => {
  try {
    const { name, stateId } = req.body;
    const lgaName = String(name).trim();

    const state = await State.findById(stateId);
    if (!state) {
      return res.status(404).json({ message: "State not found" });
    }

    const isAuthorized = await ensureAuthorizedStateAccess(req, stateId, state.name);
    if (!isAuthorized) {
      return res.status(403).json({ message: "You are not authorized to create LGAs in this state." });
    }

    const existingLGA = await LGA.findOne({ name: lgaName, state: stateId });
    if (existingLGA) {
      return res.status(400).json({ message: "LGA already exists in this state" });
    }

    const slug = slugify(lgaName);
    const lgaId = buildLGAStableId(state.name, lgaName);
    const companyId = await getCompanyIdFromRequest(req);

    const lga = await LGA.create({
      name: lgaName,
      id: lgaId,
      lgaId,
      slug,
      state: stateId,
      status: "active",
      isActive: true,
      companyId
    });

    res.status(201).json({
      message: "LGA created successfully",
      lga
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new Ward
// @route   POST /api/location/ward
// @access  Private/Super-Admin
export const createWard = async (req, res) => {
  try {
    const { name, lgaId, aliases = [], coordinates = null, latitude = null, longitude = null, isUrban = true } = req.body;
    const normalizedName = String(name).trim();

    const lga = await LGA.findById(lgaId).populate('state');
    if (!lga) {
      return res.status(404).json({ message: "LGA not found" });
    }

    const state = lga.state;
    if (!state) {
      return res.status(400).json({ message: "LGA does not have a state reference" });
    }

    const isAuthorized = await ensureAuthorizedStateAccess(req, state._id, state.name);
    if (!isAuthorized) {
      return res.status(403).json({ message: "You are not authorized to create wards in this state." });
    }

    const existingWard = await Ward.findOne({ name: normalizedName, lga: lga._id });
    if (existingWard) {
      return res.status(400).json({ message: "Ward already exists in this LGA" });
    }

    const baseSlug = buildAreaSlug(normalizedName);
    let slug = baseSlug;
    let suffix = 1;
    while (await Ward.findOne({ lga: lga._id, slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const areaId = buildAreaStableId(state.name, lga.name, normalizedName);
    const companyId = await getCompanyIdFromRequest(req);

    const ward = await Ward.create({
      id: areaId,
      name: normalizedName,
      wardName: normalizedName,
      areaId,
      slug,
      lga: lga._id,
      lgaId: lga.lgaId || buildLGAStableId(state.name, lga.name),
      lgaName: lga.name,
      state: state._id,
      country: state.countryName || "Nigeria",
      aliases: Array.isArray(aliases) ? aliases.map(a => String(a).trim()).filter(Boolean) : [],
      latitude,
      longitude,
      coordinates,
      isUrban,
      status: "active",
      feederIds: [],
      companyId
    });

    res.status(201).json({
      message: "Ward created successfully",
      ward
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new Feeder
// @route   POST /api/location/feeder
// @access  Private/Admin
export const createFeeder = async (req, res) => {
  try {
    const { name, wardId, wardIds } = req.body;
    
    // De-duplicate incoming ward IDs
    const targetWardIds = [...new Set(wardIds || (wardId ? [wardId] : []))];
    
    if (targetWardIds.length === 0) {
        return res.status(400).json({ message: "At least one Ward ID is required" });
    }

    const companyId = await getCompanyIdFromRequest(req);
    // Build query with tenant filter if needed
    const existingQuery = { 
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        ...(companyId ? { companyId } : {})
    };

    // Check for existing feeder name (case-insensitive and trimmed)
    let feeder = await Feeder.findOne(existingQuery);
    
    if (feeder && feeder.isActive !== false) {
        return res.status(400).json({ message: "Feeder with this name already exists and is active" });
    }

    // Prevent duplicate wards across active feeders (within same tenant)
    const query = { isActive: { $ne: false }, wards: { $in: targetWardIds }, ...(companyId ? { companyId } : {}) };
    if (feeder) query._id = { $ne: feeder._id };

    const existingAssignments = await Feeder.find(query).populate('wards');

    if (existingAssignments.length > 0) {
        const duplicateWards = existingAssignments.flatMap(f => 
            f.wards.filter(w => targetWardIds.includes(w._id.toString()))
        );
        const duplicateWardNames = [...new Set(duplicateWards.map(w => w.name))].join(', ');
        
        return res.status(400).json({ 
            message: `The following wards are already assigned to a feeder: ${duplicateWardNames}` 
        });
    }

    if (feeder) {
        // Reactivate and update
        feeder.isActive = true;
        feeder.wards = targetWardIds;
        feeder.companyId = companyId;
        await feeder.save();
        return res.json({ message: "Feeder reactivated successfully", feeder });
    }

    feeder = await Feeder.create({ name, wards: targetWardIds, companyId });
    res.status(201).json({
      message: "Feeder created successfully",
      feeder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get LGAs (optionally filtered by state)
// @route   GET /api/location/lgas
// @access  Public
export const getLGAs = async (req, res) => {
  try {
    const { stateId } = req.query;
    const companyStateAccess = await getCompanyStateAccess(req);
    const tenantQuery = companyStateAccess && companyStateAccess.names.length > 0 ? {} : await buildTenantQuery(req);
    const query = { isActive: { $ne: false }, ...tenantQuery };

    if (companyStateAccess && companyStateAccess.names.length > 0) {
      const stateIds = companyStateAccess.ids;
      query.state = { $in: stateIds };
    }

    if (stateId) {
      query.state = stateId;
      if (companyStateAccess && companyStateAccess.names.length > 0) {
        const stateDoc = await State.findById(stateId).select("name");
        if (!stateDoc || !isStateAllowedForUser(req.user, stateDoc.name, companyStateAccess.names)) {
          return res.status(403).json({ message: "You are not authorized to view LGAs in this state." });
        }
      }
    }
    
    const lgas = await LGA.find(query).populate("state").sort({ name: 1 });
    res.json(lgas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Wards (optionally filtered by LGA)
// @route   GET /api/location/wards
// @access  Public
export const getWards = async (req, res) => {
  try {
    const { lgaId, lgaIds, q } = req.query;
    const tenantQuery = await buildTenantQuery(req);
    const query = { isActive: { $ne: false }, ...tenantQuery };
    
    if (lgaId) {
      query.lga = lgaId;
    } else if (lgaIds) {
      // Support multiple LGAs: ?lgaIds=id1,id2,id3
      const ids = lgaIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        query.lga = { $in: ids };
      }
    }

    if (q && String(q).trim().length > 0) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [
        { name: regex },
        { wardName: regex },
        { slug: regex },
        { areaId: regex },
        { aliases: regex }
      ];
    }
    
    const wards = await Ward.find(query)
      .populate({
        path: 'lga',
        populate: { path: 'state' }
      })
      .sort({ name: 1 });
    
    // Fetch coordinates from Coordinates collection matching communityIds (ward.id)
    // CRITICAL: Apply tenant filtering to prevent cross-tenant data leakage
    const communityIds = wards.map(w => w.id).filter(Boolean);
    const coordsFilter = { communityId: { $in: communityIds } };
    
    // Only filter by companyId if user is not platform owner
    if (req.user?.role !== 'platform-owner') {
      if (req.user?.companyId) {
        coordsFilter.companyId = req.user.companyId;
      } else {
        coordsFilter.companyId = null;
      }
    }
    
    const coordsList = await Coordinates.find(coordsFilter);
    
    // Map of communityId -> Coordinate document
    const coordsMap = new Map();
    for (const c of coordsList) {
      coordsMap.set(c.communityId, c);
    }
    
    // Map wards to overlay coordinates from the Coordinates collection
    const wardsWithCoords = wards.map(w => {
      const coord = coordsMap.get(w.id);
      const wardObj = w.toObject();
      if (coord) {
        wardObj.latitude = coord.latitude;
        wardObj.longitude = coord.longitude;
        wardObj.coordinates = {
          latitude: coord.latitude,
          longitude: coord.longitude
        };
      } else {
        // Explicitly set to null if not found in Coordinates collection
        wardObj.latitude = null;
        wardObj.longitude = null;
        wardObj.coordinates = null;
      }
      return wardObj;
    });

    res.json(wardsWithCoords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search locations with fuzzy matching across wards and LGAs
// @route   GET /api/location/search
// @access  Public
export const searchLocations = async (req, res) => {
  try {
    const { q, stateName = "Kano" } = req.query;
    if (!q || !String(q).trim()) {
      return res.status(400).json({ message: "Query parameter q is required" });
    }

    const state = await State.findOne({ name: stateName });
    if (!state) {
      return res.status(404).json({ message: `State '${stateName}' not found` });
    }

    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [wards, lgas] = await Promise.all([
      Ward.find({
        isActive: { $ne: false },
        state: state._id,
        $or: [
          { name: regex },
          { wardName: regex },
          { slug: regex },
          { areaId: regex },
          { aliases: regex }
        ]
      }).populate('lga').limit(50),
      LGA.find({
        state: state._id,
        isActive: { $ne: false },
        $or: [
          { name: regex },
          { slug: regex },
          { lgaId: regex }
        ]
      }).limit(20)
    ]);

    res.json({
      query: q,
      wards,
      lgas
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeeders = async (req, res) => {
  try {
    const isAuthorized = req.user && ["super-admin", "admin", "platform-owner", "company-super-admin"].includes(req.user.role);
    const tenantQuery = await buildTenantQuery(req);
    const query = Feeder.find({ isActive: { $ne: false }, ...tenantQuery });
    if (isAuthorized) {
      query.select("+injectionSubstation");
    }
    const feeders = await query
      .populate({
        path: 'wards',
        populate: {
          path: 'lga',
          populate: { path: 'state' }
        }
      })
      .sort({ name: 1 });
    res.json(feeders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all locations hierarchy (Legacy/Legacy Bulk)
// @route   GET /api/location/all
// @access  Public
export const getAllLocations = async (req, res) => {
  try {
    const companyStateAccess = await getCompanyStateAccess(req);
    const tenantQuery = companyStateAccess && companyStateAccess.names.length > 0 ? {} : await buildTenantQuery(req);
    const isPlatformOwner = !req.user || req.user.role === "platform-owner";

    // Determine state filter based on companyStateAccess
    let stateFilter = {};
    let lgaStateFilter = {};
    if (!isPlatformOwner) {
      if (companyStateAccess && companyStateAccess.names && companyStateAccess.names.length > 0) {
        stateFilter = { name: { $in: companyStateAccess.names } };
        if (companyStateAccess.ids && companyStateAccess.ids.length > 0) {
          lgaStateFilter = { state: { $in: companyStateAccess.ids } };
        } else {
          // Find matching state IDs by name
          const matchedStates = await State.find({ name: { $in: companyStateAccess.names } }).select("_id").lean();
          const matchedIds = matchedStates.map(s => s._id);
          lgaStateFilter = { state: { $in: matchedIds } };
        }
      } else {
        // Non-platform-owner user with no coverage states assigned gets empty set
        stateFilter = { _id: null };
        lgaStateFilter = { state: null };
      }
    }

    const [countries, states, lgas, wards, feeders] = await Promise.all([
      Country.find({ isActive: { $ne: false }, status: { $ne: "inactive" } }).sort({ name: 1 }).select("-__v").lean(),
      State.find({ isActive: { $ne: false }, ...tenantQuery, ...stateFilter }).sort({ name: 1 }).select("-__v").lean(),
      LGA.find({ isActive: { $ne: false }, ...tenantQuery, ...lgaStateFilter }).populate({ path: "state", select: "-__v" }).sort({ name: 1 }).select("-__v").lean(),
      Ward.find({ isActive: { $ne: false }, ...tenantQuery, ...lgaStateFilter }).populate({
          path: 'lga',
          populate: { path: 'state', select: "-__v" },
          select: "-__v"
      }).sort({ name: 1 }).select("-__v").lean(),
      Feeder.find({ isActive: { $ne: false }, ...tenantQuery }).populate({
          path: 'wards',
          populate: {
              path: 'lga',
              populate: { path: 'state', select: "-__v" },
              select: "-__v"
          },
          select: "-__v"
      }).sort({ name: 1 }).select("-__v").lean()
    ]);

    res.json({
      countries: countries.filter(c => c.isActive !== false),
      states: states.filter(s => s.isActive !== false),
      lgas: lgas.filter(l => l.isActive !== false && l.state && l.state.isActive !== false),
      wards: wards.filter(w => w.isActive !== false && w.lga && w.lga.isActive !== false && w.lga.state && w.lga.state.isActive !== false),
      feeders: feeders.filter(f => f.isActive !== false)
    });
  } catch (error) {
    console.error("[LocationController] getAllLocations Error:", error);
    res.status(500).json({ message: "Error fetching location hierarchy", error: error.message });
  }
};

// @desc    Delete a Country
// @route   DELETE /api/location/countries/:id
// @access  Private/Platform-Owner
export const deleteCountry = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "Country management is restricted exclusively to the Platform Owner" });
    }
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).json({ message: "Country not found" });

    // Check if active states belong to this country
    const linkedStates = await State.countDocuments({ country: req.params.id, isActive: { $ne: false }, status: { $ne: "inactive" } });
    if (linkedStates > 0) {
      return res.status(400).json({ message: `Cannot delete country '${country.name}' because it contains ${linkedStates} active state(s). Please delete states first.` });
    }

    country.isActive = false;
    country.status = "inactive";
    await country.save();
    res.json({ message: "Country removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete country" });
  }
};

// @desc    Delete a State
// @route   DELETE /api/location/state/:id
// @access  Private/Super-Admin
export const deleteState = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "State management is restricted exclusively to the Platform Owner" });
    }
    const state = await State.findById(req.params.id);
    if (!state) return res.status(404).json({ message: "State not found" });

    // Check if LGAs are linked to this state
    const linkedLGAs = await LGA.countDocuments({ state: req.params.id });
    if (linkedLGAs > 0) {
      return res.status(400).json({ message: "Cannot delete state with linked LGAs" });
    }

    state.isActive = false;
    await state.save();
    res.json({ message: "State removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an LGA
// @route   DELETE /api/location/lga/:id
// @access  Private/Super-Admin
export const deleteLGA = async (req, res) => {
  try {
    const lga = await LGA.findById(req.params.id);
    if (!lga) return res.status(404).json({ message: "LGA not found" });

    // Check if Wards are linked to this LGA
    const linkedWards = await Ward.countDocuments({ lga: req.params.id });
    if (linkedWards > 0) {
      return res.status(400).json({ message: "Cannot delete LGA with linked Wards" });
    }

    lga.isActive = false;
    await lga.save();
    res.json({ message: "LGA removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a Ward
// @route   DELETE /api/location/ward/:id
// @access  Private/Super-Admin
export const deleteWard = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ message: "Ward not found" });

    // Check if Feeders are linked to this Ward
    const linkedFeeders = await Feeder.countDocuments({ wards: req.params.id });

    if (linkedFeeders > 0) {
      return res.status(400).json({ message: "Cannot delete ward with linked Feeders" });
    }

    ward.isActive = false;
    await ward.save();
    res.json({ message: "Ward removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a Feeder
// @route   DELETE /api/location/feeder/:id
// @access  Private/Super-Admin
export const deleteFeeder = async (req, res) => {
  try {
    const feeder = await Feeder.findById(req.params.id);
    if (!feeder) return res.status(404).json({ message: "Feeder not found" });

    // Check if admins are assigned to this feeder
    const User = mongoose.model("User");
    const assignedAdmins = await User.countDocuments({ assignedFeeders: req.params.id });
    if (assignedAdmins > 0) {
      return res.status(400).json({ message: "Cannot delete feeder with assigned administrators" });
    }

    feeder.isActive = false;
    await feeder.save();
    res.json({ message: "Feeder removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Create a new Injection Substation
// @route   POST /api/location/injection-substation
// @access  Private/Super-Admin
export const createInjectionSubstation = async (req, res) => {
  try {
    const { name, code, description, status, latitude, longitude } = req.body;
    const normalizedName = String(name).trim();

    if (!normalizedName) {
      return res.status(400).json({ message: "Name is required" });
    }

    const companyId = await getCompanyIdFromRequest(req);
    const existingQuery = { 
        name: normalizedName,
        ...(companyId ? { companyId } : {})
    };
    const existingSubstation = await InjectionSubstation.findOne(existingQuery);
    if (existingSubstation) {
      return res.status(400).json({ message: "Injection Substation with this name already exists" });
    }

    const slug = slugify(normalizedName);

    const substation = await InjectionSubstation.create({
      name: normalizedName,
      slug,
      code: code ? String(code).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      status: status || "active",
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      companyId
    });

    res.status(201).json({
      message: "Injection Substation created successfully",
      injectionSubstation: substation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Injection Substations
// @route   GET /api/location/injection-substations
// @access  Public
export const getInjectionSubstations = async (req, res) => {
  try {
    const tenantQuery = await buildTenantQuery(req);
    const substations = await InjectionSubstation.find({ status: { $ne: "inactive" }, ...tenantQuery }).sort({ name: 1 });
    res.json(substations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an Injection Substation
// @route   PUT /api/location/injection-substation/:id
// @access  Private/Super-Admin
export const updateInjectionSubstation = async (req, res) => {
  try {
    const { name, code, description, status, latitude, longitude } = req.body;
    const substation = await InjectionSubstation.findById(req.params.id);
    if (!substation) return res.status(404).json({ message: "Injection Substation not found" });

    if (name) {
      const normalizedName = String(name).trim();
      const existingSubstation = await InjectionSubstation.findOne({ 
        _id: { $ne: req.params.id }, 
        name: normalizedName 
      });
      if (existingSubstation) {
        return res.status(400).json({ message: "Another Injection Substation with this name already exists" });
      }
      substation.name = normalizedName;
      substation.slug = slugify(normalizedName);
    }

    if (code !== undefined) substation.code = code ? String(code).trim() : undefined;
    if (description !== undefined) substation.description = description ? String(description).trim() : undefined;
    if (status !== undefined) substation.status = status;
    if (latitude !== undefined) substation.latitude = latitude ? Number(latitude) : undefined;
    if (longitude !== undefined) substation.longitude = longitude ? Number(longitude) : undefined;

    await substation.save();
    res.json({
      message: "Injection Substation updated successfully",
      injectionSubstation: substation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an Injection Substation
// @route   DELETE /api/location/injection-substation/:id
// @access  Private/Super-Admin
export const deleteInjectionSubstation = async (req, res) => {
  try {
    const substation = await InjectionSubstation.findById(req.params.id);
    if (!substation) return res.status(404).json({ message: "Injection Substation not found" });

    // Check if feeders are linked to this substation
    const linkedFeeders = await Feeder.countDocuments({ injectionSubstationId: req.params.id, isActive: { $ne: false } });
    if (linkedFeeders > 0) {
      return res.status(400).json({ message: "Cannot delete Injection Substation with linked feeders" });
    }

    substation.status = "inactive";
    await substation.save();
    res.json({ message: "Injection Substation removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a Feeder (Add/Remove Wards, rename)
// @route   PUT /api/location/feeder/:id
// @access  Private/Super-Admin
export const updateFeeder = async (req, res) => {
  try {
    const { name, wardIds, removeWardId, injectionSubstationId } = req.body;
    const feeder = await Feeder.findById(req.params.id);
    if (!feeder) return res.status(404).json({ message: "Feeder not found" });

    if (injectionSubstationId !== undefined) {
      feeder.injectionSubstationId = injectionSubstationId || null;
    }

    if (name) {
      // Check if another feeder with this name exists
      const existingFeeder = await Feeder.findOne({ 
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") } 
      });
      if (existingFeeder) {
        return res.status(400).json({ message: "Another feeder with this name already exists" });
      }
      feeder.name = name.trim();
    }

    // Add/Merge wards
    if (wardIds && Array.isArray(wardIds)) {
        // De-duplicate incoming ward IDs
        const newWardIds = [...new Set(wardIds)];

        // Automatically remove these wards from any other feeders first
        await Feeder.updateMany(
          { _id: { $ne: feeder._id }, isActive: { $ne: false } },
          { $pull: { wards: { $in: newWardIds } } }
        );

        const existingWardIds = feeder.wards.map(w => w.toString());
        feeder.wards = [...new Set([...existingWardIds, ...newWardIds])];
    }

    // Remove specific ward
    if (removeWardId) {
        feeder.wards = feeder.wards.filter(w => w.toString() !== removeWardId);
    }

    if (!name && (!wardIds || wardIds.length === 0) && !removeWardId) {
        return res.status(400).json({ message: "No changes provided or no wards selected" });
    }

    await feeder.save();
    
    // Populating for consistent return
    const updatedFeeder = await Feeder.findById(feeder._id).populate({
        path: 'wards',
        populate: {
            path: 'lga',
            populate: { path: 'state' }
        }
    });

    res.json({
      message: "Feeder updated successfully",
      feeder: updatedFeeder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
