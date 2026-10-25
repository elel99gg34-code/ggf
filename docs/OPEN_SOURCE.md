# 오픈소스 고지 (배포 전 확인용)

로컬비서가 쓰는 주요 오픈소스와 라이선스를 정리했다. 판매용 배포 전에 최종 목록과 고지문을 다시 확인한다. 법률 자문은 아니다.

## 앱에 들어가는 것

| 구성요소 | 라이선스 | 비고 |
|---|---|---|
| Tauri, tauri-plugin-* | MIT / Apache-2.0 | 데스크톱 셸 |
| React, React DOM | MIT | 화면 |
| lucide-react | ISC | 아이콘 |
| arboard, xcap, uuid, serde | MIT / Apache-2.0 | 클립보드, 화면 캡처 |
| Python, FastAPI, Uvicorn, Pydantic | PSF / MIT / BSD-3 / MIT | 엔진 |
| Pillow | MIT-CMU (HPND) | 이미지 |
| pypdf | BSD-3 | PDF 합치기·나누기 |
| pypdfium2 / PDFium | Apache-2.0·BSD-3 / BSD-3 | PDF 렌더링·텍스트 |
| python-docx, openpyxl, olefile | MIT, MIT, BSD-2 | 워드, 엑셀, HWP |
| cryptography | Apache-2.0 / BSD | 라이선스 서명 확인 |
| 나눔고딕 | SIL OFL 1.1 | 워터마크 글꼴 (함께 배포 가능, 단독 판매 불가) |

## 선택 구성요소

| 구성요소 | 라이선스 | 비고 |
|---|---|---|
| faster-whisper, CTranslate2 | MIT | 음성 인식 |
| Whisper 모델 (Systran 변환본) | MIT | 처음 쓸 때 내려받음 |
| Tesseract OCR, tessdata(kor) | Apache-2.0 | Windows 설치 파일에 포함 |
| pytesseract | Apache-2.0 | |
| rembg, U²-Net 모델 | MIT, Apache-2.0 | 배경 제거 (모델은 처음 쓸 때 내려받음) |
| OpenCV | Apache-2.0 | 얼굴 감지 |
| CTranslate2, SentencePiece | MIT, Apache-2.0 | 번역 (CTranslate2는 음성 인식과 같이 씀) |
| Argos Translate 언어팩 | 언어팩마다 다름 | 설치 파일에 넣지 않음. 사용자가 번역 화면에서 내려받음 |
| llama.cpp / llama-cpp-python | MIT | 모델(GGUF)은 각 모델의 라이선스를 따름 |
| SpeechBrain, ECAPA 모델 | Apache-2.0 | 화자 분리(실험) |

## 주의가 필요한 것

- **FFmpeg**: 라이선스가 빌드 방식에 따라 다르다.
  - **LGPL 빌드**: Windows 워크플로는 BtbN의 `lgpl` 빌드를 쓴다. 배포할 때 다음을 지킨다.
    - FFmpeg를 쓴다는 고지
    - LGPL 전문
    - 소스 코드를 받을 수 있는 위치 안내
  - **macOS 빌드**: 지금은 `imageio-ffmpeg`에 들어 있는 ffmpeg를 쓴다. 이 바이너리가 **GPL 빌드일 수 있다**. 판매용으로는 LGPL 빌드로 바꿔서 `--ffmpeg`로 넘기는 걸 권장한다.
- **PyMuPDF는 쓰지 않았다**: AGPL이라 소스를 공개하지 않는 판매용 앱에 넣으면 문제가 된다. PDF는 pypdf와 pypdfium2로만 처리한다.
- **AI 모델 파일**: 앱에 넣지 않고, 사용자가 처음 쓸 때 공식 배포처에서 내려받는다. 배포처 정책이 바뀌면 다운로드 주소를 다시 확인한다.

## 고지문 넣는 곳

- 설치 폴더의 `THIRD_PARTY_NOTICES.txt`: 위 목록과 각 라이선스 전문
- 앱의 설정 > 정보 화면: "오픈소스 라이선스" 링크

둘 다 1.0 배포 전에 추가할 예정이다.
