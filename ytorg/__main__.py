"""python -m ytorg 로 GUI를 띄운다.

명령줄 인자가 있으면 CLI로 넘긴다 (ytorg demo, ytorg status 등).
"""

import sys

if len(sys.argv) > 1:
    from .cli import main

    sys.exit(main())
else:
    from .ui import run

    sys.exit(run())
