"""exe 진입점.

두 가지 모드로 동작한다.
  - 인자 없이 실행(더블클릭) → GUI
  - 인자를 주고 실행 → CLI (`YTOrganizer-cli.exe status` 등)

GUI 쪽에서 하는 중요한 일은 시작 중 터진 예외를 대화상자로 보여주는 것이다.
윈도우 GUI 앱은 콘솔이 없어서, 이걸 안 하면 사용자 입장에서 "더블클릭했는데
아무 일도 안 일어남"이 된다 — 원인을 알 방법이 전혀 없다.
"""

import sys
import traceback


def _run_gui() -> int:
    try:
        from ytorg.ui import run

        return run()
    except Exception:  # noqa: BLE001 - 무엇이든 화면에 보여야 한다
        detail = traceback.format_exc()
        try:
            from ytorg.core import paths

            log_hint = f"\n\n자세한 기록: {paths.log_path()}"
        except Exception:  # noqa: BLE001
            log_hint = ""

        message = f"YTOrganizer를 시작하지 못했어.\n\n{detail}{log_hint}"
        try:
            from PySide6.QtWidgets import QApplication, QMessageBox

            app = QApplication.instance() or QApplication(sys.argv)
            QMessageBox.critical(None, "시작 실패", message)
        except Exception:  # noqa: BLE001 - Qt 자체가 안 올라온 경우
            print(message, file=sys.stderr)
            # 콘솔 없이 실행됐다면 파일로라도 남긴다
            try:
                from pathlib import Path

                Path.home().joinpath("YTOrganizer-오류.txt").write_text(
                    message, encoding="utf-8"
                )
            except OSError:
                pass
        return 1


def main() -> int:
    if len(sys.argv) > 1:
        from ytorg.cli import main as cli_main

        return cli_main()
    return _run_gui()


if __name__ == "__main__":
    sys.exit(main())
