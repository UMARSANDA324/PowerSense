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
    const { name, wardId } = req.body;
    const feeder = await Feeder.create({ name, ward: wardId });
    res.status(201).json({
      message: "Feeder created successfully",
      feeder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
