import { router } from 'expo-router';
import { clearPendingReservation, getPendingReservation } from '../../../services/pendingReservation';
import {
  CLIENT_COMPLETE_PHONE_ROUTE,
  CLIENT_HOME_ROUTE,
  CLIENT_LOGIN_ROUTE,
  CLIENT_REGISTER_ROUTE,
  PROFESSIONAL_LOGIN_ROUTE,
} from '../../shared/auth/routes';

export const clientAuthCopy = {
  badge: 'Cuenta cliente',
  title: 'Iniciar sesion',
  description: 'Descubre profesionales, guarda favoritos y reserva desde mobile.',
  loginRoute: CLIENT_LOGIN_ROUTE,
  registerRoute: CLIENT_REGISTER_ROUTE,
  completePhoneRoute: CLIENT_COMPLETE_PHONE_ROUTE,
  alternateLoginRoute: PROFESSIONAL_LOGIN_ROUTE,
  alternateLoginLabel: 'Ir a acceso profesional',
  registerLinkLabel: 'Crear cuenta cliente',
  loginLinkLabel: 'Iniciar sesion como cliente',
  loginEndpoint: '/auth/login/cliente' as const,
  registerEndpoint: '/auth/register/cliente' as const,
};

export const continueAfterClientAuth = async () => {
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

  router.replace(CLIENT_HOME_ROUTE);
};
