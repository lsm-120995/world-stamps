// アースクイズ — 地球儀で遊ぶ地理クイズ
(async function () {
  "use strict";

  // 言語がまだ選ばれていなければ、言語選択の画面だけを出して待つ（選ぶとページが読み込み直される）
  if (!LANG) return;
  localizeData();

  const DATA_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

  const REGION_LABEL = {
    world: t("r_world"), asia: t("r_asia"), europe: t("r_europe"),
    africa: t("r_africa"), americas: t("r_americas"), oceania: t("r_oceania"),
  };
  // 地域ごとの初期表示（projection.rotate の値 = [-経度, -緯度]）
  const REGION_VIEW = {
    world: [-135, -30], asia: [-100, -30], europe: [-15, -50],
    africa: [-20, -2], americas: [80, -10], oceania: [-150, 25],
  };
  const LEVEL_LABEL = { 1: t("lv1"), 2: t("lv2"), 3: t("lv3") };
  const MODE_LABEL = { find: t("m_find"), name: t("m_name"), capital: t("m_capital"), place: t("m_place"), explore: t("m_explore") };
  // 地球儀をタップして答えるモード
  const isTapMode = (mode) => mode === "find" || mode === "capital";

  const $ = (id) => document.getElementById(id);
  const el = {
    globe: $("globe"), loading: $("loading"), hud: $("hud"), hudQ: $("hudQ"), hudScore: $("hudScore"),
    timerWrap: $("timerWrap"), timerBar: $("timerBar"), panel: $("panel"), prompt: $("prompt"),
    choices: $("choices"), feedback: $("feedback"), nextBtn: $("nextBtn"), menu: $("menu"),
    result: $("result"), startBtn: $("startBtn"), menuBtn: $("menuBtn"), muteBtn: $("muteBtn"),
    best: $("bestScore"), tooltip: $("tooltip"),
  };

  // ───────────── 効果音 ─────────────
  let audioCtx = null;
  let muted = false;
  try { muted = localStorage.getItem("earthquiz:muted") === "1"; } catch (e) { /* ignore */ }
  function tone(freqs, dur, type, vol) {
    if (muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const t0 = audioCtx.currentTime + i * dur;
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(audioCtx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      });
    } catch (e) { /* 音が出なくてもゲームは続行 */ }
  }
  const sfx = {
    correct: () => tone([660, 880, 1320], 0.09, "triangle", 0.25),
    wrong: () => tone([233, 175], 0.16, "square", 0.08),
    tap: () => tone([520], 0.05, "sine", 0.12),
    finish: () => tone([523, 659, 784, 1047], 0.12, "triangle", 0.22),
  };
  function updateMuteBtn() {
    el.muteBtn.textContent = muted ? "🔇" : "🔊";
    el.muteBtn.setAttribute("aria-label", muted ? t("sound_on") : t("sound_off"));
  }
  el.muteBtn.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("earthquiz:muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
    updateMuteBtn();
    sfx.tap();
  });
  updateMuteBtn();

  // ───────────── 地球儀 ─────────────
  const svg = d3.select(el.globe);
  const projection = d3.geoOrthographic().clipAngle(90).precision(0.4).rotate(REGION_VIEW.world);
  const path = d3.geoPath(projection);
  let width = 0, height = 0, baseR = 100, k = 1;
  window.__earthQuiz = { projection }; // 動作確認用（コンソールから地球儀の向きを読める）

  const defs = svg.append("defs");
  const grad = defs.append("radialGradient").attr("id", "oceanGrad").attr("cx", "38%").attr("cy", "32%").attr("r", "75%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", "#3b8fd9");
  grad.append("stop").attr("offset", "60%").attr("stop-color", "#1a5aa6");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#0b2e63");

  // 球らしく見せる陰影（左上が明るく、右下が暗い）と、ふちの大気の光
  const shadeGrad = defs.append("radialGradient").attr("id", "shadeGrad").attr("cx", "34%").attr("cy", "28%").attr("r", "78%");
  shadeGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.28);
  shadeGrad.append("stop").attr("offset", "38%").attr("stop-color", "#ffffff").attr("stop-opacity", 0);
  shadeGrad.append("stop").attr("offset", "72%").attr("stop-color", "#02081c").attr("stop-opacity", 0.14);
  shadeGrad.append("stop").attr("offset", "100%").attr("stop-color", "#02081c").attr("stop-opacity", 0.62);
  const atmoGrad = defs.append("radialGradient").attr("id", "atmoGrad");
  atmoGrad.append("stop").attr("offset", "80%").attr("stop-color", "#6db8ff").attr("stop-opacity", 0.75);
  atmoGrad.append("stop").attr("offset", "88%").attr("stop-color", "#4f9dff").attr("stop-opacity", 0.32);
  atmoGrad.append("stop").attr("offset", "100%").attr("stop-color", "#4f9dff").attr("stop-opacity", 0);
  const atmo = svg.append("circle").attr("class", "atmo").attr("fill", "url(#atmoGrad)");

  const ocean = svg.append("path").datum({ type: "Sphere" }).attr("class", "ocean").attr("fill", "url(#oceanGrad)");
  const grat = svg.append("path").datum(d3.geoGraticule10()).attr("class", "graticule");
  const gCountries = svg.append("g").attr("class", "countries");
  // スタンプを集めた都市・名所を示す点
  const placeDots = svg.append("g").attr("class", "place-dots")
    .selectAll("circle").data(PLACES).join("circle").attr("class", "place-dot").attr("r", 4);
  let stampView = true; // スタンプの色分けを地球儀に出すか（クイズ中はヒントになるので出さない）
  const outline = svg.append("path").datum({ type: "Sphere" }).attr("class", "outline");
  const shade = svg.append("path").datum({ type: "Sphere" }).attr("class", "shade").attr("fill", "url(#shadeGrad)");
  // 都市・名所クイズ用：正解の範囲、タップした場所、その2点を結ぶ線
  const tolCircle = svg.append("path").attr("class", "tolerance").style("display", "none");
  const guessLine = svg.append("path").attr("class", "guess-line").style("display", "none");
  const guessDot = svg.append("circle").attr("class", "guess-dot").attr("r", 5).style("display", "none");
  let guessLL = null;   // タップした場所 [経度, 緯度]
  let tolGeo = null;    // 正解の範囲（円）
  const marker = svg.append("g").attr("class", "marker").style("display", "none");
  marker.append("circle").attr("class", "marker-ring").attr("r", 14);
  marker.append("circle").attr("class", "marker-dot").attr("r", 4);
  const markerLabel = marker.append("text").attr("class", "marker-label").attr("y", -22).attr("text-anchor", "middle");

  let countryPaths = gCountries.selectAll("path");
  let markerFeature = null;
  let markerText = ""; // 目印の上に出す名前（答えたあとや「じゆうに見る」で使う。出題中は空）

  function render() {
    projection.scale(baseR * k);
    ocean.attr("d", path);
    grat.attr("d", path);
    countryPaths.attr("d", path);
    outline.attr("d", path);
    shade.attr("d", path);
    atmo.attr("cx", width / 2).attr("cy", height / 2).attr("r", baseR * k * 1.2);
    markerLabel.text(markerText);
    if (stampView) {
      const rc = projection.rotate();
      const center = [-rc[0], -rc[1]];
      placeDots.each(function (d) {
        const c = d.geometry.coordinates;
        const p = projection(c);
        const visible = p && d3.geoDistance(c, center) < Math.PI / 2 - 0.02;
        this.setAttribute("visibility", visible ? "visible" : "hidden");
        if (p) { this.setAttribute("cx", p[0]); this.setAttribute("cy", p[1]); }
      });
    }
    if (markerFeature) {
      const c = anchorOf(markerFeature);
      const r = projection.rotate();
      const visible = d3.geoDistance(c, [-r[0], -r[1]]) < Math.PI / 2 - 0.05;
      const p = projection(c);
      marker.style("display", visible && p ? null : "none");
      if (p) marker.attr("transform", `translate(${p[0]},${p[1]})`);
    } else {
      marker.style("display", "none");
    }
    tolCircle.style("display", tolGeo ? null : "none");
    if (tolGeo) tolCircle.attr("d", path(tolGeo));
    if (guessLL && markerFeature && markerFeature.isPlace) {
      const r = projection.rotate();
      const p = projection(guessLL);
      const visible = d3.geoDistance(guessLL, [-r[0], -r[1]]) < Math.PI / 2 - 0.02;
      guessDot.style("display", visible && p ? null : "none");
      if (p) guessDot.attr("cx", p[0]).attr("cy", p[1]);
      guessLine.style("display", null)
        .attr("d", path({ type: "LineString", coordinates: [guessLL, markerFeature.geometry.coordinates] }));
    } else {
      guessDot.style("display", "none");
      guessLine.style("display", "none");
    }
  }

  // 国ごとに少しずつ色を変えて、国境を見やすくする（南極とグリーンランドは雪の色）
  const LAND_COLORS = ["#7dbb6f", "#8fc77a", "#a2cf80", "#84b866", "#b4d487", "#72b07a", "#97c98f", "#c3d98a"];
  function landColor(f) {
    const key = f.id == null ? "" : String(f.id).padStart(3, "0");
    if (key === "010") return "#eef3f6";
    if (key === "304") return "#dfeae6";
    const n = Number(key) || (f.properties && f.properties.name ? f.properties.name.length * 7 : 0);
    return LAND_COLORS[(n * 7 + Math.floor(n / 8)) % LAND_COLORS.length];
  }

  function resize() {
    const rect = el.globe.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    baseR = Math.max(60, Math.min(width, height) / 2 - 16);
    projection.translate([width / 2, height / 2]);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    render();
  }
  // パネルの表示・非表示でも地球儀の領域サイズが変わるので、要素自体を監視する
  new ResizeObserver(() => resize()).observe(el.globe);

  // ドラッグで回転・ホイール/ピンチで拡大縮小
  let lastT = d3.zoomIdentity;
  let userInteracting = false;
  const zoom = d3.zoom()
    .scaleExtent([0.7, 8])
    .clickDistance(6)
    .on("start", (e) => { if (e.sourceEvent) userInteracting = true; })
    .on("end", () => { userInteracting = false; })
    .on("zoom", (e) => {
      const t = e.transform;
      if (Math.abs(t.k - lastT.k) > 1e-6) {
        k = t.k;
      } else if (e.sourceEvent) {
        const r = projection.rotate();
        const s = 0.28 / k;
        projection.rotate([
          r[0] + (t.x - lastT.x) * s,
          Math.max(-90, Math.min(90, r[1] - (t.y - lastT.y) * s)),
          r[2],
        ]);
      }
      lastT = t;
      render();
    });
  svg.call(zoom).on("dblclick.zoom", null);

  $("zoomIn").addEventListener("click", () => (mapActive ? map.zoomIn() : svg.transition().duration(300).call(zoom.scaleBy, 1.6)));
  $("zoomOut").addEventListener("click", () => (mapActive ? map.zoomOut() : svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6)));
  $("resetView").addEventListener("click", () => {
    const v = REGION_VIEW[state.region] || REGION_VIEW.world;
    if (mapActive) map.flyTo({ center: [-v[0], -v[1]], zoom: mapFitZoom(), duration: 1200 });
    else flyToRotation(v, 1);
  });

  function shortestRotation(target) {
    const cur = projection.rotate();
    const lon = cur[0] + ((((target[0] - cur[0]) % 360) + 540) % 360 - 180);
    return [lon, target[1], 0];
  }

  function flyToRotation(rot, targetK, dur = 1000) {
    const ri = d3.interpolate(projection.rotate(), shortestRotation(rot));
    svg.transition("rot").duration(dur).ease(d3.easeCubicInOut)
      .tween("rot", () => (t) => { projection.rotate(ri(t)); render(); });
    if (targetK != null) svg.transition("zoom").duration(dur).call(zoom.scaleTo, targetK);
  }

  // 海外領土（フランス領ギアナなど）に中心が引っ張られないよう、いちばん大きい陸地を基準にする
  function mainland(f) {
    if (f._main) return f._main;
    let main = f;
    if (f.geometry && f.geometry.type === "MultiPolygon") {
      let best = -1;
      for (const coords of f.geometry.coordinates) {
        const poly = { type: "Polygon", coordinates: coords };
        const a = d3.geoArea(poly);
        if (a > best) { best = a; main = poly; }
      }
    }
    f._main = main;
    return main;
  }
  function anchorOf(f) { return d3.geoCentroid(mainland(f)); }

  function flyToFeature(f, dur = 1000) {
    const c = anchorOf(f);
    const area = d3.geoArea(mainland(f));
    const kk = f.isPlace ? 2 : Math.max(1, Math.min(4.5, 0.15 / Math.sqrt(area)));
    flyToRotation([-c[0], -c[1]], kk, dur);
  }

  // メニュー表示中はゆっくり自転
  let lastSpin = null;
  d3.timer((elapsed) => {
    if (lastSpin == null) lastSpin = elapsed;
    const dt = elapsed - lastSpin;
    lastSpin = elapsed;
    if (state.phase === "menu" && !userInteracting && countryPaths.size()) {
      const r = projection.rotate();
      projection.rotate([r[0] + dt * 0.006, r[1], r[2]]);
      render();
    }
  });

  // ───────────── データ読み込み ─────────────
  const state = {
    phase: "loading", mode: "find", region: "world", level: 1, count: 10,
    time: 0, // 1問あたりの制限時間（秒）。0 は制限なし
    questions: [], idx: 0, score: 0, correct: 0, answered: false, qStart: 0, mistakes: [],
  };

  resize();
  let features = [];
  try {
    const topo = await fetch(DATA_URL).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
    features = topojson.feature(topo, topo.objects.countries).features;
  } catch (err) {
    el.loading.textContent = t("load_err");
    el.loading.classList.add("error");
    return;
  }
  features.forEach((f) => {
    f.key = f.id == null ? null : String(f.id).padStart(3, "0");
    f.info = f.key ? COUNTRIES[f.key] || null : null;
  });
  const quizFeatures = features.filter((f) => f.info);

  countryPaths = gCountries.selectAll("path").data(features).join("path").attr("class", "country")
    .attr("fill", (f) => landColor(f));
  countryPaths
    .on("click", (e, f) => onCountryClick(f))
    .on("mousemove", (e, f) => {
      if (state.phase !== "explore") return;
      el.tooltip.textContent = displayName(f);
      el.tooltip.hidden = false;
      const box = el.globe.getBoundingClientRect();
      el.tooltip.style.left = `${e.clientX - box.left + 14}px`;
      el.tooltip.style.top = `${e.clientY - box.top + 14}px`;
    })
    .on("mouseleave", () => { el.tooltip.hidden = true; });

  // 都市・名所クイズ：地球儀の上ならどこでも（海の上でも）タップできる
  const fmtKm = (d) => t("km", { n: Math.max(10, Math.round(d / 10) * 10).toLocaleString(langInfo().locale) });
  svg.on("click.place", (e) => {
    if (state.phase !== "quiz" || state.mode !== "place" || state.answered) return;
    const [x, y] = d3.pointer(e, el.globe);
    if (Math.hypot(x - width / 2, y - height / 2) > baseR * k) return; // 地球の外
    const ll = projection.invert([x, y]);
    if (!ll) return;
    const target = state.questions[state.idx];
    const dist = d3.geoDistance(ll, target.geometry.coordinates) * 6371;
    guessLL = ll;
    state.lastDist = dist;
    answer(dist <= target.tol, t("dist_off", { d: fmtKm(dist) }), null);
  });

  // ───────────── スタンプ帳 ─────────────
  const STAMP_KEY = "earthquiz:stamps";
  let stamps = { countries: {}, places: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STAMP_KEY));
    if (saved && saved.countries && saved.places) stamps = saved;
  } catch (e) { /* 保存データが読めなければ空から始める */ }
  function saveStamps() {
    try { localStorage.setItem(STAMP_KEY, JSON.stringify(stamps)); } catch (e) { /* ignore */ }
  }
  function hasStamp(q) {
    return q.isPlace ? !!stamps.places[q.pid] : !!stamps.countries[q.key];
  }
  function addStamp(q) {
    if (hasStamp(q)) return false;
    if (q.isPlace) stamps.places[q.pid] = 1;
    else stamps.countries[q.key] = 1;
    saveStamps();
    refreshStampMarks();
    return true;
  }
  function refreshStampMarks() {
    countryPaths.classed("stamped", (f) => !!f.info && hasStamp(f));
    placeDots.classed("stamped", (d) => hasStamp(d));
  }
  function setStampView(on) {
    stampView = on;
    svg.classed("show-stamps", on);
    render();
  }
  function stampCounts() {
    return {
      countries: quizFeatures.filter(hasStamp).length, countriesAll: quizFeatures.length,
      places: PLACES.filter(hasStamp).length, placesAll: PLACES.length,
    };
  }
  refreshStampMarks();
  svg.classed("show-stamps", true);

  el.loading.hidden = true;
  state.phase = "menu";
  render();

  function displayName(f) {
    if (f.info) return f.info.name;
    return EXTRA_NAMES[f.key] || (LANG === "en" && f.properties && f.properties.name) || t("unknown");
  }
  function capitalText(f) {
    return f.info && f.info.capital ? t("capital_is", { c: f.info.capital }) : "";
  }

  // ───────────── メニュー ─────────────
  function bindSegment(groupId, key, parse) {
    const group = $(groupId);
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      state[key] = parse(btn.dataset.value);
      sfx.tap();
      onMenuChange();
    });
  }
  bindSegment("modeGroup", "mode", String);
  bindSegment("regionGroup", "region", String);
  bindSegment("levelGroup", "level", Number);
  bindSegment("countGroup", "count", Number);
  $("timeSelect").addEventListener("change", (e) => {
    state.time = Number(e.target.value);
    sfx.tap();
    onMenuChange();
  });
  state.time = Number($("timeSelect").value);

  function bestKey() {
    return `earthquiz:best:${state.mode}:${state.region}:${state.level}:${state.count}:${state.time}`;
  }
  function getBest() {
    try { return Number(localStorage.getItem(bestKey())) || 0; } catch (e) { return 0; }
  }
  function setBest(v) {
    try { localStorage.setItem(bestKey(), String(v)); } catch (e) { /* ignore */ }
  }

  function buildPool() {
    const source = state.mode === "place" ? PLACES : quizFeatures;
    return source.filter((f) =>
      (state.region === "world" || f.info.region === state.region) &&
      f.info.level <= state.level &&
      // 首都クイズでは、首都名に国名が入っていて答えがわかってしまう国（クウェート、メキシコシティなど）は出さない
      (state.mode !== "capital" || (f.info.capital && !f.info.capital.startsWith(f.info.name))));
  }
  function questionCount() {
    const n = buildPool().length;
    return state.count ? Math.min(state.count, n) : n;
  }

  function onMenuChange() {
    const explore = state.mode === "explore";
    $("levelRow").classList.toggle("disabled", explore);
    $("countRow").classList.toggle("disabled", explore);
    $("timeRow").classList.toggle("disabled", explore);
    const sc = stampCounts();
    $("bookCount").textContent = `${sc.countries + sc.places} / ${sc.countriesAll + sc.placesAll}`;
    if (explore) {
      el.best.textContent = t("explore_hint");
    } else {
      const n = questionCount();
      const best = getBest();
      el.best.textContent = t("best_line", { n, best: best ? t("pts", { n: best }) : t("none_yet") });
    }
  }
  onMenuChange();

  el.startBtn.addEventListener("click", () => { sfx.tap(); startGame(); });
  el.menuBtn.addEventListener("click", () => { sfx.tap(); showMenu(); });
  $("retryBtn").addEventListener("click", () => { sfx.tap(); startGame(); });
  $("toMenuBtn").addEventListener("click", () => { sfx.tap(); showMenu(); });
  el.nextBtn.addEventListener("click", () => { sfx.tap(); nextQuestion(); });

  document.addEventListener("keydown", (e) => {
    if (state.phase !== "quiz") return;
    if ((e.key === "Enter" || e.key === " ") && state.answered) {
      e.preventDefault();
      nextQuestion();
    } else if (state.mode === "name" && !state.answered && /^[1-4]$/.test(e.key)) {
      const btn = el.choices.querySelectorAll("button")[Number(e.key) - 1];
      if (btn) btn.click();
    }
  });

  function showMenu() {
    stopTimer();
    state.phase = "menu";
    resetHighlights();
    setStampView(true);
    deactivateMap();
    el.menu.hidden = false;
    el.result.hidden = true;
    el.panel.hidden = true;
    el.hud.hidden = true;
    el.timerWrap.hidden = true;
    el.menuBtn.hidden = true;
    el.tooltip.hidden = true;
    onMenuChange();
    flyToRotation(REGION_VIEW[state.region], 1, 900);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function resetHighlights() {
    countryPaths.classed("target correct wrong answer selected", false);
    markerFeature = null;
    markerText = "";
    guessLL = null;
    tolGeo = null;
    render();
    mapShow(null);
  }

  // ───────────── ゲーム進行 ─────────────
  function startGame() {
    el.menu.hidden = true;
    el.result.hidden = true;
    el.panel.hidden = false;
    el.menuBtn.hidden = false;
    resetHighlights();
    setStampView(state.mode === "explore");
    deactivateMap();
    state.newStamps = 0;
    flyToRotation(REGION_VIEW[state.region], 1, 900);

    if (state.mode === "explore") {
      state.phase = "explore";
      el.hud.hidden = true;
      el.timerWrap.hidden = true;
      el.prompt.innerHTML = EXPLORE_PROMPT;
      el.choices.innerHTML = "";
      el.feedback.innerHTML = "";
      el.nextBtn.hidden = true;
      activateMap(REGION_VIEW[state.region]);
      return;
    }

    state.phase = "quiz";
    state.questions = shuffle(buildPool()).slice(0, questionCount());
    state.idx = 0;
    state.score = 0;
    state.correct = 0;
    state.mistakes = [];
    el.hud.hidden = false;
    el.timerWrap.hidden = !state.time;
    showQuestion();
  }

  function updateHud() {
    el.hudQ.textContent = `${state.idx + 1} / ${state.questions.length}`;
    el.hudScore.textContent = t("pts", { n: state.score });
  }

  function showQuestion() {
    const f = state.questions[state.idx];
    state.answered = false;
    resetHighlights();
    updateHud();
    el.feedback.innerHTML = "";
    el.feedback.className = "feedback";
    el.nextBtn.hidden = true;

    if (state.mode === "find") {
      el.prompt.innerHTML = `<span class="qno">Q${state.idx + 1}</span>${t("q_where", { name: `<strong class="qname">${f.info.name}</strong>` })}<span class="qhint">${t("hint_tap")}</span>`;
      el.choices.innerHTML = "";
    } else if (state.mode === "place") {
      el.prompt.innerHTML = `<span class="qno">Q${state.idx + 1}</span>${t("q_where", { name: `<strong class="qname">${f.info.name}</strong>` })}<span class="qhint">${t("hint_place", { kind: f.kind })}</span>`;
      el.choices.innerHTML = "";
    } else if (state.mode === "capital") {
      el.prompt.innerHTML = `<span class="qno">Q${state.idx + 1}</span>${t("q_capital", { name: `<strong class="qname">${f.info.capital}</strong>` })}<span class="qhint">${t("hint_tap")}</span>`;
      el.choices.innerHTML = "";
    } else {
      el.prompt.innerHTML = `<span class="qno">Q${state.idx + 1}</span>${t("q_name")}`;
      countryPaths.classed("target", (d) => d === f);
      markerFeature = f;
      flyToFeature(f, 900);
      const others = shuffle(quizFeatures.filter((d) => d !== f && d.info.region === f.info.region));
      let pool = others.slice(0, 3);
      if (pool.length < 3) {
        pool = pool.concat(shuffle(quizFeatures.filter((d) => d !== f && !pool.includes(d))).slice(0, 3 - pool.length));
      }
      const opts = shuffle([f, ...pool]);
      el.choices.innerHTML = "";
      opts.forEach((o, i) => {
        const b = document.createElement("button");
        b.className = "choice";
        b.innerHTML = `<span class="key">${i + 1}</span>${o.info.name}`;
        b.addEventListener("click", () => {
          if (state.answered) return;
          b.classList.add(o === f ? "is-correct" : "is-wrong");
          el.choices.querySelectorAll("button").forEach((x, j) => {
            x.disabled = true;
            if (opts[j] === f) x.classList.add("is-correct");
          });
          answer(o === f, o.info.name, null);
        });
        el.choices.appendChild(b);
      });
    }
    startTimer();
  }

  function onCountryClick(f) {
    if (state.phase === "explore") {
      sfx.tap();
      showInfo(f);
      return;
    }
    if (state.phase !== "quiz" || !isTapMode(state.mode) || state.answered) return;
    const target = state.questions[state.idx];
    answer(f === target, displayName(f), f === target ? null : f);
  }

  // ───────────── 場所をしらべる ─────────────
  // 郵便番号 → HeartRails Geo API、地名と概要 → Wikipedia。入力した文字はこの2つの外部サービスに送られる。
  const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
  const POSTAL_API = "https://geoapi.heartrails.com/api/json";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let lookupSeq = 0; // 古い検索の結果が後から届いても無視するための番号

  function enterLookup() {
    stopTimer();
    state.phase = "lookup";
    el.menu.hidden = true;
    el.result.hidden = true;
    el.panel.hidden = false;
    el.menuBtn.hidden = false;
    el.hud.hidden = true;
    el.timerWrap.hidden = true;
    resetHighlights();
    setStampView(true);
    activateMap();
    el.prompt.innerHTML =
      `<form class="lookup" id="lookupForm">` +
      `<input id="lookupInput" type="search" autocomplete="off" enterkeyhint="search" aria-label="${esc(t("lookup"))}" placeholder="${esc(t("lk_placeholder"))}">` +
      `<button class="primary" type="submit">${esc(t("lk_btn"))}</button></form>` +
      `<span class="qhint">${esc(t("lk_notice"))}</span>`;
    el.choices.innerHTML = "";
    el.feedback.innerHTML = "";
    el.feedback.className = "feedback";
    el.nextBtn.hidden = true;
    $("lookupForm").addEventListener("submit", (e) => {
      e.preventDefault();
      sfx.tap();
      lookup($("lookupInput").value);
    });
    $("lookupInput").focus({ preventScroll: true });
  }

  function lookupStatus(text, isError) {
    el.feedback.className = "feedback" + (isError ? " bad" : "");
    el.feedback.innerHTML = isError ? `<strong>${esc(text)}</strong>` : `<span class="sub">${esc(text)}</span>`;
  }

  async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // 表示に使う Wikipedia の言語版（選んだ言語に合わせる。簡体字・繁体字はどちらも中国語版で、字体だけ切りかえる）
  const WIKI_TARGET = langInfo().wiki;
  const WIKI_NATIVE_NAME = { ja: "日本語", zh: "中文", ko: "한국어", en: "English" };
  function wikiUrl(lang, params) {
    if (lang === "zh" && langInfo().variant) params.set("variant", langInfo().variant);
    return `https://${lang}.wikipedia.org/w/api.php?${params}`;
  }
  function wikiParams(limit, extra) {
    return new URLSearchParams({
      action: "query", format: "json", origin: "*",
      prop: "coordinates|extracts|description|pageprops", ppprop: "wikibase_item",
      exintro: "1", explaintext: "1", exsentences: "3", exlimit: String(limit), colimit: String(limit),
      ...extra,
    });
  }
  const pageCoord = (p) => (p.coordinates || []).find((x) => !x.globe || x.globe === "earth");

  // ほかの言語版で見つけた記事を、選んだ言語版の記事（あれば）に置きかえる
  async function toTargetLang(results) {
    const wanted = results.filter((r) => r.targetTitle);
    if (!wanted.length) return;
    const data = await fetchJson(wikiUrl(WIKI_TARGET, wikiParams(wanted.length, {
      titles: wanted.map((r) => r.targetTitle).join("|"), redirects: "1",
    })));
    const q = data.query || {};
    const moved = {};
    for (const m of [...(q.normalized || []), ...(q.converted || []), ...(q.redirects || [])]) moved[m.from] = m.to;
    const byTitle = {};
    for (const p of Object.values(q.pages || {})) byTitle[p.title] = p;
    for (const r of wanted) {
      let title = r.targetTitle;
      for (let i = 0; i < 4 && moved[title]; i++) title = moved[title];
      const p = byTitle[title];
      if (!p || p.missing !== undefined || !p.pageid) continue;
      const c = pageCoord(p);
      r.lang = WIKI_TARGET;
      r.pageid = p.pageid;
      r.title = p.title;
      r.extract = p.extract || "";
      r.description = p.description || "";
      if (c) { r.lat = c.lat; r.lon = c.lon; }
    }
  }

  // Wikipedia を検索して、候補（タイトル・座標・冒頭の文章）を返す。lang は検索する言語版。
  // 結果は、選んだ言語版に同じ記事があればそちらの内容に置きかえて返す（srcTitle は検索した言語版での記事名）
  async function wikiSearch(query, limit, lang) {
    const params = wikiParams(limit, { generator: "search", gsrsearch: query, gsrlimit: String(limit) });
    if (lang !== WIKI_TARGET) {
      params.set("prop", params.get("prop") + "|langlinks");
      params.set("lllang", WIKI_TARGET);
      params.set("lllimit", "max");
    }
    const data = await fetchJson(wikiUrl(lang, params));
    const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];
    const results = pages.sort((a, b) => a.index - b.index).map((p) => {
      const c = pageCoord(p);
      return {
        lang, pageid: p.pageid, title: p.title, srcTitle: p.title,
        description: p.description || "", extract: p.extract || "",
        lat: c ? c.lat : null, lon: c ? c.lon : null,
        qid: p.pageprops && p.pageprops.wikibase_item,
        targetTitle: p.langlinks && p.langlinks[0] ? p.langlinks[0]["*"] : null,
      };
    });
    if (lang !== WIKI_TARGET) {
      try { await toTargetLang(results); } catch (err) { /* 選んだ言語版が取れなければ、元の言語のまま出す */ }
    }
    // 「パリ」のように記事に座標がないページは、Wikidata から位置を補う（送るのは項目番号だけ）
    await Promise.allSettled(results.filter((r) => r.lat == null && r.qid).map(async (r) => {
      const d = await fetchJson(`${WIKIDATA_API}?action=wbgetclaims&entity=${r.qid}&property=P625&format=json&origin=*`);
      const v = d.claims && d.claims.P625 && d.claims.P625[0] && d.claims.P625[0].mainsnak.datavalue;
      if (v && v.value && (!v.value.globe || v.value.globe.endsWith("/Q2"))) {
        r.lat = v.value.latitude;
        r.lon = v.value.longitude;
      }
    }));
    return results;
  }

  async function lookup(raw) {
    const seq = ++lookupSeq;
    const text = raw.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    if (!text) return;
    el.choices.innerHTML = "";
    const digits = text.replace(/[-ー－‐―〒\s]/g, "");
    try {
      if (/^\d+$/.test(digits)) {
        if (digits.length !== 7) { lookupStatus(t("lk_zip7"), true); return; }
        lookupStatus(t("lk_zip_searching"));
        await lookupPostal(digits, seq);
      } else {
        // 番地などの数字から後ろは外部に送らない
        const name = text.replace(/\d.*$/, "").trim();
        if (!name) { lookupStatus(t("lk_empty"), true); return; }
        lookupStatus(t("lk_searching", { q: name }));
        await lookupName(name, seq);
      }
    } catch (err) {
      if (seq === lookupSeq) lookupStatus(t("lk_net"), true);
    }
  }

  async function lookupPostal(zip, seq) {
    const data = await fetchJson(`${POSTAL_API}?method=searchByPostal&postal=${zip}`);
    if (seq !== lookupSeq) return;
    const locs = data.response && data.response.location;
    if (!locs || !locs.length) { lookupStatus(t("lk_zip_nf"), true); return; }
    const loc = locs[0];
    const lat = Number(loc.y), lon = Number(loc.x);
    const towns = [...new Set(locs.map((l) => l.town).filter(Boolean))];
    // 住所そのものは日本語のまま出す（郵便番号は日本のもので、翻訳すると元の表記が分からなくなるため）
    const place = {
      name: `${loc.prefecture}${loc.city}${towns.length === 1 ? towns[0] : ""}`,
      sub: `〒${zip.slice(0, 3)}-${zip.slice(3)}` + (towns.length > 1 ? `　${towns.slice(0, 6).join("・")}${towns.length > 6 ? t("lk_more") : ""}` : ""),
      lat, lon, extract: "", pageid: null, title: "", zoom: 11,
    };
    showLookupResult(place); // 先に場所を出し、概要は届きしだい足す
    // 市区町村の概要を Wikipedia から探す。別の土地の同名ページを拾わないよう、近い場所のものだけ使う
    try {
      // 「愛知郡東郷町」→「東郷町」、「横浜市中区」→「中区 (横浜市)」「横浜市」の順に、記事名の候補を作る
      const city = loc.city.replace(/^.+郡/, "");
      const ward = city.match(/^(.+?市)(.+区)$/);
      const wanted = ward ? [`${ward[2]} (${ward[1]})`, ward[1]] : [city, `${city} (${loc.prefecture})`];
      const pages = (await wikiSearch(`${loc.prefecture} ${city}`, 8, "ja")).filter((p) => p.lat != null && p.extract &&
        d3.geoDistance([p.lon, p.lat], [lon, lat]) * 6371 < 60);
      if (seq !== lookupSeq) return;
      let near = null;
      for (const title of wanted) {
        near = pages.find((p) => p.srcTitle === title);
        if (near) break;
      }
      // 記事名が合わないときは、都道府県そのものの記事を除いて、近くにあるいちばん上の候補を使う
      if (!near) near = pages.find((p) => p.srcTitle !== loc.prefecture);
      if (near) showLookupResult({ ...place, extract: near.extract, pageid: near.pageid, title: near.title, lang: near.lang });
    } catch (err) { /* 概要が取れなくても、場所の表示はそのまま残す */ }
  }

  // ゲーム独自の豆知識（lookup_notes.js）に同じ呼び名があれば、それを返す
  const noteKey = (s) => s.replace(/\s/g, "").toLowerCase();
  function findNote(name) {
    if (typeof LOOKUP_NOTES === "undefined") return null;
    const key = noteKey(name);
    return LOOKUP_NOTES.find((n) => n.names.some((x) => noteKey(x) === key)) || null;
  }

  async function lookupName(name, seq) {
    const note = findNote(name);
    if (note) {
      const i = Math.max(0, UI_ORDER.indexOf(LANG));
      const pick = (arr) => arr[i] || arr[0];
      showLookupResult({
        name: pick(note.title), sub: pick(note.sub), lat: note.lat, lon: note.lon, zoom: note.zoom,
        extract: pick(note.text), note: true, wikiLang: note.wiki && note.wiki[0], wikiTitle: note.wiki && note.wiki[1],
      });
      return;
    }
    // 文字の種類から、探す言語版の順番を決める。
    // ハングル→韓国語版、かなを含む→日本語版、漢字だけ→中国語版と日本語版（選んだ言語に近いほうが先）、
    // 英字など→選んだ言語版→英語版
    const T = WIKI_TARGET;
    const langs =
      /[가-힯]/.test(name) ? ["ko"] :
      /[぀-ヿ]/.test(name) ? ["ja"] :
      /[㐀-鿿]/.test(name) ? (T === "ja" ? ["ja", "zh"] : ["zh", "ja"]) :
      [...new Set([T, "en"])];
    const key = name.replace(/\s/g, "").toLowerCase();
    // 検索した言語版での記事名に、入力した言葉が入っていれば「当たり」とみなす（なければ次の言語版も探す）
    const isHit = (list) => list.some((p) => p.srcTitle.replace(/\s/g, "").toLowerCase().includes(key));
    let pages = [];
    for (const lang of langs) {
      let found = [];
      try {
        found = (await wikiSearch(name, 8, lang)).filter((p) => p.lat != null);
      } catch (err) {
        if (lang === langs[langs.length - 1] && !pages.length) throw err;
      }
      if (seq !== lookupSeq) return;
      const last = lang === langs[langs.length - 1];
      if (found.length && (isHit(found) || (last && !pages.length))) {
        // ほかの言語版から拾った候補は、選んだ言語の記事があるものを優先して残す
        if (lang !== T) found = found.filter((p, i) => i === 0 || p.lang === T);
        pages = found;
        break;
      }
      if (!pages.length) pages = found; // 当たりがなければ、最初の言語版の結果を控えとして持っておく
    }
    if (!pages.length) { lookupStatus(t("lk_nf", { q: name }), true); return; }
    const toPlace = (p) => ({ name: p.title, sub: p.description, lat: p.lat, lon: p.lon, extract: p.extract, pageid: p.pageid, title: p.title, lang: p.lang });
    showLookupResult(toPlace(pages[0]));
    if (pages.length > 1) {
      pages.forEach((p, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice candidate";
        b.textContent = p.title;
        b.setAttribute("aria-pressed", String(i === 0));
        b.addEventListener("click", () => {
          sfx.tap();
          el.choices.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          showLookupResult(toPlace(p));
        });
        el.choices.appendChild(b);
      });
    }
  }

  function showLookupResult(place) {
    const ll = [place.lon, place.lat];
    const country = features.find((f) => d3.geoContains(f, ll));
    countryPaths.classed("selected", (d) => d === country);
    markerFeature = { type: "Feature", isPlace: true, geometry: { type: "Point", coordinates: ll }, info: { name: place.name } };
    guessLL = null;
    tolGeo = null;
    flyToRotation([-place.lon, -place.lat], 3, 1000);
    mapShow({ ll, marker: true, fly: true, zoom: place.zoom || 7 });
    render();
    const where = [place.sub, country ? displayName(country) : ""].filter(Boolean).join("　｜　");
    const lang = place.lang || WIKI_TARGET;
    const variant = lang === "zh" && langInfo().variant ? `&variant=${langInfo().variant}` : "";
    const link = place.note
      ? `<span class="source">${esc(t("lk_note_src"))}` +
        (place.wikiTitle ? ` <a href="https://${place.wikiLang}.wikipedia.org/wiki/${encodeURIComponent(place.wikiTitle)}" target="_blank" rel="noopener">${esc(t("lk_read", { title: place.wikiTitle }))}</a>` : "") +
        `</span>`
      : place.pageid
      ?`<span class="source">${lang !== WIKI_TARGET ? esc(t("lk_other_lang", { lang: WIKI_NATIVE_NAME[lang] || lang })) + " " : ""}` +
        `<a href="https://${lang}.wikipedia.org/?curid=${place.pageid}${variant}" target="_blank" rel="noopener">${esc(t("lk_read", { title: place.title }))}</a>${esc(t("lk_source"))}</span>`
      : "";
    el.feedback.className = "feedback info lookup-result";
    el.feedback.innerHTML =
      `<strong>📍 ${esc(place.name)}</strong>` +
      (where ? `<span class="sub">${esc(where)}</span>` : "") +
      (place.extract ? `<p class="summary">${place.note ? "💡 " : ""}${esc(place.extract)}</p>` : "") +
      link;
  }
  $("lookupBtn").addEventListener("click", () => { sfx.tap(); enterLookup(); });

  // ───────────── 地名つきの地図（じゆうに見る・場所をしらべる） ─────────────
  // 地図の描画は MapLibre GL JS、地図データは OpenFreeMap（© OpenMapTiles © OpenStreetMap）。
  // 読みこめなかったときは、これまでの地球儀のまま動く。
  const MAPLIBRE_BASE = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.24.1/";
  const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
  const MAP_NAME_KEY = { ja: "name:ja", en: "name:en", zh: "name:zh", zht: "name:zh", ko: "name:ko" }[LANG] || "name:en";
  const EMPTY_FC = { type: "FeatureCollection", features: [] };
  const plainFeature = (f) => ({ type: "Feature", geometry: f.geometry, properties: {} });
  // 地球全体がちょうど画面に収まる拡大率（地球の直径は 512×2^zoom÷π ピクセル）
  const mapFitZoom = () => {
    const box = $("map");
    const size = Math.max(200, Math.min(box.clientWidth, box.clientHeight));
    return Math.max(0.3, Math.log2((size * 0.88 * Math.PI) / 512));
  };
  let map = null, mapReady = null, mapActive = false, mapMarker = null, mapPending = null;

  function loadMapLibrary() {
    return new Promise((resolve, reject) => {
      if (window.maplibregl) { resolve(); return; }
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = MAPLIBRE_BASE + "maplibre-gl.min.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = MAPLIBRE_BASE + "maplibre-gl.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("maplibre"));
      document.head.appendChild(s);
    });
  }

  function ensureMap() {
    if (mapReady) return mapReady;
    mapReady = (async () => {
      await loadMapLibrary();
      const r = projection.rotate();
      map = new maplibregl.Map({
        container: "map", style: MAP_STYLE,
        center: [-r[0], Math.max(-80, Math.min(80, -r[1]))], zoom: mapFitZoom(),
        attributionControl: { compact: true },
      });
      window.__earthQuiz.map = map; // 動作確認用
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("map timeout")), 15000);
        map.once("load", () => { clearTimeout(timer); resolve(); });
      });
      try { map.setProjection({ type: "globe" }); } catch (e) { /* 古い版では平らな地図のまま */ }
      try { map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] }); } catch (e) { /* なくてもよい */ }

      // 地名を選んだ言語にする（その言語の名前がない場所は、ローマ字か現地の表記になる）
      for (const layer of map.getStyle().layers) {
        if (layer.type !== "symbol" || !layer.layout || !layer.layout["text-field"]) continue;
        if (!JSON.stringify(layer.layout["text-field"]).includes("name")) continue;
        map.setLayoutProperty(layer.id, "text-field",
          ["coalesce", ["get", MAP_NAME_KEY], ["get", "name:latin"], ["get", "name"]]);
      }

      // スタンプを集めた国（引いたときだけ色がつく）・選んだ国・集めた名所
      map.addSource("stamp-countries", { type: "geojson", data: EMPTY_FC });
      map.addSource("selected", { type: "geojson", data: EMPTY_FC });
      map.addSource("stamp-places", { type: "geojson", data: EMPTY_FC });
      map.addLayer({ id: "stamp-countries", type: "fill", source: "stamp-countries",
        paint: { "fill-color": "#f0a04b", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 4, 0.3, 6, 0] } });
      map.addLayer({ id: "selected-fill", type: "fill", source: "selected",
        paint: { "fill-color": "#ffcf3f", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 5, 0.2, 7, 0] } });
      map.addLayer({ id: "stamp-places", type: "circle", source: "stamp-places",
        paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#7a4a16", "circle-stroke-width": 2 } });

      // 出典の表示は小さくたたんでおく（ⓘ を押すと開く）
      const attrib = $("map").querySelector(".maplibregl-ctrl-attrib");
      if (attrib) attrib.classList.remove("maplibregl-compact-show");

      map.on("click", (e) => {
        if (state.phase !== "explore") return;
        const ll = [e.lngLat.lng, e.lngLat.lat];
        const f = features.find((d) => d3.geoContains(d, ll));
        if (f) { sfx.tap(); showInfo(f); }
      });
      return true;
    })().catch(() => {
      // 読みこめなければ次回もう一度ためす。今回はこれまでの地球儀で続ける
      if (map) { try { map.remove(); } catch (e) { /* ignore */ } }
      map = null;
      mapReady = null;
      return false;
    });
    return mapReady;
  }

  function updateMapStamps() {
    map.getSource("stamp-countries").setData({ type: "FeatureCollection", features: quizFeatures.filter(hasStamp).map(plainFeature) });
    map.getSource("stamp-places").setData({ type: "FeatureCollection", features: PLACES.filter(hasStamp).map(plainFeature) });
  }

  // 地図に切りかえる。view は最初に見せる向き（地球儀と同じ [-経度, -緯度]）
  async function activateMap(view) {
    $("map").hidden = false;
    const ok = await ensureMap();
    const wanted = state.phase === "explore" || state.phase === "lookup";
    if (!ok || !wanted) { deactivateMap(); return; }
    if (!mapActive) {
      mapActive = true;
      el.globe.style.visibility = "hidden";
      map.resize();
      if (view) map.jumpTo({ center: [-view[0], -view[1]], zoom: mapFitZoom() });
    }
    updateMapStamps();
    applyMapPending();
  }

  function deactivateMap() {
    mapActive = false;
    mapPending = null;
    $("map").hidden = true;
    el.globe.style.visibility = "";
    if (mapMarker) { mapMarker.remove(); mapMarker = null; }
  }

  // 地図に「ここを見せて」と頼む。地図の準備がまだなら、準備できたときに反映される
  function mapShow(req) {
    mapPending = req;
    if (mapActive) applyMapPending();
  }
  function applyMapPending() {
    const req = mapPending;
    if (mapMarker) { mapMarker.remove(); mapMarker = null; }
    map.getSource("selected").setData(req && req.feature ? plainFeature(req.feature) : EMPTY_FC);
    if (!req) return;
    if (req.marker && req.ll) mapMarker = new maplibregl.Marker({ color: "#ffcf3f" }).setLngLat(req.ll).addTo(map);
    if (req.fly && req.ll) {
      map.flyTo({ center: req.ll, zoom: req.zoom || 4, duration: 1800 });
      req.fly = false;
    }
  }
  // 国の大きさに合わせた拡大率（ロシアは引き、小さい国は寄る）
  const zoomForFeature = (f) => f.isPlace ? 6 : Math.max(mapFitZoom(), Math.min(6, 1.2 + Math.log2(0.6 / Math.sqrt(d3.geoArea(mainland(f))))));

  // 「じゆうに見る」で、国や名所の情報を下のパネルに出す
  const EXPLORE_PROMPT = `${t("explore_prompt")}<span class="qhint">${t("explore_legend")}</span>`;
  function showInfo(q) {
    countryPaths.classed("selected", (d) => d === q);
    markerFeature = q;
    markerText = displayName(q);
    render();
    mapShow(q.isPlace ? { ll: q.geometry.coordinates, marker: true } : { feature: q });
    const detail = q.isPlace ? `${q.kind}・${q.country}` : capitalText(q);
    const got = (q.isPlace || q.info) && hasStamp(q) ? t("stamp_have") : "";
    const sub = [detail, got].filter(Boolean).join("　");
    el.feedback.className = "feedback info";
    el.feedback.innerHTML = `<strong>${displayName(q)}</strong>${sub ? `<span class="sub">${sub}</span>` : ""}`;
  }

  // スタンプ帳から選んだ国や名所へ飛ぶ
  function visit(q) {
    stopTimer();
    $("book").hidden = true;
    el.menu.hidden = true;
    el.result.hidden = true;
    el.panel.hidden = false;
    el.menuBtn.hidden = false;
    el.hud.hidden = true;
    el.timerWrap.hidden = true;
    state.phase = "explore";
    resetHighlights();
    setStampView(true);
    el.prompt.innerHTML = EXPLORE_PROMPT;
    el.choices.innerHTML = "";
    el.nextBtn.hidden = true;
    showInfo(q);
    flyToFeature(q, 900);
    mapShow({ feature: q.isPlace ? null : q, ll: anchorOf(q), marker: !!q.isPlace, fly: true, zoom: zoomForFeature(q) });
    activateMap();
  }

  function renderBook() {
    const tab = $("bookTabs").querySelector('[aria-pressed="true"]').dataset.value;
    const c = stampCounts();
    const got = c.countries + c.places, all = c.countriesAll + c.placesAll;
    $("bookTotal").innerHTML =
      `<div class="book-nums">${t("tab_countries")} <b>${c.countries}</b> / ${c.countriesAll}　${t("tab_places")} <b>${c.places}</b> / ${c.placesAll}</div>` +
      `<div class="bar"><i style="width:${(got / all) * 100}%"></i></div>` +
      `<div class="book-pct">${t("book_total", { got, all, pct: Math.floor((got / all) * 100) })}</div>`;
    const items = tab === "places" ? PLACES : quizFeatures;
    const body = $("bookBody");
    body.innerHTML = "";
    for (const region of ["asia", "europe", "africa", "americas", "oceania"]) {
      const list = items.filter((q) => q.info.region === region).sort((a, b) => a.info.level - b.info.level);
      const n = list.filter(hasStamp).length;
      const sec = document.createElement("section");
      sec.innerHTML =
        `<h3>${REGION_LABEL[region]} <span>${n} / ${list.length}${n === list.length ? " 🎉" : ""}</span></h3>` +
        `<div class="bar"><i style="width:${(n / list.length) * 100}%"></i></div>`;
      const grid = document.createElement("div");
      grid.className = "stamps";
      list.forEach((q) => {
        if (hasStamp(q)) {
          const b = document.createElement("button");
          b.className = "stamp got";
          b.textContent = q.info.name;
          b.title = t("view_on_globe");
          b.addEventListener("click", () => { sfx.tap(); visit(q); });
          grid.appendChild(b);
        } else {
          const s = document.createElement("span");
          s.className = "stamp";
          s.textContent = "？";
          grid.appendChild(s);
        }
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    }
  }
  $("bookTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    $("bookTabs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    sfx.tap();
    renderBook();
  });
  function openBook() { sfx.tap(); renderBook(); $("book").hidden = false; }
  $("bookBtn").addEventListener("click", openBook);
  $("resultBookBtn").addEventListener("click", openBook);
  $("bookClose").addEventListener("click", () => { sfx.tap(); $("book").hidden = true; });
  $("bookReset").addEventListener("click", () => {
    if (!window.confirm(t("book_reset_confirm"))) return;
    stamps = { countries: {}, places: {} };
    saveStamps();
    refreshStampMarks();
    renderBook();
    onMenuChange();
  });

  function answer(isCorrect, pickedName, wrongFeature) {
    if (state.answered) return;
    state.answered = true;
    const remain = remaining();
    stopTimer();
    const target = state.questions[state.idx];
    const isPlace = !!target.isPlace;
    const cap = isPlace ? `${target.kind}・${target.country}` : capitalText(target);
    if (isPlace) {
      // 正解とみなす範囲を円で表示する
      tolGeo = d3.geoCircle().center(target.geometry.coordinates).radius((target.tol / 6371) * (180 / Math.PI))();
    }

    if (isCorrect) {
      // 「制限時間なし」ではタイムボーナスなしで、1問100点
      const bonus = state.time ? Math.round((remain / state.time) * 100) : 0;
      const pts = 100 + bonus;
      state.score += pts;
      state.correct++;
      const newStamp = addStamp(target);
      if (newStamp) state.newStamps++;
      sfx.correct();
      countryPaths.classed("target", false).classed("correct", (d) => d === target);
      markerFeature = target;
      markerText = target.info.name;
      el.feedback.className = "feedback good";
      el.feedback.innerHTML = `<strong>${t("correct", { n: pts })}${newStamp ? ` <span class="new-stamp">${t("stamp_get")}</span>` : ""}</strong><span class="sub">${target.info.name}${cap ? "　" + cap : ""}${isPlace ? "　" + t("err_dist", { d: fmtKm(state.lastDist) }) : ""}${state.time ? " " + t("bonus", { n: bonus }) : ""}</span>`;
    } else {
      sfx.wrong();
      state.mistakes.push({ answer: target.info.name, picked: pickedName });
      countryPaths
        .classed("target", false)
        .classed("wrong", (d) => d === wrongFeature)
        .classed("answer", (d) => d === target);
      markerFeature = target;
      markerText = target.info.name;
      if (isTapMode(state.mode) || isPlace) flyToFeature(target, 1100);
      const why = pickedName === null ? t("timeup")
        : isPlace ? t("wrong_place", { d: pickedName })
        : t("wrong_pick", { x: pickedName });
      el.feedback.className = "feedback bad";
      el.feedback.innerHTML = `<strong>${why}</strong><span class="sub">${t("answer_is", { name: `<b>${target.info.name}</b>` })}${cap ? "　" + cap : ""}</span>`;
    }
    render();
    updateHud();
    el.nextBtn.textContent = state.idx + 1 >= state.questions.length ? t("see_result") : t("next");
    el.nextBtn.hidden = false;
    el.nextBtn.focus({ preventScroll: true });
  }

  function nextQuestion() {
    if (!state.answered) return;
    state.idx++;
    if (state.idx >= state.questions.length) showResult();
    else showQuestion();
  }

  function showResult() {
    state.phase = "result";
    stopTimer();
    sfx.finish();
    el.panel.hidden = true;
    el.timerWrap.hidden = true;
    const total = state.questions.length;
    const ratio = total ? state.correct / total : 0;
    const prevBest = getBest();
    const isNew = state.score > prevBest;
    if (isNew) setBest(state.score);

    const rank =
      ratio === 1 ? t("rank1") :
      ratio >= 0.8 ? t("rank2") :
      ratio >= 0.5 ? t("rank3") : t("rank4");
    $("resultRank").textContent = rank;
    $("resultScore").textContent = t("pts", { n: state.score });
    $("resultDetail").textContent =
      `${MODE_LABEL[state.mode]} ・ ${REGION_LABEL[state.region]} ・ ${LEVEL_LABEL[state.level]} ・ ${state.count ? t("c_n", { n: state.count }) : t("c_all")} ・ ${state.time ? t("per_q", { n: state.time }) : t("no_limit")}　｜　${t("result_count", { total, n: state.correct })}`;
    $("resultBest").textContent = isNew ? t("new_best") : t("best", { n: t("pts", { n: prevBest }) });
    $("resultStamps").textContent = state.newStamps
      ? t("new_stamps", { n: state.newStamps })
      : t("no_new_stamps");
    resetHighlights();
    setStampView(true);
    const list = $("mistakes");
    list.innerHTML = "";
    if (state.mistakes.length) {
      $("mistakesTitle").hidden = false;
      $("mistakesTitle").textContent = state.mode === "place" ? t("missed_places") : t("missed_countries");
      state.mistakes.forEach((m) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${m.answer}</b> <span>${m.picked === null ? t("timeup_short") : "→ " + m.picked}</span>`;
        list.appendChild(li);
      });
    } else {
      $("mistakesTitle").hidden = true;
    }
    el.result.hidden = false;
  }

  // ───────────── タイマー ─────────────
  let timerHandle = null;
  function remaining() {
    return Math.max(0, state.time - (performance.now() - state.qStart) / 1000);
  }
  function startTimer() {
    stopTimer();
    state.qStart = performance.now();
    if (!state.time) return;
    timerHandle = d3.timer(() => {
      const r = remaining();
      el.timerBar.style.width = `${(r / state.time) * 100}%`;
      el.timerBar.classList.toggle("low", r < 5);
      if (r <= 0) {
        stopTimer();
        if (state.mode === "name") {
          el.choices.querySelectorAll("button").forEach((x) => { x.disabled = true; });
          const f = state.questions[state.idx];
          el.choices.querySelectorAll("button").forEach((x) => {
            if (x.textContent.slice(1) === f.info.name) x.classList.add("is-correct");
          });
        }
        answer(false, null, null);
      }
    });
  }
  function stopTimer() {
    if (timerHandle) { timerHandle.stop(); timerHandle = null; }
  }
})();
