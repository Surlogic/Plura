import * as SecureStore from 'expo-secure-store';

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
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error guardando el token', error);
  }
};

export const clearProfessionalToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error borrando el token', error);
  }
};