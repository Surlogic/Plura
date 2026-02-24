import axios from 'axios';
import { clearProfessionalToken } from './session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearProfessionalToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/profesional/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
