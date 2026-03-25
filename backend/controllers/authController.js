import User from "../models/UserModel.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "Request body is missing or empty" });
  }
  const { fullName, email, password, phone, role, state, lga, ward, feeder } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Please provide all required fields: fullName, email, password" });
  }

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      role: "user", // Enforce user role for public registration
      state,
      lga,
      ward,
      feeder,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        state: user.state,
        lga: user.lga,
        ward: user.ward,
        feeder: user.feeder,
        role: user.role,
        notificationPreference: user.notificationPreference,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};


// that's right//
// try it//
// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      state: user.state || "",
      lga: user.lga || "",
      ward: user.ward || "",
      feeder: user.feeder || "",
      notificationPreference: user.notificationPreference,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.email = req.body.email || user.email;

      if (req.body.phone !== undefined) {
        user.phone = req.body.phone;
      }

      if (req.body.password) {
        // Password hashing is handled by pre-save hook in UserModel
        user.password = req.body.password;
      }

      if (req.body.notificationPreference) {
        let preference = req.body.notificationPreference;
        // Map old preferences to new supported ones
        if (preference === "phone") preference = "in-app";
        if (preference === "sms") preference = "push";
        user.notificationPreference = preference;
      }

      if (req.body.lga) {
        user.lga = req.body.lga;
      }
      
      if (req.body.ward) {
        user.ward = req.body.ward;
        
        // --- Automatically Update Feeder based on new Ward ---
        try {
          const wardObj = await Ward.findOne({ name: req.body.ward });
          if (wardObj) {
            const feederObj = await Feeder.findOne({ wards: wardObj._id });
            if (feederObj) {
              user.feeder = feederObj.name;
              console.log(`Auto-updated feeder to: ${feederObj.name} for ward: ${req.body.ward}`);
            }
          }
        } catch (error) {
          console.error("Auto-feeder update error:", error);
        }
      }

      if (req.body.state) {
        user.state = req.body.state;
      }


      if (req.body.fcmToken) {
        // Ensure deviceTokens array exists
        if (!user.deviceTokens) {
          user.deviceTokens = [];
        }
        
        // Add new token if it doesn't exist
        const tokenExists = user.deviceTokens.find(dt => dt.token === req.body.fcmToken);
        if (!tokenExists) {
          user.deviceTokens.push({
            token: req.body.fcmToken,
            deviceType: req.body.deviceType || "web",
            lastUpdated: Date.now()
          });
        } else {
          tokenExists.lastUpdated = Date.now();
        }
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone || "",
        state: updatedUser.state || "",
        lga: updatedUser.lga || "",
        ward: updatedUser.ward || "",
        feeder: updatedUser.feeder || "",
        notificationPreference: updatedUser.notificationPreference,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        state: user.state,
        lga: user.lga,
        ward: user.ward,
        role: user.role,
        feeder: user.feeder,
        notificationPreference: user.notificationPreference,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(`Forgot password request for: ${email}`);

  try {
    const user = await User.findOne({ email });

    if (!user) {
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
        <p>You requested a password reset for your PowerSense account. Your One-Time Password (OTP) is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #f3f4f6; color: #2563eb; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 5px; letter-spacing: 5px; border: 1px dashed #2563eb;">${otp}</span>
        </div>
        <p>This OTP will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666666; text-align: center;">PowerSense &copy; 2024</p>
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
      console.log("Attempting to send OTP email...");
      await sendEmailWithTimeout({
        email: user.email,
        subject: "PowerSense Password Reset OTP",
        html: message,
      });
      console.log("Email sent successfully.");

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email.",
      });
    } catch (emailError) {
      console.error("Email processing error:", emailError.message);
      return res.status(500).json({
        message: "We couldn't send the email right now. Please try again later."
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
