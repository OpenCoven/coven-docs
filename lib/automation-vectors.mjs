// Turn the pinned upstream conformance vectors
// (content/data/upstream/coven-automations-conformance/*.vectors.json) into the
// tables on the Automations scheduling page. Upstream CI executes these exact
// files against the daemon's scheduling code, so each row is a tested case.
//
// Every suite declares the case shape it renders. vectorProblems() rejects
// anything else (a new field, a new outcome, a changed policy) so the check
// fails and someone reviews the page instead of a table silently dropping or
// misreading a case.

// Suites the scheduling page renders, in page order.
export const VECTOR_SUITES = [
  'rrule-vocabulary',
  'calendar-schedule-resolution',
  'misfire-latest-planning',
  'startup-reconciliation-wake',
  'overlap-forbid-claiming',
  'occurrence-lease-recovery',
  'retry-backoff-timing',
  'retry-quarantine-recovery',
  'cancellation-timeout-arbitration',
];

const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const code = (value) => `\`${value}\``;
const yes = (value) => (value ? 'yes' : 'no');

/**
 * An instant as plain UTC text, such as `2026-03-09 06:00`, keeping seconds and
 * milliseconds only when they are not zero. Plain text lets table cells wrap.
 */
export function formatInstant(iso) {
  return iso.replace('T', ' ').replace(/:00\.000Z$/, '').replace(/\.000Z$/, '').replace(/Z$/, '');
}

/** The wall-clock time of an instant in a schedule's time zone, such as `2026-03-09 02:00 EDT`. */
export function wallTime(iso, timezone) {
  const zone = timezone === 'utc' ? 'UTC' : timezone;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    })
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, keys) => isObject(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const text = (value) => typeof value === 'string' && value.trim() !== '';
const instant = (value) => typeof value === 'string' && instantPattern.test(value);
const count = (value) => Number.isInteger(value) && value >= 0;
const bool = (value) => typeof value === 'boolean';
const nullable = (check) => (value) => value === null || check(value);

// Keys of a routine definition inside a vector. The page states that v1
// planning uses misfire `latest` and overlap `forbid`, so any other policy in
// a vector fails rather than rendering under that claim.
const definitionKeys = ['schemaVersion', 'id', 'name', 'status', 'rrule', 'timezone', 'misfire', 'overlap', 'timeoutMinutes', 'runtime', 'prompt', 'tags'];
function definitionProblem(definition) {
  if (!isObject(definition)) return 'is not an object';
  const extra = Object.keys(definition).filter((key) => !definitionKeys.includes(key) && key !== 'cwd');
  const missing = definitionKeys.filter((key) => !(key in definition));
  if (extra.length || missing.length) return `has keys ${Object.keys(definition).join(', ')}`;
  if (definition.misfire !== 'latest' || definition.overlap !== 'forbid') return `uses misfire ${definition.misfire} and overlap ${definition.overlap}`;
  if (!['ACTIVE', 'PAUSED'].includes(definition.status)) return `has status ${definition.status}`;
  return null;
}
const routine = (definition) => `${code(definition.status)} ${code(definition.rrule)}`;
const at = (iso) => formatInstant(iso);
// A scheduled slot in UTC, with its wall-clock time when the zone is not UTC.
function slot(iso, timezone) {
  if (timezone === 'utc') return `${at(iso)} UTC`;
  const wall = wallTime(iso, timezone);
  const sameDay = wall.slice(0, 10) === at(iso).slice(0, 10);
  return `${at(iso)} UTC, ${sameDay ? wall.slice(11) : wall} local`;
}

/**
 * Each suite: the schemaVersion it renders, the case keys it accepts, the
 * exact shapes of `expected` (with a validator per field), the table columns,
 * and the row for a case.
 */
const SUITES = {
  'rrule-vocabulary': {
    schemaVersion: 'coven.automations.rrule-vocabulary-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'rrule', 'expected'] },
    fields: { rrule: (value) => typeof value === 'string' },
    expected: [
      { outcome: (value) => value === 'accepted', frequency: (value) => ['daily', 'weekly'].includes(value), byHour: (value) => Array.isArray(value) && value.every((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23), byDay: (value) => Array.isArray(value) && value.every((day) => /^(MO|TU|WE|TH|FR|SA|SU)$/.test(day)) },
      { outcome: (value) => value === 'rejected' },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'rule', label: 'Rule as written' },
      { key: 'result', label: 'Result' },
    ],
    row: (c) => ({
      rule: code(c.rrule),
      result:
        c.expected.outcome === 'accepted'
          ? `accepted as ${code(c.expected.frequency)}, hours ${c.expected.byHour.map(code).join(', ')}${c.expected.byDay.length ? `, days ${c.expected.byDay.map(code).join(', ')}` : ''}`
          : '**rejected**',
    }),
  },

  'calendar-schedule-resolution': {
    schemaVersion: 'coven.automations.calendar-schedule-resolution-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'rrule', 'timezone', 'from', 'expected'] },
    fields: { rrule: text, timezone: text, from: instant },
    expected: [
      { outcome: (value) => value === 'scheduled', nextDueAt: instant },
      { outcome: (value) => value === 'rejected', reason: text },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'rule', label: 'Rule and time zone' },
      { key: 'after', label: 'After (UTC)' },
      { key: 'next', label: 'Next slot' },
    ],
    row: (c) => ({
      rule: `${code(c.rrule)} in ${code(c.timezone)}`,
      after: at(c.from),
      next: c.expected.outcome === 'scheduled' ? slot(c.expected.nextDueAt, c.timezone) : `**rejected**: ${code(c.expected.reason)}`,
    }),
  },

  'misfire-latest-planning': {
    schemaVersion: 'coven.automations.misfire-latest-planning-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'definition', 'createdAt', 'observedAt', 'expected'], optional: ['existingScheduledFor'] },
    fields: { definition: (value) => definitionProblem(value) === null, createdAt: instant, observedAt: instant, existingScheduledFor: instant },
    expected: [
      { firstOutcome: text, secondOutcome: text, scheduledSlots: (value) => Array.isArray(value) && value.every(instant) },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'routine', label: 'Routine' },
      { key: 'window', label: 'Timeline (UTC)' },
      { key: 'passes', label: 'Two passes' },
      { key: 'slots', label: 'Planned slots afterwards (UTC)' },
    ],
    row: (c) => ({
      routine: routine(c.definition),
      window: `created ${at(c.createdAt)}; ${c.existingScheduledFor ? `slot ${at(c.existingScheduledFor)} already planned; ` : ''}observed ${at(c.observedAt)}`,
      passes: `${code(c.expected.firstOutcome)} then ${code(c.expected.secondOutcome)}`,
      slots: c.expected.scheduledSlots.length ? c.expected.scheduledSlots.map((slot) => at(slot)).join(', ') : 'none',
    }),
  },

  'startup-reconciliation-wake': {
    schemaVersion: 'coven.automations.startup-reconciliation-wake-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'definition', 'createdAt', 'observedAt', 'expected'], optional: ['revisedDefinition', 'changedAt'] },
    fields: { definition: (value) => definitionProblem(value) === null, revisedDefinition: (value) => definitionProblem(value) === null, createdAt: instant, observedAt: instant, changedAt: instant },
    expected: [
      { outcome: (value) => value === 'startup_reconciled', productionStartPath: (value) => value === true, systemWaitObserved: bool, launchCount: count, launchedBeforeFirstWait: bool, lastPassTrigger: text, occurrenceState: text },
      { outcome: (value) => value === 'definition_change_woke_scheduler', productionStartPath: (value) => value === true, systemWaitObserved: bool, actionAccepted: bool, wakeObserved: bool, launchCount: count, finalRevision: count, lastPassTrigger: text, occurrenceState: text },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'routine', label: 'Routine at start' },
      { key: 'change', label: 'Change while waiting' },
      { key: 'pass', label: 'Pass that launched it' },
      { key: 'timing', label: 'Observed' },
    ],
    row: (c) => ({
      routine: routine(c.definition),
      change: c.revisedDefinition ? `revised to ${code(c.revisedDefinition.status)} at ${at(c.changedAt)} UTC` : 'none',
      pass: `${code(c.expected.lastPassTrigger)}, ${c.expected.launchCount} ${c.expected.launchCount === 1 ? 'launch' : 'launches'}`,
      timing:
        c.expected.outcome === 'startup_reconciled'
          ? `launched before the first wait: ${yes(c.expected.launchedBeforeFirstWait)}`
          : `action accepted: ${yes(c.expected.actionAccepted)}; scheduler woken: ${yes(c.expected.wakeObserved)}`,
    }),
  },

  'overlap-forbid-claiming': {
    schemaVersion: 'coven.automations.overlap-forbid-claiming-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'now', 'blocker', 'expected'] },
    fields: { now: instant, blocker: text },
    expected: [
      { claimed: bool, targetState: text, targetAttempt: count, leaseOwner: nullable(text), leaseExpiresAt: nullable(instant) },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'blocker', label: "The routine's other work" },
      { key: 'claimed', label: 'Due slot claimed' },
      { key: 'state', label: 'Due slot afterwards' },
      { key: 'lease', label: 'Lease' },
    ],
    row: (c) => ({
      blocker: c.blocker === 'none' ? 'none' : code(c.blocker),
      claimed: yes(c.expected.claimed),
      state: `${code(c.expected.targetState)}, attempt ${c.expected.targetAttempt}`,
      lease: c.expected.leaseOwner ? `${code(c.expected.leaseOwner)} until ${at(c.expected.leaseExpiresAt)} UTC` : 'none',
    }),
  },

  'occurrence-lease-recovery': {
    schemaVersion: 'coven.automations.occurrence-lease-recovery-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'now', 'initial', 'expected'] },
    fields: {
      now: instant,
      initial: (value) => sameKeys(value, ['state', 'leaseOwner', 'leaseExpiresAt', 'runningRun']) && text(value.state) && bool(value.runningRun) && instant(value.leaseExpiresAt),
    },
    expected: [
      { recoveredCount: count, state: text, leaseOwner: nullable(text), leaseExpiresAt: nullable(instant), failureReason: nullable(text) },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'occurrence', label: 'Occurrence' },
      { key: 'lease', label: 'Now, lease expiry (UTC)' },
      { key: 'evidence', label: 'Runtime evidence' },
      { key: 'result', label: 'After lease recovery' },
    ],
    row: (c) => ({
      occurrence: code(c.initial.state),
      lease: `${at(c.now)}, ${at(c.initial.leaseExpiresAt)}`,
      evidence: yes(c.initial.runningRun),
      result: c.expected.recoveredCount > 0 ? `${code(c.expected.state)}: ${c.expected.failureReason}` : `unchanged, ${code(c.expected.state)}`,
    }),
  },

  'retry-backoff-timing': {
    schemaVersion: 'coven.automations.retry-backoff-timing-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'policy', 'runId', 'nextAttemptNumber', 'observedAt', 'expected'] },
    fields: {
      policy: (value) =>
        isObject(value) &&
        Object.keys(value).every((key) => ['maxAttempts', 'backoffPolicy', 'backoffSeconds', 'retryableClasses'].includes(key)) &&
        Number.isInteger(value.maxAttempts) &&
        ['none', 'fixed', 'exponential'].includes(value.backoffPolicy) &&
        Array.isArray(value.retryableClasses),
      runId: text,
      nextAttemptNumber: count,
      observedAt: instant,
    },
    expected: [
      { delaySeconds: count, minimumDelaySeconds: count, maximumDelaySeconds: count, ceilingSeconds: count, notBefore: instant, deterministic: (value) => value === true },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'policy', label: 'Backoff, next attempt' },
      { key: 'delay', label: 'Delay (range)' },
      { key: 'notBefore', label: 'Failure observed, retry not before (UTC)' },
    ],
    row: (c) => ({
      policy: `${code(c.policy.backoffPolicy)}${c.policy.backoffSeconds ? `, ${c.policy.backoffSeconds} s base` : ''}; attempt ${c.nextAttemptNumber} of ${c.policy.maxAttempts}`,
      delay: `${c.expected.delaySeconds} s (${c.expected.minimumDelaySeconds}–${c.expected.maximumDelaySeconds} s)`,
      notBefore: `${at(c.observedAt)}, then ${at(c.expected.notBefore)}`,
    }),
  },

  'retry-quarantine-recovery': {
    schemaVersion: 'coven.automations.retry-quarantine-recovery-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'exhaustions', 'observeAt', 'expected'], optional: ['releaseAt'] },
    fields: {
      exhaustions: (value) => Array.isArray(value) && value.every((entry) => sameKeys(entry, ['at', 'failureClass', 'reason']) && instant(entry.at) && text(entry.failureClass) && text(entry.reason)),
      observeAt: instant,
      releaseAt: instant,
    },
    expected: [
      { rowExists: bool, consecutiveExhaustions: count, quarantined: bool, quarantinedAt: nullable(instant), failureClass: nullable(text), reason: nullable(text), releaseChanged: bool, plannedCount: count, claimedCount: count },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'exhaustions', label: 'Retry exhaustions (UTC)' },
      { key: 'release', label: 'Release (UTC)' },
      { key: 'quarantine', label: 'Quarantine afterwards' },
      { key: 'planning', label: 'Next due slot' },
    ],
    row: (c) => ({
      exhaustions: c.exhaustions.length ? c.exhaustions.map((entry) => `${code(entry.failureClass)} at ${at(entry.at)}`).join('; ') : 'none',
      release: c.releaseAt ? `at ${at(c.releaseAt)}${c.expected.releaseChanged ? '' : ', changed nothing'}` : 'not called',
      quarantine: c.expected.quarantined
        ? `quarantined since ${at(c.expected.quarantinedAt)} for ${code(c.expected.failureClass)}, ${c.expected.consecutiveExhaustions} in a row`
        : 'not quarantined',
      planning: c.expected.plannedCount > 0 ? (c.expected.claimedCount > 0 ? 'planned and claimed' : 'planned') : 'not planned',
    }),
  },

  'cancellation-timeout-arbitration': {
    schemaVersion: 'coven.automations.cancellation-timeout-arbitration-vectors.v1',
    caseKeys: { required: ['caseId', 'scenario', 'cancellationAt', 'timeoutAt', 'timeoutObservedAt', 'expected'] },
    fields: { cancellationAt: instant, timeoutAt: instant, timeoutObservedAt: instant },
    expected: [
      { cancellationOutcome: text, competingOutcome: text, replayOutcome: text, preCompetingCancellationState: text, preCompetingStopFenceOwner: text, competingCandidateObserved: bool, runtimeStopCount: count, runStatus: text, occurrenceState: text, attemptState: text, cancellationState: text },
    ],
    columns: [
      { key: 'case', label: 'Case' },
      { key: 'times', label: 'Times (UTC)' },
      { key: 'fence', label: 'Stop fence first taken by' },
      { key: 'outcomes', label: 'Outcomes' },
      { key: 'final', label: 'Final states' },
    ],
    row: (c) => ({
      times: `cancel requested ${at(c.cancellationAt)}; deadline ${at(c.timeoutAt)}; timeout seen ${at(c.timeoutObservedAt)}`,
      fence: code(c.expected.preCompetingStopFenceOwner),
      outcomes: `cancellation ${code(c.expected.cancellationOutcome)}; timeout ${code(c.expected.competingOutcome)}; session stopped ${c.expected.runtimeStopCount === 1 ? 'once' : `${c.expected.runtimeStopCount} times`}`,
      final: `run ${code(c.expected.runStatus)}; occurrence ${code(c.expected.occurrenceState)}; attempt ${code(c.expected.attemptState)}; cancellation ${code(c.expected.cancellationState)}`,
    }),
  },
};

export function vectorSuite(suite) {
  const spec = SUITES[suite];
  if (!spec) throw new Error(`unknown vector suite ${suite}`);
  return spec;
}

/** Everything that would make a suite's table drop, guess at, or misstate a case. */
export function vectorProblems(suite, doc) {
  const spec = vectorSuite(suite);
  const problems = [];
  if (!sameKeys(doc, ['schemaVersion', 'cases'])) return ['must be exactly { schemaVersion, cases }'];
  if (doc.schemaVersion !== spec.schemaVersion) problems.push(`is ${doc.schemaVersion}; the page renders ${spec.schemaVersion}`);
  if (!Array.isArray(doc.cases) || doc.cases.length === 0) return [...problems, 'has no cases'];

  const ids = new Set();
  for (const c of doc.cases) {
    const label = isObject(c) && text(c.caseId) ? c.caseId : 'a case';
    if (!isObject(c) || !text(c.caseId) || !text(c.scenario)) {
      problems.push(`${label} needs a caseId and scenario`);
      continue;
    }
    if (ids.has(c.caseId)) problems.push(`${label} appears twice`);
    ids.add(c.caseId);

    const allowed = [...spec.caseKeys.required, ...(spec.caseKeys.optional ?? [])];
    const missing = spec.caseKeys.required.filter((key) => !(key in c));
    const extra = Object.keys(c).filter((key) => !allowed.includes(key));
    if (missing.length) problems.push(`${label} is missing ${missing.join(', ')}`);
    if (extra.length) problems.push(`${label} has fields the page does not render: ${extra.join(', ')}`);
    for (const [key, valid] of Object.entries(spec.fields)) {
      if (key in c && !valid(c[key])) problems.push(`${label} has an unexpected ${key}`);
    }

    const shape = spec.expected.find((fields) => sameKeys(c.expected, Object.keys(fields)) && Object.entries(fields).every(([key, valid]) => valid(c.expected[key])));
    if (!shape) problems.push(`${label} has an expectation the page does not render: ${JSON.stringify(c.expected)}`);
  }
  if (problems.length === 0) {
    // Suite-specific consistency the prose relies on.
    if (suite === 'startup-reconciliation-wake') {
      for (const c of doc.cases) {
        if (('revisedDefinition' in c) !== ('changedAt' in c)) problems.push(`${c.caseId} must carry revisedDefinition and changedAt together`);
      }
    }
    if (suite === 'retry-backoff-timing') {
      for (const c of doc.cases) {
        const e = c.expected;
        if (e.maximumDelaySeconds !== e.ceilingSeconds || e.delaySeconds < e.minimumDelaySeconds || e.delaySeconds > e.maximumDelaySeconds) {
          problems.push(`${c.caseId} has a delay outside its range`);
        }
      }
    }
  }
  return problems;
}

/** Table columns for a suite. */
export function vectorColumns(suite) {
  return vectorSuite(suite).columns;
}

/** One row per case, in upstream order. */
export function vectorRows(suite, doc) {
  const spec = vectorSuite(suite);
  return doc.cases.map((c) => ({ case: c.caseId, ...spec.row(c) }));
}
