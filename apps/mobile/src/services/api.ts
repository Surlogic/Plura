import axios from 'axios';
import { Platform } from 'react-native';
import { getProfessionalToken } from './session';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return 'http://localhost:3004'; // <-- Para probar en Web en tu PC
  if (Platform.OS === 'android') return 'http://10.0.2.2:3004'; // <-- Para probar en el Emulador Android
  return 'http://localhost:3004'; 
}; // <-- Asegurate de que sea tu IP real

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 5000, // IMPORTANTE: Límite de 5 segundos de espera
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getProfessionalToken();
    // Validamos que el token no sea la palabra "null" ni "undefined"
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;