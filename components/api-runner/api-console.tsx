'use client';

// Sticky page-level dock: sim/live mode toggle (live gated behind a one-time
// confirm), captured-variable chips, run history (click scrolls to the
// originating block), and Reset demo. Also owns the page lifecycle: resets
// store state on pathname change and fires the single daemon probe.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { runnerStore, useRunnerState } from './store';
import styles from './api-runner.module.css';

export function ApiConsole() {
  const pathname = usePathname();
  const state = useRunnerState();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    runnerStore.resetForPath(pathname);
    runnerStore.ensureProbe();
  }, [pathname]);

  const liveDisabledReason = !state.live.probed
    ? 'Checking for a local daemon…'
    : state.live.reason === 'hosted'
      ? 'Live is disabled on the hosted docs — run the docs locally next to a daemon.'
      : 'No daemon detected — run coven daemon start, then re-open this page.';

  const onLiveClick = () => {
    if (!state.live.available) return;
    if (state.confirmedLive) {
      runnerStore.setMode('live');
    } else {
      setConfirming(true);
    }
  };

  const history = [...state.history].reverse();

  return (
    <div className={styles.dock} role="region" aria-label="API console">
      <div className={styles.dockBar}>
        <span className={styles.dockTitle}>API console</span>
        <span className={styles.toggle}>
          <button
            type="button"
            className={state.mode === 'sim' ? styles.toggleActive : undefined}
            aria-pressed={state.mode === 'sim'}
            onClick={() => runnerStore.setMode('sim')}
          >
            Simulated
          </button>
          <button
            type="button"
            className={state.mode === 'live' ? styles.toggleActiveLive : undefined}
            aria-pressed={state.mode === 'live'}
            disabled={!state.live.available}
            title={state.live.available ? undefined : liveDisabledReason}
            onClick={onLiveClick}
          >
            Live
          </button>
        </span>
        {!state.live.available && (
          <span className={styles.dockReason}>{liveDisabledReason}</span>
        )}
        <span className={styles.spacer} />
        {Object.entries(state.vars).map(([name, value]) => (
          <span key={name} className={styles.varChip}>
            {name}={value}
          </span>
        ))}
        <button type="button" className={styles.btn} onClick={() => runnerStore.reset()}>
          Reset demo
        </button>
        <button
          type="button"
          className={styles.btn}
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? `History ▾ (${state.history.length})` : `History ▴ (${state.history.length})`}
        </button>
      </div>
      {confirming && (
        <div className={styles.confirm}>
          <span>
            Live mode sends real requests to your local daemon — launching a session spawns a
            real agent session on this machine.
          </span>
          <button
            type="button"
            className={styles.runBtn}
            onClick={() => {
              runnerStore.confirmLive();
              setConfirming(false);
            }}
          >
            Go live
          </button>
          <button type="button" className={styles.btn} onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      )}
      {expanded &&
        history.map((run) => (
          <button
            key={run.id}
            type="button"
            className={styles.historyRow}
            onClick={() =>
              document
                .getElementById(run.blockId)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          >
            <span className={run.status < 400 ? styles.pillOk : styles.pillErr}>
              {run.status}
            </span>
            <span>
              {run.method} {run.path}
            </span>
            <span className={styles.historyTime}>
              {new Date(run.at).toLocaleTimeString()} · {run.mode}
            </span>
          </button>
        ))}
    </div>
  );
}
