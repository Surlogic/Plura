import React from 'react';
import { Redirect } from 'expo-router';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function ProfessionalDashboardIndex() {
  const { hasLoaded, role } = useProfessionalProfileContext();

  if (!hasLoaded) {
    return null;
  }

  if (role !== 'professional') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/dashboard/agenda" />;
}