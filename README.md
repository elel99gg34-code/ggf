# 로컬비서

인터넷 없이 내 PC 안에서만 돌아가는 업무 비서 프로그램이다. 녹음을 회의록으로 바꾸고, 문서 속 개인정보를 자동으로 가리고, 상품 이미지·영상을 한 번에 정리한다. 여기에 비서 기능 13가지가 더 들어 있다. 파일은 서버로 올라가지 않는다.

와디즈 펀딩 입력 자료는 [`docs/WADIZ.md`](docs/WADIZ.md), 오픈소스 고지는 [`docs/OPEN_SOURCE.md`](docs/OPEN_SOURCE.md)에 있다.

## 기능

| 구분 | 기능 | 내용 |
|---|---|---|
| 핵심 | 회의록 | 녹음·영상 → 받아쓰기(Whisper) → 요약 → 할 일·일정 자동 추출. docx/txt/md/srt/vtt 저장, 개인정보 가린 사본 저장 |
| 핵심 | 개인정보 가리기 | 주민번호·전화·카드(Luhn)·계좌·이메일·여권·면허·차량번호·주소·이름·얼굴 탐지. HWPX·DOCX는 서식 유지, PDF는 해당 쪽을 그림으로 바꿔 글자까지 제거, 이미지는 OCR 위치를 칠함, HWP는 본문 텍스트 |
| 핵심 | 이미지·영상 | 스마트스토어·쿠팡·인스타 규격, 워터마크, 배경 제거 / 무음 구간 자동 컷, 자막(SRT) 생성 |
| 비서 | 할 일 뽑기 | 문장에서 할 일·담당자·기한 찾기 |
| 비서 | 일정 뽑기 | "다음 주 화요일 3시" → .ics 캘린더 파일 |
| 비서 | 메모·할 일 | 메모장, 할 일 목록 |
| 비서 | 클립보드 | 복사 기록. 민감정보는 가려서 저장 |
| 비서 | 화면 글자 인식 | Ctrl+Shift+O로 캡처 → 영역 선택 → OCR |
| 비서 | 영수증·명함 | 영수증 → 경비 엑셀, 명함 → vCard 연락처 |
| 비서 | 번역 | Argos 언어팩(CTranslate2)으로 오프라인 번역 (한·영·일·중, 한↔일·중은 영어 경유) |
| 비서 | 글다듬기 | 자주 틀리는 맞춤법, 해요체/합니다체/공문체 변환, 메일 틀 |
| 비서 | 이름 일괄 변경 | 규칙·번호·날짜·EXIF, 미리보기와 되돌리기 |
| 비서 | 중복 정리 | 같은 파일(해시)·비슷한 사진(dHash). 보관함으로 옮기고 되돌리기 |
| 비서 | PDF 도구 | 합치기·나누기·압축·회전·이미지↔PDF |
| 비서 | 집중 타이머 | 뽀모도로, 주간 리포트 |
| 비서 | 통합 검색 | 메모·회의록·클립보드·연락처·폴더 속 문서(HWP·HWPX·DOCX·PDF) 전문 검색, Ctrl+K / Ctrl+Shift+Space |

라이선스:
- 오프라인 Ed25519 서명 키를 쓴다.
- 첫 실행부터 14일 동안은 모든 기능을 쓸 수 있는 체험판이다.
- 체험이 끝나면 핵심 기능 3가지만 키가 필요하다.

## 구조

```
app/                 데스크톱 앱
  src/               화면 (React + TypeScript + Vite)
  src-tauri/         셸 (Rust, Tauri 2): 엔진 실행, 트레이, 전역 단축키, 클립보드 감시, 화면 캡처
engine/              엔진 (Python, FastAPI): 모든 처리. 127.0.0.1에서만 열리고 토큰이 있어야 부를 수 있다
  localbiseo/core/   DB(SQLite+FTS5), 작업 큐, OCR, 문서 텍스트 추출(HWP/HWPX/DOCX/PDF), 라이선스
  localbiseo/modules/ 기능 16가지
  tests/             pytest (80개)
tools/               라이선스 키 발급, 엔진 묶기(PyInstaller)
docs/                와디즈 자료, 오픈소스 고지
```

앱이 켜지는 순서:
1. 셸이 엔진을 자식 프로세스로 띄운다. 이때 임의 포트와 1회용 토큰을 넘긴다.
2. 화면이 그 주소와 토큰으로 엔진을 부른다.
3. 창을 닫으면 트레이에 남아 클립보드 기록과 단축키가 계속 동작한다.
4. 앱이 끝나면 엔진도 같이 끝난다.

무거운 AI 기능은 선택 구성요소다. 없으면 그 기능만 "구성요소 필요"로 표시된다.

| 구성요소 | 설치 | 쓰는 곳 |
|---|---|---|
| 음성 인식 | `pip install "./engine[stt]"` (faster-whisper, 모델은 처음 쓸 때 내려받음) | 회의록, 자막 |
| OCR | `[ocr]` + Tesseract(한국어 데이터) | 화면 OCR, 영수증·명함, 이미지·스캔 PDF 마스킹 |
| 배경 제거 | `[rembg]` | 이미지 |
| 얼굴 감지 | `[face]` | 이미지 마스킹 |
| 번역 | `[translate]` (CTranslate2·SentencePiece, 언어팩은 앱에서 내려받음, torch 불필요) | 번역 |
| 로컬 AI | `[llm]` + `models/llm/*.gguf` | 요약·문체 품질 향상 |
| 화자 분리 | `[diarize]` (실험) | 회의록 |
| ffmpeg | 시스템 ffmpeg 또는 `[ffmpeg]` | 무음 컷, 자막 |

## 개발

```bash
# 엔진
cd engine
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e ".[dev,ocr,stt]" fpdf2
python -m pytest -q                                   # 테스트
python -m localbiseo --port 8765                      # 토큰 없이 개발용 실행 (/docs 에 API 문서)

# 화면만 브라우저로 (엔진을 8765로 띄운 상태에서)
cd app && npm install && npm run dev                  # http://localhost:1420

# 데스크톱 앱 (엔진은 자동으로 python -m localbiseo 로 뜬다)
cd app && npx tauri dev                               # 다른 파이썬을 쓰려면 LOCALBISEO_PYTHON=경로
```

Linux에서 Tauri를 빌드하려면 다음 패키지가 필요하다.
- `libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `libayatana-appindicator3-dev`, `libxdo-dev`
- `libxcb1-dev`, `libxrandr-dev`, `libdbus-1-dev`, `libpipewire-0.3-dev`, `libgbm-dev`, `libegl-dev`

## 설치 파일 만들기

GitHub Actions의 **설치 파일 만들기** 워크플로를 실행하거나 `v0.1.0` 같은 태그를 올리면 Windows `.exe`와 macOS `.dmg`가 만들어진다.

직접 만들 때:

```bash
pip install "./engine[stt,ocr,rembg,face,ffmpeg]" pyinstaller
python tools/build_engine.py --ffmpeg <ffmpeg 실행 파일> --tesseract <Tesseract 설치 폴더>
cd app && npm ci && npx tauri build --config src-tauri/tauri.release.conf.json
```

## 라이선스 키

```bash
# 1) 판매용 서명 키를 새로 만든다 (저장소의 공개키가 바뀐다). 개인키는 오프라인 보관, 절대 커밋 금지
python tools/license_gen.py keygen --private ~/.localbiseo-signing/private.pem
# 2) 와디즈 서포터 명단 CSV(id,name) → 키 일괄 발급
python tools/license_gen.py batch --private ~/.localbiseo-signing/private.pem backers.csv keys.csv
```

> 지금 저장소에 있는 `license_pubkey.pem`은 개발용이고, 짝이 되는 개인키는 없다. **판매 전에 반드시 1)을 실행**해서 바꿔야 한다.

## 알려진 한계

- **HWP(구형 바이너리)**: 본문 텍스트만 가려 `.txt`로 저장한다. 서식을 유지하려면 HWPX를 써야 한다.
- **PDF 마스킹**: 개인정보가 있는 쪽만 그림으로 바뀐다. 그 쪽에서는 글자 선택이 안 된다.
- **화자 분리**: 실험 기능이다. 실제 녹음으로 품질을 확인하지 않았다.
- **macOS OCR**: `brew install tesseract tesseract-lang`이 필요하다. Windows 설치 파일에는 Tesseract가 들어간다.
- **코드 서명**: 설치 파일에 서명하지 않아 첫 실행 때 운영체제 경고가 뜬다. Windows는 코드 서명 인증서, macOS는 Apple 공증이 필요하다.
- **번역**: 언어팩(쌍마다 약 100MB)은 처음 쓸 때 인터넷으로 내려받는다. 한↔일·중은 영어를 거쳐서 품질이 떨어질 수 있다.
- **로컬 AI**: 용량이 커서 기본 설치 파일에서 뺐다.
