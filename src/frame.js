(function () {
  "use strict";

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const stage = document.querySelector("#signage-stage");
  const frame = document.querySelector(".signage-frame");
  const screenButtons = document.querySelectorAll(".mobile-screen-button");

  const outerParams = new URLSearchParams(window.location.search);
  const frameUrl = new URL(frame.getAttribute("src"), window.location.href);
  ["mode", "test", "effects"].forEach((key) => {
    if (outerParams.has(key)) frameUrl.searchParams.set(key, outerParams.get(key));
  });
  if (frameUrl.href !== frame.src) frame.src = frameUrl.href;

  if (outerParams.get("effects") === "summer") {
    document.documentElement.dataset.effects = "summer";
    const effectLayer = document.createElement("div");
    effectLayer.className = "summer-effects";
    effectLayer.setAttribute("aria-hidden", "true");

    const leafPositions = [4, 10, 17, 24, 31, 39, 48, 57, 64, 71, 78, 84, 90, 95];
    leafPositions.forEach((top, index) => {
      const leaf = document.createElement("i");
      leaf.className = "summer-leaf";
      leaf.style.setProperty("--leaf-y", `${top}%`);
      leaf.style.setProperty("--leaf-size", `${12 + (index % 5) * 3}px`);
      leaf.style.setProperty("--leaf-delay", `${-1.7 * index}s`);
      leaf.style.setProperty("--leaf-duration", `${17 + (index % 4) * 3}s`);
      leaf.style.setProperty("--leaf-drift", `${-55 + (index % 6) * 22}px`);
      leaf.style.setProperty("--leaf-turn", `${210 + (index % 5) * 70}deg`);
      leaf.style.setProperty("--leaf-turn-mid", `${118 + (index % 5) * 42}deg`);
      effectLayer.appendChild(leaf);
    });

    stage.appendChild(effectLayer);
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
    stage.style.setProperty("--stage-scale", String(scale));
  }

  fitStage();
  window.addEventListener("resize", fitStage, { passive: true });
  window.addEventListener("orientationchange", fitStage, { passive: true });

  screenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      frame.contentWindow.postMessage(
        { type: "menu-board-set-screen", screen: Number(button.dataset.screen) },
        window.location.origin
      );
    });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "menu-board-active-screen") return;
    screenButtons.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.screen) === Number(event.data.screen));
    });
  });
})();
