import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useProfessionalSession } from '../session/useProfessionalSession';
import api from '../../../services/api';
import { getApiErrorMessage } from '../../../services/errors';
import {
  getProfessionalBookingPolicy,
  updateProfessionalBookingPolicy,
} from '../../../services/bookingPolicy';
import type { ProfessionalBookingPolicy } from '../../../types/bookings';

export const useProfessionalSettings = () => {
  const session = useProfessionalSession();
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

  useEffect(() => {
    const loadPolicy = async () => {
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
  }, []);

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
      'Si tienes una suscripcion activa, se dara de baja antes de eliminar tu cuenta. Esta accion no se puede deshacer.',
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
    if (isSendingPhoneVerification || !session.profile?.phoneNumber) return;
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
    if (isConfirmingPhoneVerification || !session.profile?.phoneNumber) return;
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

  const saveBookingPolicy = async () => {
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
  };

  return {
    ...session,
    bookingPolicy,
    isLoadingBookingPolicy,
    isSavingBookingPolicy,
    bookingPolicyMessage,
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
    setBookingPolicy,
    setDeleteChallengeCode,
    setPasswordForm,
    setPhoneVerificationCode,
    sendDeleteChallenge,
    deleteAccount,
    changePassword,
    sendPhoneVerification,
    confirmPhoneVerification,
    saveBookingPolicy,
  };
};
