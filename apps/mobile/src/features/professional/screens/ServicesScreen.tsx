import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '../../../lib/icons';
import type {
  BookingProcessingFeeMode,
  ProfessionalService,
  ServiceCategoryOption,
} from '../../../types/professional';
import {
  createProfessionalService,
  deleteProfessionalService,
  listProfessionalServices,
  listServiceCategories,
  updateProfessionalService,
} from '../../../services/professionalConfig';
import { useProfessionalSession } from '../session/useProfessionalSession';
import { AppScreen } from '../../../components/ui/AppScreen';
import {
  ActionButton,
  MessageCard,
  ScreenHero,
  SectionCard,
  SelectionChip,
} from '../../../components/ui/MobileSurface';

type ServicePaymentMode = 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';
type ServiceProcessingFeeMode = BookingProcessingFeeMode;

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
  processingFeeMode: 'INSTANT' as ServiceProcessingFeeMode,
};

const PAYMENT_OPTIONS: Array<{ value: ServicePaymentMode; label: string }> = [
  { value: 'ON_SITE', label: 'Pago en el local' },
  { value: 'DEPOSIT', label: 'Seña online' },
  { value: 'FULL_PREPAY', label: 'Pago total online' },
];

const PROCESSING_FEE_OPTIONS: Array<{
  value: ServiceProcessingFeeMode;
  label: string;
  description: string;
}> = [
  {
    value: 'INSTANT',
    label: '5,99% + IVA',
    description: 'Acreditación inmediata de Mercado Pago. Se suma además 1% de Plura al checkout.',
  },
  {
    value: 'DELAYED_21_DAYS',
    label: '4,99% + IVA',
    description: 'Acreditación a 21 días de Mercado Pago. Se suma además 1% de Plura al checkout.',
  },
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

const normalizeProcessingFeeMode = (value?: string | null): ServiceProcessingFeeMode => {
  return (value || '').trim().toUpperCase() === 'DELAYED_21_DAYS'
    ? 'DELAYED_21_DAYS'
    : 'INSTANT';
};

const getProcessingFeeModeLabel = (service: ProfessionalService) => {
  const option = PROCESSING_FEE_OPTIONS.find(
    (item) => item.value === normalizeProcessingFeeMode(service.processingFeeMode),
  );
  return option?.label ?? PROCESSING_FEE_OPTIONS[0].label;
};

const PRACTICAL_UNLIMITED = 9999;

export default function ServicesScreen() {
  const { profile } = useProfessionalSession();
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
    <AppScreen scroll edges={['top']} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 144 }}>
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
              <SelectionChip
                label="Sin categoria especifica"
                selected={draft.categorySlug === ''}
                onPress={() => setDraft((prev) => ({ ...prev, categorySlug: '' }))}
              />
              {categories.map((category) => {
                const isSelected = draft.categorySlug === category.slug;
                return (
                  <SelectionChip
                    key={category.id}
                    label={category.name}
                    selected={isSelected}
                    onPress={() => setDraft((prev) => ({ ...prev, categorySlug: category.slug }))}
                  />
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
                  <SelectionChip
                    key={option.value}
                    label={option.label}
                    selected={isSelected}
                    disabled={isLockedOption}
                    onPress={() => {
                      if (isLockedOption) {
                        setMessage('Los pagos online se habilitan desde el plan Pro.');
                        return;
                      }
                      setDraft((prev) => ({ ...prev, paymentType: option.value }));
                    }}
                  />
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

          {draft.paymentType !== 'ON_SITE' && canUseOnlinePayments ? (
            <View className="mt-3" style={{ gap: 8 }}>
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
                Acreditación de Mercado Pago
              </Text>
              <View style={{ gap: 8 }}>
                {PROCESSING_FEE_OPTIONS.map((option) => (
                  <SelectionChip
                    key={option.value}
                    label={option.label}
                    selected={draft.processingFeeMode === option.value}
                    onPress={() => setDraft((prev) => ({ ...prev, processingFeeMode: option.value }))}
                  />
                ))}
              </View>
              <Text className="text-xs text-gray-500">
                El cargo al cliente incluye el fee de Mercado Pago, su IVA y 1% adicional de Plura.
              </Text>
            </View>
          ) : null}

          <ActionButton
            disabled={isSaving || !draft.name.trim() || !draft.price.trim() || !draft.duration.trim()}
            loading={isSaving}
            label={editingId ? 'Guardar cambios' : 'Crear servicio'}
            tone="primary"
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
                  processingFeeMode: draft.processingFeeMode,
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
            style={{ marginTop: 16 }}
          />

          {message ? <MessageCard message={message} tone="primary" style={{ marginTop: 12 }} /> : null}
        </SectionCard>
        
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
            Tus Servicios ({maxServices >= PRACTICAL_UNLIMITED ? services.length : `${services.length}/${maxServices}`})
          </Text>
          <ActionButton
            label="Nuevo"
            tone="primary"
            disabled={hasReachedServiceLimit}
            onPress={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
            style={{ minHeight: 36 }}
            textStyle={{ fontSize: 12 }}
          />
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
                  {normalizePaymentType(service.paymentType) !== 'ON_SITE' ? (
                    <Text className="text-sm text-gray-500 mt-1">
                      Checkout: {getProcessingFeeModeLabel(service)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-base font-bold text-primary">
                  {service.price ? `$${service.price}` : 'Consultar'}
                </Text>
              </View>

              <View className="flex-row mt-4 gap-2">
                <ActionButton
                  label="Editar"
                  tone="secondary"
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
                      processingFeeMode: normalizeProcessingFeeMode(service.processingFeeMode),
                    });
                  }}
                  style={{ flex: 1, minHeight: 42 }}
                  textStyle={{ fontSize: 13 }}
                />
                <ActionButton
                  label="Eliminar"
                  tone="danger"
                  onPress={async () => {
                    try {
                      await deleteProfessionalService(service.id);
                      setServices((prev) => prev.filter((item) => item.id !== service.id));
                    } catch {
                      setMessage('No se pudo eliminar el servicio.');
                    }
                  }}
                  style={{ minHeight: 42 }}
                  textStyle={{ fontSize: 13 }}
                />
              </View>
            </View>
          ))
        )}

    </AppScreen>
  );
}
