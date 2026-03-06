import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfessionalService } from '../../src/types/professional';
import {
  createProfessionalService,
  deleteProfessionalService,
  listProfessionalServices,
  updateProfessionalService,
} from '../../src/services/professionalConfig';

const emptyDraft = {
  name: '',
  description: '',
  imageUrl: '',
  price: '',
  duration: '',
  postBufferMinutes: '0',
};

export default function ServicesScreen() {
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
        <View className="bg-white rounded-[20px] p-5 mb-5 shadow-sm border border-secondary/5">
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

          <TouchableOpacity
            disabled={isSaving || !draft.name.trim() || !draft.price.trim() || !draft.duration.trim()}
            onPress={async () => {
              setIsSaving(true);
              setMessage(null);
              try {
                const payload = {
                  name: draft.name.trim(),
                  description: draft.description.trim(),
                  imageUrl: draft.imageUrl.trim(),
                  price: draft.price.trim(),
                  duration: draft.duration.trim(),
                  postBufferMinutes: Number(draft.postBufferMinutes) || 0,
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

          {message ? <Text className="mt-2 text-xs text-secondary">{message}</Text> : null}
        </View>
        
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
            Tus Servicios ({services.length})
          </Text>
          <TouchableOpacity
            className="bg-secondary px-3 py-1.5 rounded-full"
            onPress={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            <Text className="text-white text-xs font-bold">Nuevo</Text>
          </TouchableOpacity>
        </View>

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
                      description: '',
                      imageUrl: '',
                      price: service.price || '',
                      duration: service.duration || '',
                      postBufferMinutes: '0',
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

      </ScrollView>
    </View>
  );
}