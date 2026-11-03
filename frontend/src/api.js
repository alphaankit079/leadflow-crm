import axios from 'axios';

const api = axios.create({
  baseURL: 'https://leadflow-crm-rhhq.onrender.com/api',
});

// Har request ke saath JWT Token automatically bhejne ke liye
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;