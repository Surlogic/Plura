export type ClientProfile = {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  phoneNumber?: string | null;
  phoneVerified: boolean;
  createdAt: string;
};
