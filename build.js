/* 모든 CSS/JS 를 index.html 에 인라인해서 단일 배포 파일을 만든다.
   사용법: node build.js   ->  steal-an-egg.html                       */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

// <link rel="stylesheet" href="..."> -> <style>
html = html.replace(/[ \t]*<link rel="stylesheet" href="([^"]+)">\n?/g,
  (_, href) => `<style>\n${read(href)}\n</style>\n`);

// <script src="..."></script> -> <script>
html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\n?/g,
  (_, src) => `<script>\n${read(src)}\n</script>\n`);

const out = 'steal-an-egg.html';
fs.writeFileSync(path.join(root, out), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`${out} 생성 완료 (${kb} KB, 외부 의존성 0)`);
