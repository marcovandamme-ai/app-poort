import { readFileSync } from "node:fs";

// Zero-dependency on purpose: the Claude Code hook must work before `pnpm install`.
export interface Allowlist {
  readonly npm: readonly string[];
  readonly pypi: readonly string[];
}

export type Ecosystem = keyof Allowlist;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const parseAllowlist = (raw: string): Allowlist => {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("dependency-allowlist.json: expected a JSON object");
  }
  const { npm, pypi } = data as Record<string, unknown>;
  if (!isStringArray(npm) || !isStringArray(pypi)) {
    throw new Error("dependency-allowlist.json: 'npm' and 'pypi' must be string arrays");
  }
  return { npm, pypi };
};

export const loadAllowlist = (path: string): Allowlist =>
  parseAllowlist(readFileSync(path, "utf8"));

const matches = (pattern: string, name: string): boolean =>
  pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : pattern === name;

export const isAllowed = (list: Allowlist, ecosystem: Ecosystem, name: string): boolean => {
  const normalized = name.toLowerCase();
  return list[ecosystem].some((pattern) => matches(pattern.toLowerCase(), normalized));
};
