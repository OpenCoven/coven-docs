'use client';

import { useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useModifierKey } from '@/lib/use-modifier-key';

/**
 * Full-height collapse control on the sidebar's edge. When the sidebar is
 * collapsed it moves to the edge of the section icon rail (SectionRail),
 * which also carries an expand button. Toggles with ⌘\ (Ctrl+\ elsewhere).
 */
export function SidebarRail() {
  const { collapsed, setCollapsed, mode } = useSidebar();
  const modifier = useModifierKey();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '\\' || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      setCollapsed((prev) => !prev);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCollapsed]);

  // Fumadocs leaves the collapsed sidebar in the tab order; take it out.
  useEffect(() => {
    document.getElementById('nd-sidebar')?.toggleAttribute('inert', collapsed);
  }, [collapsed]);

  if (mode !== 'full') return null;

  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <button
      type="button"
      className="coven-sidebar-rail"
      data-collapsed={collapsed}
      aria-label={label}
      aria-controls="nd-sidebar"
      aria-expanded={!collapsed}
      aria-keyshortcuts="Meta+Backslash Control+Backslash"
      onClick={() => setCollapsed((prev) => !prev)}
    >
      <span className="coven-sidebar-rail-handle" aria-hidden="true">
        <ChevronLeft />
      </span>
      <span className="coven-sidebar-rail-tip" aria-hidden="true">
        {label}
        <kbd>
          {modifier}
          {'\\'}
        </kbd>
      </span>
    </button>
  );
}
