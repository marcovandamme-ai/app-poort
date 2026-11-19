import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAllowed, parseAllowlist } from "./allowlist.ts";
import { evaluateCommand } from "./evaluate.ts";

const writeAllowlist = (content: string): string => {
  const path = join(mkdtempSync(join(tmpdir(), "guard-")), "dependency-allowlist.json");
  writeFileSync(path, content);
  return path;
};

const VALID = JSON.stringify({ npm: ["zod", "expo-*", "@tanstack/*"], pypi: ["fastapi"] });

describe("allowlist", () => {
  it("matches exact names and prefix patterns case-insensitively", () => {
    const list = parseAllowlist(VALID);
    expect(isAllowed(list, "npm", "zod")).toBe(true);
    expect(isAllowed(list, "npm", "expo-camera")).toBe(true);
    expect(isAllowed(list, "npm", "@tanstack/react-query")).toBe(true);
    expect(isAllowed(list, "npm", "axios")).toBe(false);
    expect(isAllowed(list, "pypi", "FastAPI")).toBe(true);
  });

  it("rejects malformed allowlists", () => {
    expect(() => parseAllowlist("[]")).toThrow("expected a JSON object");
    expect(() => parseAllowlist('{"npm":["a"]}')).toThrow("string arrays");
  });
});

describe("evaluateCommand", () => {
  it("allows non-install commands without reading the allowlist", () => {
    expect(evaluateCommand("pnpm test", "/does/not/exist.json")).toBeNull();
  });

  it("allows allowlisted packages", () => {
    expect(evaluateCommand("pnpm add zod expo-image", writeAllowlist(VALID))).toBeNull();
  });

  it("blocks packages outside the allowlist and names them", () => {
    const reason = evaluateCommand("pnpm add zod axios", writeAllowlist(VALID));
    expect(reason).toContain("axios (npm)");
    expect(reason).not.toContain("zod (npm)");
  });

  it("blocks installs when the allowlist is missing or broken", () => {
    expect(evaluateCommand("pnpm add zod", "/does/not/exist.json")).toContain("ontbreekt");
    expect(evaluateCommand("pnpm add zod", writeAllowlist("{"))).toContain("onleesbaar");
  });
});
