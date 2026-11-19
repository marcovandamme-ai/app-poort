import { describe, expect, it } from "vitest";
import { OriginSchema, parseEntitlements, SlugSchema, serializeEntitlements } from "./gate.ts";

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

  it("drops keys that could be read as more than one entitlement", () => {
    expect(serializeEntitlements(["basis,pro", "ok", "<x>"])).toBe("ok");
    expect(parseEntitlements("ok,<script>,Pro")).toEqual(["ok"]);
  });
});

describe("OriginSchema", () => {
  it.each([
    ["https://poort.example", "https://poort.example"],
    ["https://poort.example/", "https://poort.example"],
    ["http://localhost:8080", "http://localhost:8080"],
  ])("accepts %s", (input, origin) => {
    expect(OriginSchema.parse(input)).toBe(origin);
  });

  it.each([
    "https://h/pad",
    "https://h/?x=1",
    "https://h?x=1",
    "https://h/#f",
    "https://user:pw@h",
    "javascript:alert(1)",
    "ftp://h",
    "h",
  ])("rejects %s", (input) => {
    expect(OriginSchema.safeParse(input).success).toBe(false);
  });
});

describe("SlugSchema", () => {
  it.each(["proefapp", "a", "app-2"])("accepts %s", (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["", "Proefapp", "a b", "../x", "-a", "a-", "a".repeat(64)])("rejects %s", (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(false);
  });
});
