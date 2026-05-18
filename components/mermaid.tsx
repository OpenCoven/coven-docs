'use client';

import {
  useEffect,
  useState,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import mermaidPackage from 'mermaid/package.json';
import {
  Check,
  Clipboard,
  Code2,
  Expand,
  LoaderCircle,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { normalizeMermaidSvg } from '@/lib/mermaid-svg.js';

interface MermaidProps {
  chart: string;
  /** Optional caption shown beneath the diagram */
  caption?: string;
}

const THEME_VARS = {
  primaryColor: '#1F1A33',
  primaryTextColor: '#E8E8E8',
  primaryBorderColor: 'rgba(154,142,205,0.4)',
  lineColor: '#9A8ECD',
  secondaryColor: '#141414',
  tertiaryColor: '#0A0A0A',
  background: '#0A0A0A',
  mainBkg: '#1A1A2E',
  nodeBorder: 'rgba(154,142,205,0.4)',
  clusterBkg: '#1F1A33',
  clusterBorder: 'rgba(154,142,205,0.3)',
  titleColor: '#B4AAEB',
  edgeLabelBackground: '#1F1A33',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  labelBackground: '#1A1A2E',
  actorBkg: '#1F1A33',
  actorBorder: 'rgba(154,142,205,0.5)',
  actorTextColor: '#E8E8E8',
  actorLineColor: '#9A8ECD',
  signalColor: '#9A8ECD',
  signalTextColor: '#E8E8E8',
  loopTextColor: '#B4AAEB',
  noteBorderColor: 'rgba(154,142,205,0.3)',
  noteBkgColor: '#1F1A33',
  noteTextColor: '#E8E8E8',
};

const MERMAID_RENDERER_LABEL = 'Mermaid v' + mermaidPackage.version;

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="mermaid-btn"
    >
      {children}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function Mermaid({ chart, caption }: MermaidProps) {
  // Single SVG string — rendered once, displayed in inline AND fullscreen
  const [svgMarkup, setSvgMarkup] = useState('');
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState<'source' | 'svg' | null>(null);
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const id = useId().replace(/:/g, '');

  // SSR guard for portal
  useEffect(() => setMounted(true), []);

  // Render mermaid → SVG string once
  useEffect(() => {
    let cancelled = false;
    async function draw() {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: THEME_VARS,
          flowchart: { curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true },
          er: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
        });
        const renderId = `mermaid-${id}`;
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (!cancelled) {
          setSvgMarkup(normalizeMermaidSvg(svg));
          setRendered(true);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    draw();
    return () => { cancelled = true; };
  }, [chart, id]);

  // Escape key dismisses fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Lock scroll when fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    if (!fullscreen) setScale(1);
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const markCopied = useCallback((target: 'source' | 'svg') => {
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chart.trim());
      markCopied('source');
    } catch { /* ignore */ }
  }, [chart, markCopied]);

  const handleCopySvg = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(svgMarkup || chart);
      markCopied('svg');
    } catch { /* ignore */ }
  }, [svgMarkup, chart, markCopied]);

  if (error) return (
    <figure className="mermaid-figure mermaid-figure-error">
      <div className="mermaid-toolbar" role="toolbar" aria-label="Diagram controls">
        <span className="mermaid-meta">{MERMAID_RENDERER_LABEL}</span>
        <Btn onClick={handleCopySource} title={copied === 'source' ? 'Copied source!' : 'Copy Mermaid source'}>
          {copied === 'source' ? <Check size={15} aria-hidden /> : <Code2 size={15} aria-hidden />}
        </Btn>
      </div>
      <pre className="mermaid-error">
        {`Mermaid error:\n${error}`}
      </pre>
    </figure>
  );

  // ── Toolbar for inline ────────────────────────────────────────────────────
  const inlineToolbar = (
    <div className="mermaid-toolbar" role="toolbar" aria-label="Diagram controls">
      <span className="mermaid-meta">{MERMAID_RENDERER_LABEL}</span>
      <Btn onClick={handleCopySource} title={copied === 'source' ? 'Copied source!' : 'Copy Mermaid source'}>
        {copied === 'source' ? <Check size={15} aria-hidden /> : <Code2 size={15} aria-hidden />}
      </Btn>
      <Btn onClick={handleCopySvg} title={copied === 'svg' ? 'Copied SVG!' : 'Copy SVG'}>
        {copied === 'svg' ? <Check size={15} aria-hidden /> : <Clipboard size={15} aria-hidden />}
      </Btn>
      <Btn onClick={() => setFullscreen(true)} title="Open fullscreen">
        <Expand size={15} aria-hidden />
      </Btn>
    </div>
  );

  // ── Toolbar for fullscreen ────────────────────────────────────────────────
  const fullscreenToolbar = (
    <div className="mermaid-toolbar" role="toolbar" aria-label="Diagram controls">
      <Btn onClick={() => setScale(s => Math.max(0.25, s - 0.25))} title="Zoom out"><ZoomOut size={15} aria-hidden /></Btn>
      <span className="mermaid-zoom-label">{Math.round(scale * 100)}%</span>
      <Btn onClick={() => setScale(s => Math.min(4, s + 0.25))} title="Zoom in"><ZoomIn size={15} aria-hidden /></Btn>
      <Btn onClick={() => setScale(1)} title="Reset zoom"><RotateCcw size={15} aria-hidden /></Btn>
      <div className="mermaid-divider" />
      <Btn onClick={handleCopySource} title={copied === 'source' ? 'Copied source!' : 'Copy Mermaid source'}>
        {copied === 'source' ? <Check size={15} aria-hidden /> : <Code2 size={15} aria-hidden />}
      </Btn>
      <Btn onClick={handleCopySvg} title={copied === 'svg' ? 'Copied SVG!' : 'Copy SVG'}>
        {copied === 'svg' ? <Check size={15} aria-hidden /> : <Clipboard size={15} aria-hidden />}
      </Btn>
      <Btn onClick={() => setFullscreen(false)} title="Exit fullscreen (Esc)">
        <Minimize2 size={15} aria-hidden />
      </Btn>
    </div>
  );

  return (
    <>
      {/* ── CSS injected once ── */}
      <style>{`
        @keyframes mermaid-spin { to { transform: rotate(360deg); } }

        .mermaid-figure {
          margin: 1.75rem 0;
          background: rgba(10,8,20,0.75);
          border: 1px solid rgba(154,142,205,0.15);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mermaid-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          background: rgba(8,6,18,0.7);
          border-bottom: 1px solid rgba(154,142,205,0.1);
          justify-content: flex-end;
        }

        .mermaid-meta {
          color: rgba(180,170,235,0.45);
          font-size: 11px;
          letter-spacing: 0;
          margin-right: auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mermaid-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: rgba(154,142,205,0.07);
          color: rgba(180,170,235,0.65);
          transition: background 0.12s, color 0.12s;
          padding: 0;
          flex-shrink: 0;
        }
        .mermaid-btn:hover {
          background: rgba(154,142,205,0.18);
          color: #B4AAEB;
        }

        .mermaid-btn:focus-visible {
          outline: 2px solid rgba(180,170,235,0.55);
          outline-offset: 2px;
        }

        .mermaid-divider {
          width: 1px;
          height: 18px;
          background: rgba(154,142,205,0.18);
          margin: 0 2px;
          flex-shrink: 0;
        }

        .mermaid-zoom-label {
          color: rgba(180,170,235,0.45);
          font-size: 11px;
          min-width: 34px;
          text-align: center;
          user-select: none;
        }

        .mermaid-body {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 1.25rem 1.5rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mermaid-svg-wrap {
          width: 100%;
          max-width: 100%;
        }

        .mermaid-caption {
          text-align: center;
          font-size: 0.78rem;
          color: rgba(180,170,235,0.45);
          padding: 0 1.5rem 0.75rem;
          font-style: italic;
        }

        .mermaid-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(154,142,205,0.45);
          font-size: 0.8rem;
          min-height: 80px;
        }

        .mermaid-spinner {
          animation: mermaid-spin 0.9s linear infinite;
        }

        .mermaid-error {
          color: #ff6b6b;
          font-size: 0.8rem;
          padding: 1rem;
          background: rgba(255,0,0,0.05);
          border-radius: 8px;
          border: 1px solid rgba(255,0,0,0.2);
          overflow: auto;
          white-space: pre-wrap;
          margin: 1.5rem 0;
        }

        .mermaid-figure-error .mermaid-error {
          margin: 0;
          border: none;
          border-radius: 0;
        }

        /* ── Fullscreen overlay ── */
        .mermaid-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          background: rgba(4,3,10,0.97);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mermaid-overlay-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px 0 16px;
          min-height: 48px;
          background: rgba(8,6,18,0.8);
          border-bottom: 1px solid rgba(154,142,205,0.1);
          flex-shrink: 0;
          gap: 8px;
        }

        .mermaid-overlay-hint {
          color: rgba(180,170,235,0.4);
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        kbd.mermaid-kbd {
          background: rgba(154,142,205,0.12);
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }

        .mermaid-overlay-scroll {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: safe center;
          justify-content: safe center;
          padding: 2rem;
        }

        .mermaid-overlay-inner {
          width: 100%;
          max-width: 1280px;
          transition: transform 0.15s ease;
          transform-origin: center center;
        }

        .mermaid-overlay-caption {
          text-align: center;
          font-size: 0.82rem;
          color: rgba(180,170,235,0.35);
          padding: 0.75rem 1.5rem 1rem;
          font-style: italic;
          border-top: 1px solid rgba(154,142,205,0.08);
          flex-shrink: 0;
        }

        /* Mobile: fullscreen uses full viewport */
        @media (max-width: 640px) {
          .mermaid-overlay-scroll { padding: 1rem; }
          .mermaid-overlay-hint { display: none; }
        }
      `}</style>

      {/* ── Inline figure ── */}
      <figure className="mermaid-figure">
        {inlineToolbar}
        <div className="mermaid-body">
          {!rendered ? (
            <div className="mermaid-loading">
              <LoaderCircle size={15} aria-hidden className="mermaid-spinner" />
              Rendering diagram…
            </div>
          ) : (
            <div
              className="mermaid-svg-wrap"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          )}
        </div>
        {caption && <figcaption className="mermaid-caption">{caption}</figcaption>}
      </figure>

      {/* ── Fullscreen portal ── */}
      {mounted && fullscreen && createPortal(
        <div
          className="mermaid-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={caption ? `Fullscreen: ${caption}` : 'Fullscreen diagram'}
        >
          <div className="mermaid-overlay-header">
            <span className="mermaid-overlay-hint">
              {caption && <>{caption} · </>}
              press <kbd className="mermaid-kbd">Esc</kbd> to close
            </span>
            {fullscreenToolbar}
          </div>
          <div className="mermaid-overlay-scroll">
            <div
              className="mermaid-overlay-inner"
              style={{ transform: `scale(${scale})` }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
          {caption && <div className="mermaid-overlay-caption">{caption}</div>}
        </div>,
        document.body,
      )}
    </>
  );
}
