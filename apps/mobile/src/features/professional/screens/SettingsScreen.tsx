import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Switch, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import {
  getClientPreferences,
  updateClientPreferences,
} from '../../../services/clientFeatures';
import api from '../../../services/api';
import EmailVerificationCard from '../../../components/auth/EmailVerificationCard';
import { useAuthSession } from '../../../context/auth/AuthSessionContext';
import { getApiErrorMessage } from '../../../services/errors';
import {
  getProfessionalBookingPolicy,
  updateProfessionalBookingPolicy,
} from '../../../services/bookingPolicy';
import type { ProfessionalBookingPolicy } from '../../../types/bookings';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { AppScreen } from '../../../components/ui/AppScreen';
import { ActionButton, ScreenHero, SectionCard } from '../../../components/ui/MobileSurface';

type Preferences = {
  emailReminders: boolean;
  pushReminders: boolean;
  marketing: boolean;
};

export default function SettingsScreen() {
  const { role, profile, clientProfile, refreshProfile, logout } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSendingDeleteChallenge, setIsSendingDeleteChallenge] = useState(false);
  const [deleteChallengeId, setDeleteChallengeId] = useState<string | null>(null);
  const [deleteChallengeCode, setDeleteChallengeCode] = useState('');
  const [deleteChallengeMessage, setDeleteChallengeMessage] = useState<string | null>(null);
  const [deleteChallengeError, setDeleteChallengeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isSendingPhoneVerification, setIsSendingPhoneVerification] = useState(false);
  const [isConfirmingPhoneVerification, setIsConfirmingPhoneVerification] = useState(false);
  const [bookingPolicy, setBookingPolicy] = useState<ProfessionalBookingPolicy | null>(null);
  const [isLoadingBookingPolicy, setIsLoadingBookingPolicy] = useState(false);
  const [isSavingBookingPolicy, setIsSavingBookingPolicy] = useState(false);
  const [bookingPolicyMessage, setBookingPolicyMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    emailReminders: true,
    pushReminders: false,
    marketing: false,
  });
  const {
    settings: pushSettings,
    requestPermission: requestPushPermission,
    disablePush,
  } = usePushNotifications();

  const currentEmail = role === 'professional' ? profile?.email : clientProfile?.email;
  const emailVerified = role === 'professional'
    ? Boolean(profile?.emailVerified)
    : Boolean(clientProfile?.emailVerified);
  const currentPhone = role === 'professional' ? profile?.phoneNumber : clientProfile?.phoneNumber;
  const phoneVerified = role === 'professional'
    ? Boolean(profile?.phoneVerified)
    : Boolean(clientProfile?.phoneVerified);

  useEffect(() => {
    const load = async () => {
      const next = await getClientPreferences();
      setPreferences(next);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    setPreferences((current) => ({
      ...current,
      pushReminders: pushSettings.pushReminders,
    }));
  }, [pushSettings.pushReminders]);

  useEffect(() => {
    const loadPolicy = async () => {
      if (role !== 'professional') return;
      setIsLoadingBookingPolicy(true);
      try {
        const policy = await getProfessionalBookingPolicy();
        setBookingPolicy(policy);
      } catch (error) {
        setBookingPolicyMessage(getApiErrorMessage(error, 'No se pudo cargar la politica de reservas.'));
      } finally {
        setIsLoadingBookingPolicy(false);
      }
    };

    void loadPolicy();
  }, [role]);

  const toggle = async (key: keyof Preferences) => {
    if (key === 'pushReminders') {
      if (preferences.pushReminders) {
        const next = await disablePush();
        setPreferences((current) => ({ ...current, pushReminders: next.pushReminders }));
        return;
      }

      const next = await requestPushPermission();
      setPreferences((current) => ({ ...current, pushReminders: next.pushReminders }));

      if (!next.pushReminders) {
        if (next.permissionStatus === 'denied' && !next.canAskAgain) {
          Alert.alert(
            'Notificaciones bloqueadas',
            'Activalas desde los ajustes del dispositivo para recibir avisos de reservas y promos.',
            [
              { text: 'Ahora no', style: 'cancel' },
              {
                text: 'Abrir ajustes',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
          return;
        }

        Alert.alert(
          'Permiso pendiente',
          'Necesitamos permiso del sistema para enviarte avisos de reservas y notificaciones importantes.',
        );
      }

      return;
    }

    const next = await updateClientPreferences({ [key]: !preferences[key] });
    setPreferences(next);
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;
    if (!deleteChallengeId || !deleteChallengeCode.trim()) {
      setDeleteChallengeError('Primero solicitá el challenge e ingresá el código recibido.');
      return;
    }
    const description = role === 'professional'
      ? 'Si tienes una suscripcion activa, se dara de baja antes de eliminar tu cuenta.'
      : 'Se cancelaran tus proximas reservas antes de eliminar tu cuenta.';

    Alert.alert(
      'Eliminar cuenta',
      `${description} Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await api.delete('/auth/me', {
                data: {
                  challengeId: deleteChallengeId,
                  code: deleteChallengeCode.trim(),
                },
              });
              await logout();
            } catch (error) {
              Alert.alert(
                'No se pudo eliminar la cuenta',
                getApiErrorMessage(error, 'Intenta nuevamente en unos minutos.'),
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const handleSendDeleteChallenge = async (channel: 'EMAIL' | 'SMS') => {
    if (isSendingDeleteChallenge) return;
    setDeleteChallengeMessage(null);
    setDeleteChallengeError(null);

    try {
      setIsSendingDeleteChallenge(true);
      const response = await api.post<{ challengeId: string; expiresAt: string; maskedDestination: string }>(
        '/auth/challenge/send',
        {
          purpose: 'ACCOUNT_DELETION',
          channel,
        },
      );
      setDeleteChallengeId(response.data.challengeId);
      setDeleteChallengeMessage(
        `Código enviado por ${channel === 'EMAIL' ? 'email' : 'SMS'} a ${response.data.maskedDestination}.`,
      );
    } catch (error) {
      setDeleteChallengeError(
        getApiErrorMessage(error, 'No se pudo enviar el challenge de eliminación.'),
      );
    } finally {
      setIsSendingDeleteChallenge(false);
    }
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.post('/auth/password/change', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage('Contraseña actualizada. Inicia sesión nuevamente.');
      await logout();
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (isSendingPhoneVerification || !currentPhone) return;
    setPhoneVerificationMessage(null);
    setPhoneVerificationError(null);

    try {
      setIsSendingPhoneVerification(true);
      const response = await api.post<{ message: string; cooldownSeconds?: number | null }>(
        '/auth/verify/phone/send',
        {},
      );
      const suffix = response.data.cooldownSeconds && response.data.cooldownSeconds > 0
        ? ` Podés reenviar en ${response.data.cooldownSeconds}s.`
        : '';
      setPhoneVerificationMessage(`${response.data.message}${suffix}`);
      await refreshProfile();
    } catch (error) {
      setPhoneVerificationError(getApiErrorMessage(error, 'No se pudo enviar el OTP.'));
    } finally {
      setIsSendingPhoneVerification(false);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    if (isConfirmingPhoneVerification || !currentPhone) return;
    setPhoneVerificationMessage(null);
    setPhoneVerificationError(null);

    try {
      setIsConfirmingPhoneVerification(true);
      await api.post('/auth/verify/phone/confirm', {
        code: phoneVerificationCode.trim(),
      });
      setPhoneVerificationCode('');
      setPhoneVerificationMessage('Teléfono verificado correctamente.');
      await refreshProfile();
    } catch (error) {
      setPhoneVerificationError(getApiErrorMessage(error, 'No se pudo verificar el OTP.'));
    } finally {
      setIsConfirmingPhoneVerification(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#0A7A43" />
      </View>
    );
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 144 }}>
        <ScreenHero
          eyebrow="Configuracion"
          title="Cuenta y seguridad"
          description="Ajusta recordatorios, verificaciones y politicas con una interfaz mas clara."
          icon="settings-outline"
          badges={[
            { label: role === 'professional' ? 'Perfil profesional' : 'Perfil cliente', tone: 'light' },
            { label: pushSettings.pushReminders ? 'Push activo' : 'Push pendiente', tone: 'light' },
          ]}
        />

        <SectionCard style={{ marginTop: 24 }}>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Sesion</Text>
          <Text className="mt-2 text-sm leading-6 text-gray-500">
            Cierra la sesion actual de este dispositivo y vuelve al acceso correspondiente segun tu rol.
          </Text>
          <ActionButton
            label="Cerrar sesion"
            tone="danger"
            onPress={() => {
              void logout();
            }}
            style={{ marginTop: 16 }}
          />
        </SectionCard>

        <View className="mt-8 rounded-[22px] bg-white p-5 border border-secondary/10">
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Recordatorios por email</Text>
              <Text className="text-xs text-gray-500 mt-1">Avisos antes de cada turno.</Text>
            </View>
            <Switch value={preferences.emailReminders} onValueChange={() => toggle('emailReminders')} />
          </View>

          <View className="mt-4 flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Recordatorios push</Text>
              <Text className="text-xs text-gray-500 mt-1">Nuevas alertas en tu dispositivo.</Text>
            </View>
            <Switch value={preferences.pushReminders} onValueChange={() => toggle('pushReminders')} />
          </View>

          <View className="mt-4 flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Novedades y promos</Text>
              <Text className="text-xs text-gray-500 mt-1">Actualizaciones de productos.</Text>
            </View>
            <Switch value={preferences.marketing} onValueChange={() => toggle('marketing')} />
          </View>
        </View>

        <View className="mt-6">
          <EmailVerificationCard
            email={currentEmail}
            emailVerified={emailVerified}
            onStatusChanged={refreshProfile}
            variant="section"
          />
        </View>

        <View className="mt-6 rounded-[22px] bg-white p-5 border border-secondary/10">
          <Text className="font-semibold text-secondary">Verificación de teléfono</Text>
          <Text className="mt-1 text-xs text-gray-500">
            Estado actual del teléfono principal de la cuenta.
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">{currentPhone || 'Sin teléfono cargado'}</Text>
              <Text className="mt-1 text-xs text-gray-500">
                {phoneVerified ? 'Estado: verificado.' : 'Estado: pendiente de verificación.'}
              </Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${phoneVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <Text className={`text-xs font-semibold ${phoneVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {phoneVerified ? 'Verificado' : 'Pendiente'}
              </Text>
            </View>
          </View>

          {!phoneVerified ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  void handleSendPhoneVerification();
                }}
                disabled={isSendingPhoneVerification}
                className="mt-4 h-12 items-center justify-center rounded-full border border-secondary/10 bg-background"
              >
                <Text className="font-semibold text-secondary">
                  {isSendingPhoneVerification ? 'Enviando...' : 'Enviar OTP'}
                </Text>
              </TouchableOpacity>

              <TextInput
                className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
                placeholder="OTP de 6 dígitos"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={phoneVerificationCode}
                onChangeText={setPhoneVerificationCode}
              />

              <TouchableOpacity
                onPress={() => {
                  void handleConfirmPhoneVerification();
                }}
                disabled={isConfirmingPhoneVerification}
                className="mt-3 h-12 items-center justify-center rounded-full bg-secondary"
              >
                <Text className="font-semibold text-white">
                  {isConfirmingPhoneVerification ? 'Verificando...' : 'Confirmar OTP'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {phoneVerificationMessage ? (
            <Text className="mt-3 text-xs font-semibold text-emerald-700">{phoneVerificationMessage}</Text>
          ) : null}
          {phoneVerificationError ? (
            <Text className="mt-3 text-xs font-semibold text-red-600">{phoneVerificationError}</Text>
          ) : null}
        </View>

        <View className="mt-6 rounded-[22px] bg-white p-5 border border-secondary/10">
          <Text className="font-semibold text-secondary">Cambiar contraseña</Text>
          <Text className="mt-1 text-xs text-gray-500">
            Por seguridad se cerrarán todas las sesiones activas.
          </Text>

          <TextInput
            className="mt-4 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Contraseña actual"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={passwordForm.currentPassword}
            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, currentPassword: text }))}
          />
          <TextInput
            className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Nueva contraseña"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={passwordForm.newPassword}
            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, newPassword: text }))}
          />
          <TextInput
            className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Confirmar nueva contraseña"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={passwordForm.confirmPassword}
            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, confirmPassword: text }))}
          />

          {passwordMessage ? (
            <Text className="mt-3 text-xs font-semibold text-emerald-700">{passwordMessage}</Text>
          ) : null}
          {passwordError ? (
            <Text className="mt-3 text-xs font-semibold text-red-600">{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              void handleChangePassword();
            }}
            disabled={isChangingPassword}
            className="mt-4 h-12 items-center justify-center rounded-full bg-secondary"
          >
            <Text className="font-semibold text-white">
              {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} className="mt-3">
            <Text className="text-center text-xs font-semibold text-secondary">Olvidé mi contraseña</Text>
          </TouchableOpacity>
        </View>

        {role === 'professional' ? (
          <View className="mt-6 rounded-[22px] bg-white p-5 border border-secondary/10">
            <Text className="font-semibold text-secondary">Politica de reservas</Text>
            <Text className="mt-1 text-xs text-gray-500">
              Define cancelacion y reagendado para clientes.
            </Text>

            {isLoadingBookingPolicy ? (
              <View className="mt-4 items-center">
                <ActivityIndicator color="#0A7A43" />
              </View>
            ) : null}

            {bookingPolicy ? (
              <>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-secondary">Permitir cancelacion cliente</Text>
                  <Switch
                    value={bookingPolicy.allowClientCancellation}
                    onValueChange={(value) =>
                      setBookingPolicy((prev) => (prev ? { ...prev, allowClientCancellation: value } : prev))
                    }
                  />
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-secondary">Permitir reagendar cliente</Text>
                  <Switch
                    value={bookingPolicy.allowClientReschedule}
                    onValueChange={(value) =>
                      setBookingPolicy((prev) => (prev ? { ...prev, allowClientReschedule: value } : prev))
                    }
                  />
                </View>

                <TextInput
                  className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
                  placeholder="Ventana cancelacion (horas)"
                  keyboardType="number-pad"
                  value={String(bookingPolicy.cancellationWindowHours ?? '')}
                  onChangeText={(text) =>
                    setBookingPolicy((prev) => (prev
                      ? {
                          ...prev,
                          cancellationWindowHours: text.trim() ? Number(text) : null,
                        }
                      : prev))
                  }
                />

                <TextInput
                  className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
                  placeholder="Ventana reagenda (horas)"
                  keyboardType="number-pad"
                  value={String(bookingPolicy.rescheduleWindowHours ?? '')}
                  onChangeText={(text) =>
                    setBookingPolicy((prev) => (prev
                      ? {
                          ...prev,
                          rescheduleWindowHours: text.trim() ? Number(text) : null,
                        }
                      : prev))
                  }
                />

                <TextInput
                  className="mt-3 h-12 rounded-[16px] border border-secondary/10 bg-background px-4 text-secondary"
                  placeholder="Maximo reagendados por cliente"
                  keyboardType="number-pad"
                  value={String(bookingPolicy.maxClientReschedules ?? '')}
                  onChangeText={(text) =>
                    setBookingPolicy((prev) => (prev
                      ? {
                          ...prev,
                          maxClientReschedules: text.trim() ? Number(text) : null,
                        }
                      : prev))
                  }
                />

                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-secondary">Retener sena por cancelacion tardia</Text>
                  <Switch
                    value={bookingPolicy.retainDepositOnLateCancellation}
                    onValueChange={(value) =>
                      setBookingPolicy((prev) => (prev ? { ...prev, retainDepositOnLateCancellation: value } : prev))
                    }
                  />
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    if (!bookingPolicy || isSavingBookingPolicy) return;
                    setIsSavingBookingPolicy(true);
                    setBookingPolicyMessage(null);
                    try {
                      const updated = await updateProfessionalBookingPolicy({
                        allowClientCancellation: bookingPolicy.allowClientCancellation,
                        allowClientReschedule: bookingPolicy.allowClientReschedule,
                        cancellationWindowHours: bookingPolicy.cancellationWindowHours ?? null,
                        rescheduleWindowHours: bookingPolicy.rescheduleWindowHours ?? null,
                        maxClientReschedules: bookingPolicy.maxClientReschedules ?? null,
                        retainDepositOnLateCancellation: bookingPolicy.retainDepositOnLateCancellation,
                      });
                      setBookingPolicy(updated);
                      setBookingPolicyMessage('Politica guardada correctamente.');
                    } catch (error) {
                      setBookingPolicyMessage(getApiErrorMessage(error, 'No se pudo guardar la politica.'));
                    } finally {
                      setIsSavingBookingPolicy(false);
                    }
                  }}
                  disabled={isSavingBookingPolicy}
                  className="mt-4 h-12 items-center justify-center rounded-full bg-secondary"
                >
                  <Text className="font-semibold text-white">
                    {isSavingBookingPolicy ? 'Guardando...' : 'Guardar politica'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {bookingPolicyMessage ? (
              <Text className="mt-3 text-xs font-semibold text-secondary">{bookingPolicyMessage}</Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-6 rounded-[22px] border border-red-200 bg-red-50 p-5">
          <Text className="font-semibold text-red-700">Eliminar cuenta</Text>
          <Text className="mt-2 text-xs text-red-600">
            {role === 'professional'
              ? 'La cuenta profesional se despublica y la suscripcion se cancela si sigue activa.'
              : 'Se cancelan tus proximos turnos y se cierra tu sesion en el dispositivo.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              void handleSendDeleteChallenge('EMAIL');
            }}
            disabled={isSendingDeleteChallenge}
            className="mt-4 h-12 items-center justify-center rounded-full border border-red-200 bg-white"
          >
            <Text className="font-semibold text-red-600">
              {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por email'}
            </Text>
          </TouchableOpacity>
          {currentPhone ? (
            <TouchableOpacity
              onPress={() => {
                void handleSendDeleteChallenge('SMS');
              }}
              disabled={isSendingDeleteChallenge}
              className="mt-3 h-12 items-center justify-center rounded-full border border-red-200 bg-white"
            >
              <Text className="font-semibold text-red-600">
                {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por SMS'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TextInput
            className="mt-3 h-12 rounded-[16px] border border-red-200 bg-white px-4 text-secondary"
            placeholder="Código OTP de 6 dígitos"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            value={deleteChallengeCode}
            onChangeText={setDeleteChallengeCode}
          />
          {deleteChallengeMessage ? (
            <Text className="mt-3 text-xs font-semibold text-red-600">{deleteChallengeMessage}</Text>
          ) : null}
          {deleteChallengeError ? (
            <Text className="mt-3 text-xs font-semibold text-red-600">{deleteChallengeError}</Text>
          ) : null}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="mt-4 h-12 items-center justify-center rounded-full border border-red-200 bg-white"
          >
            <Text className="font-semibold text-red-600">
              {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
            </Text>
          </TouchableOpacity>
        </View>
    </AppScreen>
  );
}
