import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createApp } from "../apps/poort/src/app.ts";
import { createProefapp } from "../apps/proefapp/src/app.ts";
import { createCounter } from "../apps/proefapp/src/counter.ts";

export const PORTS = { poort: 18300, proefapp: 18301, caddyPoort: 18080, caddyApp: 18081 } as const;
export const GATE_URL = `http://127.0.0.1:${PORTS.caddyPoort}`;
export const APP_URL = `http://127.0.0.1:${PORTS.caddyApp}`;
export const VALID_COOKIE = "poort.session_token=geldig";

/** The real gate, with a session and entitlement stub: only VALID_COOKIE is a signed-in user. */
const gate = () =>
  createApp({
    gate: {
      resolveSession: async (cookie) =>
        cookie?.includes(VALID_COOKIE) === true ? { userId: "u-echt" } : null,
      findApp: async (slug) =>
        slug === "proefapp" ? { id: "a1", slug, publicUrl: APP_URL } : null,
      listEntitlements: async () => ["basis"],
    },
    health: { pingDatabase: async () => true, version: "keten" },
    publicUrl: GATE_URL,
    hsts: false,
    logError: () => undefined,
  });

/** The real proefapp plus a mirror that shows which headers reached the app. */
const upstream = () =>
  new Hono()
    .get("/__spiegel", (c) => c.json(Object.fromEntries(c.req.raw.headers)))
    .route(
      "/",
      createProefapp(createCounter(), () => undefined),
    );

/** The repo's own Caddyfile, with only addresses swapped for local test ports. */
const testCaddyfile = (): string => {
  const source = readFileSync(
    fileURLToPath(new URL("../infra/Caddyfile", import.meta.url)),
    "utf8",
  );
  const local = source
    .replaceAll("poort:3000", `127.0.0.1:${PORTS.poort}`)
    .replaceAll("proefapp:3001", `127.0.0.1:${PORTS.proefapp}`)
    .replace(":8080 {", `:${PORTS.caddyPoort} {`)
    .replace(":8081 {", `:${PORTS.caddyApp} {`);
  const path = join(mkdtempSync(join(tmpdir(), "keten-")), "Caddyfile");
  writeFileSync(path, local);
  return path;
};

const waitUntilUp = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const up = await fetch(url).then(
      () => true,
      () => false,
    );
    if (up) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${url} kwam niet op`);
};

export const startChain = async (caddyBin: string): Promise<() => Promise<void>> => {
  const servers = [
    serve({ fetch: gate().fetch, port: PORTS.poort, hostname: "127.0.0.1" }),
    serve({ fetch: upstream().fetch, port: PORTS.proefapp, hostname: "127.0.0.1" }),
  ];
  const caddy: ChildProcess = spawn(
    caddyBin,
    ["run", "--config", testCaddyfile(), "--adapter", "caddyfile"],
    { stdio: "ignore" },
  );
  await waitUntilUp(`${GATE_URL}/health`);
  return async () => {
    caddy.kill("SIGTERM");
    await Promise.all(
      servers.map((server) => new Promise((resolve) => server.close(() => resolve(undefined)))),
    );
  };
};
