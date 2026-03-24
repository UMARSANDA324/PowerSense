import mongoose from "mongoose";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";

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
    const lga = await LGA.create({ name, state: stateId });
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
    const { name, lgaId } = req.body;
    const ward = await Ward.create({ name, lga: lgaId });
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
    
    const targetWardIds = wardIds || (wardId ? [wardId] : []);
    
    if (targetWardIds.length === 0) {
        return res.status(400).json({ message: "At least one Ward ID is required" });
    }

    // Check for existing feeder name (case-insensitive and trimmed)
    let feeder = await Feeder.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") } 
    });
    
    if (feeder) {
        if (feeder.isActive !== false) {
            return res.status(400).json({ message: "Feeder with this name already exists and is active" });
        }
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
// @desc    Get all locations hierarchy
// @route   GET /api/location/all
// @access  Public
export const getAllLocations = async (req, res) => {
  try {
    const states = await State.find({ isActive: { $ne: false } });
    const lgas = await LGA.find({ isActive: { $ne: false } }).populate("state");
    const wards = await Ward.find({ isActive: { $ne: false } }).populate({
        path: 'lga',
        populate: { path: 'state' }
    });
    const feeders = await Feeder.find({ isActive: { $ne: false } }).populate({
        path: 'wards',
        populate: {
            path: 'lga',
            populate: { path: 'state' }
        }
    });

    res.json({
      states: states.filter(s => s.isActive !== false),
      lgas: lgas.filter(l => l.isActive !== false && (!l.state || l.state.isActive !== false)),
      wards: wards.filter(w => w.isActive !== false && (!w.lga || w.lga.isActive !== false)),
      feeders: feeders.filter(f => f.isActive !== false)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
