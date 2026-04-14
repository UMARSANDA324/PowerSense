import api from "./api";

/**
 * Service to handle Authentication logic
 */
export const login = async (email, password) => {
  const response = await api.post("auth/login", { email, password });
  if (response.data.token) {
    const user = response.data.user;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", response.data.token);
  }
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post("auth/register", userData);
  if (response.data.token) {
    const user = response.data.user;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", response.data.token);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr || userStr === "undefined") {
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Failed to parse user from local storage", error);
    return null;
  }
};

export const getCurrentUserFromApi = async () => {
  try {
    const response = await api.get("auth/profile");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user profile from API", error);
    throw error;
  }
};

export const updateProfile = async (userData) => {
  const response = await api.put("auth/profile", userData);
  if (response.data.user || response.data.token) {
    const user = response.data.user || response.data;
    localStorage.setItem("user", JSON.stringify(user));
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
  }
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("auth/forgot-password", { email });
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post("auth/verify-otp", { email, otp });
  return response.data;
};

export const resetPassword = async (email, otp, password) => {
  const response = await api.post("auth/reset-password", { email, otp, password });
  return response.data;
};
