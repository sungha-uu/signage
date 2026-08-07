# 섹시한 꾼만두 디지털 메뉴보드

TV, PC, 휴대폰에서 같은 주소로 볼 수 있는 정적 웹 메뉴판입니다. 별도의 서버나 데이터베이스 없이 GitHub Pages에서 실행됩니다.

## 메뉴 수정

`content/menu-data.js`만 수정하면 됩니다.

- `name`: 메뉴명
- `price`: 숫자 가격
- `description`: 보조 설명
- `badge`: `인기`, `여름 한정` 같은 강조 문구
- `accent`: `true`이면 빨간색 강조
- `visible`: `false`이면 화면에서 숨김

## 사진·영상 교체

- 사진: `content/assets/images/`
- 영상: `content/assets/video/menu-video.mp4`
- 로고: `content/assets/images/logo.png`

파일명은 그대로 두고 파일만 교체하면 코드 수정 없이 반영됩니다.

사진별 권장 크기와 촬영 기준은 `content/assets/images/사진-교체-안내.md`에 정리되어 있습니다.

## 실행

`index.html`을 브라우저로 열거나 로컬 웹 서버를 실행합니다.

```powershell
python -m http.server 8080
```

그다음 `http://localhost:8080`에 접속합니다. 화면 오른쪽 아래의 전체 화면 버튼 또는 `F11`을 사용하면 TV 화면을 가득 채웁니다.

## 웹 페이지 동작

웹 페이지에서는 1번·2번 메뉴판을 화면 전환 버튼으로만 이동합니다. 2번 영상도 자동으로 재생되지 않으며 사용자가 영상 재생 버튼을 눌러야 시작합니다.

향후 EXE는 `board.html?mode=signage`를 실행하여 자동 순환과 영상 자동 재생을 활성화합니다. 1번 메뉴판은 `settings.staticDurationSeconds` 동안 표시되고, 2번 영상이 끝나면 다시 1번으로 돌아갑니다.

TV, PC, 휴대폰 모두 같은 16:9 가로 메뉴판을 표시합니다. 휴대폰 세로 화면에서는 전체 메뉴판이 축소되어 위아래 여백과 함께 표시되며, 가로로 돌리면 더 크게 볼 수 있습니다.
