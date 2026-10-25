import {
  CalendarPlus, ClipboardList, Copy, FilePen, FileText, House, Images, Languages, ListChecks, Mic, NotebookPen, Receipt,
  ScanText, Search, Settings, ShieldCheck, SpellCheck, Timer, type LucideIcon,
} from "lucide-react";

export type NavItem = { key: string; label: string; icon: LucideIcon; desc: string; keywords?: string };
export type NavGroup = { title: string | null; items: NavItem[] };

export const NAV: NavGroup[] = [
  { title: null, items: [{ key: "home", label: "홈", icon: House, desc: "오늘 할 일과 최근 기록" }] },
  {
    title: "핵심 기능",
    items: [
      { key: "transcribe", label: "회의록", icon: Mic, desc: "녹음을 글로 바꾸고 요약·할 일·일정까지", keywords: "녹음 받아쓰기 STT 강의 요약" },
      { key: "mask", label: "개인정보 가리기", icon: ShieldCheck, desc: "문서·이미지 속 주민번호·전화번호 자동 가림", keywords: "마스킹 비식별 주민번호 hwp pdf" },
      { key: "media", label: "이미지·영상", icon: Images, desc: "상품 이미지 규격·워터마크, 영상 무음 컷·자막", keywords: "스마트스토어 쿠팡 썸네일 배경제거 자막" },
    ],
  },
  {
    title: "비서",
    items: [
      { key: "actions", label: "할 일 뽑기", icon: ListChecks, desc: "글에서 해야 할 일과 담당·기한 찾기", keywords: "액션아이템" },
      { key: "schedule", label: "일정 뽑기", icon: CalendarPlus, desc: "'다음 주 화요일 3시' → 캘린더 파일", keywords: "ics 캘린더" },
      { key: "notes", label: "메모·할 일", icon: NotebookPen, desc: "메모장과 할 일 목록", keywords: "todo" },
      { key: "clipboard", label: "클립보드", icon: ClipboardList, desc: "복사한 내용 기록 (민감정보 자동 가림)", keywords: "복사 붙여넣기" },
      { key: "ocr", label: "화면 글자 인식", icon: ScanText, desc: "캡처한 화면·사진에서 글자 뽑기", keywords: "OCR 캡처" },
      { key: "papers", label: "영수증·명함", icon: Receipt, desc: "영수증은 경비 엑셀로, 명함은 연락처로", keywords: "경비 가계부 vcf" },
      { key: "translate", label: "번역", icon: Languages, desc: "인터넷 없이 한·영·일·중 번역", keywords: "영어 일본어" },
      { key: "writing", label: "글다듬기", icon: SpellCheck, desc: "맞춤법, 문체 바꾸기, 이메일 틀", keywords: "맞춤법 공문 존댓말" },
      { key: "rename", label: "이름 일괄 변경", icon: FilePen, desc: "파일 이름을 규칙대로 한 번에", keywords: "파일명 리네임" },
      { key: "dedupe", label: "중복 정리", icon: Copy, desc: "똑같은 파일·비슷한 사진 찾기", keywords: "용량 정리" },
      { key: "pdf", label: "PDF 도구", icon: FileText, desc: "합치기, 나누기, 압축, 회전, 이미지 변환", keywords: "병합 분할" },
      { key: "focus", label: "집중 타이머", icon: Timer, desc: "뽀모도로와 주간 리포트", keywords: "뽀모도로 시간관리" },
      { key: "search", label: "통합 검색", icon: Search, desc: "메모·회의록·클립보드·문서를 한 번에", keywords: "찾기" },
    ],
  },
  { title: null, items: [{ key: "settings", label: "설정", icon: Settings, desc: "구성요소, 라이선스, 기본값" }] },
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items);
