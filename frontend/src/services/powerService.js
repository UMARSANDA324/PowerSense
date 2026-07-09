import api from "./api";
import axios from "axios";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (error) =>
  axios.isAxiosError(error) && !error.response && Boolean(error.request);

/**
 * Service to handle Power Status data controlled by the Admin Dashboard.
 */
export const getPowerStatus = async (feederName, signal) => {
    const url = feederName ? `power/status?feeder=${encodeURIComponent(feederName)}` : "power/status";
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            const response = await api.get(url, { signal });
            return response.data;
        } catch (error) {
            if (axios.isCancel(error) || error.name === "CanceledError" || error.name === "AbortError") {
                throw error;
            }

            const shouldRetry = isNetworkError(error) && attempt < maxAttempts - 1;
            if (!shouldRetry) {
                console.error("Error fetching power status:", error);
                throw error;
            }

            const backoffMs = 500 * (attempt + 1);
            await delay(backoffMs);
        }
    }
};

/**
 * Admin function to update the Power Status (Used by Dashboard)
 */
export const updatePowerStatus = async (statusData) => {
    try {
        const response = await api.post("admin/power-status", statusData);
        return response.data;
    } catch (error) {
        console.error("Error updating power status from Admin Dashboard:", error);
        throw error;
    }
};
