import axios from 'axios';
import { clearProfessionalToken } from './session';
import { router } from 'expo-router';

// Para el emulador de Android usa 10.0.2.2 en lugar de localhost
// Para iOS o dispositivo físico en la misma red, usa la IP de tu computadora (ej. 192.168.1.X)
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3004'; 

const api = axios.create({
  baseURL,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearProfessionalToken();
      // Redirigir al login en caso de sesión expirada usando Expo Router
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;