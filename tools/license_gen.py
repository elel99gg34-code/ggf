"""라이선스 키 발급 도구 (판매자 전용, 앱에 포함하지 않는다).

  # 1) 서명 키 만들기 (한 번만). 개인키는 절대 저장소에 올리지 말 것.
  python tools/license_gen.py keygen --private ~/.localbiseo-signing/private.pem

  # 2) 키 발급 (와디즈 서포터 1명당 1개)
  python tools/license_gen.py issue --private ~/.localbiseo-signing/private.pem --id WADIZ-0001 --name 홍길동

  # 3) CSV로 한꺼번에 발급 (열: id,name) → 키가 추가된 CSV 출력
  python tools/license_gen.py batch --private ~/.localbiseo-signing/private.pem backers.csv out.csv
"""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engine"))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey  # noqa: E402

from localbiseo.core.license import sign  # noqa: E402

PUBKEY_OUT = Path(__file__).resolve().parent.parent / "engine" / "localbiseo" / "core" / "license_pubkey.pem"


def load_private(path: str) -> Ed25519PrivateKey:
    return serialization.load_pem_private_key(Path(path).expanduser().read_bytes(), password=None)


def cmd_keygen(args) -> None:
    priv_path = Path(args.private).expanduser()
    if priv_path.exists() and not args.force:
        sys.exit(f"이미 있어요: {priv_path} (덮어쓰려면 --force)")
    priv_path.parent.mkdir(parents=True, exist_ok=True)
    key = Ed25519PrivateKey.generate()
    priv_path.write_bytes(
        key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    )
    priv_path.chmod(0o600)
    PUBKEY_OUT.write_bytes(
        key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    )
    print(f"개인키: {priv_path}\n공개키(앱에 포함): {PUBKEY_OUT}")


def make_payload(lic_id: str, name: str, edition: str, exp: str | None) -> dict:
    payload = {"id": lic_id, "name": name, "ed": edition, "iat": date.today().isoformat()}
    if exp:
        payload["exp"] = exp
    return payload


def cmd_issue(args) -> None:
    print(sign(make_payload(args.id, args.name, args.edition, args.exp), load_private(args.private)))


def cmd_batch(args) -> None:
    key = load_private(args.private)
    with open(args.input, newline="", encoding="utf-8-sig") as f, open(args.output, "w", newline="", encoding="utf-8-sig") as out:
        reader = csv.DictReader(f)
        writer = csv.DictWriter(out, fieldnames=[*(reader.fieldnames or []), "license_key"])
        writer.writeheader()
        for row in reader:
            row["license_key"] = sign(make_payload(row["id"], row.get("name", ""), args.edition, args.exp), key)
            writer.writerow(row)
    print(f"완료: {args.output}")


def main() -> None:
    ap = argparse.ArgumentParser(description="로컬비서 라이선스 키 발급")
    sub = ap.add_subparsers(required=True)
    k = sub.add_parser("keygen")
    k.add_argument("--private", required=True)
    k.add_argument("--force", action="store_true")
    k.set_defaults(fn=cmd_keygen)
    for name, fn in (("issue", cmd_issue), ("batch", cmd_batch)):
        p = sub.add_parser(name)
        p.add_argument("--private", required=True)
        p.add_argument("--edition", default="pro")
        p.add_argument("--exp", help="만료일 YYYY-MM-DD (없으면 평생)")
        if name == "issue":
            p.add_argument("--id", required=True)
            p.add_argument("--name", default="")
        else:
            p.add_argument("input")
            p.add_argument("output")
        p.set_defaults(fn=fn)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
