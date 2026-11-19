// Claude Code PreToolUse hook. Exit 2 blocks the tool call and shows stderr to Claude.
import { join } from "node:path";
import { evaluateCommand } from "./evaluate.ts";

const ALLOW = 0;
const BLOCK = 2;
const HOOK_ERROR = 1;

interface HookInput {
  readonly tool_name?: unknown;
  readonly tool_input?: { readonly command?: unknown };
}

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
};

const run = async (): Promise<number> => {
  const input = JSON.parse(await readStdin()) as HookInput;
  const command = input.tool_input?.command;
  if (input.tool_name !== "Bash" || typeof command !== "string") return ALLOW;
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const reason = evaluateCommand(command, join(root, "dependency-allowlist.json"));
  if (reason === null) return ALLOW;
  process.stderr.write(`${reason}\n`);
  return BLOCK;
};

run()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`dependency-guard hook error: ${message}\n`);
    process.exit(HOOK_ERROR);
  });
