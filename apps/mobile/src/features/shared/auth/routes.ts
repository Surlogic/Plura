export type BackendAuthRole = 'USER' | 'PROFESSIONAL';

export const CLIENT_LOGIN_ROUTE = '/(auth)/login-client' as const;
export const PROFESSIONAL_LOGIN_ROUTE = '/(auth)/login-professional' as const;
export const CLIENT_REGISTER_ROUTE = '/(auth)/register-client' as const;
export const PROFESSIONAL_REGISTER_ROUTE = '/(auth)/register-professional' as const;
export const CLIENT_COMPLETE_PHONE_ROUTE = '/(auth)/complete-phone-client' as const;
export const PROFESSIONAL_COMPLETE_PHONE_ROUTE = '/(auth)/complete-phone-professional' as const;
export const CLIENT_HOME_ROUTE = '/(tabs)/index' as const;
export const PROFESSIONAL_HOME_ROUTE = '/dashboard' as const;
export const AUTH_ENTRY_LOGIN_ROUTE = '/(auth)/login' as const;
export const AUTH_ENTRY_REGISTER_ROUTE = '/(auth)/register' as const;
export const AUTH_FORGOT_PASSWORD_ROUTE = '/(auth)/forgot-password' as const;

export const resolveLoginRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL' ? PROFESSIONAL_LOGIN_ROUTE : CLIENT_LOGIN_ROUTE;
};

export const resolveCompletePhoneRouteFromBackendRole = (role?: BackendAuthRole | null) => {
  return role === 'PROFESSIONAL'
    ? PROFESSIONAL_COMPLETE_PHONE_ROUTE
    : CLIENT_COMPLETE_PHONE_ROUTE;
};
