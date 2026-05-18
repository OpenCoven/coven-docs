'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#9A8ECD',
            primaryTextColor: '#F5F5F5',
            primaryBorderColor: 'rgba(154,142,205,0.3)',
            lineColor: '#9A8ECD',
            secondaryColor: '#1F1F1F',
            tertiaryColor: '#141414',
            background: '#0A0A0A',
            mainBkg: '#141414',
            nodeBorder: 'rgba(154,142,205,0.4)',
            clusterBkg: '#1F1F1F',
            titleColor: '#B4AAEB',
            edgeLabelBackground: '#1F1F1F',
            attributeBackgroundColorEven: '#0A0A0A',
            attributeBackgroundColorOdd: '#141414',
          },
          flowchart: { curve: 'basis' },
        });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        setSvg(rendered);
      } catch (e) {
        setError(String(e));
      }
    }
    render();
  }, [chart]);

  if (error) return (
    <pre style={{ color: '#ff6b6b', fontSize: '0.8rem', padding: '1rem', background: 'rgba(255,0,0,0.05)', borderRadius: '6px', border: '1px solid rgba(255,0,0,0.2)', overflow: 'auto' }}>
      {error}
    </pre>
  );

  if (!svg) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.85rem' }}>
      Loading diagram...
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        padding: '1.5rem',
        background: 'rgba(20,20,20,0.6)',
        border: '1px solid rgba(154,142,205,0.12)',
        borderRadius: '10px',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
