// CI check: no source file may exceed MAX_LINES.
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { findFiles } from "./find-files.ts";
import { findLineViolations, isSourceFile, MAX_LINES } from "./line-limit.ts";

const root = process.cwd();
const files = findFiles(root, isSourceFile).map((path) => ({
  path: relative(root, path),
  content: readFileSync(path, "utf8"),
}));
const violations = findLineViolations(files);

if (violations.length > 0) {
  const report = violations.map((v) => `${v.path}: ${v.lines} regels`).join("\n");
  process.stderr.write(`Bestanden boven ${MAX_LINES} regels; splits ze op:\n${report}\n`);
  process.exit(1);
}
process.stdout.write(`check:lines ok (${files.length} bestanden)\n`);
