import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { updateProfessionalBusinessProfile } from '../../src/services/professionalConfig';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '../../src/services/geo';

export default function BusinessProfileScreen() {
  const { profile, refreshProfile } = useProfessionalProfileContext();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);

  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    rubro: profile?.rubro || '',
    location: profile?.location || '',
    country: profile?.country || '',
    city: profile?.city || '',
    fullAddress: profile?.fullAddress || '',
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
    () => (
      isSaving
      || !form.fullName.trim()
      || !form.rubro.trim()
      || !form.phoneNumber.trim()
      || !form.country.trim()
      || !form.city.trim()
      || !form.fullAddress.trim()
    ),
    [form.city, form.country, form.fullAddress, form.fullName, form.phoneNumber, form.rubro, isSaving],
  );

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setActiveGeoField(field);

    const query = value.trim();
    if (query.length < 2) {
      setIsGeoSuggesting(false);
      setGeoSuggestions([]);
      return;
    }

    setIsGeoSuggesting(true);
    const suggestions = await getGeoLocationSuggestions(query);
    setGeoSuggestions(suggestions);
    setIsGeoSuggesting(false);
  };

  const applyGeoSuggestion = (suggestion: GeoLocationSuggestion) => {
    const country = (suggestion.country || '').trim();
    const city = (suggestion.city || '').trim();
    const fullAddress = (suggestion.fullAddress || '').trim();
    const composedLocation = [fullAddress, city, country].filter(Boolean).join(', ');

    setForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
      location: composedLocation || prev.location,
    }));
    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

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
            placeholder="Pais"
            value={form.country}
            onChangeText={(text) => void handleGeoFieldChange('country', text)}
          />
          {activeGeoField === 'country' && geoSuggestions.length > 0 ? (
            <View className="mt-2 rounded-xl border border-secondary/10 bg-white">
              {geoSuggestions.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={`${item.placeName || item.country || 'country'}-${index}`}
                  onPress={() => applyGeoSuggestion(item)}
                  className="border-b border-secondary/10 px-3 py-2"
                >
                  <Text className="text-xs text-secondary">{item.country || item.city || item.placeName || 'Sugerencia'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Ciudad"
            value={form.city}
            onChangeText={(text) => void handleGeoFieldChange('city', text)}
          />
          {activeGeoField === 'city' && geoSuggestions.length > 0 ? (
            <View className="mt-2 rounded-xl border border-secondary/10 bg-white">
              {geoSuggestions.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={`${item.placeName || item.city || 'city'}-${index}`}
                  onPress={() => applyGeoSuggestion(item)}
                  className="border-b border-secondary/10 px-3 py-2"
                >
                  <Text className="text-xs text-secondary">{item.city || item.fullAddress || item.placeName || 'Sugerencia'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TextInput
            className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Direccion completa"
            value={form.fullAddress}
            onChangeText={(text) => void handleGeoFieldChange('fullAddress', text)}
          />
          {activeGeoField === 'fullAddress' && (geoSuggestions.length > 0 || isGeoSuggesting) ? (
            <View className="mt-2 rounded-xl border border-secondary/10 bg-white">
              {isGeoSuggesting ? (
                <Text className="px-3 py-2 text-xs text-gray-500">Buscando sugerencias...</Text>
              ) : null}
              {geoSuggestions.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={`${item.placeName || item.fullAddress || 'address'}-${index}`}
                  onPress={() => applyGeoSuggestion(item)}
                  className="border-b border-secondary/10 px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-secondary">{item.fullAddress || item.placeName || 'Direccion sugerida'}</Text>
                  <Text className="mt-0.5 text-[10px] text-gray-500">{[item.city, item.country].filter(Boolean).join(', ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

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
                location: form.location.trim() || `${form.fullAddress.trim()}, ${form.city.trim()}, ${form.country.trim()}`,
                country: form.country.trim(),
                city: form.city.trim(),
                fullAddress: form.fullAddress.trim(),
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
