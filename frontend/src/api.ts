import axios from 'axios';

export const API = axios.create({
  baseURL: '/api',
});

// Attach Authorization header if JWT token is stored
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
