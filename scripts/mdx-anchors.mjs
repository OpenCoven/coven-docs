export function stripCodeFences(source) {
  const lines = source.split(/\r\n?|\n/);
  let fence = null;
  return lines
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && /^[ \t]*$/.test(marker[2])) {
          fence = null;
        }
        return '';
      }
      if (marker && (marker[1][0] === '~' || !marker[2].includes('`'))) {
        fence = marker[1];
        return '';
      }
      return line;
    })
    .join('\n');
}

function slugBase(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function collectAnchors(source) {
  const counts = new Map();
  const anchors = new Set();

  for (const line of stripCodeFences(source).split(/\r?\n/)) {
    const explicit = line.match(/\{#([A-Za-z0-9_-]+)\}\s*$/);
    if (explicit) anchors.add(explicit[1]);

    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!heading) continue;

    const base = slugBase(heading[1].replace(/\s*\{#[^}]+\}\s*$/, ''));
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}
