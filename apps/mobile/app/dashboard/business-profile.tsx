import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { updateProfessionalBusinessProfile } from '../../src/services/professionalConfig';

export default function BusinessProfileScreen() {
  const { profile, refreshProfile } = useProfessionalProfileContext();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    rubro: profile?.rubro || '',
    location: profile?.location || '',
    phoneNumber: profile?.phoneNumber || '',
    instagram: '',
    facebook: '',
    tiktok: '',
    website: '',
    whatsapp: '',
    headline: profile?.publicHeadline || '',
    about: profile?.publicAbout || '',
  });

  const isDisabled = useMemo(
    () => isSaving || !form.fullName.trim() || !form.rubro.trim() || !form.phoneNumber.trim(),
    [form.fullName, form.phoneNumber, form.rubro, isSaving],
  );

  if (!profile) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-center text-gray-500">Inicia sesion como profesional para editar tu negocio.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <Text className="text-3xl font-bold text-secondary">Perfil del negocio</Text>
        <Text className="mt-2 text-sm text-gray-500">Estos datos se usan en tu pagina publica y resultados.</Text>

        <View className="mt-6 rounded-[24px] bg-white p-5 border border-secondary/10">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Datos base</Text>

          <TextInput
            className="mt-4 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Nombre comercial"
            value={form.fullName}
            onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))}
          />

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Rubro"
            value={form.rubro}
            onChangeText={(text) => setForm((prev) => ({ ...prev, rubro: text }))}
          />

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Ubicacion"
            value={form.location}
            onChangeText={(text) => setForm((prev) => ({ ...prev, location: text }))}
          />

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Telefono"
            value={form.phoneNumber}
            onChangeText={(text) => setForm((prev) => ({ ...prev, phoneNumber: text }))}
          />

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Headline publico"
            value={form.headline}
            onChangeText={(text) => setForm((prev) => ({ ...prev, headline: text }))}
          />

          <TextInput
            className="mt-3 min-h-[90px] rounded-2xl border border-secondary/10 bg-background px-4 py-3 text-secondary"
            multiline
            textAlignVertical="top"
            placeholder="Sobre tu negocio"
            value={form.about}
            onChangeText={(text) => setForm((prev) => ({ ...prev, about: text }))}
          />
        </View>

        <View className="mt-5 rounded-[24px] bg-white p-5 border border-secondary/10">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Redes</Text>

          {(['instagram', 'facebook', 'tiktok', 'website', 'whatsapp'] as const).map((key) => (
            <TextInput
              key={key}
              className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
              placeholder={key}
              value={form[key]}
              onChangeText={(text) => setForm((prev) => ({ ...prev, [key]: text }))}
            />
          ))}
        </View>

        {message ? <Text className="mt-4 text-sm text-secondary">{message}</Text> : null}

        <TouchableOpacity
          disabled={isDisabled}
          onPress={async () => {
            setIsSaving(true);
            setMessage(null);
            try {
              await updateProfessionalBusinessProfile({
                fullName: form.fullName.trim(),
                rubro: form.rubro.trim(),
                location: form.location.trim(),
                phoneNumber: form.phoneNumber.trim(),
                instagram: form.instagram.trim(),
                facebook: form.facebook.trim(),
                tiktok: form.tiktok.trim(),
                website: form.website.trim(),
                whatsapp: form.whatsapp.trim(),
                headline: form.headline.trim(),
                about: form.about.trim(),
              });
              await refreshProfile();
              setMessage('Perfil actualizado correctamente.');
            } catch {
              setMessage('No se pudo guardar el perfil.');
            } finally {
              setIsSaving(false);
            }
          }}
          className={`mt-6 h-14 rounded-full items-center justify-center ${isDisabled ? 'bg-gray-300' : 'bg-secondary'}`}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Guardar cambios</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
