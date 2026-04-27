// SQLite doesn't have native arrays — we JSON-encode them in String columns.
// These helpers centralize parse/serialize so callers don't eat try/catch everywhere.

export function parseList<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyList<T>(list: T[] | undefined | null): string {
  if (!list) return "[]";
  return JSON.stringify(list);
}

export function parseObject<T extends object = Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T = {} as T
): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function stringifyObject(obj: unknown): string {
  return JSON.stringify(obj ?? {});
}
