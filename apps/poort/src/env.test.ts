import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

const parts = { PGHOST: "db", PGUSER: "poort", PGPASSWORD: "p@ss/w#rd?", PGDATABASE: "poort" };
const valid = { ...parts, PUBLIC_URL: "https://poort.example/" };

describe("parseEnv", () => {
  it("applies defaults and reduces the public address to its origin", () => {
    expect(parseEnv(valid)).toEqual({
      port: 3000,
      publicUrl: "https://poort.example",
      version: "dev",
      hsts: false,
      database: {
        kind: "parts",
        host: "db",
        port: 5432,
        user: "poort",
        password: "p@ss/w#rd?",
        database: "poort",
      },
    });
  });

  it("accepts a database URL instead of the separate fields", () => {
    const url = "postgres://u:p@db:5432/poort";
    expect(parseEnv({ PUBLIC_URL: valid.PUBLIC_URL, DATABASE_URL: url }).database).toEqual({
      kind: "url",
      url,
    });
  });

  it("names the missing variables without printing values", () => {
    const run = () => parseEnv({ ...valid, PGPASSWORD: undefined });
    expect(run).toThrow(/PGPASSWORD/);
    expect(run).not.toThrow(/poort\.example/);
  });

  it.each(["mysql://x/y", "niet-een-url"])("rejects DATABASE_URL %s", (url) => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
  });

  it.each(["javascript:alert(1)", "https://h/pad", "https://h?x=1", "https://u:p@h"])(
    "rejects public address %s",
    (url) => {
      expect(() => parseEnv({ ...valid, PUBLIC_URL: url })).toThrow(/PUBLIC_URL/);
    },
  );

  it("rejects an invalid port", () => {
    expect(() => parseEnv({ ...valid, PORT: "70000" })).toThrow(/PORT/);
  });

  it("switches HSTS on only for the exact word true", () => {
    expect(parseEnv({ ...valid, HSTS: "true" }).hsts).toBe(true);
    expect(() => parseEnv({ ...valid, HSTS: "ja" })).toThrow(/HSTS/);
  });
});
