# 로컬비서 라이선스 발급 서버

관리자 혼자 쓰는 키 발급 사이트. 관리자 번호를 넣어야 잠금이 풀린다.

- **정품 라이선스**: 구매자용. 기한 없음.
- **개발자 라이선스**: 테스트·지인용. 기한을 고를 수 있고 앱에 '개발자'로 표시된다.
- **발급 기록**: 검색, 취소 표시(환불 등), CSV 내려받기.
- **일괄 발급**: 와디즈 서포터 명단(이름, 이메일, 주문번호)을 붙여 넣거나 CSV로 올리면 한 번에 발급한다.

앱은 인터넷 없이 서명만 확인한다. 그래서 '취소'는 기록일 뿐이고, 이미 등록한 키를 원격으로 막지는 못한다.

## 설정 (환경변수)

| 이름 | 내용 |
|---|---|
| `ADMIN_PIN` | 관리자 잠금 해제 번호. **코드·저장소에 넣지 않는다.** |
| `LICENSE_PRIVATE_KEY` | 서명 개인키 PEM. 앱의 `engine/localbiseo/core/license_pubkey.pem`과 짝이어야 한다. 줄바꿈은 그대로 넣거나 `\n`으로 넣는다. |
| `DATABASE_URL` | 발급 기록 DB. Render Postgres의 Internal Database URL. 없으면 이 폴더의 `licenses.db`(SQLite). |

보안
- 관리자 번호를 한 주소에서 5번 틀리면 15분 잠긴다. 모든 주소를 합쳐 15분에 20번 틀려도 잠긴다.
- 잠금 해제는 30분 동안 아무것도 안 하면 풀린다. 서버가 다시 뜨면 모두 다시 잠긴다.
- 쿠키는 HttpOnly, SameSite=Strict, HTTPS에서 Secure.

## Render 배포

- 빌드: `pip install -r server/requirements.txt`
- 시작: `uvicorn --app-dir server app:create_app_from_env --factory --host 0.0.0.0 --port $PORT`
- 무료 웹 서비스는 15분 동안 접속이 없으면 잠들고, 다음 접속이 30초쯤 느리다.
- 무료 Postgres는 만든 지 30일이 지나면 만료된다. 발급 기록을 지키려면 유료 플랜(basic_256mb)으로 올리거나, 그 전에 **CSV 내려받기**로 백업한다. 기록이 사라져도 이미 발급한 키는 계속 쓸 수 있다.

## 로컬 실행

```bash
pip install -r server/requirements.txt
ADMIN_PIN=123456 LICENSE_PRIVATE_KEY="$(cat ~/.localbiseo-signing/private.pem)" \
  uvicorn --app-dir server app:create_app_from_env --factory --port 8000
```

## 서명 키를 바꾸면

1. `python tools/license_gen.py keygen --private <개인키 경로>` → 앱의 공개키 파일이 바뀐다.
2. 바뀐 공개키를 커밋하고 설치 파일을 다시 만든다(`[installer]`).
3. 서버의 `LICENSE_PRIVATE_KEY`를 새 개인키로 바꾼다.
4. 예전 키로 발급한 라이선스는 새 설치 파일에서 쓸 수 없다. 꼭 필요할 때만 바꾼다.
