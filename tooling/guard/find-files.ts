import { readdirSync } from "node:fs";
import { join } from "node:path";

const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".expo",
  ".turbo",
  ".venv",
  "ios",
  "android",
]);

/** Recursively lists files whose name passes `accept`, skipping generated folders. */
export const findFiles = (dir: string, accept: (name: string) => boolean): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED.has(entry.name)) return [];
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return findFiles(fullPath, accept);
    return entry.isFile() && accept(entry.name) ? [fullPath] : [];
  });
