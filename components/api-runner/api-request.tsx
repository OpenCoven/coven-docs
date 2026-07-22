'use client';

// Wraps a guide's fenced curl block (rendered as `children`, untouched) and
// adds a run strip: METHOD + path template, optional Parameters disclosure,
// Run button, and an output panel. $VAR resolution precedence:
// user-edited param value → captured var → param default.

import { useId, useState, type ReactNode } from 'react';
import { runRequest } from './transport';
import { runnerStore, useRunnerState } from './store';
import { extractByPath, resolveTemplate, type VarMap } from './vars';
import styles from './api-runner.module.css';

export interface ApiParam {
  name: string;
  in: 'body' | 'query' | 'path';
  default?: string;
  required?: boolean;
}

export interface ApiRequestProps {
  method: 'GET' | 'POST';
  /** Daemon-side path template, may contain $VAR tokens. */
  path: string;
  params?: ApiParam[];
  /** var name → dot path into the JSON response, e.g. { SESSION_ID: 'id' } */
  capture?: Record<string, string>;
  children: ReactNode;
}

interface Output {
  kind: 'result' | 'blocked' | 'network-error';
  status?: number;
  ms?: number;
  mode?: 'sim' | 'live';
  json?: unknown;
  missing?: string[];
  message?: string;
  captured?: VarMap;
}

/** Render the path template with $VARS highlighted as chips. */
function TemplatePath({ template, vars }: { template: string; vars: VarMap }) {
  const parts = template.split(/(\$[A-Z][A-Z0-9_]*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('$') ? (
          <span key={i} className={styles.varChip}>
            {vars[part.slice(1)] !== undefined && vars[part.slice(1)] !== ''
              ? `${part}=${vars[part.slice(1)]}`
              : part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export function ApiRequest({ method, path, params = [], capture, children }: ApiRequestProps) {
  const blockId = useId();
  const state = useRunnerState();
  const [edited, setEdited] = useState<VarMap>({});
  const [paramsOpen, setParamsOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);

  // Value precedence for a param: user-edited → captured var → default.
  const paramValue = (param: ApiParam): string =>
    edited[param.name] ?? state.vars[param.name] ?? param.default ?? '';

  async function run() {
    const templateVars: VarMap = { ...state.vars };
    for (const param of params) {
      if (param.in === 'body') continue;
      const value = paramValue(param);
      if (value !== '') templateVars[param.name] = value;
    }

    const pathResult = resolveTemplate(path, templateVars);
    const missing = new Set(pathResult.missing);

    let body: Record<string, string> | undefined;
    if (method === 'POST') {
      body = {};
      for (const param of params) {
        if (param.in !== 'body') continue;
        const raw = paramValue(param);
        const value = resolveTemplate(raw, templateVars);
        for (const name of value.missing) missing.add(name);
        if (value.resolved !== '') body[param.name] = value.resolved;
      }
    }

    if (missing.size > 0) {
      const names = [...missing];
      setOutput({
        kind: 'blocked',
        missing: names,
        message: `No ${names.join(', ')} captured yet — run the earlier step that produces it, or paste a value into Parameters.`,
      });
      setParamsOpen(true);
      return;
    }

    setRunning(true);
    try {
      const result = await runRequest(state.mode, method, pathResult.resolved, body);
      let captured: VarMap = {};
      if (capture && result.status < 400) {
        for (const [name, dotPath] of Object.entries(capture)) {
          const value = extractByPath(result.json, dotPath);
          if (value !== undefined) captured[name] = value;
        }
        runnerStore.capture(captured);
      }
      runnerStore.addRun({
        blockId,
        method,
        path: pathResult.resolved,
        status: result.status,
        ms: result.ms,
        mode: state.mode,
      });
      setOutput({
        kind: 'result',
        status: result.status,
        ms: result.ms,
        mode: state.mode,
        json: result.json,
        captured,
      });
    } catch (error) {
      setOutput({
        kind: 'network-error',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setRunning(false);
    }
  }

  const copyResponse = () => {
    if (output?.json !== undefined) {
      void navigator.clipboard.writeText(JSON.stringify(output.json, null, 2));
    }
  };

  return (
    <div id={blockId} className={styles.block}>
      {children}
      <div className={styles.strip}>
        <span className={styles.method}>{method}</span>
        <TemplatePath template={path} vars={state.vars} />
        <span className={styles.spacer} />
        {params.length > 0 && (
          <button
            type="button"
            className={styles.btn}
            aria-expanded={paramsOpen}
            onClick={() => setParamsOpen((open) => !open)}
          >
            Parameters {paramsOpen ? '▴' : '▾'}
          </button>
        )}
        <button
          type="button"
          className={styles.runBtn}
          onClick={() => void run()}
          disabled={running}
        >
          {running ? 'Running…' : '▶ Run'}
        </button>
      </div>
      {paramsOpen && (
        <div className={styles.params}>
          {params.map((param) => (
            <div key={param.name} className={styles.paramRow}>
              <label htmlFor={`${blockId}-${param.name}`}>{param.name}</label>
              <input
                id={`${blockId}-${param.name}`}
                value={paramValue(param)}
                onChange={(event) =>
                  setEdited((prev) => ({ ...prev, [param.name]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}
      {output && (
        <div className={styles.output} role="status" aria-live="polite">
          <div className={styles.outputMeta}>
            {output.kind === 'result' && (
              <>
                <span className={(output.status ?? 500) < 400 ? styles.pillOk : styles.pillErr}>
                  {output.status}
                </span>
                <span className={output.mode === 'sim' ? styles.pillSim : styles.pillLive}>
                  {output.mode === 'sim' ? 'simulated' : 'live'}
                </span>
                <span>{output.ms}ms</span>
                {output.captured &&
                  Object.entries(output.captured).map(([name, value]) => (
                    <span key={name} className={styles.varChip}>
                      captured {name} = {value}
                    </span>
                  ))}
              </>
            )}
            {output.kind !== 'result' && <span className={styles.hint}>{output.message}</span>}
            <span className={styles.spacer} />
            {output.kind === 'result' && (
              <button type="button" className={styles.btn} onClick={copyResponse}>
                Copy
              </button>
            )}
            <button type="button" className={styles.btn} onClick={() => setOutput(null)}>
              ✕
            </button>
          </div>
          {output.kind === 'result' && (
            <pre className={styles.json}>{JSON.stringify(output.json, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
