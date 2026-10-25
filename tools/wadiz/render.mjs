// story.html의 각 장(data-out)을 PNG로 뽑는다.
//   cd tools/wadiz && npm install && node render.mjs
// 문구·가격을 바꾸려면 story.html을 고치고 다시 실행하면 된다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../docs/wadiz/images");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// <i data-icon="mic"></i> → lucide SVG
const iconDir = join(here, "node_modules/lucide-static/icons");
const html = readFileSync(join(here, "story.html"), "utf8").replace(/<i data-icon="([a-z0-9-]+)"><\/i>/g, (_, name) =>
  readFileSync(join(iconDir, `${name}.svg`), "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/\s(width|height)="24"/g, ""),
);
const built = join(here, ".story.built.html");
writeFileSync(built, html);

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(built).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
// 높이를 정수로 맞춰 경계에 1px 선이 끼지 않게 한다.
await page.evaluate(() => document.querySelectorAll("[data-out]").forEach((e) => (e.style.height = Math.ceil(e.getBoundingClientRect().height) + "px")));
const sections = await page.$$("[data-out]");
for (const s of sections) {
  const name = await s.getAttribute("data-out");
  await s.screenshot({ path: join(out, `${name}.png`) });
  const box = await s.boundingBox();
  console.log(`${name}.png  ${Math.round(box.width)}×${Math.round(box.height)}`);
}
await browser.close();
