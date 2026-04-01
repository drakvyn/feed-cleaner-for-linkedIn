#!/usr/bin/env node
/**
 * Chrome Web Store: ZIP with MV3 runtime files.
 * Also writes web-ext-artifacts/chrome-unpacked/ — use that folder for
 * Chrome → “Load unpacked” (not the zip, not web-ext-artifacts alone).
 * Requires the `zip` CLI (Linux, macOS, or Git Bash on Windows).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outDir = path.join(root, "web-ext-artifacts");
const zipName = `linkedin-hide-ai-chrome-${pkg.version}.zip`;
const zipPath = path.join(outDir, zipName);

const files = [
  "manifest.json",
  "content.js",
  "content.css",
  "popup.html",
  "popup.css",
  "popup.js",
  "icon.png",
];

for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${f}`);
    process.exit(1);
  }
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const relZip = path.relative(root, zipPath);
try {
  execFileSync("zip", ["-q", "-r", relZip, ...files], { cwd: root, stdio: "inherit" });
} catch (e) {
  console.error(
    "Could not run `zip`. Install it (e.g. zip package) or on Windows use Git Bash / WSL."
  );
  process.exit(1);
}

const unpackedDir = path.join(outDir, "chrome-unpacked");
fs.mkdirSync(unpackedDir, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(root, f), path.join(unpackedDir, f));
}

console.log(`Chrome ZIP (Web Store upload): ${zipPath}`);
console.log(`Chrome “Load unpacked” → select this folder: ${unpackedDir}`);
