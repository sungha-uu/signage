"use strict";

const { app, BrowserWindow, powerSaveBlocker } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const isSmokeTest = process.argv.includes("--smoke-test");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-pinch");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

function portableDirectory() {
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function safeRelativePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const normalized = path.posix.normalize(pathname).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "index.html";
  if (normalized.startsWith("../") || normalized.includes("/../")) return null;
  return normalized;
}

function resolveAsset(relativePath) {
  const appRoot = app.getAppPath();
  const externalContentRoot = path.join(portableDirectory(), "content");

  if (relativePath.startsWith("content/")) {
    const externalCandidate = path.join(externalContentRoot, relativePath.slice("content/".length));
    if (isFile(externalCandidate)) return externalCandidate;
  }

  const bundledCandidate = path.join(appRoot, relativePath);
  return isFile(bundledCandidate) ? bundledCandidate : null;
}

function streamFile(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    if (start > end || end >= stat.size) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }

    res.writeHead(206, {
      ...commonHeaders,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...commonHeaders, "Content-Length": stat.size });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(filePath).pipe(res);
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.writeHead(405, { Allow: "GET, HEAD" });
          res.end("Method Not Allowed");
          return;
        }

        const relativePath = safeRelativePath(req.url || "/");
        const filePath = relativePath ? resolveAsset(relativePath) : null;
        if (!filePath) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("파일을 찾을 수 없습니다.");
          return;
        }
        streamFile(req, res, filePath);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`메뉴판 파일을 읽지 못했습니다.\n${error.message}`);
      }
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function inspectSignage(window) {
  return window.webContents.executeJavaScript(`(() => {
    const frame = document.querySelector("iframe");
    const doc = frame && frame.contentDocument;
    const video = doc && doc.querySelector("#menu-video");
    const active = doc && doc.querySelector(".screen.is-active");
    const controls = doc && doc.querySelector(".controls");
    return {
      ready: Boolean(doc && video && active),
      activeScreen: active ? active.dataset.screen : null,
      videoPaused: video ? video.paused : null,
      videoCurrentTime: video ? video.currentTime : null,
      videoControls: video ? video.controls : null,
      controlsHidden: controls ? controls.hidden : null
    };
  })()`);
}

async function runSmokeTest(window) {
  const resultPath = process.env.MENU_BOARD_SMOKE_RESULT || path.join(app.getPath("temp"), "menu-board-smoke.json");
  const result = { ok: false, beforeEnded: null, afterEnded: null, error: null };

  try {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await sleep(250);
      result.beforeEnded = await inspectSignage(window);
      if (result.beforeEnded.ready && result.beforeEnded.activeScreen === "1") break;
    }

    await window.webContents.executeJavaScript(`(() => {
      const video = document.querySelector("iframe").contentDocument.querySelector("#menu-video");
      video.dispatchEvent(new Event("ended"));
    })()`);
    await sleep(250);
    result.afterEnded = await inspectSignage(window);

    result.ok = Boolean(
      result.beforeEnded?.ready &&
      result.beforeEnded.activeScreen === "1" &&
      result.beforeEnded.videoPaused === false &&
      result.beforeEnded.videoControls === false &&
      result.beforeEnded.controlsHidden === true &&
      result.afterEnded?.activeScreen === "0"
    );
  } catch (error) {
    result.error = error.stack || error.message;
  }

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
  app.exit(result.ok ? 0 : 2);
}

let mainWindow = null;
let localServer = null;

async function createWindow() {
  localServer = await startLocalServer();
  const address = localServer.address();
  const query = isSmokeTest ? "?mode=signage&test=1" : "?mode=signage";
  const startUrl = `http://127.0.0.1:${address.port}/index.html${query}`;

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    fullscreen: !isSmokeTest,
    kiosk: !isSmokeTest,
    autoHideMenuBar: true,
    backgroundColor: "#ed553b",
    webPreferences: {
      autoplayPolicy: "no-user-gesture-required",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith(`http://127.0.0.1:${address.port}/`)) event.preventDefault();
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.key.toLowerCase() === "q") app.quit();
    if (input.key === "F11") {
      event.preventDefault();
      const nextState = !mainWindow.isKiosk();
      mainWindow.setKiosk(nextState);
      mainWindow.setFullScreen(nextState);
    }
  });

  if (isSmokeTest) {
    mainWindow.webContents.once("did-finish-load", () => runSmokeTest(mainWindow));
  } else {
    mainWindow.once("ready-to-show", async () => {
      await sleep(250);
      mainWindow.show();
      mainWindow.focus();
    });
  }

  await mainWindow.loadURL(startUrl);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    if (!isSmokeTest) powerSaveBlocker.start("prevent-display-sleep");
    await createWindow();
  });
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (localServer) localServer.close();
});

