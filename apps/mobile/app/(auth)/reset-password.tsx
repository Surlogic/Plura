import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/services/errors';
import { AppScreen, surfaceStyles } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';

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
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/password/reset', {
        token: token.trim(),
        newPassword: password,
      });
      setMessage('La contrasena fue actualizada. Inicia sesion nuevamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo restablecer la contrasena.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <AppScreen
        scroll
        contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
        scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
      >
        <LinearGradient
          colors={theme.gradients.heroElevated}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[30px] px-6 py-6"
        >
          <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">Token unico</Text>
          <Text className="mt-3 text-3xl font-semibold text-white">Nueva contrasena</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">
            Pega el token recibido y define una nueva contrasena segura.
          </Text>
        </LinearGradient>

        <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
          <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">Actualizar acceso</Text>
          <Text className="mt-2 text-2xl font-semibold text-secondary">Guardar nueva contrasena</Text>

          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-secondary">Token</Text>
            <TextInput
              className="h-14 w-full rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
              placeholder="Token de recuperacion"
              placeholderTextColor={theme.colors.inkFaint}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-secondary">Nueva contrasena</Text>
            <TextInput
              className="h-14 w-full rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
              placeholder="Al menos 8 caracteres"
              placeholderTextColor={theme.colors.inkFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-secondary">Confirmar contrasena</Text>
            <TextInput
              className="h-14 w-full rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
              placeholder="Repite la contrasena"
              placeholderTextColor={theme.colors.inkFaint}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {message ? (
            <View className="mt-4 rounded-xl bg-emerald-50 p-3">
              <Text className="text-center text-xs text-emerald-700">{message}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="mt-4 rounded-xl bg-red-50 p-3">
              <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            className="mt-6 shadow-md"
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 items-center justify-center rounded-full"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">Guardar nueva contrasena</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="mt-5 items-center">
              <Text className="text-sm font-semibold text-secondary">Volver a iniciar sesion</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}
