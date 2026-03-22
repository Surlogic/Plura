import * as Location from 'expo-location';
import { setJsonItem, getJsonItem } from './storage';

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type UserLocationSnapshot = {
  permissionStatus: LocationPermissionStatus;
  canAskAgain: boolean;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  updatedAt: string | null;
};

const USER_LOCATION_KEY = 'plura_user_location';

export const DEFAULT_USER_LOCATION_SNAPSHOT: UserLocationSnapshot = {
  permissionStatus: 'undetermined',
  canAskAgain: true,
  latitude: null,
  longitude: null,
  label: null,
  updatedAt: null,
};

const buildLocationLabel = (place?: Location.LocationGeocodedAddress | null) => {
  if (!place) return null;

  const parts = [place.city, place.subregion, place.region, place.country]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return Array.from(new Set(parts)).slice(0, 3).join(', ');
};

const persistSnapshot = async (snapshot: UserLocationSnapshot) => {
  await setJsonItem(USER_LOCATION_KEY, snapshot);
  return snapshot;
};

const persistPermissionState = async (
  permissionStatus: LocationPermissionStatus,
  canAskAgain: boolean,
) => {
  const current = await getStoredUserLocation();

  if (permissionStatus === 'granted') {
    return persistSnapshot({
      ...current,
      permissionStatus,
      canAskAgain,
    });
  }

  return persistSnapshot({
    permissionStatus,
    canAskAgain,
    latitude: null,
    longitude: null,
    label: null,
    updatedAt: current.updatedAt,
  });
};

const resolveLocationSnapshot = async (): Promise<UserLocationSnapshot> => {
  const permissions = await Location.getForegroundPermissionsAsync();
  const permissionStatus = permissions.status as LocationPermissionStatus;

  if (permissionStatus !== 'granted') {
    return persistPermissionState(permissionStatus, permissions.canAskAgain);
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let label: string | null = null;

  try {
    const places = await Location.reverseGeocodeAsync({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    label = buildLocationLabel(places[0]);
  } catch {
    label = null;
  }

  return persistSnapshot({
    permissionStatus,
    canAskAgain: permissions.canAskAgain,
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    label,
    updatedAt: new Date().toISOString(),
  });
};

export const getStoredUserLocation = async (): Promise<UserLocationSnapshot> =>
  getJsonItem<UserLocationSnapshot>(USER_LOCATION_KEY, DEFAULT_USER_LOCATION_SNAPSHOT);

export const syncStoredLocationPermission = async (): Promise<UserLocationSnapshot> => {
  try {
    const permissions = await Location.getForegroundPermissionsAsync();
    return persistPermissionState(
      permissions.status as LocationPermissionStatus,
      permissions.canAskAgain,
    );
  } catch {
    return getStoredUserLocation();
  }
};

export const refreshStoredUserLocation = async (): Promise<UserLocationSnapshot> => {
  try {
    return await resolveLocationSnapshot();
  } catch {
    return getStoredUserLocation();
  }
};

export const requestAndStoreUserLocation = async (): Promise<UserLocationSnapshot> => {
  try {
    const permissions = await Location.requestForegroundPermissionsAsync();
    if (permissions.status !== 'granted') {
      return persistPermissionState(
        permissions.status as LocationPermissionStatus,
        permissions.canAskAgain,
      );
    }

    return resolveLocationSnapshot();
  } catch {
    return getStoredUserLocation();
  }
};
