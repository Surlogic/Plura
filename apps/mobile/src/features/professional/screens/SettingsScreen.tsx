import React from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import EmailVerificationCard from '../../../components/auth/EmailVerificationCard';
import { AppScreen } from '../../../components/ui/AppScreen';
import { ActionButton, ScreenHero, SectionCard } from '../../../components/ui/MobileSurface';
import { useProfessionalSettings } from '../hooks/useProfessionalSettings';

export default function SettingsScreen() {
  const {
    profile,
    refreshProfile,
    logout,
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
  } = useProfessionalSettings();
  const currentEmail = profile?.email;
  const emailVerified = Boolean(profile?.emailVerified);
  const currentPhone = profile?.phoneNumber;
  const phoneVerified = Boolean(profile?.phoneVerified);

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 144 }}>
        <ScreenHero
          eyebrow="Configuracion"
          title="Cuenta profesional y operación"
          description="Ajusta seguridad, verificaciones y política de reservas sin mezclar esta superficie con preferencias del cliente."
          icon="settings-outline"
          badges={[
            { label: 'Perfil profesional', tone: 'light' },
            { label: profile?.professionalPlan || 'BASIC', tone: 'light' },
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
          <ActionButton
            label="Editar horarios"
            tone="secondary"
            onPress={() => {
              router.push('/dashboard/schedule');
            }}
            style={{ marginTop: 12 }}
          />
        </SectionCard>

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
                  void sendPhoneVerification();
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
                  void confirmPhoneVerification();
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
              void changePassword();
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
                  onValueChange={(value: boolean) =>
                    setBookingPolicy((prev) => (prev ? { ...prev, allowClientCancellation: value } : prev))
                  }
                />
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-secondary">Permitir reagendar cliente</Text>
                <Switch
                  value={bookingPolicy.allowClientReschedule}
                  onValueChange={(value: boolean) =>
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
                  onValueChange={(value: boolean) =>
                    setBookingPolicy((prev) => (prev ? { ...prev, retainDepositOnLateCancellation: value } : prev))
                  }
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  void saveBookingPolicy();
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

        <View className="mt-6 rounded-[22px] border border-red-200 bg-red-50 p-5">
          <Text className="font-semibold text-red-700">Eliminar cuenta</Text>
          <Text className="mt-2 text-xs text-red-600">
            La cuenta profesional se despublica y la suscripcion se cancela si sigue activa.
          </Text>
          <TouchableOpacity
            onPress={() => {
              void sendDeleteChallenge('EMAIL');
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
                void sendDeleteChallenge('SMS');
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
            onPress={deleteAccount}
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
