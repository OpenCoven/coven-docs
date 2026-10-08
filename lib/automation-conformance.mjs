// Read the pinned upstream conformance and compatibility artifacts into the
// Automations conformance page: the seven result profiles, the audit suites
// behind each, the release state of both contract profiles, and the exact
// revisions of every input the daemon depends on.
//
// Each file has a strict shape here. Anything else fails
// scripts/check-upstream-snapshots.mjs, so a changed manifest or a moved pin
// is reviewed instead of rendered under an outdated claim.

const shaPattern = /^[0-9a-f]{40}$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, keys) => isObject(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const text = (value) => typeof value === 'string' && value.trim() !== '';
const texts = (value) => Array.isArray(value) && value.length > 0 && value.every(text);
const code = (value) => `\`${value}\``;

// Upstream path → local copy, for scripts/upstream-snapshots.mjs.
export const CONFORMANCE_FILES = {
  inventory: { path: 'conformance/automations/runner/inventory.json', local: 'content/data/upstream/coven-automations-conformance/inventory.json' },
  baseManifest: { path: 'spec/coven-automations/v1/conformance-manifest.json', local: 'content/data/upstream/coven-automations-v1/conformance-manifest.json' },
  baseProtocol: { path: 'spec/coven-automations/v1/protocol-version.json', local: 'content/data/upstream/coven-automations-v1/protocol-version.json' },
  resultSchema: { path: 'spec/coven-automations/v1/conformance-result.schema.json', local: 'content/data/upstream/coven-automations-v1/conformance-result.schema.json' },
  authorityManifest: { path: 'spec/coven-automations/authority/v1/conformance-manifest.json', local: 'content/data/upstream/coven-automations-authority-v1/conformance-manifest.json' },
  authorityProtocol: { path: 'spec/coven-automations/authority/v1/protocol-version.json', local: 'content/data/upstream/coven-automations-authority-v1/protocol-version.json' },
  upstreamArtifacts: { path: 'spec/coven-automations/authority/v1/upstream-artifacts.json', local: 'content/data/upstream/coven-automations-authority-v1/upstream-artifacts.json' },
  cargoToml: { path: 'crates/coven-cli/Cargo.toml', local: 'content/data/upstream/coven-cli/Cargo.toml' },
};

// The page describes these profiles one by one; a new or renamed profile in
// the result schema fails the check until the page covers it.
export const PROFILES = ['structural', 'scheduler_reliability', 'runtime_authority', 'continuity', 'privacy', 'interoperability', 'full'];

// Dependencies the daemon compiles in, read from crates/coven-cli/Cargo.toml.
const COMPILED = {
  'familiar-contract': 'OpenCoven/familiar-contract',
  'coven-threads-core': 'OpenCoven/coven-threads',
  'coven-runtime-spec': 'OpenCoven/coven-runtimes',
};

/** The git dependency lines of Cargo.toml the page renders, or the reason it cannot. */
export function compiledPins(cargoToml) {
  const pins = {};
  const problems = [];
  for (const [crate, repo] of Object.entries(COMPILED)) {
    const lines = cargoToml.split('\n').filter((line) => line.startsWith(`${crate} =`));
    const match = lines.length === 1 && new RegExp(`^${crate} = \\{ git = "https://github\\.com/${repo}", (rev|tag) = "([^"]+)", version = "([^"]+)" \\}$`).exec(lines[0]);
    if (!match) {
      problems.push(`${crate} is not a single \`git\` + \`rev\`/\`tag\` + \`version\` line`);
      continue;
    }
    const [, kind, ref, version] = match;
    if (kind === 'rev' && !shaPattern.test(ref)) problems.push(`${crate} rev ${ref} is not a full commit`);
    pins[crate] = { repo, kind, ref, version };
  }
  return { pins, problems };
}

function manifestProblems(doc, { contractProfile, keys }) {
  const problems = [];
  if (!sameKeys(doc, keys)) return [`must have exactly ${keys.join(', ')}`];
  if (doc.contractProfile !== contractProfile) problems.push(`is ${doc.contractProfile}, not ${contractProfile}`);
  if (!['proposed', 'stable'].includes(doc.releaseState)) problems.push(`has releaseState ${doc.releaseState}`);
  if (typeof doc.productionReady !== 'boolean') problems.push('has no boolean productionReady');
  if (!texts(doc.requiredSuites)) problems.push('has no requiredSuites');
  return problems;
}

const normativeInput = (value) => sameKeys(value, ['repository', 'commit', 'profile']) && text(value.repository) && shaPattern.test(value.commit) && text(value.profile);

/** Shape problems for one ledger file, by its key in CONFORMANCE_FILES. */
export function conformanceFileProblems(key, content) {
  if (key === 'cargoToml') return compiledPins(content).problems;
  const doc = JSON.parse(content);
  switch (key) {
    case 'inventory': {
      if (!sameKeys(doc, ['schemaVersion', 'decisionScope', 'suites'])) return ['must have exactly schemaVersion, decisionScope, suites'];
      const problems = [];
      if (doc.schemaVersion !== 'coven.automations.audit-inventory.v1') problems.push(`is ${doc.schemaVersion}`);
      if (!sameKeys(doc.decisionScope, ['kind']) || doc.decisionScope.kind !== 'audit_only') problems.push('must keep decisionScope.kind audit_only, which the page states');
      if (!Array.isArray(doc.suites) || doc.suites.length === 0) return [...problems, 'has no suites'];
      const ids = new Set();
      for (const suite of doc.suites) {
        if (!sameKeys(suite, ['profile', 'suiteId', 'vectorFile']) || !text(suite.suiteId) || suite.vectorFile !== `${suite.suiteId}.vectors.json`) {
          problems.push(`has a suite that is not { profile, suiteId, vectorFile: <suiteId>.vectors.json }`);
        } else if (ids.has(suite.suiteId)) {
          problems.push(`lists ${suite.suiteId} twice`);
        } else if (!PROFILES.includes(suite.profile)) {
          problems.push(`puts ${suite.suiteId} under unknown profile ${suite.profile}`);
        }
        ids.add(suite?.suiteId);
      }
      return problems;
    }
    case 'baseManifest':
      return manifestProblems(doc, {
        contractProfile: 'coven.automations.v1',
        keys: ['protocol', 'contractProfile', 'objects', 'schemas', 'stateMachines', 'compatibilityMatrix', 'goldenVectors', 'conformanceResultVectors', 'requiredSuites', 'releaseState', 'productionReady', 'canaryRequirements'],
      });
    case 'authorityManifest': {
      const problems = manifestProblems(doc, {
        contractProfile: 'coven.automations.authority.v1',
        keys: ['protocol', 'contractProfile', 'baseProfile', 'objects', 'schemas', 'capabilities', 'compatibilityMatrix', 'goldenVectors', 'typescriptProjection', 'upstreamArtifacts', 'requiredSuites', 'normativeInputs', 'releaseState', 'productionReady', 'scope', 'runtimeDispatchIntegration'],
      });
      if (problems.length) return problems;
      if (typeof doc.runtimeDispatchIntegration !== 'boolean' || !text(doc.scope)) problems.push('has no scope or runtimeDispatchIntegration');
      return problems;
    }
    case 'baseProtocol': {
      const problems = [];
      if (doc.contractProfile !== 'coven.automations.v1' || !Number.isInteger(doc.version) || !text(doc.status)) problems.push('has no contractProfile, version, or status');
      if (!texts(doc.profiles) || !Array.isArray(doc.refusedProfiles)) problems.push('has no profiles or refusedProfiles');
      return problems;
    }
    case 'authorityProtocol': {
      const problems = [];
      if (doc.contractProfile !== 'coven.automations.authority.v1' || doc.baseProfile !== 'coven.automations.v1' || !text(doc.status)) problems.push('has no contractProfile, baseProfile, or status');
      if (!sameKeys(doc.normativeInputs, ['familiarContract', 'covenThreads']) || !normativeInput(doc.normativeInputs.familiarContract) || !normativeInput(doc.normativeInputs.covenThreads)) {
        problems.push('normativeInputs must be exactly familiarContract and covenThreads, each { repository, commit, profile }');
      }
      return problems;
    }
    case 'resultSchema': {
      const profiles = doc?.$defs?.profile?.enum;
      if (JSON.stringify(profiles) !== JSON.stringify(PROFILES)) return [`profiles are ${JSON.stringify(profiles)}; the page describes ${PROFILES.join(', ')}`];
      const scopes = (doc?.$defs?.decisionScope?.oneOf ?? []).map((option) => option?.properties?.kind?.const);
      if (JSON.stringify(scopes) !== JSON.stringify(['audit_only', 'release_eligibility'])) return [`decision scopes are ${JSON.stringify(scopes)}`];
      return [];
    }
    case 'upstreamArtifacts': {
      if (!sameKeys(doc, ['profile', 'artifacts']) || doc.profile !== 'coven.automations.authority.v1' || !Array.isArray(doc.artifacts) || doc.artifacts.length === 0) {
        return ['must be { profile: coven.automations.authority.v1, artifacts }'];
      }
      return doc.artifacts.every((a) => sameKeys(a, ['repository', 'commit', 'path', 'sha256', 'size']) && text(a.repository) && shaPattern.test(a.commit) && text(a.path) && /^[0-9a-f]{64}$/.test(a.sha256) && Number.isInteger(a.size))
        ? []
        : ['has an artifact that is not { repository, commit, path, sha256, size }'];
    }
    default:
      return [`no validator for ${key}`];
  }
}

/** Problems that span files: the authority manifest and protocol must name the same inputs. */
export function ledgerProblems(docs) {
  const problems = [];
  const fromProtocol = Object.values(docs.authorityProtocol.normativeInputs).map(({ repository, commit }) => `${repository}@${commit}`).sort();
  const fromManifest = docs.authorityManifest.normativeInputs.map(({ repository, commit }) => `${repository}@${commit}`).sort();
  if (JSON.stringify(fromProtocol) !== JSON.stringify(fromManifest)) problems.push('the authority manifest and protocol name different normative inputs');
  const artifactSources = new Set(docs.upstreamArtifacts.artifacts.map(({ repository, commit }) => `${repository}@${commit}`));
  for (const input of fromProtocol) if (!artifactSources.has(input)) problems.push(`upstream-artifacts.json pins nothing from ${input}`);
  return problems;
}

const shortSha = (sha) => sha.slice(0, 12);
const commitUrl = (repo, sha) => `https://github.com/${repo}/commit/${sha}`;

/** Profile rows: each result profile and the audit suites behind it. */
export function profileRows(inventory) {
  return PROFILES.map((profile) => {
    const suites = inventory.suites.filter((suite) => suite.profile === profile);
    return { profile, suites: suites.map(({ suiteId }) => suiteId) };
  });
}

/**
 * The component ledger, one row per input, each with exact revisions. Every
 * value comes from a pinned file; `agree` is computed, not asserted.
 */
export function ledgerRows({ reviewedCommit, repo, baseProtocol, baseManifest, authorityProtocol, authorityManifest, inventory, cargoToml }) {
  const { pins } = compiledPins(cargoToml);
  const contract = (name) => ({ repo, sha: reviewedCommit, label: `${shortSha(reviewedCommit)}`, url: commitUrl(repo, reviewedCommit), name });
  const input = (key, crate) => {
    const normative = authorityProtocol.normativeInputs[key];
    const compiled = pins[crate];
    return {
      normative: { repo: normative.repository, sha: normative.commit, url: commitUrl(normative.repository, normative.commit), label: shortSha(normative.commit) },
      compiled: { repo: compiled.repo, sha: compiled.ref, url: commitUrl(compiled.repo, compiled.ref), label: shortSha(compiled.ref), version: compiled.version },
      profile: normative.profile,
      agree: normative.commit === compiled.ref,
    };
  };
  return {
    protocol: { ...contract('protocol'), profile: baseProtocol.profiles.join(', '), version: baseProtocol.version, status: baseProtocol.status, releaseState: baseManifest.releaseState, productionReady: baseManifest.productionReady },
    authority: { ...contract('authority'), profile: authorityProtocol.contractProfile, status: authorityProtocol.status, releaseState: authorityManifest.releaseState, productionReady: authorityManifest.productionReady, scope: authorityManifest.scope, runtimeDispatchIntegration: authorityManifest.runtimeDispatchIntegration },
    familiar: input('familiarContract', 'familiar-contract'),
    threads: input('covenThreads', 'coven-threads-core'),
    runtimes: { ...pins['coven-runtime-spec'], lockUrl: `https://github.com/${repo}/blob/${reviewedCommit}/Cargo.lock` },
    runner: { ...contract('runner'), suites: inventory.suites.length, scope: inventory.decisionScope.kind },
  };
}

/** Rows for the Runtime Authority's pinned upstream inputs. */
export function artifactRows(upstreamArtifacts) {
  return upstreamArtifacts.artifacts.map((a) => ({
    source: `${code(a.repository)} at ${code(shortSha(a.commit))}`,
    path: a.path,
    size: `${a.size.toLocaleString('en-US')} bytes`,
    sha256: a.sha256,
  }));
}
