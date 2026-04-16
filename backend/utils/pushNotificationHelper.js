import admin from "firebase-admin";

let firebaseApp = null;
let firebaseInitialized = false;

// Lazy-init Firebase Admin SDK — deferred so dotenv has time to load env vars
const getFirebaseApp = () => {
    if (firebaseInitialized) return firebaseApp;
    firebaseInitialized = true;

    try {
        if (!process.env.FIREBASE_PROJECT_ID) {
            console.warn("FIREBASE_PROJECT_ID not found in environment variables. Push notifications will be mocked.");
            return null;
        }

        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log("[Firebase] Admin SDK initialized successfully.");
        return firebaseApp;
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
        return null;
    }
};

/**
 * Sends a push notification to one or more device tokens
 * @param {Array} tokens - FCM device tokens
 * @param {Object} payload - Notification payload { title, body, data }
 */
export const sendPushNotification = async (tokens, { title, body, data = {} }) => {
    const app = getFirebaseApp();
    console.log(`[FCM] Attempting to send notification: "${title}" to ${tokens?.length || 0} tokens.`);

    if (!app || !tokens || tokens.length === 0) {
        if (tokens?.length > 0) {
            console.log(`[FCM MOCK] Sending to ${tokens.length} tokens: ${title} - ${body}`);
        } else {
            console.warn("[FCM] No tokens provided for notification.");
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
            click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`[FCM] Successfully sent ${response.successCount} notifications. Failed: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    console.error(`[FCM] Token failure error:`, resp.error);
                }
            });
            console.warn("[FCM] Failed tokens list:", failedTokens);
        }
        
        return response;
    } catch (error) {
        console.error("[FCM] Critical error sending push notification:", error);
        return null;
    }
};

export default firebaseApp;
