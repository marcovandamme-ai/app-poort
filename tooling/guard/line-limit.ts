export const MAX_LINES = 150;

const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/;

export interface SourceFile {
  readonly path: string;
  readonly content: string;
}

export interface LineViolation {
  readonly path: string;
  readonly lines: number;
}

export const isSourceFile = (name: string): boolean =>
  SOURCE_FILE.test(name) && !name.endsWith(".d.ts");

export const countLines = (content: string): number =>
  content === "" ? 0 : content.replace(/\n$/, "").split("\n").length;

export const findLineViolations = (
  files: readonly SourceFile[],
  max: number = MAX_LINES,
): LineViolation[] =>
  files
    .map((file) => ({ path: file.path, lines: countLines(file.content) }))
    .filter((file) => file.lines > max);
