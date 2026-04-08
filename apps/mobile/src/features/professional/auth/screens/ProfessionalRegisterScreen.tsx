import React, { useEffect, useState } from 'react';
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
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { useProfessionalSession } from '../../session/useProfessionalSession';
import { useGoogleOAuth } from '../../../../hooks/useGoogleOAuth';
import { getApiErrorMessage } from '../../../../services/errors';
import {
  geocodeAddress,
  getGeoLocationSuggestions,
  type GeoLocationSuggestion,
} from '../../../../services/geo';
import { listServiceCategories } from '../../../../services/professionalConfig';
import api from '../../../../services/api';
import type { OAuthResult } from '../../../../services/authBackend';
import type { ServiceCategoryOption } from '../../../../types/professional';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import InternationalPhoneField from '../../../../components/ui/InternationalPhoneField';
import { hasMinimumPhoneDigits } from '../../../../lib/internationalPhone';
import { theme } from '../../../../theme';
import { professionalAuthCopy } from '../config';
import {
  AUTH_ENTRY_REGISTER_ROUTE,
  PROFESSIONAL_HOME_ROUTE,
} from '../../../shared/auth/routes';

type ProfessionalRegisterForm = {
  fullName: string;
  categorySlugs: string[];
  email: string;
  confirmEmail: string;
  phoneNumber: string;
  tipoCliente: 'LOCAL' | 'A_DOMICILIO' | 'SIN_LOCAL';
  country: string;
  city: string;
  fullAddress: string;
  password: string;
  confirmPassword: string;
};

export function ProfessionalRegisterScreen() {
  const { refreshProfile } = useProfessionalSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [form, setForm] = useState<ProfessionalRegisterForm>({
    fullName: '',
    categorySlugs: [],
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    tipoCliente: 'LOCAL',
    country: '',
    city: '',
    fullAddress: '',
    password: '',
    confirmPassword: '',
  });

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

  const handleOAuthAuthenticated = async (result: OAuthResult) => {
    setErrorMessage(null);

    if (result.role !== 'PROFESSIONAL') {
      setErrorMessage('No pudimos completar el alta profesional con esa cuenta. Intenta nuevamente desde este flujo.');
      return;
    }

    if (!(result.user.phoneNumber ?? '').trim()) {
      router.replace(professionalAuthCopy.completePhoneRoute);
      return;
    }

    router.replace(PROFESSIONAL_HOME_ROUTE);
  };

  const { isGoogleSubmitting, handleGoogleAuth } = useGoogleOAuth({
    role: 'profesional',
    authAction: 'REGISTER',
    refreshProfile,
    onSuccess: handleOAuthAuthenticated,
    onError: (message) => {
      setErrorMessage(message || null);
    },
  });

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setActiveGeoField(field);

    if (value.trim().length < 2) {
      setIsGeoSuggesting(false);
      setGeoSuggestions([]);
      return;
    }

    setIsGeoSuggesting(true);
    const suggestions = await getGeoLocationSuggestions(value);
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

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const confirmEmail = form.confirmEmail.trim().toLowerCase();
    const phoneNumber = form.phoneNumber.trim();
    const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'A_DOMICILIO';
    const country = requiresLocation ? form.country.trim() : '';
    const city = requiresLocation ? form.city.trim() : '';
    const fullAddress = requiresLocation ? form.fullAddress.trim() : '';

    if (!fullName || !email || !confirmEmail || !phoneNumber || !form.password || !form.confirmPassword) {
      setErrorMessage('Completa los datos principales para continuar.');
      return;
    }

    if (form.categorySlugs.length === 0) {
      setErrorMessage('Selecciona al menos un rubro.');
      return;
    }

    if (email !== confirmEmail) {
      setErrorMessage('Los emails no coinciden.');
      return;
    }

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido.');
      return;
    }

    if (form.password.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    if (requiresLocation && (!country || !city || !fullAddress)) {
      setErrorMessage('Completa pais, ciudad y direccion completa.');
      return;
    }

    try {
      setIsSubmitting(true);
      const location = requiresLocation ? `${fullAddress}, ${city}, ${country}` : '';
      const geocoded = requiresLocation ? await geocodeAddress(location) : null;

      if (requiresLocation && !geocoded) {
        setErrorMessage('No pudimos validar esa direccion. Revisala e intenta nuevamente.');
        return;
      }

      const primaryCategory = categories.find(
        (category) => category.slug === form.categorySlugs[0],
      );

      await api.post(professionalAuthCopy.registerEndpoint, {
        fullName,
        rubro: primaryCategory?.name || '',
        categorySlugs: form.categorySlugs,
        email,
        phoneNumber,
        country,
        city,
        fullAddress,
        location: requiresLocation ? location : null,
        latitude: geocoded?.latitude ?? null,
        longitude: geocoded?.longitude ?? null,
        tipoCliente: form.tipoCliente,
        password: form.password,
      });

      setSuccessMessage('Cuenta creada correctamente. Ahora puedes iniciar sesion.');
      router.replace(professionalAuthCopy.loginRoute);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'A_DOMICILIO';

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <AppScreen
          scroll
          contentContainerStyle={{ paddingVertical: 32 }}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <View className="px-6">
            <LinearGradient
              colors={theme.gradients.heroElevated}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[28px] px-6 py-6"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
                Registro
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-white">
                Crear cuenta profesional
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/80">
                Completa tus datos para publicar servicios y gestionar tu negocio.
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                    Registro
                  </Text>
                  <Text className="mt-2 text-2xl font-semibold text-secondary">
                    Crear cuenta profesional
                  </Text>
                </View>
                <Link href={AUTH_ENTRY_REGISTER_ROUTE} asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Cambiar rol</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm leading-6 text-muted">
                Completa tus datos para publicar servicios y gestionar tu negocio.
              </Text>

              <View className="mt-6">
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-secondary/10" />
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-faint">
                    Registrate con
                  </Text>
                  <View className="h-px flex-1 bg-secondary/10" />
                </View>

                <TouchableOpacity
                  className="mt-3 h-14 items-center justify-center rounded-full border border-secondary/15 bg-backgroundSoft"
                  onPress={handleGoogleAuth}
                  disabled={isSubmitting || isGoogleSubmitting}
                  activeOpacity={0.85}
                >
                  {isGoogleSubmitting ? (
                    <ActivityIndicator color={theme.colors.ink} />
                  ) : (
                    <Text className="text-base font-semibold text-secondary">Continuar con Google</Text>
                  )}
                </TouchableOpacity>

                <View className="mt-4 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-secondary/10" />
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-faint">
                    o con email
                  </Text>
                  <View className="h-px flex-1 bg-secondary/10" />
                </View>
              </View>

              <View className="mt-6">
                <Text className="mb-1 text-xs font-medium text-secondary">Nombre o empresa</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="Nombre del negocio"
                  value={form.fullName}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-xs font-medium text-secondary">Rubros</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {isLoadingCategories ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    categories.map((category) => {
                      const isSelected = form.categorySlugs.includes(category.slug);
                      return (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => toggleCategory(category.slug)}
                          className={`rounded-full px-4 py-2 ${
                            isSelected ? 'bg-secondary' : 'border border-secondary/10 bg-backgroundSoft'
                          }`}
                        >
                          <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-secondary'}`}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.confirmEmail}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, confirmEmail: value }))}
                />
              </View>

              <InternationalPhoneField
                label="Telefono"
                value={form.phoneNumber}
                onChange={(value) => setForm((prev) => ({ ...prev, phoneNumber: value }))}
                placeholder="11 2345 6789"
                helperText="Selecciona el pais y escribe el numero sin repetir el codigo internacional."
              />

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Tipo de atencion</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {(['LOCAL', 'A_DOMICILIO', 'SIN_LOCAL'] as const).map((value) => {
                    const isSelected = form.tipoCliente === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setForm((prev) => ({ ...prev, tipoCliente: value }))}
                        className={`rounded-full px-4 py-2 ${
                          isSelected ? 'bg-secondary' : 'border border-secondary/10 bg-backgroundSoft'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-secondary'}`}>
                          {value === 'LOCAL' ? 'Local' : value === 'A_DOMICILIO' ? 'A domicilio' : 'Sin local'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {requiresLocation ? (
                <>
                  <View className="mt-4">
                    <Text className="mb-1 text-xs font-medium text-secondary">Pais</Text>
                    <TextInput
                      className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                      placeholder="Ej: Argentina"
                      value={form.country}
                      onChangeText={(value) => {
                        void handleGeoFieldChange('country', value);
                      }}
                    />
                  </View>

                  {activeGeoField === 'country' && geoSuggestions.length > 0 ? (
                    <View className="mt-2 rounded-xl border border-secondary/10 bg-white">
                      {geoSuggestions.slice(0, 5).map((item, index) => (
                        <TouchableOpacity
                          key={`${item.placeName || item.country || 'country'}-${index}`}
                          onPress={() => applyGeoSuggestion(item)}
                          className="border-b border-secondary/10 px-3 py-2"
                        >
                          <Text className="text-xs text-secondary">
                            {item.country || item.city || item.placeName || 'Sugerencia'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <View className="mt-4">
                    <Text className="mb-1 text-xs font-medium text-secondary">Ciudad</Text>
                    <TextInput
                      className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                      placeholder="Ej: Buenos Aires"
                      value={form.city}
                      onChangeText={(value) => {
                        void handleGeoFieldChange('city', value);
                      }}
                    />
                  </View>

                  {activeGeoField === 'city' && geoSuggestions.length > 0 ? (
                    <View className="mt-2 rounded-xl border border-secondary/10 bg-white">
                      {geoSuggestions.slice(0, 5).map((item, index) => (
                        <TouchableOpacity
                          key={`${item.placeName || item.city || 'city'}-${index}`}
                          onPress={() => applyGeoSuggestion(item)}
                          className="border-b border-secondary/10 px-3 py-2"
                        >
                          <Text className="text-xs text-secondary">
                            {item.city || item.fullAddress || item.placeName || 'Sugerencia'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <View className="mt-4">
                    <Text className="mb-1 text-xs font-medium text-secondary">Direccion completa</Text>
                    <TextInput
                      className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                      placeholder="Ej: Av. Santa Fe 1234"
                      value={form.fullAddress}
                      onChangeText={(value) => {
                        void handleGeoFieldChange('fullAddress', value);
                      }}
                    />
                  </View>

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
                          <Text className="text-xs font-semibold text-secondary">
                            {item.fullAddress || item.placeName || 'Direccion sugerida'}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-gray-500">
                            {[item.city, item.country].filter(Boolean).join(', ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
                />
              </View>

              {errorMessage ? (
                <View className="mt-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View className="mt-4 rounded-xl bg-emerald-50 p-3">
                  <Text className="text-center text-xs text-emerald-700">{successMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting || isGoogleSubmitting}
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
                    <Text className="text-base font-semibold text-white">Crear cuenta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View className="mt-6 flex-row justify-center">
                <Text className="text-sm text-muted">Ya tienes cuenta </Text>
                <Link href={professionalAuthCopy.loginRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{professionalAuthCopy.loginLinkLabel}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={isSubmitting || isGoogleSubmitting}
        title="Registrando cuenta"
        description={
          isGoogleSubmitting
            ? 'Creando tu cuenta con Google como profesional.'
            : 'Guardando tus datos y validando tu perfil profesional.'
        }
      />
    </>
  );
}
