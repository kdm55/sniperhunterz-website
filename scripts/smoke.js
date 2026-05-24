#!/usr/bin/env node
/**
 * Smoke test — run while server is up: npm start (other terminal) then npm run smoke
 */

const { loadConfig } = require("../lib/config");
const { port } = loadConfig();

const BASE = (process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`).replace(
  /\/$/,
  ""
);

async function check(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
    return true;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    return false;
  }
}

async function getJson(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`non-JSON ${r.status}: ${text.slice(0, 120)}`);
  }
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getHtml(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Accept: "text/html" } });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  return text;
}

async function main() {
  console.log(`Smoke test → ${BASE}\n`);

  let ok = true;

  ok =
    (await check("GET /health", async () => {
      const j = await getJson("/health");
      if (!j.ok) throw new Error("ok !== true");
      if (!("updated_at" in j)) throw new Error("missing updated_at");
      if (!("payload_version" in j)) throw new Error("missing payload_version");
    })) && ok;

  ok =
    (await check("GET /api/display-sync", async () => {
      const j = await getJson("/api/display-sync");
      if (typeof j.ok !== "boolean") throw new Error("missing ok field");
    })) && ok;

  ok =
    (await check("GET / (homepage)", async () => {
      const html = await getHtml("/");
      if (!/SniperHunterz/i.test(html)) throw new Error("expected SniperHunterz in HTML");
      if (!/<html/i.test(html)) throw new Error("expected HTML document");
    })) && ok;

  ok =
    (await check("GET /top-coins (SPA)", async () => {
      const html = await getHtml("/top-coins");
      if (!/SniperHunterz/i.test(html)) throw new Error("expected SniperHunterz in HTML");
    })) && ok;

  console.log(ok ? "\nSmoke PASS" : "\nSmoke FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
