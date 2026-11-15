// ゲーム内の意見フォーム。
// 書いた内容は、中継役（apps-script/Code.gs を Google に置いたもの）を通って、作者のメールに届く。
// 中継役のURL（i18n.js の FEEDBACK_ENDPOINT）が空のあいだは、これまでどおり GitHub のフォームを開く。
(function () {
  "use strict";
  // 意見を送るボタン（メニューの上部と、画面右上の 💬）
  const triggers = [...document.querySelectorAll(".feedback-trigger")];
  if (!triggers.length || !LANG) return;
  triggers.forEach((b) => { b.title = t("fb_title"); });
  if (!FEEDBACK_ENDPOINT) {
    // 中継役がまだなければ、GitHub のフォームを開く
    if (!FEEDBACK_URL) return;
    triggers.forEach((b) => {
      b.hidden = false;
      b.addEventListener("click", () => window.open(FEEDBACK_URL, "_blank", "noopener"));
    });
    return;
  }

  const KINDS = ["translation", "bug", "add", "idea", "other"];
  let overlay = null;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "feedbackBox";
    overlay.hidden = true;
    overlay.innerHTML =
      `<form class="card feedback-card" novalidate>` +
      `<div class="book-head"><h2>💬 ${esc(t("fb_title"))}</h2>` +
      `<button type="button" class="icon-btn" id="fbClose" aria-label="${esc(t("close"))}">✕</button></div>` +
      `<p class="book-help">${esc(t("fb_intro"))}</p>` +
      `<label class="row-label" for="fbKind">${esc(t("fb_kind"))}</label>` +
      `<select class="select" id="fbKind">${KINDS.map((k, i) => `<option value="${k}">${esc(t("fb_k" + (i + 1)))}</option>`).join("")}</select>` +
      `<label class="row-label" for="fbMessage">${esc(t("fb_msg"))}</label>` +
      `<textarea id="fbMessage" rows="5" maxlength="2000" placeholder="${esc(t("fb_msg_ph"))}"></textarea>` +
      `<label class="row-label" for="fbContact">${esc(t("fb_contact"))}</label>` +
      `<input id="fbContact" type="text" maxlength="120" autocomplete="off">` +
      // 人には見えない欄。機械的な投稿はここも埋めてくるので、中継役で見分けて捨てる
      `<input id="fbWebsite" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="fb-trap">` +
      `<p class="fb-note">${esc(t("fb_note"))}</p>` +
      `<div class="fb-status" id="fbStatus" aria-live="polite"></div>` +
      `<button type="submit" class="primary big" id="fbSend">${esc(t("fb_send"))}</button>` +
      (FEEDBACK_URL ? `<a class="feedback-link" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener">${esc(t("fb_github"))}</a>` : "") +
      `</form>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#fbClose").addEventListener("click", close);
    overlay.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); send(); });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const $ = (id) => overlay.querySelector("#" + id);

  function open() {
    if (!overlay) build();
    setStatus("", "");
    $("fbSend").disabled = false;
    $("fbSend").textContent = t("fb_send");
    overlay.hidden = false;
    $("fbMessage").focus({ preventScroll: true });
  }
  function close() { overlay.hidden = true; }
  function setStatus(text, kind) {
    const s = $("fbStatus");
    s.textContent = text;
    s.className = "fb-status" + (kind ? " " + kind : "");
  }

  async function send() {
    const message = $("fbMessage").value.trim();
    if (message.length < 5) { setStatus(t("fb_short"), "bad"); return; }
    const pressed = document.querySelector('#modeGroup [aria-pressed="true"]');
    const payload = {
      kind: $("fbKind").value,
      message,
      contact: $("fbContact").value.trim(),
      website: $("fbWebsite").value,
      lang: langInfo().label,
      // メニューで選ばれているモードを、画面に出ている名前（例：国をさがせ！）で送る
      mode: pressed ? ((pressed.querySelector("b") || pressed).textContent.trim() + ` (${pressed.dataset.value})`) : "",
      screen: `${window.innerWidth}x${window.innerHeight}`,
    };
    $("fbSend").disabled = true;
    $("fbSend").textContent = t("fb_sending");
    setStatus("", "");
    try {
      // 中継役（Google Apps Script）は text/plain で送ると、事前の確認通信なしで受け取れる
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "failed");
      setStatus(t("fb_done"), "good");
      $("fbMessage").value = "";
      $("fbContact").value = "";
      $("fbSend").textContent = t("fb_send");
      setTimeout(() => { if (!overlay.hidden) close(); }, 2500);
    } catch (err) {
      setStatus(t("fb_err"), "bad");
      $("fbSend").disabled = false;
      $("fbSend").textContent = t("fb_send");
    }
  }

  // ボタンを押すと、このフォームを開く
  triggers.forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", (e) => { e.preventDefault(); open(); });
  });
})();
