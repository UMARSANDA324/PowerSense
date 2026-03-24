import Notification from "../models/Notification.js";
import User from "../models/UserModel.js";
import sendEmail from "./sendEmail.js";
import { sendPushNotification } from "./pushNotificationHelper.js";
import Feeder from "../models/Location/Feeder.js";
import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";
import mongoose from "mongoose";

/**
 * Helper to check if a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Sends a notification to multiple users based on their preferences
 * @param {Object} options - Notification options
 * @param {Array} options.userIds - IDs of users to notify
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {Object} options.io - Socket.io instance
 * @param {Object} options.sender - Sender ID
 * @param {Object} options.targetArea - Target area details (state, lga, ward, feeder)
 * @param {Boolean} options.isCustom - Whether it's a custom message
 */
export const sendBulkNotifications = async ({
    userIds,
    title,
    message,
    io,
    sender,
    targetArea,
    isCustom = false
}) => {
    try {
        const users = await User.find({ _id: { $in: userIds } });

        // Format message if it's a custom admin message
        const formattedMessage = isCustom 
            ? `PowerSense Notification:\nWe would like to inform you that:\n${message}`
            : message;

        const notificationPromises = users.map(async (user) => {
            let preference = user.notificationPreference || "in-app";

            // Map old preferences to new supported ones to avoid ValidationErrors
            if (preference === "phone") preference = "in-app";
            if (preference === "sms") preference = "push";

            if (preference === "off") return null;

            // Create notification record in database
            const notification = await Notification.create({
                user: user._id,
                title,
                message: formattedMessage,
                method: preference,
                sender,
                targetArea,
                isCustom
            });

            // Handle real-time delivery via Socket.io
            if (io && (preference === "in-app" || preference === "email" || preference === "push")) {
                // We emit to user-specific room
                io.to(`user_${user._id}`).emit("newNotification", notification.toObject());
            }

            // Handle Email delivery
            if (preference === "email" && user.email) {
                try {
                    await sendEmail({
                        email: user.email,
                        subject: title,
                        message: formattedMessage
                    });
                } catch (err) {
                    console.error(`Failed to send email to ${user.email}:`, err);
                }
            }

            // Handle Push delivery via FCM
            if (preference === "push" && user.deviceTokens?.length > 0) {
                try {
                    const tokens = user.deviceTokens.map(dt => dt.token);
                    await sendPushNotification(tokens, {
                        title: title,
                        body: formattedMessage,
                        data: {
                            notificationId: notification._id.toString(),
                            type: isCustom ? "announcement" : "system"
                        }
                    });
                } catch (err) {
                    console.error(`Failed to send push notification to user ${user._id}:`, err);
                }
            }

            return notification;
        });

        return await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error in sendBulkNotifications:", error);
        throw error;
    }
};

/**
 * Sends a notification to all users in a specific area
 */
export const notifyArea = async ({
    state,
    lga,
    ward,
    feeder,
    title,
    message,
    io,
    sender,
    isCustom = false
}) => {
    try {
        const query = {};
        
        // Resolve names if IDs are provided, as User model stores location names as strings
        if (state) {
            if (isValidObjectId(state)) {
                const stateDoc = await State.findById(state);
                if (stateDoc) query.state = stateDoc.name;
            } else {
                query.state = state;
            }
        }
        
        if (lga) {
            if (isValidObjectId(lga)) {
                const lgaDoc = await LGA.findById(lga);
                if (lgaDoc) query.lga = lgaDoc.name;
            } else {
                query.lga = lga;
            }
        }
        
        if (ward) {
            if (isValidObjectId(ward)) {
                const wardDoc = await Ward.findById(ward);
                if (wardDoc) query.ward = wardDoc.name;
            } else {
                query.ward = ward;
            }
        }
        
        if (feeder) {
            if (isValidObjectId(feeder)) {
                const feederDoc = await Feeder.findById(feeder).populate({
                    path: 'wards',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                });
                if (feederDoc) {
                    query.feeder = feederDoc.name;
                    // Note: We don't restrict query.ward here because a feeder can cover multiple wards.
                    // If we set query.ward = name, it would only find users in ONE of the wards.
                    // By only setting query.feeder, we find all users linked to this feeder name.
                }
            } else {
                query.feeder = feeder;
            }
        }

        const users = await User.find(query).select("_id notificationPreference email phone deviceTokens");
        const userIds = users.map(u => u._id);

        if (userIds.length === 0) return [];

        return await sendBulkNotifications({
            userIds,
            title,
            message,
            io,
            sender,
            targetArea: { 
                state: query.state || state, 
                lga: query.lga || lga, 
                ward: query.ward || ward, 
                feeder: query.feeder || feeder 
            },
            isCustom
        });
    } catch (error) {
        console.error("Error in notifyArea:", error);
        throw error;
    }
};
