'use client';

// Client-side loader for the OpenCoven Feedback widget (Quackback SDK).
//
// The docs site mounts the widget with `launcher: false` and opens it from
// the shared floating launcher in components/ask-salem.tsx instead of the
// SDK's own bottom-right bubble. The SDK script is injected lazily on first
// use; commands issued before it loads are queued on the `window.Quackback`
// stub and replayed in order when the bundle executes. Queueing `init` first
// also suppresses the bundle's auto-init, which would otherwise mount the
// default floating launcher.

const SDK_SRC = 'https://feedback.opencoven.ai/api/widget/sdk.js';
const SCRIPT_ID = 'opencoven-feedback-sdk';

/** Public feedback portal — fallback destination if the SDK cannot load. */
export const FEEDBACK_PORTAL = 'https://feedback.opencoven.ai';

type QuackbackFn = ((...args: unknown[]) => unknown) & { q?: unknown[][] };

declare global {
  interface Window {
    Quackback?: QuackbackFn;
  }
}

let loadPromise: Promise<void> | null = null;

/** Returns the live SDK entry point, installing the command-queue stub if needed. */
function quackback(): QuackbackFn {
  if (!window.Quackback) {
    const stub: QuackbackFn = (...args: unknown[]) => {
      (stub.q = stub.q ?? []).push(args);
    };
    window.Quackback = stub;
  }
  return window.Quackback;
}

/**
 * Injects the SDK script once and initializes the widget without its own
 * launcher, panel anchored bottom-right next to the shared launcher. Resolves
 * when the script has loaded; rejects if it fails (offline, content
 * blockers), letting callers fall back to FEEDBACK_PORTAL.
 */
export function ensureFeedbackWidget(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Feedback widget is client-side only'));
  }
  if (loadPromise) return loadPromise;
  quackback()('init', { launcher: false, placement: 'right' });
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SDK_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      loadPromise = null;
      reject(new Error('Feedback widget SDK failed to load'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Opens the feedback panel, loading the SDK on first use. The `open` command
 * is dispatched immediately (queued until the SDK is ready), so the panel
 * appears as soon as the script loads. Rejects if the SDK cannot load.
 */
export function openFeedback(): Promise<void> {
  const ready = ensureFeedbackWidget();
  window.Quackback?.('open');
  return ready;
}

/** Closes the feedback panel if the SDK is present. No-op otherwise. */
export function closeFeedback(): void {
  if (typeof window === 'undefined') return;
  window.Quackback?.('close');
}

/**
 * Subscribes to an SDK event ('open', 'close', 'ready', …). Returns an
 * unsubscribe function. Safe to call before the SDK has loaded — the
 * subscription is queued and replayed.
 */
export function onFeedbackEvent(
  name: string,
  callback: (payload: unknown) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const result = quackback()('on', name, callback);
  return () => {
    // The live SDK returns an unsubscribe function; the pre-load stub does
    // not, so fall back to an 'off' command (queued in order after 'on').
    if (typeof result === 'function') result();
    else window.Quackback?.('off', name, callback);
  };
}
