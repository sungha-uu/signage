# SignageUpdater

매장 PC에 Python을 설치하지 않고 실행하는 TV 메뉴판 자동 업데이트 프로그램입니다.

## 빌드

개발 PC에서 한 번만 PyInstaller를 설치한 뒤 프로젝트 루트에서 실행합니다.

```powershell
python -m pip install pyinstaller
pnpm run build:updater
```

산출물:

```text
dist/updater/SignageUpdater.exe
```

## 매장 PC 최초 설치

기존 TV 메뉴판 EXE와 업데이터 EXE를 매장 PC에 복사한 뒤, 관리자 권한 없이 일반 사용자로 한 번 실행합니다.

```powershell
SignageUpdater.exe --install --app-source "기존 TV 메뉴판 EXE 경로"
```

업데이트 결과 메일을 받으려면 매장 PC에서 한 번만 메일 설정 화면을 엽니다.

```powershell
SignageUpdater.exe --configure-email
```

기본 SMTP 서버는 `smtp.kakao.com:465`, 기본 수신자는 `sungha.yoo@kakao.com`입니다.
발신 계정과 비밀번호를 입력하면 비밀번호는 EXE나 평문 설정 파일에 넣지 않고 Windows DPAPI로 현재 사용자에게만 복호화되도록 저장합니다.

기본 메뉴판 위치는 다음과 같습니다.

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Sexy-Kkunmandu-MenuBoard.exe
```

설치 시 업데이터는 `%LOCALAPPDATA%\Sexy-Kkunmandu\updater`로 자신을 복사하고, Windows 로그온 작업을 등록합니다.

## 테스트 모드

다운로드나 교체 없이 GitHub의 최신 Release만 확인합니다.

```powershell
SignageUpdater.exe --check-only
```

한 번 확인하고 실제 업데이트까지 수행하려면:

```powershell
SignageUpdater.exe --check-once
```

## Release 규칙과 일반 파일 배포

새 Release에는 `update-manifest.json`을 함께 첨부하는 방식을 권장합니다. 매니페스트에 선언된 파일만 처리하므로, Release에 올린 파일이 자동으로 실행되지는 않습니다.

```json
{
  "schemaVersion": 1,
  "version": "v1.7",
  "assets": [
    {
      "id": "menu-board",
      "file": "Sexy-Kkunmandu-MenuBoard-v1.7.zip",
      "mode": "replace-exe"
    },
    {
      "id": "store-guide",
      "file": "store-guide.pdf",
      "mode": "download-only",
      "destination": "store-guide.pdf"
    },
    {
      "id": "managed-tool",
      "file": "tool.zip",
      "mode": "replace-file",
      "target": "tools/tool.zip"
    }
  ]
}
```

지원 모드는 다음과 같습니다.

- `replace-exe`: ZIP 안의 메뉴판 EXE 또는 직접 첨부한 EXE를 Startup 메뉴판으로 교체하고 실행합니다. 한 Release에 하나만 둘 수 있습니다.
- `replace-file`: 파일을 업데이터의 관리 폴더에 교체합니다. `target`은 관리 폴더 아래 상대 경로이며, 프로세스를 종료해야 하면 선택적으로 `processName`을 추가할 수 있습니다.
- `download-only`: APK, Python, ZIP, PDF 등 기타 파일을 실행하지 않고 `%LOCALAPPDATA%\Sexy-Kkunmandu\updater\downloads\v버전`에 보관합니다. `destination`은 해당 폴더 아래 상대 경로입니다.

각 `file`은 같은 Release의 asset 이름과 정확히 일치해야 하며, 매니페스트 버전은 Release tag와 같아야 합니다. Release asset의 SHA-256 digest가 있으면 다운로드 후 자동 검증합니다. 기존 Release처럼 매니페스트가 없는 경우에는 `Sexy-Kkunmandu-MenuBoard-*.zip` 또는 메뉴판 EXE를 찾아 기존 방식으로 호환 처리합니다.

## 메일 알림

새 버전 하나를 감지할 때 메일을 한 번 보내고, 교체 작업이 끝나면 성공 또는 실패 결과 메일을 한 번 더 보냅니다. 따라서 업데이트 시도마다 총 2통을 시도합니다.

메일 전송 실패는 메뉴판 업데이트 실패로 처리하지 않으며, `updater.log`에 기록합니다.
