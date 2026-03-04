'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const queryIndex = router.asPath.indexOf('?');
    const queryString = queryIndex >= 0 ? router.asPath.slice(queryIndex) : '';
    router.replace(`/cliente/auth/login${queryString}`);
  }, [router]);

  return null;
}
