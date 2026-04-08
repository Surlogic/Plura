import React from 'react';
import { Redirect } from 'expo-router';
import { useProfessionalSession } from '../session/useProfessionalSession';

export default function ProfessionalDashboardIndex() {
  const { hasLoaded, isProfessional } = useProfessionalSession();

  if (!hasLoaded) {
    return null;
  }

  if (!isProfessional) return null;

  return <Redirect href="/dashboard/agenda" />;
}
