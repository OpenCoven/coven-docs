import authorityManifest from '@/content/data/upstream/coven-automations-authority-v1/conformance-manifest.json';
import authorityProtocol from '@/content/data/upstream/coven-automations-authority-v1/protocol-version.json';
import upstreamArtifacts from '@/content/data/upstream/coven-automations-authority-v1/upstream-artifacts.json';
import inventory from '@/content/data/upstream/coven-automations-conformance/inventory.json';
import baseManifest from '@/content/data/upstream/coven-automations-v1/conformance-manifest.json';
import baseProtocol from '@/content/data/upstream/coven-automations-v1/protocol-version.json';
import snapshots from '@/content/data/upstream/snapshots.json';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { DocsDataTable } from '@/components/docs-data-table';
import styles from '@/components/docs-data-table.module.css';
import { CONFORMANCE_FILES, artifactRows, ledgerRows, profileRows } from '@/lib/automation-conformance.mjs';

// Cargo.toml is not JSON, so read the pinned copy at build time.
const cargoToml = readFileSync(join(process.cwd(), CONFORMANCE_FILES.cargoToml.local), 'utf8');
const ledger = ledgerRows({
  reviewedCommit: snapshots.verifiedCommit,
  repo: snapshots.repo,
  baseProtocol,
  baseManifest,
  authorityProtocol,
  authorityManifest,
  inventory,
  cargoToml,
});

// Only the commit chip is a link, so it reads as a chip rather than an
// underlined run of mixed text.
function Commit({ repo, sha, label }: { repo: string; sha: string; label: string }) {
  return (
    <>
      <code>{repo.replace(/^OpenCoven\//, '')}</code> at{' '}
      <a href={`https://github.com/${repo}/commit/${sha}`} title={sha}>
        <code>{label}</code>
      </a>
    </>
  );
}

const yesNo = (value: boolean, yes: string, no: string) => (value ? yes : no);

/**
 * The component ledger: every input the automations contract and the daemon
 * depend on, with exact revisions, read from the pinned upstream files.
 * Whether a specification input and the compiled crate agree is computed.
 */
export function AutomationLedger() {
  const rows: { component: string; revision: ReactNode; profile: ReactNode; status: ReactNode }[] = [
    {
      component: 'Automations protocol',
      revision: <Commit repo={ledger.protocol.repo} sha={ledger.protocol.sha} label={ledger.protocol.label} />,
      profile: (
        <>
          <code>{ledger.protocol.profile}</code>, version {ledger.protocol.version}
        </>
      ),
      status: (
        <>
          <code>{ledger.protocol.releaseState}</code>; {yesNo(ledger.protocol.productionReady, 'production-ready', 'not production-ready')}
        </>
      ),
    },
    {
      component: 'Runtime Authority profile',
      revision: <Commit repo={ledger.authority.repo} sha={ledger.authority.sha} label={ledger.authority.label} />,
      profile: <code>{ledger.authority.profile}</code>,
      status: (
        <>
          <code>{ledger.authority.releaseState}</code>; {yesNo(ledger.authority.productionReady, 'production-ready', 'not production-ready')}; scope{' '}
          {ledger.authority.scope}; {yesNo(ledger.authority.runtimeDispatchIntegration, 'wired into dispatch', 'not wired into dispatch')}
        </>
      ),
    },
    ...[
      { component: 'Familiar Contract embodiment binding', row: ledger.familiar },
      { component: 'Threads authority profile', row: ledger.threads },
    ].map(({ component, row }) => ({
      component,
      revision: (
        <>
          Specified against <Commit {...row.normative} />; compiled into the daemon at <Commit {...row.compiled} /> (crate {row.compiled.version})
        </>
      ),
      profile: <code>{row.profile}</code>,
      status: yesNo(row.agree, 'Specification and compiled crate use the same revision', 'Specification and compiled crate use different revisions'),
    })),
    {
      component: 'Runtime descriptors',
      revision: (
        <>
          <code>{ledger.runtimes.repo.replace(/^OpenCoven\//, '')}</code> {ledger.runtimes.kind} <code>{ledger.runtimes.ref}</code>; the exact commit is resolved in{' '}
          <a href={ledger.runtimes.lockUrl}>
            <code>Cargo.lock</code>
          </a>{' '}
          at the reviewed commit
        </>
      ),
      profile: (
        <>
          <code>coven-runtime-spec</code> {ledger.runtimes.version}
        </>
      ),
      status: 'No conformance profile of its own',
    },
    {
      component: 'Conformance runner and vectors',
      revision: <Commit repo={ledger.runner.repo} sha={ledger.runner.sha} label={ledger.runner.label} />,
      profile: (
        <>
          {ledger.runner.suites} suites, scope <code>{ledger.runner.scope}</code>
        </>
      ),
      status: 'Run in upstream CI; results are not published',
    },
  ];

  // The shared data-table styling, so the ledger lays out as cards in a
  // narrow column like the other reference tables, while keeping its links.
  const columns = ['Component', 'Exact revision', 'Profile or version', 'Status'] as const;
  return (
    <div className={styles.shell}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption>Component ledger</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.component}>
                {[row.component, row.revision, row.profile, row.status].map((cell, index) => (
                  <td key={columns[index]} data-label={columns[index]}>
                    <span>{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The seven result profiles and the audit suites behind each. */
export function AutomationProfiles() {
  return (
    <DocsDataTable
      caption="Conformance profiles and their audit suites"
      columns={[
        { key: 'profile', label: 'Profile' },
        { key: 'count', label: 'Audit suites' },
        { key: 'suites', label: 'Suites' },
      ]}
      rows={profileRows(inventory).map(({ profile, suites }) => ({
        profile: `\`${profile}\``,
        count: String(suites.length),
        suites: suites.length ? suites.map((suite: string) => `\`${suite}\``).join(' ') : 'none',
      }))}
      preserveOrder
    />
  );
}

/** The Runtime Authority profile's pinned upstream inputs, file by file. */
export function AutomationAuthorityArtifacts() {
  return (
    <DocsDataTable
      caption="Runtime Authority upstream artifacts"
      columns={[
        { key: 'source', label: 'Source' },
        { key: 'path', label: 'File' },
        { key: 'size', label: 'Size' },
        { key: 'sha256', label: 'SHA-256' },
      ]}
      rows={artifactRows(upstreamArtifacts)}
      preserveOrder
    />
  );
}
