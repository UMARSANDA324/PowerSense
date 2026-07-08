import mongoose from "mongoose";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import Coordinates from "../models/Location/Coordinates.js";
import { buildAreaSlug, buildAreaStableId, buildLGAStableId, slugify } from "../utils/slugGenerator.js";

// @desc    Create a new State
// @route   POST /api/location/state
// @access  Private/Super-Admin
export const createState = async (req, res) => {
  try {
    const { name } = req.body;
    const state = await State.create({ name });
    res.status(201).json({
      message: "State created successfully",
      state
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const existingLGA = await LGA.findOne({ name: lgaName, state: stateId });
    if (existingLGA) {
      return res.status(400).json({ message: "LGA already exists in this state" });
    }

    const slug = slugify(lgaName);
    const lgaId = buildLGAStableId(state.name, lgaName);

    const lga = await LGA.create({
      name: lgaName,
      lgaId,
      slug,
      state: stateId,
      status: "active",
      isActive: true
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

    const ward = await Ward.create({
      name: normalizedName,
      wardName: normalizedName,
      areaId,
      slug,
      lga: lga._id,
      lgaId: lga.lgaId || buildLGAStableId(state.name, lga.name),
      lgaName: lga.name,
      state: state._id,
      country: "Nigeria",
      aliases: Array.isArray(aliases) ? aliases.map(a => String(a).trim()).filter(Boolean) : [],
      latitude,
      longitude,
      coordinates,
      isUrban,
      status: "active",
      feederIds: []
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

    // Check for existing feeder name (case-insensitive and trimmed)
    let feeder = await Feeder.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") } 
    });
    
    if (feeder && feeder.isActive !== false) {
        return res.status(400).json({ message: "Feeder with this name already exists and is active" });
    }

    // Prevent duplicate wards across active feeders
    const query = { isActive: { $ne: false }, wards: { $in: targetWardIds } };
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
        await feeder.save();
        return res.json({ message: "Feeder reactivated successfully", feeder });
    }

    feeder = await Feeder.create({ name, wards: targetWardIds });
    res.status(201).json({
      message: "Feeder created successfully",
      feeder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all states
// @route   GET /api/location/states
// @access  Public
export const getStates = async (req, res) => {
  try {
    const states = await State.find({ isActive: { $ne: false } }).sort({ name: 1 });
    res.json(states);
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
    const query = { isActive: { $ne: false } };
    if (stateId) query.state = stateId;
    
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
    const query = { isActive: { $ne: false } };
    
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
    const communityIds = wards.map(w => w.id).filter(Boolean);
    const coordsList = await Coordinates.find({ communityId: { $in: communityIds } });
    
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
    const isAuthorized = req.user && ["super-admin", "admin"].includes(req.user.role);
    const query = Feeder.find({ isActive: { $ne: false } });
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
    const [states, lgas, wards, feeders] = await Promise.all([
      State.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      LGA.find({ isActive: { $ne: false } }).populate("state").sort({ name: 1 }).lean(),
      Ward.find({ isActive: { $ne: false } }).populate({
          path: 'lga',
          populate: { path: 'state' }
      }).sort({ name: 1 }).lean(),
      Feeder.find({ isActive: { $ne: false } }).populate({
          path: 'wards',
          populate: {
              path: 'lga',
              populate: { path: 'state' }
          }
      }).sort({ name: 1 }).lean()
    ]);

    res.json({
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

// @desc    Delete a State
// @route   DELETE /api/location/state/:id
// @access  Private/Super-Admin
export const deleteState = async (req, res) => {
  try {
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
// @desc    Update a Feeder (Add/Remove Wards, rename)
// @route   PUT /api/location/feeder/:id
// @access  Private/Super-Admin
export const updateFeeder = async (req, res) => {
  try {
    const { name, wardIds, removeWardId } = req.body;
    const feeder = await Feeder.findById(req.params.id);
    if (!feeder) return res.status(404).json({ message: "Feeder not found" });

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

        // Check for duplicates across other active feeders
        const existingAssignments = await Feeder.find({
            _id: { $ne: feeder._id },
            isActive: { $ne: false },
            wards: { $in: newWardIds }
        }).populate('wards');

        if (existingAssignments.length > 0) {
            const duplicateWards = existingAssignments.flatMap(f => 
                f.wards.filter(w => newWardIds.includes(w._id.toString()))
            );
            const duplicateWardNames = [...new Set(duplicateWards.map(w => w.name))].join(', ');
            
            return res.status(400).json({ 
                message: `The following wards are already assigned to another feeder: ${duplicateWardNames}` 
            });
        }

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
