// CI check: every dependency in every package.json must be on the allowlist.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { isAllowed, loadAllowlist } from "./allowlist.ts";
import { findFiles } from "./find-files.ts";
import { dependencyNames } from "./manifest.ts";

const root = process.cwd();
const list = loadAllowlist(join(root, "dependency-allowlist.json"));
const manifests = findFiles(root, (name) => name === "package.json");

const violations = manifests.flatMap((path) => {
  const names = dependencyNames(JSON.parse(readFileSync(path, "utf8")));
  return names
    .filter((name) => !isAllowed(list, "npm", name))
    .map((name) => `${relative(root, path)}: ${name}`);
});

if (violations.length > 0) {
  process.stderr.write(`Niet op dependency-allowlist.json:\n${violations.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`check:deps ok (${manifests.length} package.json)\n`);
