import api from "./api";

const BASE = "/company-messages";

/**
 * Send a message (direct or broadcast to all admins)
 * @param {Object} payload - { recipientId?, recipientType, subject?, body, parentId? }
 */
export const sendMessage = async (payload) => {
  // Remove undefined/empty recipientId to satisfy backend validation
  const cleanPayload = { ...payload };
  if (cleanPayload.recipientId === undefined || cleanPayload.recipientId === "") {
    delete cleanPayload.recipientId;
  }
  const res = await api.post(BASE, cleanPayload);
  return res.data;
};

/**
 * Helper to convert Blob to Base64 data string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Send a voice message
 * @param {Object} payload - { recipientId?, recipientType, subject?, body?, parentId?, audioBlob, audioDuration, audioMimeType }
 */
export const sendVoiceMessage = async (payload) => {
  const cleanPayload = { ...payload };
  if (cleanPayload.recipientId === undefined || cleanPayload.recipientId === "") {
    delete cleanPayload.recipientId;
  }

  if (cleanPayload.audioBlob) {
    cleanPayload.audioData = await blobToBase64(cleanPayload.audioBlob);
    delete cleanPayload.audioBlob;
  }

  const res = await api.post(`${BASE}/voice`, cleanPayload);
  return res.data;
};

/**
 * Fetch all messages/conversations for the current user
 * @param {Object} params - { search?, limit? }
 */
export const getMessages = async (params = {}) => {
  try {
    const res = await api.get(BASE, { params });
    return res.data;
  } catch (error) {
    return { success: true, data: [] };
  }
};

/**
 * Mark a message as read
 * @param {string} id - Message ID
 */
export const markAsRead = async (id) => {
  const res = await api.put(`${BASE}/${id}/read`);
  return res.data;
};

/**
 * Get unread message count for badge display
 */
export const getUnreadCount = async () => {
  try {
    const res = await api.get(`${BASE}/unread-count`);
    return res.data;
  } catch (error) {
    return { success: true, count: 0 };
  }
};

/**
 * Get list of company contacts available to message
 */
export const getContacts = async () => {
  try {
    const res = await api.get(`${BASE}/contacts`);
    return res.data;
  } catch (error) {
    return { success: true, data: [] };
  }
};
