import type { AuthContextDescriptor, AuthContextType } from '../../../services/authContext';

export type BackendAuthRole = 'USER' | 'PROFESSIONAL';

export const CLIENT_LOGIN_ROUTE = '/(auth)/login-client' as const;
export const PROFESSIONAL_LOGIN_ROUTE = '/(auth)/login-professional' as const;
export const UNIFIED_LOGIN_ROUTE = '/(auth)/login' as const;
export const WORKER_INVITATION_ROUTE = '/(auth)/worker-invitation' as const;
export const CLIENT_REGISTER_ROUTE = '/(auth)/register-client' as const;
export const PROFESSIONAL_REGISTER_ROUTE = '/(auth)/register-professional' as const;
export const CLIENT_COMPLETE_PHONE_ROUTE = '/(auth)/complete-phone-client' as const;
export const PROFESSIONAL_COMPLETE_PHONE_ROUTE = '/(auth)/complete-phone-professional' as const;
export const CLIENT_HOME_ROUTE = '/(tabs)' as const;
export const PROFESSIONAL_HOME_ROUTE = '/dashboard' as const;
export const WORKER_HOME_ROUTE = '/trabajador/calendario' as const;
export const WORKER_BOOKINGS_ROUTE = '/trabajador/reservas' as const;
export const PROFESSIONAL_TEAM_ROUTE = '/dashboard/equipo' as const;
export const AUTH_WELCOME_ROUTE = '/' as const;
export const AUTH_FORGOT_PASSWORD_ROUTE = '/(auth)/forgot-password' as const;

export const resolveLoginRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL' ? PROFESSIONAL_LOGIN_ROUTE : CLIENT_LOGIN_ROUTE;
};

export const resolveCompletePhoneRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL'
    ? PROFESSIONAL_COMPLETE_PHONE_ROUTE
    : CLIENT_COMPLETE_PHONE_ROUTE;
};

export const homeRouteForContextType = (type: AuthContextType): string => {
  switch (type) {
    case 'PROFESSIONAL':
      return PROFESSIONAL_HOME_ROUTE;
    case 'WORKER':
      return WORKER_HOME_ROUTE;
    default:
      return CLIENT_HOME_ROUTE;
  }
};

export const homeRouteForContext = (descriptor: AuthContextDescriptor | null | undefined) => {
  if (!descriptor) return CLIENT_HOME_ROUTE;
  return homeRouteForContextType(descriptor.type);
};
