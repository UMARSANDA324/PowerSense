import mongoose from "mongoose";

const companyMessageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    recipientType: {
      type: String,
      enum: ["all_admins", "all_super_admins", "direct"],
      default: "direct"
    },
    subject: {
      type: String,
      trim: true,
      default: ""
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyMessage",
      default: null
    },
    messageType: {
      type: String,
      enum: ["text", "voice"],
      default: "text"
    },
    audioUrl: {
      type: String,
      default: null
    },
    audioDuration: {
      type: Number,
      default: null
    },
    audioMimeType: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: null
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String
      }
    ]
  },
  { timestamps: true }
);

companyMessageSchema.index({ companyId: 1, createdAt: -1 });
companyMessageSchema.index({ companyId: 1, recipient: 1, isRead: 1 });

export default mongoose.model("CompanyMessage", companyMessageSchema);
