import api from '@/services/api';

export type ProfessionalImageKind = 'logo' | 'gallery' | 'service';

export const uploadProfessionalImage = async (
  file: File,
  kind: ProfessionalImageKind,
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ imageUrl?: string }>(
    `/profesional/images/upload?kind=${encodeURIComponent(kind)}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data?.imageUrl?.trim() ?? '';
};