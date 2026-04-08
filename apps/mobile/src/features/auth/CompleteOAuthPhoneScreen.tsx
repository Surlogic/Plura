import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AuthLoadingOverlay from '../../components/auth/AuthLoadingOverlay';
import { useAuthSession } from '../../context/auth/AuthSessionContext';
import { hasMinimumPhoneDigits } from '../../lib/internationalPhone';
import { completeOAuthPhone } from '../../services/authBackend';
import { getApiErrorMessage } from '../../services/errors';
import InternationalPhoneField from '../../components/ui/InternationalPhoneField';
import { AppScreen, surfaceStyles } from '../../components/ui/AppScreen';
import { authRoleCopy, continueAfterAuth, type AuthRole } from './config';
import { theme } from '../../theme';

type CompleteOAuthPhoneScreenProps = {
  role: AuthRole;
};

export function CompleteOAuthPhoneScreen({ role }: CompleteOAuthPhoneScreenProps) {
  const copy = authRoleCopy[role];
  const { refreshProfile } = useAuthSession();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await completeOAuthPhone(phoneNumber.trim());
      await refreshProfile();
      await continueAfterAuth(role);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos guardar tu telefono.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <AppScreen
          scroll
          contentContainerStyle={{ justifyContent: 'center', paddingVertical: 32 }}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <View className="px-6">
            <LinearGradient
              colors={role === 'cliente' ? theme.gradients.brand : theme.gradients.heroElevated}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[30px] px-6 py-6"
            >
              <Text className={`text-xs font-bold uppercase tracking-[2px] ${role === 'cliente' ? 'text-secondary/70' : 'text-white/70'}`}>
                Ultimo paso
              </Text>
              <Text className={`mt-3 text-3xl font-semibold ${role === 'cliente' ? 'text-secondary' : 'text-white'}`}>
                Completa tu telefono
              </Text>
              <Text className={`mt-2 text-sm leading-6 ${role === 'cliente' ? 'text-secondary/80' : 'text-white/80'}`}>
                Antes de entrar necesitamos guardar un numero para validaciones y recuperacion de acceso.
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                {copy.badge}
              </Text>
              <Text className="mt-2 text-2xl font-semibold text-secondary">
                Guardar telefono
              </Text>
              <Text className="mt-2 text-sm leading-6 text-muted">
                Elige tu pais y escribe el numero sin repetir el codigo internacional.
              </Text>

              <InternationalPhoneField
                label="Telefono"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="11 2345 6789"
                helperText="Se guarda en formato internacional para login social y recuperacion."
              />

              {errorMessage ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={role === 'cliente' ? theme.gradients.brand : theme.gradients.hero}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className={`text-base font-semibold ${role === 'cliente' ? 'text-secondary' : 'text-white'}`}>
                      Guardar y continuar
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Link href={copy.loginRoute} asChild>
                <TouchableOpacity className="mt-5 items-center">
                  <Text className="text-sm font-semibold text-secondary">Volver al acceso</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={isSubmitting}
        title="Guardando telefono"
        description={`Registrando el telefono de tu cuenta ${copy.label}.`}
      />
    </>
  );
}
