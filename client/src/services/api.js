import axios from 'axios';

// Build the base URL:
// - In production, VITE_API_URL points to the backend origin (e.g. https://ghummoo-api.onrender.com)
//   so we append /api to reach the correct route prefix.
// - In local dev, the Vite proxy forwards /api to localhost:5000.
const rawUrl = import.meta.env.VITE_API_URL || '';
const baseURL = rawUrl ? `${rawUrl.replace(/\/+$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: unwrap { success, data } envelope from server responses.
// If the response body has a `data` field, return that; otherwise return the whole body.
api.interceptors.response.use(
  (res) => {
    const body = res.data;
    // Standard API envelope: { success: true, data: ... }
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (err) => {
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
