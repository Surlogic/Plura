# Mobile Production Readiness Checklist

## Runtime and Tooling
- [ ] Node `>=20` installed and active (`node -v`).
- [ ] Java backend running on port `3000` in target environment.
- [ ] `EXPO_PUBLIC_API_URL` configurada por entorno y cargada en EAS para release.
- [ ] Google OAuth release configurado con `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y los client IDs nativos que correspondan (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`).

## Security and Session
- [ ] Login flows validated for client and professional.
- [ ] `/auth/refresh` works with release backend cookies/tokens.
- [ ] 401 path refreshes session once and falls back to logout when invalid.
- [ ] Logout clears local token and backend session.

## Core User Flows
- [ ] Explore with advanced filters loads and paginates correctly.
- [ ] Professional profile loads slots and opens checkout.
- [ ] Checkout (`/reservar`) confirms reservation successfully.
- [ ] Professional dashboard: agenda, services, schedule, business profile all persist data.
- [ ] Favorites and settings persist locally across app restart.

## UX and Reliability
- [ ] Error cards shown for network failures on Home and Checkout.
- [ ] Retry actions recover from temporary network outages.
- [ ] Loading states visible on all critical screens.
- [ ] No unhandled promise rejection in Metro logs.
- [ ] El cliente autenticado sincroniza su `push token` en backend al conceder permisos y lo desactiva al revocarlos.

## Build and Release
- [ ] `pnpm -C apps/mobile exec tsc --noEmit` passes.
- [ ] `pnpm -C apps/mobile exec expo export --platform android --platform ios --output-dir /tmp/plura-mobile-export` genera bundles sin errores.
- [ ] `pnpm -C apps/mobile exec npx expo-doctor` sin findings de tooling/dependencias.
- [ ] Android release build smoke-tested on physical device.
- [ ] Backend CORS/session settings verified for mobile release domain/scheme.
