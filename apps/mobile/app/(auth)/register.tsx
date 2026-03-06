import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/services/errors';
import { geocodeAddress, getGeoLocationSuggestions, type GeoLocationSuggestion } from '../../src/services/geo';

export default function RegisterScreen() {
  const [role, setRole] = useState<'cliente' | 'profesional'>('cliente');
  const [form, setForm] = useState({
    fullName: '',
    rubro: '',
    email: '',
    phoneNumber: '',
    country: '',
    city: '',
    fullAddress: '',
    location: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);

  const isPhoneValid = (value: string) => /^[+0-9()\-\s]{3,30}$/.test(value);

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

  const handleSubmit = async () => {
    setErrorMessage(null);

    const fullName = form.fullName.trim();
    const rubro = form.rubro.trim();
    const email = form.email.trim().toLowerCase();
    const phoneNumber = form.phoneNumber.trim();
    const country = form.country.trim();
    const city = form.city.trim();
    const fullAddress = form.fullAddress.trim();
    const location = form.location.trim();
    const password = form.password;

    // Validaciones alineadas con backend para evitar rechazos 400.
    const requiresBusiness = role === 'profesional';
    if (
      !fullName
      || !email
      || !phoneNumber
      || !password
      || (requiresBusiness && (!rubro || !country || !city || !fullAddress))
    ) {
      setErrorMessage('Completá nombre, email, telefono, contrasena, rubro, pais, ciudad y direccion.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (!isPhoneValid(phoneNumber)) {
      setErrorMessage('El telefono tiene un formato invalido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = role === 'profesional' ? '/auth/register/profesional' : '/auth/register/cliente';
      const structuredLocation = `${fullAddress}, ${city}, ${country}`;
      const geocoded = role === 'profesional'
        ? await geocodeAddress(location || structuredLocation)
        : null;
      const payload = role === 'profesional'
        ? {
            fullName,
            rubro,
            email,
            phoneNumber,
            country,
            city,
            fullAddress,
            location: location || structuredLocation,
            latitude: geocoded?.latitude ?? null,
            longitude: geocoded?.longitude ?? null,
            password,
            tipoCliente: 'LOCAL',
          }
        : {
            fullName,
            email,
            phoneNumber,
            password,
          };

      await api.post(endpoint, payload);
      
      // Una vez creado, lo mandamos al login para que inicie sesión
      router.replace('/(auth)/login');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">
        <View className="px-6">
          
          <View className="w-full space-y-4 rounded-[32px] bg-white p-8 shadow-sm">
            <View className="space-y-2 mb-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                Registro
              </Text>
              <Text className="text-2xl font-semibold text-secondary">
                Crea tu cuenta
              </Text>
            </View>

            <View className="flex-row rounded-full bg-background p-1 mb-2">
              <TouchableOpacity
                className={`flex-1 items-center justify-center rounded-full py-2.5 ${role === 'cliente' ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setRole('cliente')}
              >
                <Text className={`font-bold text-sm ${role === 'cliente' ? 'text-secondary' : 'text-gray-400'}`}>Cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 items-center justify-center rounded-full py-2.5 ${role === 'profesional' ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setRole('profesional')}
              >
                <Text className={`font-bold text-sm ${role === 'profesional' ? 'text-secondary' : 'text-gray-400'}`}>Profesional</Text>
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="mb-1 text-xs font-medium text-secondary">Nombre o empresa</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: Atelier Glow"
                  value={form.fullName}
                  onChangeText={(text) => setForm({ ...form, fullName: text })}
                />
              </View>

              {role === 'profesional' ? (
                <View className="mt-3">
                  <Text className="mb-1 text-xs font-medium text-secondary">Rubro</Text>
                  <TextInput
                    className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                    placeholder="Ej: Salon de belleza"
                    value={form.rubro}
                    onChangeText={(text) => setForm({ ...form, rubro: text })}
                  />
                </View>
              ) : null}

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Teléfono</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: +54 11 1234 5678"
                  keyboardType="phone-pad"
                  value={form.phoneNumber}
                  onChangeText={(text) => setForm({ ...form, phoneNumber: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Ubicación</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: Palermo, CABA"
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                />
              </View>

              {role === 'profesional' ? (
                <View>
                  <View className="mt-3">
                    <Text className="mb-1 text-xs font-medium text-secondary">Pais</Text>
                    <TextInput
                      className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                      placeholder="Ej: Argentina"
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
                  </View>

                  <View className="mt-3">
                    <Text className="mb-1 text-xs font-medium text-secondary">Ciudad</Text>
                    <TextInput
                      className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                      placeholder="Ej: Buenos Aires"
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
                  </View>

                  <View className="mt-3">
                    <Text className="mb-1 text-xs font-medium text-secondary">Direccion completa</Text>
                    <TextInput
                      className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                      placeholder="Ej: Av. Santa Fe 1234"
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
                  </View>
                </View>
              ) : null}

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Contraseña</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                />
              </View>

              {errorMessage && (
                <View className="mt-2 rounded-xl bg-red-50 p-3">
                  <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity 
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#1FB6A6', '#0E2A47']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 w-full flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Crear cuenta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-500">¿Ya tenés cuenta? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-sm font-bold text-primary">Iniciar sesión</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}