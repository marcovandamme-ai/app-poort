import { describe, expect, it } from "vitest";
import { parseEntitlements, serializeEntitlements } from "./gate.ts";

describe("entitlement header", () => {
  it("serializes sorted and without duplicates", () => {
    expect(serializeEntitlements(["pro", "basis", "pro"])).toBe("basis,pro");
  });

  it("round-trips", () => {
    expect(parseEntitlements(serializeEntitlements(["b", "a"]))).toEqual(["a", "b"]);
  });

  it("treats a missing or empty header as no entitlements", () => {
    expect(parseEntitlements(undefined)).toEqual([]);
    expect(parseEntitlements("")).toEqual([]);
  });
});
