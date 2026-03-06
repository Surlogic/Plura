import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProfessionalReservationsByRange } from '../../src/services/professionalBookings';
import type { ProfessionalReservation } from '../../src/types/professional';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const today = new Date();
const nextMonth = new Date();
nextMonth.setDate(today.getDate() + 30);

export default function AgendaScreen() {
  const [filter, setFilter] = useState('hoy'); // 'hoy', 'proximas'
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReservations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateFrom = filter === 'hoy' ? toIsoDate(today) : toIsoDate(new Date());
        const dateTo = filter === 'hoy' ? toIsoDate(today) : toIsoDate(nextMonth);
        const response = await getProfessionalReservationsByRange(dateFrom, dateTo);
        setReservations(response);
      } catch {
        setError('No pudimos cargar la agenda en este momento.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReservations();
  }, [filter]);

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [reservations],
  );

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

        {!isLoading && !error && sortedReservations.length === 0 ? (
          <View className="bg-white rounded-[20px] p-6 border border-dashed border-secondary/20 mb-4">
            <Text className="text-gray-500 text-center">No hay reservas en este rango.</Text>
          </View>
        ) : null}

        {sortedReservations.map((res) => (
          <View key={res.id} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-base font-bold text-secondary">{res.serviceName}</Text>
                <Text className="text-sm text-gray-500 mt-1">{res.clientName}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${res.status === 'confirmed' ? 'bg-primary/10' : 'bg-amber-100'}`}>
                <Text className={`text-xs font-bold ${res.status === 'confirmed' ? 'text-primary' : 'text-amber-600'}`}>
                  {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
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
          </View>
        ))}
      </ScrollView>
    </View>
  );
}