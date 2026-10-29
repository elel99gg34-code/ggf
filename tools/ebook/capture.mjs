// 사용 설명서용 앱 화면 캡처. 실제 앱(엔진 + 화면)을 띄워 예시 데이터를 넣고 화면마다 찍는다.
//   node tools/ebook/capture.mjs <예시 파일 폴더> <출력 폴더> <라이선스 키 파일>
// 미리 띄워 둘 것: 엔진(127.0.0.1:8765, 토큰 없이, 키 등록 전)과 화면(:1420)
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [samples, out, keyFile] = process.argv.slice(2);
const APP = process.env.APP_URL || "http://localhost:1420/#/";
const ENGINE = process.env.ENGINE_URL || "http://127.0.0.1:8765";
mkdirSync(out, { recursive: true });

const call = async (method, path, body) => {
  const r = await fetch(ENGINE + path, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
};
const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1.5, locale: "ko-KR" });
const failures = [];
page.on("pageerror", (e) => failures.push(`pageerror: ${e.message}`));

async function shot(name, fn, clip) {
  try {
    await fn();
  } catch (e) {
    failures.push(`${name}: ${e.message.split("\n")[0]}`);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${name}.jpg`), type: "jpeg", quality: 80, clip });
  console.log("찍음:", name);
}
const go = async (route) => {
  await page.goto(APP + route);
  await page.reload(); // # 뒤만 바뀌면 화면이 데이터를 다시 읽지 않는다
  await page.waitForSelector(".sidebar");
  await page.waitForTimeout(700);
};
const tab = (label) => page.locator(`main [role=tab]:text-is("${label}")`).first().click();
const choose = async (selector, paths) => {
  page.once("dialog", (d) => d.accept(paths.join(";")));
  await page.locator(selector).first().click();
  await page.waitForTimeout(400);
};
const primary = async () => {
  await page.locator("main .btn-primary:not(.btn-sm):visible").first().click();
};

// 0) 키 등록 전 화면
await shot("00_gate", async () => {
  await page.goto(APP + "home");
  await page.waitForSelector(".gate");
});
await call("POST", "/license", { key: readFileSync(keyFile, "utf8").trim() });
await page.reload(); // 주소의 # 뒤만 바뀌면 다시 읽지 않아서, 키를 등록한 상태를 화면이 알도록 새로 연다
await page.waitForSelector(".sidebar");

// 예시 데이터
await call("POST", "/transcribe/text", {
  title: "와디즈 펀딩 준비 회의",
  text: readFileSync(join(samples, "회의메모.txt"), "utf8"),
  auto_todos: true,
});
for (const [text, due, assignee] of [["견적서 보내기", day(1), "박지영 과장"], ["세금계산서 발행", day(3), null], ["상세페이지 최종 검수", day(5), "김민수 대리"]]) {
  await call("POST", "/todos", { text, due, assignee });
}
await call("POST", "/notes", { title: "거래처 연락처 정리", body: "로컬상회 김민수 대리 010-2345-6789\n월말까지 계약서 회신", tags: "거래처", pinned: true });
await call("POST", "/notes", { title: "리워드 아이디어", body: "슈퍼얼리버드 29,000원 / 얼리버드 39,000원\n2인 팩 할인", tags: "와디즈" });
for (const t of ["회의실 예약 완료: 3층 대회의실 오후 2시", "https://www.wadiz.kr/web/campaign/detail/000000", "배송지: 서울특별시 마포구 월드컵북로 21", "주민번호 900101-1234567 확인 부탁드립니다"]) {
  await call("POST", "/clipboard", { text: t });
}
await call("POST", "/expenses", { date: day(-5), merchant: "카페 로컬 강남점", amount: 15500, category: "식비", memo: "거래처 미팅" });
await call("POST", "/expenses", { date: day(-3), merchant: "로컬문구", amount: 32000, category: "소모품" });
const s = await call("POST", "/focus/start", { label: "기획서 쓰기", planned_minutes: 25 });
await call("POST", `/focus/${s.id}/stop`, { completed: true });

await shot("01_home", () => go("home"));

await shot("02_transcribe_new", async () => {
  await go("transcribe");
});
await shot("02b_transcribe_detail", async () => {
  await go("transcribe");
  await tab("저장된 회의록");
  await page.waitForTimeout(400);
  await page.locator("text=와디즈 펀딩 준비 회의").first().click();
  await page.waitForSelector("text=전체 내용");
});

await shot("03_mask_files", async () => {
  await go("mask");
  await choose(".dropzone", ["고객상담기록.docx", "장학금신청서.hwpx", "청구서.pdf", "택배송장.png"].map((f) => join(samples, f)));
  await primary();
  await page.waitForSelector("text=가렸어요", { timeout: 60000 });
});
await shot("03b_mask_text", async () => {
  await go("mask");
  await tab("글 바로 가리기");
  // 내가 정하는 말: 거래처 이름은 가리고, 회사 대표번호는 남긴다
  await page.fill("textarea[placeholder*='로컬상회']", "로컬상회");
  await page.fill("textarea[placeholder*='02-345']", "02-345-6789");
  await page.locator("main textarea").first().fill(
    "로컬상회 홍길동 고객님(900101-1234567) 연락처 010-1234-5678, 이메일 hong@example.com 으로 견적서를 보내 주세요. 계좌 국민 123456-01-234567 / 문의는 대표번호 02-345-6789",
  );
  await primary();
  await page.waitForTimeout(800);
});

await shot("04_media", async () => {
  await go("media");
  await choose(".dropzone", [join(samples, "상품사진")]);
  await page.fill("input[placeholder='예: @내가게']", "@로컬샵");
  await primary();
  await page.waitForSelector(".thumbs img", { timeout: 60000 });
  await page.waitForTimeout(1500);
});

await shot("05_actions", async () => {
  await go("actions");
  await page.click("button:has-text('예시 넣기')");
  await primary();
  await page.waitForSelector("text=찾은 할 일");
});
await shot("06_schedule", async () => {
  await go("schedule");
  await page.click("button:has-text('예시 넣기')");
  await primary();
  await page.waitForSelector("text=찾은 일정");
});
await shot("07_notes_todo", () => go("notes"));
await shot("07b_notes_memo", async () => {
  await go("notes");
  await tab("메모");
  await page.waitForTimeout(500);
  await page.locator("text=거래처 연락처 정리").first().click();
});
await shot("08_clipboard", () => go("clipboard"));

await shot("09_ocr", async () => {
  await go("ocr");
  page.once("dialog", (d) => d.accept(join(samples, "택배송장.png")));
  await page.locator("main button:has-text('이미지')").first().click();
  await page.waitForTimeout(1200);
  await primary();
  await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some((t) => t.value.length > 5), null, { timeout: 60000 });
});
await shot("10_papers_receipt", async () => {
  await go("papers");
  page.once("dialog", (d) => d.accept(join(samples, "영수증.png")));
  await page.locator("main button:has-text('사진')").first().click();
  await page.waitForTimeout(4000);
});
await shot("10b_papers_card", async () => {
  await go("papers");
  await tab("명함 → 연락처");
  page.once("dialog", (d) => d.accept(join(samples, "명함.png")));
  await page.locator("main button:has-text('사진')").first().click();
  await page.waitForTimeout(4000);
});
await shot("11_translate", async () => {
  await go("translate");
  await page.fill("textarea[placeholder='번역할 글']", "다음 주 화요일까지 견적서를 보내 주세요.\n회의는 오후 3시에 시작합니다.");
});
await shot("12_writing", async () => {
  await go("writing");
  await page.fill("textarea", "몇일 뒤에 연락드릴께요. 그건 안되요. 회의 자료는 금요일까지 보내드리겠습니다.");
  await primary();
  await page.waitForSelector("text=고친 곳");
});
await shot("13_rename", async () => {
  await go("rename");
  await choose(".dropzone", ["머그컵_그린.jpg", "머그컵_블루.jpg", "머그컵_코랄.jpg"].map((f) => join(samples, "상품사진", f)));
  const tpl = page.locator("main input[value='{name}']").first();
  await tpl.fill("상품사진_{n:03}");
  await page.waitForTimeout(1200);
});
await shot("14_dedupe", async () => {
  await go("dedupe");
  await choose(".dropzone", [join(samples, "사진정리")]);
  await primary();
  await page.waitForTimeout(3000);
});
await shot("15_pdf", async () => {
  await go("pdf");
  await choose(".dropzone", [join(samples, "청구서.pdf"), join(samples, "견적서.pdf")]);
});
await shot("16_focus", () => go("focus"));
await shot("17_search", async () => {
  await go("search");
  await page.fill("input[placeholder='찾을 말 (두 글자 이상)']", "견적서");
  await page.waitForTimeout(1200);
});
// 아래쪽 '정보' 칸에는 녹화한 PC의 경로가 나와서 위쪽만 찍는다
await shot("18_settings", () => go("settings"), { x: 0, y: 0, width: 1360, height: 520 });
await shot("19_palette", async () => {
  await go("home");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("회의", { delay: 60 });
  await page.waitForTimeout(800);
});

// 자동 처리: 규칙 두 개를 만들고 파일을 넣어 처리 기록까지
const AUTO = join(dirname(samples), "자동처리");
rmSync(AUTO, { recursive: true, force: true });
const inbox = join(AUTO, "받은 서류");
const photos = join(AUTO, "상품 사진");
mkdirSync(inbox, { recursive: true });
mkdirSync(photos, { recursive: true });
mkdirSync(join(AUTO, "영수증"), { recursive: true });
await call("POST", "/automations", { name: "고객 서류 가리기", folder: inbox, action: "mask" });
await call("POST", "/automations", {
  name: "상품 사진 규격", folder: photos, action: "image", after: "move",
  options: { preset: "smartstore_main", watermark: "@로컬샵", enhance: true },
});
for (const f of ["고객상담기록.docx", "장학금신청서.hwpx"]) copyFileSync(join(samples, f), join(inbox, f));
for (const f of ["머그컵_그린.jpg", "머그컵_블루.jpg"]) copyFileSync(join(samples, "상품사진", f), join(photos, f));
for (let i = 0; i < 60; i++) {
  const log = await call("GET", "/automations/log");
  if (log.length >= 4 && !log.some((l) => l.status === "running")) break;
  await page.waitForTimeout(1000);
}
await shot("20_auto", () => go("auto"));
await shot("20b_auto_new", async () => {
  await go("auto");
  await page.click("button:has-text('새 규칙')");
  await page.click(".action-tile:has-text('영수증')");
  await choose(".card .dropzone", [join(AUTO, "영수증")]);
  await page.fill("input[placeholder='영수증 → 경비 장부']", "영수증 모으기");
}, { x: 232, y: 0, width: 1128, height: 860 });

// 작은 도구
const toolClip = { x: 232, y: 0, width: 1128, height: 620 };
await shot("21_tools", async () => {
  await go("tools");
  await page.click(".tool-tile:has-text('금액 한글')");
  await page.fill("input[placeholder^='금액']", "1,234,000");
  await page.click("main [role=tab]:text-is('공급가 + 부가세')");
  await page.waitForTimeout(500);
}, toolClip);
await shot("21b_tools_date", async () => {
  await go("tools");
  await page.click(".tool-tile:has-text('날짜 계산')");
  await tab("두 날짜 사이");
  await page.fill("main input[type=date] >> nth=0", "2026-09-21");
  await page.fill("main input[type=date] >> nth=1", "2026-10-09");
  await page.waitForTimeout(600);
}, toolClip);

await browser.close();
console.log(failures.length ? `실패:\n${failures.join("\n")}` : "모두 찍음");
