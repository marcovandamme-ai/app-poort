/** Drizzle appends the SQL parameters to its message; those can be tokens or e-mail addresses. */
const withoutParams = (message: string): string => message.split(/\n?params:/i)[0]?.trim() ?? "";

const describe = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${withoutParams(error.message)}` : "onbekende fout";

/** Stack frames only ("at …" lines): they hold code locations, never request data. */
const frames = (error: unknown): string =>
  error instanceof Error && error.stack !== undefined
    ? error.stack
        .split("\n")
        .filter((line) => line.trimStart().startsWith("at "))
        .slice(0, 8)
        .join("\n")
    : "";

/** One log entry without query parameters, cookies or tokens. */
export const formatError = (error: unknown): string => {
  const cause = error instanceof Error && error.cause !== undefined ? describe(error.cause) : "";
  return [describe(error), cause === "" ? "" : `oorzaak: ${cause}`, frames(error)]
    .filter((part) => part !== "")
    .join("\n");
};

export const logError = (error: unknown): void => {
  process.stderr.write(`${new Date().toISOString()} fout ${formatError(error)}\n`);
};
