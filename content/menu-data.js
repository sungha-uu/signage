window.MENU_BOARD_DATA = {
  brand: {
    name: "섹시한 꾼만두",
    tagline: "매일 빚어 더 맛있는 수제만두",
    logo: "content/assets/images/logo.png"
  },
  settings: {
    staticDurationSeconds: 30,
    autoRotate: false,
    videoAutoplay: false,
    videoControls: true,
    showControls: true,
    videoMuted: true,
    signageMode: {
      autoRotate: true,
      videoAutoplay: true,
      videoControls: false,
      showControls: false
    }
  },
  hero: {
    badge: "인기",
    title: "고기만두 + 비빔야채",
    price: 9000,
    image: "content/assets/images/mandu-bibim.png",
    imageAlt: "고기만두와 비빔야채"
  },
  categories: [
    {
      id: "mandu",
      title: "만두 메뉴",
      iconImage: "content/assets/images/logo.png",
      subtitle: "매일 직접 빚는 수제만두",
      items: [
        { name: "모듬만두", price: 7000, description: "고기2 · 깻잎1 · 땡초1 · 새우1", visible: true },
        { name: "고기만두", price: 7000, description: "1인분 5개", visible: true },
        { name: "깻잎만두", price: 7000, description: "1인분 5개", visible: true },
        { name: "땡초만두", price: 7000, description: "1인분 5개", visible: true },
        { name: "새우만두", price: 7000, description: "1인분 5개", visible: true },
        { name: "탕수만두", price: 9000, description: "1인분 5개", visible: true },
        { name: "비빔야채", price: 2000, accent: true, visible: true }
      ]
    },
    {
      id: "special",
      title: "별미 메뉴",
      icon: "✨️",
      subtitle: "만두와 잘 어울리는 인기 메뉴",
      items: [
        { name: "옛날 탕수육", price: 12000, badge: "인기", visible: true },
        { name: "유린 탕수육", price: 14000, visible: true },
        { name: "콩나물어묵", price: 5000, description: "1인분 4개", badge: "인기", visible: true },
        { name: "음료수", price: 2000, description: "콜라 · 사이다", visible: true }
      ]
    },
    {
      id: "noodle",
      title: "면 메뉴",
      icon: "🍜",
      subtitle: "따뜻하게, 또는 시원하게",
      items: [
        { name: "냉메밀", price: 7000, badge: "여름 한정", visible: true },
        { name: "냄비우동", price: 5000, visible: true },
        { name: "얼큰우동", price: 6000, visible: true },
        { name: "비빔우동", price: 6000, visible: true }
      ]
    }
  ],
  gallery: [
    { categoryId: "special", image: "content/assets/images/tangsuyuk.jpeg?v=20260808-42", alt: "옛날 탕수육" },
    { categoryId: "noodle", image: "content/assets/images/cold-noodle.png", alt: "냉메밀" },
    { categoryId: "special", image: "content/assets/images/fishcake.png", alt: "콩나물어묵" }
  ],
  video: {
    src: "content/assets/video/menu-video.mp4",
    poster: "content/assets/images/mandu-bibim.png",
    title: "섹시한 꾼만두 이야기"
  }
};
