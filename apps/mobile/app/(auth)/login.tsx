import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import api from '../../src/services/api';
import { setProfessionalSession } from '../../src/services/session';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { oauthLoginWithAuthorizationCode } from '../../src/services/oauth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { refreshProfile } = useProfessionalProfileContext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  
  // Agregamos un estado para el tipo de login
  const [role, setRole] = useState<'cliente' | 'profesional'>('cliente');

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: 'plura' }),
    [],
  );

  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest({
    androidClientId: googleClientId,
    iosClientId: googleClientId,
    webClientId: googleClientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
  });

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (!googleResponse) return;

      if (googleResponse.type !== 'success') {
        if (googleResponse.type !== 'dismiss' && googleResponse.type !== 'cancel') {
          setErrorMessage('No se pudo completar el acceso con Google.');
        }
        setIsGoogleSubmitting(false);
        return;
      }

      const authorizationCode = googleResponse.params?.code;
      const codeVerifier = googleRequest?.codeVerifier;

      if (!authorizationCode || !codeVerifier) {
        setErrorMessage('No se recibió autorización válida de Google.');
        setIsGoogleSubmitting(false);
        return;
      }

      try {
        const result = await oauthLoginWithAuthorizationCode(
          'google',
          authorizationCode,
          codeVerifier,
          redirectUri,
          {
            desiredRole: role === 'profesional' ? 'PROFESSIONAL' : 'USER',
            authAction: 'LOGIN',
          },
        );

        if (!result.accessToken || !result.refreshToken) {
          setErrorMessage('Google autenticó, pero el backend no devolvió sesion completa.');
          return;
        }

        await setProfessionalSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        await refreshProfile();
        router.replace('/(tabs)/dashboard');
      } catch (error: any) {
        const backendMessage =
          error?.response?.data?.message ||
          (typeof error?.response?.data === 'string' ? error.response.data : null);
        setErrorMessage(backendMessage || 'No se pudo iniciar sesión con Google.');
      } finally {
        setIsGoogleSubmitting(false);
      }
    };

    handleGoogleResponse();
  }, [googleResponse, googleRequest, redirectUri, refreshProfile]);

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!form.email || !form.password) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = role === 'profesional' ? '/auth/login/profesional' : '/auth/login/cliente';
      const response = await api.post(endpoint, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      
      // Intentamos capturar 'token' o 'accessToken'
      const tokenRecibido = response.data.accessToken || response.data.token;
      const refreshTokenRecibido = response.data.refreshToken;

      if (!tokenRecibido || !refreshTokenRecibido) {
        // Si entra acá, es porque el backend está mandando el token con otro nombre
        console.log("Respuesta del backend:", response.data);
        setErrorMessage('Error: El servidor no devolvió una sesion valida.');
        return;
      }

      await setProfessionalSession({
        accessToken: tokenRecibido,
        refreshToken: refreshTokenRecibido,
      });
      await refreshProfile();
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error("Error en login:", error);
      setErrorMessage('Credenciales inválidas o error de servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setErrorMessage('Falta EXPO_PUBLIC_GOOGLE_CLIENT_ID en .env');
      return;
    }

    setErrorMessage(null);
    setIsGoogleSubmitting(true);
    const result = await promptGoogleAuth();

    if (result.type !== 'success') {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="px-6 py-12">
          
          <View className="w-full space-y-6 rounded-[32px] bg-white p-8 shadow-sm">
            
            <View className="space-y-2 mb-2">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                Login
              </Text>
              <Text className="text-3xl font-semibold text-secondary">
                Acceso Plura
              </Text>
            </View>

            {/* Pestañas para elegir el rol */}
            <View className="flex-row rounded-full bg-background p-1 mb-2">
              <TouchableOpacity 
                className={`flex-1 items-center justify-center rounded-full py-2.5 ${role === 'cliente' ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setRole('cliente')}
              >
                <Text className={`font-bold text-sm ${role === 'cliente' ? 'text-secondary' : 'text-gray-400'}`}>Cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 items-center justify-center rounded-full py-2.5 ${role === 'profesional' ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setRole('profesional')}
              >
                <Text className={`font-bold text-sm ${role === 'profesional' ? 'text-secondary' : 'text-gray-400'}`}>Profesional</Text>
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="tucorreo@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Contraseña</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                />
                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity className="mt-3 self-end">
                    <Text className="text-xs font-semibold text-secondary">Olvidé mi contraseña</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {errorMessage && (
                <View className="mt-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity 
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting || isGoogleSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#1FB6A6', '#0E2A47']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 w-full flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Iniciar sesión</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 h-14 w-full items-center justify-center rounded-full border border-secondary/15 bg-white"
                onPress={handleGoogleLogin}
                disabled={!googleRequest || isSubmitting || isGoogleSubmitting}
                activeOpacity={0.8}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator color="#0E2A47" />
                ) : (
                  <Text className="text-base font-semibold text-secondary">
                    Continuar con Google
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-8 flex-row justify-center">
              <Text className="text-sm text-gray-500">¿No tenés cuenta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-sm font-bold text-primary">Crear cuenta</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
