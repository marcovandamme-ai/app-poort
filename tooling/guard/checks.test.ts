import { describe, expect, it } from "vitest";
import { countLines, findLineViolations, isSourceFile } from "./line-limit.ts";
import { dependencyNames } from "./manifest.ts";

describe("dependencyNames", () => {
  it("collects all dependency sections and skips workspace links", () => {
    const manifest = {
      dependencies: { zod: "^3", "@app/shared": "workspace:*" },
      devDependencies: { vitest: "^3", zod: "^3" },
    };
    expect(dependencyNames(manifest)).toEqual(["zod", "vitest"]);
  });

  it("rejects invalid manifests", () => {
    expect(() => dependencyNames(null)).toThrow("expected a JSON object");
    expect(() => dependencyNames({ dependencies: [] })).toThrow("must be an object");
  });
});

describe("line limit", () => {
  it("counts lines with and without trailing newline", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\nb\n")).toBe(2);
  });

  it("only checks source files, not declaration files", () => {
    expect(isSourceFile("app.tsx")).toBe(true);
    expect(isSourceFile("model.py")).toBe(true);
    expect(isSourceFile("env.d.ts")).toBe(false);
    expect(isSourceFile("README.md")).toBe(false);
  });

  it("reports files above the maximum", () => {
    const files = [
      { path: "ok.ts", content: "a\n".repeat(3) },
      { path: "big.ts", content: "a\n".repeat(4) },
    ];
    expect(findLineViolations(files, 3)).toEqual([{ path: "big.ts", lines: 4 }]);
  });
});
