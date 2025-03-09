import axios from 'axios';

const API_BASE_URL = '/api';  // Proxy will handle the base URL

// Sign Up API
export const signUp = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/signup`, data);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Login API
export const login = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/login`, data);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Google Sign-In API
export const googleSignIn = async (idToken, companyName) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/google-signin`, {
            idToken,
            companyName,
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// CSV Bulk Upload API
export const uploadCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/upload-csv`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Get Inventory API
export const getInventory = async (companyName) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/inventory`, {
            params: { companyName },
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Add Inventory Item API
export const addInventoryItem = async (itemData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/add-inventory`, itemData);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Update Inventory Item API
export const updateInventoryItem = async (itemId, updatedData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/update-inventory/${itemId}`, updatedData);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Delete Inventory Item API
export const deleteInventoryItem = async (itemId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/delete-inventory/${itemId}`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Get All Users API (Admin Only)
export const getUsers = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/users`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Get Company Users API (Admin Only)
export const getCompanyUsers = async (companyName) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/company-users`, {
            params: { companyName },
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Assign Role API (Admin Only)
export const assignRole = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/assign-role`, data);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

// Generate Report API
export const generateReport = async (companyName) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reports`, {
            params: { companyName },
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};