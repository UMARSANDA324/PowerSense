import crypto from "crypto";
import User from "../models/UserModel.js";

// Ambiguity-free character set (no 0/O/1/I/L)
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_RETRIES = 10;

/**
 * Generate a cryptographically random referral code.
 * @returns {string} 8-character alphanumeric code
 */
function generateRandomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/**
 * Generate a unique referral code for a user.
 * If the user already has a code, returns the existing one.
 * 
 * @param {string} userId - The user's MongoDB ObjectId
 * @returns {Promise<string>} The user's referral code
 */
export async function generateReferralCodeForUser(userId) {
  const user = await User.findById(userId).select("referralCode");
  if (!user) {
    throw new Error("User not found");
  }

  // Never regenerate — return existing code
  if (user.referralCode) {
    return user.referralCode;
  }

  // Generate a unique code with retry loop
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateRandomCode();
    const existing = await User.findOne({ referralCode: code }).select("_id").lean();
    if (!existing) {
      await User.findByIdAndUpdate(userId, { $set: { referralCode: code } });
      return code;
    }
  }

  throw new Error("Failed to generate a unique referral code after maximum retries");
}

/**
 * Generate a random code without persistence (for batch operations).
 * Caller is responsible for uniqueness checks.
 * @returns {string}
 */
export { generateRandomCode };
