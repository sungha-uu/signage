"""Standalone updater for the Windows TV menu board.

The packaged executable has no Python/runtime dependency on the store PC.
It watches the public GitHub Releases page, downloads the latest published
menu-board ZIP, verifies its SHA-256 digest when GitHub provides one, replaces
the managed EXE in the current user's shell:startup folder, and starts it.

The updater itself is designed to live outside the startup folder.  A logon
scheduled task starts the updater, while the managed menu-board EXE remains in
shell:startup as requested.
"""

from __future__ import annotations

import argparse
import base64
import ctypes
from ctypes import wintypes
from email.message import EmailMessage
import hashlib
import json
import logging
import logging.handlers
import os
import re
import shutil
import smtplib
import subprocess
import sys
import socket
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any


UPDATER_VERSION = "0.1.0"
GITHUB_OWNER = "sungha-uu"
GITHUB_REPOSITORY = "signage"
GITHUB_LATEST_RELEASE_URL = (
    f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPOSITORY}/releases/latest"
)
APP_EXE_NAME = "Sexy-Kkunmandu-MenuBoard.exe"
TASK_NAME = "Sexy Kkunmandu Signage Updater"
DEFAULT_INTERVAL_SECONDS = 600
MIN_INTERVAL_SECONDS = 60
STARTUP_GRACE_SECONDS = 15
HEALTH_CHECK_SECONDS = 10
USER_AGENT = f"Sexy-Kkunmandu-Signage-Updater/{UPDATER_VERSION}"
DEFAULT_SMTP_SERVER = "smtp.kakao.com"
DEFAULT_SMTP_PORT = 465
DEFAULT_NOTIFICATION_RECIPIENT = "sungha.yoo@kakao.com"
EMAIL_CONFIG_NAME = "email.json"


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


class UpdateError(RuntimeError):
    """An expected, recoverable update failure."""


def frozen_executable() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve()
    return Path(__file__).resolve()


def local_app_data() -> Path:
    value = os.environ.get("LOCALAPPDATA")
    if value:
        return Path(value)
    return Path.home() / "AppData" / "Local"


def startup_directory() -> Path:
    value = os.environ.get("APPDATA")
    if not value:
        raise UpdateError("APPDATA 환경 변수를 찾을 수 없습니다.")
    return Path(value) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"


def state_directory() -> Path:
    return local_app_data() / "Sexy-Kkunmandu" / "updater"


def state_file() -> Path:
    return state_directory() / "state.json"


def config_file() -> Path:
    return state_directory() / "config.json"


def log_file() -> Path:
    return state_directory() / "logs" / "updater.log"


def email_config_file() -> Path:
    return state_directory() / EMAIL_CONFIG_NAME


def ensure_directories() -> None:
    for directory in (
        state_directory(),
        state_directory() / "downloads",
        state_directory() / "staging",
        state_directory() / "backup",
        log_file().parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)


def setup_logging() -> logging.Logger:
    ensure_directories()
    logger = logging.getLogger("signage-updater")
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    handler = logging.handlers.RotatingFileHandler(
        log_file(), maxBytes=2_000_000, backupCount=3, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(handler)

    if not getattr(sys, "frozen", False):
        console = logging.StreamHandler()
        console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(console)
    return logger


def read_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return dict(fallback)


def atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def parse_version(value: Any) -> tuple[int, int, int] | None:
    match = re.search(r"(?<!\d)(\d+)(?:\.(\d+))?(?:\.(\d+))?", str(value))
    if not match:
        return None
    return tuple(int(part or 0) for part in match.groups())  # type: ignore[return-value]


def version_text(value: tuple[int, int, int] | None) -> str:
    if value is None:
        return "0.0.0"
    return ".".join(str(part) for part in value)


def protect_text(value: str) -> str:
    """Protect a secret with the current Windows user's DPAPI key."""
    if os.name != "nt":
        raise UpdateError("메일 자격 증명 저장은 Windows에서만 지원됩니다.")
    raw = value.encode("utf-8")
    buffer = (ctypes.c_ubyte * len(raw)).from_buffer_copy(raw)
    source = DataBlob(len(raw), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    protected = DataBlob()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    if not crypt32.CryptProtectData(
        ctypes.byref(source), None, None, None, None, 0, ctypes.byref(protected)
    ):
        raise UpdateError(f"Windows DPAPI 암호화 실패: {ctypes.get_last_error()}")
    try:
        encrypted = ctypes.string_at(protected.pbData, protected.cbData)
    finally:
        kernel32.LocalFree(protected.pbData)
    return base64.b64encode(encrypted).decode("ascii")


def unprotect_text(value: str) -> str:
    """Decrypt a value previously protected for the current Windows user."""
    if os.name != "nt":
        raise UpdateError("메일 자격 증명 복호화는 Windows에서만 지원됩니다.")
    encrypted = base64.b64decode(value.encode("ascii"))
    buffer = (ctypes.c_ubyte * len(encrypted)).from_buffer_copy(encrypted)
    source = DataBlob(len(encrypted), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    unprotected = DataBlob()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    if not crypt32.CryptUnprotectData(
        ctypes.byref(source), None, None, None, None, 0, ctypes.byref(unprotected)
    ):
        raise UpdateError("Windows DPAPI 복호화 실패: 메일 설정을 다시 저장해 주세요.")
    try:
        decrypted = ctypes.string_at(unprotected.pbData, unprotected.cbData)
    finally:
        kernel32.LocalFree(unprotected.pbData)
    return decrypted.decode("utf-8")


def configure_email(logger: logging.Logger) -> None:
    """Store SMTP settings once using a small bundled Windows GUI."""
    try:
        import tkinter as tk
        from tkinter import messagebox, ttk
    except ImportError as error:
        raise UpdateError(f"메일 설정 화면을 불러오지 못했습니다: {error}") from error

    existing = read_json(email_config_file(), {})
    root = tk.Tk()
    root.title("섹시한 꾼만두 업데이트 메일 설정")
    root.resizable(False, False)

    frame = ttk.Frame(root, padding=16)
    frame.grid(row=0, column=0, sticky="nsew")

    values = {
        "smtpServer": tk.StringVar(value=str(existing.get("smtpServer", DEFAULT_SMTP_SERVER))),
        "smtpPort": tk.StringVar(value=str(existing.get("smtpPort", DEFAULT_SMTP_PORT))),
        "sender": tk.StringVar(value=str(existing.get("sender", ""))),
        "recipient": tk.StringVar(
            value=str(existing.get("recipient", DEFAULT_NOTIFICATION_RECIPIENT))
        ),
        "password": tk.StringVar(),
    }
    rows = [
        ("SMTP 서버", "smtpServer", False),
        ("SMTP 포트", "smtpPort", False),
        ("발신 계정", "sender", False),
        ("수신 계정", "recipient", False),
        ("발신 비밀번호", "password", True),
    ]
    for row, (label, key, secret) in enumerate(rows):
        ttk.Label(frame, text=label).grid(row=row, column=0, sticky="w", padx=(0, 12), pady=5)
        ttk.Entry(frame, textvariable=values[key], width=42, show="*" if secret else "").grid(
            row=row, column=1, sticky="ew", pady=5
        )

    ttk.Label(
        frame,
        text="비밀번호는 이 Windows 사용자 계정으로만 복호화되는 형태로 저장됩니다.",
        foreground="#555555",
    ).grid(row=len(rows), column=0, columnspan=2, sticky="w", pady=(8, 12))

    def save() -> None:
        try:
            smtp_server = values["smtpServer"].get().strip()
            smtp_port = int(values["smtpPort"].get().strip())
            sender = values["sender"].get().strip()
            recipient = values["recipient"].get().strip()
            password = values["password"].get()
            if not smtp_server or not sender or not recipient or not password:
                raise ValueError("모든 항목을 입력해 주세요.")
            if not 1 <= smtp_port <= 65535:
                raise ValueError("SMTP 포트가 올바르지 않습니다.")
            atomic_write_json(
                email_config_file(),
                {
                    "smtpServer": smtp_server,
                    "smtpPort": smtp_port,
                    "sender": sender,
                    "smtpUser": sender,
                    "recipient": recipient,
                    "passwordProtected": protect_text(password),
                },
            )
            logger.info("업데이트 메일 설정을 저장했습니다.")
            messagebox.showinfo("저장 완료", "업데이트 메일 설정을 저장했습니다.", parent=root)
            root.destroy()
        except Exception as error:
            messagebox.showerror("저장 실패", str(error), parent=root)

    ttk.Button(frame, text="저장", command=save).grid(row=len(rows) + 1, column=1, sticky="e", pady=(0, 2))
    root.mainloop()


def send_notification_email(subject: str, body: str, logger: logging.Logger) -> bool:
    """Send one notification without allowing mail failure to break updates."""
    config = read_json(email_config_file(), {})
    protected_password = config.get("passwordProtected")
    if not protected_password:
        logger.warning("메일 설정이 없어 알림을 건너뜁니다. --configure-email을 한 번 실행해 주세요.")
        return False

    try:
        password = unprotect_text(str(protected_password))
        message = EmailMessage()
        message["From"] = str(config["sender"])
        message["To"] = str(config.get("recipient", DEFAULT_NOTIFICATION_RECIPIENT))
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP_SSL(
            str(config.get("smtpServer", DEFAULT_SMTP_SERVER)),
            int(config.get("smtpPort", DEFAULT_SMTP_PORT)),
            timeout=30,
        ) as smtp:
            smtp.login(str(config.get("smtpUser", config["sender"])), password)
            smtp.send_message(message)
        logger.info("업데이트 메일 전송 완료: %s", subject)
        return True
    except Exception:
        logger.exception("업데이트 메일 전송 실패: %s", subject)
        return False


def update_detection_body(
    local_version: tuple[int, int, int],
    remote_version: tuple[int, int, int],
    release: dict[str, Any],
    asset: dict[str, Any],
    app_path: Path,
) -> str:
    return "\n".join(
        [
            "섹시한 꾼만두 TV 메뉴판 업데이트를 감지했습니다.",
            "",
            f"PC: {socket.gethostname()}",
            f"현재 버전: v{version_text(local_version)}",
            f"새 버전: v{version_text(remote_version)}",
            f"Release: {release.get('html_url', '')}",
            f"파일: {asset.get('name', '')}",
            f"교체 대상: {app_path}",
            "",
            "다운로드와 EXE 교체를 시작합니다.",
        ]
    )


def update_result_body(
    local_version: tuple[int, int, int],
    remote_version: tuple[int, int, int],
    release: dict[str, Any],
    app_path: Path,
    success: bool,
    detail: str,
) -> str:
    result_text = "성공" if success else "실패"
    return "\n".join(
        [
            f"섹시한 꾼만두 TV 메뉴판 업데이트 {result_text}",
            "",
            f"PC: {socket.gethostname()}",
            f"이전 버전: v{version_text(local_version)}",
            f"대상 버전: v{version_text(remote_version)}",
            f"Release: {release.get('html_url', '')}",
            f"실행 경로: {app_path}",
            f"상세: {detail}",
            f"로그: {log_file()}",
        ]
    )


def make_default_config() -> dict[str, Any]:
    return {
        "repository": f"{GITHUB_OWNER}/{GITHUB_REPOSITORY}",
        "latestReleaseUrl": GITHUB_LATEST_RELEASE_URL,
        "appPath": str(startup_directory() / APP_EXE_NAME),
        "checkIntervalSeconds": DEFAULT_INTERVAL_SECONDS,
        "startupGraceSeconds": STARTUP_GRACE_SECONDS,
    }


def load_config(args: argparse.Namespace) -> dict[str, Any]:
    config = make_default_config()
    config.update(read_json(config_file(), {}))

    if args.app_path:
        config["appPath"] = str(Path(args.app_path).expanduser().resolve())
    if args.interval is not None:
        config["checkIntervalSeconds"] = max(MIN_INTERVAL_SECONDS, int(args.interval))
    if args.startup_grace is not None:
        config["startupGraceSeconds"] = max(0, int(args.startup_grace))

    config["appPath"] = str(Path(config["appPath"]).expanduser())
    config["checkIntervalSeconds"] = max(
        MIN_INTERVAL_SECONDS, int(config.get("checkIntervalSeconds", DEFAULT_INTERVAL_SECONDS))
    )
    config["startupGraceSeconds"] = max(0, int(config.get("startupGraceSeconds", STARTUP_GRACE_SECONDS)))
    atomic_write_json(config_file(), config)
    return config


def load_state() -> dict[str, Any]:
    return read_json(state_file(), {})


def save_state(state: dict[str, Any]) -> None:
    atomic_write_json(state_file(), state)


def request_json(url: str, etag: str | None, logger: logging.Logger) -> tuple[dict[str, Any] | None, str | None]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
            **({"If-None-Match": etag} if etag else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return payload, response.headers.get("ETag")
    except urllib.error.HTTPError as error:
        if error.code == 304:
            return None, etag
        if error.code in (403, 429):
            raise UpdateError("GitHub 요청이 일시적으로 제한되었습니다. 다음 주기에 다시 시도합니다.") from error
        raise UpdateError(f"GitHub Release 조회 실패: HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise UpdateError(f"GitHub Release 조회 실패: {error}") from error


def latest_release(config: dict[str, Any], state: dict[str, Any], logger: logging.Logger) -> dict[str, Any]:
    payload, etag = request_json(config["latestReleaseUrl"], state.get("etag"), logger)
    if payload is None:
        cached = state.get("release")
        if not isinstance(cached, dict):
            raise UpdateError("GitHub 응답이 변경되지 않았지만 캐시된 Release가 없습니다.")
        return cached

    if payload.get("draft") or payload.get("prerelease"):
        raise UpdateError("최신 Release가 아직 공개 안정 버전이 아닙니다.")

    state["etag"] = etag
    state["release"] = payload
    save_state(state)
    return payload


def select_asset(release: dict[str, Any]) -> dict[str, Any]:
    assets = release.get("assets") or []
    candidates = [
        asset
        for asset in assets
        if isinstance(asset, dict)
        and str(asset.get("name", "")).lower().endswith(".zip")
        and any(
            marker in re.sub(r"[-_\s]", "", str(asset.get("name", "")).lower())
            for marker in ("menuboard", "kkunmandu")
        )
    ]
    if not candidates:
        candidates = [
            asset
            for asset in assets
            if isinstance(asset, dict) and str(asset.get("name", "")).lower().endswith(".exe")
        ]
    if not candidates:
        raise UpdateError("Release에서 메뉴판 ZIP 또는 EXE asset을 찾지 못했습니다.")
    return candidates[0]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_asset(asset: dict[str, Any], logger: logging.Logger) -> Path:
    name = Path(str(asset["name"])).name
    destination = state_directory() / "downloads" / name
    partial = destination.with_suffix(destination.suffix + ".part")
    partial.unlink(missing_ok=True)

    request = urllib.request.Request(
        str(asset["browser_download_url"]),
        headers={"Accept": "application/octet-stream", "User-Agent": USER_AGENT},
    )
    logger.info("다운로드 시작: %s", name)
    try:
        with urllib.request.urlopen(request, timeout=60) as response, partial.open("wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        partial.unlink(missing_ok=True)
        raise UpdateError(f"Release 다운로드 실패: {error}") from error

    os.replace(partial, destination)
    expected = str(asset.get("digest", ""))
    if expected.startswith("sha256:"):
        expected = expected.split(":", 1)[1].lower()
        actual = sha256_file(destination)
        if actual != expected:
            destination.unlink(missing_ok=True)
            raise UpdateError("다운로드한 파일의 SHA-256 검증에 실패했습니다.")
        logger.info("SHA-256 검증 완료: %s", actual)
    else:
        logger.warning("Release asset에 SHA-256 digest가 없어 파일 무결성 검증을 건너뜁니다.")
    return destination


def safe_extract(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            member_path = (destination / member.filename).resolve()
            if member_path != root and root not in member_path.parents:
                raise UpdateError("ZIP 내부에 허용되지 않은 경로가 포함되어 있습니다.")
        archive.extractall(destination)


def find_menu_executable(directory: Path) -> Path:
    candidates = [
        path
        for path in directory.rglob("*.exe")
        if "updater" not in path.name.lower() and "setup" not in path.name.lower()
    ]
    if not candidates:
        raise UpdateError("Release ZIP에서 메뉴판 EXE를 찾지 못했습니다.")
    preferred = [
        path
        for path in candidates
        if "menu" in path.name.lower() or "kkunmandu" in path.name.lower() or "꾼만두" in path.name
    ]
    return sorted(preferred or candidates, key=lambda path: len(str(path)))[0]


def process_is_running(process_name: str) -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", f"IMAGENAME eq {process_name}", "/FO", "CSV", "/NH"],
        capture_output=True,
        text=True,
        encoding="mbcs",
        errors="replace",
        check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return process_name.lower() in result.stdout.lower()


def stop_menu_board(process_name: str, logger: logging.Logger) -> None:
    if not process_is_running(process_name):
        return
    logger.info("실행 중인 메뉴판 종료: %s", process_name)
    subprocess.run(
        ["taskkill", "/IM", process_name, "/T", "/F"],
        capture_output=True,
        text=True,
        encoding="mbcs",
        errors="replace",
        check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if not process_is_running(process_name):
            return
        time.sleep(0.5)
    raise UpdateError("기존 메뉴판 프로세스가 종료되지 않았습니다.")


def remove_legacy_startup_executables(app_path: Path, logger: logging.Logger) -> None:
    """Remove only older menu-board EXEs from the managed startup folder."""
    if not app_path.parent.exists():
        return
    pattern = "Sexy-Kkunmandu-MenuBoard*.exe"
    for candidate in app_path.parent.glob(pattern):
        if candidate.resolve() == app_path.resolve():
            continue
        try:
            stop_menu_board(candidate.name, logger)
            candidate.unlink(missing_ok=True)
            logger.info("이전 메뉴판 EXE를 삭제했습니다: %s", candidate)
        except Exception as error:
            raise UpdateError(f"이전 메뉴판 EXE 삭제 실패: {candidate} ({error})") from error


def launch_menu_board(app_path: Path, logger: logging.Logger) -> None:
    if not app_path.exists():
        raise UpdateError(f"실행할 메뉴판 EXE가 없습니다: {app_path}")
    flags = (
        getattr(subprocess, "DETACHED_PROCESS", 0)
        | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        | getattr(subprocess, "CREATE_NO_WINDOW", 0)
    )
    logger.info("새 메뉴판 실행: %s", app_path)
    subprocess.Popen(
        [str(app_path)],
        cwd=str(app_path.parent),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        creationflags=flags,
    )


def wait_for_process(process_name: str, seconds: int = HEALTH_CHECK_SECONDS) -> bool:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if process_is_running(process_name):
            return True
        time.sleep(0.5)
    return process_is_running(process_name)


def replace_managed_exe(
    candidate: Path,
    app_path: Path,
    remote_version: tuple[int, int, int],
    logger: logging.Logger,
) -> None:
    app_path.parent.mkdir(parents=True, exist_ok=True)
    backup = state_directory() / "backup" / f"{app_path.stem}.previous.exe"
    staged = app_path.parent / f".{app_path.stem}.{os.getpid()}.new.exe"
    failed = state_directory() / "backup" / f"{app_path.stem}.failed.exe"
    process_name = app_path.name

    stop_menu_board(process_name, logger)
    if app_path.exists():
        shutil.copy2(app_path, backup)

    try:
        shutil.copy2(candidate, staged)
        os.replace(staged, app_path)
        remove_legacy_startup_executables(app_path, logger)
        launch_menu_board(app_path, logger)
        if not wait_for_process(process_name):
            raise UpdateError("새 메뉴판이 정상적으로 실행되지 않았습니다.")
    except Exception:
        staged.unlink(missing_ok=True)
        if app_path.exists() and backup.exists():
            failed.unlink(missing_ok=True)
            try:
                os.replace(app_path, failed)
            except OSError:
                app_path.unlink(missing_ok=True)
        if backup.exists():
            os.replace(backup, app_path)
            launch_menu_board(app_path, logger)
            logger.error("업데이트 실패로 이전 버전을 복구했습니다.")
        raise

    logger.info("메뉴판 EXE 교체 완료: v%s", version_text(remote_version))


def current_version(config: dict[str, Any], state: dict[str, Any]) -> tuple[int, int, int]:
    saved = parse_version(state.get("installedVersion"))
    if saved is not None:
        return saved
    app_path = Path(config["appPath"])
    from_name = parse_version(app_path.name)
    return from_name or (0, 0, 0)


def ensure_app_running(config: dict[str, Any], logger: logging.Logger) -> None:
    app_path = Path(config["appPath"])
    process_name = app_path.name
    if app_path.exists() and not process_is_running(process_name):
        launch_menu_board(app_path, logger)


def check_once(config: dict[str, Any], logger: logging.Logger, check_only: bool = False) -> dict[str, Any]:
    state = load_state()
    release = latest_release(config, state, logger)
    remote_version = parse_version(release.get("tag_name"))
    if remote_version is None:
        raise UpdateError("Release tag에서 버전을 읽지 못했습니다.")
    asset = select_asset(release)
    local_version = current_version(config, state)
    result = {
        "localVersion": version_text(local_version),
        "remoteVersion": version_text(remote_version),
        "releaseTag": release.get("tag_name"),
        "asset": asset.get("name"),
        "updated": False,
    }
    logger.info(
        "버전 확인: local=%s remote=%s asset=%s",
        result["localVersion"],
        result["remoteVersion"],
        result["asset"],
    )

    if remote_version <= local_version:
        if not check_only:
            ensure_app_running(config, logger)
        return result
    if check_only:
        return result

    try:
        app_path = Path(config["appPath"])
        send_notification_email(
            f"[섹시한 꾼만두] 메뉴판 업데이트 감지 v{version_text(remote_version)}",
            update_detection_body(local_version, remote_version, release, asset, app_path),
            logger,
        )

        archive = download_asset(asset, logger)
        staging = state_directory() / "staging" / f"release-{version_text(remote_version)}-{int(time.time())}"
        try:
            if archive.suffix.lower() == ".zip":
                safe_extract(archive, staging)
                candidate = find_menu_executable(staging)
            else:
                staging.mkdir(parents=True, exist_ok=True)
                candidate = staging / APP_EXE_NAME
                shutil.copy2(archive, candidate)
            replace_managed_exe(candidate, app_path, remote_version, logger)
        finally:
            shutil.rmtree(staging, ignore_errors=True)
            archive.unlink(missing_ok=True)

    except Exception as error:
        send_notification_email(
            f"[섹시한 꾼만두] 메뉴판 업데이트 실패 v{version_text(remote_version)}",
            update_result_body(
                local_version,
                remote_version,
                release,
                Path(config["appPath"]),
                False,
                str(error),
            ),
            logger,
        )
        raise

    state = load_state()
    state["installedVersion"] = version_text(remote_version)
    state["installedTag"] = release.get("tag_name")
    state["installedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    save_state(state)
    result["updated"] = True
    send_notification_email(
        f"[섹시한 꾼만두] 메뉴판 업데이트 성공 v{version_text(remote_version)}",
        update_result_body(
            local_version,
            remote_version,
            release,
            Path(config["appPath"]),
            True,
            "새 EXE 교체 및 실행을 확인했습니다.",
        ),
        logger,
    )
    return result


def create_scheduled_task(logger: logging.Logger) -> None:
    installed_updater = state_directory() / "SignageUpdater.exe"
    task_command = f'"{installed_updater}" --watch'
    result = subprocess.run(
        [
            "schtasks",
            "/Create",
            "/TN",
            TASK_NAME,
            "/SC",
            "ONLOGON",
            "/TR",
            task_command,
            "/RL",
            "LIMITED",
            "/F",
        ],
        capture_output=True,
        text=True,
        encoding="mbcs",
        errors="replace",
        check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode != 0:
        raise UpdateError(f"Windows 작업 스케줄러 등록 실패: {result.stderr or result.stdout}")
    logger.info("로그온 자동 실행 작업 등록 완료: %s", TASK_NAME)


def install(args: argparse.Namespace, logger: logging.Logger) -> None:
    config = load_config(args)
    ensure_directories()
    source = frozen_executable()
    installed_updater = state_directory() / "SignageUpdater.exe"
    if source.resolve() != installed_updater.resolve() and source.suffix.lower() == ".exe":
        shutil.copy2(source, installed_updater)
    elif source.suffix.lower() != ".exe":
        logger.warning("개발 모드 설치: Python 파일을 복사하지 않고 현재 경로를 사용합니다.")
    create_scheduled_task(logger)

    app_source = Path(args.app_source).expanduser().resolve() if args.app_source else None
    if app_source:
        app_path = Path(config["appPath"])
        app_path.parent.mkdir(parents=True, exist_ok=True)
        stop_menu_board(app_source.name, logger)
        shutil.copy2(app_source, app_path)
        remove_legacy_startup_executables(app_path, logger)
        launch_menu_board(app_path, logger)
        logger.info("기존 메뉴판을 Startup 폴더에 설치했습니다: %s", app_path)

    logger.info("설치 완료. 설정 파일: %s", config_file())


def uninstall(logger: logging.Logger) -> None:
    result = subprocess.run(
        ["schtasks", "/Delete", "/TN", TASK_NAME, "/F"],
        capture_output=True,
        text=True,
        encoding="mbcs",
        errors="replace",
        check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode == 0:
        logger.info("자동 실행 작업을 제거했습니다.")
    else:
        logger.info("제거할 자동 실행 작업이 없거나 이미 제거되었습니다.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="섹시한 꾼만두 메뉴판 자동 업데이트 프로그램")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--watch", action="store_true", help="로그온 후 주기적으로 업데이트 확인")
    mode.add_argument("--check-once", action="store_true", help="한 번 확인하고 종료")
    mode.add_argument("--check-only", action="store_true", help="다운로드/교체 없이 최신 버전만 확인")
    mode.add_argument("--install", action="store_true", help="업데이터를 설치하고 로그온 자동 실행 등록")
    mode.add_argument("--uninstall", action="store_true", help="로그온 자동 실행 제거")
    mode.add_argument("--configure-email", action="store_true", help="업데이트 메일 SMTP 설정 저장")
    parser.add_argument("--app-path", help="관리할 메뉴판 EXE 경로")
    parser.add_argument("--app-source", help="--install 시 Startup 폴더로 복사할 기존 메뉴판 EXE")
    parser.add_argument("--interval", type=int, help="확인 주기(초), 최소 60초")
    parser.add_argument("--startup-grace", type=int, help="로그온 후 첫 확인까지 대기할 초")
    parser.add_argument("--version", action="version", version=UPDATER_VERSION)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logger = setup_logging()
    try:
        if args.uninstall:
            uninstall(logger)
            return 0

        if args.configure_email:
            configure_email(logger)
            return 0

        config = load_config(args)
        if args.install:
            install(args, logger)
            return 0

        if args.watch or not (args.check_once or args.check_only):
            grace = int(config.get("startupGraceSeconds", STARTUP_GRACE_SECONDS))
            if grace:
                time.sleep(grace)
            while True:
                try:
                    check_once(config, logger)
                except Exception:
                    logger.exception("업데이트 확인 중 오류가 발생했습니다. 다음 주기에 재시도합니다.")
                time.sleep(int(config["checkIntervalSeconds"]))

        result = check_once(config, logger, check_only=args.check_only)
        if not getattr(sys, "frozen", False):
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception:
        logger.exception("업데이터 실행 실패")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
