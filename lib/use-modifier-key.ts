import { useEffect, useState } from 'react';

/** Label for the shortcut modifier: ⌘ on Apple devices, Ctrl elsewhere. */
export function useModifierKey() {
  const [modifier, setModifier] = useState('⌘');

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.userAgent)) setModifier('Ctrl');
  }, []);

  return modifier;
}
