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

  function badge(text, variant = "coral") {
    if (!text) return "";
    return `<span class="badge badge--${variant}">${text}</span>`;
  }

  function brandHeader(compact = false) {
    return `
      <header class="brand ${compact ? "brand--compact" : ""}">
        <img class="brand__logo" src="${data.brand.logo}" alt="${data.brand.name}" />
        <p class="brand__tagline">${data.brand.tagline}</p>
      </header>`;
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
            <p class="category__eyebrow">MENU</p>
            <h2>${category.title}</h2>
          </div>
          ${category.subtitle ? `<p class="category__subtitle">${category.subtitle}</p>` : ""}
        </header>
        <ul class="menu-list">${visibleItems(category).map((item) => menuRow(item, options.dense)).join("")}</ul>
      </section>`;
  }

  function renderStaticScreen() {
    const [mandu, special, noodle] = data.categories;
    const [tangsuyukPhoto, noodlePhoto, fishcakePhoto] = data.gallery;

    return `
      <section class="screen screen--static" data-screen="0" aria-label="전체 메뉴판">
        ${brandHeader()}
        <div class="board board--static">
          <section class="hero-card">
            <div class="hero-card__copy">
              ${badge(data.hero.badge)}
              <p class="hero-card__kicker">오늘의 추천 조합</p>
              <h1>${data.hero.title.replace(" + ", "<span>+</span>")}</h1>
              <p class="hero-card__price">${won(data.hero.price)}</p>
            </div>
            <div class="hero-card__image-wrap">
              <img src="${data.hero.image}" alt="${data.hero.imageAlt}" class="hero-card__image" />
            </div>
          </section>

          <div class="static-menu-grid">
            ${categoryBlock(mandu, { featured: true, dense: true })}
            <section class="photo-category">
              <img src="${tangsuyukPhoto.image}" alt="${tangsuyukPhoto.alt}" />
              ${categoryBlock(special, { dense: true })}
            </section>
            <section class="photo-category photo-category--split">
              <div class="photo-category__stack">
                <img src="${noodlePhoto.image}" alt="${noodlePhoto.alt}" />
                <img src="${fishcakePhoto.image}" alt="${fishcakePhoto.alt}" />
              </div>
              ${categoryBlock(noodle, { dense: true })}
            </section>
          </div>
        </div>
        <footer class="screen-footer"><span>ORDER NOW</span><p>맛있는 한 끼, 꾼만두에서 준비했습니다.</p></footer>
      </section>`;
  }

  function renderVideoScreen() {
    const [mandu, special, noodle] = data.categories;
    const compactGroups = [mandu, noodle, special];

    return `
      <section class="screen screen--video" data-screen="1" aria-label="메뉴와 영상">
        ${brandHeader(true)}
        <div class="board board--video">
          <aside class="video-menu">
            <section class="video-menu__hero">
              <div>${badge(data.hero.badge)}<span class="video-menu__eyebrow">BEST COMBO</span></div>
              <h1>${data.hero.title}</h1>
              <strong>${won(data.hero.price)}</strong>
            </section>
            <div class="video-menu__groups">
              ${compactGroups.map((category) => `
                <section class="compact-group compact-group--${category.id}">
                  <header><h2>${category.title}</h2><span>${category.subtitle}</span></header>
                  <ul>${visibleItems(category).map((item) => menuRow(item, true)).join("")}</ul>
                </section>`).join("")}
            </div>
          </aside>
          <section class="video-stage" aria-label="${data.video.title}">
            <video id="menu-video" playsinline preload="metadata" ${data.settings.videoMuted ? "muted" : ""} poster="${data.video.poster}">
              <source src="${data.video.src}" type="video/mp4" />
              사용 중인 브라우저에서 영상을 재생할 수 없습니다.
            </video>
            <div class="video-stage__label"><span class="pulse"></span>${data.video.title}</div>
            <button type="button" class="video-stage__sound" id="video-sound" aria-label="영상 소리 켜기">소리 켜기</button>
          </section>
        </div>
        <footer class="screen-footer"><span>FRESH & HANDMADE</span><p>매일 정성껏 빚고, 맛있게 튀깁니다.</p></footer>
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
      const playAttempt = video.play();
      if (playAttempt) playAttempt.catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
      if (data.settings.autoRotate) {
        screenTimer = setTimeout(() => setActiveScreen(1), data.settings.staticDurationSeconds * 1000);
      }
    }

    if (manual) document.body.classList.add("controls-visible");
  }

  function initialize() {
    app.innerHTML = renderStaticScreen() + renderVideoScreen();
    dots.innerHTML = '<button class="screen-dot is-active" aria-label="1번 메뉴판"></button><button class="screen-dot" aria-label="2번 영상 메뉴판"></button>';
    controls.hidden = data.settings.showControls === false;

    document.querySelectorAll(".screen-dot").forEach((dot, index) => dot.addEventListener("click", () => setActiveScreen(index, true)));
    previousButton.addEventListener("click", () => setActiveScreen(activeScreen - 1, true));
    nextButton.addEventListener("click", () => setActiveScreen(activeScreen + 1, true));
    document.querySelector("#menu-video").addEventListener("ended", () => setActiveScreen(0));
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
    setActiveScreen(0);
  }

  initialize();
})();
