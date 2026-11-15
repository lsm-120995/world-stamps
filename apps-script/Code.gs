/**
 * アースクイズ：ゲーム内の意見フォームの中継役（Google Apps Script）
 *
 * ゲームから送られた意見を受け取り、作者の Gmail にメールで届ける。
 * このプログラムは Google の画面（script.google.com）に貼りつけて使う。
 *
 * ■ 宛先について
 *   下の TO を空のままにすると、このプログラムを公開した Google アカウントの
 *   アドレスに届く。別の宛先（サブアドレスなど）にしたいときは、
 *   Google の画面の上でだけ TO を書きかえること。
 *   GitHub に置くこのファイルには、本当のアドレスを書かない。
 */
const TO = "";

const MAX_MESSAGE = 2000;   // 本文の上限（文字）
const MAX_PER_HOUR = 30;    // 1時間に受け付ける件数の上限（いたずらの連続投稿を止める）

const KINDS = {
  translation: "翻訳・名前のまちがい",
  bug: "うまく動かない",
  add: "国・名所を追加してほしい",
  idea: "新しい遊びのアイデア",
  other: "その他",
};

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // 人には見えない欄（website）に何か入っていたら、機械的な投稿とみなして黙って捨てる
    if (data.website) return reply({ ok: true });

    const message = clean(data.message, MAX_MESSAGE);
    if (message.length < 5) return reply({ ok: false, error: "short" });

    // 1時間あたりの件数を数えて、上限をこえたら断る
    const cache = CacheService.getScriptCache();
    const hourKey = "count-" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHH");
    const count = Number(cache.get(hourKey) || 0);
    if (count >= MAX_PER_HOUR) return reply({ ok: false, error: "busy" });
    cache.put(hourKey, String(count + 1), 3600);

    const kind = KINDS[data.kind] || KINDS.other;
    const lines = [
      "■ 内容の種類：" + kind,
      "■ 言語：" + clean(data.lang, 20),
      "■ モード：" + clean(data.mode, 40),
      "■ 連絡先：" + (clean(data.contact, 120) || "（なし）"),
      "",
      "■ くわしい内容",
      message,
      "",
      "――――――――",
      "送信日時：" + Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm") + "（日本時間）",
      "画面の大きさ：" + clean(data.screen, 20),
      "このメールは、アースクイズのゲーム内フォームから自動で送られました。",
    ];

    MailApp.sendEmail({
      to: TO || Session.getEffectiveUser().getEmail(),
      subject: "[アースクイズ] " + kind + "：" + message.slice(0, 30).replace(/\s+/g, " "),
      body: lines.join("\n"),
    });
    return reply({ ok: true });
  } catch (err) {
    // 原因は Apps Script の「実行数」の画面で見られる（外には詳しい内容を返さない）
    console.error("意見の送信に失敗: " + err);
    return reply({ ok: false, error: "server" });
  }
}

/**
 * 設定の確認用。Apps Script の画面で、上の関数の選択を「sendTest」にして「実行」を押す。
 * メールを送る許可がまだなければ、ここで許可の画面が出る。
 * 成功すると、宛先にテストのメールが1通届く。
 */
function sendTest() {
  const to = TO || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: to,
    subject: "[アースクイズ] 設定確認のテスト",
    body: "このメールが届いていれば、メールを送る設定は正しくできています。",
  });
  console.log("テストのメールを送りました。宛先: " + to + " / 今日あと送れる数: " + MailApp.getRemainingDailyQuota());
}

// ブラウザで URL を直接開いたときの表示（動いているかの確認用）
function doGet() {
  return reply({ ok: true, service: "earth-quiz-feedback" });
}

// 文字列以外や長すぎる入力を受けつけないようにする
function clean(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
