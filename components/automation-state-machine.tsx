import doc from '@/content/data/upstream/coven-automations-v1/state-machines.json';
import snapshots from '@/content/data/upstream/snapshots.json';
import { DocsDataTable } from '@/components/docs-data-table';
import { Mermaid } from '@/components/mermaid';
import { findStateMachine, stateMachineChart, transitionRows } from '@/lib/automation-state-machines.mjs';

type StateMachine = (typeof doc.machines)[number];

const columns = [
  { key: 'transition', label: 'Transition' },
  { key: 'on', label: 'On' },
  { key: 'actor', label: 'Actor', filter: true },
  { key: 'guard', label: 'Guard' },
];

/**
 * One coven.automations.v1 state machine, rendered from the pinned upstream
 * copy of spec/coven-automations/v1/state-machines.json (see
 * content/data/upstream/snapshots.json), so the diagram and table cannot drift
 * from the contract.
 *
 *   <AutomationStateMachine id="occurrence.v1" />
 */
export function AutomationStateMachine({ id }: { id: string }) {
  const machine: StateMachine = findStateMachine(doc, id);

  return (
    <>
      <Mermaid chart={stateMachineChart(machine)} caption={`${machine.id}: starts in ${machine.initial}; terminal states are bold.`} />
      <p>
        States:{' '}
        {machine.states.map(({ name, terminal }, index) => (
          <span key={name}>
            {index > 0 && ', '}
            <code>{name}</code>
            {terminal && ' (terminal)'}
          </span>
        ))}
        .
      </p>
      <DocsDataTable
        caption={`${machine.id} transitions`}
        columns={columns}
        rows={transitionRows(machine)}
        searchPlaceholder="Filter transitions"
        preserveOrder
      />
    </>
  );
}

/** The contract's normative invariants, in upstream order. */
export function AutomationInvariants() {
  return (
    <ol>
      {doc.invariants.map(({ id, statement }) => (
        <li key={id}>
          <code>{id}</code>: {statement}
        </li>
      ))}
    </ol>
  );
}

/** An immutable link to the upstream file the page renders, at the pin it was copied from. */
export function AutomationStateMachinesSource() {
  const file = snapshots.files.find(({ path }) => path.endsWith('/state-machines.json'));
  if (!file) throw new Error('content/data/upstream/snapshots.json has no state-machines.json');
  return (
    <a href={`https://github.com/${snapshots.repo}/blob/${snapshots.verifiedCommit}/${file.path}`}>
      <code>{file.path}</code>
    </a>
  );
}
