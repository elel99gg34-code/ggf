"""OAuth 인증과 토큰 보관.

데스크톱 앱이라 loopback 방식을 쓴다: 브라우저를 띄우고, 로컬에서 잠깐 열린
127.0.0.1 포트로 인증 코드를 돌려받는다.

client_secret에 대하여:
    데스크톱 앱의 client_secret은 exe 안에 들어갈 수밖에 없고, Google도 이를
    비밀로 취급하지 않는다(추출돼도 loopback 리디렉션 때문에 남의 계정을
    털 수 없다). 그래서 리소스 파일로 동봉하되, 파워 유저는 설정에서 자기
    Cloud 프로젝트의 것으로 바꿀 수 있게 한다.

    바꿀 수 있게 만드는 게 중요한 이유: 할당량은 '프로젝트당' 하루 10,000유닛
    이라서, 같은 동봉 파일을 쓰는 사람이 여럿이면 그 10,000을 나눠 쓴다.
    자기 프로젝트를 쓰면 온전한 10,000유닛을 혼자 쓴다.

리프레시 토큰은 keyring(윈도우 자격 증명 관리자)에 넣는다. 평문 파일로 두면
그 파일 하나로 계정의 유튜브 권한이 통째로 넘어간다.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from . import paths

log = logging.getLogger(__name__)

KEYRING_SERVICE = "YTOrganizer"
KEYRING_USER = "youtube-oauth"

# 필요한 최소 권한만 요청한다.
# youtube 스코프 하나로 읽기·쓰기가 모두 되지만, 읽기 전용으로만 쓰고 싶은
# 사람을 위해 분리해 둔다. force-ssl(댓글·자막까지)은 요청하지 않는다.
SCOPE_READONLY = "https://www.googleapis.com/auth/youtube.readonly"
SCOPE_MANAGE = "https://www.googleapis.com/auth/youtube"
DEFAULT_SCOPES = [SCOPE_MANAGE]


class AuthError(Exception):
    pass


@dataclass
class ClientConfig:
    """OAuth 클라이언트 설정과 그 출처."""

    data: dict
    source: str  # 'user' | 'bundled'

    @property
    def is_user_supplied(self) -> bool:
        return self.source == "user"

    @property
    def project_hint(self) -> str:
        block = self.data.get("installed") or self.data.get("web") or {}
        return block.get("project_id", "") or ""


def user_client_secret_path() -> Path:
    """사용자가 직접 넣은 client_secret.json 위치."""
    return paths.data_dir() / "client_secret.json"


def load_client_config() -> ClientConfig:
    """사용자 지정 파일이 있으면 그것을, 없으면 동봉본을 쓴다."""
    user_path = user_client_secret_path()
    if user_path.exists():
        try:
            return ClientConfig(json.loads(user_path.read_text(encoding="utf-8")), "user")
        except (OSError, json.JSONDecodeError) as exc:
            raise AuthError(
                f"내 client_secret.json을 읽지 못했어: {exc}\n"
                f"파일을 지우면 기본 설정으로 돌아가."
            ) from exc

    bundled = paths.resource_dir() / "client_secret.json"
    if bundled.exists():
        try:
            return ClientConfig(json.loads(bundled.read_text(encoding="utf-8")), "bundled")
        except (OSError, json.JSONDecodeError) as exc:
            raise AuthError(f"동봉된 인증 설정이 손상됐어: {exc}") from exc

    raise AuthError(
        "OAuth 설정 파일이 없어.\n"
        "설정 화면에서 client_secret.json을 등록하거나, docs/SETUP_GOOGLE_CLOUD.md를 따라 "
        "Google Cloud 프로젝트를 만들어줘."
    )


def _validate_client_config(config: ClientConfig) -> None:
    """설치형(desktop) 클라이언트인지 확인.

    사람들이 '웹 애플리케이션' 유형으로 만들어서 받는 실수가 잦은데, 그러면
    loopback 리디렉션이 등록돼 있지 않아 인증 도중에 redirect_uri_mismatch가
    난다. 그 에러 메시지는 원인을 전혀 알려주지 않으므로 미리 잡는다.
    """
    if "installed" not in config.data:
        if "web" in config.data:
            raise AuthError(
                "이 client_secret.json은 '웹 애플리케이션' 유형이야.\n"
                "Google Cloud Console에서 애플리케이션 유형을 '데스크톱 앱'으로 "
                "다시 만들어서 받아줘."
            )
        raise AuthError("client_secret.json 형식이 올바르지 않아('installed' 항목이 없음).")


# ---- 토큰 보관 ----------------------------------------------------------

def _keyring():
    import keyring

    return keyring


def save_credentials(creds) -> None:
    """리프레시 토큰을 OS 자격 증명 저장소에 넣는다."""
    payload = creds.to_json()
    try:
        _keyring().set_password(KEYRING_SERVICE, KEYRING_USER, payload)
    except Exception as exc:  # noqa: BLE001 - 백엔드 종류가 OS마다 달라 광범위하게 잡는다
        # 헤드리스 리눅스 등 키링 백엔드가 없는 환경에서는 파일로 떨어뜨리되
        # 권한을 좁히고 경고를 남긴다.
        log.warning("키링 저장 실패(%s). 파일로 대체 저장함.", exc)
        fallback = paths.data_dir() / "token.json"
        fallback.write_text(payload, encoding="utf-8")
        try:
            fallback.chmod(0o600)
        except OSError:
            pass


def load_credentials():
    from google.oauth2.credentials import Credentials

    raw = None
    try:
        raw = _keyring().get_password(KEYRING_SERVICE, KEYRING_USER)
    except Exception as exc:  # noqa: BLE001
        log.warning("키링 조회 실패(%s).", exc)

    if not raw:
        fallback = paths.data_dir() / "token.json"
        if fallback.exists():
            raw = fallback.read_text(encoding="utf-8")

    if not raw:
        return None
    try:
        return Credentials.from_authorized_user_info(json.loads(raw))
    except (json.JSONDecodeError, ValueError) as exc:
        log.warning("저장된 토큰이 손상됨(%s). 다시 로그인 필요.", exc)
        return None


def clear_credentials() -> None:
    """로그아웃."""
    try:
        _keyring().delete_password(KEYRING_SERVICE, KEYRING_USER)
    except Exception:  # noqa: BLE001 - 없는 항목을 지울 때도 예외가 난다
        pass
    fallback = paths.data_dir() / "token.json"
    if fallback.exists():
        fallback.unlink()


# ---- 인증 흐름 ----------------------------------------------------------

def get_credentials(scopes: list[str] | None = None, interactive: bool = True):
    """유효한 자격 증명을 돌려준다. 필요하면 브라우저를 띄운다.

    interactive=False면 저장된 토큰만 시도하고, 없거나 만료됐으면 None.
    (앱 시작 시 조용히 복구를 시도할 때 쓴다.)
    """
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import Request

    scopes = scopes or DEFAULT_SCOPES
    creds = load_credentials()

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            save_credentials(creds)
            return creds
        except RefreshError as exc:
            # 동의 화면이 '테스트' 상태면 리프레시 토큰이 7일 만에 만료된다.
            # 비밀번호 변경이나 권한 회수로도 같은 일이 생긴다.
            log.info("토큰 갱신 실패(%s). 재로그인이 필요함.", exc)
            clear_credentials()
            creds = None

    if not interactive:
        return None

    return run_oauth_flow(scopes)


def run_oauth_flow(scopes: list[str] | None = None):
    """브라우저를 열어 새로 로그인한다."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    scopes = scopes or DEFAULT_SCOPES
    config = load_client_config()
    _validate_client_config(config)

    flow = InstalledAppFlow.from_client_config(config.data, scopes)
    # port=0 이면 빈 포트를 OS가 골라준다. 고정 포트를 쓰면 다른 프로그램과
    # 충돌하거나 방화벽에 걸릴 수 있다.
    creds = flow.run_local_server(
        port=0,
        prompt="consent",          # 리프레시 토큰을 확실히 받기 위해
        access_type="offline",
        authorization_prompt_message="브라우저에서 유튜브 계정으로 로그인해줘...",
        success_message="인증됐어. 이 창은 닫아도 돼.",
        open_browser=True,
    )
    save_credentials(creds)
    return creds


def is_logged_in() -> bool:
    return load_credentials() is not None
