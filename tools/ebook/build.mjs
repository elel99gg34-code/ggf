// 사용 설명서 PDF 만들기: guide.html(+ shots/)을 A4 PDF로 뽑는다.
//   node tools/ebook/build.mjs
// 결과: docs/ebook/로컬비서_사용설명서.pdf, server/assets/guide.pdf (라이선스 메일 첨부용)
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const out = join(root, "docs/ebook/로컬비서_사용설명서.pdf");
mkdirSync(dirname(out), { recursive: true });
mkdirSync(join(root, "server/assets"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(here, "guide.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const missing = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")));
if (missing.length) throw new Error(`그림이 없어요: ${missing.join(", ")}`);
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: '<div style="width:100%;font-size:8px;color:#8a93a3;text-align:center;font-family:sans-serif"><span class="pageNumber"></span></div>',
  margin: { top: "18mm", bottom: "20mm", left: "17mm", right: "17mm" },
  preferCSSPageSize: true,
});
await browser.close();
copyFileSync(out, join(root, "server/assets/guide.pdf"));
console.log(`${out} (${(statSync(out).size / 1e6).toFixed(1)}MB)`);
