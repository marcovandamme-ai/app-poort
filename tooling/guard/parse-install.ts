import type { Ecosystem } from "./allowlist.ts";

export interface RequestedPackage {
  readonly ecosystem: Ecosystem;
  readonly name: string;
}

interface InstallRule {
  readonly tool: string;
  readonly verbs: readonly string[];
  readonly ecosystem: Ecosystem;
}

const RULES: readonly InstallRule[] = [
  { tool: "npm", verbs: ["install", "i", "add"], ecosystem: "npm" },
  { tool: "pnpm", verbs: ["add", "install", "i"], ecosystem: "npm" },
  { tool: "yarn", verbs: ["add"], ecosystem: "npm" },
  { tool: "bun", verbs: ["add", "install", "i"], ecosystem: "npm" },
  { tool: "expo", verbs: ["install"], ecosystem: "npm" },
  { tool: "pip", verbs: ["install"], ecosystem: "pypi" },
  { tool: "pip3", verbs: ["install"], ecosystem: "pypi" },
  { tool: "uv", verbs: ["add"], ecosystem: "pypi" },
  { tool: "poetry", verbs: ["add"], ecosystem: "pypi" },
];

const VALUE_FLAGS = new Set([
  "--filter",
  "-F",
  "--workspace",
  "--dir",
  "-C",
  "--prefix",
  "--registry",
  "-r",
  "--requirement",
  "-c",
  "--constraint",
  "-i",
  "--index-url",
  "--extra-index-url",
  "--group",
  "--optional",
]);

const SEGMENT_SEPARATOR = /&&|\|\||[;|\n]/;
const REDIRECTION = /^\d*[<>]/;

const stripQuotes = (token: string): string => token.replace(/^['"]|['"]$/g, "");

const npmName = (token: string): string => {
  const versionAt = token.indexOf("@", 1);
  return (versionAt === -1 ? token : token.slice(0, versionAt)).toLowerCase();
};

const pypiName = (token: string): string => (token.split(/[[<>=!~;]/)[0] ?? token).toLowerCase();

const operands = (tokens: readonly string[]): string[] => {
  const result: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || REDIRECTION.test(token)) break;
    if (token.startsWith("-")) {
      if (VALUE_FLAGS.has(token)) index += 1;
      continue;
    }
    result.push(token);
  }
  return result;
};

const fromSegment = (tokens: readonly string[]): RequestedPackage[] =>
  RULES.flatMap((rule) => {
    const toolIndex = tokens.indexOf(rule.tool);
    if (toolIndex === -1) return [];
    const [verb, ...packages] = operands(tokens.slice(toolIndex + 1));
    if (verb === undefined || !rule.verbs.includes(verb)) return [];
    const normalize = rule.ecosystem === "npm" ? npmName : pypiName;
    return packages.map((token) => ({ ecosystem: rule.ecosystem, name: normalize(token) }));
  });

/** Extracts every package a shell command would add or install. */
export const parseInstallCommand = (command: string): RequestedPackage[] => {
  const found = command
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim().split(/\s+/).map(stripQuotes))
    .flatMap(fromSegment);
  const unique = new Map(found.map((pkg) => [`${pkg.ecosystem}:${pkg.name}`, pkg]));
  return [...unique.values()];
};
