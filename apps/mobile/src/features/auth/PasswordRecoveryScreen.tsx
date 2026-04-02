import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AuthLoadingOverlay from '../../components/auth/AuthLoadingOverlay';
import InternationalPhoneField from '../../components/ui/InternationalPhoneField';
import { AppScreen, surfaceStyles } from '../../components/ui/AppScreen';
import { hasMinimumPhoneDigits } from '../../lib/internationalPhone';
import {
  confirmPasswordRecovery,
  startPasswordRecovery,
  verifyPasswordRecoveryPhone,
} from '../../services/authBackend';
import { getApiErrorMessage } from '../../services/errors';
import { resolveLoginRouteFromBackendRole } from './config';
import { theme } from '../../theme';

type RecoveryStep = 'email' | 'phone' | 'code';

export function PasswordRecoveryScreen() {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitPhoneStep = hasMinimumPhoneDigits(phoneNumber);
  const canSubmitCodeStep = useMemo(() => {
    return (
      challengeId.trim().length > 0
      && code.trim().length > 0
      && newPassword.length >= 8
      && confirmPassword.length >= 8
    );
  }, [challengeId, code, newPassword, confirmPassword]);

  const resetFeedback = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const handleEmailSubmit = async () => {
    resetFeedback();

    if (!email.trim()) {
      setErrorMessage('Ingresa tu email para comenzar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await startPasswordRecovery(email.trim().toLowerCase());
      setMessage(response.message);
      setStep('phone');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo iniciar la recuperacion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async () => {
    resetFeedback();

    if (!canSubmitPhoneStep) {
      setErrorMessage('Ingresa un telefono valido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await verifyPasswordRecoveryPhone(
        email.trim().toLowerCase(),
        phoneNumber.trim(),
      );
      setChallengeId(response.challengeId);
      setMaskedDestination(response.maskedDestination);
      setMessage(`Te enviamos un codigo a ${response.maskedDestination}.`);
      setStep('code');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos validar email y telefono.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    resetFeedback();

    if (newPassword.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await confirmPasswordRecovery({
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        challengeId: challengeId.trim(),
        code: code.trim(),
        newPassword,
        confirmPassword,
      });
      router.replace(resolveLoginRouteFromBackendRole(response.role));
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos completar la recuperacion.'));
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
          contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <LinearGradient
            colors={theme.gradients.heroElevated}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[30px] px-6 py-6"
          >
            <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
              Recuperar acceso
            </Text>
            <Text className="mt-3 text-3xl font-semibold text-white">
              Restablecer contrasena
            </Text>
            <Text className="mt-2 text-sm leading-6 text-white/80">
              Validamos email, telefono y luego el codigo enviado por email, igual que en web.
            </Text>
          </LinearGradient>

          <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
            <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
              Paso {step === 'email' ? '1' : step === 'phone' ? '2' : '3'} de 3
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-secondary">
              {step === 'email'
                ? 'Confirmar email'
                : step === 'phone'
                  ? 'Validar telefono'
                  : 'Ingresar codigo'}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-muted">
              {step === 'email'
                ? 'Primero buscamos una cuenta recuperable para ese email.'
                : step === 'phone'
                  ? 'Ahora valida el telefono asociado a la cuenta.'
                  : 'Por ultimo ingresa el codigo y define la nueva contrasena.'}
            </Text>

            {step === 'email' ? (
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                  placeholder="tucorreo@gmail.com"
                  placeholderTextColor={theme.colors.inkFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            ) : null}

            {step === 'phone' ? (
              <>
                <View className="mt-6">
                  <Text className="mb-2 text-sm font-medium text-secondary">Email confirmado</Text>
                  <TextInput
                    className="h-14 rounded-[16px] border border-secondary/10 bg-slate-50 px-5 text-base text-secondary"
                    value={email}
                    editable={false}
                  />
                </View>

                <InternationalPhoneField
                  label="Telefono"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="11 2345 6789"
                  helperText="Selecciona el pais y escribe el numero sin repetir el codigo internacional."
                />
              </>
            ) : null}

            {step === 'code' ? (
              <>
                <View className="mt-6">
                  <Text className="mb-2 text-sm font-medium text-secondary">Codigo</Text>
                  <TextInput
                    className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                    placeholder={maskedDestination ? `Codigo enviado a ${maskedDestination}` : 'Ingresa el codigo'}
                    placeholderTextColor={theme.colors.inkFaint}
                    autoCapitalize="none"
                    value={code}
                    onChangeText={setCode}
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-secondary">Nueva contrasena</Text>
                  <TextInput
                    className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                    placeholder="Al menos 8 caracteres"
                    placeholderTextColor={theme.colors.inkFaint}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-secondary">Confirmar contrasena</Text>
                  <TextInput
                    className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                    placeholder="Repite la contrasena"
                    placeholderTextColor={theme.colors.inkFaint}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </>
            ) : null}

            {message ? (
              <View className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <Text className="text-center text-xs text-emerald-700">{message}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              className="mt-6 shadow-md"
              onPress={
                step === 'email'
                  ? handleEmailSubmit
                  : step === 'phone'
                    ? handlePhoneSubmit
                    : handleConfirmSubmit
              }
              disabled={
                isSubmitting
                || (step === 'phone' && !canSubmitPhoneStep)
                || (step === 'code' && !canSubmitCodeStep)
              }
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.gradients.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-14 flex-row items-center justify-center rounded-full"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    {step === 'email'
                      ? 'Continuar'
                      : step === 'phone'
                        ? 'Validar y enviar codigo'
                        : 'Guardar nueva contrasena'}
                  </Text>
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

      <AuthLoadingOverlay
        visible={isSubmitting}
        title="Recuperando acceso"
        description={
          step === 'email'
            ? 'Validando el email de tu cuenta.'
            : step === 'phone'
              ? 'Verificando el telefono y enviando el codigo.'
              : 'Guardando tu nueva contrasena.'
        }
      />
    </>
  );
}
