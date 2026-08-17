import User from "../models/UserModel.js";
import { generateReferralCodeForUser } from "../utils/referralCodeGenerator.js";
import { trackAnalyticsEvent } from "./analyticsTrackingService.js";
import mongoose from "mongoose";

/**
 * Resolve a referral code to the referring user.
 * Returns null if the code is invalid or the user is inactive.
 * 
 * @param {string} code - The referral code to resolve
 * @returns {Promise<{valid: boolean, referrer?: object, referrerName?: string}>}
 */
export async function resolveReferralCode(code) {
  if (!code || typeof code !== "string") {
    return { valid: false, reason: "missing_code" };
  }

  const normalizedCode = code.toUpperCase().trim();
  if (normalizedCode.length < 4 || normalizedCode.length > 12) {
    return { valid: false, reason: "invalid_format" };
  }

  const referrer = await User.findOne({ referralCode: normalizedCode })
    .select("_id fullName isActive referralCode companyId")
    .lean();

  if (!referrer) {
    return { valid: false, reason: "code_not_found" };
  }

  if (referrer.isActive === false) {
    return { valid: false, reason: "referrer_inactive" };
  }

  return {
    valid: true,
    referrer,
    referrerName: referrer.fullName ? referrer.fullName.split(" ")[0] : "A Nikola User"
  };
}

/**
 * Record a referral link click as an analytics event.
 * 
 * @param {string} code - The referral code
 * @param {object} referrer - The referring user object
 * @param {object} metadata - Additional metadata (e.g., user agent, IP)
 */
export async function recordReferralClick(code, referrer, metadata = {}) {
  await trackAnalyticsEvent({
    eventName: "referral_clicked",
    feature: "referral",
    userId: referrer?._id || null,
    companyId: referrer?.companyId || null,
    metadata: {
      referralCode: code,
      channel: metadata.channel || "link",
      source: metadata.source || "direct"
    }
  });
}

/**
 * Apply referral attribution to a newly created user.
 * Enforces all attribution rules:
 * - No self-referral
 * - No overwriting existing attribution
 * - No invalid/inactive referrers
 * - No duplicate attribution
 * 
 * @param {object} newUser - The newly created user document (mongoose)
 * @param {string} referralCode - The referral code used during registration
 * @returns {Promise<{attributed: boolean, reason?: string}>}
 */
export async function applyReferralAttribution(newUser, referralCode) {
  if (!referralCode || typeof referralCode !== "string") {
    return { attributed: false, reason: "no_code" };
  }

  // Don't overwrite existing attribution
  if (newUser.referredBy) {
    return { attributed: false, reason: "already_attributed" };
  }

  const resolution = await resolveReferralCode(referralCode);
  if (!resolution.valid) {
    return { attributed: false, reason: resolution.reason };
  }

  const referrer = resolution.referrer;

  // Prevent self-referral
  if (String(referrer._id) === String(newUser._id)) {
    return { attributed: false, reason: "self_referral" };
  }

  // Apply attribution atomically
  const updateResult = await User.updateOne(
    { _id: newUser._id, referredBy: null },
    {
      $set: {
        referredBy: referrer._id,
        referralCodeUsed: referralCode.toUpperCase().trim(),
        referralCapturedAt: new Date()
      }
    }
  );

  if (updateResult.modifiedCount === 0) {
    return { attributed: false, reason: "already_attributed" };
  }

  // Track referral signup event
  await trackAnalyticsEvent({
    eventName: "referral_signup",
    feature: "referral",
    userId: newUser._id,
    companyId: newUser.companyId || null,
    role: newUser.role,
    state: newUser.state,
    metadata: {
      referralCode: referralCode.toUpperCase().trim(),
      referrerId: String(referrer._id),
      referredUserId: String(newUser._id)
    }
  });

  return { attributed: true, referrerId: referrer._id };
}

/**
 * Get referral performance statistics for a user.
 * 
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<{referralCode: string, referralLink: string, stats: object}>}
 */
export async function getUserReferralStats(userId) {
  const user = await User.findById(userId).select("referralCode fullName").lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Ensure user has a referral code
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = await generateReferralCodeForUser(userId);
  }

  const AnalyticsEvent = mongoose.model("AnalyticsEvent");

  // Count clicks (referral_clicked events where metadata.referralCode matches)
  const clicks = await AnalyticsEvent.countDocuments({
    eventName: "referral_clicked",
    "metadata.referralCode": referralCode
  });

  // Count signups (users with referredBy = this user)
  const signups = await User.countDocuments({ referredBy: userId });

  // Count activations (referral_activation events for users referred by this user)
  const activations = await AnalyticsEvent.countDocuments({
    eventName: "referral_activation",
    "metadata.referrerId": String(userId)
  });

  return {
    referralCode,
    stats: {
      clicks,
      signups,
      activations
    }
  };
}
