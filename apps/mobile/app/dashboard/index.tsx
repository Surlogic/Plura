import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';

export default function ProfessionalDashboardIndex() {
  const { hasLoaded, role, isAuthenticated } = useAuthSession();

  if (!hasLoaded) {
    return null;
  }

  if (role !== 'professional') {
    return <Redirect href={isAuthenticated ? '/(tabs)/dashboard' : '/(auth)/login'} />;
  }

  return <Redirect href="/dashboard/agenda" />;
}