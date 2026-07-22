'use client';

// Module-level page run-state shared by every <ApiRequest> block and the
// <ApiConsole> dock without a provider wrapper. Reset when the pathname
// changes (ApiConsole calls resetForPath on mount) and via "Reset demo".

import { useSyncExternalStore } from 'react';
import { probeDaemon, resetSim } from './transport';
import type { Mode } from './transport';
import type { VarMap } from './vars';

export interface RunRecord {
  id: number;
  blockId: string;
  method: string;
  /** Path with $VARS resolved — what was actually requested. */
  path: string;
  status: number;
  ms: number;
  mode: Mode;
  at: number;
}

export interface LiveProbe {
  probed: boolean;
  available: boolean;
  reason: 'hosted' | 'unreachable' | null;
}

export interface RunnerState {
  mode: Mode;
  live: LiveProbe;
  /** The reader confirmed the one-time "real calls" prompt. */
  confirmedLive: boolean;
  vars: VarMap;
  history: RunRecord[];
  pathname: string | null;
}

const INITIAL: RunnerState = {
  mode: 'sim',
  live: { probed: false, available: false, reason: null },
  confirmedLive: false,
  vars: {},
  history: [],
  pathname: null,
};

let state: RunnerState = INITIAL;
let nextRunId = 1;
let probeInFlight = false;
const listeners = new Set<() => void>();

function setState(patch: Partial<RunnerState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RunnerState {
  return state;
}

function getServerSnapshot(): RunnerState {
  return INITIAL;
}

export function useRunnerState(): RunnerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const runnerStore = {
  get: getSnapshot,

  /** Fresh demo state when landing on a (different) guide page. */
  resetForPath(pathname: string): void {
    if (state.pathname === pathname) return;
    resetSim();
    state = { ...INITIAL, pathname, live: state.live };
    for (const listener of listeners) listener();
  },

  /** "Reset demo": clears sim state, captured vars, history; keeps probe. */
  reset(): void {
    resetSim();
    setState({ mode: 'sim', confirmedLive: false, vars: {}, history: [] });
  },

  setMode(mode: Mode): void {
    if (mode === 'live' && !state.live.available) return;
    setState({ mode });
  },

  confirmLive(): void {
    setState({ confirmedLive: true, mode: 'live' });
  },

  capture(captured: VarMap): void {
    if (Object.keys(captured).length === 0) return;
    setState({ vars: { ...state.vars, ...captured } });
  },

  addRun(record: Omit<RunRecord, 'id' | 'at'>): void {
    const entry: RunRecord = { ...record, id: nextRunId++, at: Date.now() };
    setState({ history: [...state.history, entry].slice(-50) });
  },

  ensureProbe(): void {
    if (state.live.probed || probeInFlight) return;
    probeInFlight = true;
    void probeDaemon().then((result) => {
      probeInFlight = false;
      setState({
        live: { probed: true, available: result.available, reason: result.reason },
      });
    });
  },
};
