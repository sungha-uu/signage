# 섹시한 꾼만두 A4 외국어 메뉴판 디자인 명세 V1

이 문서는 영어와 중국어가 함께 표기된 A4 외국어 메뉴판 V1을 동일하게 재구성하기 위한 명세다. TV 레이아웃을 확대하지 않고 **3508×2480px 전용 독립 레이아웃**으로 설계되어 있다.

정확한 요소별 계산값은 `A4_FOREIGN_MENU_METRICS_V1.json`, 구조와 스타일은 `print/foreign-a4.html`, `print/foreign-a4.css`가 기준이다.

## 1. 출력 규격

| 항목 | 값 |
|---|---|
| 물리 크기 | A4 landscape, 297×210mm |
| 픽셀 | 3508×2480 |
| 해상도 | 약 299.9994dpi |
| 색상 모드 | RGB |
| 승인 PNG | `release/v1/A4/A4_메뉴판_외국어_v1.png` |
| SHA-256 | `5639961A5406DFE6587EA039D60C7DCF6A2F12635D16A5FF21FCE8D3E6E84B59` |

## 2. 색상

| 용도 | 값 |
|---|---|
| 외곽 코랄 | `#EF5038` |
| 진한 코랄 | `#C9402D` |
| 본문 | `#191817` |
| 보조 | `#6F665F` |
| 종이 | `#FFFDF9` |
| 메뉴 카드 | `#FFF8EE` |
| 카드 선 | `#EADBCA` |
| 안내 카드 | `#FFF4ED` |
| 안내 카드 선 | `#EFC5B9` |

외곽 배경:

```css
linear-gradient(135deg, #f55a41 0%, #ef5038 60%, #e54832 100%)
```

## 3. 전체 좌표

| 요소 | x | y | width | height |
|---|---:|---:|---:|---:|
| poster | 0 | 0 | 3508 | 2480 |
| paper | 68 | 58 | 3372 | 2364 |
| header | 102 | 88 | 3304 | 150 |
| menu columns | 102 | 238 | 3304 | 2152 |
| 왼쪽 열 | 102 | 260 | 1640 | 2130 |
| 오른쪽 열 | 1766 | 260 | 1640 | 2130 |

- poster padding: 상하 58px, 좌우 68px
- paper padding: 상 30px, 좌우 34px, 하 32px
- paper radius 31px, shadow `0 18px 45px rgba(119,41,25,.16)`
- header 하단선: 4px `#191817`
- 두 열 간격: 24px
- 열 시작 전 상단 padding: 22px

## 4. 헤더

- 높이 150px
- Grid: `1fr auto 1fr`
- 좌우 padding 22px, 하단 padding 18px
- `MENU`: Arial 34px/800, letter-spacing 8px, `#C9402D`
- `English · 中文`: 50px/720, letter-spacing -1.5px
- 조리 선택 pill: padding `15px 27px`, border 2px `#EDC4B7`, radius 999px, 배경 `#FFF3EE`
- pill 본문 34px, 라벨 27px/800
- 로고 475×105px, 오른쪽 정렬, object-fit contain

## 5. 열과 카드 행

### 왼쪽

- 6개 행, gap 13px
- 각 카드 높이 344.156~344.172px
- 번호 01~06

### 오른쪽

- 5개 메뉴 카드 + 230px 안내 카드
- 메뉴 카드 높이 367px
- 카드 사이 gap 13px
- 번호 07~11

### 공통 메뉴 카드

- width 1640px
- Grid: 이미지 306px + 텍스트 나머지
- 열 gap 30px
- padding `14px 24px 14px 14px`
- border 2px `#EADBCA`
- radius 24px
- 배경 `#FFF8EE`
- overflow hidden
- 이미지 width 306px, height 100%, radius 18px, object-fit cover

## 6. 카드 내부 `번호 / 메뉴명 3줄 / 가격`

`.menu-copy`는 정확히 200px 높이며 다음 3열이다.

```css
grid-template-columns: 118px minmax(0,1fr) 260px;
gap: 14px;
height: 200px;
```

- 번호: 78px/800 Arial, `#EF5038`, 배경 없음, 중앙 정렬
- 가격: 74px/700, `#C9402D`, 우측 정렬, 배경 없음
- 가격은 `₩ 7,000`처럼 원화 기호 뒤에 공백 1개
- 번호와 가격의 세로 높이는 메뉴 3줄 높이와 같은 200px
- 탕수육 가격 2줄도 74px로 동일하며 줄 사이 8px

메뉴명 3줄:

```css
grid-template-rows: 50px 86px 64px;
height: 200px;
```

| 줄 | 글꼴 |
|---|---|
| 한국어 보조명 | 40px/620, `#6F665F` |
| 영어 | Arial 70px/700 |
| 중국어 | Microsoft YaHei 53px/600 |
| 중국어 병음 | Arial 30px/500, `#7B7169` |

특수 축소:

- 06 세트: 한국어 35px, 영어 48px, 중국어 43px, 병음 23px
- 11 탕수육: copy 가격 열 530px; 한국어 32px, 영어 47px, 영어 note 22px, 중국어 40px
- Perilla/긴 메뉴: 영어 62px
- 콩나물어묵: 영어 52px

## 7. 메뉴 번호와 콘텐츠

| 번호 | 한국어 | 영어 | 중국어 | 가격 |
|---:|---|---|---|---:|
| 01 | 고기만두 | Pork Dumplings | 猪肉饺子 | ₩ 7,000 |
| 02 | 새우만두 | Shrimp Dumplings | 虾饺 | ₩ 7,000 |
| 03 | 깻잎만두 | Perilla Leaf Dumplings | 紫苏叶饺子 | ₩ 7,000 |
| 04 | 땡초만두 | Spicy Chili Dumplings | 辣椒饺子 | ₩ 7,000 |
| 05 | 모둠만두 | Assorted Dumplings | 什锦饺子 | ₩ 7,000 |
| 06 | 고기만두+비빔야채 | Pork Dumplings + Spicy Vegetables | 猪肉饺子 + 辣拌菜 | ₩ 9,000 |
| 07 | 냄비우동 | Udon | 乌冬 | ₩ 5,000 |
| 08 | 얼큰우동 | Spicy Udon | 辣味乌冬 | ₩ 6,000 |
| 09 | 비빔우동 | Bibim Udon | 拌乌冬 | ₩ 6,000 |
| 10 | 콩나물어묵 | Bean Sprout & Fish Cake Soup | 黄豆芽鱼饼汤 | ₩ 5,000 |
| 11 | 탕수육 (옛날/유린) | Sweet & Sour Pork | 糖醋肉 | ₩ 12,000 / ₩ 14,000 |

번호는 직원과 손님의 의사소통용이므로 삭제하거나 재정렬하지 않는다.

## 8. 이미지 매핑

| 번호 | 파일 |
|---:|---|
| 01 | `foreign-menu/pork.jpg` |
| 02 | `foreign-menu/shrimp.jpg` |
| 03 | `foreign-menu/perilla.jpg` |
| 04 | `foreign-menu/spicy-dumpling.jpg` |
| 05 | `foreign-menu/assorted.jpg` |
| 06 | `foreign-menu/combo.png`, object-position 50% 56% |
| 07 | `foreign-menu/pot-udon.jpg` |
| 08 | `foreign-menu/spicy-udon.jpg` |
| 09 | `foreign-menu/bibim-udon.jpg` |
| 10 | `foreign-menu/fishcake.jpg` |
| 11 | `foreign-menu/tangsuyuk.jpeg`, object-position 50% 52% |

## 9. 하단 안내 카드

- 오른쪽 열 마지막 행, 높이 230px
- Grid: `166px 1fr 1fr`, gap 30px
- padding `14px 38px 14px 20px`
- smile 이미지 150×150px, 원본 유지
- 영어/중국어 안내 사이 1px `#E7B8AA`
- 라벨: 영어 34px, 중국어 38px
- 본문: 58px/650
- 밝은 배경과 코랄 포인트를 유지한다.

## 10. 출력과 재현

```powershell
node scripts/export-a4.cjs --foreign-v1-only
```

필수 조건:

1. 3508×2480 고정 캔버스
2. Edge headless, device scale 1
3. 스크롤바 없음
4. 폰트 렌더 완료 후 캡처
5. PNG 300dpi pHYs metadata
6. 번호·가격 글자 크기 74~78px 유지
7. 탕수육의 두 가격 모두 원화 기호 표시, 우측 끝 정렬
8. 승인 PNG와 시각 비교

## 11. 다른 용지 크기로 변환

이 레이아웃은 3508×2480 기준 절대 px이다. 새 출력이 같은 A계열 가로 비율이면 `scale=min(newWidth/3508,newHeight/2480)`을 모든 좌표와 글자 크기에 동일하게 곱한다. 비율이 다르면 임의로 열을 재배치하지 말고, 먼저 바깥 여백과 열 gap을 고정한 뒤 카드 높이를 새 세로 공간에 균등 분배한다.
