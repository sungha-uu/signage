"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const portableName = "Sexy-Kkunmandu-MenuBoard-1.0.0.exe";
const portablePath = path.join(distRoot, portableName);

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, destinationPath);
  }
}

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
  return `${yy}${mm}${dd}_${hh}${min}`;
}

const releaseStamp = process.env.RELEASE_STAMP || localReleaseStamp();
if (!/^\d{6}_\d{4}$/.test(releaseStamp)) {
  throw new Error(`잘못된 RELEASE_STAMP 형식입니다: ${releaseStamp}`);
}

const releaseName = `release_${releaseStamp}`;
const releaseRoot = path.join(distRoot, releaseName);
const zipPath = path.join(distRoot, `${releaseName}.zip`);

if (!fs.existsSync(portablePath)) {
  throw new Error(`휴대용 EXE를 찾을 수 없습니다: ${portablePath}`);
}

if (!releaseRoot.startsWith(distRoot + path.sep) || !zipPath.startsWith(distRoot + path.sep)) {
  throw new Error("안전하지 않은 배포 경로입니다.");
}

emptyDirectory(releaseRoot);
fs.rmSync(zipPath, { force: true });
fs.copyFileSync(portablePath, path.join(releaseRoot, "섹시한 꾼만두 메뉴판.exe"));
copyDirectory(path.join(projectRoot, "content"), path.join(releaseRoot, "content"));
fs.copyFileSync(path.join(projectRoot, "README.md"), path.join(releaseRoot, "README.md"));
fs.copyFileSync(path.join(projectRoot, "menu_design.md"), path.join(releaseRoot, "menu_design.md"));
fs.copyFileSync(path.join(projectRoot, "EXE_사용법.md"), path.join(releaseRoot, "EXE_사용법.md"));

fs.writeFileSync(
  path.join(releaseRoot, "배포정보.txt"),
  [
    `배포 폴더: ${releaseName}`,
    `제작 시각: ${new Date().toLocaleString("ko-KR")}`,
    "실행 파일: 섹시한 꾼만두 메뉴판.exe",
    "구성: 일반 버전 + 페이지 전환 애니메이션",
    "순환: 1페이지 30초 → 2페이지 영상 → 영상 종료 후 1페이지",
    "여름 효과: 포함하지 않음",
    ""
  ].join("\r\n"),
  "utf8"
);

const psLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const zipCommand = `Compress-Archive -LiteralPath ${psLiteral(releaseRoot)} -DestinationPath ${psLiteral(zipPath)} -CompressionLevel Optimal -Force`;
const zipResult = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", zipCommand], {
  cwd: distRoot,
  encoding: "utf8"
});

if (zipResult.status !== 0 || !fs.existsSync(zipPath)) {
  throw new Error(`ZIP 생성에 실패했습니다.\n${zipResult.stderr || zipResult.stdout}`);
}

console.log(`배포 폴더 생성 완료: ${releaseRoot}`);
console.log(`배포 ZIP 생성 완료: ${zipPath}`);
