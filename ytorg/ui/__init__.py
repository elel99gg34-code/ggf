"""GUI 진입점."""

from __future__ import annotations

import sys


def run() -> int:
    from PySide6.QtWidgets import QApplication

    from ..app import AppContext, setup_logging
    from .main_window import MainWindow

    setup_logging()

    app = QApplication(sys.argv)
    app.setApplicationName("YTOrganizer")
    app.setOrganizationName("YTOrganizer")

    ctx = AppContext.create()
    window = MainWindow(ctx)
    window.show()
    return app.exec()
