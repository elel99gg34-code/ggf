"use strict";

const $ = (sel) => document.querySelector(sel);

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    showLock();
    throw new Error(data.detail || "잠겨 있어요.");
  }
  if (!res.ok) {
    const d = data.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? "입력값을 확인해 주세요." : `오류 (${res.status})`);
  }
  return data;
}

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 1800);
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast(done);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("ko-KR") : "");

function guideText(lic) {
  const lines = [
    `안녕하세요, ${lic.name}님. 로컬비서를 구매해 주셔서 감사합니다.`,
    "",
    "라이선스 키:",
    lic.key,
    "",
    "등록 방법: 로컬비서를 설치하고 실행하면 나오는 화면에 위 키를 붙여 넣고 [등록하고 시작하기]를 누르세요.",
  ];
  lines.push(lic.edition === "dev" ? `이 키는 개발자 라이선스입니다${lic.expires ? ` (${lic.expires}까지)` : ""}.` : "이 키는 구매자 전용이며 PC 2대까지 쓸 수 있습니다.");
  return lines.join("\n");
}

// --- 잠금 ---
function showLock(message = "") {
  $("#admin").hidden = true;
  $("#lock").hidden = false;
  $("#lock-error").textContent = message;
  $("#pin").value = "";
  $("#pin").focus();
}

function showAdmin() {
  $("#lock").hidden = true;
  $("#admin").hidden = false;
  openTab("issue");
}

$("#unlock-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  try {
    await api("POST", "/api/unlock", { pin: $("#pin").value });
    showAdmin();
  } catch (err) {
    $("#lock-error").textContent = err.message;
    $("#pin").value = "";
    $("#pin").focus();
  } finally {
    btn.disabled = false;
  }
});

$("#lock-btn").addEventListener("click", async () => {
  await api("POST", "/api/lock").catch(() => {});
  showLock();
});

// --- 탭 ---
function openTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.id !== `tab-${name}`));
  if (name === "list") loadList();
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => openTab(t.dataset.tab)));

// --- 발급 ---
const form = $("#issue-form");
const field = (name) => form.elements.namedItem(name);
function syncEdition() {
  const dev = field("edition").value === "dev";
  $("#dev-expiry").hidden = !dev;
  $("#exp-date-wrap").hidden = !(dev && field("period").value === "date");
}
form.querySelectorAll("input[name=edition]").forEach((r) => r.addEventListener("change", syncEdition));
field("period").addEventListener("change", syncEdition);

function expiryFromForm() {
  if (field("edition").value !== "dev") return null;
  const p = field("period").value;
  if (!p) return null;
  if (p === "date") return field("exp_date").value || null;
  const d = new Date();
  d.setDate(d.getDate() + Number(p));
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD (현지 날짜)
}

let lastIssued = null;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  $("#issue-error").textContent = "";
  try {
    if (field("edition").value === "dev" && field("period").value === "date" && !field("exp_date").value) throw new Error("마지막 날을 골라 주세요.");
    lastIssued = await api("POST", "/api/licenses", {
      edition: field("edition").value,
      name: field("name").value,
      email: field("email").value,
      order_no: field("order_no").value,
      memo: field("memo").value,
      expires: expiryFromForm(),
    });
    $("#issued").hidden = false;
    $("#issued-title").textContent = `발급했어요 · ${lastIssued.license_id} · ${lastIssued.edition_label} · ${lastIssued.name}${lastIssued.expires ? ` · ${lastIssued.expires}까지` : ""}`;
    $("#issued-key").value = lastIssued.key;
    ["name", "email", "order_no", "memo"].forEach((f) => (field(f).value = ""));
    $("#issued").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    $("#issue-error").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
$("#copy-key").addEventListener("click", () => lastIssued && copy(lastIssued.key, "키를 복사했어요"));
$("#copy-msg").addEventListener("click", () => lastIssued && copy(guideText(lastIssued), "안내 문구를 복사했어요"));

// --- 발급 기록 ---
async function loadList() {
  const q = encodeURIComponent($("#search").value.trim());
  const ed = $("#filter").value;
  let rows;
  try {
    rows = await api("GET", `/api/licenses?q=${q}&edition=${ed}`);
  } catch (err) {
    $("#count").textContent = err.message;
    return;
  }
  $("#count").textContent = `${rows.length}건`;
  $("#rows").replaceChildren(
    ...rows.map((r) =>
      el(
        "li",
        { class: r.revoked_at ? "revoked" : "" },
        el(
          "div",
          { class: "who" },
          el("span", { class: `chip ${r.edition}` }, r.edition_label),
          r.name,
          r.revoked_at ? el("span", { class: "chip off" }, "취소됨") : null,
        ),
        el(
          "div",
          { class: "meta" },
          [r.license_id, r.email, r.order_no && `주문 ${r.order_no}`, `발급 ${fmtDate(r.issued_at)}`, r.expires && `${r.expires}까지`, r.memo, r.revoked_at && `취소 ${fmtDate(r.revoked_at)}${r.revoke_reason ? ` (${r.revoke_reason})` : ""}`]
            .filter(Boolean)
            .join(" · "),
        ),
        el(
          "div",
          { class: "actions" },
          el("button", { onclick: () => copy(r.key, "키를 복사했어요") }, "키 복사"),
          el("button", { onclick: () => copy(guideText(r), "안내 문구를 복사했어요") }, "안내 문구"),
          r.revoked_at
            ? null
            : el(
                "button",
                {
                  class: "danger",
                  onclick: async () => {
                    const reason = prompt(`${r.name} (${r.license_id}) 라이선스를 취소할까요? 사유를 적어 주세요 (환불 등)`);
                    if (reason === null) return;
                    try {
                      await api("POST", `/api/licenses/${encodeURIComponent(r.license_id)}/revoke`, { reason });
                      toast("취소로 표시했어요");
                      loadList();
                    } catch (err) {
                      toast(err.message);
                    }
                  },
                },
                "취소",
              ),
        ),
      ),
    ),
  );
}
let searchTimer;
$("#search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadList, 250);
});
$("#filter").addEventListener("change", loadList);

// --- 일괄 발급 ---
$("#bulk-file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (f) $("#bulk-text").value = await f.text();
});

let bulkResult = [];
$("#bulk-go").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const text = $("#bulk-text").value.trim();
  $("#bulk-error").textContent = "";
  if (!text) return ($("#bulk-error").textContent = "명단을 넣어 주세요.");
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  if (!confirm(`명단 ${lines}줄로 라이선스를 발급할까요? (첫 줄이 머리글이면 그 줄은 빼고 발급해요)`)) return;
  btn.disabled = true;
  try {
    bulkResult = await api("POST", "/api/licenses/bulk", { csv: text, edition: $("#bulk-edition").value });
    $("#bulk-done").hidden = false;
    $("#bulk-title").textContent = `${bulkResult.length}명 발급했어요 (${bulkResult[0].license_id} ~ ${bulkResult[bulkResult.length - 1].license_id})`;
    $("#bulk-text").value = "";
  } catch (err) {
    $("#bulk-error").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$("#bulk-download").addEventListener("click", () => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["라이선스 번호", "이름", "이메일", "주문번호", "라이선스 키"], ...bulkResult.map((r) => [r.license_id, r.name, r.email, r.order_no, r.key])];
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `licenses-bulk-${new Date().toLocaleDateString("sv-SE")}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// --- 시작 ---
api("GET", "/api/session")
  .then((s) => (s.unlocked ? showAdmin() : showLock()))
  .catch(() => showLock());
