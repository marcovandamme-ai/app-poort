import { describe, expect, it } from "vitest";
import { createProefapp } from "./app.ts";
import { createCounter } from "./counter.ts";

const proefapp = (
  counter = createCounter(),
  logError: (error: unknown) => void = () => undefined,
) => createProefapp(counter, logError);

const as = (userId: string, method = "GET") => ({
  method,
  headers: { "X-Poort-User": userId, "X-Poort-Entitlements": "basis" },
});

describe("proefapp", () => {
  it("refuses requests that did not come through the gate", async () => {
    const app = proefapp();
    expect((await app.request("/")).status).toBe(401);
    expect((await app.request("/plus", { method: "POST" })).status).toBe(401);
    expect((await app.request("/", { headers: { "X-Poort-User": "" } })).status).toBe(401);
  });

  it("shows the counter and the entitlements", async () => {
    const response = await proefapp().request("/", as("u1"));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain(">0</output>");
    expect(body).toContain("Toegang: basis");
  });

  it("counts per user", async () => {
    const app = proefapp();
    const plus = await app.request("/plus", as("u1", "POST"));
    expect(plus.status).toBe(303);
    await app.request("/plus", as("u1", "POST"));
    expect(await (await app.request("/", as("u1"))).text()).toContain(">2</output>");
    expect(await (await app.request("/", as("u2"))).text()).toContain(">0</output>");
  });

  it("escapes header content in the page", async () => {
    const response = await proefapp().request("/", {
      headers: { "X-Poort-User": "u1", "X-Poort-Entitlements": "<script>x</script>" },
    });
    expect(await response.text()).not.toContain("<script>x</script>");
  });

  it("answers a crash in the shared error format and logs it", async () => {
    const logged: unknown[] = [];
    const broken = {
      get: () => {
        throw new Error("kapot");
      },
      increment: () => 0,
    };
    const response = await proefapp(broken, (error) => logged.push(error)).request("/", as("u1"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ code: "internal", message: "Er ging iets mis." });
    expect(logged).toHaveLength(1);
  });

  it("does not send HSTS", async () => {
    const response = await proefapp().request("/health");
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
  });

  it("answers health without identity", async () => {
    expect((await proefapp().request("/health")).status).toBe(200);
  });
});
