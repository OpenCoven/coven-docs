'use client';

import { useEffect, useRef, useState, useId } from 'react';

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState('');
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function draw() {
      try {
        const { default: mermaid } = await import('mermaid');

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
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
          },
          flowchart: { curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true },
          er: { useMaxWidth: true },
        });

        const renderId = `mermaid-${id}-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, chart.trim());

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('height');
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
          setRendered(true);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    draw();
    return () => { cancelled = true; };
  }, [chart, id]);

  if (error) return (
    <pre style={{
      color: '#ff6b6b',
      fontSize: '0.8rem',
      padding: '1rem',
      background: 'rgba(255,0,0,0.05)',
      borderRadius: '6px',
      border: '1px solid rgba(255,0,0,0.2)',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
    }}>
      Mermaid error: {error}
    </pre>
  );

  return (
    <div style={{
      margin: '1.5rem 0',
      padding: '1.5rem',
      background: 'rgba(15,12,28,0.8)',
      border: '1px solid rgba(154,142,205,0.15)',
      borderRadius: '10px',
      overflowX: 'auto',
      minHeight: rendered ? undefined : '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {!rendered && (
        <span style={{ color: '#555', fontSize: '0.8rem' }}>Loading diagram…</span>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', display: rendered ? 'block' : 'none' }}
      />
    </div>
  );
}
