import process from 'node:process';

// PROBE for #66, never merge: fail the required release check on this branch only.
if (process.env.GITHUB_JOB === 'verify' && process.env.GITHUB_HEAD_REF ===
'probe/66-docs-fail') {
  console.error('Probe #66: failing the required release check on purpose.');
  process.exit(1);
}

// PROBE for #66, never merge: fail the required release check on this branch only.
if (process.env.GITHUB_JOB === 'verify' && process.env.GITHUB_HEAD_REF ===
'probe/66-docs-fail') {
  console.error('Probe #66: failing the required release check on purpose.');
  process.exit(1);
}

// Keep the canonical required check red unless BOTH independent evidence jobs
// succeeded. Missing, skipped, cancelled, and unknown outcomes are not passes.
const results = [
  ['upstream source freshness', process.env.DOCS_FRESHNESS_RESULT],
  ['documentation/browser certification', process.env.DOCS_BROWSER_RESULT],
];
const failures = results.filter(([, result]) => result !== 'success');
if (failures.length) {
  for (const [name, result] of failures) {
    console.error(`${name}: ${result ?? 'missing'}`);
  }
  process.exitCode = 1;
} else {
  console.log('Documentation release requires and has both successful evidence jobs.');
}
