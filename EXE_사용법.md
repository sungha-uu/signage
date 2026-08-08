# 섹시한 꾼만두 메뉴판 EXE 사용법

## 실행

배포 폴더에서 `섹시한 꾼만두 메뉴판.exe`를 더블클릭합니다.

이 실행 파일은 계절 효과가 없는 일반 버전이며, 1·2페이지가 바뀔 때 부드러운 화면 전환 애니메이션이 적용됩니다.

현재 파일은 개인 매장용 빌드라 상용 코드 서명 인증서가 없습니다. Windows가 첫 실행 시 `Windows의 PC 보호`를 표시하면 파일 경로가 이 배포 폴더인지 확인한 뒤 `추가 정보` → `실행`을 선택합니다.

- 자동으로 전체 화면으로 실행됩니다.
- 1페이지를 30초 동안 보여준 뒤 2페이지로 이동합니다.
- 2페이지 영상이 자동으로 재생됩니다.
- 영상이 끝나면 다시 1페이지로 돌아갑니다.
- 이 과정을 계속 반복합니다.

## 종료와 전체 화면 전환

- 종료: `Ctrl + Q`
- 전체 화면/창 모드 전환: `F11`

## 메뉴와 가격 수정

EXE를 종료한 뒤 아래 파일을 메모장이나 Visual Studio Code로 엽니다.

```text
content/menu-data.js
```

가격은 쉼표나 `원` 없이 숫자만 입력합니다.

```js
{ name: "고기만두", price: 7000, description: "1인분 5개", visible: true }
```

- `name`: 메뉴명.
- `price`: 가격 숫자.
- `description`: 메뉴명 아래 보조 설명.
- `badge`: `인기`, `여름 한정` 등의 태그.
- `accent: true`: 빨간색 강조.
- `visible: false`: 메뉴를 화면에서 숨김.

저장한 뒤 EXE를 다시 실행하면 변경 내용이 반영됩니다. EXE를 다시 빌드할 필요가 없습니다.

## 사진과 영상 교체

파일명은 그대로 두고 파일만 교체하면 됩니다.

```text
content/assets/images/mandu-bibim.png
content/assets/images/tangsuyuk.jpeg
content/assets/images/fishcake.png
content/assets/images/cold-noodle.png
content/assets/images/logo.png
content/assets/video/menu-video.mp4
```

EXE 옆의 `content` 폴더를 삭제하거나 이름을 바꾸면 EXE 내부에 포함된 기본 메뉴와 사진을 사용합니다.

## Windows 시작 시 자동 실행

1. `Win + R`을 누릅니다.
2. `shell:startup`을 입력하고 확인합니다.
3. 사용할 버전 EXE 하나의 바로가기를 시작프로그램 폴더에 넣습니다.

원본 EXE와 `content` 폴더는 같은 배포 폴더에 그대로 두고, 시작프로그램 폴더에는 바로가기만 넣는 것을 권장합니다.

## 권장 TV PC 설정

- Windows 디스플레이 해상도: `1920×1080` 이상.
- 화면 배율: 가능하면 `100%`.
- Windows 절전/화면 끄기: 사용 안 함.
- TV 화면비: 원본/전체 화면/16:9 중 잘리지 않는 모드.
- 영상은 기본 음소거로 재생됩니다.
