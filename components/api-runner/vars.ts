// Pure helpers shared by the api-runner components and their node tests.
// No React, no path aliases — this file runs under `node --experimental-strip-types`.

export type VarMap = Record<string, string>;

export interface ResolveResult {
  resolved: string;
  missing: string[];
}

/**
 * Replace `$NAME` tokens (NAME = uppercase, digits, underscore, starting with
 * an uppercase letter) with values from `vars`. Unknown or empty values leave
 * the token in place and report the name in `missing` (deduplicated).
 */
export function resolveTemplate(template: string, vars: VarMap): ResolveResult {
  const missing = new Set<string>();
  const resolved = template.replace(/\$([A-Z][A-Z0-9_]*)/g, (token, name: string) => {
    const value = vars[name];
    if (value === undefined || value === '') {
      missing.add(name);
      return token;
    }
    return value;
  });
  return { resolved, missing: [...missing] };
}

/**
 * Walk `dotPath` (e.g. "nextCursor.afterSeq") into a JSON value. Returns the
 * target stringified when it is a string/number/boolean, otherwise undefined.
 */
export function extractByPath(value: unknown, dotPath: string): string | undefined {
  let current: unknown = value;
  for (const key of dotPath.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  switch (typeof current) {
    case 'string':
      return current;
    case 'number':
    case 'boolean':
      return String(current);
    default:
      return undefined;
  }
}
