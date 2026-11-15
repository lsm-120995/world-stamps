// 言語の切り替え。画面の文言と、国名・名所名の言語をここでまとめて扱う。
// 言語を変えたらページを読み込み直し、最初から選んだ言語で組み立てる。

// 意見を受け付けるページのURL（GitHub の Issues など）。
// 空のままだと、メニューの「意見を送る」リンクは表示されない。公開先が決まったらここに入れる。
// 一覧ではなく、意見を書く入力フォーム（.github/ISSUE_TEMPLATE/feedback.yml）を直接開く
const FEEDBACK_URL = "https://github.com/lsm-120995/world-stamps/issues/new?template=feedback.yml";

const LANG_KEY = "earthquiz:lang";
const LANGS = [
  { code: "ja", label: "日本語", html: "ja", wiki: "ja", locale: "ja-JP" },
  { code: "en", label: "English", html: "en", wiki: "en", locale: "en-US" },
  { code: "zh", label: "简体中文", html: "zh-Hans", wiki: "zh", variant: "zh-cn", locale: "zh-CN" },
  { code: "zht", label: "繁體中文", html: "zh-Hant", wiki: "zh", variant: "zh-tw", locale: "zh-TW" },
  { code: "ko", label: "한국어", html: "ko", wiki: "ko", locale: "ko-KR" },
];
const UI_ORDER = ["ja", "en", "zh", "zht", "ko"];   // 下の UI 表の並び
const DATA_ORDER = ["en", "zh", "zht", "ko"];       // names.js の並び（日本語は元データ）

let LANG = null; // まだ選んでいなければ null
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (UI_ORDER.includes(saved)) LANG = saved;
} catch (e) { /* 保存が使えなければ毎回選んでもらう */ }

const langInfo = () => LANGS.find((l) => l.code === LANG) || LANGS[0];

// 画面の文言: キー → [日本語, 英語, 簡体字, 繁体字, 韓国語]
const UI = {
  app: ["アースクイズ", "Earth Quiz", "地球问答", "地球問答", "어스 퀴즈"],
  lead: ["地球儀を回して、世界の国をあてよう！", "Spin the globe and find the countries of the world!", "转动地球仪，猜猜世界各国！", "轉動地球儀，猜猜世界各國！", "지구본을 돌려 세계의 나라를 맞혀 보세요!"],
  book: ["スタンプ帳", "Stamp Book", "印章册", "印章冊", "스탬프 북"],
  lookup: ["場所をしらべる", "Look Up a Place", "查询地点", "查詢地點", "장소 찾아보기"],
  language: ["言語", "Language", "语言", "語言", "언어"],
  l_mode: ["モード", "Mode", "模式", "模式", "모드"],
  l_region: ["地域", "Region", "地区", "地區", "지역"],
  l_level: ["難易度", "Difficulty", "难度", "難度", "난이도"],
  l_count: ["問題数", "Questions", "题数", "題數", "문제 수"],
  l_time: ["制限時間", "Time limit", "时间限制", "時間限制", "제한 시간"],

  m_find: ["国をさがせ！", "Find the Country", "找国家", "找國家", "나라 찾기"],
  m_find_s: ["国名を見て地球儀をタップ", "See a name, tap the globe", "看国名，点地球仪", "看國名，點地球儀", "나라 이름을 보고 지구본을 탭"],
  m_name: ["この国はどこ？", "Name the Country", "这是哪个国家？", "這是哪個國家？", "이 나라는 어디?"],
  m_name_s: ["光る国を4択で答える", "Pick the glowing country from 4", "四选一，认出发光的国家", "四選一，認出發光的國家", "빛나는 나라를 4지선다로"],
  m_capital: ["首都クイズ", "Capital Quiz", "首都问答", "首都問答", "수도 퀴즈"],
  m_capital_s: ["首都名から国をタップ", "See a capital, tap its country", "看首都，点国家", "看首都，點國家", "수도 이름을 보고 나라를 탭"],
  m_place: ["都市・名所クイズ", "Cities & Landmarks", "城市与名胜", "城市與名勝", "도시·명소 퀴즈"],
  m_place_s: ["山や都市の場所をタップ", "Tap where the place is", "点出山川和城市的位置", "點出山川和城市的位置", "산과 도시의 위치를 탭"],
  m_explore: ["じゆうに見る", "Free Explore", "自由浏览", "自由瀏覽", "자유롭게 보기"],
  m_explore_s: ["国名・首都を調べる", "Browse names and capitals", "查看国名和首都", "查看國名和首都", "나라 이름·수도 알아보기"],

  r_world: ["世界", "World", "世界", "世界", "세계"],
  r_asia: ["アジア", "Asia", "亚洲", "亞洲", "아시아"],
  r_europe: ["ヨーロッパ", "Europe", "欧洲", "歐洲", "유럽"],
  r_africa: ["アフリカ", "Africa", "非洲", "非洲", "아프리카"],
  r_americas: ["南北アメリカ", "Americas", "美洲", "美洲", "아메리카"],
  r_oceania: ["オセアニア", "Oceania", "大洋洲", "大洋洲", "오세아니아"],
  lv1: ["かんたん", "Easy", "简单", "簡單", "쉬움"],
  lv2: ["ふつう", "Normal", "普通", "普通", "보통"],
  lv3: ["むずかしい", "Hard", "困难", "困難", "어려움"],
  c_n: ["{n}問", "{n} questions", "{n}题", "{n}題", "{n}문제"],
  c_all: ["全問", "All", "全部", "全部", "전체"],
  t_sec: ["{n}秒", "{n} sec", "{n}秒", "{n}秒", "{n}초"],
  t_none: ["制限なし", "No limit", "不限时", "不限時", "제한 없음"],
  start: ["スタート！", "Start!", "开始！", "開始！", "시작!"],
  help: ["ドラッグで回転 ・ ホイール／ピンチで拡大縮小", "Drag to rotate · Scroll or pinch to zoom", "拖动旋转 · 滚轮／双指缩放", "拖曳旋轉 · 滾輪／雙指縮放", "드래그로 회전 · 휠/핀치로 확대·축소"],
  menu: ["メニュー", "Menu", "菜单", "選單", "메뉴"],
  loading: ["地図を読み込み中…", "Loading map…", "正在加载地图…", "正在載入地圖…", "지도를 불러오는 중…"],
  load_err: ["地図データを読み込めませんでした。インターネット接続を確認して、ページを再読み込みしてください。", "Could not load the map. Check your internet connection and reload the page.", "无法加载地图数据。请检查网络连接后重新加载页面。", "無法載入地圖資料。請檢查網路連線後重新載入頁面。", "지도 데이터를 불러오지 못했습니다. 인터넷 연결을 확인하고 페이지를 새로 고쳐 주세요."],
  sound_on: ["音をオンにする", "Turn sound on", "开启声音", "開啟聲音", "소리 켜기"],
  sound_off: ["音をオフにする", "Turn sound off", "关闭声音", "關閉聲音", "소리 끄기"],

  explore_hint: ["地球儀を自由に回して、国の名前と首都を調べよう。", "Spin the globe freely and look up countries and capitals.", "自由转动地球仪，查看各国名称和首都。", "自由轉動地球儀，查看各國名稱和首都。", "지구본을 자유롭게 돌려 나라 이름과 수도를 알아보세요."],
  best_line: ["全{n}問 ・ ハイスコア：{best}", "{n} questions · High score: {best}", "共{n}题 · 最高分：{best}", "共{n}題 · 最高分：{best}", "총 {n}문제 · 최고 점수: {best}"],
  none_yet: ["まだありません", "none yet", "暂无", "尚無", "아직 없음"],
  pts: ["{n}点", "{n} pts", "{n}分", "{n}分", "{n}점"],

  q_where: ["{name} はどこ？", "Where is {name}?", "{name} 在哪里？", "{name} 在哪裡？", "{name} — 어디일까요?"],
  q_capital: ["首都が {name} の国はどこ？", "Which country has {name} as its capital?", "首都是 {name} 的国家在哪里？", "首都是 {name} 的國家在哪裡？", "수도가 {name} 인 나라는 어디일까요?"],
  q_name: ["光っている国はどこ？", "Which country is glowing?", "发光的是哪个国家？", "發光的是哪個國家？", "빛나는 나라는 어디일까요?"],
  hint_tap: ["地球儀を回してタップ！", "Spin the globe and tap!", "转动地球仪并点击！", "轉動地球儀並點擊！", "지구본을 돌려서 탭하세요!"],
  hint_place: ["（{kind}）地球儀を回して、場所をタップ！", "({kind}) Spin the globe and tap the spot!", "（{kind}）转动地球仪，点出位置！", "（{kind}）轉動地球儀，點出位置！", "({kind}) 지구본을 돌려 위치를 탭하세요!"],

  correct: ["⭕ 正解！ +{n}点", "⭕ Correct! +{n} pts", "⭕ 答对了！+{n}分", "⭕ 答對了！+{n}分", "⭕ 정답! +{n}점"],
  stamp_get: ["🆕 スタンプGET！", "🆕 New stamp!", "🆕 获得印章！", "🆕 獲得印章！", "🆕 스탬프 획득!"],
  err_dist: ["誤差 {d}", "off by {d}", "误差 {d}", "誤差 {d}", "오차 {d}"],
  bonus: ["（タイムボーナス +{n}）", "(time bonus +{n})", "（时间奖励 +{n}）", "（時間獎勵 +{n}）", "(시간 보너스 +{n})"],
  timeup: ["⏰ 時間切れ…", "⏰ Time's up…", "⏰ 时间到…", "⏰ 時間到…", "⏰ 시간 초과…"],
  timeup_short: ["時間切れ", "time's up", "时间到", "時間到", "시간 초과"],
  wrong_place: ["❌ ざんねん…（{d}）", "❌ Not quite… ({d})", "❌ 可惜…（{d}）", "❌ 可惜…（{d}）", "❌ 아쉬워요… ({d})"],
  wrong_pick: ["❌ ざんねん…（選んだのは {x}）", "❌ Not quite… (you picked {x})", "❌ 可惜…（你选的是 {x}）", "❌ 可惜…（你選的是 {x}）", "❌ 아쉬워요… (선택: {x})"],
  answer_is: ["正解は {name}", "The answer is {name}", "正确答案是 {name}", "正確答案是 {name}", "정답은 {name}"],
  capital_is: ["首都：{c}", "Capital: {c}", "首都：{c}", "首都：{c}", "수도: {c}"],
  km: ["約{n}km", "about {n} km", "约{n}公里", "約{n}公里", "약 {n}km"],
  dist_off: ["{d}ずれ", "{d} away", "偏差{d}", "偏差{d}", "{d} 차이"],
  next: ["次の問題 →", "Next →", "下一题 →", "下一題 →", "다음 문제 →"],
  see_result: ["結果を見る →", "See results →", "查看结果 →", "查看結果 →", "결과 보기 →"],

  rank1: ["🌏 地球マスター！パーフェクト！", "🌏 Earth Master! Perfect!", "🌏 地球大师！全对！", "🌏 地球大師！全對！", "🌏 지구 마스터! 퍼펙트!"],
  rank2: ["🌟 すばらしい！", "🌟 Wonderful!", "🌟 太棒了！", "🌟 太棒了！", "🌟 훌륭해요!"],
  rank3: ["👍 いい調子！", "👍 Nice going!", "👍 不错哦！", "👍 不錯喔！", "👍 잘하고 있어요!"],
  rank4: ["📚 もう一度チャレンジしよう！", "📚 Give it another try!", "📚 再挑战一次吧！", "📚 再挑戰一次吧！", "📚 다시 도전해 봐요!"],
  per_q: ["1問{n}秒", "{n} sec each", "每题{n}秒", "每題{n}秒", "문제당 {n}초"],
  no_limit: ["制限時間なし", "No time limit", "不限时", "不限時", "제한 시간 없음"],
  result_count: ["{total}問中 {n}問 正解", "{n} of {total} correct", "{total}题中答对{n}题", "{total}題中答對{n}題", "{total}문제 중 {n}문제 정답"],
  new_best: ["🎉 ハイスコア更新！", "🎉 New high score!", "🎉 刷新最高分！", "🎉 刷新最高分！", "🎉 최고 점수 갱신!"],
  best: ["ハイスコア：{n}", "High score: {n}", "最高分：{n}", "最高分：{n}", "최고 점수: {n}"],
  new_stamps: ["🆕 新しいスタンプを {n}個 集めました！", "🆕 New stamps collected: {n}", "🆕 获得了{n}个新印章！", "🆕 獲得了{n}個新印章！", "🆕 새 스탬프를 {n}개 모았어요!"],
  no_new_stamps: ["新しいスタンプはありませんでした", "No new stamps this time", "这次没有新印章", "這次沒有新印章", "이번에는 새 스탬프가 없어요"],
  missed_countries: ["まちがえた国", "Countries you missed", "答错的国家", "答錯的國家", "틀린 나라"],
  missed_places: ["まちがえた場所", "Places you missed", "答错的地点", "答錯的地點", "틀린 장소"],
  retry: ["もう一度", "Play again", "再来一次", "再來一次", "다시 하기"],
  to_menu: ["メニューへ", "Back to menu", "返回菜单", "返回選單", "메뉴로"],
  see_book: ["📖 スタンプ帳を見る", "📖 Open Stamp Book", "📖 查看印章册", "📖 查看印章冊", "📖 스탬프 북 보기"],

  explore_prompt: ["国をタップすると、名前と首都が表示されます", "Tap a country to see its name and capital", "点击国家即可查看名称和首都", "點擊國家即可查看名稱和首都", "나라를 탭하면 이름과 수도가 표시됩니다"],
  explore_legend: ["色のちがう国と白い点は、スタンプを集めたところ", "Orange countries and white dots are stamps you've collected", "橙色国家和白点表示已获得印章的地方", "橘色國家和白點表示已獲得印章的地方", "주황색 나라와 흰 점은 스탬프를 모은 곳입니다"],
  stamp_have: ["✅ スタンプ獲得済み", "✅ Stamp collected", "✅ 已获得印章", "✅ 已獲得印章", "✅ 스탬프 획득 완료"],
  book_help: ["クイズに正解するとスタンプがもらえます。集めたスタンプを押すと、地球儀でその場所を見られます。", "Answer correctly to earn stamps. Tap a stamp to see that place on the globe.", "答对题目即可获得印章。点击已获得的印章，可在地球仪上查看该地点。", "答對題目即可獲得印章。點擊已獲得的印章，可在地球儀上查看該地點。", "퀴즈를 맞히면 스탬프를 받습니다. 모은 스탬프를 누르면 지구본에서 그 장소를 볼 수 있어요."],
  tab_countries: ["国", "Countries", "国家", "國家", "나라"],
  tab_places: ["都市・名所", "Cities & Landmarks", "城市与名胜", "城市與名勝", "도시·명소"],
  book_total: ["ぜんぶで {got} / {all}（{pct}%）", "Total {got} / {all} ({pct}%)", "合计 {got} / {all}（{pct}%）", "合計 {got} / {all}（{pct}%）", "전체 {got} / {all} ({pct}%)"],
  book_reset: ["スタンプをすべて消す", "Erase all stamps", "清除所有印章", "清除所有印章", "스탬프 모두 지우기"],
  book_reset_confirm: ["集めたスタンプをすべて消します。元には戻せません。よろしいですか？", "This erases every stamp you've collected and cannot be undone. Continue?", "将清除所有已获得的印章，且无法恢复。确定吗？", "將清除所有已獲得的印章，且無法復原。確定嗎？", "모은 스탬프를 모두 지웁니다. 되돌릴 수 없습니다. 계속할까요?"],
  view_on_globe: ["地球儀で見る", "View on globe", "在地球仪上查看", "在地球儀上查看", "지구본에서 보기"],
  close: ["閉じる", "Close", "关闭", "關閉", "닫기"],

  lk_placeholder: ["郵便番号 または 地名（例：100-0001、鎌倉市、パリ）", "Japanese postal code or place name (e.g. 100-0001, Kyoto, Paris)", "日本邮编或地名（例：100-0001、汪清县、巴黎）", "日本郵遞區號或地名（例：100-0001、臺北市、巴黎）", "일본 우편번호 또는 지명 (예: 100-0001, 서울, 파리)"],
  lk_btn: ["しらべる", "Search", "查询", "查詢", "찾기"],
  lk_notice: ["入力した郵便番号・地名は、検索のため外部サービス（郵便番号は HeartRails Geo API、地名は Wikipedia）に送信されます。番地は入れないでください。", "What you type is sent to outside services to search (postal codes to HeartRails Geo API, place names to Wikipedia). Please don't enter a street address.", "输入的邮编和地名会发送到外部服务进行查询（邮编发送至 HeartRails Geo API，地名发送至维基百科）。请勿输入门牌号。", "輸入的郵遞區號和地名會傳送到外部服務進行查詢（郵遞區號傳送至 HeartRails Geo API，地名傳送至維基百科）。請勿輸入門牌號碼。", "입력한 우편번호와 지명은 검색을 위해 외부 서비스로 전송됩니다(우편번호는 HeartRails Geo API, 지명은 위키백과). 번지는 입력하지 마세요."],
  lk_zip7: ["郵便番号は7けたで入力してください。", "Postal codes must be 7 digits.", "邮编请输入7位数字。", "郵遞區號請輸入7位數字。", "우편번호는 7자리로 입력해 주세요."],
  lk_zip_searching: ["郵便番号を検索中…", "Looking up postal code…", "正在查询邮编…", "正在查詢郵遞區號…", "우편번호 검색 중…"],
  lk_searching: ["「{q}」を検索中…", "Searching for \"{q}\"…", "正在查询“{q}”…", "正在查詢「{q}」…", "\"{q}\" 검색 중…"],
  lk_empty: ["郵便番号（7けた）か地名を入力してください。", "Enter a 7-digit postal code or a place name.", "请输入邮编（7位）或地名。", "請輸入郵遞區號（7位）或地名。", "우편번호(7자리) 또는 지명을 입력해 주세요."],
  lk_net: ["通信できませんでした。インターネット接続を確認して、もう一度お試しください。", "Couldn't connect. Check your internet connection and try again.", "无法连接。请检查网络后重试。", "無法連線。請檢查網路後再試一次。", "연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."],
  lk_zip_nf: ["この郵便番号は見つかりませんでした。", "That postal code wasn't found.", "未找到该邮编。", "找不到該郵遞區號。", "해당 우편번호를 찾지 못했습니다."],
  lk_nf: ["「{q}」に合う場所が見つかりませんでした。別の書き方でお試しください。", "No place found for \"{q}\". Try writing it another way.", "未找到与“{q}”相符的地点。请换一种写法试试。", "找不到與「{q}」相符的地點。請換一種寫法試試。", "\"{q}\"에 맞는 장소를 찾지 못했습니다. 다른 표기로 시도해 보세요."],
  lk_other_lang: ["選んだ言語の記事がないため、{lang}版の文章を表示しています。", "No article exists in your language, so the {lang} version is shown.", "所选语言没有对应条目，显示的是{lang}版内容。", "所選語言沒有對應條目，顯示的是{lang}版內容。", "선택한 언어의 문서가 없어 {lang}판 내용을 표시합니다."],
  lk_read: ["Wikipedia「{title}」で続きを読む", "Read more on Wikipedia: {title}", "在维基百科阅读“{title}”", "在維基百科閱讀「{title}」", "위키백과 \"{title}\"에서 더 읽기"],
  lk_source: ["（文章の出典：Wikipedia、CC BY-SA）", "(Text source: Wikipedia, CC BY-SA)", "（文字来源：维基百科，CC BY-SA）", "（文字來源：維基百科，CC BY-SA）", "(글 출처: 위키백과, CC BY-SA)"],
  lk_more: [" ほか", " and more", " 等", " 等", " 외"],
  feedback: ["💬 意見・まちがいを送る", "💬 Send feedback or corrections", "💬 提交意见或纠错", "💬 提交意見或糾錯", "💬 의견·오류 보내기"],
  unknown: ["不明な地域", "Unknown area", "未知地区", "未知地區", "알 수 없는 지역"],
};

// 文言を取り出す。{n} などの穴は vars で埋める
function t(key, vars) {
  const row = UI[key];
  const i = Math.max(0, UI_ORDER.indexOf(LANG));
  let s = row ? (row[i] != null ? row[i] : row[0]) : key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

function setLanguage(code) {
  try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* ignore */ }
  location.reload();
}

// HTML に直接書いてある文言（data-i18n のついた要素）を、選んだ言語に差しかえる
function applyStaticText() {
  document.documentElement.lang = langInfo().html;
  document.title = t("app");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const vars = node.dataset.i18nN ? { n: node.dataset.i18nN } : undefined;
    node.textContent = t(node.dataset.i18n, vars);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
}

// 国・名所のデータを、選んだ言語の名前に書きかえる（ゲーム本体はこのデータをそのまま表示する）
function localizeData() {
  const di = DATA_ORDER.indexOf(LANG); // 日本語なら -1（元データのまま）
  const jaNameToId = {};
  for (const id of Object.keys(COUNTRIES)) jaNameToId[COUNTRIES[id].name] = id;
  const joiner = LANG === "en" || LANG === "ko" ? " / " : "／";

  for (const p of PLACES) {
    p.pid = p.info.name; // スタンプの保存に使う、言語によらない名前
    if (di < 0) continue;
    p.country = p.country.split("／").map((part) => {
      const id = jaNameToId[part];
      if (id && COUNTRY_I18N[id]) return COUNTRY_I18N[id][di * 2];
      return AREA_I18N[part] ? AREA_I18N[part][di] : part;
    }).join(joiner);
    if (PLACE_I18N[p.pid]) p.info.name = PLACE_I18N[p.pid][di];
    if (KIND_I18N[p.kind]) p.kind = KIND_I18N[p.kind][di];
  }
  if (di < 0) return;
  for (const id of Object.keys(COUNTRIES)) {
    const row = COUNTRY_I18N[id];
    if (!row) continue;
    COUNTRIES[id].name = row[di * 2];
    COUNTRIES[id].capital = row[di * 2 + 1] || null;
  }
  for (const key of Object.keys(EXTRA_NAMES)) {
    if (EXTRA_I18N[key]) EXTRA_NAMES[key] = EXTRA_I18N[key][di];
  }
}

// 言語を選ぶ画面。はじめて開いたときは必ず出し、あとからは右上の 🌐 ボタンで開く
function showLangPicker(canClose) {
  let overlay = document.getElementById("langPick");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "langPick";
    const card = document.createElement("div");
    card.className = "card lang-card";
    const h = document.createElement("h2");
    h.textContent = "🌐 言語 · Language · 语言 · 語言 · 언어";
    card.appendChild(h);
    for (const l of LANGS) {
      const b = document.createElement("button");
      b.className = "secondary wide lang-option";
      b.lang = l.html;
      b.textContent = l.label;
      if (l.code === LANG) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => setLanguage(l.code));
      card.appendChild(b);
    }
    const close = document.createElement("button");
    close.className = "text-link lang-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", t("close"));
    close.addEventListener("click", () => { overlay.hidden = true; });
    card.appendChild(close);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
  overlay.querySelector(".lang-close").hidden = !canClose;
  overlay.hidden = false;
}

// 起動時：言語が決まっていれば文言を差しかえ、まだなら言語選択を出す（ゲーム本体は選ぶまで始めない）
if (LANG) applyStaticText();
else showLangPicker(false);
const feedbackEl = document.getElementById("feedbackLink");
if (feedbackEl && FEEDBACK_URL) {
  feedbackEl.href = FEEDBACK_URL;
  feedbackEl.hidden = false;
}
const langBtnEl = document.getElementById("langBtn");
if (langBtnEl) langBtnEl.addEventListener("click", () => showLangPicker(true));
