import mongoose from "mongoose";

/**
 * Checks if a value is a valid 24-character hex MongoDB ObjectId string or ObjectId instance
 * @param {any} val
 * @returns {boolean}
 */
export function isValidObjectId(val) {
  if (!val) return false;
  if (val instanceof mongoose.Types.ObjectId) return true;
  if (typeof val === "object" && val._id) return isValidObjectId(val._id);
  if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim())) return true;
  return false;
}

/**
 * Safely converts a valid value to a Mongoose ObjectId instance, or returns null if invalid
 * @param {any} val
 * @returns {mongoose.Types.ObjectId|null}
 */
export function toObjectId(val) {
  if (!val) return null;
  if (val instanceof mongoose.Types.ObjectId) return val;
  if (typeof val === "object" && val._id) return toObjectId(val._id);
  if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim())) {
    return new mongoose.Types.ObjectId(val.trim());
  }
  return null;
}

/**
 * Parses any resource reference (ObjectId, populated doc, or raw name string)
 * @param {any} val
 * @returns {{ isObjectId: boolean, id: mongoose.Types.ObjectId|null, name: string|null }}
 */
export function parseResourceRef(val) {
  if (!val) {
    return { isObjectId: false, id: null, name: null };
  }

  if (val instanceof mongoose.Types.ObjectId) {
    return { isObjectId: true, id: val, name: null };
  }

  if (typeof val === "object") {
    const objId = val._id && isValidObjectId(val._id) ? toObjectId(val._id) : null;
    const nameStr = val.name || val.wardName || val.feederName || val.substationName || null;
    return {
      isObjectId: Boolean(objId),
      id: objId,
      name: nameStr ? String(nameStr).trim() : null
    };
  }

  const strVal = String(val).trim();
  if (!strVal) {
    return { isObjectId: false, id: null, name: null };
  }

  if (/^[0-9a-fA-F]{24}$/.test(strVal)) {
    return { isObjectId: true, id: new mongoose.Types.ObjectId(strVal), name: null };
  }

  return { isObjectId: false, id: null, name: strVal };
}
