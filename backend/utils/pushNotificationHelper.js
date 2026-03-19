import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin SDK
// Note: In production, you should use a service account key JSON file
// For this environment, we'll check for environment variables or a placeholder
const initializeFirebase = () => {
    try {
        if (!process.env.FIREBASE_PROJECT_ID) {
            console.warn("FIREBASE_PROJECT_ID not found in environment variables. Push notifications will be mocked.");
            return null;
        }

        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
        return null;
    }
};

const firebaseApp = initializeFirebase();

/**
 * Sends a push notification to one or more device tokens
 * @param {Array} tokens - FCM device tokens
 * @param {Object} payload - Notification payload { title, body, data }
 */
export const sendPushNotification = async (tokens, { title, body, data = {} }) => {
    if (!firebaseApp || !tokens || tokens.length === 0) {
        if (tokens?.length > 0) {
            console.log(`[FCM MOCK] Sending to ${tokens.length} tokens: ${title} - ${body}`);
        }
        return null;
    }

    const message = {
        notification: {
            title,
            body,
        },
        data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK", // For mobile apps if applicable
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`Successfully sent ${response.successCount} push notifications.`);
        
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.warn("Failed tokens:", failedTokens);
        }
        
        return response;
    } catch (error) {
        console.error("Error sending push notification:", error);
        return null;
    }
};

export default firebaseApp;
