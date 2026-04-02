import api from "./api";

/**
 * Service to handle Power Status data controlled by the Admin Dashboard.
 */
export const getPowerStatus = async (feederName) => {
    try {
        const url = feederName ? `power/status?feeder=${encodeURIComponent(feederName)}` : "power/status";
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching power status:", error);
        throw error;
    }
};

/**
 * Admin function to update the Power Status (Used by Dashboard)
 */
export const updatePowerStatus = async (isActive) => {
    try {
        const response = await api.post("admin/power-status", { isActive });
        return response.data;
    } catch (error) {
        console.error("Error updating power status from Admin Dashboard:", error);
        throw error;
    }
};
