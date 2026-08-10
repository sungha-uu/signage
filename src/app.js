(function () {
  "use strict";

  const data = window.MENU_BOARD_DATA;
  const app = document.querySelector("#app");
  const controls = document.querySelector(".controls");
  const dots = document.querySelector("#screen-dots");
  const previousButton = document.querySelector("#previous-screen");
  const nextButton = document.querySelector("#next-screen");
  const fullscreenButton = document.querySelector("#fullscreen");

  let activeScreen = 0;
  let screenTimer = null;

  const labels = data.labels || {};
  const menuPrice = (price) => Number(price).toLocaleString("ko-KR");
  const comboPrice = (price) => `<span class="combo-currency">₩</span>${Number(price).toLocaleString("ko-KR")}`;
  const visibleItems = (category) => category.items.filter((item) => item.visible !== false);
  const searchParams = new URLSearchParams(window.location.search);
  const signageMode = searchParams.get("mode") === "signage";
  const testMode = searchParams.get("test") === "1";
  const effectsMode = searchParams.get("effects");
  const previewPalette = searchParams.get("palette");
  const previewPalettes = {
    "golden-butter": ["#ffe699", "#ffd966", "#fff2e7"],
    "warm-butter": ["rgba(255, 220, 105, .22)", "#eadfbd", "#fff0eb"],
    champagne: ["rgba(194, 156, 96, .16)", "#e5d5bb", "#fff2e7"],
    peach: ["rgba(240, 150, 112, .14)", "#edd2c5", "#ffebe3"],
    sage: ["rgba(164, 178, 116, .18)", "#d7ddbf", "#fff0e9"]
  };
  if (previewPalettes[previewPalette]) {
    const [card, line, set] = previewPalettes[previewPalette];
    document.documentElement.style.setProperty("--menu-card-yellow", card);
    document.documentElement.style.setProperty("--menu-card-line", line);
    document.documentElement.style.setProperty("--coral-soft", set);
  }
  if (effectsMode === "summer") {
    document.body.dataset.effects = "summer";
    document.body.classList.add("effects-summer");
  }
  const behavior = signageMode ? { ...data.settings, ...data.settings.signageMode } : data.settings;
  const staticDurationSeconds = testMode ? 1 : data.settings.staticDurationSeconds;
  const requestedScreen = Number(searchParams.get("screen"));
  const initialScreen = Number.isInteger(requestedScreen) && requestedScreen >= 0 && requestedScreen <= 1
    ? requestedScreen
    : 0;

  document.body.classList.toggle("signage-mode", signageMode);

  function badge(text, variant = "coral") {
    if (!text) return "";
    return `<span class="badge badge--${variant}">${text}</span>`;
  }

  function comboBadge() {
    const crown = `<img class="combo-badge-crown" src="content/assets/images/crown-simple.svg?v=2" alt="" aria-hidden="true" />`;
    return `<span class="combo-badge-wrap">${crown}${badge("추천")}</span>`;
  }

  function categoryIcon(category) {
    if (category.iconImage) {
      return `<span class="category-icon category-icon--brand" aria-hidden="true"><img src="${category.iconImage}" alt="" /></span>`;
    }
    return `<span class="category-icon" aria-hidden="true">${category.icon}</span>`;
  }

  function categoryHeading(category) {
    return `${categoryIcon(category)}${category.title}`;
  }

  function categoryChoice(category) {
    if (category.id !== "mandu") return "";
    return `<small class="category-choice">${labels.manduChoice || "꾼만두/찐만두 선택"}</small>`;
  }

  function menuRow(item, dense = false) {
    return `
      <li class="menu-row ${item.accent ? "menu-row--accent" : ""} ${dense ? "menu-row--dense" : ""}">
        <div class="menu-row__copy">
          <div class="menu-row__title-line">
            ${item.badge ? badge(item.badge, item.badgeVariant || (item.badge.includes("여름") ? "blue" : "coral")) : ""}
            <strong class="menu-row__name">${item.name}</strong>
          </div>
          ${item.description ? `<small class="menu-row__description">${item.description}</small>` : ""}
        </div>
        <span class="menu-row__leader" aria-hidden="true"></span>
        <strong class="menu-row__price">${menuPrice(item.price)}</strong>
      </li>`;
  }

  function categoryBlock(category, options = {}) {
    return `
      <section class="category ${options.featured ? "category--featured" : ""}">
        <header class="category__header">
          <h2>${categoryHeading(category)}</h2>
        </header>
        <ul class="menu-list">${visibleItems(category).map((item) => menuRow(item, options.dense)).join("")}</ul>
      </section>`;
  }

  function renderStaticScreen() {
    const [mandu, special, noodle] = data.categories;
    const [tangsuyukPhoto, noodlePhoto, fishcakePhoto] = data.gallery;
    const [heroMain, heroAccent] = data.hero.title.split(" + ");

    return `
      <section class="screen screen--static" data-screen="0" aria-label="전체 메뉴판">
        <div class="board board--static">
          <section class="static-photo-row" aria-label="대표 음식 사진">
            <div class="static-feature">
              <div class="static-feature__copy">
                ${comboBadge()}
                <p class="static-feature__kicker">${labels.bestMenu || "베스트 인기 메뉴"}</p>
                <h1><span>${heroMain}</span><em>+</em><span class="accent">${heroAccent}</span></h1>
                <p class="static-feature__price">${comboPrice(data.hero.price)}</p>
              </div>
              <div class="static-feature__image-wrap">
                <img src="${data.hero.image}" alt="${data.hero.imageAlt}" class="static-feature__image" />
              </div>
            </div>
            <section class="static-gallery-card">
              <figure class="static-photo static-photo--tangsuyuk"><img src="${tangsuyukPhoto.image}" alt="${tangsuyukPhoto.alt}" /></figure>
              <figure class="static-photo static-photo--fishcake"><img src="${fishcakePhoto.image}" alt="${fishcakePhoto.alt}" /></figure>
              <figure class="static-photo"><img src="${noodlePhoto.image}" alt="${noodlePhoto.alt}" /></figure>
            </section>
          </section>
          <section class="static-menu-row">
            <section class="dumpling-panel">
              <header class="dumpling-panel__header">
                <h2>${categoryHeading(mandu)}</h2>
                ${categoryChoice(mandu)}
              </header>
              <ul class="dumpling-grid">${visibleItems(mandu).map((item) => menuRow(item, true)).join("")}</ul>
            </section>
            ${categoryBlock(special, { dense: true })}
            ${categoryBlock(noodle, { dense: true })}
          </section>
        </div>
        <footer class="screen-footer">
          <span>${labels.staticFooterLeft || "매일 직접 빚는 수제만두 전문점"}</span>
          <div class="screen-footer__logo"><img src="${data.brand.logo}" alt="${data.brand.name}" /></div>
          <p>${labels.staticFooterRight || "맛있는 한 끼, 정성껏 준비했습니다."}</p>
        </footer>
      </section>`;
  }

  function renderVideoScreen() {
    const [mandu, special, noodle] = data.categories;
    const compactGroups = [mandu, special, noodle];
    const [heroMain, heroAccent] = data.hero.title.split(" + ");

    return `
      <section class="screen screen--video" data-screen="1" aria-label="메뉴와 영상">
        <div class="board board--video">
          <aside class="video-menu">
            <section class="video-menu__hero">
              <div class="video-menu__hero-copy">
                <span class="video-menu__eyebrow">BEST COMBO</span>
                ${comboBadge()}
                <h1><span>${heroMain} + </span><span class="accent">${heroAccent}</span></h1>
                <strong>${comboPrice(data.hero.price)}</strong>
              </div>
            </section>
            <div class="video-menu__groups">
              ${compactGroups.map((category) => `
                <section class="compact-group compact-group--${category.id}">
                  <header><h2>${categoryHeading(category)}</h2>${categoryChoice(category)}</header>
                  <ul>${visibleItems(category).map((item) => menuRow(item, true)).join("")}</ul>
                </section>`).join("")}
            </div>
          </aside>
          <section class="video-stage" aria-label="${data.video.title}">
            <video id="menu-video" playsinline preload="metadata" ${data.settings.videoMuted ? "muted" : ""} ${behavior.videoControls ? "controls" : ""} poster="${data.video.poster}">
              <source src="${data.video.src}" type="video/mp4" />
              사용 중인 브라우저에서 영상을 재생할 수 없습니다.
            </video>
            <div class="video-stage__label"><span class="pulse"></span>${data.video.title}</div>
            <button type="button" class="video-stage__sound" id="video-sound" aria-label="영상 소리 켜기">소리 켜기</button>
          </section>
        </div>
        <footer class="screen-footer">
          <span>FRESH & HANDMADE</span>
          <div class="screen-footer__logo"><img src="${data.brand.logo}" alt="${data.brand.name}" /></div>
          <p>매일 정성껏 빚고, 깨끗하게 튀깁니다.</p>
        </footer>
      </section>`;
  }

  function setActiveScreen(index, manual = false) {
    activeScreen = (index + 2) % 2;
    document.querySelectorAll(".screen").forEach((screen, screenIndex) => {
      screen.classList.toggle("is-active", screenIndex === activeScreen);
      screen.setAttribute("aria-hidden", screenIndex === activeScreen ? "false" : "true");
    });
    document.querySelectorAll(".screen-dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeScreen);
    });

    clearTimeout(screenTimer);
    const video = document.querySelector("#menu-video");

    if (activeScreen === 1) {
      video.currentTime = 0;
      if (behavior.videoAutoplay) {
        const playAttempt = video.play();
        if (playAttempt) playAttempt.catch(() => {});
      } else {
        video.pause();
      }
    } else {
      video.pause();
      video.currentTime = 0;
      if (behavior.autoRotate) {
        screenTimer = setTimeout(() => setActiveScreen(1), staticDurationSeconds * 1000);
      }
    }

    if (manual) {
      document.body.classList.add("controls-visible");
    }

    if (window.parent !== window) {
      window.parent.postMessage({ type: "menu-board-active-screen", screen: activeScreen }, window.location.origin);
    }
  }

  function initialize() {
    app.innerHTML = renderStaticScreen() + renderVideoScreen();
    dots.innerHTML = '<button class="screen-dot is-active" aria-label="1번 메뉴판"></button><button class="screen-dot" aria-label="2번 영상 메뉴판"></button>';
    controls.hidden = behavior.showControls === false;

    document.querySelectorAll(".screen-dot").forEach((dot, index) => dot.addEventListener("click", () => setActiveScreen(index, true)));
    previousButton.addEventListener("click", () => setActiveScreen(activeScreen - 1, true));
    nextButton.addEventListener("click", () => setActiveScreen(activeScreen + 1, true));
    document.querySelector("#menu-video").addEventListener("ended", () => {
      if (behavior.autoRotate) setActiveScreen(0);
    });
    document.querySelector("#video-sound").addEventListener("click", (event) => {
      const video = document.querySelector("#menu-video");
      video.muted = !video.muted;
      event.currentTarget.textContent = video.muted ? "소리 켜기" : "소리 끄기";
    });
    fullscreenButton.addEventListener("click", async () => {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") setActiveScreen(activeScreen + 1, true);
      if (event.key === "ArrowLeft") setActiveScreen(activeScreen - 1, true);
      if (event.key.toLowerCase() === "f") fullscreenButton.click();
    });
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "menu-board-set-screen") setActiveScreen(Number(event.data.screen), true);
    });
    setActiveScreen(initialScreen);
  }

  initialize();
})();
