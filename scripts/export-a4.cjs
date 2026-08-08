const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const WIDTH = 3508;
const HEIGHT = 2480;
const projectRoot = path.resolve(__dirname, "..");
const requestedEdition = process.argv.includes("--ko-only") ? "ko" : "all";
const isVersion1Preview = process.argv.includes("--version-1-preview");
const foreignV1Only = process.argv.includes("--foreign-v1-only");
const outputDir = isVersion1Preview
  ? path.join(projectRoot, "dist", "version_1_preview")
  : path.join(projectRoot, "dist", "A4_메뉴판");
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function findEdge() {
  const edge = edgeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!edge) throw new Error("Microsoft Edge was not found. Install Edge to export A4 PNG files.");
  return edge;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function pngDimensions(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("The exported file is not a PNG.");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function add300DpiMetadata(filePath) {
  const png = fs.readFileSync(filePath);
  const type = Buffer.from("pHYs");
  const data = Buffer.alloc(9);
  data.writeUInt32BE(11811, 0);
  data.writeUInt32BE(11811, 4);
  data.writeUInt8(1, 8);
  const chunk = Buffer.alloc(4 + type.length + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  type.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 17);

  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  fs.writeFileSync(filePath, Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]));
}

async function waitForScreenshot(filePath) {
  let previousSize = -1;
  let stableChecks = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      stableChecks = size > 0 && size === previousSize ? stableChecks + 1 : 0;
      previousSize = size;
      if (stableChecks >= 3) return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out while exporting ${filePath}`);
}

async function captureEdition(edge, edition, fileName) {
  const outputPath = path.join(outputDir, fileName);
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  const pageFile = edition === "foreign-v1" ? "foreign-a4.html" : "a4.html";
  const pageUrl = new URL(pathToFileURL(path.join(projectRoot, "print", pageFile)));
  if (edition !== "foreign-v1") pageUrl.searchParams.set("edition", edition);
  const profile = path.join(os.tmpdir(), `kkunmandu-a4-${edition}-${Date.now()}`);
  fs.mkdirSync(profile, { recursive: true });

  const child = spawn(edge, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--force-device-scale-factor=1",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    `--screenshot=${outputPath}`,
    pageUrl.href
  ], { stdio: "ignore", windowsHide: true });
  child.unref();

  await waitForScreenshot(outputPath);
  const dimensions = pngDimensions(fs.readFileSync(outputPath));
  if (dimensions.width !== WIDTH || dimensions.height !== HEIGHT) {
    throw new Error(`Unexpected PNG size for ${edition}: ${dimensions.width}x${dimensions.height}`);
  }
  add300DpiMetadata(outputPath);
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const edge = findEdge();
  if (foreignV1Only) {
    await captureEdition(edge, "foreign-v1", "A4_메뉴판_외국어_v1_검토용.png");
    console.log(`A4 PNG files exported to: ${outputDir}`);
    return;
  }
  const koreanFileName = isVersion1Preview
    ? "A4_메뉴판_한국어_v1_검토용.png"
    : "A4_메뉴판_한글.png";
  await captureEdition(edge, "ko", koreanFileName);
  if (requestedEdition === "all") {
    await captureEdition(edge, "intl", "A4_메뉴판_영문_중문.png");
  }
  console.log(`A4 PNG files exported to: ${outputDir}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
