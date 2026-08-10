"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const packageJson = require("../package.json");
const menuVersion = require("../menu-version.json");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const portableName = `Sexy-Kkunmandu-MenuBoard-${packageJson.version}.exe`;
const portablePath = path.join(distRoot, portableName);

function emptyDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  for (const entry of fs.readdirSync(directory)) {
    fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
  }
}

function localReleaseStamp(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}_${hh}${min}${sec}`;
}

const releaseStamp = process.env.RELEASE_STAMP || localReleaseStamp();
if (!/^\d{6}_\d{6}$/.test(releaseStamp)) {
  throw new Error(`Invalid RELEASE_STAMP format: ${releaseStamp}`);
}

const versionTag = menuVersion.versionTag;
if (!/^v\d+(?:\.\d+){0,2}$/.test(versionTag)) {
  throw new Error(`Invalid version tag: ${versionTag}`);
}

const releaseName = `release_${releaseStamp}_${versionTag}`;
const releaseRoot = path.join(distRoot, releaseName);
const zipPath = path.join(distRoot, `${releaseName}.zip`);
const releaseExeName = `섹시한 꾼만두 TV 메뉴판 ${versionTag}.exe`;

if (!fs.existsSync(portablePath)) {
  throw new Error(`Built EXE not found: ${portablePath}`);
}

if (!releaseRoot.startsWith(distRoot + path.sep) || !zipPath.startsWith(distRoot + path.sep)) {
  throw new Error("Unsafe release path.");
}

emptyDirectory(releaseRoot);
fs.rmSync(zipPath, { force: true });
fs.copyFileSync(portablePath, path.join(releaseRoot, releaseExeName));

const psLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const zipCommand = `Compress-Archive -LiteralPath ${psLiteral(releaseRoot)} -DestinationPath ${psLiteral(zipPath)} -CompressionLevel Optimal -Force`;
const zipResult = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", zipCommand], {
  cwd: distRoot,
  encoding: "utf8"
});

if (zipResult.status !== 0 || !fs.existsSync(zipPath)) {
  throw new Error(`ZIP creation failed.\n${zipResult.stderr || zipResult.stdout}`);
}

console.log(`Release directory: ${releaseRoot}`);
console.log(`Release ZIP: ${zipPath}`);
