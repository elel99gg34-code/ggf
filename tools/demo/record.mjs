// 와디즈 시연 영상 녹화 (실제 앱 화면을 그대로 녹화한다. 결과는 모두 엔진이 실제로 만든 것).
//   node tools/demo/record.mjs <예시 파일 폴더> <출력 폴더> [mask,media,transcribe]
// 미리 띄워 둘 것: 엔진(127.0.0.1:8765, 토큰 없이)과 화면(vite preview, :1420)
import { mkdirSync, renameSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [samples, outDir, onlyArg] = process.argv.slice(2);
const only = (onlyArg || "mask,media,transcribe").split(",");
const BASE = process.env.DEMO_URL || "http://localhost:1420/#/";
const SIZE = { width: 1440, height: 900 };
mkdirSync(outDir, { recursive: true });

// 화면 아래 자막과 마우스 포인터 (녹화에는 실제 커서가 찍히지 않아서 그려 준다)
const OVERLAY = `
  (() => {
    if (window.__demo) return;
    window.__demo = true;
    const style = document.createElement('style');
    style.textContent = \`
      #demo-cap { position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%); z-index: 99999; max-width: 78%;
        background: rgba(11,22,48,.92); color: #fff; font: 700 26px/1.4 Pretendard, 'Malgun Gothic', 'NanumGothic', sans-serif;
        padding: 16px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.3); text-align: center; transition: opacity .25s; letter-spacing: -0.01em; }
      #demo-cap b { color: #ffd84d; }
      #demo-cap:empty { opacity: 0; }
      #demo-cursor { position: fixed; z-index: 100000; width: 22px; height: 22px; margin: -4px 0 0 -4px; pointer-events: none;
        background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24'><path d='M4 2l16 9-7 2-3 7z' fill='black' stroke='white' stroke-width='1.6'/></svg>") no-repeat; transition: transform .08s; }
      #demo-cursor.down { transform: scale(.82); }
    \`;
    document.head.appendChild(style);
    const cap = document.createElement('div'); cap.id = 'demo-cap'; document.body.appendChild(cap);
    const cur = document.createElement('div'); cur.id = 'demo-cursor'; cur.style.left = '700px'; cur.style.top = '450px'; document.body.appendChild(cur);
    addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => cur.classList.add('down'), true);
    addEventListener('mouseup', () => cur.classList.remove('down'), true);
  })();
`;

async function session(name, fn) {
  if (!only.includes(name)) return;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: outDir, size: SIZE }, locale: "ko-KR" });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const cuts = []; // 영상에서 잘라 낼 구간(초). MP4로 바꿀 때 뺀다.
  let mouse = { x: 700, y: 450 };
  const h = {
    page,
    now: () => (Date.now() - t0) / 1000,
    cut: (from, to) => to - from > 1 && cuts.push([from, to]),
    wait: (ms) => page.waitForTimeout(ms),
    caption: async (html) => {
      await page.evaluate((t) => { const el = document.getElementById("demo-cap"); if (el) el.innerHTML = t; }, html);
    },
    go: async (route) => {
      await page.goto(BASE + route);
      await page.waitForSelector(".sidebar");
      await page.evaluate(OVERLAY);
      await page.mouse.move(mouse.x, mouse.y);
      await page.waitForTimeout(500);
    },
    click: async (selector, pause = 350) => {
      const el = page.locator(selector).first();
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y, { steps: 18 });
      mouse = { x, y };
      await page.waitForTimeout(pause);
      await el.click();
    },
    type: async (selector, text, delay = 35) => {
      await h.click(selector, 200);
      await page.locator(selector).first().pressSequentially(text, { delay });
    },
    choose: async (selector, paths) => {
      page.once("dialog", (d) => d.accept(paths.join(";")));
      await h.click(selector);
    },
    scroll: async (dy) => {
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, dy / 12); await page.waitForTimeout(40); }
    },
  };
  try {
    await fn(h);
  } finally {
    const video = page.video();
    await ctx.close();
    await browser.close();
    if (video) renameSync(await video.path(), join(outDir, `${name}.webm`));
    writeFileSync(join(outDir, `${name}.cuts.json`), JSON.stringify(cuts));
  }
  console.log(`녹화 완료: ${name}.webm`);
}

// 1) 개인정보 가리기
await session("mask", async (h) => {
  await h.go("home");
  await h.caption("문서 속 개인정보, <b>인터넷 없이 내 PC에서</b> 가립니다");
  await h.wait(1600);
  await h.click(".nav-item:has-text('개인정보 가리기')");
  await h.wait(900);
  await h.caption("한글(HWPX)·워드·PDF·사진을 <b>한 번에</b> 넣고");
  await h.choose(".dropzone", ["고객상담기록.docx", "장학금신청서.hwpx", "청구서.pdf", "택배송장.png"].map((f) => join(samples, f)));
  await h.wait(1400);
  await h.caption("<b>가리기</b> 버튼 한 번");
  await h.click("button:has-text('개 파일 가리기')");
  await h.page.waitForSelector("text=곳을 가렸어요", { timeout: 120000 });
  await h.caption("주민번호·전화번호·계좌·주소·이름을 찾아 <b>가린 사본</b>을 만들었어요");
  await h.scroll(420);
  await h.wait(3200);
  await h.scroll(-420);
  await h.click("text=글 바로 가리기");
  await h.caption("붙여 넣은 글도 <b>바로</b> 가려요");
  await h.type(".card textarea", "상담 고객 홍길동님(010-1234-5678)의 환불 계좌는 국민은행 123456-01-234567 입니다.", 22);
  await h.click(".card button.btn-primary:has-text('가리기')");
  await h.page.waitForSelector("text=결과 ·");
  await h.caption("원본은 그대로, <b>가린 사본</b>만 새로 만들어요");
  await h.wait(3500);
});

// 2) 이미지 일괄 처리
await session("media", async (h) => {
  await h.go("home");
  await h.caption("상품 사진, <b>마켓 규격</b>에 한 번에 맞추기");
  await h.wait(1400);
  await h.click(".nav-item:has-text('이미지·영상')");
  await h.wait(800);
  await h.caption("사진 폴더를 통째로 넣고");
  await h.choose(".dropzone", [join(samples, "상품사진")]);
  await h.wait(1000);
  await h.caption("규격을 고르고 <b>워터마크 글자</b>만 적으면");
  await h.click("select >> nth=0");
  await h.page.locator("select").first().selectOption("smartstore_main");
  await h.type("input[placeholder='예: @내가게']", "@로컬샵", 90);
  await h.page.locator("select").nth(2).selectOption("bottom-right");
  // 흰 여백 위에서도 보이도록 진한 색 워터마크
  await h.page.locator("input[type=color]").nth(1).fill("#1b2230");
  await h.page.locator("input[type=range]").nth(1).fill("80");
  await h.wait(600);
  await h.click("button:has-text('처리하기')");
  await h.page.waitForSelector(".thumbs img", { timeout: 60000 });
  await h.wait(800);
  await h.caption("스마트스토어 1000×1000 + 워터마크, <b>폴더째 끝</b>");
  await h.scroll(300);
  await h.wait(3800);
});

// 3) 녹음 → 회의록
await session("transcribe", async (h) => {
  await h.go("home");
  await h.caption("회의 녹음, <b>인터넷 없이</b> 회의록으로");
  await h.wait(1400);
  await h.click(".nav-item:has-text('회의록')");
  await h.wait(700);
  await h.caption("녹음 파일을 넣고");
  await h.choose(".dropzone", [join(samples, "회의녹음.mp3")]);
  await h.type("input[placeholder='예: 10월 마케팅 회의']", "와디즈 펀딩 준비 회의", 60);
  await h.click("button:has-text('회의록 만들기')");
  await h.caption("AI가 받아쓰는 중… <b>파일은 PC 밖으로 나가지 않아요</b><br><span style='font-size:17px;font-weight:500;opacity:.8'>기다리는 시간은 줄여서 보여 드려요</span>");
  const waitFrom = h.now() + 3;
  // 받아쓰기가 끝날 때까지 진행 상황을 로그로 남긴다 (실패하면 화면의 오류 문구를 보여 준다).
  for (let i = 0; ; i++) {
    if (await h.page.locator("text=전체 내용").count()) break;
    const err = await h.page.locator(".alert-error").allInnerTexts();
    if (err.length) throw new Error(`회의록 만들기 실패: ${err.join(" / ")}`);
    if (i % 10 === 0) console.log("진행:", (await h.page.locator(".jobbar").allInnerTexts()).join(" ").replace(/\s+/g, " ") || "(진행 표시 없음)");
    if (i > 600) throw new Error("10분 안에 끝나지 않음");
    await h.wait(1000);
  }
  h.cut(waitFrom, h.now() - 1.5); // 진행 막대가 도는 동안은 3초만 남기고 끝나기 직전으로 넘어간다
  await h.wait(800);
  await h.caption("받아쓰기 · 요약 · <b>할 일과 일정</b>까지 자동 정리");
  await h.wait(3500);
  await h.scroll(380);
  await h.caption("찾은 할 일은 <b>할 일 목록에 자동 등록</b>");
  await h.wait(3000);
  await h.click("button:has-text('워드(.docx)')");
  await h.caption("워드·자막 파일로 <b>바로 저장</b>");
  await h.wait(2600);
  await h.click(".nav-item:has-text('홈')");
  await h.caption("홈에서 오늘 할 일까지 한눈에");
  await h.wait(3000);
});

console.log(readdirSync(outDir).join("\n"));
