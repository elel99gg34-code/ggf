# 맘케어 (MomCare)

엄마를 위한 올인원 안드로이드 앱. 상담 스킬 코치, 엄마 마음건강, 가족 살림을 기본으로 제공하고, 육아·임신 관련 기능은 **비공개(숨김)** 상태로 시작해 설정에서 켤 수 있다.

- **앱**: Kotlin · Jetpack Compose · Material 3 · Room · WorkManager (`app/`)
- **서버**: Kotlin · Ktor · Exposed · SQLite/PostgreSQL · JWT (`server/`)
- 전체 기능 목록: [`docs/FEATURES.md`](docs/FEATURES.md)
- 구조와 설계: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 서버 API: [`server/README.md`](server/README.md)
- **휴대폰 설치 방법(QR): [`docs/INSTALL.md`](docs/INSTALL.md)** · [APK 바로 받기](https://github.com/elel99gg34-code/ggf/releases/download/momcare-latest/momcare.apk)

## 기능 요약 (44개 화면 기능)

| 분류 | 기본 공개 | 주요 기능 |
|---|---|---|
| 💬 상담·소통 | ✅ | 상담 스킬 코치(6개 분야 27개 스킬), **상담 스킬 알람**, 상담 일지 |
| 🌷 엄마 케어 | ✅ | 마음 건강(EPDS 자가점검), 셀프케어, 백색소음, 일기 |
| 🏠 가족 살림 | ✅ | 캘린더, 할 일, 장보기, 주간 식단, 레시피북, 가계부, 소모품 재고, 기념일, 병원 예약 |
| 🚑 안전 | ✅ | 응급처치 가이드, 비상 연락처 |
| 🤰 임신·출산 | 🔒 설정에서 켜기 | 임신 주차·태동 카운터, 진통 타이머(5-1-1 알림) |
| 👶 아이·육아 | 🔒 설정에서 켜기 | 아이 프로필, 수유·이유식·수면, 패턴 분석, 리포트, 성장·백분위, 접종, 체온, 투약, 알레르기, 발달, 울음 도우미, 습관, 칭찬 스티커, 독서, 준비물, 놀이, 팁, 집 안전 점검, 외출 가방, 돌봄 인수인계, 육아용품 |
| 🧷 기저귀 | 🔒 설정에서 켜기 | 기저귀 기록, 기저귀 재고·체크 항목 |

## 보안·개인정보

- **앱 잠금**: 첫 실행 때 가족 비밀번호를 한 번 입력하면 이후로는 바로 열린다. 비밀번호는 평문이 아니라 솔트를 붙인 SHA-256 해시로만 소스에 들어 있다(`data/AppLock.kt`). 설정에서 다시 잠글 수 있다.
- **비공개 기능**: 아이·임신·기저귀 기능은 꺼져 있으면 홈·메뉴에 나타나지 않고, 알림 링크로도 열리지 않는다. 아이 기능이 꺼져 있으면 아이 이름도 화면에 전달되지 않는다.
- **서버 백업은 종단간 암호화**: 비밀번호에서 기기 안에서 만든 키(PBKDF2)로 AES-256-GCM 암호화한 뒤 업로드한다. 서버에는 암호문만 저장되어 서버 관리자도 내용을 볼 수 없다.
- **서버 계정 보안**: 비밀번호는 PBKDF2-HMAC-SHA256(21만 회, 무작위 솔트)으로 저장한다. 로그인·가입 시도 횟수를 제한하고, 비밀번호를 바꾸면 기존 토큰이 모두 무효가 된다.
- 로그인은 선택 사항이다. 로그인하지 않아도 모든 기능을 기기 안에서 쓸 수 있고, 암호화된 파일 백업도 가능하다.

## 빌드·실행

### 앱
1. Android Studio(Koala 이상)에서 저장소 루트 폴더를 연다.
2. Gradle 동기화 후 `app` 구성을 실행한다. (minSdk 26, targetSdk 34)
3. 첫 실행 시 가족 비밀번호를 입력한다.
4. 육아·임신 기능이 필요하면 **설정 → 기능 표시**에서 켠다.

> **휴대폰에 바로 설치하려면** Android Studio 없이 [`docs/INSTALL.md`](docs/INSTALL.md)의 QR 코드나 [APK 링크](https://github.com/elel99gg34-code/ggf/releases/download/momcare-latest/momcare.apk)를 쓴다.
> 앱은 코드가 바뀔 때마다 GitHub Actions(`.github/workflows/android-apk.yml`)에서 자동으로 빌드·단위 테스트를 거쳐 `momcare-latest` 릴리스에 올라간다.

### 서버 (로컬)
```bash
cd server
gradle run
```
- 기본 DB: `server/data/momcare.db` (SQLite)
- 에뮬레이터 앱의 기본 서버 주소 `http://10.0.2.2:8080`으로 바로 접속된다.
- 실제 기기에서는 HTTPS 서버를 배포한 뒤 앱 **설정 → 서버 주소**를 바꾼다. (앱은 보안상 로컬 주소 외에는 HTTP를 허용하지 않는다.)

### 서버 테스트
```bash
cd server
gradle test
```

### 서버 배포 (예: Render)
`server/render.yaml` 블루프린트에 Docker 웹 서비스 + PostgreSQL 구성이 들어 있다. Render 대시보드에서 저장소를 연결해 배포한다. 운영 환경(`APP_ENV=production`)에서는 32자 이상의 `JWT_SECRET`이 필수다.

## 폴더 구조

```
app/src/main/java/com/momcare/app/
├── MainActivity.kt, MomCareApp.kt   앱 진입점, 잠금 화면, 알림 딥링크
├── data/                            Room 엔티티·DAO·DB, 설정(Prefs), 앱 잠금
│   └── remote/                      서버 API, 로그인 세션, 백업 암호화·복원
├── content/                         상담 스킬, 접종 일정, 발달 이정표, 성장 기준, 레시피 등 콘텐츠
├── notif/                           WorkManager 알림 (투약·예약·일정·상담 스킬 알람)
├── util/                            날짜 유틸, 백색소음 합성기
└── ui/
    ├── nav/                         기능 목록·비공개 규칙(Features.kt), 네비게이션
    ├── components/                  공통 UI 컴포넌트, 차트
    ├── theme/                       색상·타이포그래피
    └── screens/                     분야별 화면
server/                              Ktor 서버, 테스트, Dockerfile, render.yaml
docs/                                기능·구조 문서
```
