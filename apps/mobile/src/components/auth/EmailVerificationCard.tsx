import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../services/api';
import { getApiErrorMessage } from '../../services/errors';
import { theme } from '../../theme';

type EmailVerificationCardProps = {
  email?: string | null;
  emailVerified?: boolean;
  onStatusChanged?: () => Promise<void> | void;
  variant?: 'banner' | 'section';
};

export default function EmailVerificationCard({
  email,
  emailVerified = false,
  onStatusChanged,
  variant = 'section',
}: EmailVerificationCardProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSend = async () => {
    if (isSending || !email || cooldownSeconds > 0) return;
    setMessage(null);
    setError(null);

    try {
      setIsSending(true);
      const response = await api.post<{ message: string; cooldownSeconds?: number | null }>(
        '/auth/verify/email/send',
        {},
      );
      const nextCooldown = Math.max(response.data.cooldownSeconds ?? 0, 0);
      setCooldownSeconds(nextCooldown);
      setMessage(
        nextCooldown > 0
          ? `${response.data.message} Podes reenviar en ${nextCooldown}s.`
          : response.data.message,
      );
      await onStatusChanged?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo enviar el codigo.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async () => {
    if (isConfirming || !email) return;
    setMessage(null);
    setError(null);

    try {
      setIsConfirming(true);
      await api.post('/auth/verify/email/confirm', {
        code: verificationCode.trim(),
      });
      setVerificationCode('');
      setCooldownSeconds(0);
      setMessage('Email verificado correctamente.');
      await onStatusChanged?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo verificar el codigo.'));
    } finally {
      setIsConfirming(false);
    }
  };

  const isBanner = variant === 'banner';

  return (
    <View
      className={`rounded-[24px] border p-5 shadow-sm ${isBanner ? 'border-amber-200' : 'border-secondary/10'}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-bold uppercase tracking-[2px] text-faint">Verificacion</Text>
          <Text className="mt-1 text-lg font-bold text-secondary">Verifica tu email</Text>
          <Text className="mt-1 text-xs text-muted">
            {emailVerified
              ? 'Tu email principal ya esta verificado.'
              : 'Confirma tu email principal con un codigo de 6 digitos para reforzar la seguridad de tu cuenta.'}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${emailVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <Text className={`text-xs font-semibold ${emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
            {emailVerified ? 'Verificado' : 'Pendiente'}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-sm font-semibold text-secondary">
        {email || 'No hay email disponible'}
      </Text>

      {!emailVerified && email ? (
        <View className="mt-4">
          <TouchableOpacity
            onPress={() => {
              void handleSend();
            }}
            disabled={isSending || cooldownSeconds > 0}
            className="items-center rounded-full border border-secondary/10 bg-backgroundSoft px-4 py-3"
          >
            <Text className="text-sm font-semibold text-secondary">
              {isSending
                ? 'Enviando...'
                : cooldownSeconds > 0
                  ? `Reenviar en ${cooldownSeconds}s`
                  : 'Enviar codigo'}
            </Text>
          </TouchableOpacity>

          <View className="mt-3 flex-row items-center gap-3">
            <TextInput
              className="h-12 flex-1 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
              placeholder="Codigo de 6 digitos"
              keyboardType="number-pad"
              value={verificationCode}
              onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
            />
            <TouchableOpacity
              onPress={() => {
                void handleConfirm();
              }}
              disabled={isConfirming || verificationCode.trim().length === 0}
              className="rounded-full bg-secondary px-4 py-3"
            >
              <Text className="text-sm font-semibold text-white">
                {isConfirming ? 'Verificando...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {message ? (
        <Text className="mt-3 text-xs font-semibold text-emerald-700">{message}</Text>
      ) : null}
      {error ? (
        <Text className="mt-3 text-xs font-semibold text-red-600">{error}</Text>
      ) : null}
    </View>
  );
}
