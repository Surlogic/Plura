export type ProfessionalProfile = {
  id: string;
  slug?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  rubro: string;
  location: string | null;
  tipoCliente: string;
  publicHeadline?: string | null;
  publicAbout?: string | null;
  publicPhotos?: string[];
};
