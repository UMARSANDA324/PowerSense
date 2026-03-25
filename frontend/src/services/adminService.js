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
    const response = await api.get("/admin/profile");
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

  sendCustomNotification: async (notifData) => {
    const response = await api.post("/admin/send-notification", notifData);
    return response.data;
  },

  assignFeedersToAdmin: async (id, feederIds) => {
    const response = await api.put(`/admin/assign-feeders/${id}`, { feederIds });
    return response.data;
  },

  // Location Management
  createState: async (name) => {
    const response = await api.post("/location/state", { name });
    return response.data;
  },

  deleteState: async (id) => {
    const response = await api.delete(`/location/state/${id}`);
    return response.data;
  },

  createLGA: async (lgaData) => {
    const response = await api.post("/location/lga", lgaData);
    return response.data;
  },

  deleteLGA: async (id) => {
    const response = await api.delete(`/location/lga/${id}`);
    return response.data;
  },

  createWard: async (wardData) => {
    const response = await api.post("/location/ward", wardData);
    return response.data;
  },

  deleteWard: async (id) => {
    const response = await api.delete(`/location/ward/${id}`);
    return response.data;
  },

  createFeeder: async (feederData) => {
    const response = await api.post("/location/feeder", feederData);
    return response.data;
  },

  deleteFeeder: async (id) => {
    const response = await api.delete(`/location/feeder/${id}`);
    return response.data;
  },

  updateFeeder: async (id, feederData) => {
    const response = await api.put(`/location/feeder/${id}`, feederData);
    return response.data;
  }
};

export default adminService;
