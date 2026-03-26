import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  ProfessionalService,
  ServiceCategoryOption,
} from '../../src/types/professional';
import {
  createProfessionalService,
  deleteProfessionalService,
  listProfessionalServices,
  listServiceCategories,
  updateProfessionalService,
} from '../../src/services/professionalConfig';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { AppScreen } from '../../src/components/ui/AppScreen';
import { MessageCard, ScreenHero, SectionCard } from '../../src/components/ui/MobileSurface';

type ServicePaymentMode = 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';

const emptyDraft = {
  name: '',
  description: '',
  categorySlug: '',
  imageUrl: '',
  price: '',
  depositAmount: '',
  duration: '',
  postBufferMinutes: '0',
  paymentType: 'ON_SITE' as ServicePaymentMode,
};

const PAYMENT_OPTIONS: Array<{ value: ServicePaymentMode; label: string }> = [
  { value: 'ON_SITE', label: 'Pago en el local' },
  { value: 'DEPOSIT', label: 'Seña online' },
  { value: 'FULL_PREPAY', label: 'Pago total online' },
];

const normalizePaymentType = (value?: string | null): ServicePaymentMode => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'DEPOSIT') return 'DEPOSIT';
  if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'FULL_PREPAY';
  return 'ON_SITE';
};

const getPaymentTypeLabel = (value?: string | null) => {
  const option = PAYMENT_OPTIONS.find((item) => item.value === normalizePaymentType(value));
  return option?.label ?? 'Pago en el local';
};

const PRACTICAL_UNLIMITED = 9999;

export default function ServicesScreen() {
  const { profile } = useAuthSession();
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const canUseOnlinePayments = Boolean(profile?.professionalEntitlements?.allowOnlinePayments);
  const maxServices = profile?.professionalEntitlements?.maxServices ?? 15;
  const hasReachedServiceLimit = editingId == null && services.length >= maxServices;

  const resolveCategoryLabel = (service: ProfessionalService) => {
    const categoryName = service.categoryName?.trim();
    if (categoryName) {
      return categoryName;
    }
    return categories.find((category) => category.slug === service.categorySlug)?.name ?? '';
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await listProfessionalServices();
        setServices(response);
      } catch (error) {
        console.error("Error cargando servicios", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await listServiceCategories();
        setCategories(response);
      } catch (error) {
        console.error('Error cargando categorias de servicios', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#0A7A43" />
      </View>
    );
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
        <ScreenHero
          eyebrow="Servicios"
          title="Catalogo profesional"
          description="Crea, edita y ordena tus servicios con una configuracion mas clara."
          icon="cut-outline"
          badges={[
            { label: `${services.length} servicios`, tone: 'light' },
            { label: canUseOnlinePayments ? 'Cobros online activos' : 'Cobros en local', tone: 'light' },
          ]}
        />

        <SectionCard style={{ marginTop: 20 }}>
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
            {editingId ? 'Editar servicio' : 'Nuevo servicio'}
          </Text>

          <TextInput
            className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
            placeholder="Nombre"
            value={draft.name}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))}
          />
          <TextInput
            className="mt-2 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
            placeholder="Descripcion"
            value={draft.description}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
          />
          <View className="mt-3" style={{ gap: 8 }}>
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
              Categoría del servicio
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              <TouchableOpacity
                className={`rounded-2xl border px-4 py-3 ${
                  draft.categorySlug === ''
                    ? 'border-secondary bg-secondary/10'
                    : 'border-secondary/10 bg-background'
                }`}
                onPress={() => setDraft((prev) => ({ ...prev, categorySlug: '' }))}
              >
                <Text className={`font-semibold ${draft.categorySlug === '' ? 'text-secondary' : 'text-gray-700'}`}>
                  Sin categoría específica
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const isSelected = draft.categorySlug === category.slug;
                return (
                  <TouchableOpacity
                    key={category.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected ? 'border-secondary bg-secondary/10' : 'border-secondary/10 bg-background'
                    }`}
                    onPress={() => setDraft((prev) => ({ ...prev, categorySlug: category.slug }))}
                  >
                    <Text className={`font-semibold ${isSelected ? 'text-secondary' : 'text-gray-700'}`}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs text-gray-500">
              {isLoadingCategories
                ? 'Cargando categorías...'
                : 'Si no elegís una categoría, el servicio seguirá usando el rubro del perfil como fallback.'}
            </Text>
          </View>
          <View className="mt-2 flex-row" style={{ gap: 8 }}>
            <TextInput
              className="flex-1 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
              placeholder="Precio"
              value={draft.price}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, price: text }))}
            />
            <TextInput
              className="flex-1 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
              placeholder="Duracion"
              value={draft.duration}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, duration: text }))}
            />
          </View>

          <View className="mt-3" style={{ gap: 8 }}>
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
              Modalidad de pago
            </Text>
            <View style={{ gap: 8 }}>
              {PAYMENT_OPTIONS.map((option) => {
                const isSelected = draft.paymentType === option.value;
                const isLockedOption = !canUseOnlinePayments && option.value !== 'ON_SITE';
                return (
                  <TouchableOpacity
                    key={option.value}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected ? 'border-secondary bg-secondary/10' : 'border-secondary/10 bg-background'
                    }`}
                    onPress={() => {
                      if (isLockedOption) {
                        setMessage('Los pagos online se habilitan desde el plan Pro.');
                        return;
                      }
                      setDraft((prev) => ({ ...prev, paymentType: option.value }));
                    }}
                  >
                    <Text className={`font-semibold ${isLockedOption ? 'text-gray-400' : isSelected ? 'text-secondary' : 'text-gray-700'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!canUseOnlinePayments ? (
              <Text className="text-xs text-gray-500">
                La seña online y el prepago total se habilitan en el plan Pro.
              </Text>
            ) : null}
          </View>

          {draft.paymentType === 'DEPOSIT' ? (
            <TextInput
              className="mt-2 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
              placeholder="Monto de la seña"
              value={draft.depositAmount}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, depositAmount: text }))}
            />
          ) : null}

          <TouchableOpacity
            disabled={isSaving || !draft.name.trim() || !draft.price.trim() || !draft.duration.trim()}
            onPress={async () => {
              setIsSaving(true);
              setMessage(null);
              try {
                if (!editingId && services.length >= maxServices) {
                  setMessage(`Tu plan permite hasta ${maxServices} servicios.`);
                  setIsSaving(false);
                  return;
                }

                if (!canUseOnlinePayments && draft.paymentType !== 'ON_SITE') {
                  setMessage('Tu plan actual no permite seña online ni pago total online.');
                  setIsSaving(false);
                  return;
                }

                if (draft.paymentType === 'DEPOSIT' && (!draft.depositAmount.trim() || Number(draft.depositAmount) <= 0)) {
                  setMessage('Ingresá una seña válida.');
                  setIsSaving(false);
                  return;
                }

                const payload = {
                  name: draft.name.trim(),
                  description: draft.description.trim(),
                  categorySlug: draft.categorySlug.trim(),
                  imageUrl: draft.imageUrl.trim(),
                  price: draft.price.trim(),
                  depositAmount: draft.paymentType === 'DEPOSIT' ? draft.depositAmount.trim() : null,
                  duration: draft.duration.trim(),
                  postBufferMinutes: Number(draft.postBufferMinutes) || 0,
                  paymentType: draft.paymentType,
                  active: true,
                };

                if (editingId) {
                  const updated = await updateProfessionalService(editingId, payload);
                  setServices((prev) => prev.map((service) => (service.id === editingId ? updated : service)));
                  setMessage('Servicio actualizado.');
                } else {
                  const created = await createProfessionalService(payload);
                  setServices((prev) => [created, ...prev]);
                  setMessage('Servicio creado.');
                }

                setDraft(emptyDraft);
                setEditingId(null);
              } catch {
                setMessage('No se pudo guardar el servicio.');
              } finally {
                setIsSaving(false);
              }
            }}
            className={`mt-4 h-11 rounded-full items-center justify-center ${isSaving ? 'bg-gray-300' : 'bg-secondary'}`}
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">{editingId ? 'Guardar cambios' : 'Crear servicio'}</Text>}
          </TouchableOpacity>

          {message ? <MessageCard message={message} tone="primary" style={{ marginTop: 12 }} /> : null}
        </SectionCard>
        
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
            Tus Servicios ({maxServices >= PRACTICAL_UNLIMITED ? services.length : `${services.length}/${maxServices}`})
          </Text>
          <TouchableOpacity
            className={`px-3 py-1.5 rounded-full ${hasReachedServiceLimit ? 'bg-gray-300' : 'bg-secondary'}`}
            disabled={hasReachedServiceLimit}
            onPress={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            <Text className="text-white text-xs font-bold">Nuevo</Text>
          </TouchableOpacity>
        </View>

        {maxServices < PRACTICAL_UNLIMITED ? (
          <MessageCard
            message={`Límite del plan: ${services.length}/${maxServices} servicios. Cada servicio puede tener 1 foto pública.`}
            tone="primary"
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {services.length === 0 ? (
          <View className="bg-white rounded-[20px] p-6 items-center border border-dashed border-gray-300">
            <Ionicons name="cut-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-3">Todavía no creaste servicios. Creá el primero para empezar.</Text>
          </View>
        ) : (
          services.map((service, index) => (
            <View key={service.id || index} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-secondary mb-1">{service.name}</Text>
                  <Text className="text-sm text-gray-500">Duración: {service.duration || 'A definir'}</Text>
                  {resolveCategoryLabel(service) ? (
                    <Text className="text-sm text-gray-500 mt-1">{resolveCategoryLabel(service)}</Text>
                  ) : null}
                  <Text className="text-sm text-gray-500 mt-1">{getPaymentTypeLabel(service.paymentType)}</Text>
                </View>
                <Text className="text-base font-bold text-primary">
                  {service.price ? `$${service.price}` : 'Consultar'}
                </Text>
              </View>

              <View className="flex-row mt-4 gap-2">
                <TouchableOpacity
                  className="flex-1 bg-background border border-secondary/10 py-2.5 rounded-full items-center"
                  onPress={() => {
                    setEditingId(service.id);
                    setDraft({
                      name: service.name || '',
                      description: service.description || '',
                      categorySlug: service.categorySlug || '',
                      imageUrl: service.imageUrl || '',
                      price: service.price || '',
                      depositAmount: service.depositAmount != null ? String(service.depositAmount) : '',
                      duration: service.duration || '',
                      postBufferMinutes: service.postBufferMinutes != null ? String(service.postBufferMinutes) : '0',
                      paymentType: normalizePaymentType(service.paymentType),
                    });
                  }}
                >
                  <Text className="text-secondary font-bold text-sm">Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-red-50 border border-red-100 py-2.5 px-5 rounded-full items-center"
                  onPress={async () => {
                    try {
                      await deleteProfessionalService(service.id);
                      setServices((prev) => prev.filter((item) => item.id !== service.id));
                    } catch {
                      setMessage('No se pudo eliminar el servicio.');
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

    </AppScreen>
  );
}
