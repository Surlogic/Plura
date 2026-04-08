import React from 'react';
import { ActivityIndicator, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import EmailVerificationCard from '../../../components/auth/EmailVerificationCard';
import { AppScreen } from '../../../components/ui/AppScreen';
import { ActionButton, ScreenHero, SectionCard } from '../../../components/ui/MobileSurface';
import { useClientSettings } from '../hooks/useClientSettings';

export default function ClientSettingsScreen() {
  const {
    clientProfile,
    hasLoaded,
    isAuthenticated,
    refreshProfile,
    logout,
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
  } = useClientSettings();
  const pushSettings = pushNotifications.settings;

  if (!hasLoaded || isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#0A7A43" />
      </View>
    );
  }

  if (!isAuthenticated || !clientProfile) {
    return (
      <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <ScreenHero
          eyebrow="Configuración cliente"
          title="Inicia sesión para ver tu configuración"
          description="Tus preferencias, verificaciones y seguridad viven del lado cliente."
          icon="settings-outline"
        />
        <ActionButton
          label="Ir al login"
          onPress={() => router.replace('/(auth)/login-client')}
          style={{ marginTop: 24 }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
      <ScreenHero
        eyebrow="Configuración cliente"
        title="Cuenta y preferencias"
        description="Ajusta recordatorios, verificaciones y seguridad sin mezclar esta superficie con el panel profesional."
        icon="settings-outline"
        badges={[
          { label: 'Perfil cliente', tone: 'light' },
          { label: pushSettings.pushReminders ? 'Push activo' : 'Push pendiente', tone: 'light' },
        ]}
      />

      <SectionCard style={{ marginTop: 24 }}>
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Sesión</Text>
        <Text className="mt-2 text-sm leading-6 text-gray-500">
          Cierra la sesión actual de este dispositivo y vuelve al acceso cliente.
        </Text>
        <ActionButton
          label="Cerrar sesión"
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
          <Switch value={preferences.emailReminders} onValueChange={() => {
            void togglePreference('emailReminders');
          }}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between py-2">
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-secondary">Recordatorios push</Text>
            <Text className="text-xs text-gray-500 mt-1">Nuevas alertas en tu dispositivo.</Text>
          </View>
          <Switch value={preferences.pushReminders} onValueChange={() => {
            void togglePreference('pushReminders');
          }}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between py-2">
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-secondary">Novedades y promos</Text>
            <Text className="text-xs text-gray-500 mt-1">Actualizaciones y beneficios disponibles.</Text>
          </View>
          <Switch value={preferences.marketing} onValueChange={() => {
            void togglePreference('marketing');
          }}
          />
        </View>
      </View>

      <View className="mt-6">
        <EmailVerificationCard
          email={clientProfile.email}
          emailVerified={clientProfile.emailVerified}
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
            <Text className="font-semibold text-secondary">{clientProfile.phoneNumber || 'Sin teléfono cargado'}</Text>
            <Text className="mt-1 text-xs text-gray-500">
              {clientProfile.phoneVerified ? 'Estado: verificado.' : 'Estado: pendiente de verificación.'}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${clientProfile.phoneVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <Text className={`text-xs font-semibold ${clientProfile.phoneVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {clientProfile.phoneVerified ? 'Verificado' : 'Pendiente'}
            </Text>
          </View>
        </View>

        {!clientProfile.phoneVerified ? (
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

      <View className="mt-6 rounded-[22px] border border-red-200 bg-red-50 p-5">
        <Text className="font-semibold text-red-700">Eliminar cuenta</Text>
        <Text className="mt-2 text-xs text-red-600">
          Se cancelan tus próximos turnos y se cierra tu sesión en el dispositivo.
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
        {clientProfile.phoneNumber ? (
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
