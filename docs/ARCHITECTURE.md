# 맘케어 구조와 설계

## 전체 구성

```
[Android 앱] ──HTTPS(JSON, Bearer JWT)──▶ [Ktor 서버] ──▶ [SQLite 또는 PostgreSQL]
     │                                         │
     └─ Room(SQLite) 로컬 DB                    └─ 사용자 계정 + 암호화된 백업(blob)
```

- 앱은 **로컬 우선(offline-first)** 이다. 모든 기록은 기기의 Room DB에 저장되고, 서버는 계정과 백업만 담당한다.
- 서버는 백업 내용을 해석할 수 없다. 앱이 업로드 전에 암호화한다.

## 앱 계층

| 계층 | 위치 | 역할 |
|---|---|---|
| 진입점 | `MainActivity`, `MomCareApp` | 잠금 화면 분기, 알림 권한, 알림 딥링크, 앱 시작 시 알림 재등록 |
| DI | `data/AppDatabase.kt`의 `AppContainer` | DB, 설정(Prefs), 세션, API, 백업 매니저를 한 곳에서 생성 (수동 DI) |
| 데이터 | `data/Entities.kt`, `data/ExtraEntities.kt`, `data/Daos.kt` | Room 엔티티 41개, DAO. 아이 삭제 시 관련 기록은 외래키 CASCADE로 함께 삭제 |
| 원격 | `data/remote/` | `ApiClient`(HttpURLConnection), `SessionStore`, `BackupCrypto`(PBKDF2 + AES-GCM), `BackupManager`(DB+사진 zip 묶음) |
| 콘텐츠 | `content/` | 상담 스킬, 접종 일정, 발달 이정표, WHO 성장 기준 근사, 응급처치, EPDS 등 정적 데이터 |
| 알림 | `notif/Reminders.kt` | WorkManager 일회성/매일 반복 체인, 상담 스킬 알람 워커 |
| UI | `ui/` | Compose 화면, 화면별 `AndroidViewModel`, 공통 컴포넌트, 차트(Canvas 직접 구현) |

### ViewModel 패턴
- 모든 ViewModel은 `BaseViewModel`을 상속한다.
- `forChild { childId -> flow }`: 선택된 아이가 바뀌면 자동으로 해당 아이의 데이터 Flow로 전환된다.
- 쓰기 작업은 `io { }`로 IO 디스패처에서 실행한다.

### 비공개(숨김) 기능
- `ui/nav/Features.kt`의 `Privacy`(CHILD, PREGNANCY, DIAPER)와 `Visibility`로 관리한다.
- 설정값은 `Prefs.showChild / showPregnancy / showDiaper`이고, 기본값은 모두 `false`다.
- 홈 화면은 `Features.byGroup(visibility)`로 보이는 기능만 그린다.
- 네비게이션 목적지도 `screen()` 헬퍼가 매번 설정을 확인해서, 숨겨진 기능에 들어오면 "숨겨진 기능" 화면을 보여준다. (알림 딥링크 포함)
- 아이 기능이 꺼져 있으면 `LocalChild`/`LocalChildren`에 아이 정보를 넣지 않는다.

### 알림
| 종류 | 방식 | 키 |
|---|---|---|
| 투약 | 매일 같은 시각, 종료일까지 (`DailyWorker`가 다음 날을 재예약) | `med_{id}_{n}` |
| 병원 예약 / 가족 일정 | 지정 시간 전 1회 (`NotifyWorker`) | `appt_{id}`, `event_{id}` |
| 상담 스킬 알람 | 요일 마스크 기반 다음 시각 계산 → 울릴 때 스킬 선택·체크인 기록 → 재예약 (`CounselAlarmWorker`) | `counsel_alarm_{id}` |

앱이 시작될 때 `Reminders.rescheduleAll()`이 저장된 알람을 다시 등록한다.

### 백업 형식
1. Room WAL 체크포인트 → DB 파일 + 일기 사진을 zip으로 묶는다.
2. `MAGIC("MCB"+버전) + IV(12B) + AES-256-GCM 암호문`
3. 서버 백업 키 = PBKDF2(비밀번호, "momcare-backup:" + 이메일, 120,000회). 키는 기기에만 저장하고 서버로 보내지 않는다.
4. 파일 백업 키 = 사용자가 정한 별도 비밀번호에서 파생한다.
5. 복원 시 zip 경로를 검증(경로 조작 방지)하고 SQLite 헤더를 확인한 뒤 DB를 교체하고 앱을 재시작한다.

## 서버

| 파일 | 역할 |
|---|---|
| `Application.kt` | Ktor 모듈, 라우팅, 인증, 오류 처리 |
| `Config.kt` | 환경 변수, `DATABASE_URL`(postgres:// → JDBC 변환) |
| `Database.kt` | Exposed 테이블(users, backups)과 저장소 |
| `Security.kt` | PBKDF2 비밀번호 해시, JWT 발급, 시도 횟수 제한, 입력 검증 |
| `Models.kt` | 요청·응답 DTO |

자세한 API는 [`server/README.md`](../server/README.md)를 참고한다.
