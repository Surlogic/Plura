import api from '@/services/api';

export const REGISTER_HANDOFF_KEY = 'plura:professional-register-handoff';

export type ProfessionalRegisterHandoff = {
  schedule: {
    days: Array<{
      day: string;
      enabled: boolean;
      paused: boolean;
      ranges: Array<{
        id: string;
        start: string;
        end: string;
      }>;
    }>;
    pauses: never[];
    slotDurationMinutes: number;
  };
  firstService: {
    name: string;
    description: string;
    categorySlug: string;
    imageUrl: string;
    price: string;
    depositAmount: null;
    duration: string;
    postBufferMinutes: number;
    paymentType: 'ON_SITE';
    processingFeeMode: 'INSTANT';
    currency: 'UYU';
    active: boolean;
  } | null;
  publicPage: {
    about: string;
  };
};

export const savePendingProfessionalRegisterHandoff = (
  handoff: ProfessionalRegisterHandoff,
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REGISTER_HANDOFF_KEY, JSON.stringify(handoff));
};

export const clearPendingProfessionalRegisterHandoff = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REGISTER_HANDOFF_KEY);
};

export const applyProfessionalRegisterHandoff = async (
  handoff: ProfessionalRegisterHandoff,
) => {
  if (handoff.publicPage.about) {
    await api.put('/profesional/public-page', {
      about: handoff.publicPage.about,
    });
  }

  await api.put('/profesional/schedule', handoff.schedule);

  if (handoff.firstService) {
    await api.post('/profesional/services', handoff.firstService);
  }
};

const parsePendingProfessionalRegisterHandoff = ():
  | ProfessionalRegisterHandoff
  | null => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(REGISTER_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ProfessionalRegisterHandoff;
    if (!parsed || typeof parsed !== 'object') {
      clearPendingProfessionalRegisterHandoff();
      return null;
    }
    return parsed;
  } catch {
    clearPendingProfessionalRegisterHandoff();
    return null;
  }
};

export const applyPendingProfessionalRegisterHandoff = async () => {
  const handoff = parsePendingProfessionalRegisterHandoff();
  if (!handoff) return false;

  await applyProfessionalRegisterHandoff(handoff);
  clearPendingProfessionalRegisterHandoff();
  return true;
};
