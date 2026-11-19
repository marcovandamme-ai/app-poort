import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

const valid = {
  DATABASE_URL: "postgres://u:p@db:5432/poort",
  PUBLIC_URL: "https://poort.example/",
};

describe("parseEnv", () => {
  it("applies defaults and strips the trailing slash", () => {
    expect(parseEnv(valid)).toEqual({
      PORT: 3000,
      DATABASE_URL: valid.DATABASE_URL,
      PUBLIC_URL: "https://poort.example",
      APP_VERSION: "dev",
    });
  });

  it("names the missing variables without printing values", () => {
    expect(() => parseEnv({ PUBLIC_URL: "https://poort.example" })).toThrow(/DATABASE_URL/);
  });

  it.each(["mysql://x/y", "niet-een-url"])("rejects DATABASE_URL %s", (url) => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-http public address", () => {
    expect(() => parseEnv({ ...valid, PUBLIC_URL: "javascript:alert(1)" })).toThrow(/PUBLIC_URL/);
  });

  it("rejects an invalid port", () => {
    expect(() => parseEnv({ ...valid, PORT: "70000" })).toThrow(/PORT/);
  });
});
