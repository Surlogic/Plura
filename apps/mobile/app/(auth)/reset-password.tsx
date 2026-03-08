import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/services/errors';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const initialToken = useMemo(() => {
    if (Array.isArray(params.token)) return params.token[0] ?? '';
    return params.token ?? '';
  }, [params.token]);

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setMessage(null);
    setErrorMessage(null);
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/password/reset', {
        token: token.trim(),
        newPassword: password,
      });
      setMessage('La contraseña fue actualizada. Inicia sesión nuevamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo restablecer la contraseña.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="px-6 py-12">
          <View className="w-full rounded-[32px] bg-white p-8 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Token único</Text>
            <Text className="mt-2 text-3xl font-semibold text-secondary">Nueva contraseña</Text>
            <Text className="mt-2 text-sm text-gray-500">
              Pega el token recibido y define una nueva contraseña.
            </Text>

            <View className="mt-6 space-y-4">
              <View>
                <Text className="mb-2 text-sm font-medium text-secondary">Token</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="Token de recuperación"
                  placeholderTextColor="#9CA3AF"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Nueva contraseña</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="Al menos 8 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Confirmar contraseña</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="Repite la contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {message ? (
              <View className="mt-4 rounded-xl bg-emerald-50 p-3">
                <Text className="text-xs text-emerald-700 text-center">{message}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="mt-4 rounded-xl bg-red-50 p-3">
                <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              className="mt-6 shadow-md"
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1FB6A6', '#0E2A47']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-14 items-center justify-center rounded-full"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold text-white">Guardar nueva contraseña</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="mt-5 items-center">
                <Text className="text-sm font-semibold text-secondary">Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
