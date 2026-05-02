'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type { BookingProcessingFeeMode, ServicePaymentType } from '@/types/professional';
import { resolveAssetUrl } from '@/utils/assetUrl';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';

type ProfesionalServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
  price: string;
  depositAmount?: number | null;
  currency?: string | null;
  duration: string;
  postBufferMinutes?: number | null;
  paymentType?: ServicePaymentType | null;
  processingFeeMode?: BookingProcessingFeeMode | null;
  active?: boolean;
};

type ServicePaymentMode = 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';

type ServiceDraft = {
  name: string;
  description: string;
  categorySlug: string;
  imageUrl: string;
  price: string;
  depositAmount: string;
  duration: string;
  postBufferMinutes: string;
  paymentType: ServicePaymentMode;
  processingFeeMode: BookingProcessingFeeMode;
  active: boolean;
};

const createEmptyDraft = (): ServiceDraft => ({
  name: '',
  description: '',
  categorySlug: '',
  imageUrl: '',
  price: '',
  depositAmount: '',
  duration: '',
  postBufferMinutes: '',
  paymentType: 'ON_SITE',
  processingFeeMode: 'INSTANT',
  active: true,
});

const MAX_SERVICE_IMAGE_SIZE = 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SERVICE_PAYMENT_OPTIONS: Array<{
  value: ServicePaymentMode;
  label: string;
  description: string;
}> = [
  {
    value: 'ON_SITE',
    label: 'Pago en el local',
    description: 'El cliente reserva y paga presencialmente.',
  },
  {
    value: 'DEPOSIT',
    label: 'Seña online',
    description: 'El cliente paga una parte online y el resto se resuelve luego.',
  },
  {
    value: 'FULL_PREPAY',
    label: 'Pago total online',
    description: 'El cliente completa el pago antes del turno.',
  },
];

const PROCESSING_FEE_OPTIONS: Array<{
  value: BookingProcessingFeeMode;
  label: string;
  description: string;
}> = [
  {
    value: 'INSTANT',
    label: '5,99% + IVA',
    description: 'Acreditación inmediata de Mercado Pago. El checkout también suma 1% de Plura.',
  },
  {
    value: 'DELAYED_21_DAYS',
    label: '4,99% + IVA',
    description: 'Acreditación a 21 días de Mercado Pago. El checkout también suma 1% de Plura.',
  },
];

const normalizeDurationLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes)) return trimmed;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
};

const normalizePaymentType = (value?: ServicePaymentType | null): ServicePaymentMode => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'DEPOSIT') return 'DEPOSIT';
  if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'FULL_PREPAY';
  return 'ON_SITE';
};

const formatPaymentTypeLabel = (value?: ServicePaymentType | null) => {
  const normalized = normalizePaymentType(value);
  const option = SERVICE_PAYMENT_OPTIONS.find((item) => item.value === normalized);
  return option?.label ?? 'Pago en el local';
};

const normalizeProcessingFeeMode = (
  value?: BookingProcessingFeeMode | string | null,
): BookingProcessingFeeMode => {
  return (value || '').trim().toUpperCase() === 'DELAYED_21_DAYS'
    ? 'DELAYED_21_DAYS'
    : 'INSTANT';
};

const formatProcessingFeeModeLabel = (value?: BookingProcessingFeeMode | string | null) => {
  const option = PROCESSING_FEE_OPTIONS.find(
    (item) => item.value === normalizeProcessingFeeMode(value),
  );
  return option?.label ?? PROCESSING_FEE_OPTIONS[0].label;
};

const formatDepositAmount = (value?: number | null) => {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 2,
  }).format(value);
};

const PRACTICAL_UNLIMITED = 9999;

export default function ProfesionalServicesBuilderPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const { categories, isLoading: isLoadingCategories, error: categoriesError } = useCategories();
  const [services, setServices] = useState<ProfesionalServiceItem[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>(createEmptyDraft());
  const [initialDraft, setInitialDraft] = useState<ServiceDraft>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialEditingId, setInitialEditingId] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string>('');
  const canUseOnlinePayments = featureAccess.onlinePayments;
  const maxServices = profile?.professionalEntitlements?.maxServices ?? 15;

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  const loadServices = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingServices(true);
    try {
      const response = await cachedGet<ProfesionalServiceItem[]>(
        '/profesional/services',
        undefined,
        {
          ttlMs: 15000,
          staleWhileRevalidate: true,
        },
      );
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch {
      setServices([]);
      setSaveMessage('No se pudieron cargar los servicios.');
      setSaveError(true);
    } finally {
      setIsLoadingServices(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void loadServices();
  }, [profile?.id, loadServices]);

  const handleDraftChange = (field: keyof ServiceDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const clearImageSelection = useCallback(() => {
    setSelectedImageFile(null);
    setSelectedImagePreview((prev) => {
      if (prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
  }, []);

  useEffect(() => {
    return () => {
      setSelectedImagePreview((prev) => {
        if (prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return '';
      });
    };
  }, []);

  const resetDraft = () => {
    clearImageSelection();
    const empty = createEmptyDraft();
    setDraft(empty);
    setInitialDraft(empty);
    setEditingId(null);
    setInitialEditingId(null);
  };

  const handleEditService = (service: ProfesionalServiceItem) => {
    clearImageSelection();
    const editDraft = {
      name: service.name,
      description: service.description ?? '',
      categorySlug: service.categorySlug ?? '',
      imageUrl: service.imageUrl ?? '',
      price: service.price,
      depositAmount: service.depositAmount != null ? String(service.depositAmount) : '',
      duration: service.duration,
      postBufferMinutes:
        service.postBufferMinutes && service.postBufferMinutes > 0
          ? String(service.postBufferMinutes)
          : '',
      paymentType: normalizePaymentType(service.paymentType),
      processingFeeMode: normalizeProcessingFeeMode(service.processingFeeMode),
      active: service.active !== false,
    };
    setDraft(editDraft);
    setSelectedImagePreview(service.imageUrl ?? '');
    setInitialDraft(editDraft);
    setEditingId(service.id);
    setInitialEditingId(service.id);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      await api.delete(`/profesional/services/${serviceId}`);
      invalidateCachedGet('/profesional/services');
      setSaveMessage('Servicio eliminado correctamente.');
      setSaveError(false);
      setServices((prev) => prev.filter((item) => item.id !== serviceId));
      if (editingId === serviceId) {
        resetDraft();
      }
    } catch {
      setSaveMessage('No se pudo eliminar el servicio.');
      setSaveError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceImageChange = (file: File | null) => {
    if (!file) {
      clearImageSelection();
      return;
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      setSaveMessage('Formato inválido. Usá jpg, png o webp.');
      setSaveError(true);
      return;
    }

    if (file.size > MAX_SERVICE_IMAGE_SIZE) {
      setSaveMessage('La imagen supera 1MB.');
      setSaveError(true);
      return;
    }

    clearImageSelection();
    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setSelectedImagePreview(previewUrl);
    setSaveMessage(null);
    setSaveError(false);
  };

  const handleSubmitService = async (): Promise<boolean> => {
    if (isSubmitting) return false;
    if (!editingId && services.length >= maxServices) {
      setSaveMessage(`Tu plan permite hasta ${maxServices} servicios.`);
      setSaveError(true);
      return false;
    }
    if (!draft.name.trim() || !draft.price.trim() || !draft.duration.trim()) {
      setSaveMessage('Completá nombre, precio y duración.');
      setSaveError(true);
      return false;
    }

    if (!canUseOnlinePayments && draft.paymentType !== 'ON_SITE') {
      setSaveMessage(
        'Tu plan actual no permite seña online ni pago total online. Cambiá la modalidad a pago en el local o actualizá tu plan.',
      );
      setSaveError(true);
      return false;
    }

    const normalizedBufferRaw = draft.postBufferMinutes.trim();
    const normalizedBuffer = normalizedBufferRaw === '' ? 0 : Number(normalizedBufferRaw);
    if (
      !Number.isFinite(normalizedBuffer)
      || !Number.isInteger(normalizedBuffer)
      || normalizedBuffer < 0
    ) {
      setSaveMessage('El tiempo extra debe ser un número entero mayor o igual a 0.');
      setSaveError(true);
      return false;
    }

    const normalizedDepositRaw = draft.depositAmount.trim();
    const normalizedDeposit = normalizedDepositRaw === '' ? null : Number(normalizedDepositRaw);
    if (draft.paymentType === 'DEPOSIT') {
      if (normalizedDeposit == null || !Number.isFinite(normalizedDeposit) || normalizedDeposit <= 0) {
        setSaveMessage('Ingresá una seña válida mayor a 0.');
        setSaveError(true);
        return false;
      }
    } else if (normalizedDeposit != null && (!Number.isFinite(normalizedDeposit) || normalizedDeposit < 0)) {
      setSaveMessage('La seña debe ser un número mayor o igual a 0.');
      setSaveError(true);
      return false;
    }

    setIsSubmitting(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      let resolvedImageUrl = draft.imageUrl.trim();
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append('file', selectedImageFile);
        const uploadResponse = await api.post<{ imageUrl?: string }>(
          '/profesional/services/image',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        resolvedImageUrl = uploadResponse.data?.imageUrl?.trim() ?? '';
      }

      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        categorySlug: draft.categorySlug.trim(),
        imageUrl: resolvedImageUrl,
        price: draft.price.trim(),
        depositAmount: draft.paymentType === 'DEPOSIT' ? normalizedDepositRaw : null,
        duration: draft.duration.trim(),
        postBufferMinutes: normalizedBuffer,
        paymentType: draft.paymentType,
        processingFeeMode: draft.processingFeeMode,
        active: draft.active,
      };
      const optimisticService: ProfesionalServiceItem = {
        id: editingId ?? `temp-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        categorySlug: payload.categorySlug || null,
        categoryName:
          categories.find((category) => category.slug === payload.categorySlug)?.name ?? null,
        imageUrl: payload.imageUrl,
        price: payload.price,
        depositAmount: draft.paymentType === 'DEPOSIT' ? normalizedDeposit : null,
        duration: payload.duration,
        postBufferMinutes: payload.postBufferMinutes,
        paymentType: payload.paymentType,
        processingFeeMode: payload.processingFeeMode,
        active: payload.active,
      };

      if (editingId) {
        const response = await api.put<ProfesionalServiceItem>(
          `/profesional/services/${editingId}`,
          payload,
        );
        invalidateCachedGet('/profesional/services');
        const updatedService = response.data?.id
          ? response.data
          : optimisticService;
        setServices((prev) =>
          prev.map((item) =>
            item.id === editingId ? { ...item, ...updatedService } : item,
          ),
        );
        setSaveMessage('Servicio actualizado correctamente.');
      } else {
        const response = await api.post<ProfesionalServiceItem>(
          '/profesional/services',
          payload,
        );
        invalidateCachedGet('/profesional/services');
        const createdService = response.data?.id
          ? response.data
          : optimisticService;
        setServices((prev) => [createdService, ...prev]);
        setSaveMessage('Servicio creado correctamente.');
      }
      setSaveError(false);
      resetDraft();
      return true;
    } catch {
      setSaveMessage('No se pudo guardar el servicio.');
      setSaveError(true);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleServiceActive = async (service: ProfesionalServiceItem) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      const nextActive = !(service.active !== false);
      const response = await api.put<ProfesionalServiceItem>(`/profesional/services/${service.id}`, {
        active: nextActive,
      });
      const updatedService = response.data?.id
        ? response.data
        : { ...service, active: nextActive };
      setServices((prev) =>
        prev.map((item) =>
          item.id === service.id ? { ...item, ...updatedService } : item,
        ),
      );
      setSaveMessage(service.active === false ? 'Servicio activado.' : 'Servicio desactivado.');
      setSaveError(false);
    } catch {
      setSaveMessage('No se pudo actualizar el estado del servicio.');
      setSaveError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceCount = useMemo(() => services.length, [services]);
  const activeServiceCount = useMemo(
    () => services.filter((service) => service.active !== false).length,
    [services],
  );
  const servicesWithImageCount = useMemo(
    () => services.filter((service) => Boolean(service.imageUrl)).length,
    [services],
  );
  const serviceCapacityLabel = maxServices >= PRACTICAL_UNLIMITED ? 'Ilimitados' : `${serviceCount}/${maxServices}`;
  const hasReachedServiceLimit = !editingId && services.length >= maxServices;
  const isDirty = useMemo(() => {
    const hasDifferentMode = editingId !== initialEditingId;
    const hasDifferentDraft =
      draft.name !== initialDraft.name ||
      draft.description !== initialDraft.description ||
      draft.categorySlug !== initialDraft.categorySlug ||
      draft.imageUrl !== initialDraft.imageUrl ||
      draft.price !== initialDraft.price ||
      draft.depositAmount !== initialDraft.depositAmount ||
      draft.duration !== initialDraft.duration ||
      draft.postBufferMinutes !== initialDraft.postBufferMinutes ||
      draft.paymentType !== initialDraft.paymentType ||
      draft.active !== initialDraft.active;
    return hasDifferentMode || hasDifferentDraft || Boolean(selectedImageFile);
  }, [draft, editingId, initialDraft, initialEditingId, selectedImageFile]);

  const handleResetUnsaved = useCallback(() => {
    clearImageSelection();
    setDraft(initialDraft);
    setSelectedImagePreview(initialDraft.imageUrl || '');
    setEditingId(initialEditingId);
    setSaveMessage(null);
    setSaveError(false);
  }, [clearImageSelection, initialDraft, initialEditingId]);

  const fallbackServiceCategoryName = useMemo(() => {
    const profileCategoryName = profile?.categories?.[0]?.name?.trim();
    if (profileCategoryName) {
      return profileCategoryName;
    }
    return profile?.rubro?.trim() || '';
  }, [profile?.categories, profile?.rubro]);

  const resolveServiceCategoryLabel = useCallback((service: ProfesionalServiceItem) => {
    const categoryName = service.categoryName?.trim();
    if (categoryName) {
      return categoryName;
    }
    const categoryFromCatalog = categories.find((category) => category.slug === service.categorySlug)?.name?.trim();
    if (categoryFromCatalog) {
      return categoryFromCatalog;
    }
    return fallbackServiceCategoryName;
  }, [categories, fallbackServiceCategoryName]);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'services-builder',
    isDirty,
    isSaving: isSubmitting,
    onSave: handleSubmitService,
    onReset: handleResetUnsaved,
  });

  return (
    <ProfessionalDashboardShell profile={profile} active="Servicios">
      <div className="space-y-6">
                <DashboardPageHeader
                  eyebrow="Oferta comercial"
                  title="Servicios"
                  description="Separá catálogo y editor para actualizar la oferta con más jerarquía visual."
                  meta={
                    <>
                      <DashboardHeaderBadge tone="success">
                        {serviceCount} servicios
                      </DashboardHeaderBadge>
                      <DashboardHeaderBadge>
                        {activeServiceCount} activos
                      </DashboardHeaderBadge>
                      {maxServices < PRACTICAL_UNLIMITED ? (
                        <DashboardHeaderBadge tone={hasReachedServiceLimit ? 'warning' : 'default'}>
                          Límite {serviceCount}/{maxServices}
                        </DashboardHeaderBadge>
                      ) : null}
                    </>
                  }
                  actions={(
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void loadServices()}
                      disabled={isLoadingServices}
                    >
                      {isLoadingServices ? 'Actualizando...' : 'Actualizar lista'}
                    </Button>
                  )}
                />

                {saveMessage ? (
                  <p className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] ${
                    saveError
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-[#cdeee9] bg-[#f0fffc] text-[#1FB6A6]'
                  }`}>
                    {saveMessage}
                  </p>
                ) : null}

                {showSkeleton ? (
                  <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="h-5 w-52 rounded-full bg-[#E2E7EC]" />
                    <div className="mt-4 space-y-3">
                      <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                      <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                      <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <DashboardStatCard
                        label="Servicios"
                        value={serviceCapacityLabel}
                        detail={maxServices >= PRACTICAL_UNLIMITED ? 'Capacidad sin tope operativo' : 'Cargados sobre el límite del plan'}
                        icon="servicios"
                        tone="warm"
                      />
                      <DashboardStatCard
                        label="Activos"
                        value={`${activeServiceCount}`}
                        detail={`${Math.max(serviceCount - activeServiceCount, 0)} inactivos`}
                        icon="check"
                        tone="accent"
                      />
                      <DashboardStatCard
                        label="Con imagen"
                        value={`${servicesWithImageCount}`}
                        detail="Piezas visuales listas para publicar"
                        icon="publica"
                      />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.08fr,0.92fr]">
                      <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                        <DashboardSectionHeading
                          eyebrow="Catálogo"
                          title="Listado de servicios"
                          description="Compará cobertura visual, activación y contenido antes de editar."
                        />

                        <div className="mt-4 space-y-3">
                          {isLoadingServices ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              Cargando servicios...
                            </div>
                          ) : services.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              Todavía no creaste servicios.
                            </div>
                          ) : (
                            services.map((service) => (
                              <div
                                key={service.id}
                                className="rounded-[20px] border border-[#E2E7EC] bg-[linear-gradient(180deg,#FFFFFF,#F7F9FB)] px-4 py-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="h-18 w-18 shrink-0 overflow-hidden rounded-[16px] border border-[#D9E2EC] bg-white">
                                    {service.imageUrl ? (
                                      <img
                                        src={resolveAssetUrl(service.imageUrl)}
                                        alt={service.name || 'Servicio'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]">
                                        Sin foto
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-base font-semibold text-[#0E2A47]">
                                          {service.name || 'Servicio sin nombre'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#64748B]">
                                          {normalizeDurationLabel(service.duration) || 'Duración a definir'}
                                        </p>
                                        {resolveServiceCategoryLabel(service) ? (
                                          <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                                            {resolveServiceCategoryLabel(service)}
                                          </p>
                                        ) : null}
                                      </div>
                                      <span className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                                        service.active === false
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-[#ECFDF5] text-[#0F766E]'
                                      }`}>
                                        {service.active === false ? 'Inactivo' : 'Activo'}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-[#1FB6A6]">
                                      {service.price || 'Consultar'}
                                    </p>
                                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                                      {formatPaymentTypeLabel(service.paymentType)}
                                      {normalizePaymentType(service.paymentType) === 'DEPOSIT' && service.depositAmount != null
                                        ? ` · Seña ${formatDepositAmount(service.depositAmount)}`
                                        : ''}
                                    </p>
                                    {normalizePaymentType(service.paymentType) !== 'ON_SITE' ? (
                                      <p className="mt-1 text-[0.72rem] text-[#64748B]">
                                        Checkout: {formatProcessingFeeModeLabel(service.processingFeeMode)}
                                      </p>
                                    ) : null}
                                    {service.description ? (
                                      <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">
                                        {service.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditService(service)}
                                    className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleServiceActive(service)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${
                                      service.active === false
                                        ? 'border border-[#1FB6A6]/30 bg-[#1FB6A6]/10 text-[#1FB6A6]'
                                        : 'border border-amber-200 bg-amber-50 text-amber-600'
                                    }`}
                                  >
                                    {service.active === false ? 'Activar' : 'Desactivar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteService(service.id)}
                                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:-translate-y-0.5 hover:shadow-sm"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                        <DashboardSectionHeading
                          eyebrow={editingId ? 'Edición' : 'Alta'}
                          title={editingId ? 'Actualizar servicio' : 'Crear servicio'}
                          description="Usá esta ficha para completar precio, duración, imagen y buffer operativo."
                        />
                        {!editingId && maxServices < PRACTICAL_UNLIMITED ? (
                          <p className={`mt-4 rounded-[16px] border px-3 py-2 text-xs ${
                            hasReachedServiceLimit
                              ? 'border-red-200 bg-red-50 text-red-500'
                              : 'border-[#E2E7EC] bg-[#F8FAFC] text-[#64748B]'
                          }`}>
                            Límite del plan: {serviceCount}/{maxServices} servicios. Cada servicio puede tener 1 foto pública.
                          </p>
                        ) : null}
                        <div className="mt-4 grid gap-4">
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Nombre del servicio
                            </label>
                            <input
                              className={inputClassName}
                              value={draft.name}
                              onChange={(event) =>
                                handleDraftChange('name', event.target.value)
                              }
                              placeholder="Ej: Corte + styling"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Descripción del servicio
                            </label>
                            <textarea
                              className={`${inputClassName} h-24 resize-none py-3`}
                              maxLength={200}
                              value={draft.description}
                              onChange={(event) =>
                                handleDraftChange('description', event.target.value)
                              }
                              placeholder="Ej: Corte clásico con degradé y perfilado de barba."
                            />
                            <p className="mt-1 text-xs text-[#64748B]">
                              {draft.description.length}/200
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Categoría del servicio
                            </label>
                            <select
                              className={inputClassName}
                              value={draft.categorySlug}
                              onChange={(event) =>
                                handleDraftChange('categorySlug', event.target.value)
                              }
                              disabled={isLoadingCategories}
                            >
                              <option value="">
                                Sin categoría específica
                              </option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.slug}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-[#64748B]">
                              {isLoadingCategories
                                ? 'Cargando categorías...'
                                : categoriesError
                                  ? categoriesError
                                  : 'Si no la definís, la app seguirá mostrando el rubro del perfil como fallback.'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Foto del servicio
                            </label>
                            <div className="mt-2 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] p-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="cursor-pointer rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm">
                                  Subir imagen
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(event) =>
                                      handleServiceImageChange(event.target.files?.[0] ?? null)
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearImageSelection();
                                    handleDraftChange('imageUrl', '');
                                  }}
                                  className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:-translate-y-0.5 hover:shadow-sm"
                                >
                                  Quitar foto
                                </button>
                                <p className="text-xs text-[#64748B]">
                                  Formatos: jpg, png, webp. Máximo 1MB.
                                </p>
                              </div>
                              {(selectedImagePreview || draft.imageUrl) ? (
                                <div className="mt-3 h-32 w-full overflow-hidden rounded-[12px] border border-[#D9E2EC] bg-white">
                                  <img
                                    src={resolveAssetUrl(selectedImagePreview || draft.imageUrl)}
                                    alt={draft.name ? `Foto de ${draft.name}` : 'Foto del servicio'}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="mt-3 rounded-[12px] border border-dashed border-[#D9E2EC] bg-white px-3 py-4 text-xs text-[#94A3B8]">
                                  Vista previa de la imagen.
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Precio
                            </label>
                            <input
                              className={inputClassName}
                              value={draft.price}
                              onChange={(event) =>
                                handleDraftChange('price', event.target.value)
                              }
                              placeholder="Ej: $9.500"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Modalidad de pago
                            </label>
                            <div className="mt-2 grid gap-2">
                              {SERVICE_PAYMENT_OPTIONS.map((option) => {
                                const isSelected = draft.paymentType === option.value;
                                const isLockedOption =
                                  !canUseOnlinePayments && option.value !== 'ON_SITE';
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      if (isLockedOption) {
                                        setSaveMessage(
                                          'Los pagos online se habilitan desde el plan Pro.',
                                        );
                                        setSaveError(true);
                                        return;
                                      }
                                      setDraft((prev) => ({ ...prev, paymentType: option.value }));
                                    }}
                                    disabled={isLockedOption}
                                    className={`rounded-[16px] border px-4 py-3 text-left transition ${
                                      isSelected
                                        ? 'border-[#1FB6A6] bg-[#F0FFFC] shadow-[0_10px_24px_rgba(31,182,166,0.12)]'
                                        : isLockedOption
                                          ? 'cursor-not-allowed border-[#E2E7EC] bg-[#F8FAFC] text-[#94A3B8] opacity-70'
                                          : 'border-[#E2E7EC] bg-white hover:-translate-y-0.5 hover:shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <p className={`text-sm font-semibold ${
                                        isLockedOption ? 'text-[#64748B]' : 'text-[#0E2A47]'
                                      }`}>
                                        {option.label}
                                      </p>
                                      {isLockedOption ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--premium-strong)]">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                          </svg>
                                          Pro
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-[#64748B]">
                                      {option.description}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                            {!canUseOnlinePayments ? (
                              <p className="mt-3 rounded-[16px] border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-3 py-2 text-xs text-[color:var(--premium-strong)]">
                                La seña online y el prepago total se habilitan en el plan Pro.
                              </p>
                            ) : null}
                          </div>
                          {draft.paymentType !== 'ON_SITE' && canUseOnlinePayments ? (
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Acreditación de Mercado Pago
                              </label>
                              <div className="mt-2 grid gap-2">
                                {PROCESSING_FEE_OPTIONS.map((option) => {
                                  const isSelected = draft.processingFeeMode === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleDraftChange('processingFeeMode', option.value)}
                                      className={`rounded-[16px] border px-4 py-3 text-left transition ${
                                        isSelected
                                          ? 'border-[#1FB6A6] bg-[#F0FFFC] shadow-[0_10px_24px_rgba(31,182,166,0.12)]'
                                          : 'border-[#E2E7EC] bg-white hover:-translate-y-0.5 hover:shadow-sm'
                                      }`}
                                    >
                                      <p className="text-sm font-semibold text-[#0E2A47]">
                                        {option.label}
                                      </p>
                                      <p className="mt-1 text-xs text-[#64748B]">
                                        {option.description}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="mt-2 text-xs text-[#64748B]">
                                El cargo al cliente incluye el fee de Mercado Pago, su IVA y 1% adicional de Plura.
                              </p>
                            </div>
                          ) : null}
                          {draft.paymentType === 'DEPOSIT' ? (
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Monto de la seña
                              </label>
                              <input
                                className={inputClassName}
                                value={draft.depositAmount}
                                onChange={(event) =>
                                  handleDraftChange('depositAmount', event.target.value)
                                }
                                placeholder="Ej: 2500"
                              />
                              <p className="mt-1 text-xs text-[#64748B]">
                                Este monto se cobra online para confirmar la reserva.
                              </p>
                            </div>
                          ) : null}
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Duración
                            </label>
                            <input
                              className={inputClassName}
                              value={draft.duration}
                              onChange={(event) =>
                                handleDraftChange('duration', event.target.value)
                              }
                              placeholder="Ej: 45 min"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Tiempo extra (opcional)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className={inputClassName}
                              value={draft.postBufferMinutes}
                              onChange={(event) =>
                                handleDraftChange('postBufferMinutes', event.target.value)
                              }
                              placeholder="Ej: 10"
                            />
                            <p className="mt-1 text-xs text-[#64748B]">
                              Se usa para bloquear tiempo adicional después del turno y evitar
                              solapamientos. No se muestra en tu página pública.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={resetDraft}
                            className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          >
                            Limpiar formulario
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitService()}
                            className="rounded-full bg-[#1FB6A6] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={isSubmitting || hasReachedServiceLimit}
                          >
                            {isSubmitting
                              ? 'Guardando...'
                              : editingId
                                ? 'Guardar cambios'
                                : 'Crear servicio'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
      </div>
    </ProfessionalDashboardShell>
  );
}
