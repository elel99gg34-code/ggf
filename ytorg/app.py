"""앱 컨텍스트 — GUI와 CLI가 공유하는 조립 지점.

여기서 DB·원장·API·동기화·작업 큐를 한 번에 엮는다. UI는 이 객체만 알면
되고, UI 없이(CLI, 테스트) 같은 기능을 그대로 쓸 수 있다.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from .core import auth, paths
from .core.api import YouTubeAPI, build_service
from .core.cache import Database
from .core.quota import QuotaLedger
from .core.sync import Syncer
from .jobs.executor import JobExecutor, UndoManager
from .jobs.queue import JobQueue
from .rules.engine import RuleEngine
from .rules.schema import load_rules
from .settings import Settings

log = logging.getLogger(__name__)


def setup_logging(verbose: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(paths.log_path(), encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


@dataclass
class AppContext:
    settings: Settings
    db: Database
    ledger: QuotaLedger
    queue: JobQueue
    api: YouTubeAPI | None = None
    syncer: Syncer | None = None
    executor: JobExecutor | None = None
    undo: UndoManager | None = None
    rule_warnings: tuple[str, ...] = ()

    @classmethod
    def create(cls, settings: Settings | None = None) -> "AppContext":
        """API 없이 먼저 만든다. 로그인 전에도 캐시를 보여줄 수 있어야 하니까."""
        settings = settings or Settings.load()
        db = Database()
        ledger = QuotaLedger(db, settings.daily_limit, settings.quota_reserve)
        return cls(settings=settings, db=db, ledger=ledger, queue=JobQueue(db))

    @property
    def is_connected(self) -> bool:
        return self.api is not None

    def connect(self, interactive: bool = True) -> bool:
        """유튜브에 연결한다. 이미 저장된 토큰이 있으면 조용히 붙는다."""
        credentials = auth.get_credentials(interactive=interactive)
        if credentials is None:
            return False

        service = build_service(credentials)
        self.api = YouTubeAPI(service, self.ledger, self.settings.rate_limit_per_sec)
        self.syncer = Syncer(self.api, self.db, self.ledger)
        self.executor = JobExecutor(self.api, self.db, self.ledger, self.queue)
        self.undo = UndoManager(self.api, self.db, self.ledger, self.queue)
        return True

    def attach(self, api: YouTubeAPI) -> None:
        """이미 만들어진 API를 꽂는다(테스트·오프라인 검증용)."""
        self.api = api
        self.syncer = Syncer(api, self.db, self.ledger)
        self.executor = JobExecutor(api, self.db, self.ledger, self.queue)
        self.undo = UndoManager(api, self.db, self.ledger, self.queue)

    def disconnect(self) -> None:
        auth.clear_credentials()
        self.api = self.syncer = self.executor = self.undo = None

    def rule_engine(self) -> RuleEngine:
        rules, warnings = load_rules()
        self.rule_warnings = tuple(warnings)
        return RuleEngine(rules)

    def classifier(self):
        """설정과 키 상태에 따라 AI 또는 규칙 엔진을 돌려준다.

        AI를 켜뒀어도 키가 없으면 조용히 규칙으로 내려간다 — 정리를 아예 못
        하게 만드는 것보다 낫다.
        """
        if not self.settings.use_ai:
            return self.rule_engine()

        from .ai.classifier import AiClassifier, AiSettings, is_available

        if not is_available():
            log.info("AI를 켰지만 키가 없어 규칙 엔진으로 진행")
            return self.rule_engine()

        return AiClassifier(AiSettings(
            model=self.settings.ai_model,
            max_playlists=self.settings.max_ai_playlists,
            min_group_size=self.settings.min_group_size,
        ))

    def quota_line(self) -> str:
        """상단 표시줄에 늘 띄우는 한 줄."""
        remaining = self.ledger.remaining()
        spent = self.ledger.spent()
        writes = self.ledger.spendable() // 50
        if self.ledger.is_exhausted():
            return "오늘 할당량 소진 — 태평양시 자정에 리셋돼"
        return (f"오늘 남은 유닛 {remaining:,} / {self.settings.daily_limit:,} "
                f"(사용 {spent:,}) · 쓰기 작업 약 {writes}건 가능")

    def close(self) -> None:
        self.db.close()
