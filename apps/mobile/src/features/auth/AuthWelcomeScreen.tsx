import React from 'react';
import { AppScreen } from '../../components/ui/AppScreen';
import { AuthEntryShowcase } from './AuthEntryShowcase';

export function AuthWelcomeScreen() {
  return (
    <AppScreen
      edges={['top', 'bottom']}
      fillInnerShell
      contentContainerStyle={{ flex: 1, paddingHorizontal: 0, paddingVertical: 0 }}
    >
      <AuthEntryShowcase />
    </AppScreen>
  );
}
