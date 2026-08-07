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

  const won = (price) => `${Number(price).toLocaleString("ko-KR")}원`;
  const visibleItems = (category) => category.items.filter((item) => item.visible !== false);
  const searchParams = new URLSearchParams(window.location.search);
  const signageMode = searchParams.get("mode") === "signage";
  const testMode = searchParams.get("test") === "1";
  const behavior = signageMode ? { ...data.settings, ...data.settings.signageMode } : data.settings;
  const staticDurationSeconds = testMode ? 1 : data.settings.staticDurationSeconds;

  document.body.classList.toggle("signage-mode", signageMode);

  function badge(text, variant = "coral") {
    if (!text) return "";
    return `<span class="badge badge--${variant}">${text}</span>`;
  }

  function categoryIcon(category) {
    if (category.iconImage) {
      return `<span class="category-icon category-icon--brand" aria-hidden="true"><img src="${category.iconImage}" alt="" /></span>`;
    }
    return `<span class="category-icon" aria-hidden="true">${category.icon}</span>`;
  }

  function menuRow(item, dense = false) {
    return `
      <li class="menu-row ${item.accent ? "menu-row--accent" : ""} ${dense ? "menu-row--dense" : ""}">
        <div class="menu-row__copy">
          <div class="menu-row__title-line">
            ${item.badge ? badge(item.badge, item.badge.includes("여름") ? "blue" : "coral") : ""}
            <strong class="menu-row__name">${item.name}</strong>
          </div>
          ${item.description ? `<small class="menu-row__description">${item.description}</small>` : ""}
        </div>
        <span class="menu-row__leader" aria-hidden="true"></span>
        <strong class="menu-row__price">${won(item.price)}</strong>
      </li>`;
  }

  function categoryBlock(category, options = {}) {
    return `
      <section class="category ${options.featured ? "category--featured" : ""}">
        <header class="category__header">
          <div>
            <h2>${categoryIcon(category)}${category.title}</h2>
          </div>
          ${category.subtitle ? `<p class="category__subtitle">${category.subtitle}</p>` : ""}
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
          <section class="static-primary">
            <div class="static-feature">
              <div class="static-feature__copy">
                ${badge(data.hero.badge)}
                <p class="static-feature__kicker">베스트 인기 메뉴</p>
                <h1><span>${heroMain}</span><em>+</em><span class="accent">${heroAccent}</span></h1>
                <p class="static-feature__price">${won(data.hero.price)}</p>
              </div>
              <div class="static-feature__image-wrap">
                <img src="${data.hero.image}" alt="${data.hero.imageAlt}" class="static-feature__image" />
              </div>
            </div>
            <section class="dumpling-panel">
              <header class="dumpling-panel__header">
                <div><h2>${categoryIcon(mandu)}${mandu.title}</h2></div>
                <p>${mandu.subtitle}</p>
              </header>
              <ul class="dumpling-grid">${visibleItems(mandu).map((item) => menuRow(item, true)).join("")}</ul>
            </section>
          </section>
          <section class="static-secondary">
            <section class="static-photo-strip" aria-label="대표 음식 사진">
              <figure><img src="${tangsuyukPhoto.image}" alt="${tangsuyukPhoto.alt}" /></figure>
              <figure><img src="${fishcakePhoto.image}" alt="${fishcakePhoto.alt}" /></figure>
              <figure><img src="${noodlePhoto.image}" alt="${noodlePhoto.alt}" /></figure>
            </section>
            <div class="static-card-grid">
              ${categoryBlock(special, { dense: true })}
              ${categoryBlock(noodle, { dense: true })}
            </div>
          </section>
        </div>
        <footer class="screen-footer">
          <span>매일 직접 빚는 수제 만두 전문점</span>
          <div class="screen-footer__logo"><img src="${data.brand.logo}" alt="${data.brand.name}" /></div>
          <p>맛있는 한 끼, 정성껏 준비했습니다.</p>
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
                ${badge(data.hero.badge)}
                <h1><span>${heroMain} + </span><span class="accent">${heroAccent}</span></h1>
                <strong>${won(data.hero.price)}</strong>
              </div>
            </section>
            <div class="video-menu__groups">
              ${compactGroups.map((category) => `
                <section class="compact-group compact-group--${category.id}">
                  <header><h2>${categoryIcon(category)}${category.title}</h2><span>${category.subtitle}</span></header>
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
    setActiveScreen(0);
  }

  initialize();
})();
