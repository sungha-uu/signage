(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const edition = params.get("edition") === "intl" ? "intl" : "ko";
  const frame = document.getElementById("tv-menu-frame");
  frame.src = edition === "intl"
    ? "tv-board-foreign.html?mode=signage"
    : "../board.html?mode=signage&screen=0&palette=champagne";

  document.documentElement.lang = edition === "intl" ? "en" : "ko";
  document.title = edition === "intl"
    ? "Sexy Kkunmandu A4 Menu - English & Chinese"
    : "섹시한 꾼만두 A4 메뉴판 - 한글";
}());
