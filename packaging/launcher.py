"""exe 진입점.

PyInstaller가 패키징하는 대상이다. 여기서 하는 일은 두 가지뿐:
  1. 시작 중 터진 예외를 사용자에게 보여준다. GUI 앱은 콘솔이 없어서
     그냥 두면 아무 창도 안 뜨고 조용히 죽는다 — 사용자 입장에서는
     "더블클릭했는데 아무 일도 안 일어남"이 된다.
  2. 로그 위치를 알려준다.
"""

import sys
import traceback


def main() -> int:
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


if __name__ == "__main__":
    sys.exit(main())
