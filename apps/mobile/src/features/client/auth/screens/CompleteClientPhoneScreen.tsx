import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { useClientSession } from '../../session/useClientSession';
import { hasMinimumPhoneDigits } from '../../../../lib/internationalPhone';
import {
  completeOAuthPhone,
  confirmRegistrationPhoneVerification,
  sendRegistrationPhoneVerification,
} from '../../../../services/authBackend';
import { getApiErrorMessage } from '../../../../services/errors';
import InternationalPhoneField from '../../../../components/ui/InternationalPhoneField';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import { theme } from '../../../../theme';
import { clientAuthCopy, continueAfterClientAuth } from '../config';

export function CompleteClientPhoneScreen() {
  const { refreshProfile } = useClientSession();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [isConfirmingPhoneCode, setIsConfirmingPhoneCode] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null);

  const handleSendPhoneCode = async () => {
    setErrorMessage(null);
    setPhoneVerificationMessage(null);
    try {
      setIsSendingPhoneCode(true);
      const response = await sendRegistrationPhoneVerification(phoneNumber.trim());
      setPhoneVerificationMessage(response.message);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos enviar el codigo.'));
    } finally {
      setIsSendingPhoneCode(false);
    }
  };

  const handleConfirmPhoneCode = async () => {
    setErrorMessage(null);
    try {
      setIsConfirmingPhoneCode(true);
      const response = await confirmRegistrationPhoneVerification(phoneNumber.trim(), phoneVerificationCode.trim());
      setPhoneVerificationToken(response.verificationToken);
      setPhoneVerificationMessage('Telefono verificado correctamente.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos verificar el codigo.'));
    } finally {
      setIsConfirmingPhoneCode(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido para continuar.');
      return;
    }

    if (!phoneVerificationToken) {
      setErrorMessage('Verifica tu telefono antes de continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await completeOAuthPhone(phoneNumber.trim(), phoneVerificationToken);
      await refreshProfile();
      await continueAfterClientAuth();
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
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[30px] px-6 py-6"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
                Ultimo paso
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-secondary">
                Completa tu telefono
              </Text>
              <Text className="mt-2 text-sm leading-6 text-secondary/80">
                Antes de entrar necesitamos guardar un numero para validaciones y recuperacion de acceso.
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                {clientAuthCopy.badge}
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
                onChange={(value) => {
                  setPhoneNumber(value);
                  setPhoneVerificationCode('');
                  setPhoneVerificationToken('');
                  setPhoneVerificationMessage(null);
                }}
                placeholder="11 2345 6789"
                helperText="Se guarda en formato internacional para login social y recuperacion."
              />

              <View className="mt-4 flex-row" style={{ gap: 8 }}>
                <TextInput
                  className="h-12 flex-1 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="Codigo SMS"
                  keyboardType="number-pad"
                  value={phoneVerificationCode}
                  onChangeText={setPhoneVerificationCode}
                  maxLength={10}
                />
                <TouchableOpacity
                  className="h-12 items-center justify-center rounded-2xl border border-secondary/10 px-4"
                  onPress={() => void (phoneVerificationCode ? handleConfirmPhoneCode() : handleSendPhoneCode())}
                  disabled={isSendingPhoneCode || isConfirmingPhoneCode || Boolean(phoneVerificationToken)}
                >
                  <Text className="text-xs font-semibold text-secondary">
                    {phoneVerificationToken
                      ? 'Verificado'
                      : phoneVerificationCode
                        ? isConfirmingPhoneCode
                          ? 'Verificando...'
                          : 'Confirmar'
                        : isSendingPhoneCode
                          ? 'Enviando...'
                          : 'Enviar OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
              {phoneVerificationMessage ? (
                <Text className="mt-2 text-xs font-semibold text-emerald-700">{phoneVerificationMessage}</Text>
              ) : null}

              {errorMessage ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting || !phoneVerificationToken}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={theme.gradients.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-secondary">Guardar y continuar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Link href={clientAuthCopy.loginRoute} asChild>
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
        description="Registrando el telefono de tu cuenta cliente."
      />
    </>
  );
}
