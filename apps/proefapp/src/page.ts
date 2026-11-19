import { html } from "hono/html";

export const counterPage = (count: number, entitlements: readonly string[]) => html`<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Proefapp</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; }
      main { text-align: center; padding: 1.5rem; }
      output { display: block; font-size: clamp(3rem, 20vw, 8rem); font-weight: 700; }
      button { font-size: 1.25rem; padding: 0.75rem 2rem; border-radius: 0.5rem; border: 2px solid; cursor: pointer; }
      button:focus-visible { outline: 3px solid; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Proefapp</h1>
      <output aria-live="polite" aria-label="Teller">${count}</output>
      <form method="post" action="/plus"><button type="submit">Plus één</button></form>
      <p>Toegang: ${entitlements.join(", ")}</p>
    </main>
  </body>
</html>`;
