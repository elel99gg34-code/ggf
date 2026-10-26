"use strict";
// 고객용 키 화면: 키 복사 버튼
const key = document.getElementById("key");
const btn = document.getElementById("copy");
if (key && btn) {
  btn.hidden = false;
  key.addEventListener("focus", () => key.select());
  btn.addEventListener("click", async () => {
    key.select();
    try {
      await navigator.clipboard.writeText(key.value);
    } catch {
      document.execCommand("copy");
    }
    btn.textContent = "복사했어요";
    setTimeout(() => (btn.textContent = "키 복사"), 1800);
  });
}
