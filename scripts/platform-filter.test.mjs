import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { parsePlatformTokens, platformBootScript, platformCss, platformHighlightCss } from '../lib/platform-filter.mjs';

const ids = ['macos-arm64', 'macos-x64', 'linux-x64', 'linux-arm64', 'windows-x64'];
const config = {
  param: 'platform',
  storageKey: 'coven-docs:platform',
  platforms: ids,
  oses: ['macos', 'linux', 'windows'],
};

const UA = {
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  linuxArm: 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
  chromeOs: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
};

// Run the inline script exactly as the page ships it, in a context with
// nothing but the globals a browser provides.
function boot({ search = '', saved = null, ua = '', touchPoints = 0, storageThrows = false } = {}) {
  const attributes = new Map();
  const window = {
    document: {
      documentElement: {
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: (name) => attributes.delete(name),
      },
    },
    location: { search },
    URLSearchParams,
    localStorage: {
      getItem: (key) => {
        if (storageThrows) throw new Error('SecurityError');
        return key === config.storageKey ? saved : null;
      },
    },
    navigator: { userAgent: ua, maxTouchPoints: touchPoints },
  };
  vm.runInNewContext(platformBootScript(config), { window });
  return Object.fromEntries(attributes);
}

test('a ?platform= link outranks a saved choice and detection', () => {
  assert.deepEqual(boot({ search: '?platform=linux-x64', saved: 'windows-x64', ua: UA.mac }), {
    'data-platform': 'linux-x64',
    'data-platform-os': 'linux',
    'data-platform-source': 'link',
  });
});

test('a saved choice outranks detection', () => {
  assert.deepEqual(boot({ saved: 'windows-x64', ua: UA.mac }), {
    'data-platform': 'windows-x64',
    'data-platform-os': 'windows',
    'data-platform-source': 'saved',
  });
});

test('"all" and OS families are valid choices', () => {
  assert.deepEqual(boot({ saved: 'all', ua: UA.windows }), { 'data-platform-source': 'saved' });
  assert.deepEqual(boot({ search: '?platform=macos' }), { 'data-platform-os': 'macos', 'data-platform-source': 'link' });
});

test('unknown values fall through to the next source', () => {
  assert.deepEqual(boot({ search: '?platform=beos', saved: 'amiga', ua: UA.windows }), {
    'data-platform': 'windows-x64',
    'data-platform-os': 'windows',
    'data-platform-source': 'detected',
  });
});

test('blocked storage does not stop detection', () => {
  assert.equal(boot({ storageThrows: true, ua: UA.linux })['data-platform'], 'linux-x64');
});

test('detects desktop platforms, leaving a Mac chip undecided', () => {
  assert.deepEqual(boot({ ua: UA.mac }), { 'data-platform-os': 'macos', 'data-platform-source': 'detected' });
  assert.equal(boot({ ua: UA.windows })['data-platform'], 'windows-x64');
  assert.equal(boot({ ua: UA.linux })['data-platform'], 'linux-x64');
  assert.equal(boot({ ua: UA.linuxArm })['data-platform'], 'linux-arm64');
});

test('shows every platform to phones, tablets, and ChromeOS', () => {
  for (const [ua, touchPoints] of [[UA.android, 5], [UA.chromeOs, 0], [UA.iphone, 5], [UA.mac, 5]]) {
    assert.deepEqual(boot({ ua, touchPoints }), { 'data-platform-source': 'default' });
  }
});

// Which blocks the generated CSS hides for a given <html> state.
function hidden(htmlAttributes) {
  const css = platformCss(ids);
  assert.match(css, /^@media screen \{/, 'hiding is screen-only so print keeps every platform');
  const selectors = css.slice(css.indexOf('{') + 1, css.indexOf(' {\n  display')).split(',').map((s) => s.trim());
  const blocks = ['macos', 'macos-arm64', 'macos-x64', 'linux', 'linux-arm64', 'windows', 'macos linux', 'windows-x64'];
  const attrs = Object.entries(htmlAttributes).map(([name, value]) => `${name}="${value}"`).join(' ');
  const { document } = new JSDOM(
    `<html ${attrs}><body>${blocks.map((tokens) => `<div data-platforms="${tokens}"></div>`).join('')}</body></html>`,
  ).window;
  const matched = new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]));
  return blocks.filter((_, index) => matched.has(document.body.children[index]));
}

test('CSS hides nothing when no platform is chosen', () => {
  assert.deepEqual(hidden({}), []);
});

test('CSS for an OS keeps its family and every CPU variant', () => {
  assert.deepEqual(hidden({ 'data-platform-os': 'macos' }), ['linux', 'linux-arm64', 'windows', 'windows-x64']);
});

test('CSS for an exact platform drops the other CPU variant', () => {
  assert.deepEqual(hidden({ 'data-platform-os': 'macos', 'data-platform': 'macos-arm64' }), [
    'macos-x64',
    'linux',
    'linux-arm64',
    'windows',
    'windows-x64',
  ]);
  assert.deepEqual(hidden({ 'data-platform-os': 'linux', 'data-platform': 'linux-x64' }), [
    'macos',
    'macos-arm64',
    'macos-x64',
    'linux-arm64',
    'windows',
    'windows-x64',
  ]);
});

test('a block for several platforms shows for any of them', () => {
  assert.ok(!hidden({ 'data-platform-os': 'linux', 'data-platform': 'linux-x64' }).includes('macos linux'));
  assert.ok(hidden({ 'data-platform-os': 'windows', 'data-platform': 'windows-x64' }).includes('macos linux'));
});

test('<Platform only> accepts known tokens and rejects the rest', () => {
  assert.deepEqual(parsePlatformTokens(' macos  linux macos ', ids), ['macos', 'linux']);
  assert.throws(() => parsePlatformTokens('macOS', ids), /Unknown platform "macOS"/);
  assert.throws(() => parsePlatformTokens('', ids), /needs an `only` attribute/);
});

// Which <PlatformMatrix> rows the highlight CSS marks for a given <html> state.
function highlighted(htmlAttributes) {
  const css = platformHighlightCss(ids);
  assert.match(css, /^@media screen \{/);
  const selectors = css.slice(css.indexOf('{') + 1, css.indexOf(' {\n  background')).split(',').map((s) => s.trim());
  const rows = ids.map((id) => `<tr data-platform-row="${id} ${id.split('-')[0]}"><td>${id}</td></tr>`).join('');
  const attrs = Object.entries(htmlAttributes).map(([name, value]) => `${name}="${value}"`).join(' ');
  const { document } = new JSDOM(`<html ${attrs}><body><table><tbody>${rows}</tbody></table></body></html>`).window;
  const matched = new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]));
  return [...document.querySelectorAll('tr')].filter((row) => matched.has(row)).map((row) => row.textContent);
}

test('matrix highlight marks nothing when no platform is chosen', () => {
  assert.deepEqual(highlighted({}), []);
});

test('matrix highlight marks every row for an OS until the CPU is known', () => {
  assert.deepEqual(highlighted({ 'data-platform-os': 'macos' }), ['macos-arm64', 'macos-x64']);
});

test('matrix highlight marks only the exact platform once it is known', () => {
  assert.deepEqual(highlighted({ 'data-platform-os': 'macos', 'data-platform': 'macos-x64' }), ['macos-x64']);
  assert.deepEqual(highlighted({ 'data-platform-os': 'windows', 'data-platform': 'windows-x64' }), ['windows-x64']);
});
