import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
