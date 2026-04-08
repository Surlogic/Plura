import {
  CLIENT_LOGIN_ROUTE,
  PROFESSIONAL_COMPLETE_PHONE_ROUTE,
  PROFESSIONAL_HOME_ROUTE,
  PROFESSIONAL_LOGIN_ROUTE,
  PROFESSIONAL_REGISTER_ROUTE,
} from '../../shared/auth/routes';

export const professionalAuthCopy = {
  badge: 'Panel profesional',
  title: 'Iniciar sesion',
  description: 'Administra agenda, servicios y configuracion de tu negocio.',
  loginRoute: PROFESSIONAL_LOGIN_ROUTE,
  registerRoute: PROFESSIONAL_REGISTER_ROUTE,
  completePhoneRoute: PROFESSIONAL_COMPLETE_PHONE_ROUTE,
  alternateLoginRoute: CLIENT_LOGIN_ROUTE,
  alternateLoginLabel: 'Ir a acceso cliente',
  registerLinkLabel: 'Crear cuenta profesional',
  loginLinkLabel: 'Iniciar sesion profesional',
  loginEndpoint: '/auth/login/profesional' as const,
  registerEndpoint: '/auth/register/profesional' as const,
  homeRoute: PROFESSIONAL_HOME_ROUTE,
};
