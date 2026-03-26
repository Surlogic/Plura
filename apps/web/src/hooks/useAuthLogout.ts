import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useLogoutTransitionContext } from '@/context/LogoutTransitionContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { clearFavoriteProfessionals } from '@/services/clientFeatures';
import api from '@/services/api';
import {
  clearAuthAccessToken,
  getKnownAuthSessionRole,
  type KnownAuthSessionRole,
} from '@/services/session';

const isRouteOrChild = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

const isProfessionalPath = (path: string) =>
  isRouteOrChild(path, '/profesional/dashboard') ||
  isRouteOrChild(path, '/profesional/notificaciones') ||
  isRouteOrChild(path, '/profesional/auth');

const isClientPath = (path: string) =>
  isRouteOrChild(path, '/cliente') || isRouteOrChild(path, '/cliente/auth');

const resolveRoleFromPath = (path: string): KnownAuthSessionRole | null => {
  if (isProfessionalPath(path)) return 'PROFESSIONAL';
  if (isClientPath(path)) return 'CLIENT';
  return null;
};

const resolveRedirectPath = (role: KnownAuthSessionRole | null, path: string) => {
  if (role === 'PROFESSIONAL') return '/profesional/auth/login';
  if (role === 'CLIENT') return '/cliente/auth/login';
  if (isProfessionalPath(path)) return '/profesional/auth/login';
  return '/cliente/auth/login';
};

export const useAuthLogout = () => {
  const router = useRouter();
  const { clearProfile: clearClientProfile, profile: clientProfile } = useClientProfileContext();
  const {
    clearProfile: clearProfessionalProfile,
    profile: professionalProfile,
  } = useProfessionalProfileContext();
  const {
    isActive: isLoggingOut,
    startTransition,
    finishTransition,
  } = useLogoutTransitionContext();

  const logout = useCallback(async (role?: KnownAuthSessionRole | null) => {
    if (isLoggingOut) return;

    const currentPath = router.pathname || '';
    const resolvedRole =
      role ||
      (professionalProfile ? 'PROFESSIONAL' : null) ||
      (clientProfile ? 'CLIENT' : null) ||
      getKnownAuthSessionRole() ||
      resolveRoleFromPath(currentPath);
    const redirectPath = resolveRedirectPath(resolvedRole, currentPath);

    startTransition(resolvedRole);

    try {
      await api.post('/auth/logout');
    } catch {
      // Aunque falle el logout remoto, se limpia la sesión local.
    }

    clearAuthAccessToken();
    clearFavoriteProfessionals();
    clearProfessionalProfile();
    clearClientProfile();

    try {
      await router.replace(redirectPath);
      finishTransition();
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(redirectPath);
        return;
      }
      finishTransition();
    }
  }, [
    clearClientProfile,
    clearProfessionalProfile,
    clientProfile,
    finishTransition,
    isLoggingOut,
    professionalProfile,
    router,
    startTransition,
  ]);

  return {
    isLoggingOut,
    logout,
  };
};
