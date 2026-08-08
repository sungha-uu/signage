"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const builtExe = path.join(dist, "Sexy-Kkunmandu-MenuBoard-1.0.0.exe");

function stamp(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}_${hh}${mi}${ss}`;
}

function ensureInsideDist(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(`${dist}${path.sep}`)) throw new Error(`배포 경로가 dist 밖입니다: ${resolved}`);
  return resolved;
}

function recreate(directory) {
  ensureInsideDist(directory);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function copy(source, destination) {
  if (!fs.existsSync(source)) throw new Error(`필수 파일이 없습니다: ${source}`);
  fs.copyFileSync(source, destination);
}

const releaseStamp = process.env.RELEASE_STAMP || stamp();
if (!/^\d{6}_\d{6}$/.test(releaseStamp)) {
  throw new Error(`RELEASE_STAMP는 YYMMDD_HHMMSS 형식이어야 합니다: ${releaseStamp}`);
}
if (!fs.existsSync(builtExe)) throw new Error(`빌드된 EXE가 없습니다: ${builtExe}`);

const tvName = `release_${releaseStamp}`;
const a4Name = `release_A4_${releaseStamp}_v1`;
const tvDir = ensureInsideDist(path.join(dist, tvName));
const a4Dir = ensureInsideDist(path.join(dist, a4Name));
const tvZip = ensureInsideDist(path.join(dist, `${tvName}.zip`));

recreate(tvDir);
recreate(a4Dir);
fs.rmSync(tvZip, { force: true });

copy(builtExe, path.join(tvDir, "섹시한 꾼만두 TV 메뉴판 v1.exe"));

const a4Source = path.join(root, "release", "v1", "A4");
copy(path.join(a4Source, "A4_메뉴판_한국어_v1.png"), path.join(a4Dir, "A4_메뉴판_한국어_v1.png"));
copy(path.join(a4Source, "A4_메뉴판_외국어_v1.png"), path.join(a4Dir, "A4_메뉴판_외국어_v1.png"));
copy(path.join(root, "design", "A4_KOREAN_MENU_DESIGN_V1.md"), path.join(a4Dir, "A4_KOREAN_MENU_DESIGN_V1.md"));
copy(path.join(root, "design", "A4_FOREIGN_MENU_DESIGN_V1.md"), path.join(a4Dir, "A4_FOREIGN_MENU_DESIGN_V1.md"));

fs.writeFileSync(path.join(a4Dir, "배포정보.txt"), [
  "섹시한 꾼만두 A4 메뉴판 V1",
  `패키지: ${a4Name}`,
  "한국어: A4_메뉴판_한국어_v1.png",
  "외국어: A4_메뉴판_외국어_v1.png",
  "규격: 3508×2480px, 300dpi, A4 가로",
  ""
].join("\r\n"), "utf8");

const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const command = `Compress-Archive -LiteralPath ${literal(tvDir)} -DestinationPath ${literal(tvZip)} -CompressionLevel Optimal -Force`;
const zipped = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8" });
if (zipped.status !== 0 || !fs.existsSync(tvZip)) {
  throw new Error(`TV ZIP 생성 실패\n${zipped.stderr || zipped.stdout}`);
}

const tvFiles = fs.readdirSync(tvDir);
if (tvFiles.length !== 1 || path.extname(tvFiles[0]).toLowerCase() !== ".exe") {
  throw new Error(`TV 배포 폴더에는 EXE 하나만 있어야 합니다: ${tvFiles.join(", ")}`);
}

const result = { version: "v1", releaseStamp, tvDir, tvZip, a4Dir };
fs.writeFileSync(path.join(dist, `release_manifest_${releaseStamp}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
