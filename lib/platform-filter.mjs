// Platform filter runtime, shared by the server (inline boot script and CSS),
// the client store, and node tests. Plain JS so `node --test` can import it.
//
// Hiding is CSS-only: bootPlatform() sets data attributes on <html> before
// first paint, and platformCss() hides every [data-platforms] block that does
// not match. The server always renders every block, so search engines, no-JS
// readers, print, and the Markdown exports see all platforms.

/**
 * Decide which platform to show and mark <html> with it. Precedence: a
 * `?platform=` link, then the reader's saved choice, then the browser.
 *
 * Runs inline in <head> as `(${bootPlatform})(config)`, so it must stay
 * self-contained: no imports, no references outside this function, and only
 * syntax that needs no transpiler helpers. `env` exists for tests.
 */
export function bootPlatform(config, env) {
  var w = env || window;
  var root = w.document.documentElement;

  function osOf(id) {
    return id.split('-')[0];
  }

  function parse(value) {
    if (!value) return null;
    if (value === 'all') return { platform: null, os: null };
    if (config.platforms.indexOf(value) !== -1) return { platform: value, os: osOf(value) };
    if (config.oses.indexOf(value) !== -1) return { platform: null, os: value };
    return null;
  }

  // The one platform an OS ships for, or null when the CPU still matters.
  function only(os) {
    var matches = config.platforms.filter(function (id) {
      return osOf(id) === os;
    });
    return matches.length === 1 ? matches[0] : null;
  }

  // Desktop OS from the user agent. macOS user agents claim Intel on Apple
  // Silicon too, so a Mac stays "macos" until a better signal arrives.
  function detect(ua, touchPoints) {
    if (/Android|CrOS|iPhone|iPad|iPod/.test(ua)) return null;
    if (/Macintosh|Mac OS X/.test(ua)) return touchPoints > 1 ? null : { platform: only('macos'), os: 'macos' };
    if (/Windows/.test(ua)) return { platform: only('windows'), os: 'windows' };
    if (/Linux/.test(ua)) {
      var id = /aarch64|arm64/i.test(ua) ? 'linux-arm64' : /x86_64|amd64|x64/i.test(ua) ? 'linux-x64' : null;
      return { platform: id && config.platforms.indexOf(id) !== -1 ? id : only('linux'), os: 'linux' };
    }
    return null;
  }

  var choice = null;
  var source = 'default';
  try {
    choice = parse(new w.URLSearchParams(w.location.search).get(config.param));
  } catch (error) {}
  if (choice) source = 'link';
  if (!choice) {
    try {
      choice = parse(w.localStorage.getItem(config.storageKey));
    } catch (error) {}
    if (choice) source = 'saved';
  }
  if (!choice) {
    choice = detect(w.navigator.userAgent || '', w.navigator.maxTouchPoints || 0);
    if (choice) source = 'detected';
  }
  if (!choice) choice = { platform: null, os: null };

  if (choice.platform) root.setAttribute('data-platform', choice.platform);
  else root.removeAttribute('data-platform');
  if (choice.os) root.setAttribute('data-platform-os', choice.os);
  else root.removeAttribute('data-platform-os');
  root.setAttribute('data-platform-source', source);
  return { platform: choice.platform, os: choice.os, source: source };
}

/** The inline <head> script: bootPlatform bound to this site's config. */
export function platformBootScript(config) {
  return `(${bootPlatform.toString()})(${JSON.stringify(config)})`;
}

/**
 * Rules that hide platform blocks for other platforms. A block lists the
 * tokens it applies to in `data-platforms`: OS families (`macos`) and exact
 * platforms (`macos-arm64`).
 */
export function platformCss(platformIds) {
  const osOf = (id) => id.split('-')[0];
  const oses = [...new Set(platformIds.map(osOf))];
  const keep = (tokens) => tokens.map((token) => `:not([data-platforms~='${token}'])`).join('');
  const rules = [];

  // OS known, CPU not: show the family and every CPU variant of it.
  for (const os of oses) {
    const variants = platformIds.filter((id) => osOf(id) === os);
    rules.push(`html[data-platform-os='${os}'] [data-platforms]${keep([os, ...variants])}`);
  }
  // Exact platform: show the family and that variant only.
  for (const id of platformIds) {
    rules.push(`html[data-platform='${id}'] [data-platforms]${keep([osOf(id), id])}`);
  }
  // Screen only: a printed page keeps every platform.
  return `@media screen {\n${rules.join(',\n')} {\n  display: none !important;\n}\n}\n`;
}

/** Split an `only` attribute into tokens, rejecting anything unknown. */
export function parsePlatformTokens(only, platformIds) {
  const known = new Set([...platformIds, ...platformIds.map((id) => id.split('-')[0])]);
  const tokens = String(only ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('<Platform> needs an `only` attribute, e.g. only="windows"');
  for (const token of tokens) {
    if (!known.has(token)) {
      throw new Error(`Unknown platform "${token}" in <Platform only>. Use one of: ${[...known].join(', ')}`);
    }
  }
  return [...new Set(tokens)];
}
