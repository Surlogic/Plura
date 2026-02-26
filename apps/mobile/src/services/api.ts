import axios from 'axios';
import { Platform } from 'react-native';
import { clearProfessionalToken } from './session';
import { router } from 'expo-router';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return 'http://localhost:3004'; // <-- Para probar en Web en tu PC
  if (Platform.OS === 'android') return 'http://10.0.2.2:3004'; // <-- Para probar en el Emulador Android
  return 'http://localhost:3004'; 
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearProfessionalToken();
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;