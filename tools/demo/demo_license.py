"""시연 녹화용 라이선스. 녹화할 때만 쓰는 서명 키를 새로 만들고, 그 키로 서명한 라이선스 키를 출력한다.

소스로 돌리는 엔진은 LOCALBISEO_LICENSE_PUBKEY로 공개키를 바꿀 수 있다(배포판은 무시).
    python tools/demo/demo_license.py <폴더>   # <폴더>/pub.pem 생성, 라이선스 키는 표준 출력
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "engine"))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey  # noqa: E402

from localbiseo.core.license import sign  # noqa: E402

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
key = Ed25519PrivateKey.generate()
(out / "pub.pem").write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
print(sign({"id": "DEMO-0001", "name": "시연용", "ed": "pro"}, key))
