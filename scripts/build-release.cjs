"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const releaseRoot = path.join(distRoot, "release");
const portableName = "Sexy-Kkunmandu-MenuBoard-1.0.0.exe";
const portablePath = path.join(distRoot, portableName);

if (!fs.existsSync(portablePath)) {
  throw new Error(`휴대용 EXE를 찾을 수 없습니다: ${portablePath}`);
}

if (!releaseRoot.startsWith(distRoot + path.sep)) {
  throw new Error("안전하지 않은 배포 경로입니다.");
}

fs.rmSync(releaseRoot, { recursive: true, force: true });
fs.mkdirSync(releaseRoot, { recursive: true });
fs.copyFileSync(portablePath, path.join(releaseRoot, "섹시한 꾼만두 메뉴판.exe"));
fs.copyFileSync(portablePath, path.join(releaseRoot, "섹시한 꾼만두 메뉴판 - 여름 애니메이션.exe"));
fs.cpSync(path.join(projectRoot, "content"), path.join(releaseRoot, "content"), { recursive: true });
fs.copyFileSync(path.join(projectRoot, "README.md"), path.join(releaseRoot, "README.md"));
fs.copyFileSync(path.join(projectRoot, "menu_design.md"), path.join(releaseRoot, "menu_design.md"));
fs.copyFileSync(path.join(projectRoot, "EXE_사용법.md"), path.join(releaseRoot, "EXE_사용법.md"));

console.log(`배포 폴더 생성 완료: ${releaseRoot}`);
