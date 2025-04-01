import axios from "axios";

// Base API URL (Change if needed)
const API_BASE_URL = "/api";

// Helper function to get Auth Token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// AUTHENTICATION APIs

// Signup API
export const signUp = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/signup`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Signup failed");
  }
};

// Login API
export const login = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/login`, data);
    console.log("Login response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Login failed");
  }
};

// Google Sign-In API
export const googleSignIn = async (idToken, additionalData = {}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/google-signin`, {
      idToken,
      ...additionalData,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Google login failed");
  }
};

// Forgot Password API
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Password reset failed");
  }
};

// INVENTORY MANAGEMENT APIs

// Upload CSV for bulk inventory upload
export const uploadCSV = async (file, companyName) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyName", companyName);

    const response = await axios.post(`${API_BASE_URL}/upload-csv`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...getAuthHeaders(),
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "CSV Upload failed");
  }
};

// Get Inventory Items
export const getInventory = async (companyName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory`, {
      params: { companyName },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch inventory");
  }
};

// Add Inventory Item
export const addInventoryItem = async (itemData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/add-inventory`, itemData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to add inventory item");
  }
};

// Update Inventory Item
export const updateInventoryItem = async (itemId, updatedData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/update-inventory/${itemId}`, updatedData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to update inventory item");
  }
};

// Delete Inventory Item
export const deleteInventoryItem = async (itemId, companyName) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/delete-inventory/${itemId}`, {
      params: { companyName },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to delete inventory item");
  }
};

// USER MANAGEMENT APIs (Admin Only)

// Get all users for the admin's company
export const getUsers = async (adminUid, companyName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: { ...getAuthHeaders(), uid: adminUid, companyName },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch users");
  }
};

// Promote a user to Manager
export const promoteUser = async (uid, password, adminUid, companyName) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/users/${uid}/promote`,
      { password },
      { headers: { ...getAuthHeaders(), uid: adminUid, companyName } }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to promote user");
  }
};

// Remove a user from the company
export const removeUser = async (uid, password, adminUid, companyName) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/users/${uid}/remove`, {
      data: { password },
      headers: { ...getAuthHeaders(), uid: adminUid, companyName },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to remove user");
  }
};