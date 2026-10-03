'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function DocsScrollToTop() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const historyNavigation = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      historyNavigation.current = window.location.pathname !== previousPathname.current;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    if (historyNavigation.current) {
      historyNavigation.current = false;
      return;
    }

    // Let Next.js position cross-page heading links at their target.
    if (window.location.hash) return;

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
