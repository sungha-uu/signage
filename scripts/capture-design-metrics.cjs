"use strict";

const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.commandLine.appendSwitch("force-device-scale-factor", "1");

const projectRoot = path.resolve(__dirname, "..");
const designRoot = path.join(projectRoot, "design");
const baseUrl = process.env.DESIGN_METRICS_URL || "http://127.0.0.1:4173";

function writeJson(name, value) {
  fs.mkdirSync(designRoot, { recursive: true });
  fs.writeFileSync(path.join(designRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function makeWindow(width, height, url) {
  const win = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    frame: false,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  await win.loadURL(url);
  await new Promise((resolve) => setTimeout(resolve, 800));
  return win;
}

const browserProbe = `(() => {
  const round = (value) => Number(Number(value).toFixed(3));
  const rect = (element) => {
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height), right: round(box.right), bottom: round(box.bottom) };
  };
  const style = (element) => {
    if (!element) return null;
    const css = getComputedStyle(element);
    return {
      display: css.display,
      position: css.position,
      gridTemplateColumns: css.gridTemplateColumns,
      gridTemplateRows: css.gridTemplateRows,
      gap: css.gap,
      columnGap: css.columnGap,
      rowGap: css.rowGap,
      padding: css.padding,
      margin: css.margin,
      border: css.border,
      borderRadius: css.borderRadius,
      backgroundColor: css.backgroundColor,
      backgroundImage: css.backgroundImage,
      boxShadow: css.boxShadow,
      color: css.color,
      fontFamily: css.fontFamily,
      fontSize: css.fontSize,
      fontWeight: css.fontWeight,
      lineHeight: css.lineHeight,
      letterSpacing: css.letterSpacing,
      textAlign: css.textAlign,
      transform: css.transform,
      objectFit: css.objectFit,
      objectPosition: css.objectPosition
    };
  };
  const item = (element) => ({ rect: rect(element), style: style(element) });
  const all = (selector) => [...document.querySelectorAll(selector)].map((element) => ({
    text: element.textContent.trim().replace(/\\s+/g, ' '),
    ...item(element)
  }));
  return { rect, style, item, all };
})()`;

async function captureTv(win) {
  return win.webContents.executeJavaScript(`(() => {
    const p = ${browserProbe};
    const rootStyle = getComputedStyle(document.documentElement);
    const variables = {};
    ['--coral','--coral-deep','--coral-soft','--menu-card-yellow','--menu-card-line','--combo-card-line','--price-red','--combo-price-red','--ink','--muted','--cream','--line','--blue','--menu-card-shadow','--combo-card-shadow','--shadow','--main-font'].forEach(name => variables[name] = rootStyle.getPropertyValue(name).trim());
    const collect = () => {
      const active = document.querySelector('.screen.is-active');
      return {
        screen: active.dataset.screen,
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        variables,
        screenBox: p.item(active),
        board: p.item(active.querySelector('.board')),
        footer: p.item(active.querySelector('.screen-footer')),
        feature: p.item(active.querySelector('.static-feature, .video-menu__hero')),
        photoRow: p.item(active.querySelector('.static-photo-row')),
        gallery: p.item(active.querySelector('.static-gallery-card')),
        galleryFigures: p.all('.screen.is-active .static-gallery-card figure'),
        menuRow: p.item(active.querySelector('.static-menu-row')),
        videoMenu: p.item(active.querySelector('.video-menu')),
        videoGroups: p.item(active.querySelector('.video-menu__groups')),
        videoStage: p.item(active.querySelector('.video-stage')),
        cards: [...active.querySelectorAll('.static-feature, .static-gallery-card, .dumpling-panel, .category, .video-menu__hero, .compact-group')].map(card => ({
          className: card.className,
          title: card.querySelector('h1,h2')?.textContent.trim().replace(/\\s+/g, ' ') || null,
          ...p.item(card)
        })),
        cardHeaders: [...active.querySelectorAll('.dumpling-panel__header, .category__header, .compact-group header')].map(header => ({
          text: header.textContent.trim().replace(/\s+/g, ' '),
          ...p.item(header),
          titleStyle: p.style(header.querySelector('h2')),
          iconStyle: p.style(header.querySelector('.category-icon')),
          choiceStyle: p.style(header.querySelector('.category-choice')),
          subtitleStyle: p.style(header.querySelector('p, header > span'))
        })),
        menuRows: [...active.querySelectorAll('.menu-row')].map(row => ({
          name: row.querySelector('.menu-row__name')?.textContent.trim(),
          price: row.querySelector('.menu-row__price')?.textContent.trim(),
          description: row.querySelector('.menu-row__description')?.textContent.trim() || null,
          badge: row.querySelector('.badge')?.textContent.trim() || null,
          row: p.item(row),
          nameStyle: p.style(row.querySelector('.menu-row__name')),
          priceStyle: p.style(row.querySelector('.menu-row__price')),
          descriptionStyle: p.style(row.querySelector('.menu-row__description')),
          badgeStyle: p.style(row.querySelector('.badge')),
          leaderStyle: p.style(row.querySelector('.menu-row__leader'))
        })),
        comboBadge: p.item(active.querySelector('.combo-badge-wrap')),
        crown: p.item(active.querySelector('.combo-badge-crown')),
        logo: p.item(active.querySelector('.screen-footer__logo img')),
        controls: p.item(document.querySelector('.controls'))
      };
    };
    return collect();
  })()`);
}

async function captureKoreanA4(win) {
  return win.webContents.executeJavaScript(`(() => {
    const p = ${browserProbe};
    const frame = document.querySelector('#tv-menu-frame');
    const doc = frame.contentDocument;
    const active = doc.querySelector('.screen.is-active');
    const fp = (() => {
      const round = value => Number(Number(value).toFixed(3));
      const rect = element => { const box = element.getBoundingClientRect(); return { x:round(box.x), y:round(box.y), width:round(box.width), height:round(box.height), right:round(box.right), bottom:round(box.bottom) }; };
      const style = element => { const css = doc.defaultView.getComputedStyle(element); return { padding:css.padding, border:css.border, borderRadius:css.borderRadius, backgroundColor:css.backgroundColor, boxShadow:css.boxShadow, fontFamily:css.fontFamily, fontSize:css.fontSize, fontWeight:css.fontWeight, lineHeight:css.lineHeight, letterSpacing:css.letterSpacing, gridTemplateColumns:css.gridTemplateColumns, gridTemplateRows:css.gridTemplateRows, gap:css.gap }; };
      return { rect, style };
    })();
    return {
      output: { width: innerWidth, height: innerHeight, devicePixelRatio },
      paper: p.item(document.querySelector('.a4-page')),
      wrap: p.item(document.querySelector('.tv-menu-wrap')),
      frame: p.item(frame),
      frameTransform: getComputedStyle(frame).transform,
      innerViewport: { width: doc.defaultView.innerWidth, height: doc.defaultView.innerHeight, devicePixelRatio: doc.defaultView.devicePixelRatio },
      screen: { rect: fp.rect(active), style: fp.style(active) },
      board: { rect: fp.rect(active.querySelector('.board')), style: fp.style(active.querySelector('.board')) },
      cards: [...active.querySelectorAll('.static-feature, .static-gallery-card, .dumpling-panel, .category')].map(card => ({ className:card.className, title:card.querySelector('h1,h2')?.textContent.trim().replace(/\\s+/g,' ') || null, rect:fp.rect(card), style:fp.style(card) })),
      rows: [...active.querySelectorAll('.menu-row')].map(row => ({ name:row.querySelector('.menu-row__name').textContent.trim(), rect:fp.rect(row), nameStyle:fp.style(row.querySelector('.menu-row__name')), priceStyle:fp.style(row.querySelector('.menu-row__price')), descriptionStyle:row.querySelector('.menu-row__description') ? fp.style(row.querySelector('.menu-row__description')) : null }))
    };
  })()`);
}

async function captureForeignA4(win) {
  return win.webContents.executeJavaScript(`(() => {
    const p = ${browserProbe};
    const rootStyle = getComputedStyle(document.documentElement);
    const variables = {};
    ['--coral','--coral-deep','--ink','--muted','--paper','--card','--line'].forEach(name => variables[name] = rootStyle.getPropertyValue(name).trim());
    return {
      viewport: { width:innerWidth, height:innerHeight, devicePixelRatio },
      variables,
      poster:p.item(document.querySelector('.poster')),
      paper:p.item(document.querySelector('.paper')),
      header:p.item(document.querySelector('.poster-head')),
      columns:p.item(document.querySelector('.menu-columns')),
      leftColumn:p.item(document.querySelector('.menu-column--left')),
      rightColumn:p.item(document.querySelector('.menu-column--right')),
      items:[...document.querySelectorAll('.menu-item')].map(card => ({
        number:card.querySelector('.menu-number').textContent.trim(),
        korean:card.querySelector('.menu-ko').textContent.trim(),
        english:card.querySelector('h2').childNodes[0].textContent.trim(),
        chinese:card.querySelector('[lang="zh"]').childNodes[0].textContent.trim(),
        card:p.item(card),
        image:p.item(card.querySelector('img')),
        copy:p.item(card.querySelector('.menu-copy')),
        numberStyle:p.style(card.querySelector('.menu-number')),
        koreanStyle:p.style(card.querySelector('.menu-ko')),
        englishStyle:p.style(card.querySelector('h2')),
        chineseStyle:p.style(card.querySelector('[lang="zh"]')),
        priceStyle:p.style(card.querySelector('.menu-price')),
        priceText:card.querySelector('.menu-price').textContent.trim().replace(/\\s+/g,' ')
      })),
      orderNote:p.item(document.querySelector('.order-note')),
      smile:p.item(document.querySelector('.order-note__smile'))
    };
  })()`);
}

app.whenReady().then(async () => {
  const tv = await makeWindow(1920, 1080, `${baseUrl}/board.html?v=20260809-86`);
  const page1 = await captureTv(tv);
  await tv.webContents.executeJavaScript("document.querySelector('#next-screen').click()");
  await new Promise((resolve) => setTimeout(resolve, 350));
  const page2 = await captureTv(tv);
  writeJson("TV_MENU_METRICS_V1.json", { capturedAt: new Date().toISOString(), referenceViewport: "1920x1080 CSS px", page1, page2 });
  const a4Ko = await makeWindow(1920, 1080, `${baseUrl}/print/a4.html?edition=ko`);
  writeJson("A4_KOREAN_MENU_METRICS_V1.json", { capturedAt: new Date().toISOString(), referenceOutput: "3508x2480 px @ 300 dpi", data: await captureKoreanA4(a4Ko) });

  const a4Foreign = await makeWindow(1920, 1080, `${baseUrl}/print/foreign-a4.html`);
  writeJson("A4_FOREIGN_MENU_METRICS_V1.json", { capturedAt: new Date().toISOString(), referenceOutput: "3508x2480 px @ 300 dpi", data: await captureForeignA4(a4Foreign) });
  tv.destroy();
  a4Ko.destroy();
  a4Foreign.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
