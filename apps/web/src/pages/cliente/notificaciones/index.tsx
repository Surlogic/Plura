import ClientShell from '@/components/cliente/ClientShell';
import ClientNotificationsCenter from '@/components/cliente/notifications/ClientNotificationsCenter';
import { useClientProfile } from '@/hooks/useClientProfile';

export default function ClienteNotificacionesPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';

  return (
    <ClientShell name={displayName} active="notificaciones">
      <ClientNotificationsCenter />
    </ClientShell>
  );
}
