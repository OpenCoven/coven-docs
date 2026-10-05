'use client';

import { useEffect } from 'react';

/**
 * The home page's reveals are native <details name="home-reveal"> elements:
 * they open and close without JavaScript, and the browser keeps only one
 * open. This adds what native details lack for an overlay: Escape, a click
 * outside, and the panel's close button all close it, returning focus to its
 * summary when the keyboard was used.
 */
export function RevealDismiss() {
  useEffect(() => {
    const openReveals = () => [...document.querySelectorAll<HTMLDetailsElement>('details[data-reveal][open]')];

    function close(details: HTMLDetailsElement, refocus: boolean) {
      details.open = false;
      if (refocus) details.querySelector('summary')?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      for (const details of openReveals()) close(details, true);
    }

    function onPointerDown(event: PointerEvent) {
      for (const details of openReveals()) {
        if (!details.contains(event.target as Node)) close(details, false);
      }
    }

    function onClick(event: MouseEvent) {
      const button = (event.target as Element).closest('[data-reveal-close]');
      const details = button?.closest<HTMLDetailsElement>('details[data-reveal]');
      if (details) close(details, event.detail === 0);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
