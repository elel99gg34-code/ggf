# 맘케어 서버

Ktor 2 기반 계정·백업 서버. 앱이 암호화한 백업만 보관하며 내용을 해석하지 않는다.

## 실행

```bash
gradle run          # 개발 서버 (http://localhost:8080)
gradle test         # 테스트
gradle fatJar       # build/libs/momcare-server-1.0.0-all.jar
```

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8080` | 포트 |
| `DATABASE_URL` | `jdbc:sqlite:data/momcare.db` | `jdbc:...` 또는 `postgres://user:pass@host:port/db` |
| `DB_USER`, `DB_PASSWORD` | – | JDBC URL을 쓸 때 DB 계정 |
| `JWT_SECRET` | 개발 모드에서는 임시 키 | **운영 필수**, 32자 이상 |
| `APP_ENV` | – | `production`이면 운영 모드 (JWT_SECRET 필수) |
| `MAX_BACKUP_MB` | `25` | 백업 최대 크기 |

## API

모든 오류 응답 형식: `{"error": "한국어 메시지"}`

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/health` | – | 상태 확인 |
| POST | `/api/auth/signup` | – | `{email, password, nickname}` → `201 {token, user}` / 409 중복 / 400 검증 실패 |
| POST | `/api/auth/login` | – | `{email, password}` → `{token, user}` / 401 / 429 (15분 10회 제한) |
| GET | `/api/me` | JWT | 내 정보 |
| POST | `/api/auth/password` | JWT | `{currentPassword, newPassword}` → 새 토큰 (이전 토큰은 모두 무효) |
| POST | `/api/account/delete` | JWT | `{password}` → 계정과 백업 영구 삭제 |
| PUT | `/api/backup` | JWT | 본문: 암호화된 바이트(`application/octet-stream`) → `{updatedAt, size}` / 413 |
| GET | `/api/backup/info` | JWT | `{updatedAt, size}` / 404 |
| GET | `/api/backup` | JWT | 암호화된 바이트 / 404 |

### 보안 설계
- 비밀번호: PBKDF2-HMAC-SHA256, 210,000회, 16바이트 무작위 솔트, 상수 시간 비교
- 존재하지 않는 이메일로 로그인할 때도 더미 해시를 검증해 응답 시간 차이로 가입 여부가 드러나지 않게 함
- JWT(HS256, 30일) + `ver` 클레임: 비밀번호 변경 시 버전을 올려 기존 토큰 무효화
- 로그인(IP+이메일, 15분 10회), 회원가입(IP, 1시간 20회), 비밀번호 변경 시도 제한
- 업로드는 최대 크기 + 1바이트까지만 읽어서 대용량 요청으로 메모리를 소모시키는 공격 방지
- 응답 헤더 `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`

## 배포
- `Dockerfile`: 멀티 스테이지 빌드, 비루트 사용자로 실행
- `render.yaml`: Render 블루프린트 (웹 서비스 + PostgreSQL, JWT_SECRET 자동 생성)
