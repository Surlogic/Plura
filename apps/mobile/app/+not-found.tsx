import * as Linking from 'expo-linking';
import { Redirect, Unmatched } from 'expo-router';

const FALLBACK_URLS = new Set([
  'plura:///',
  'plura:///(tabs)',
  'plura://index',
  'plura:///index',
  'plura:///(tabs)/index',
  'plura:///(tabs)//index',
  'plura:///(tabs)/',
  'plura:///(tabs)//',
]);

export default function NotFoundScreen() {
  const url = Linking.useURL();

  if (url && FALLBACK_URLS.has(url)) {
    return <Redirect href="/" />;
  }

  return <Unmatched />;
}
