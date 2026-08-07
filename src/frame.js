(function () {
  "use strict";

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const stage = document.querySelector("#signage-stage");
  const frame = document.querySelector(".signage-frame");
  const screenButtons = document.querySelectorAll(".mobile-screen-button");

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
