# 패턴 클릭 도우미

정해둔 패턴(클릭 위치 / 키 입력 / 대기시간)을 반복 실행해주는 Windows 오토클릭 보조 도구.

## 사용법
- **F8**: 현재 마우스 위치를 클릭 단계로 추가
- **F6**: 시작 / **F7**: 정지 (비상정지)
- 패턴은 JSON으로 저장/불러오기 가능
- 대기시간 편차(±%)로 간격을 조금씩 랜덤하게 줄 수 있음

## 설치 exe 만들기
GitHub Actions(`Build Windows installer`)가 `PatternClicker-Setup.exe`를 빌드해서 Artifacts로 올려줌.
로컬 빌드: `pip install -r requirements.txt pyinstaller` → `pyinstaller --onefile --windowed --name PatternClicker --paths app app/main.py` → Inno Setup으로 `installer/setup.iss` 컴파일.

## 개발
`python -m pytest tests` (엔진 로직 테스트), 실행은 `python app/main.py`.
