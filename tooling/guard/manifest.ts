const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** External dependency names from a parsed package.json; workspace links are skipped. */
export const dependencyNames = (manifest: unknown): string[] => {
  if (!isRecord(manifest)) throw new Error("package.json: expected a JSON object");
  const names = DEPENDENCY_FIELDS.flatMap((field) => {
    const section = manifest[field];
    if (section === undefined) return [];
    if (!isRecord(section)) throw new Error(`package.json: '${field}' must be an object`);
    return Object.entries(section)
      .filter(([, version]) => !(typeof version === "string" && version.startsWith("workspace:")))
      .map(([name]) => name);
  });
  return [...new Set(names)];
};
