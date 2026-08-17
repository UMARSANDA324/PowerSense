/**
 * companyService.js
 * Frontend service layer for Platform Owner company management API calls.
 * Task 7 — Frontend Company Service
 */

import api from "./api";

const handleApiError = (error) => {
    const message = error?.response?.data?.message || error?.message || "Request failed";
    throw new Error(message);
};

/**
 * Fetch platform dashboard stats (Task 9)
 */
export const fetchCompanyStats = async () => {
    try {
        const response = await api.get("/companies/platform/stats");
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Fetch paginated company registry with search, filters and sorting (Tasks 2, 8)
 */
export const fetchCompanies = async (params = {}) => {
    try {
        const query = new URLSearchParams();
        if (params.page) query.set("page", params.page);
        if (params.limit) query.set("limit", params.limit);
        if (params.search) query.set("search", params.search);
        if (params.status) query.set("status", params.status);
        if (params.state) query.set("state", params.state);
        if (params.country) query.set("country", params.country);
        if (params.sortBy) query.set("sortBy", params.sortBy);
        if (params.sortOrder) query.set("sortOrder", params.sortOrder);

        const response = await api.get(`/companies?${query.toString()}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Fetch single company by ID (Task 4)
 */
export const fetchCompanyById = async (id) => {
    try {
        const response = await api.get(`/companies/${id}`);
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Create a new company (Task 3)
 */
export const createCompany = async (companyData) => {
    try {
        const response = await api.post("/companies", companyData);
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Update company by ID (Task 5)
 */
export const updateCompany = async (id, updateData) => {
    try {
        const response = await api.put(`/companies/${id}`, updateData);
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Update company logo
 */
export const updateCompanyLogo = async (id, logo) => {
    try {
        const response = await api.put(`/companies/${id}/logo`, { logo });
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Suspend a company (Task 6)
 */
export const suspendCompany = async (id, reason) => {
    try {
        const response = await api.patch(`/companies/${id}/status`, { status: "suspended", reason });
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Activate (reactivate) a company (Task 7)
 */
export const activateCompany = async (id) => {
    try {
        const response = await api.patch(`/companies/${id}/status`, { status: "active", reason: "" });
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

/**
 * Search companies (Task 8)
 */
export const searchCompanies = async (term) => {
    try {
        const response = await api.get(`/companies/search/${encodeURIComponent(term)}`);
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const provisionCompanySuperAdmin = async (companyId, payload) => {
    try {
        const response = await api.post(`/companies/${companyId}/provision-super-admin`, payload);
        return response.data.data;
    } catch (error) {
        return handleApiError(error);
    }
};
