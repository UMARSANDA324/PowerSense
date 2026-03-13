import api from "./api";

/**
 * Service to handle Power Status data controlled by the Admin Dashboard.
 */
export const getPowerStatus = async () => {
    try {
        // In a real scenario, this endpoint will be updated by the Admin Dashboard.
        // For now, we return a mock that's ready to be replaced by the API call.
        const response = await api.get("/power/status");
        return response.data;
    } catch (error) {
        console.error("Error fetching power status from Admin system:", error);
        
        // Fallback mock data for development
        return {
            isActive: true,
            lastUpdated: "Just Now",
            estimatedNextOutage: "3PM",
            message: "Power status is currently synced with Admin Dashboard",
            location: "Kano Metro"
        };
    }
};

/**
 * Admin function to update the Power Status (Used by Dashboard)
 */
export const updatePowerStatus = async (isActive) => {
    try {
        const response = await api.post("/admin/power/status", { isActive });
        return response.data;
    } catch (error) {
        console.error("Error updating power status from Admin Dashboard:", error);
        throw error;
    }
};
