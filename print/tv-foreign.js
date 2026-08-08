(function () {
  "use strict";

  const data = window.MENU_BOARD_DATA;
  const names = {
    "모듬만두": ["Assorted Dumplings", "什锦饺子"],
    "고기만두": ["Meat Dumplings", "肉馅饺子"],
    "깻잎만두": ["Perilla Dumplings", "紫苏饺子"],
    "땡초만두": ["Spicy Dumplings", "辣椒饺子"],
    "새우만두": ["Shrimp Dumplings", "鲜虾饺子"],
    "탕수만두": ["Sweet-Sour Dumplings", "糖醋饺子"],
    "비빔야채": ["Spicy Vegetables", "香辣拌蔬菜"],
    "옛날 탕수육": ["Sweet & Sour Pork", "传统糖醋肉"],
    "유린 탕수육": ["Yurin Sweet & Sour Pork", "油淋糖醋肉"],
    "콩나물어묵": ["Bean Sprout Fish Cake", "豆芽鱼糕"],
    "음료수": ["Soft Drinks", "饮料"],
    "냉메밀": ["Cold Buckwheat Noodles", "冷荞麦面"],
    "냄비우동": ["Hot Pot Udon", "锅烧乌冬面"],
    "얼큰우동": ["Spicy Udon", "香辣乌冬面"],
    "비빔우동": ["Spicy Mixed Udon", "辣拌乌冬面"]
  };
  const descriptions = {
    "고기2 · 깻잎1 · 땡초1 · 새우1": "Meat 2 · Perilla 1 · Spicy 1 · Shrimp 1 / 肉2 · 紫苏1 · 辣味1 · 虾1",
    "1인분 5개": "5 pcs / 每份5个",
    "1인분 4개": "4 pcs / 每份4个",
    "콜라 · 사이다": "Coke · Sprite / 可乐 · 雪碧"
  };

  data.labels = {
    currency: "prefix",
    manduChoice: "Fried/Steamed · 煎/蒸",
    bestMenu: "BEST COMBO · 人气套餐",
    staticFooterLeft: "HANDMADE DUMPLINGS · 手工饺子",
    staticFooterRight: "Freshly prepared with care · 用心新鲜制作"
  };

  data.hero.badge = "POPULAR · 人气";
  data.hero.title = '<span class="foreign-hero-en">Meat Dumpling</span><small class="foreign-hero-zh">肉馅饺子</small> + <span class="foreign-hero-en">Spicy Veggies</span><small class="foreign-hero-zh">香辣拌菜</small>';

  const categoryText = {
    mandu: ["DUMPLINGS / 饺子", "Handmade daily · 每日手工"],
    special: ["SPECIALS / 特色菜", "Pairs with dumplings · 饺子搭配"],
    noodle: ["NOODLES / 面类", "Hot or cold · 热食/冷食"]
  };

  data.categories.forEach((category) => {
    [category.title, category.subtitle] = categoryText[category.id];
    category.items.forEach((item) => {
      const translated = names[item.name];
      if (translated) {
        item.name = `<span class="intl-name__en">${translated[0]}</span><span class="intl-name__zh">${translated[1]}</span>`;
      }
      if (item.description) item.description = descriptions[item.description] || item.description;
      if (item.badge === "인기") item.badge = "POPULAR · 人气";
      if (item.badge === "여름 한정") {
        item.badge = "SUMMER · 夏季限定";
        item.badgeVariant = "blue";
      }
    });
  });
}());
