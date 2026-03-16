import api from './api';

const notificationService = {
  // Get all notifications for current user
  getUserNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Mark a notification as read
  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  // Admin: Send notification
  sendNotification: async (data) => {
    const response = await api.post('/notifications/send', data);
    return response.data;
  }
};

export default notificationService;
