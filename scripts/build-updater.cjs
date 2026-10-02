"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist", "updater");
const work = path.join(root, "dist", ".updater-build");
const entry = path.join(root, "updater", "signage_updater.py");

fs.mkdirSync(output, { recursive: true });
fs.rmSync(work, { recursive: true, force: true });

const python = process.env.PYTHON || "python";
const args = [
  "-m",
  "PyInstaller",
  "--noconfirm",
  "--clean",
  "--onefile",
  "--noconsole",
  "--name",
  "SignageUpdater",
  "--distpath",
  output,
  "--workpath",
  work,
  "--specpath",
  work,
  entry
];

const result = spawnSync(python, args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

const artifact = path.join(output, "SignageUpdater.exe");
if (!fs.existsSync(artifact)) throw new Error(`Updater artifact not found: ${artifact}`);
console.log(`Updater EXE: ${artifact}`);
