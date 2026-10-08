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

    // Closing the section picker restores focus to its trigger. Apply the
    // destination scroll after those navigation effects have finished.
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
