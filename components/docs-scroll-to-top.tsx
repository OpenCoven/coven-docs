'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function DocsScrollToTop() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const historyPathname = useRef<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      historyPathname.current = window.location.pathname;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const restoringHistory = historyPathname.current === pathname;
    historyPathname.current = null;
    if (restoringHistory) return;

    // Let Next.js position cross-page heading links at their target.
    if (window.location.hash) return;

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
