import { router } from 'expo-router';
import {
  clearPendingReservation,
  getPendingReservation,
} from '../../services/pendingReservation';

export type AuthRole = 'cliente' | 'profesional';
export type BackendAuthRole = 'USER' | 'PROFESSIONAL';

export type AuthRoleCopy = {
  role: AuthRole;
  label: string;
  badge: string;
  title: string;
  description: string;
  loginRoute: '/(auth)/login-client' | '/(auth)/login-professional';
  registerRoute: '/(auth)/register-client' | '/(auth)/register-professional';
  alternateLoginRoute: '/(auth)/login-client' | '/(auth)/login-professional';
  alternateLoginLabel: string;
  registerLinkLabel: string;
  loginLinkLabel: string;
  loginEndpoint: '/auth/login/cliente' | '/auth/login/profesional';
  registerEndpoint: '/auth/register/cliente' | '/auth/register/profesional';
};

export const authRoleCopy: Record<AuthRole, AuthRoleCopy> = {
  cliente: {
    role: 'cliente',
    label: 'cliente',
    badge: 'Cuenta cliente',
    title: 'Iniciar sesion',
    description: 'Descubre profesionales, guarda favoritos y reserva desde mobile.',
    loginRoute: '/(auth)/login-client',
    registerRoute: '/(auth)/register-client',
    alternateLoginRoute: '/(auth)/login-professional',
    alternateLoginLabel: 'Ir a acceso profesional',
    registerLinkLabel: 'Crear cuenta cliente',
    loginLinkLabel: 'Iniciar sesion como cliente',
    loginEndpoint: '/auth/login/cliente',
    registerEndpoint: '/auth/register/cliente',
  },
  profesional: {
    role: 'profesional',
    label: 'profesional',
    badge: 'Panel profesional',
    title: 'Iniciar sesion',
    description: 'Administra agenda, servicios y configuracion de tu negocio.',
    loginRoute: '/(auth)/login-professional',
    registerRoute: '/(auth)/register-professional',
    alternateLoginRoute: '/(auth)/login-client',
    alternateLoginLabel: 'Ir a acceso cliente',
    registerLinkLabel: 'Crear cuenta profesional',
    loginLinkLabel: 'Iniciar sesion profesional',
    loginEndpoint: '/auth/login/profesional',
    registerEndpoint: '/auth/register/profesional',
  },
};

export const authRoleToBackendRole = (role: AuthRole): BackendAuthRole => {
  return role === 'profesional' ? 'PROFESSIONAL' : 'USER';
};

export const backendRoleToAuthRole = (role?: BackendAuthRole | null): AuthRole | null => {
  if (role === 'PROFESSIONAL') return 'profesional';
  if (role === 'USER') return 'cliente';
  return null;
};

export const resolveLoginRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL' ? '/(auth)/login-professional' : '/(auth)/login-client';
};

export const resolveCompletePhoneRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL'
    ? '/(auth)/complete-phone-professional'
    : '/(auth)/complete-phone-client';
};

export const continueAfterAuth = async (role: AuthRole) => {
  if (role === 'profesional') {
    router.replace('/dashboard');
    return;
  }

  if (role === 'cliente') {
    const pending = await getPendingReservation();
    if (pending) {
      router.replace({
        pathname: '/reservar',
        params: {
          slug: pending.professionalSlug,
          serviceId: pending.serviceId,
          date: pending.date,
          time: pending.time,
        },
      });
      await clearPendingReservation();
      return;
    }
  }

  router.replace('/(tabs)/index');
};
