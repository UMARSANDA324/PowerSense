import api from "./api";

/**
 * Service to handle Admin operations
 */
const adminService = {
  getStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  createAdmin: async (adminData) => {
    const response = await api.post("/admin/create-admin", adminData);
    return response.data;
  },

  getLocations: async () => {
    const response = await api.get("/location/all");
    return response.data;
  },

  getAllAdmins: async () => {
    const response = await api.get("/admin/admins");
    return response.data;
  },

  getAllFeeders: async () => {
    const response = await api.get("/admin/all-feeders");
    return response.data;
  },

  updatePowerStatus: async (statusData) => {
    const response = await api.post("/admin/power-status", statusData);
    return response.data;
  },

  getAllReports: async () => {
    const response = await api.get("/reports");
    return response.data;
  },

  updateReportStatus: async (id, status) => {
    const response = await api.put(`/reports/${id}/status`, { status });
    return response.data;
  },

  assignFeedersToAdmin: async (id, feeders) => {
    const response = await api.put(`/admin/assign-feeders/${id}`, { feeders });
    return response.data;
  }
};

export default adminService;
