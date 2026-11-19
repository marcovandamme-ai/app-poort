import { describe, expect, it } from "vitest";
import { databaseName, parseDbEnv } from "./env.ts";

const parts = { PGHOST: "db", PGUSER: "poort", PGPASSWORD: "a#b/c?d@e", PGDATABASE: "poort" };

describe("parseDbEnv", () => {
  it("keeps a password with URL characters intact", () => {
    expect(parseDbEnv(parts)).toMatchObject({ kind: "parts", password: "a#b/c?d@e", port: 5432 });
  });

  it("prefers DATABASE_URL when it is set", () => {
    const config = parseDbEnv({ ...parts, DATABASE_URL: "postgres://u:p@h:5432/x_test" });
    expect(config).toEqual({ kind: "url", url: "postgres://u:p@h:5432/x_test" });
  });

  it("names missing fields without values", () => {
    const run = () => parseDbEnv({ PGHOST: "db", PGPASSWORD: "geheim" });
    expect(run).toThrow(/PGUSER, PGDATABASE/);
    expect(run).not.toThrow(/geheim/);
  });

  it("rejects a URL for another database system without echoing it", () => {
    const run = () => parseDbEnv({ DATABASE_URL: "mysql://u:geheim@h/x" });
    expect(run).toThrow(/DATABASE_URL/);
    expect(run).not.toThrow(/geheim/);
  });
});

describe("databaseName", () => {
  it("reads the name from both forms", () => {
    expect(databaseName(parseDbEnv(parts))).toBe("poort");
    expect(databaseName(parseDbEnv({ DATABASE_URL: "postgres://u:p@h/poort_test" }))).toBe(
      "poort_test",
    );
  });
});
