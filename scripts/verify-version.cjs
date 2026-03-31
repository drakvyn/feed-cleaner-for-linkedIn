const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mv3 = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const mv2 = JSON.parse(
  fs.readFileSync(path.join(root, "manifest-firefox-v2.json"), "utf8")
);

const v = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(v)) {
  console.error(`package.json version must be semver MAJOR.MINOR.PATCH, got: ${v}`);
  process.exit(1);
}
if (mv3.version !== v) {
  console.error(`manifest.json version "${mv3.version}" !== package.json "${v}"`);
  process.exit(1);
}
if (mv2.version !== v) {
  console.error(
    `manifest-firefox-v2.json version "${mv2.version}" !== package.json "${v}"`
  );
  process.exit(1);
}
console.log(`Versions aligned: ${v}`);
