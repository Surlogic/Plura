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
import AuthLoadingOverlay from '../../components/auth/AuthLoadingOverlay';
import { useAuthSession } from '../../context/ProfessionalProfileContext';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { getApiErrorMessage } from '../../services/errors';
import {
  geocodeAddress,
  getGeoLocationSuggestions,
  type GeoLocationSuggestion,
} from '../../services/geo';
import { listServiceCategories } from '../../services/professionalConfig';
import api from '../../services/api';
import type { OAuthResult } from '../../services/authBackend';
import type { ServiceCategoryOption } from '../../types/professional';
import {
  authRoleCopy,
  backendRoleToAuthRole,
  continueAfterAuth,
  resolveCompletePhoneRouteFromBackendRole,
  type AuthRole,
} from './config';
import { AppScreen, surfaceStyles } from '../../components/ui/AppScreen';
import InternationalPhoneField from '../../components/ui/InternationalPhoneField';
import { hasMinimumPhoneDigits } from '../../lib/internationalPhone';
import { theme } from '../../theme';

type RoleRegisterScreenProps = {
  role: AuthRole;
};

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

type ClientRegisterForm = {
  fullName: string;
  email: string;
  confirmEmail: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

export function RoleRegisterScreen({ role }: RoleRegisterScreenProps) {
  const copy = authRoleCopy[role];
  const { refreshProfile } = useAuthSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [clientForm, setClientForm] = useState<ClientRegisterForm>({
    fullName: '',
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [professionalForm, setProfessionalForm] = useState<ProfessionalRegisterForm>({
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
    if (role !== 'profesional') return;

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
  }, [role]);

  const handleOAuthAuthenticated = async (result: OAuthResult) => {
    setErrorMessage(null);

    if (role === 'profesional' && result.role !== 'PROFESSIONAL') {
      setErrorMessage('No pudimos completar el alta profesional con esa cuenta. Intenta nuevamente desde este flujo.');
      return;
    }

    const resolvedRole = backendRoleToAuthRole(result.role);
    if (!resolvedRole) {
      setErrorMessage('El backend no devolvio un rol valido para esta sesion.');
      return;
    }

    if (!(result.user.phoneNumber ?? '').trim()) {
      router.replace(resolveCompletePhoneRouteFromBackendRole(result.role));
      return;
    }

    await continueAfterAuth(resolvedRole);
  };

  const { isGoogleSubmitting, handleGoogleAuth } = useGoogleOAuth({
    role,
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
    setProfessionalForm((prev) => ({ ...prev, [field]: value }));
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

    setProfessionalForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
    }));
    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

  const toggleCategory = (slug: string) => {
    setProfessionalForm((prev) => ({
      ...prev,
      categorySlugs: prev.categorySlugs.includes(slug)
        ? prev.categorySlugs.filter((value) => value !== slug)
        : [...prev.categorySlugs, slug],
    }));
  };

  const handleClientRegister = async () => {
    const fullName = clientForm.fullName.trim();
    const email = clientForm.email.trim().toLowerCase();
    const confirmEmail = clientForm.confirmEmail.trim().toLowerCase();
    const phoneNumber = clientForm.phoneNumber.trim();

    if (!fullName || !email || !confirmEmail || !phoneNumber || !clientForm.password || !clientForm.confirmPassword) {
      setErrorMessage('Completa todos los campos para crear tu cuenta.');
      return false;
    }

    if (email !== confirmEmail) {
      setErrorMessage('Los emails no coinciden.');
      return false;
    }

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido.');
      return false;
    }

    if (clientForm.password.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return false;
    }

    if (clientForm.password !== clientForm.confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return false;
    }

    await api.post(copy.registerEndpoint, {
      fullName,
      email,
      phoneNumber,
      password: clientForm.password,
    });
    return true;
  };

  const handleProfessionalRegister = async () => {
    const fullName = professionalForm.fullName.trim();
    const email = professionalForm.email.trim().toLowerCase();
    const confirmEmail = professionalForm.confirmEmail.trim().toLowerCase();
    const phoneNumber = professionalForm.phoneNumber.trim();
    const requiresLocation =
      professionalForm.tipoCliente === 'LOCAL' || professionalForm.tipoCliente === 'A_DOMICILIO';
    const country = requiresLocation ? professionalForm.country.trim() : '';
    const city = requiresLocation ? professionalForm.city.trim() : '';
    const fullAddress = requiresLocation ? professionalForm.fullAddress.trim() : '';

    if (
      !fullName
      || !email
      || !confirmEmail
      || !phoneNumber
      || !professionalForm.password
      || !professionalForm.confirmPassword
    ) {
      setErrorMessage('Completa los datos principales para continuar.');
      return false;
    }

    if (professionalForm.categorySlugs.length === 0) {
      setErrorMessage('Selecciona al menos un rubro.');
      return false;
    }

    if (email !== confirmEmail) {
      setErrorMessage('Los emails no coinciden.');
      return false;
    }

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido.');
      return false;
    }

    if (professionalForm.password.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return false;
    }

    if (professionalForm.password !== professionalForm.confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return false;
    }

    if (requiresLocation && (!country || !city || !fullAddress)) {
      setErrorMessage('Completa pais, ciudad y direccion completa.');
      return false;
    }

    const location = requiresLocation ? `${fullAddress}, ${city}, ${country}` : '';
    const geocoded = requiresLocation ? await geocodeAddress(location) : null;

    if (requiresLocation && !geocoded) {
      setErrorMessage('No pudimos validar esa direccion. Revisala e intenta nuevamente.');
      return false;
    }

    const primaryCategory = categories.find(
      (category) => category.slug === professionalForm.categorySlugs[0],
    );

    await api.post(copy.registerEndpoint, {
      fullName,
      rubro: primaryCategory?.name || '',
      categorySlugs: professionalForm.categorySlugs,
      email,
      phoneNumber,
      country,
      city,
      fullAddress,
      location: requiresLocation ? location : null,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
      tipoCliente: professionalForm.tipoCliente,
      password: professionalForm.password,
    });
    return true;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const success = role === 'cliente'
        ? await handleClientRegister()
        : await handleProfessionalRegister();

      if (!success) return;

      setSuccessMessage('Cuenta creada correctamente. Ahora puedes iniciar sesion.');
      router.replace(copy.loginRoute);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresLocation =
    professionalForm.tipoCliente === 'LOCAL' || professionalForm.tipoCliente === 'A_DOMICILIO';

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
              colors={role === 'cliente' ? theme.gradients.brand : theme.gradients.heroElevated}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[28px] px-6 py-6"
            >
              <Text className={`text-xs font-bold uppercase tracking-[2px] ${role === 'cliente' ? 'text-secondary/70' : 'text-white/70'}`}>
                Registro
              </Text>
              <Text className={`mt-3 text-3xl font-semibold ${role === 'cliente' ? 'text-secondary' : 'text-white'}`}>
                {role === 'cliente' ? 'Crear cuenta cliente' : 'Crear cuenta profesional'}
              </Text>
              <Text className={`mt-2 text-sm leading-6 ${role === 'cliente' ? 'text-secondary/80' : 'text-white/80'}`}>
                {role === 'cliente'
                  ? 'Completa tus datos para reservar y seguir tus locales favoritos.'
                  : 'Completa tus datos para publicar servicios y gestionar tu negocio.'}
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                    Registro
                  </Text>
                  <Text className="mt-2 text-2xl font-semibold text-secondary">
                    {role === 'cliente' ? 'Crear cuenta cliente' : 'Crear cuenta profesional'}
                  </Text>
                </View>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Cambiar rol</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm leading-6 text-muted">
                {role === 'cliente'
                  ? 'Completa tus datos para reservar y seguir tus locales favoritos.'
                  : 'Completa tus datos para publicar servicios y gestionar tu negocio.'}
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
                <Text className="mb-1 text-xs font-medium text-secondary">
                  {role === 'cliente' ? 'Nombre completo' : 'Nombre o empresa'}
                </Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder={role === 'cliente' ? 'Tu nombre y apellido' : 'Nombre del negocio'}
                  value={role === 'cliente' ? clientForm.fullName : professionalForm.fullName}
                  onChangeText={(value) => {
                    if (role === 'cliente') {
                      setClientForm((prev) => ({ ...prev, fullName: value }));
                    } else {
                      setProfessionalForm((prev) => ({ ...prev, fullName: value }));
                    }
                  }}
                />
              </View>

              {role === 'profesional' ? (
                <View className="mt-4">
                  <Text className="mb-2 text-xs font-medium text-secondary">Rubros</Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {isLoadingCategories ? (
                      <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                      categories.map((category) => {
                        const isSelected = professionalForm.categorySlugs.includes(category.slug);
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
              ) : null}

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={role === 'cliente' ? clientForm.email : professionalForm.email}
                  onChangeText={(value) => {
                    if (role === 'cliente') {
                      setClientForm((prev) => ({ ...prev, email: value }));
                    } else {
                      setProfessionalForm((prev) => ({ ...prev, email: value }));
                    }
                  }}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={role === 'cliente' ? clientForm.confirmEmail : professionalForm.confirmEmail}
                  onChangeText={(value) => {
                    if (role === 'cliente') {
                      setClientForm((prev) => ({ ...prev, confirmEmail: value }));
                    } else {
                      setProfessionalForm((prev) => ({ ...prev, confirmEmail: value }));
                    }
                  }}
                />
              </View>

              <InternationalPhoneField
                label="Telefono"
                value={role === 'cliente' ? clientForm.phoneNumber : professionalForm.phoneNumber}
                onChange={(value) => {
                  if (role === 'cliente') {
                    setClientForm((prev) => ({ ...prev, phoneNumber: value }));
                  } else {
                    setProfessionalForm((prev) => ({ ...prev, phoneNumber: value }));
                  }
                }}
                placeholder="11 2345 6789"
                helperText="Selecciona el pais y escribe el numero sin repetir el codigo internacional."
              />

              {role === 'profesional' ? (
                <>
                  <View className="mt-4">
                    <Text className="mb-1 text-xs font-medium text-secondary">Tipo de atencion</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {(['LOCAL', 'A_DOMICILIO', 'SIN_LOCAL'] as const).map((value) => {
                        const isSelected = professionalForm.tipoCliente === value;
                        return (
                          <TouchableOpacity
                            key={value}
                            onPress={() => setProfessionalForm((prev) => ({ ...prev, tipoCliente: value }))}
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
                          value={professionalForm.country}
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
                          value={professionalForm.city}
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
                          value={professionalForm.fullAddress}
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
                </>
              ) : null}

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={role === 'cliente' ? clientForm.password : professionalForm.password}
                  onChangeText={(value) => {
                    if (role === 'cliente') {
                      setClientForm((prev) => ({ ...prev, password: value }));
                    } else {
                      setProfessionalForm((prev) => ({ ...prev, password: value }));
                    }
                  }}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={role === 'cliente' ? clientForm.confirmPassword : professionalForm.confirmPassword}
                  onChangeText={(value) => {
                    if (role === 'cliente') {
                      setClientForm((prev) => ({ ...prev, confirmPassword: value }));
                    } else {
                      setProfessionalForm((prev) => ({ ...prev, confirmPassword: value }));
                    }
                  }}
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
                  colors={role === 'cliente' ? theme.gradients.brand : theme.gradients.hero}
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
                <Link href={copy.loginRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{copy.loginLinkLabel}</Text>
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
            ? `Creando tu cuenta con Google como ${copy.label}.`
            : role === 'profesional'
              ? 'Guardando tus datos y validando tu perfil profesional.'
              : 'Creando tu cuenta de cliente.'
        }
      />
    </>
  );
}
