import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  cancelProfessionalBooking,
  createProfessionalReservation,
  completeProfessionalBooking,
  getProfessionalBookingActions,
  getProfessionalReservationsByRange,
  listProfessionalServices,
  markProfessionalBookingNoShow,
  rescheduleProfessionalBooking,
  retryProfessionalBookingPayout,
} from '../../src/services/professionalBookings';
import type { ProfessionalReservation } from '../../src/types/professional';
import { getApiErrorMessage } from '../../src/services/errors';
import { getPublicSlots } from '../../src/services/publicBookings';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const today = new Date();
const nextMonth = new Date();
nextMonth.setDate(today.getDate() + 30);

export default function AgendaScreen() {
  const { profile } = useProfessionalProfileContext();
  const [filter, setFilter] = useState('hoy'); // 'hoy', 'proximas'
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [actions, setActions] = useState<Awaited<ReturnType<typeof getProfessionalBookingActions>> | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingServiceOptions, setIsLoadingServiceOptions] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    date: toIsoDate(today),
    time: '09:00',
  });
  const [rescheduleDate, setRescheduleDate] = useState(toIsoDate(today));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);

  const loadReservations = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const dateFrom = filter === 'hoy' ? toIsoDate(today) : toIsoDate(new Date());
      const dateTo = filter === 'hoy' ? toIsoDate(today) : toIsoDate(nextMonth);
      const response = await getProfessionalReservationsByRange(dateFrom, dateTo);
      setReservations(response);
      setSelectedReservationId((current) => {
        if (current && response.some((item) => item.id === current)) return current;
        return response[0]?.id ?? null;
      });
    } catch {
      setError('No pudimos cargar la agenda en este momento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [filter]);

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [reservations],
  );

  const selectedReservation = useMemo(
    () => sortedReservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [selectedReservationId, sortedReservations],
  );

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedReservation?.id) {
        setActions(null);
        return;
      }

      setIsLoadingActions(true);
      try {
        const next = await getProfessionalBookingActions(selectedReservation.id);
        setActions(next);
      } catch {
        setActions(null);
      } finally {
        setIsLoadingActions(false);
      }
    };

    void loadActions();
  }, [selectedReservation?.id]);

  useEffect(() => {
    const loadServices = async () => {
      setIsLoadingServiceOptions(true);
      try {
        const services = await listProfessionalServices();
        const mapped = services.map((service) => ({ id: service.id, name: service.name }));
        setServiceOptions(mapped);
        setCreateForm((prev) => ({
          ...prev,
          serviceId: prev.serviceId || mapped[0]?.id || '',
        }));
      } catch {
        setServiceOptions([]);
      } finally {
        setIsLoadingServiceOptions(false);
      }
    };

    void loadServices();
  }, []);

  useEffect(() => {
    const loadRescheduleSlots = async () => {
      if (!actions?.canReschedule || !selectedReservation?.serviceId || !profile?.slug || !rescheduleDate) {
        setRescheduleSlots([]);
        setRescheduleTime('');
        return;
      }

      setIsLoadingRescheduleSlots(true);
      try {
        const slots = await getPublicSlots(profile.slug, rescheduleDate, selectedReservation.serviceId);
        setRescheduleSlots(slots);
        setRescheduleTime((current) => (current && slots.includes(current) ? current : ''));
      } catch {
        setRescheduleSlots([]);
      } finally {
        setIsLoadingRescheduleSlots(false);
      }
    };

    void loadRescheduleSlots();
  }, [actions?.canReschedule, profile?.slug, rescheduleDate, selectedReservation?.serviceId]);

  const handleAction = async (
    type: 'cancel' | 'complete' | 'no_show' | 'retry_payout' | 'reschedule',
  ) => {
    if (!selectedReservation) return;

    setIsSubmittingAction(true);
    setMessage(null);
    try {
      if (type === 'cancel') {
        await cancelProfessionalBooking(selectedReservation.id, cancelReason);
      } else if (type === 'complete') {
        await completeProfessionalBooking(selectedReservation.id);
      } else if (type === 'no_show') {
        await markProfessionalBookingNoShow(selectedReservation.id);
      } else if (type === 'reschedule') {
        if (!rescheduleDate || !rescheduleTime) {
          setMessage('Selecciona una fecha y un horario para reagendar.');
          return;
        }
        await rescheduleProfessionalBooking(
          selectedReservation.id,
          `${rescheduleDate}T${rescheduleTime}:00`,
        );
      } else {
        await retryProfessionalBookingPayout(selectedReservation.id);
      }

      setMessage('Accion aplicada correctamente.');
      await loadReservations();
    } catch (actionError) {
      setMessage(getApiErrorMessage(actionError, 'No se pudo aplicar la accion.'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateReservation = async () => {
    if (!createForm.clientName.trim() || !createForm.serviceId || !createForm.date || !createForm.time) {
      setMessage('Completa cliente, servicio, fecha y hora para crear la reserva.');
      return;
    }

    setIsSubmittingAction(true);
    setMessage(null);
    try {
      await createProfessionalReservation({
        clientName: createForm.clientName.trim(),
        clientEmail: createForm.clientEmail.trim() || undefined,
        clientPhone: createForm.clientPhone.trim() || undefined,
        serviceId: createForm.serviceId,
        startDateTime: `${createForm.date}T${createForm.time}:00`,
      });

      setCreateForm((prev) => ({
        ...prev,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
      }));
      setShowCreateForm(false);
      setMessage('Reserva creada correctamente.');
      await loadReservations();
    } catch (createError) {
      setMessage(getApiErrorMessage(createError, 'No se pudo crear la reserva.'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      
      {/* Selector de Filtro */}
      <View className="flex-row px-6 py-4">
        <TouchableOpacity 
          onPress={() => setFilter('hoy')}
          className={`px-5 py-2.5 rounded-full mr-3 border ${filter === 'hoy' ? 'bg-secondary border-secondary' : 'bg-white border-secondary/10'}`}
        >
          <Text className={`font-bold text-sm ${filter === 'hoy' ? 'text-white' : 'text-secondary'}`}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFilter('proximas')}
          className={`px-5 py-2.5 rounded-full border ${filter === 'proximas' ? 'bg-secondary border-secondary' : 'bg-white border-secondary/10'}`}
        >
          <Text className={`font-bold text-sm ${filter === 'proximas' ? 'text-white' : 'text-secondary'}`}>Próximas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {isLoading ? (
          <View className="py-10 items-center">
            <ActivityIndicator color="#1FB6A6" />
          </View>
        ) : null}

        {!isLoading && error ? (
          <View className="bg-white rounded-[20px] p-6 border border-secondary/10 mb-4">
            <Text className="text-red-500 text-center">{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View className="bg-white rounded-[20px] p-4 border border-secondary/10 mb-4">
            <Text className="text-secondary text-center text-sm">{message}</Text>
          </View>
        ) : null}

        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/10">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold uppercase tracking-[2px] text-gray-500">Nueva reserva</Text>
            <TouchableOpacity
              onPress={() => setShowCreateForm((prev) => !prev)}
              className="rounded-full border border-secondary/10 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-secondary">{showCreateForm ? 'Cerrar' : 'Abrir'}</Text>
            </TouchableOpacity>
          </View>

          {showCreateForm ? (
            <>
              <TextInput
                className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                placeholder="Nombre del cliente"
                value={createForm.clientName}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, clientName: value }))}
              />
              <TextInput
                className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                placeholder="Email cliente (opcional)"
                value={createForm.clientEmail}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, clientEmail: value }))}
              />
              <TextInput
                className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                placeholder="Telefono cliente (opcional)"
                value={createForm.clientPhone}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, clientPhone: value }))}
              />

              <TextInput
                className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                placeholder="Fecha YYYY-MM-DD"
                value={createForm.date}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, date: value }))}
              />
              <TextInput
                className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                placeholder="Hora HH:mm"
                value={createForm.time}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, time: value }))}
              />

              <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                {isLoadingServiceOptions ? (
                  <ActivityIndicator color="#1FB6A6" />
                ) : (
                  serviceOptions.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      onPress={() => setCreateForm((prev) => ({ ...prev, serviceId: service.id }))}
                      className={`rounded-full px-3 py-2 ${createForm.serviceId === service.id ? 'bg-secondary' : 'bg-background border border-secondary/10'}`}
                    >
                      <Text className={`text-xs font-semibold ${createForm.serviceId === service.id ? 'text-white' : 'text-secondary'}`}>
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <TouchableOpacity
                disabled={isSubmittingAction}
                onPress={() => void handleCreateReservation()}
                className="mt-3 h-11 items-center justify-center rounded-full bg-secondary"
              >
                <Text className="font-bold text-white">Crear reserva</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {!isLoading && !error && sortedReservations.length === 0 ? (
          <View className="bg-white rounded-[20px] p-6 border border-dashed border-secondary/20 mb-4">
            <Text className="text-gray-500 text-center">No hay reservas en este rango.</Text>
          </View>
        ) : null}

        {sortedReservations.map((res) => (
          <TouchableOpacity
            key={res.id}
            onPress={() => setSelectedReservationId(res.id)}
            className={`rounded-[20px] p-5 mb-4 shadow-sm border ${selectedReservationId === res.id ? 'bg-primary/5 border-primary/30' : 'bg-white border-secondary/5'}`}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-base font-bold text-secondary">{res.serviceName}</Text>
                <Text className="text-sm text-gray-500 mt-1">{res.clientName}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${res.status === 'confirmed' ? 'bg-primary/10' : 'bg-amber-100'}`}>
                <Text className={`text-xs font-bold ${res.status === 'confirmed' ? 'text-primary' : 'text-amber-600'}`}>
                  {res.status === 'confirmed' ? 'Confirmada' : res.status === 'completed' ? 'Completada' : res.status === 'cancelled' ? 'Cancelada' : res.status === 'no_show' ? 'No asistio' : 'Pendiente'}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center mt-2 border-t border-gray-100 pt-3">
              <View className="flex-row items-center mr-4">
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1">{res.date}</Text>
              </View>
              <View className="flex-row items-center mr-4">
                <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1 font-medium">{res.time}</Text>
              </View>
              <View className="flex-row items-center mr-4">
                <Ionicons name="hourglass-outline" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1">{res.duration || '30 min'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {selectedReservation ? (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/10">
            <Text className="text-sm font-bold uppercase tracking-[2px] text-gray-500">Acciones</Text>
            <Text className="mt-2 text-base font-bold text-secondary">{selectedReservation.serviceName} - {selectedReservation.clientName}</Text>

            {isLoadingActions ? (
              <View className="mt-4 items-center">
                <ActivityIndicator color="#1FB6A6" />
              </View>
            ) : null}

            {actions?.canCancel ? (
              <>
                <TextInput
                  className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                  placeholder="Motivo de cancelacion (opcional)"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
                <TouchableOpacity
                  disabled={isSubmittingAction}
                  onPress={() => {
                    Alert.alert('Cancelar reserva', 'Se cancelara la reserva seleccionada.', [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Si, cancelar',
                        style: 'destructive',
                        onPress: () => {
                          void handleAction('cancel');
                        },
                      },
                    ]);
                  }}
                  className="mt-3 h-11 items-center justify-center rounded-full bg-red-600"
                >
                  <Text className="font-bold text-white">Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {actions?.canMarkNoShow ? (
              <TouchableOpacity
                disabled={isSubmittingAction}
                onPress={() => void handleAction('no_show')}
                className="mt-3 h-11 items-center justify-center rounded-full bg-amber-600"
              >
                <Text className="font-bold text-white">Marcar no-show</Text>
              </TouchableOpacity>
            ) : null}

            {actions?.canReschedule ? (
              <>
                <TextInput
                  className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                  placeholder="Nueva fecha YYYY-MM-DD"
                  value={rescheduleDate}
                  onChangeText={setRescheduleDate}
                />

                {isLoadingRescheduleSlots ? (
                  <View className="mt-3 items-center">
                    <ActivityIndicator color="#1FB6A6" />
                  </View>
                ) : (
                  <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                    {rescheduleSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        onPress={() => setRescheduleTime(slot)}
                        className={`rounded-full px-3 py-2 ${rescheduleTime === slot ? 'bg-secondary' : 'bg-background border border-secondary/10'}`}
                      >
                        <Text className={`text-xs font-semibold ${rescheduleTime === slot ? 'text-white' : 'text-secondary'}`}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  disabled={isSubmittingAction || !rescheduleTime}
                  onPress={() => void handleAction('reschedule')}
                  className={`mt-3 h-11 items-center justify-center rounded-full ${rescheduleTime ? 'bg-secondary' : 'bg-gray-300'}`}
                >
                  <Text className="font-bold text-white">Reagendar</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {(selectedReservation.status === 'pending' || selectedReservation.status === 'confirmed') ? (
              <TouchableOpacity
                disabled={isSubmittingAction}
                onPress={() => void handleAction('complete')}
                className="mt-3 h-11 items-center justify-center rounded-full bg-secondary"
              >
                <Text className="font-bold text-white">Marcar completada</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              disabled={isSubmittingAction}
              onPress={() => void handleAction('retry_payout')}
              className="mt-3 h-11 items-center justify-center rounded-full border border-secondary/15 bg-background"
            >
              <Text className="font-bold text-secondary">Reintentar payout</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}