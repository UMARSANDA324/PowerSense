import mongoose from "mongoose";
import Country from "./Country.js";

const stateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Country",
        required: true,
        index: true
    },
    countryName: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null,
        index: true
    }
}, { timestamps: true });

const normalizeCountryName = (value) => String(value || "").trim();
const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["active", "inactive", "archived"].includes(normalized)) return normalized;
  return "active";
};

const serializeCountry = (country) => {
  if (!country) return null;
  return {
    ...country.toObject ? country.toObject() : country,
    status: country.status || (country.isActive === false ? "inactive" : "active"),
    isActive: country.isActive !== false,
    code: country.code || country.countryCode || ""
  };
};

const serializeState = (state) => {
  if (!state) return null;
  const payload = state.toObject ? state.toObject() : state;
  return {
    ...payload,
    status: payload.status || (payload.isActive === false ? "inactive" : "active"),
    isActive: payload.isActive !== false,
    countryName: payload.countryName || (payload.country && typeof payload.country === "object" ? payload.country.name : "")
  };
};

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
    const cleanedName = normalizeCountryName(name);
    const cleanedCode = String(code || cleanedName).trim().toUpperCase();

    if (!cleanedName) {
      return res.status(400).json({ message: "Country name is required" });
    }

    if (!cleanedCode) {
      return res.status(400).json({ message: "Country code is required" });
    }

    const existing = await Country.findOne({ $or: [{ name: cleanedName }, { code: cleanedCode }] });
    if (existing) {
      return res.status(400).json({ message: "Country with this name or code already exists" });
    }

    const country = await Country.create({
      name: cleanedName,
      code: cleanedCode,
      isoCode: String(isoCode || "").trim().toUpperCase() || undefined,
      status: normalizeStatus(isActive === false ? "inactive" : "active"),
      isActive: isActive !== false,
      isDefault: false,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
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

    const { id } = req.params;
    const { name, code, isoCode, isActive, status } = req.body;
    const country = await Country.findById(id);
    if (!country) return res.status(404).json({ message: "Country not found" });

    if (name) country.name = normalizeCountryName(name);
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

    const { id } = req.params;
    const { active } = req.body;
    const country = await Country.findById(id);
    if (!country) return res.status(404).json({ message: "Country not found" });

    const nextActive = active !== undefined ? Boolean(active) : !country.isActive;
    country.isActive = nextActive;
    country.status = nextActive ? "active" : "inactive";
    country.updatedBy = req.user?._id || null;
    await country.save();

    res.json({ message: `Country ${nextActive ? "activated" : "deactivated"} successfully`, country: serializeCountry(country) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to change country status" });
  }
};

// @desc    Create a new State
// @route   POST /api/location/state
// @access  Private/Super-Admin
export const createState = async (req, res) => {
  try {
    if (req.user?.role !== "platform-owner") {
      return res.status(403).json({ message: "State management is restricted exclusively to the Platform Owner" });
    }

    const { name, countryId, country, isActive = true } = req.body;
    const cleanedName = String(name || "").trim();
    if (!cleanedName) return res.status(400).json({ message: "State name is required" });

    const selectedCountryId = countryId || (typeof country === "string" ? country : "");
    const countryRecord = selectedCountryId ? await Country.findById(selectedCountryId) : await Country.findOne({ name: normalizeCountryName(country || "") || { $exists: true } });

    if (!countryRecord && selectedCountryId) {
      return res.status(404).json({ message: "Country not found" });
    }

    const fallbackCountry = countryRecord || await Country.findOne({ isActive: { $ne: false } }).sort({ name: 1 });
    if (!fallbackCountry) {
      return res.status(400).json({ message: "No active country exists. Create a country before adding a state." });
    }

    const existingState = await State.findOne({ country: fallbackCountry._id, name: cleanedName });
    if (existingState) {
      return res.status(400).json({ message: "State already exists in this country" });
    }

    const state = await State.create({
      name: cleanedName,
      country: fallbackCountry._id,
      countryName: fallbackCountry.name,
      status: normalizeStatus(isActive === false ? "inactive" : "active"),
      isActive: isActive !== false,
      companyId: null
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

    const { active } = req.body;
    const nextActive = active !== undefined ? Boolean(active) : !state.isActive;
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

    if (countryId) {
      query.country = countryId;
    } else if (country) {
      const countryRecord = await Country.findOne({ name: String(country).trim() });
      if (countryRecord) query.country = countryRecord._id;
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
    const query = { isActive: { $ne: false }, status: { $ne: "inactive" } };

    if (countryId) {
      query.country = countryId;
    } else if (country) {
      const countryRecord = await Country.findOne({ name: String(country).trim() });
      if (countryRecord) query.country = countryRecord._id;
    }

    const states = await State.find(query).populate("country").sort({ name: 1 }).lean();
    res.json(states.map(serializeState));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load active states" });
  }
};

const State = mongoose.model("State", stateSchema, "states");

export default State;