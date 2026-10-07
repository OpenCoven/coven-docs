import calendar from '@/content/data/upstream/coven-automations-conformance/calendar-schedule-resolution.vectors.json';
import cancellation from '@/content/data/upstream/coven-automations-conformance/cancellation-timeout-arbitration.vectors.json';
import lease from '@/content/data/upstream/coven-automations-conformance/occurrence-lease-recovery.vectors.json';
import misfire from '@/content/data/upstream/coven-automations-conformance/misfire-latest-planning.vectors.json';
import overlap from '@/content/data/upstream/coven-automations-conformance/overlap-forbid-claiming.vectors.json';
import backoff from '@/content/data/upstream/coven-automations-conformance/retry-backoff-timing.vectors.json';
import quarantine from '@/content/data/upstream/coven-automations-conformance/retry-quarantine-recovery.vectors.json';
import rrule from '@/content/data/upstream/coven-automations-conformance/rrule-vocabulary.vectors.json';
import startup from '@/content/data/upstream/coven-automations-conformance/startup-reconciliation-wake.vectors.json';
import snapshots from '@/content/data/upstream/snapshots.json';
import { DocsDataTable } from '@/components/docs-data-table';
import { vectorColumns, vectorRows } from '@/lib/automation-vectors.mjs';

const docs = {
  'rrule-vocabulary': rrule,
  'calendar-schedule-resolution': calendar,
  'misfire-latest-planning': misfire,
  'startup-reconciliation-wake': startup,
  'overlap-forbid-claiming': overlap,
  'occurrence-lease-recovery': lease,
  'retry-backoff-timing': backoff,
  'retry-quarantine-recovery': quarantine,
  'cancellation-timeout-arbitration': cancellation,
} as const;

type Suite = keyof typeof docs;

/**
 * One upstream conformance suite as a table, rendered from the pinned copy of
 * conformance/automations/runner/<suite>.vectors.json (see
 * content/data/upstream/snapshots.json). Upstream CI executes these exact
 * files against the daemon's scheduling code.
 *
 *   <AutomationVectors suite="calendar-schedule-resolution" />
 */
export function AutomationVectors({ suite }: { suite: Suite }) {
  const doc = docs[suite];
  if (!doc) throw new Error(`unknown vector suite ${suite}`);
  const file = snapshots.files.find(({ path }) => path.endsWith(`/${suite}.vectors.json`));
  if (!file) throw new Error(`content/data/upstream/snapshots.json has no ${suite} vectors`);

  return (
    <>
      <p>
        {doc.cases.length} cases from{' '}
        <a href={`https://github.com/${snapshots.repo}/blob/${snapshots.verifiedCommit}/${file.path}`}>
          <code>{file.path.split('/').pop()}</code>
        </a>
        :
      </p>
      <DocsDataTable
        caption={`${suite} conformance cases`}
        columns={vectorColumns(suite)}
        rows={vectorRows(suite, doc)}
        searchPlaceholder="Filter cases"
        preserveOrder
      />
    </>
  );
}
