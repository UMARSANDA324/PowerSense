import Coordinates from "../models/Location/Coordinates.js";

/**
 * Validates if latitude and longitude are valid coordinates.
 * @param {number|string} latitude 
 * @param {number|string} longitude 
 * @returns {boolean}
 */
export const validateCoordinate = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  return !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Creates a new Coordinates document.
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const createCoordinate = async (data) => {
  if (!validateCoordinate(data.latitude, data.longitude)) {
    throw new Error(`Invalid coordinates: lat=${data.latitude}, lng=${data.longitude}`);
  }
  const coordinate = new Coordinates({
    ...data,
    lastUpdated: new Date()
  });
  return await coordinate.save();
};

/**
 * Updates a Coordinates document by communityId.
 * @param {string} communityId 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const updateCoordinate = async (communityId, data) => {
  if (data.latitude !== undefined && data.longitude !== undefined) {
    if (!validateCoordinate(data.latitude, data.longitude)) {
      throw new Error(`Invalid coordinates: lat=${data.latitude}, lng=${data.longitude}`);
    }
  }
  
  return await Coordinates.findOneAndUpdate(
    { communityId },
    { 
      ...data, 
      lastUpdated: new Date() 
    },
    { returnDocument: 'after', runValidators: true, upsert: true }
  );
};

/**
 * Retrieves a coordinate by its _id.
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
export const getCoordinate = async (id) => {
  return await Coordinates.findById(id);
};

/**
 * Retrieves a coordinate by communityId.
 * @param {string} communityId 
 * @returns {Promise<Object|null>}
 */
export const getCoordinateByCommunity = async (communityId) => {
  return await Coordinates.findOne({ communityId });
};

/**
 * Performs a bulk insert of coordinates.
 * @param {Array<Object>} coordinatesArray 
 * @returns {Promise<Object>}
 */
export const bulkInsertCoordinates = async (coordinatesArray) => {
  // Validate each coordinate in the array
  for (const item of coordinatesArray) {
    if (!validateCoordinate(item.latitude, item.longitude)) {
      throw new Error(`Invalid coordinate in bulk input: communityId=${item.communityId}, lat=${item.latitude}, lng=${item.longitude}`);
    }
    item.lastUpdated = item.lastUpdated || new Date();
  }

  // Use bulkWrite for efficient insert or update (upsert)
  const operations = coordinatesArray.map(item => ({
    updateOne: {
      filter: { communityId: item.communityId },
      update: { $set: item },
      upsert: true
    }
  }));

  return await Coordinates.bulkWrite(operations);
};
