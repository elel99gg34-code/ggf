"""엔진 실행: python -m localbiseo --port 0 --token XXX

앱 셸(Tauri)이 자식 프로세스로 띄운다. 준비되면 표준출력에
'LOCALBISEO_READY <port>' 한 줄을 찍고, 표준입력이 닫히면(앱 종료) 같이 끝난다.
"""
from __future__ import annotations

import argparse
import os
import socket
import sys
import threading
import time
from pathlib import Path


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _watch_stdin() -> None:
    try:
        while sys.stdin.read(1024):
            pass
    except Exception:  # noqa: BLE001
        pass
    os._exit(0)


def main() -> None:
    ap = argparse.ArgumentParser(prog="localbiseo-engine")
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--token", default=os.environ.get("LOCALBISEO_TOKEN"))
    ap.add_argument("--data-dir", default=None)
    ap.add_argument("--dev-origin", action="append", default=[], help="개발용으로 허용할 추가 Origin")
    ap.add_argument("--watch-stdin", action="store_true", help="표준입력이 닫히면 종료")
    args = ap.parse_args()

    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.data_dir:
        os.environ["LOCALBISEO_HOME"] = args.data_dir

    import uvicorn

    from .app import create_app

    port = args.port or _free_port()
    app = create_app(token=args.token, data_dir=Path(args.data_dir) if args.data_dir else None, extra_origins=args.dev_origin)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning", access_log=False))

    def announce() -> None:
        while not server.started:
            time.sleep(0.05)
        print(f"LOCALBISEO_READY {port}", flush=True)

    threading.Thread(target=announce, daemon=True).start()
    if args.watch_stdin:
        threading.Thread(target=_watch_stdin, daemon=True).start()
    server.run()


if __name__ == "__main__":
    main()
