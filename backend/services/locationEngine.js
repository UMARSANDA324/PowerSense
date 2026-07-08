import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import State from "../models/Location/State.js";

const escapeRegex = (value) => {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Location Utility Service
 * Provides methods to work with the hierarchical location structure:
 * State → LGA → Ward → Feeder
 */

export class LocationEngine {
    /**
     * Get location hierarchy by LGA name
     * @param {string} lgaName - Name of the LGA
     * @param {string} stateName - Name of the state (default: "Kano")
     * @returns {object} Location hierarchy
     */
    static async getLocationByLGA(lgaName, stateName = "Kano") {
        try {
            const state = await State.findOne({ name: stateName });
            if (!state) throw new Error(`State '${stateName}' not found`);

            const lga = await LGA.findOne({ name: lgaName, state: state._id });
            if (!lga) throw new Error(`LGA '${lgaName}' not found in ${stateName}`);

            const wards = await Ward.find({ lga: lga._id, isActive: { $ne: false } });
            
            const feeders = await Feeder.find({
                wards: { $in: wards.map(w => w._id) },
                isActive: { $ne: false }
            }).populate('wards');

            return {
                state: { id: state._id, name: state.name },
                lga: { id: lga._id, name: lga.name },
                wards: wards.map(w => ({ id: w._id, name: w.name })),
                feeders: feeders.map(f => ({ id: f._id, name: f.name }))
            };
        } catch (error) {
            throw new Error(`Error getting location by LGA: ${error.message}`);
        }
    }

    /**
     * Get location hierarchy by Ward name
     * @param {string} wardName - Name of the ward
     * @returns {object} Location hierarchy
     */
    static async getLocationByWard(wardNameOrSlug) {
        try {
            const regex = new RegExp(`^${escapeRegex(wardNameOrSlug)}$`, 'i');
            const ward = await Ward.findOne({
                $or: [
                    { name: regex },
                    { slug: regex },
                    { areaId: regex },
                    { wardName: regex },
                    { aliases: { $elemMatch: regex } }
                ]
            }).populate({
                    path: 'lga',
                    populate: { path: 'state' }
                });

            if (!ward) throw new Error(`Ward '${wardNameOrSlug}' not found`);

            const feeders = await Feeder.find({
                wards: ward._id,
                isActive: { $ne: false }
            }).populate('wards');

            return {
                state: { id: ward.lga.state._id, name: ward.lga.state.name },
                lga: { id: ward.lga._id, name: ward.lga.name },
                ward: {
                    id: ward._id,
                    name: ward.name,
                    slug: ward.slug,
                    wardName: ward.wardName
                },
                feeders: feeders.map(f => ({ id: f._id, name: f.name }))
            };
        } catch (error) {
            throw new Error(`Error getting location by Ward: ${error.message}`);
        }
    }

    /**
     * Resolve ambiguous location reference
     * Tries to match against LGA, Ward, or Feeder
     * @param {string} locationName - Location name to resolve
     * @param {string} stateName - State context (default: "Kano")
     * @returns {object} Resolved location details
     */
    static async resolveLocation(locationName, stateName = "Kano") {
        try {
            // First, try to find as LGA
            const state = await State.findOne({ name: stateName });
            if (!state) throw new Error(`State '${stateName}' not found`);

            let lga = await LGA.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') },
                state: state._id
            });

            if (lga) {
                return {
                    type: "lga",
                    location: await this.getLocationByLGA(lga.name, stateName)
                };
            }

            // Try to find as Ward by name, slug, wardName, or alias
            let ward = await Ward.findOne({
                state: state._id,
                $or: [
                    { name: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') } },
                    { slug: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') } },
                    { areaId: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') } },
                    { wardName: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') } },
                    { aliases: { $elemMatch: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') } } }
                ]
            });

            if (ward) {
                return {
                    type: "ward",
                    location: await this.getLocationByWard(ward.name)
                };
            }

            // Try to find as Feeder
            let feeder = await Feeder.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(locationName)}$`, 'i') }
            });

            if (feeder) {
                return {
                    type: "feeder",
                    location: await this.getLocationByFeeder(feeder.name)
                };
            }

            return null; // Not found
        } catch (error) {
            throw new Error(`Error resolving location: ${error.message}`);
        }
    }

    /**
     * Validate if a location path is complete and correct
     * @param {string} state - State name
     * @param {string} lga - LGA name
     * @param {string} ward - Ward name (optional)
     * @returns {object} Validation result
     */
    static async validateLocation(state, lga, ward = null) {
        try {
            const feeder = await Feeder.findOne({ name: feederName, isActive: { $ne: false } })
                .populate({
                    path: 'wards',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                });

            if (!feeder) throw new Error(`Feeder '${feederName}' not found`);

            // Get primary ward (first one)
            const primaryWard = feeder.wards[0];
            if (!primaryWard) throw new Error(`No wards assigned to feeder '${feederName}'`);

            return {
                state: { id: primaryWard.lga.state._id, name: primaryWard.lga.state.name },
                lga: { id: primaryWard.lga._id, name: primaryWard.lga.name },
                wards: feeder.wards.map(w => ({ id: w._id, name: w.name })),
                feeder: { id: feeder._id, name: feeder.name }
            };
        } catch (error) {
            throw new Error(`Error getting location by Feeder: ${error.message}`);
        }
    }

    /**
     * Find all LGAs in a state
     * @param {string} stateName - Name of the state
     * @returns {array} Array of LGAs
     */
    static async getLGAsByState(stateName = "Kano") {
        try {
            const state = await State.findOne({ name: stateName });
            if (!state) throw new Error(`State '${stateName}' not found`);

            const lgas = await LGA.find({
                state: state._id,
                isActive: { $ne: false }
            }).sort({ name: 1 });

            return lgas.map(l => ({ id: l._id, name: l.name }));
        } catch (error) {
            throw new Error(`Error getting LGAs: ${error.message}`);
        }
    }

    /**
     * Find all wards in an LGA
     * @param {string} lgaName - Name of the LGA
     * @param {string} stateName - Name of the state (default: "Kano")
     * @returns {array} Array of wards
     */
    static async getWardsByLGA(lgaName, stateName = "Kano") {
        try {
            const state = await State.findOne({ name: stateName });
            if (!state) throw new Error(`State '${stateName}' not found`);

            const lga = await LGA.findOne({ name: lgaName, state: state._id });
            if (!lga) throw new Error(`LGA '${lgaName}' not found`);

            const wards = await Ward.find({
                lga: lga._id,
                isActive: { $ne: false }
            }).sort({ name: 1 });

            return wards.map(w => ({ id: w._id, name: w.name }));
        } catch (error) {
            throw new Error(`Error getting wards: ${error.message}`);
        }
    }

    /**
     * Find all feeders serving specific wards
     * @param {array} wardIds - Array of ward IDs
     * @returns {array} Array of feeders
     */
    static async getFeedersByWards(wardIds = []) {
        try {
            const feeders = await Feeder.find({
                wards: { $in: wardIds },
                isActive: { $ne: false }
            }).sort({ name: 1 });

            return feeders.map(f => ({ id: f._id, name: f.name }));
        } catch (error) {
            throw new Error(`Error getting feeders: ${error.message}`);
        }
    }

    /**
     * Resolve ambiguous location reference
     * Tries to match against LGA, Ward, or Feeder
     * @param {string} locationName - Location name to resolve
     * @param {string} stateName - State context (default: "Kano")
     * @returns {object} Resolved location details
     */
    static async resolveLocation(locationName, stateName = "Kano") {
        try {
            // First, try to find as LGA
            const state = await State.findOne({ name: stateName });
            if (!state) throw new Error(`State '${stateName}' not found`);

            let lga = await LGA.findOne({
                name: { $regex: new RegExp(`^${locationName}$`, 'i') },
                state: state._id
            });

            if (lga) {
                return {
                    type: "lga",
                    location: await this.getLocationByLGA(lga.name, stateName)
                };
            }

            // Try to find as Ward
            let ward = await Ward.findOne({
                name: { $regex: new RegExp(`^${locationName}$`, 'i') }
            });

            if (ward) {
                return {
                    type: "ward",
                    location: await this.getLocationByWard(ward.name)
                };
            }

            // Try to find as Feeder
            let feeder = await Feeder.findOne({
                name: { $regex: new RegExp(`^${locationName}$`, 'i') }
            });

            if (feeder) {
                return {
                    type: "feeder",
                    location: await this.getLocationByFeeder(feeder.name)
                };
            }

            return null; // Not found
        } catch (error) {
            throw new Error(`Error resolving location: ${error.message}`);
        }
    }

    /**
     * Validate if a location path is complete and correct
     * @param {string} state - State name
     * @param {string} lga - LGA name
     * @param {string} ward - Ward name (optional)
     * @returns {object} Validation result
     */
    static async validateLocation(state, lga, ward = null) {
        try {
            const result = {
                isValid: false,
                errors: [],
                hierarchy: {}
            };

            // Validate state
            const stateDoc = await State.findOne({ name: state });
            if (!stateDoc) {
                result.errors.push(`State '${state}' not found`);
                return result;
            }
            result.hierarchy.state = { id: stateDoc._id, name: stateDoc.name };

            // Validate LGA
            const lgaDoc = await LGA.findOne({ name: lga, state: stateDoc._id });
            if (!lgaDoc) {
                result.errors.push(`LGA '${lga}' not found in ${state}`);
                return result;
            }
            result.hierarchy.lga = { id: lgaDoc._id, name: lgaDoc.name };

            // Validate Ward if provided
            if (ward) {
                const wardDoc = await Ward.findOne({ name: ward, lga: lgaDoc._id });
                if (!wardDoc) {
                    result.errors.push(`Ward '${ward}' not found in ${lga}`);
                    return result;
                }
                result.hierarchy.ward = { id: wardDoc._id, name: wardDoc.name };
            }

            result.isValid = true;
            return result;
        } catch (error) {
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                hierarchy: {}
            };
        }
    }
}

export default LocationEngine;
