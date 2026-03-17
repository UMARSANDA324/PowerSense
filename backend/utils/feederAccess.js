import mongoose from "mongoose";

/**
 * Check if an admin has access to a specific feeder
 * @param {Object} user - The authenticated user object
 * @param {String} feederName - The name of the feeder (as stored in reports)
 * @returns {Promise<boolean>} - True if user has access, false otherwise
 */
export const hasFeederAccess = async (user, feederName) => {
  // Super admin has access to all feeders
  if (user.role === "super-admin") {
    return true;
  }

  // Regular admin must have this feeder in their assignedFeeders
  if (user.role === "admin") {
    if (!user.assignedFeeders || user.assignedFeeders.length === 0) {
      return false;
    }

    const feeders = await mongoose.model("Feeder").find({
      _id: { $in: user.assignedFeeders },
      name: feederName
    });

    return feeders.length > 0;
  }

  // Regular users and others don't have admin access
  return false;
};

/**
 * Get all feeder names that a user has access to
 * @param {Object} user - The authenticated user object
 * @returns {Promise<Array>} - Array of feeder names
 */
export const getAccessibleFeeders = async (user) => {
  // Super admin has access to all feeders
  if (user.role === "super-admin") {
    const allFeeders = await mongoose.model("Feeder").find();
    return allFeeders.map(f => f.name);
  }

  // Regular admin gets only their assigned feeders
  if (user.role === "admin") {
    if (!user.assignedFeeders || user.assignedFeeders.length === 0) {
      return [];
    }

    const feeders = await mongoose.model("Feeder").find({
      _id: { $in: user.assignedFeeders }
    });

    return feeders.map(f => f.name);
  }

  // Regular users don't have admin access
  return [];
};

/**
 * Build a MongoDB query filter for feeder-based access control
 * @param {Object} user - The authenticated user object
 * @returns {Promise<Object>} - MongoDB query object
 */
export const getFeederQuery = async (user) => {
  // Super admin: no filter
  if (user.role === "super-admin") {
    return {};
  }

  // Regular admin: filter by assigned feeders
  if (user.role === "admin") {
    const feederNames = await getAccessibleFeeders(user);
    if (feederNames.length === 0) {
      return { feeder: { $in: [] } }; // No access
    }
    return { feeder: { $in: feederNames } };
  }

  // Regular users: no records
  return { _id: null };
};
