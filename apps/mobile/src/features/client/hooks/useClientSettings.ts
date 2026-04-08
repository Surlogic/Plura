import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useClientSession } from '../session/useClientSession';
import {
  getClientPreferences,
  updateClientPreferences,
} from '../../../services/clientFeatures';
import api from '../../../services/api';
import { getApiErrorMessage } from '../../../services/errors';

export type ClientPreferences = {
  emailReminders: boolean;
  pushReminders: boolean;
  marketing: boolean;
};

export const useClientSettings = () => {
  const session = useClientSession();
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
  const [preferences, setPreferences] = useState<ClientPreferences>({
    emailReminders: true,
    pushReminders: false,
    marketing: false,
  });
  const pushNotifications = usePushNotifications();

  useEffect(() => {
    const load = async () => {
      const next = await getClientPreferences();
      setPreferences(next);
      setIsLoading(false);
    };

    if (session.isAuthenticated) {
      void load();
    } else {
      setIsLoading(false);
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    setPreferences((current) => ({
      ...current,
      pushReminders: pushNotifications.settings.pushReminders,
    }));
  }, [pushNotifications.settings.pushReminders]);

  const togglePreference = async (key: keyof ClientPreferences) => {
    if (key === 'pushReminders') {
      if (preferences.pushReminders) {
        const next = await pushNotifications.disablePush();
        setPreferences((current) => ({ ...current, pushReminders: next.pushReminders }));
        return;
      }

      const next = await pushNotifications.requestPermission();
      setPreferences((current) => ({ ...current, pushReminders: next.pushReminders }));

      if (!next.pushReminders) {
        if (next.permissionStatus === 'denied' && !next.canAskAgain) {
          Alert.alert(
            'Notificaciones bloqueadas',
            'Activalas desde los ajustes del dispositivo para recibir avisos de reservas y recordatorios.',
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

  const sendDeleteChallenge = async (channel: 'EMAIL' | 'SMS') => {
    if (isSendingDeleteChallenge) return;
    setDeleteChallengeMessage(null);
    setDeleteChallengeError(null);

    try {
      setIsSendingDeleteChallenge(true);
      const response = await api.post<{ challengeId: string; maskedDestination: string }>(
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

  const deleteAccount = () => {
    if (isDeletingAccount) return;
    if (!deleteChallengeId || !deleteChallengeCode.trim()) {
      setDeleteChallengeError('Primero solicitá el challenge e ingresá el código recibido.');
      return;
    }

    Alert.alert(
      'Eliminar cuenta',
      'Se cancelaran tus proximas reservas antes de eliminar tu cuenta. Esta accion no se puede deshacer.',
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
              await session.logout();
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

  const changePassword = async () => {
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
      await session.logout();
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const sendPhoneVerification = async () => {
    if (isSendingPhoneVerification || !session.clientProfile?.phoneNumber) return;
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
      await session.refreshProfile();
    } catch (error) {
      setPhoneVerificationError(getApiErrorMessage(error, 'No se pudo enviar el OTP.'));
    } finally {
      setIsSendingPhoneVerification(false);
    }
  };

  const confirmPhoneVerification = async () => {
    if (isConfirmingPhoneVerification || !session.clientProfile?.phoneNumber) return;
    setPhoneVerificationMessage(null);
    setPhoneVerificationError(null);

    try {
      setIsConfirmingPhoneVerification(true);
      await api.post('/auth/verify/phone/confirm', {
        code: phoneVerificationCode.trim(),
      });
      setPhoneVerificationCode('');
      setPhoneVerificationMessage('Teléfono verificado correctamente.');
      await session.refreshProfile();
    } catch (error) {
      setPhoneVerificationError(getApiErrorMessage(error, 'No se pudo verificar el OTP.'));
    } finally {
      setIsConfirmingPhoneVerification(false);
    }
  };

  return {
    ...session,
    preferences,
    pushNotifications,
    isLoading,
    isDeletingAccount,
    isSendingDeleteChallenge,
    deleteChallengeCode,
    deleteChallengeMessage,
    deleteChallengeError,
    passwordForm,
    passwordMessage,
    passwordError,
    isChangingPassword,
    phoneVerificationCode,
    phoneVerificationMessage,
    phoneVerificationError,
    isSendingPhoneVerification,
    isConfirmingPhoneVerification,
    setDeleteChallengeCode,
    setPasswordForm,
    setPhoneVerificationCode,
    togglePreference,
    sendDeleteChallenge,
    deleteAccount,
    changePassword,
    sendPhoneVerification,
    confirmPhoneVerification,
  };
};
