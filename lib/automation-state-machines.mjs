// Read the pinned coven.automations.v1 state machines
// (content/data/upstream/coven-automations-v1/state-machines.json) into what
// the lifecycle page renders: a Mermaid state diagram and a transition table
// per machine, and the invariants.
//
// scripts/check-upstream-snapshots.mjs runs stateMachineProblems() so a shape
// this page cannot render faithfully fails the check instead of rendering
// partially.

// The machines the lifecycle page has a section for, in page order.
export const STATE_MACHINE_IDS = ['definition.v1', 'occurrence.v1', 'run.v1', 'attempt.v1'];

const statePattern = /^[a-z][a-z_]*$/;

function exactKeys(value, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key)) && keys.every((key) => required.includes(key) || optional.includes(key));
}

const text = (value) => typeof value === 'string' && value.trim() !== '';

/** Everything that would make the page drop, guess at, or misdraw upstream data. */
export function stateMachineProblems(doc) {
  const problems = [];
  const fail = (message) => problems.push(message);

  if (!exactKeys(doc, ['contractProfile', 'version', 'notes', 'machines', 'invariants'])) {
    return ['must have exactly contractProfile, version, notes, machines, and invariants'];
  }
  if (doc.contractProfile !== 'coven.automations.v1' || doc.version !== 1) {
    fail(`is ${doc.contractProfile} version ${doc.version}; the page documents coven.automations.v1 version 1`);
  }

  const ids = (Array.isArray(doc.machines) ? doc.machines : []).map((machine) => machine?.id);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...STATE_MACHINE_IDS].sort())) {
    fail(`machines are ${ids.join(', ')}; the page has sections for ${STATE_MACHINE_IDS.join(', ')}`);
  }

  for (const machine of Array.isArray(doc.machines) ? doc.machines : []) {
    const label = machine?.id ?? 'a machine';
    if (!exactKeys(machine, ['id', 'entity', 'initial', 'terminalStates', 'states', 'transitions'])) {
      fail(`${label} must have exactly id, entity, initial, terminalStates, states, and transitions`);
      continue;
    }
    const names = new Set();
    for (const state of machine.states) {
      if (!exactKeys(state, ['name', 'terminal']) || !statePattern.test(state.name) || typeof state.terminal !== 'boolean') {
        fail(`${label} has a state that is not { name, terminal }`);
      } else if (names.has(state.name)) {
        fail(`${label} declares ${state.name} twice`);
      } else {
        names.add(state.name);
      }
    }
    const terminal = machine.states.filter((state) => state.terminal).map((state) => state.name);
    if (JSON.stringify([...terminal].sort()) !== JSON.stringify([...machine.terminalStates].sort())) {
      fail(`${label} terminalStates ${machine.terminalStates.join(', ')} disagree with its terminal states ${terminal.join(', ')}`);
    }
    if (!names.has(machine.initial)) fail(`${label} starts in undeclared state ${machine.initial}`);

    const reached = new Set([machine.initial]);
    for (const transition of machine.transitions) {
      if (!exactKeys(transition, ['from', 'to', 'on', 'actor'], ['guard']) || ![transition.on, transition.actor].every(text)) {
        fail(`${label} has a transition that is not { from, to, on, actor, guard? }`);
        continue;
      }
      if (transition.guard !== undefined && !text(transition.guard)) fail(`${label} ${transition.from} -> ${transition.to} has an empty guard`);
      for (const end of [transition.from, transition.to]) {
        if (!names.has(end)) fail(`${label} ${transition.from} -> ${transition.to} names undeclared state ${end}`);
      }
      if (terminal.includes(transition.from)) fail(`${label} leaves terminal state ${transition.from}`);
      reached.add(transition.to);
    }
    for (const name of names) if (!reached.has(name)) fail(`${label} never reaches ${name}`);
  }

  if (!Array.isArray(doc.invariants) || doc.invariants.length === 0) {
    fail('must list invariants');
  } else {
    for (const invariant of doc.invariants) {
      if (!exactKeys(invariant, ['id', 'statement']) || !text(invariant.id) || !text(invariant.statement)) {
        fail('has an invariant that is not { id, statement }');
      }
    }
  }
  return problems;
}

export function findStateMachine(doc, id) {
  const machine = doc.machines.find((candidate) => candidate.id === id);
  if (!machine) throw new Error(`state-machines.json has no ${id} machine`);
  return machine;
}

/** A Mermaid stateDiagram-v2 for one machine, edges labelled with their cause. */
export function stateMachineChart(machine) {
  const lines = ['stateDiagram-v2', `  [*] --> ${machine.initial}`];
  for (const { from, to, on } of machine.transitions) lines.push(`  ${from} --> ${to}: ${on}`);
  if (machine.terminalStates.length > 0) {
    lines.push('  classDef terminal font-weight:bold,stroke-width:2px');
    lines.push(`  class ${machine.terminalStates.join(',')} terminal`);
  }
  return `${lines.join('\n')}\n`;
}

const code = (value) => `\`${value}\``;

/** One table row per transition, in upstream order. */
export function transitionRows(machine) {
  return machine.transitions.map(({ from, to, on, actor, guard }) => ({
    transition: `${code(from)} → ${code(to)}`,
    on: code(on),
    actor: code(actor),
    guard: guard ?? '',
  }));
}
