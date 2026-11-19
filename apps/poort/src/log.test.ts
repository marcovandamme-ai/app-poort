import { describe, expect, it } from "vitest";
import { formatError } from "./log.ts";

describe("formatError", () => {
  it("removes the query parameters Drizzle puts in its message", () => {
    const error = new Error(
      'Failed query: select "id" from "session" where "token" = $1\nparams: geheim-token,true,1',
      { cause: new Error("connection refused") },
    );
    const text = formatError(error);
    expect(text).toContain("Failed query");
    expect(text).toContain("oorzaak: Error: connection refused");
    expect(text).not.toContain("geheim-token");
    expect(text).not.toContain("params");
  });

  it("removes parameters from the cause as well", () => {
    const cause = new Error("x\nparams: a@example.com");
    expect(formatError(new Error("buiten", { cause }))).not.toContain("a@example.com");
  });

  it("keeps code locations", () => {
    expect(formatError(new Error("boem"))).toMatch(/Error: boem\n\s+at /);
  });

  it("does not print values that are not errors", () => {
    expect(formatError("postgres://u:geheim@db")).toBe("onbekende fout");
  });
});
