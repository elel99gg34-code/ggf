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
  api("GET", "/api/info")
    .then((i) => ($("#storage-warning").hidden = i.durable))
    .catch(() => {});
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
  if (name === "mail") loadMail();
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
      send_email: field("send_email").checked,
    });
    $("#issued").hidden = false;
    $("#issued-title").textContent = `발급했어요 · ${lastIssued.license_id} · ${lastIssued.edition_label} · ${lastIssued.name}${lastIssued.expires ? ` · ${lastIssued.expires}까지` : ""}`;
    $("#issued-key").value = lastIssued.key;
    $("#issued-mail").textContent = lastIssued.mail ? `${lastIssued.email} 주소로 보낼 메일을 대기열에 넣었어요. '메일' 탭에서 보냈는지 볼 수 있어요.` : "";
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
const MAIL_LABEL = { queued: ["wait", "메일 대기"], sent: ["ok", "메일 보냄"], failed: ["bad", "메일 실패"] };
function mailChip(mail) {
  if (!mail) return null;
  const [cls, label] = MAIL_LABEL[mail.status] || ["", mail.status];
  return el("span", { class: `chip ${cls}`, title: mail.error || "" }, label);
}

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
          mailChip(r.mail),
          r.key_viewed_at ? el("span", { class: "chip ok", title: "고객이 메일 링크로 키를 처음 연 때" }, `키 열람 ${fmtDate(r.key_viewed_at)}`) : r.mail ? el("span", { class: "chip wait" }, "키 미열람") : null,
        ),
        el(
          "div",
          { class: "meta" },
          [r.license_id, r.email, r.order_no && `주문 ${r.order_no}`, `발급 ${fmtDate(r.issued_at)}`, r.expires && `${r.expires}까지`, r.downloads && `설치 파일·설명서 ${r.downloads}회 받음`, r.memo, r.mail?.status === "failed" && `메일 실패: ${r.mail.error}`, r.revoked_at && `취소 ${fmtDate(r.revoked_at)}${r.revoke_reason ? ` (${r.revoke_reason})` : ""}`]
            .filter(Boolean)
            .join(" · "),
        ),
        el(
          "div",
          { class: "actions" },
          el("button", { onclick: () => copy(r.key, "키를 복사했어요") }, "키 복사"),
          el("button", { onclick: () => copy(guideText(r), "안내 문구를 복사했어요") }, "안내 문구"),
          r.revoked_at || !r.email
            ? null
            : el(
                "button",
                {
                  onclick: async () => {
                    if (r.mail && !confirm(`${r.email} 주소로 안내 메일을 다시 보낼까요?`)) return;
                    try {
                      await api("POST", `/api/licenses/${encodeURIComponent(r.license_id)}/send`);
                      toast("메일을 대기열에 넣었어요");
                      loadList();
                    } catch (err) {
                      toast(err.message);
                    }
                  },
                },
                r.mail ? "메일 다시" : "메일 보내기",
              ),
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
    const send = $("#bulk-send").checked;
    bulkResult = await api("POST", "/api/licenses/bulk", { csv: text, edition: $("#bulk-edition").value, send_email: send });
    $("#bulk-done").hidden = false;
    $("#bulk-title").textContent =
      `${bulkResult.length}명 발급했어요 (${bulkResult[0].license_id} ~ ${bulkResult[bulkResult.length - 1].license_id})` +
      (send ? ` · 메일 ${bulkResult.length}통을 대기열에 넣었어요` : "");
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

// --- 메일 ---
const mailForm = $("#mail-form");
const mfield = (name) => mailForm.elements.namedItem(name);
let mailCfg = null;

function fillMail(m) {
  mailCfg = m.settings;
  for (const k of ["sender_name", "reply_to", "support_email", "daily_limit", "download_windows", "download_mac", "seller_footer"]) mfield(k).value = m.settings[k] ?? "";
  mfield("attach_guide").checked = m.settings.attach_guide;
  mfield("include_key").checked = m.settings.include_key;
  $("#guide-state").textContent = m.guide_attached ? "" : "(서버에 설명서 파일이 아직 없어요)";
  $("#relay-url").value = m.settings.relay_url;
  $("#script-code").value = m.script;
  const state = $("#mail-state");
  state.className = `chip ${m.configured ? "ok" : "bad"}`;
  state.textContent = m.configured ? "Gmail 연결됨" : "아직 연결 안 됨";
  $("#mail-summary").textContent =
    `최근 24시간 ${m.sent_24h}통 보냄 (하루 ${m.settings.daily_limit}통까지) · 대기 ${m.queued}통 · 실패 ${m.failed}통` +
    (!m.settings.download_windows && !m.settings.download_mac ? " · 설치 파일 링크가 아직 없어요" : "");
  if (!$("#test-to").value) $("#test-to").value = m.settings.reply_to || m.settings.support_email || "";
}

async function loadMail() {
  try {
    fillMail(await api("GET", "/api/mail"));
  } catch (err) {
    $("#mail-summary").textContent = err.message;
  }
  loadOutbox();
}

function mailSettingsFromForm() {
  return {
    relay_url: $("#relay-url").value.trim(),
    sender_name: mfield("sender_name").value,
    reply_to: mfield("reply_to").value,
    support_email: mfield("support_email").value,
    daily_limit: Number(mfield("daily_limit").value) || 90,
    download_windows: mfield("download_windows").value,
    download_mac: mfield("download_mac").value,
    seller_footer: mfield("seller_footer").value,
    attach_guide: mfield("attach_guide").checked,
    include_key: mfield("include_key").checked,
  };
}

mailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#mail-error").textContent = "";
  try {
    fillMail(await api("PUT", "/api/mail/settings", mailSettingsFromForm()));
    toast("설정을 저장했어요");
  } catch (err) {
    $("#mail-error").textContent = err.message;
  }
});

$("#copy-script").addEventListener("click", () => copy($("#script-code").value, "코드를 복사했어요"));

$("#relay-save").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  $("#relay-result").textContent = "확인하는 중…";
  try {
    fillMail(await api("PUT", "/api/mail/settings", mailSettingsFromForm()));
    const r = await api("POST", "/api/mail/ping");
    $("#relay-result").textContent = `연결됐어요. 보내는 주소: ${r.account || "(알 수 없음)"} · 오늘 남은 발송 수: ${r.remaining}통`;
  } catch (err) {
    $("#relay-result").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$("#test-send").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  $("#test-result").textContent = "보내는 중…";
  try {
    await api("POST", "/api/mail/test", { to: $("#test-to").value });
    $("#test-result").textContent = "보냈어요. 메일함(스팸함도)을 확인해 보세요.";
  } catch (err) {
    $("#test-result").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$("#notice-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget.elements;
  if (!confirm("라이선스가 있는 사람들에게 이 공지를 보낼까요?")) return;
  try {
    const r = await api("POST", "/api/notices", { subject: f.namedItem("subject").value, body: f.namedItem("body").value, target: f.namedItem("target").value });
    $("#notice-result").textContent = `${r.queued}명에게 보낼 공지를 대기열에 넣었어요.`;
    e.currentTarget.reset();
    loadOutbox();
  } catch (err) {
    $("#notice-result").textContent = err.message;
  }
});

const KIND_LABEL = { license: "라이선스", notice: "공지", test: "테스트" };
async function loadOutbox() {
  let rows;
  try {
    rows = await api("GET", `/api/mail/outbox?status=${$("#outbox-filter").value}`);
  } catch {
    return;
  }
  $("#outbox").replaceChildren(
    ...(rows.length
      ? rows.map((m) =>
          el(
            "li",
            {},
            el("div", { class: "who" }, mailChip({ status: m.status, error: m.last_error }), el("span", { class: "chip" }, KIND_LABEL[m.kind] || m.kind), m.to_addr),
            el(
              "div",
              { class: "meta" },
              [m.subject, m.license_id, m.sent_at ? `보냄 ${new Date(m.sent_at).toLocaleString("ko-KR")}` : `넣음 ${new Date(m.created_at).toLocaleString("ko-KR")}`,
               m.attempts && `시도 ${m.attempts}번`, m.last_error]
                .filter(Boolean)
                .join(" · "),
            ),
            el(
              "div",
              { class: "actions" },
              m.status === "sent"
                ? null
                : el(
                    "button",
                    {
                      onclick: async () => {
                        try {
                          await api("POST", `/api/mail/${m.id}/retry`);
                          toast("다시 보낼게요");
                          setTimeout(loadOutbox, 1500);
                        } catch (err) {
                          toast(err.message);
                        }
                      },
                    },
                    "지금 다시 보내기",
                  ),
            ),
          ),
        )
      : [el("li", { class: "muted" }, "아직 보낸 메일이 없어요.")]),
  );
}
$("#outbox-filter").addEventListener("change", loadOutbox);

// --- 시작 ---
api("GET", "/api/session")
  .then((s) => (s.unlocked ? showAdmin() : showLock()))
  .catch(() => showLock());
