import { describe, expect, it } from "vitest";
import { parseInstallCommand } from "./parse-install.ts";

const names = (command: string): string[] =>
  parseInstallCommand(command).map((pkg) => `${pkg.ecosystem}:${pkg.name}`);

describe("parseInstallCommand", () => {
  it("ignores commands that install nothing new", () => {
    expect(names("pnpm install")).toEqual([]);
    expect(names("npm install --frozen-lockfile")).toEqual([]);
    expect(names("git status && ls -la")).toEqual([]);
  });

  it("extracts npm packages and strips versions", () => {
    expect(names("pnpm add -D vitest@^3 @tanstack/react-query@latest")).toEqual([
      "npm:vitest",
      "npm:@tanstack/react-query",
    ]);
    expect(names("npm i axios")).toEqual(["npm:axios"]);
    expect(names("yarn add zod")).toEqual(["npm:zod"]);
  });

  it("skips values of flags that take an argument", () => {
    expect(names("pnpm --filter app add zod")).toEqual(["npm:zod"]);
    expect(names("pnpm add --filter=api hono")).toEqual(["npm:hono"]);
  });

  it("handles expo install via npx and pnpm exec", () => {
    expect(names("npx expo install expo-camera")).toEqual(["npm:expo-camera"]);
    expect(names("pnpm exec expo install expo-image")).toEqual(["npm:expo-image"]);
  });

  it("handles chained commands and redirections", () => {
    expect(names("cd apps/app && pnpm add lodash 2>&1")).toEqual(["npm:lodash"]);
    expect(names("pnpm add zod; npm i moment")).toEqual(["npm:zod", "npm:moment"]);
  });

  it("extracts python packages and strips specifiers", () => {
    expect(names("uv add fastapi==0.115 'pydantic[email]>=2'")).toEqual([
      "pypi:fastapi",
      "pypi:pydantic",
    ]);
    expect(names("uv pip install requests")).toEqual(["pypi:requests"]);
    expect(names("pip install -r requirements.txt")).toEqual([]);
  });

  it("deduplicates packages", () => {
    expect(names("pnpm add zod && pnpm add zod")).toEqual(["npm:zod"]);
  });
});
