import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APP_URL, GATE_URL, startChain, VALID_COOKIE } from "./chain.ts";

const caddyBin = process.env.CADDY_BIN;
const ask = (url: string, init: RequestInit = {}) => fetch(url, { redirect: "manual", ...init });
const loginFor = (path: string) => `${GATE_URL}/login?terug=${encodeURIComponent(APP_URL + path)}`;

// Runs the repo's own Caddyfile in a real Caddy: set CADDY_BIN to the binary (CI does).
describe.skipIf(caddyBin === undefined)("Caddy → poort → app (integration)", () => {
  let stop: () => Promise<void>;
  beforeAll(async () => {
    stop = await startChain(caddyBin ?? "");
  });
  afterAll(() => stop());

  it("sends a visitor without a session to login, with the page they asked for", async () => {
    const response = await ask(`${APP_URL}/teller?a=1`);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(loginFor("/teller?a=1"));
  });

  it("lets a signed-in visitor with access through, with the identity the gate decided", async () => {
    const response = await ask(`${APP_URL}/`, { headers: { Cookie: VALID_COOKIE } });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Toegang: basis");
  });

  it("replaces identity headers the visitor sends, with and without a session", async () => {
    const forged = { "X-Poort-User": "admin", "X-Poort-Entitlements": "pro" };
    const without = await ask(`${APP_URL}/__spiegel`, { headers: forged });
    expect(without.status).toBe(302);

    const withSession = await ask(`${APP_URL}/__spiegel`, {
      headers: { ...forged, Cookie: VALID_COOKIE },
    });
    const seen = (await withSession.json()) as Record<string, string>;
    expect(seen["x-poort-user"]).toBe("u-echt");
    expect(seen["x-poort-entitlements"]).toBe("basis");
  });

  it("does not let the visitor choose the app, the host or the path that is checked", async () => {
    const response = await ask(`${APP_URL}/echt`, {
      headers: {
        "X-Poort-App": "andere-app",
        "X-Forwarded-Host": "evil.example",
        "X-Forwarded-Uri": "//evil.example",
      },
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(loginFor("/echt"));
  });

  it("returns to the app root after a POST without a session", async () => {
    const response = await ask(`${APP_URL}/plus`, { method: "POST" });
    expect(response.headers.get("Location")).toBe(loginFor("/"));
  });

  it("never hands the gate's cookies to the app, and leaves the app's own cookies alone", async () => {
    const cookie = `thema=donker; ${VALID_COOKIE}; __Secure-poort.session_data=x; taal=nl`;
    const response = await ask(`${APP_URL}/__spiegel`, { headers: { Cookie: cookie } });
    const seen = (await response.json()) as Record<string, string>;
    expect(seen.cookie).toBe("thema=donker; taal=nl");
  });

  it.each([
    [`${VALID_COOKIE}; thema=donker`, "thema=donker"],
    [`${VALID_COOKIE}; __Host-poort.x=1; thema=donker`, "thema=donker"],
    [`poort-eigen=1; poort_ook=2; ${VALID_COOKIE}`, "poort-eigen=1; poort_ook=2"],
  ])("keeps the remaining Cookie header well-formed for %s", async (cookie, expected) => {
    const response = await ask(`${APP_URL}/__spiegel`, { headers: { Cookie: cookie } });
    const seen = (await response.json()) as Record<string, string>;
    expect(seen.cookie).toBe(expected);
  });

  it("does not let an app set or overwrite the gate's cookies", async () => {
    const response = await ask(`${APP_URL}/__zet-cookies`, { headers: { Cookie: VALID_COOKIE } });
    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie().filter((cookie) => cookie !== "");
    expect(cookies).toEqual(["thema=donker; Path=/"]);
  });

  it.each(["/gate/verify", "/gate", "/GATE/verify", "//gate/verify", "/%67ate/verify", "/gate/"])(
    "keeps %s unreachable from outside",
    async (path) => {
      const response = await ask(GATE_URL + path, { headers: { "X-Poort-App": "proefapp" } });
      expect(response.status).toBe(404);
    },
  );

  it("serves health through Caddy", async () => {
    expect((await ask(`${GATE_URL}/health`)).status).toBe(200);
  });
});
