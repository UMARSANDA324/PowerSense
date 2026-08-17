import { resolveReferralCode, recordReferralClick, getUserReferralStats } from "../services/referralService.js";

/**
 * @desc    Resolve and validate a referral code
 * @route   GET /api/referral/resolve/:code
 * @access  Public
 */
export const resolveCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ valid: false, message: "Code is required" });
    }

    const resolution = await resolveReferralCode(code);
    
    if (resolution.valid) {
      // Record click asynchronously (don't block the response)
      recordReferralClick(code, resolution.referrer, {
        source: req.headers.referer || "direct",
        channel: "link"
      }).catch(err => console.warn("[Referral] Failed to record click:", err.message));

      return res.json({
        valid: true,
        referrerName: resolution.referrerName
      });
    } else {
      return res.json({
        valid: false,
        reason: resolution.reason
      });
    }
  } catch (error) {
    console.error("[Referral] Error resolving code:", error);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
};

/**
 * @desc    Get current user's referral info
 * @route   GET /api/referral/me
 * @access  Private
 */
export const getMyReferralInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await getUserReferralStats(userId);
    
    // The frontend constructs the URL based on window.location.origin
    // We just return the path part for safety, or full structure
    // We'll return just the code and stats, and let frontend build the full URL
    // but we can provide a relative link structure too
    const referralLink = `${req.protocol}://${req.get("host")}/r/${stats.referralCode}`;
    // However, it's safer to let the frontend construct the exact origin since the API might be on a different domain

    res.json({
      referralCode: stats.referralCode,
      // Provide a relative path for the frontend to append to its origin
      referralPath: `/r/${stats.referralCode}`, 
      stats: stats.stats
    });
  } catch (error) {
    console.error("[Referral] Error getting stats:", error);
    res.status(500).json({ message: "Failed to get referral information" });
  }
};
