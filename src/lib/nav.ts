import type { Router } from 'expo-router';

export function goBack(router: Router) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
