"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "public", "accounts.js");
const UPSTREAM = "https://raw.githubusercontent.com/hafidznoor/idn-finlogos/main/Sources/IdnFinLogos/Icons";
const CONCURRENCY = 12;

function readCatalog(source, name) {
  const match = source.match(new RegExp("const " + name + " = (\\[[\\s\\S]*?\\]);"));
  if (!match) throw new Error("Provider catalog not found: " + name);
  const entries = JSON.parse(match[1]);
  if (!Array.isArray(entries)) throw new Error("Provider catalog is invalid: " + name);
  return entries;
}

async function downloadLogo(entry) {
  const { folder, slug } = entry;
  const destination = path.join(ROOT, "public", "image", folder, slug + ".svg");
  await fs.mkdir(path.dirname(destination), { recursive: true });

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(UPSTREAM + "/" + encodeURIComponent(slug) + ".svg", {
        headers: { "User-Agent": "GreyFinance-logo-sync" },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error("Logo not found (" + response.status + ")");
        throw new Error("Logo request failed (" + response.status + ")");
      }
      const svg = await response.text();
      if (!svg.trimStart().startsWith("<svg") || !svg.includes("</svg>")) {
        throw new Error("Invalid SVG response");
      }
      await fs.writeFile(destination, svg, "utf8");
      return { ok: true, slug, folder };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  return { ok: false, slug, folder, error: String(lastError && lastError.message || lastError) };
}

async function main() {
  const source = await fs.readFile(SOURCE_FILE, "utf8");
  const entries = [
    ...readCatalog(source, "WALLETS").map(item => ({ folder: "Ewallet", slug: item.slug })),
    ...readCatalog(source, "BANKS").map(item => ({ folder: "Bank", slug: item.slug }))
  ];

  let next = 0;
  let completed = 0;
  const failures = [];
  async function worker() {
    while (next < entries.length) {
      const entry = entries[next++];
      const result = await downloadLogo(entry);
      if (result.ok) completed++;
      else failures.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
  console.log("[Grey Finance] Local provider logos: " + completed + "/" + entries.length + " downloaded.");
  if (failures.length) {
    console.warn("[Grey Finance] Logo downloads skipped; local category fallbacks remain available:", failures.map(item => item.folder + "/" + item.slug + ": " + item.error).join("; "));
  }
}

main().catch(error => {
  console.warn("[Grey Finance] Logo sync could not run; local category fallbacks remain available:", error && error.message || error);
  process.exitCode = 0;
});
