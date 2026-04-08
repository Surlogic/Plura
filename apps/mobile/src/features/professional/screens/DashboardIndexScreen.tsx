import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export default function ProfessionalDashboardIndex() {
  const { hasLoaded, role } = useAuthSession();

  if (!hasLoaded) {
    return null;
  }

  if (role !== 'professional') return null;

  return <Redirect href="/dashboard/agenda" />;
}
