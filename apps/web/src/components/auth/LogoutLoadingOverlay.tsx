import AuthLoadingOverlay from '@/components/auth/AuthLoadingOverlay';
import { useLogoutTransitionContext } from '@/context/LogoutTransitionContext';

const descriptions = {
  CLIENT: 'Estamos cerrando tu sesión y te llevamos al acceso de cliente.',
  PROFESSIONAL: 'Estamos cerrando tu sesión y te llevamos al acceso profesional.',
  WORKER: 'Estamos cerrando tu sesión y te llevamos al acceso unificado.',
} as const;

export default function LogoutLoadingOverlay() {
  const { isActive, role } = useLogoutTransitionContext();

  return (
    <AuthLoadingOverlay
      visible={isActive}
      title="Cerrando sesión"
      description={role ? descriptions[role] : 'Estamos cerrando tu sesión.'}
    />
  );
}
