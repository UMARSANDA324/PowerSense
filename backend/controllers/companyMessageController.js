import CompanyMessage from "../models/CompanyMessage.js";
import User from "../models/UserModel.js";
import Company from "../models/Company.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_VOICE_DIR = path.resolve(__dirname, "../uploads/voice");

// Ensure voice upload directory exists
if (!fs.existsSync(UPLOADS_VOICE_DIR)) {
  fs.mkdirSync(UPLOADS_VOICE_DIR, { recursive: true });
}

/**
 * Helper to derive user company ID safely
 */
const getCompanyIdFromReqUser = async (user) => {
  if (user?.companyId) return user.companyId;
  const dbUser = await User.findById(user._id).select("companyId role");
  if (dbUser?.companyId) return dbUser.companyId;

  // Fall back to default active company for platform-owner or super-admin
  const role = user?.role || dbUser?.role;
  if (["platform-owner", "super-admin", "company-super-admin"].includes(role)) {
    const defaultCompany = await Company.findOne({ status: { $ne: "archived" } }).select("_id");
    if (defaultCompany) return defaultCompany._id;
  }
  return null;
};

/**
 * @desc Send internal company message (text)
 * @route POST /api/company-messages
 * @access Private (Super-Admin, Admin)
 */
export const sendMessageController = async (req, res) => {
  try {
    const senderId = req.user._id;
    let companyId = await getCompanyIdFromReqUser(req.user);

    const { recipientId, recipientType = "direct", subject = "", body, parentId = null } = req.body;

    if (!body || body.trim() === "") {
      return res.status(400).json({ success: false, message: "Message body is required" });
    }

    let finalRecipient = null;

    if (recipientType === "all_super_admins") {
      // Only Platform Owner can broadcast to all Super Admins
      if (req.user.role !== "platform-owner") {
        return res.status(403).json({ success: false, message: "Only the Platform Owner can broadcast messages to all Super Admins" });
      }
      finalRecipient = null;
    } else if (recipientType === "all_admins") {
      // Only Super Admins can send broadcast messages to all company admins
      if (!["super-admin", "company-super-admin", "platform-owner"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Only Super Admins can broadcast messages to all admins" });
      }
      if (!companyId) {
        return res.status(400).json({ success: false, message: "User is not assigned to any company" });
      }
    } else {
      // Direct message validation
      if (!recipientId) {
        return res.status(400).json({ success: false, message: "Recipient ID is required for direct messages" });
      }

      const recipientUser = await User.findById(recipientId);
      if (!recipientUser) {
        return res.status(404).json({ success: false, message: "Recipient user not found" });
      }

      // If sender is Platform Owner, can message any Super Admin
      if (req.user.role === "platform-owner") {
        companyId = recipientUser.companyId || companyId;
      } else {
        // Tenant isolation enforcement for non-platform-owners
        if (
          recipientUser.companyId &&
          companyId &&
          recipientUser.companyId.toString() !== companyId.toString()
        ) {
          return res.status(403).json({ success: false, message: "Cannot send messages to users outside your company" });
        }
      }

      finalRecipient = recipientUser._id;
    }

    if (!companyId && req.user.role !== "platform-owner") {
      return res.status(400).json({ success: false, message: "User is not assigned to any company" });
    }

    const message = await CompanyMessage.create({
      companyId: companyId || null,
      sender: senderId,
      recipient: finalRecipient,
      recipientType,
      subject,
      body,
      parentId,
      messageType: "text"
    });

    const populated = await CompanyMessage.findById(message._id)
      .populate("sender", "fullName email role")
      .populate("recipient", "fullName email role");

    if (req.io) {
      if (recipientType === "all_super_admins") {
        req.io.emit("company.message.created", populated);
      } else if (companyId) {
        req.io.to(`company_${companyId}`).emit("company.message.created", populated);
      }
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populated
    });
  } catch (error) {
    console.error("[CompanyMessage] Error sending message:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send message" });
  }
};

/**
 * @desc Send internal voice message
 * @route POST /api/company-messages/voice
 * @access Private (Super-Admin, Admin)
 */
export const sendVoiceMessageController = async (req, res) => {
  try {
    const senderId = req.user._id;
    let companyId = await getCompanyIdFromReqUser(req.user);

    const {
      recipientId,
      recipientType = "direct",
      subject = "",
      body,
      parentId = null,
      audioData,
      audioDuration,
      audioMimeType = "audio/webm"
    } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, message: "Audio recording data is required" });
    }

    // 1. Validate MIME type
    const ALLOWED_MIME_TYPES = [
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/wav",
      "audio/mpeg",
      "audio/aac",
      "audio/m4a",
      "audio/x-m4a",
      "audio/x-wav",
      "audio/3gpp"
    ];
    const cleanMimeType = audioMimeType.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(cleanMimeType)) {
      return res.status(415).json({
        success: false,
        message: `Unsupported audio MIME type: '${audioMimeType}'. Allowed formats: webm, ogg, mp4, wav, mp3, aac, m4a, 3gpp.`
      });
    }

    // 2. Decode audio buffer (base64 URI or raw base64)
    let audioBuffer;
    try {
      const base64Str = audioData.includes(",") ? audioData.split(",")[1] : audioData;
      audioBuffer = Buffer.from(base64Str, "base64");
    } catch (e) {
      return res.status(400).json({ success: false, message: "Malformed audio payload" });
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ success: false, message: "Audio recording data is empty" });
    }

    // 3. File size limit (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const fileSize = audioBuffer.length;
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        message: `Audio file size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB`
      });
    }

    // 4. Validate recipient authorization
    let finalRecipient = null;

    if (recipientType === "all_super_admins") {
      if (req.user.role !== "platform-owner") {
        return res.status(403).json({ success: false, message: "Only the Platform Owner can broadcast voice messages to all Super Admins" });
      }
      finalRecipient = null;
    } else if (recipientType === "all_admins") {
      if (!["super-admin", "company-super-admin", "platform-owner"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Only Super Admins can broadcast messages to all admins" });
      }
      if (!companyId) {
        return res.status(400).json({ success: false, message: "User is not assigned to any company" });
      }
    } else {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: "Recipient ID is required for direct messages" });
      }

      const recipientUser = await User.findById(recipientId);
      if (!recipientUser) {
        return res.status(404).json({ success: false, message: "Recipient user not found" });
      }

      if (req.user.role === "platform-owner") {
        companyId = recipientUser.companyId || companyId;
      } else {
        if (
          recipientUser.companyId &&
          companyId &&
          recipientUser.companyId.toString() !== companyId.toString()
        ) {
          return res.status(403).json({ success: false, message: "Cannot send messages to users outside your company" });
        }
      }

      finalRecipient = recipientUser._id;
    }

    if (!companyId && req.user.role !== "platform-owner") {
      return res.status(400).json({ success: false, message: "User is not assigned to any company" });
    }

    // 5. Store file on disk
    const extMap = {
      "audio/webm": ".webm",
      "audio/ogg": ".ogg",
      "audio/mp4": ".m4a",
      "audio/m4a": ".m4a",
      "audio/x-m4a": ".m4a",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/mpeg": ".mp3",
      "audio/aac": ".aac",
      "audio/3gpp": ".3gp"
    };
    const fileExt = extMap[cleanMimeType] || ".webm";
    const filename = `${companyId || "platform"}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${fileExt}`;
    const filePath = path.join(UPLOADS_VOICE_DIR, filename);

    fs.writeFileSync(filePath, audioBuffer);

    // 6. Save message in MongoDB with cleanup on error
    let message;
    try {
      const audioUrl = `/api/company-messages/voice/audio/${filename}`;
      message = await CompanyMessage.create({
        companyId,
        sender: senderId,
        recipient: finalRecipient,
        recipientType,
        subject,
        body: body?.trim() || "[Voice Message]",
        parentId,
        messageType: "voice",
        audioUrl,
        audioDuration: parseFloat(audioDuration) || 0,
        audioMimeType: cleanMimeType,
        fileSize
      });
    } catch (dbError) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
      throw dbError;
    }

    const populated = await CompanyMessage.findById(message._id)
      .populate("sender", "fullName email role")
      .populate("recipient", "fullName email role");

    if (req.io) {
      if (recipientType === "all_super_admins") {
        req.io.emit("company.message.created", populated);
      } else if (companyId) {
        req.io.to(`company_${companyId}`).emit("company.message.created", populated);
      }
    }

    res.status(201).json({
      success: true,
      message: "Voice message sent successfully",
      data: populated
    });
  } catch (error) {
    console.error("[CompanyMessage] Error sending voice message:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send voice message" });
  }
};

/**
 * @desc Get / Stream protected voice audio file
 * @route GET /api/company-messages/voice/audio/:filename
 * @access Private (Auth via Bearer token or ?token=)
 */
export const getVoiceAudioStreamController = async (req, res) => {
  try {
    // 1. Authenticate user via header or query parameter
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required to access audio resource" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const authUser = await User.findById(decoded.id).select("-password");
    if (!authUser || !authUser.isActive) {
      return res.status(401).json({ success: false, message: "User unavailable" });
    }

    // 2. Locate audio file
    const rawFilename = req.params.filename;
    const filename = path.basename(rawFilename); // Sanitize traversal
    const filePath = path.join(UPLOADS_VOICE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Audio file not found" });
    }

    // 3. Find message to check tenant isolation & recipient authorization
    const message = await CompanyMessage.findOne({ audioUrl: { $regex: filename } });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message for audio resource not found" });
    }

    // Recipient / Broadcast Authorization Check
    if (message.recipientType === "all_super_admins") {
      const isAuthorizedRole = ["platform-owner", "super-admin", "company-super-admin"].includes(authUser.role);
      const isSender = message.sender.toString() === authUser._id.toString();
      if (!isAuthorizedRole && !isSender) {
        return res.status(403).json({ success: false, message: "Access denied: Message restricted to Super Admins" });
      }
    } else if (message.recipientType === "all_admins") {
      const userCompanyId = await getCompanyIdFromReqUser(authUser);
      if (
        authUser.role !== "platform-owner" &&
        (!userCompanyId || !message.companyId || message.companyId.toString() !== userCompanyId.toString())
      ) {
        return res.status(403).json({ success: false, message: "Access denied: Tenant isolation restriction" });
      }
      const isAdmin = ["super-admin", "company-super-admin", "admin", "regional-admin", "platform-owner"].includes(authUser.role);
      const isSender = message.sender.toString() === authUser._id.toString();
      if (!isAdmin && !isSender) {
        return res.status(403).json({ success: false, message: "Access denied: Broadcast message restricted to company admins" });
      }
    } else {
      // Direct message
      const isSender = message.sender.toString() === authUser._id.toString();
      const isRecipient = message.recipient && message.recipient.toString() === authUser._id.toString();
      const isPlatformOwner = authUser.role === "platform-owner";

      if (!isSender && !isRecipient && !isPlatformOwner) {
        return res.status(403).json({ success: false, message: "Access denied: You are not authorized to view this voice message" });
      }
    }

    // 4. Stream Audio with Range support
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = message.audioMimeType || "audio/webm";

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600"
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600"
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error("[CompanyMessage] Error serving audio stream:", error);
    res.status(500).json({ success: false, message: "Failed to stream audio file" });
  }
};

/**
 * @desc Get company messages / conversations
 * @route GET /api/company-messages
 * @access Private
 */
export const getConversationsController = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const companyId = await getCompanyIdFromReqUser(req.user);

    const { search = "", limit = 50 } = req.query;

    let query;
    if (userRole === "platform-owner") {
      query = {
        $or: [
          { sender: userId },
          { recipient: userId },
          { recipientType: "all_super_admins" }
        ]
      };
    } else if (["super-admin", "company-super-admin"].includes(userRole)) {
      query = {
        $or: [
          { sender: userId },
          { recipient: userId },
          { recipientType: "all_super_admins" },
          ...(companyId ? [{ recipientType: "all_admins", companyId }] : [])
        ]
      };
    } else {
      // Regular admin or user — strictly company-isolated, does NOT see all_super_admins
      if (!companyId) {
        return res.status(200).json({ success: true, data: [] });
      }
      query = {
        companyId,
        $or: [
          { sender: userId },
          { recipient: userId },
          { recipientType: "all_admins" }
        ]
      };
    }

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [{ $or: [{ subject: regex }, { body: regex }] }];
    }

    const messages = await CompanyMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("sender", "fullName email role")
      .populate("recipient", "fullName email role")
      .lean();

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error("[CompanyMessage] Error fetching messages:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch messages" });
  }
};

/**
 * @desc Mark message or conversation thread as read
 * @route PUT /api/company-messages/:id/read
 * @access Private
 */
export const markAsReadController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const message = await CompanyMessage.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.recipientType === "all_admins" || message.recipientType === "all_super_admins") {
      const alreadyRead = message.readBy.some(r => r.userId.toString() === userId.toString());
      if (!alreadyRead) {
        message.readBy.push({ userId, readAt: new Date() });
        await message.save();
      }
    } else {
      if (message.recipient?.toString() === userId.toString()) {
        message.isRead = true;
        await message.save();
      }
    }

    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("[CompanyMessage] Error marking read:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to mark as read" });
  }
};

/**
 * @desc Get unread messages count for logged-in user
 * @route GET /api/company-messages/unread-count
 * @access Private
 */
export const getUnreadCountController = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const companyId = await getCompanyIdFromReqUser(req.user);

    const directUnread = await CompanyMessage.countDocuments({
      recipient: userId,
      isRead: false
    });

    let broadcastUnread = 0;
    if (["super-admin", "company-super-admin"].includes(userRole)) {
      const superBroadcasts = await CompanyMessage.countDocuments({
        recipientType: "all_super_admins",
        sender: { $ne: userId },
        "readBy.userId": { $ne: userId }
      });
      const companyBroadcasts = companyId ? await CompanyMessage.countDocuments({
        companyId,
        recipientType: "all_admins",
        sender: { $ne: userId },
        "readBy.userId": { $ne: userId }
      }) : 0;
      broadcastUnread = superBroadcasts + companyBroadcasts;
    } else if (userRole === "platform-owner") {
      broadcastUnread = 0;
    } else if (companyId) {
      broadcastUnread = await CompanyMessage.countDocuments({
        companyId,
        recipientType: "all_admins",
        sender: { $ne: userId },
        "readBy.userId": { $ne: userId }
      });
    }

    res.status(200).json({
      success: true,
      count: directUnread + broadcastUnread
    });
  } catch (error) {
    console.error("[CompanyMessage] Error getting unread count:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to get unread count" });
  }
};

/**
 * @desc Get company contacts for messaging dropdown
 * @route GET /api/company-messages/contacts
 * @access Private
 */
export const getCompanyContactsController = async (req, res) => {
  try {
    if (req.user.role === "platform-owner") {
      const superAdmins = await User.find({
        _id: { $ne: req.user._id },
        role: { $in: ["super-admin", "company-super-admin"] },
        isActive: { $ne: false }
      })
        .populate("companyId", "name code")
        .select("fullName email role companyId")
        .sort({ fullName: 1 })
        .lean();

      const formatted = superAdmins.map(admin => ({
        ...admin,
        displayName: `${admin.fullName} (${admin.companyId?.name || admin.companyId?.code || "Super Admin"})`
      }));

      return res.status(200).json({ success: true, data: formatted });
    }

    const companyId = await getCompanyIdFromReqUser(req.user);
    if (!companyId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const contacts = await User.find({
      companyId,
      _id: { $ne: req.user._id },
      role: { $in: ["super-admin", "company-super-admin", "admin", "regional-admin"] },
      isActive: { $ne: false }
    })
      .select("fullName email role")
      .sort({ role: 1, fullName: 1 })
      .lean();

    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    console.error("[CompanyMessage] Error fetching contacts:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch contacts" });
  }
};
