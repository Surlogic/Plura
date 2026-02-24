import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock data basada en la web
const reservations = [
  { id: '1', service: 'Corte + Styling', client: 'Sofía Pérez', time: '10:00', status: 'confirmed', price: '$9.500', duration: '45 min' },
  { id: '2', service: 'Coloración', client: 'Martina Gómez', time: '11:30', status: 'pending', price: '$15.000', duration: '1h 30m' },
  { id: '3', service: 'Perfilado', client: 'Juan Cruz', time: '14:00', status: 'confirmed', price: '$5.000', duration: '30 min' },
];

export default function AgendaScreen() {
  const [filter, setFilter] = useState('hoy'); // 'hoy', 'proximas'

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
        {reservations.map((res) => (
          <View key={res.id} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-base font-bold text-secondary">{res.service}</Text>
                <Text className="text-sm text-gray-500 mt-1">{res.client}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${res.status === 'confirmed' ? 'bg-primary/10' : 'bg-amber-100'}`}>
                <Text className={`text-xs font-bold ${res.status === 'confirmed' ? 'text-primary' : 'text-amber-600'}`}>
                  {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center mt-2 border-t border-gray-100 pt-3">
              <View className="flex-row items-center mr-4">
                <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1 font-medium">{res.time}</Text>
              </View>
              <View className="flex-row items-center mr-4">
                <Ionicons name="hourglass-outline" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1">{res.duration}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-sm font-bold text-primary">{res.price}</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity className="border border-dashed border-primary bg-primary/5 rounded-[20px] p-4 items-center justify-center mt-4 flex-row">
          <Ionicons name="add" size={20} color="#1FB6A6" />
          <Text className="text-primary font-bold ml-1">Crear reserva manual</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}