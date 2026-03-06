import * as SecureStore from 'expo-secure-store';
import { logError, logWarn } from './logger';

const TOKEN_KEY = 'plura_professional_token';

export const getProfessionalToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const setProfessionalToken = async (token: string) => {
  try {
    if (!token) {
      logWarn('session', 'token vacio ignorado');
      return;
    }
    // String() asegura que aunque llegue un número o algo raro, se convierta a texto
    await SecureStore.setItemAsync(TOKEN_KEY, String(token));
  } catch (error) {
    logError('session', 'error guardando token', error);
  }
};

export const clearProfessionalToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    logError('session', 'error borrando token', error);
  }
};