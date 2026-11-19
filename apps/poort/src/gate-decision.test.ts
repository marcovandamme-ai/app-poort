import { describe, expect, it } from "vitest";
import { decideGate, safePath } from "./gate-decision.ts";
import { APP, fakeGate } from "./test-helpers.ts";

const request = { appSlug: APP.slug, uri: "/teller?x=1", cookie: undefined };

describe("safePath", () => {
  it("keeps a normal path with query", () => {
    expect(safePath("/a/b?c=d")).toBe("/a/b?c=d");
  });

  it.each([undefined, "", "//evil.example", "https://evil.example", "/\\evil.example", "x"])(
    "falls back to / for %s",
    (uri) => {
      expect(safePath(uri)).toBe("/");
    },
  );
});

describe("decideGate", () => {
  it.each([undefined, "", "Proefapp", "a b", "../x", "-a", "a".repeat(64)])(
    "rejects app slug %s",
    async (appSlug) => {
      expect(await decideGate(fakeGate(), { ...request, appSlug })).toEqual({ kind: "invalid" });
    },
  );

  it("does not know unregistered apps", async () => {
    const decision = await decideGate(fakeGate(), { ...request, appSlug: "andere-app" });
    expect(decision).toEqual({ kind: "unknown_app" });
  });

  it("sends visitors without a session to login with the registered app address", async () => {
    expect(await decideGate(fakeGate(), request)).toEqual({
      kind: "login",
      returnTo: `${APP.publicUrl}/teller?x=1`,
    });
  });

  it("never builds a return address outside the app", async () => {
    const decision = await decideGate(fakeGate(), { ...request, uri: "//evil.example" });
    expect(decision).toEqual({ kind: "login", returnTo: `${APP.publicUrl}/` });
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])(
    "returns to the app root after a %s without a session",
    async (method) => {
      const decision = await decideGate(fakeGate(), { ...request, uri: "/plus", method });
      expect(decision).toEqual({ kind: "login", returnTo: `${APP.publicUrl}/` });
    },
  );

  it("keeps the page for a GET", async () => {
    const decision = await decideGate(fakeGate(), { ...request, method: "GET" });
    expect(decision).toEqual({ kind: "login", returnTo: `${APP.publicUrl}/teller?x=1` });
  });

  it("rejects input that is not a verify request", async () => {
    expect(await decideGate(fakeGate(), null)).toEqual({ kind: "invalid" });
    expect(await decideGate(fakeGate(), { ...request, uri: 5 })).toEqual({ kind: "invalid" });
  });

  it("still decides for a very long address, and returns to the app root", async () => {
    const decision = await decideGate(fakeGate(), { ...request, uri: `/${"a".repeat(5000)}` });
    expect(decision).toEqual({ kind: "login", returnTo: `${APP.publicUrl}/` });
  });

  it("sends signed-in visitors without access to pricing", async () => {
    const deps = fakeGate({ resolveSession: async () => ({ userId: "u1" }) });
    expect(await decideGate(deps, request)).toEqual({ kind: "pricing", slug: APP.slug });
  });

  it("grants access with the entitlements of this user and this app only", async () => {
    const seen: string[][] = [];
    const deps = fakeGate({
      resolveSession: async () => ({ userId: "u1" }),
      listEntitlements: async (userId, appId) => {
        seen.push([userId, appId]);
        return ["basis"];
      },
    });
    expect(await decideGate(deps, request)).toEqual({
      kind: "granted",
      userId: "u1",
      entitlements: ["basis"],
    });
    expect(seen).toEqual([["u1", APP.id]]);
  });

  it("passes the cookie header to the session resolver", async () => {
    let received: string | undefined;
    const deps = fakeGate({
      resolveSession: async (cookie) => {
        received = cookie;
        return null;
      },
    });
    await decideGate(deps, { ...request, cookie: "s=abc" });
    expect(received).toBe("s=abc");
  });
});
