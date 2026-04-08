import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthSession } from '../../../context/auth/AuthSessionContext';
import {
  listServiceCategories,
  updateProfessionalBusinessProfile,
  updateProfessionalPublicPage,
} from '../../../services/professionalConfig';
import {
  geocodeAddress,
  getGeoLocationSuggestions,
  type GeoLocationSuggestion,
} from '../../../services/geo';
import { getApiErrorMessage } from '../../../services/errors';
import type { ServiceCategoryOption } from '../../../types/professional';
import { AppScreen } from '../../../components/ui/AppScreen';
import InternationalPhoneField from '../../../components/ui/InternationalPhoneField';
import {
  ActionButton,
  MessageCard,
  ScreenHero,
  SectionCard,
  SelectionChip,
} from '../../../components/ui/MobileSurface';
import { hasMinimumPhoneDigits } from '../../../lib/internationalPhone';

const slugify = (value: string) => (
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  peluqueria: 'cabello',
  cejas: 'pestanas-cejas',
  pestanas: 'pestanas-cejas',
  faciales: 'estetica-facial',
  'tratamientos-corporales': 'tratamientos-corporales',
  'medicina-estetica': 'medicina-estetica',
  'bienestar-holistico': 'bienestar-holistico',
};

const dedupeSlugs = (slugs: string[]) => Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));

const resolveInitialCategorySlugs = (
  profileCategories: ServiceCategoryOption[] | undefined,
  rubro: string | null | undefined,
  categories: ServiceCategoryOption[],
) => {
  if (Array.isArray(profileCategories) && profileCategories.length > 0) {
    return dedupeSlugs(profileCategories.map((category) => category.slug));
  }

  const fallbackRubroSlug = rubro ? slugify(rubro) : '';
  const mappedFallbackSlug = LEGACY_CATEGORY_ALIASES[fallbackRubroSlug] || fallbackRubroSlug;
  const fallbackCategory = categories.find((category) => (
    category.slug === mappedFallbackSlug || slugify(category.name) === mappedFallbackSlug
  ));

  return fallbackCategory ? [fallbackCategory.slug] : [];
};

const emptyForm = {
  fullName: '',
  categorySlugs: [] as string[],
  country: '',
  city: '',
  fullAddress: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  phoneNumber: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  whatsapp: '',
  headline: '',
  about: '',
};

export default function BusinessProfileScreen() {
  const { profile, refreshProfile } = useAuthSession();
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await listServiceCategories();
        if (!isCancelled) {
          setCategories(response);
        }
      } catch {
        if (!isCancelled) {
          setCategories([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCategories(false);
        }
      }
    };

    void loadCategories();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile || hasInitialized) return;
    const hasProfileCategories = Array.isArray(profile.categories) && profile.categories.length > 0;
    if (!hasProfileCategories && isLoadingCategories) return;

    setForm({
      fullName: profile.fullName || '',
      categorySlugs: resolveInitialCategorySlugs(profile.categories, profile.rubro, categories),
      country: profile.country || '',
      city: profile.city || '',
      fullAddress: profile.fullAddress || '',
      latitude: typeof profile.latitude === 'number' ? profile.latitude : undefined,
      longitude: typeof profile.longitude === 'number' ? profile.longitude : undefined,
      phoneNumber: profile.phoneNumber || '',
      instagram: profile.instagram || '',
      facebook: profile.facebook || '',
      tiktok: profile.tiktok || '',
      website: profile.website || '',
      whatsapp: profile.whatsapp || '',
      headline: profile.publicHeadline || '',
      about: profile.publicAbout || '',
    });
    setHasInitialized(true);
  }, [categories, hasInitialized, isLoadingCategories, profile]);

  const isDisabled = useMemo(
    () => (
      isSaving
      || !form.fullName.trim()
      || form.categorySlugs.length === 0
      || !hasMinimumPhoneDigits(form.phoneNumber)
      || !form.country.trim()
      || !form.city.trim()
      || !form.fullAddress.trim()
    ),
    [form.categorySlugs.length, form.city, form.country, form.fullAddress, form.fullName, form.phoneNumber, isSaving],
  );

  const selectedCategoryNames = useMemo(
    () => categories
      .filter((category) => form.categorySlugs.includes(category.slug))
      .map((category) => category.name),
    [categories, form.categorySlugs],
  );

  const selectedPrimaryCategory = useMemo(
    () => categories.find((category) => category.slug === form.categorySlugs[0]) ?? null,
    [categories, form.categorySlugs],
  );

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      latitude: undefined,
      longitude: undefined,
    }));
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

    setForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
      latitude: typeof suggestion.latitude === 'number' ? suggestion.latitude : prev.latitude,
      longitude: typeof suggestion.longitude === 'number' ? suggestion.longitude : prev.longitude,
    }));
    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

  const toggleCategory = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      categorySlugs: prev.categorySlugs.includes(slug)
        ? prev.categorySlugs.filter((value) => value !== slug)
        : [...prev.categorySlugs, slug],
    }));
  };

  if (!profile) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-center text-gray-500">Inicia sesion como profesional para editar tu negocio.</Text>
      </View>
    );
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 144 }}>
        <ScreenHero
          eyebrow="Perfil del negocio"
          title="Identidad publica"
          description="Estos datos se usan en tu pagina publica y resultados para que el perfil se vea mucho mas prolijo."
          icon="storefront-outline"
          badges={[
            { label: profile.slug ? `@${profile.slug}` : 'Sin slug publico', tone: 'light' },
            { label: selectedCategoryNames.length > 0 ? `${selectedCategoryNames.length} rubros` : 'Rubros pendientes', tone: 'light' },
          ]}
        />

        {profile.slug ? (
          <SectionCard style={{ marginTop: 24 }} soft>
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">Pagina publica</Text>
            <Text className="mt-2 text-base font-bold text-secondary">@{profile.slug}</Text>
            <Text className="mt-1 text-sm leading-6 text-gray-500">
              Revisa como se muestra tu perfil al cliente desde la app mobile.
            </Text>
            <ActionButton
              label="Ver pagina publica"
              onPress={() => router.push(`/profesional/${profile.slug}`)}
              tone="primary"
              style={{ marginTop: 16 }}
            />
          </SectionCard>
        ) : null}

        <SectionCard style={{ marginTop: 24 }}>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Datos base</Text>

          <TextInput
            className="mt-4 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary"
            placeholder="Nombre comercial"
            value={form.fullName}
            onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))}
          />

          <View className="mt-4" style={{ gap: 8 }}>
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Rubros</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {isLoadingCategories ? (
                <View className="py-3">
                  <ActivityIndicator color="#0A7A43" />
                </View>
              ) : (
                categories.map((category) => {
                  const isSelected = form.categorySlugs.includes(category.slug);
                  return (
                    <SelectionChip
                      key={category.id}
                      label={category.name}
                      selected={isSelected}
                      tone="solid"
                      onPress={() => toggleCategory(category.slug)}
                    />
                  );
                })
              )}
            </View>
            <Text className="text-xs text-gray-500">
              {selectedCategoryNames.length > 0
                ? `Seleccionados: ${selectedCategoryNames.join(', ')}`
                : 'Selecciona al menos un rubro para guardar.'}
            </Text>
          </View>

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

          <InternationalPhoneField
            label="Telefono"
            value={form.phoneNumber}
            onChange={(value) => setForm((prev) => ({ ...prev, phoneNumber: value }))}
            placeholder="11 2345 6789"
            helperText="El codigo internacional se agrega automaticamente segun el pais elegido."
          />
        </SectionCard>

        <SectionCard style={{ marginTop: 20 }}>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Pagina publica</Text>

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
        </SectionCard>

        <SectionCard style={{ marginTop: 20 }}>
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
        </SectionCard>

        {message ? <MessageCard message={message} tone={message.includes('correctamente') ? 'success' : 'primary'} style={{ marginTop: 16 }} /> : null}

        <ActionButton
          disabled={isDisabled}
          loading={isSaving}
          label="Guardar cambios"
          tone="primary"
          onPress={async () => {
            setIsSaving(true);
            setMessage(null);
            try {
              const country = form.country.trim();
              const city = form.city.trim();
              const fullAddress = form.fullAddress.trim();
              const location = [fullAddress, city, country].filter(Boolean).join(', ');

              const geocoded = await geocodeAddress(location);
              if (!geocoded) {
                setMessage('No pudimos validar esa direccion. Revisala antes de guardar.');
                return;
              }

              const normalizedBusinessPayload = {
                fullName: form.fullName.trim(),
                rubro: selectedPrimaryCategory?.name || profile.rubro || 'Profesional',
                categorySlugs: dedupeSlugs(form.categorySlugs),
                location,
                country,
                city,
                fullAddress,
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
                phoneNumber: form.phoneNumber.trim(),
                instagram: form.instagram.trim(),
                facebook: form.facebook.trim(),
                tiktok: form.tiktok.trim(),
                website: form.website.trim(),
                whatsapp: form.whatsapp.trim(),
              };

              await updateProfessionalBusinessProfile({
                ...normalizedBusinessPayload,
              });

              await updateProfessionalPublicPage({
                headline: form.headline.trim(),
                about: form.about.trim(),
              });

              await refreshProfile();
              setForm((prev) => ({
                ...prev,
                categorySlugs: normalizedBusinessPayload.categorySlugs,
                country: normalizedBusinessPayload.country,
                city: normalizedBusinessPayload.city,
                fullAddress: normalizedBusinessPayload.fullAddress,
                latitude: normalizedBusinessPayload.latitude ?? undefined,
                longitude: normalizedBusinessPayload.longitude ?? undefined,
              }));
              setMessage('Perfil actualizado correctamente.');
            } catch (error) {
              setMessage(getApiErrorMessage(error, 'No se pudo guardar el perfil.'));
            } finally {
              setIsSaving(false);
            }
          }}
          style={{ marginTop: 24, minHeight: 56 }}
          textStyle={{ fontSize: 15 }}
        />
    </AppScreen>
  );
}
