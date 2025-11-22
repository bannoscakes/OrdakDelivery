import axios from 'axios';

// API client configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Note: Authentication is handled via HttpOnly cookies
// No need for request interceptor to add Authorization header
// 401 handling is done in AuthContext to properly update state
