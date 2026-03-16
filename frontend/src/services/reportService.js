import api from "./api";

/**
 * Service to handle Power Issue Reporting
 */

export const reportIssue = async (issueData) => {
  try {
    const response = await api.post("/reports", issueData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to report issue");
  }
};

export const getReports = async () => {
  try {
    const response = await api.get("/reports");
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch reports");
  }
};

export const getReportById = async (reportId) => {
  try {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch report");
  }
};

export const updateReport = async (reportId, updateData) => {
  try {
    const response = await api.put(`/reports/${reportId}`, updateData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update report");
  }
};

export const deleteReport = async (reportId) => {
  try {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete report");
  }
};
