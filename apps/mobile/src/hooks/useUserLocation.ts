import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  DEFAULT_USER_LOCATION_SNAPSHOT,
  getStoredUserLocation,
  refreshStoredUserLocation,
  requestAndStoreUserLocation,
  type UserLocationSnapshot,
  syncStoredLocationPermission,
} from '../services/location';

const hasSnapshotCoordinates = (snapshot: UserLocationSnapshot) =>
  typeof snapshot.latitude === 'number' && typeof snapshot.longitude === 'number';

const syncSnapshotFromDevice = async () => {
  const permissionSnapshot = await syncStoredLocationPermission();
  if (permissionSnapshot.permissionStatus === 'granted') {
    return refreshStoredUserLocation();
  }
  return permissionSnapshot;
};

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocationSnapshot>(DEFAULT_USER_LOCATION_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const stored = await getStoredUserLocation();
      if (!isMounted) return;
      setLocation(stored);

      const next = await syncSnapshotFromDevice();
      if (!isMounted) return;
      setLocation(next);
      setIsLoading(false);
    };

    void hydrate();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void syncSnapshotFromDevice().then((next) => {
        if (!isMounted) return;
        setLocation(next);
      });
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const requestAccess = async () => {
    setIsRefreshing(true);
    try {
      const next = await requestAndStoreUserLocation();
      setLocation(next);
      return next;
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const refreshLocation = async () => {
    setIsRefreshing(true);
    try {
      const next = await syncSnapshotFromDevice();
      setLocation(next);
      return next;
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  return {
    location,
    isLoading,
    isRefreshing,
    hasCoordinates: hasSnapshotCoordinates(location),
    requestAccess,
    refreshLocation,
  };
};
