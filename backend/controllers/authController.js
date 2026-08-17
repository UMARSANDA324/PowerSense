import User from "../models/UserModel.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import mongoose from "mongoose";
import { normalizeRole, getRoleDisplayInfo, getPermissionsForRole } from "../config/identityConfig.js";
import { getDefaultCompany } from "../services/tenantResolver.js";
import Platform from "../models/Platform.js";
import Company from "../models/Company.js";
import { publishPlatformEvent } from "../services/platformEventDispatcher.js";
import { trackAnalyticsEvent } from "../services/analyticsTrackingService.js";
import { tenantScopeStorage } from "../utils/tenantScope.js";
import { isValidObjectId, toObjectId, parseResourceRef } from "../utils/objectIdUtils.js";
import { applyReferralAttribution } from "../services/referralService.js";
import { generateReferralCodeForUser } from "../utils/referralCodeGenerator.js";


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "Request body is missing or empty" });
  }
  let { fullName, email, password, phone, role, country, state, lga, ward, feeder, referralCode } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Please provide all required fields: fullName, email, password" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.warn(`[Register] Registration attempt for existing email: ${email}`);
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Get default company for new user registration
    const defaultCompany = await getDefaultCompany();
    const companyId = defaultCompany ? defaultCompany._id : null;

    console.log(`[Register] Creating new user: ${email}`);

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      role: "user", // Enforce user role for public registration
      country,
      state,
      lga,
      ward,
      feeder,
      companyId: companyId // Associate with default company
    });

    if (user) {
      console.log(`[Register] ✅ Success: Created user ${user.email} (ID: ${user._id})`);

      // Apply referral attribution if a code was provided
      if (referralCode) {
        try {
          await applyReferralAttribution(user, referralCode);
        } catch (attributionError) {
          console.warn(`[Register] Referral attribution failed for ${user.email}:`, attributionError.message);
        }
      }

      // Generate the user's own referral code so it's ready immediately
      let newReferralCode = null;
      try {
        newReferralCode = await generateReferralCodeForUser(user._id);
      } catch (genError) {
        console.warn(`[Register] Failed to generate referral code for ${user.email}:`, genError.message);
      }

      publishPlatformEvent({
        type: "user.created",
        companyId: user.companyId,
        data: { user: { _id: user._id, fullName: user.fullName, role: user.role } }
      });

      trackAnalyticsEvent({
        eventName: "user_registered",
        feature: "acquisition",
        userId: user._id,
        companyId: user.companyId,
        role: user.role,
        state: user.state,
        metadata: { source: "public_registration" }
      });

      // Return user data without sensitive information
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          country: user.country,
          state: user.state,
          lga: user.lga,
          ward: user.ward,
          feeder: user.feeder,
          role: user.role,
          notificationPreference: user.notificationPreference,
          referralCode: newReferralCode
        },
        token: generateToken(user._id),
      });
    } else {
      console.error(`[Register] ❌ Failed to create user: ${email}`);
      res.status(400).json({ message: "Failed to create user. Please try again." });
    }
  } catch (error) {
    console.error(`[Register] Error creating user ${email}:`, error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    res.status(500).json({ message: "Server error during registration. Please try again." });
  }
};


// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").populate("assignedFeeders", "name _id");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Normalize role and get role info
  const normalizedRole = normalizeRole(user.role);
  const roleInfo = getRoleDisplayInfo(user.role);
  const userPermissions = getPermissionsForRole(user.role);

  let companyData = null;
  if (normalizedRole !== "platform-owner" && user.companyId) {
    companyData = await Company.findById(user.companyId).select("name shortName code logo").lean();
  }
  
  // Platform metadata
  let platformMetadata = null;
  if (normalizedRole === 'platform-owner') {
    try {
      const platform = await Platform.getPlatform();
      if (platform) {
        platformMetadata = {
          platformId: platform.platformId,
          name: platform.name,
          version: platform.version,
          status: platform.status,
          settings: platform.settings || {},
          metadata: platform.metadata || {}
        };
      }
    } catch (err) {
      console.error("Error retrieving platform metadata in profile:", err);
    }
  }

  // Add referral code to profile response
  let referralCode = user.referralCode;
  if (!referralCode) {
    // Lazy generation for existing users without codes
    try {
      referralCode = await generateReferralCodeForUser(user._id);
    } catch (err) {
      console.warn("[Profile] Failed to lazy-generate referral code", err.message);
    }
  }

  // Centralized navigation target calculation
  let navigationTarget = "/";
  if (normalizedRole === "platform-owner") {
    navigationTarget = "/platform-owner";
  } else if (normalizedRole === "company-super-admin" || normalizedRole === "super-admin") {
    navigationTarget = "/super-admin-dashboard";
  } else if (normalizedRole === "regional-admin" || normalizedRole === "admin") {
    navigationTarget = "/admin-dashboard";
  } else {
    navigationTarget = "/dashboard";
  }

  res.json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role, // Original role for backward compatibility
    normalizedRole: normalizedRole, // Normalized role for new systems
    roleInfo: roleInfo, // Role metadata
    permissions: userPermissions, // User permissions
    phone: user.phone || "",
    state: user.state || "",
    lga: user.lga || "",
    ward: user.ward || "",
    feeder: user.feeder || "",
    assignedFeeders: user.assignedFeeders || [],
    companyId: normalizedRole === "platform-owner" ? null : (user.companyId || null),
    company: normalizedRole === "platform-owner" || !companyData ? null : {
      _id: companyData._id,
      name: companyData.name,
      shortName: companyData.shortName,
      code: companyData.code,
      logo: companyData.logo || null
    },
    notificationPreference: user.notificationPreference,
    displayName: normalizedRole === "platform-owner" ? "Platform Owner" : user.fullName,
    platformMetadata: platformMetadata || undefined,
    navigationTarget,
    referralCode
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
//
// IMPORTANT: Uses a two-path strategy to avoid timeout bugs:
//   - FCM token-only updates: single atomic findByIdAndUpdate (no save hooks, 1 DB round-trip)
//   - Full profile updates (password change / ward change): traditional find+save so hooks run correctly
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const body = req.body;

    // --- FCM TOKEN-ONLY PATH ---
    // When only fcmToken (and optional deviceType) are sent, use a single atomic update.
    // This is the hot path called on every page load — must be fast and resilient.
    const isFcmOnlyUpdate = body.fcmToken &&
      Object.keys(body).every(k => ["fcmToken", "deviceType"].includes(k));

    if (isFcmOnlyUpdate) {
      const token = body.fcmToken;
      const deviceType = body.deviceType || "web";
      const now = new Date();

      // Try to update existing token timestamp first (upsert into array element)
      const updateExisting = await User.findOneAndUpdate(
        { _id: userId, "deviceTokens.token": token },
        { $set: { "deviceTokens.$.lastUpdated": now } },
        { new: true, select: "-password" }
      );

      let updatedUser = updateExisting;

      if (!updateExisting) {
        // Token not in array yet — push it
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $push: { deviceTokens: { token, deviceType, lastUpdated: now } } },
          { new: true, select: "-password" }
        );
      }

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Populate assignedFeeders for the response
      const populatedUser = await User.findById(updatedUser._id).select("-password").populate("assignedFeeders", "name _id");
      const normalizedRole = normalizeRole(populatedUser.role);
      let platformMetadata = null;
      if (normalizedRole === 'platform-owner') {
        try {
          const platform = await Platform.getPlatform();
          if (platform) {
            platformMetadata = {
              platformId: platform.platformId,
              name: platform.name,
              version: platform.version,
              status: platform.status,
              settings: platform.settings || {},
              metadata: platform.metadata || {}
            };
          }
        } catch (err) {
          console.error("Error retrieving platform metadata in fcm update:", err);
        }
      }
      let navigationTarget = "/";
      if (normalizedRole === "platform-owner") {
        navigationTarget = "/platform-owner";
      } else if (normalizedRole === "company-super-admin" || normalizedRole === "super-admin") {
        navigationTarget = "/super-admin-dashboard";
      } else if (normalizedRole === "regional-admin" || normalizedRole === "admin") {
        navigationTarget = "/admin-dashboard";
      } else {
        navigationTarget = "/dashboard";
      }

      return res.json({
        _id: populatedUser._id,
        fullName: populatedUser.fullName,
        email: populatedUser.email,
        role: populatedUser.role,
        phone: populatedUser.phone || "",
        state: populatedUser.state || "",
        lga: populatedUser.lga || "",
        ward: populatedUser.ward || "",
        feeder: populatedUser.feeder || "",
        assignedFeeders: populatedUser.assignedFeeders || [],
        notificationPreference: populatedUser.notificationPreference,
        businessModeEnabled: populatedUser.businessModeEnabled || false,
        businessType: populatedUser.businessType || "other",
        businessRiskScore: populatedUser.businessRiskScore || 0,
        token: generateToken(populatedUser._id),
        displayName: normalizedRole === "platform-owner" ? "Platform Owner" : populatedUser.fullName,
        platformMetadata: platformMetadata || undefined,
        navigationTarget
      });
    }

    // --- FULL PROFILE UPDATE PATH ---
    // Handles password changes, ward/feeder auto-resolution, and other field updates.
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.fullName = body.fullName || user.fullName;
    user.email = body.email || user.email;

    if (body.phone !== undefined) user.phone = body.phone;

    if (body.password) {
      // Password hashing is handled by pre-save hook in UserModel
      user.password = body.password;
    }

    if (body.notificationPreference) {
      let preference = body.notificationPreference;
      // Map old preferences to new supported ones
      if (preference === "phone") preference = "in-app";
      if (preference === "sms") preference = "push";
      user.notificationPreference = preference;
    }

    if (body.businessModeEnabled !== undefined) {
      user.businessModeEnabled = body.businessModeEnabled === true || body.businessModeEnabled === "true";
    }
    if (body.businessType) user.businessType = body.businessType;
    if (body.businessRiskScore !== undefined) user.businessRiskScore = Number(body.businessRiskScore) || 0;
    if (body.lga) user.lga = body.lga;
    if (body.state) user.state = body.state;

    if (body.ward) {
      user.ward = body.ward;
      // Automatically resolve feeder based on new ward safely
      try {
        const ref = parseResourceRef(body.ward);
        const wardQuery = ref.isObjectId
          ? { _id: ref.id }
          : { $or: [{ name: ref.name }, { wardName: ref.name }, { id: ref.name }] };
        const wardObj = await Ward.findOne(wardQuery);
        if (wardObj) {
          const feederObj = await Feeder.findOne({
            $or: [
              { wards: wardObj._id },
              { wardIds: wardObj._id },
              { ward: wardObj._id },
              { communityIds: wardObj._id }
            ]
          });
          if (feederObj) {
            user.feeder = feederObj.name;
            console.log(`Auto-updated feeder to: ${feederObj.name} for ward: ${body.ward}`);
          }
        }
      } catch (err) {
        console.error("Auto-feeder update error:", err);
      }
    }

    // Handle FCM token if included in a full update
    if (body.fcmToken) {
      if (!user.deviceTokens) user.deviceTokens = [];
      const tokenExists = user.deviceTokens.find(dt => dt.token === body.fcmToken);
      if (!tokenExists) {
        user.deviceTokens.push({ token: body.fcmToken, deviceType: body.deviceType || "web", lastUpdated: new Date() });
      } else {
        tokenExists.lastUpdated = new Date();
      }
    }

    const updatedUser = await user.save();

    // Populate assignedFeeders for the response
    const populatedUser = await User.findById(updatedUser._id).select("-password").populate("assignedFeeders", "name _id");
    const normalizedRole = normalizeRole(populatedUser.role);
    let platformMetadata = null;
    if (normalizedRole === 'platform-owner') {
      try {
        const platform = await Platform.getPlatform();
        if (platform) {
          platformMetadata = {
            platformId: platform.platformId,
            name: platform.name,
            version: platform.version,
            status: platform.status,
            settings: platform.settings || {},
            metadata: platform.metadata || {}
          };
        }
      } catch (err) {
        console.error("Error retrieving platform metadata in full update:", err);
      }
    }
    let navigationTarget = "/";
    if (normalizedRole === "platform-owner") {
      navigationTarget = "/platform-owner";
    } else if (normalizedRole === "company-super-admin" || normalizedRole === "super-admin") {
      navigationTarget = "/super-admin-dashboard";
    } else if (normalizedRole === "regional-admin" || normalizedRole === "admin") {
      navigationTarget = "/admin-dashboard";
    } else {
      navigationTarget = "/dashboard";
    }

    res.json({
      _id: populatedUser._id,
      fullName: populatedUser.fullName,
      email: populatedUser.email,
      role: populatedUser.role,
      phone: populatedUser.phone || "",
      state: populatedUser.state || "",
      lga: populatedUser.lga || "",
      ward: populatedUser.ward || "",
      feeder: populatedUser.feeder || "",
      assignedFeeders: populatedUser.assignedFeeders || [],
      notificationPreference: populatedUser.notificationPreference,
      businessModeEnabled: populatedUser.businessModeEnabled || false,
      businessType: populatedUser.businessType || "other",
      businessRiskScore: populatedUser.businessRiskScore || 0,
      token: generateToken(populatedUser._id),
      displayName: normalizedRole === "platform-owner" ? "Platform Owner" : populatedUser.fullName,
      platformMetadata: platformMetadata || undefined,
      navigationTarget
    });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "Request body is missing or empty" });
  }
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const dbName = mongoose.connection.db?.databaseName || 'UNKNOWN';
    console.log(`[Login] Login attempt for: ${email}`);
    console.log(`[Login DB Debug] Target DB: ${dbName}`);

    try {
      if (mongoose.connection.db) {
        const totalUsers = await mongoose.connection.db.collection("users").countDocuments();
        console.log(`[Login DB Debug] Documents in 'users' collection: ${totalUsers}`);
      }
    } catch (e) {
      console.log(`[Login DB Debug] Error counting users: ${e.message}`);
    }

    // Explicitly select password to ensure it's available for matchPassword
    const user = await User.findOne({ email }).select("+password").populate("assignedFeeders", "name _id");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "USER_NOT_FOUND"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Task 5: Block Admin/SuperAdmin login for suspended companies
    const adminRoles = ["admin", "super-admin", "company-super-admin", "regional-admin"];
    if (adminRoles.includes(user.role) && user.companyId) {
      const userCompanyDoc = await Company.findById(user.companyId).select("status name suspension");
      if (userCompanyDoc && userCompanyDoc.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: `Access denied. Your company (${userCompanyDoc.name}) has been suspended. Please contact the Platform Owner.`,
          code: "COMPANY_SUSPENDED",
          suspensionReason: userCompanyDoc.suspension?.reason || "No reason provided",
          suspendedAt: userCompanyDoc.suspension?.suspendedAt
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_PASSWORD"
      });
    }

    console.log(`[Login] ✅ Success: ${email} (${user.role})`);

    // Update last login timestamp (optional)
    user.lastLogin = new Date();
    await user.save();

    trackAnalyticsEvent({
      eventName: "user_login",
      feature: "retention",
      userId: user._id,
      companyId: user.companyId,
      role: user.role,
      state: user.state
    });

    // Normalize role for consistent response
    const normalizedRole = normalizeRole(user.role);
    const roleInfo = getRoleDisplayInfo(user.role);
    const userPermissions = getPermissionsForRole(user.role);

    // Development logging (Task 11)
    if (normalizedRole === "platform-owner" && process.env.NODE_ENV !== "production") {
      console.log(`Platform Owner Login: ${user.email}`);
    }

    // Platform metadata
    let platformMetadata = null;
    if (normalizedRole === 'platform-owner') {
      try {
        const platform = await Platform.getPlatform();
        if (platform) {
          platformMetadata = {
            platformId: platform.platformId,
            name: platform.name,
            version: platform.version,
            status: platform.status,
            settings: platform.settings || {},
            metadata: platform.metadata || {}
          };
        } else {
          platformMetadata = {
            platformId: 'LITHA_PLATFORM',
            name: 'Nikola Platform',
            version: '1.0.0',
            status: 'active',
            settings: {},
            metadata: {}
          };
        }
      } catch (err) {
        console.error("Error retrieving platform metadata:", err);
        platformMetadata = {
          platformId: 'LITHA_PLATFORM',
          name: 'Nikola Platform',
          version: '1.0.0',
          status: 'active',
          settings: {},
          metadata: {}
        };
      }
    }

    // Centralized navigation target calculation (Task 3)
    let navigationTarget = "/";
    if (normalizedRole === "platform-owner") {
      navigationTarget = "/platform-owner";
    } else if (normalizedRole === "company-super-admin" || normalizedRole === "super-admin") {
      navigationTarget = "/super-admin-dashboard";
    } else if (normalizedRole === "regional-admin" || normalizedRole === "admin") {
      navigationTarget = "/admin-dashboard";
    } else {
      navigationTarget = "/dashboard";
    }

    let companyData = null;
    if (normalizedRole !== "platform-owner" && user.companyId) {
      try {
        companyData = await Company.findById(user.companyId).select("name shortName code logo").lean();
      } catch (e) {
        console.warn(`[Login] Error finding company by ID (${user.companyId}):`, e.message);
      }
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        state: user.state,
        lga: user.lga,
        ward: user.ward,
        role: user.role, // Original role for backward compatibility
        normalizedRole: normalizedRole, // Normalized role for new systems
        roleInfo: roleInfo, // Role metadata
        permissions: userPermissions, // User permissions
        feeder: user.feeder,
        assignedFeeders: user.assignedFeeders || [],
        companyId: user.companyId || companyData?._id,
        company: companyData ? { _id: companyData._id, name: companyData.name, shortName: companyData.shortName, code: companyData.code, logo: companyData.logo || null } : null,
        notificationPreference: user.notificationPreference,
        lastLogin: user.lastLogin,
        displayName: normalizedRole === "platform-owner" ? "Platform Owner" : user.fullName,
        platformMetadata: platformMetadata || undefined,
        navigationTarget
      },
      token: generateToken(user._id),
      // Task 2 specific top-level fields
      role: normalizedRole,
      displayName: normalizedRole === "platform-owner" ? "Platform Owner" : (roleInfo.name || "Verified User"),
      platformMetadata: platformMetadata || undefined,
      permissions: userPermissions,
      navigationTarget
    });
  } catch (error) {
    console.error(`[Login] Error for ${email}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
      code: "SERVER_ERROR"
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  let { email } = req.body;
  const userAgent = req.headers["user-agent"] || "unknown";
  
  if (!email) {
    return res.status(400).json({ message: "Please provide an email address." });
  }

  // Normalize email to prevent mobile keyboard trailing space issues
  email = email.toLowerCase().trim();
  
  console.log(`[ForgotPassword] Request for: ${email} | Device: ${userAgent}`);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.warn(`[ForgotPassword] 404: Email ${email} not found.`);
      return res.status(404).json({ message: "This email is not registered in the system." });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Set OTP and expiry (10 minutes)
    user.otpCode = hashedOtp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;

    console.log("Saving user with OTP...");
    await user.save({ validateBeforeSave: false });

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Password Reset OTP</h2>
        <p>Hello <strong>${user.fullName}</strong>,</p>
        <p>You requested a password reset for your Nikola account. Your One-Time Password (OTP) is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #f3f4f6; color: #2563eb; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 5px; letter-spacing: 5px; border: 1px dashed #2563eb;">${otp}</span>
        </div>
        <p>This OTP will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666666; text-align: center;">Nikola &copy; 2024</p>
      </div>
    `;

    const sendEmailWithTimeout = (options) => {
      return Promise.race([
        sendEmail(options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Email sending timed out")), 15000)
        )
      ]);
    };

    try {
      console.log(`[ForgotPassword] Attempting to send OTP email to ${user.email}...`);
      await sendEmailWithTimeout({
        email: user.email,
        subject: "Nikola Password Reset OTP",
        html: message,
      });
      console.log(`[ForgotPassword] ✅ Email sent successfully to ${user.email}`);

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email.",
      });
    } catch (emailError) {
      console.error(`[ForgotPassword] ❌ Email processing error for ${user.email}:`, emailError.message);
      console.error(`[ForgotPassword] Full Error Stack:`, emailError);
      
      return res.status(500).json({
        message: "We couldn't send the email right now. Please try again later.",
        debug: process.env.NODE_ENV === "development" ? emailError.message : undefined
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Please provide email and OTP" });
  }

  try {
    const user = await User.findOne({
      email,
      otpExpire: { $gt: Date.now() },
    });

    if (!user || !user.otpCode) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new password reset." });
    }

    const isMatch = await bcrypt.compare(otp, user.otpCode);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new password reset." });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified correctly.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "An error occurred during verification." });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ message: "Please provide all required fields: email, otp, password" });
  }

  try {
    const user = await User.findOne({
      email,
      otpExpire: { $gt: Date.now() },
    });

    if (!user || !user.otpCode) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new password reset." });
    }

    const isMatch = await bcrypt.compare(otp, user.otpCode);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new password reset." });
    }

    // Update password (hashing handled by pre-save hook)
    user.password = password;
    user.otpCode = undefined;
    user.otpExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "An error occurred while resetting your password." });
  }
};
