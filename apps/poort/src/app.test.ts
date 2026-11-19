import { ApiErrorSchema, HealthSchema } from "@poort/shared";
import { describe, expect, it } from "vitest";
import { APP, fakeGate, testApp, viaCaddy } from "./test-helpers.ts";

describe("GET /health", () => {
  it("returns 200 when the database answers", async () => {
    const response = await testApp().request("/health");
    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({
      status: "ok",
      database: "up",
      version: "test",
    });
  });

  it("returns 503 when the database is down", async () => {
    const app = testApp({ health: { pingDatabase: async () => false, version: "test" } });
    const response = await app.request("/health");
    expect(response.status).toBe(503);
    expect(HealthSchema.parse(await response.json()).database).toBe("down");
  });
});

describe("GET /gate/verify", () => {
  it("redirects visitors without a session to login", async () => {
    const response = await testApp().request("/gate/verify", viaCaddy("/teller"));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `https://poort.example/login?terug=${encodeURIComponent(`${APP.publicUrl}/teller`)}`,
    );
  });

  it("redirects signed-in visitors without access to pricing", async () => {
    const gate = fakeGate({ resolveSession: async () => ({ userId: "u1" }) });
    const response = await testApp({ gate }).request("/gate/verify", viaCaddy());
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://poort.example/apps/proefapp/prijzen");
  });

  it("answers 200 with identity headers when access is granted", async () => {
    const gate = fakeGate({
      resolveSession: async () => ({ userId: "u1" }),
      listEntitlements: async () => ["pro", "basis"],
    });
    const response = await testApp({ gate }).request("/gate/verify", viaCaddy());
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Poort-User")).toBe("u1");
    expect(response.headers.get("X-Poort-Entitlements")).toBe("basis,pro");
  });

  it("answers 400 when the request did not come through a Caddy site block", async () => {
    const response = await testApp().request("/gate/verify");
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).code).toBe("bad_request");
  });

  it("answers 404 for an app that is not registered", async () => {
    const response = await testApp().request("/gate/verify", {
      headers: { "X-Poort-App": "onbekend", "X-Forwarded-Uri": "/" },
    });
    expect(response.status).toBe(404);
  });

  it("does not let X-Forwarded-Host choose the app or the return address", async () => {
    const response = await testApp().request(
      "/gate/verify",
      viaCaddy("/", { "X-Forwarded-Host": "evil.example", "X-Forwarded-Proto": "http" }),
    );
    expect(response.headers.get("Location")).toBe(
      `https://poort.example/login?terug=${encodeURIComponent(`${APP.publicUrl}/`)}`,
    );
  });
});

describe("errors", () => {
  it("answers unknown paths in the shared error format", async () => {
    const response = await testApp().request("/bestaat-niet");
    expect(response.status).toBe(404);
    expect(ApiErrorSchema.parse(await response.json()).code).toBe("not_found");
  });

  it("hides internals and logs when a dependency throws", async () => {
    const logged: unknown[] = [];
    const gate = fakeGate({
      findApp: async () => {
        throw new Error("db weg: postgres://geheim");
      },
    });
    const app = testApp({ gate, logError: (error) => logged.push(error) });
    const response = await app.request("/gate/verify", viaCaddy());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("geheim");
    expect(logged).toHaveLength(1);
  });

  it("sets security headers", async () => {
    const response = await testApp().request("/health");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("sends HSTS only when it is switched on", async () => {
    const off = await testApp().request("/health");
    expect(off.headers.get("Strict-Transport-Security")).toBeNull();
    const on = await testApp({ hsts: true }).request("/health");
    expect(on.headers.get("Strict-Transport-Security")).toContain("max-age");
  });
});
