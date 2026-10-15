/* 2026 독일 국외연수 가이드북 — 앱 로직
 * 콘텐츠는 모두 data/guidebook.json 에서 읽는다. 화면 문구 외 사실정보를 이 파일에 쓰지 않는다.
 */
(function () {
  "use strict";

  var DATA_URL = "data/guidebook.json";
  var TZ = "Europe/Berlin";
  var CHECK_KEY = "de-guide-checklist-v1";
  var TABS = { home: "홈", schedule: "일정", hotels: "숙소", places: "방문기관", info: "생활정보", sos: "비상연락" };

  var data = null;
  var view = document.getElementById("view");

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // 간단 서식: **굵게**, [확인필요] 강조, 줄바꿈
  function fmt(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[확인필요\]/g, '<span class="chk">확인필요</span>')
      .replace(/\n/g, "<br>");
  }
  // 미확인 값: {"value": 값|null, "tbd": true, "note": "..."}
  function isTbd(x) { return !!(x && typeof x === "object" && x.tbd === true); }
  function raw(x) { return isTbd(x) ? x.value : x; }       // 값만 (없으면 null)
  function badge(x) { return '<span class="chk"' + (x && x.note ? ' title="' + esc(x.note) + '"' : "") + ">확인필요</span>"; }
  function T(x) {
    if (x == null || x === "") return "";
    if (isTbd(x)) return (x.value ? fmt(x.value) + " " : "") + badge(x);
    return fmt(x);
  }
  function list(arr) {
    if (!arr || !arr.length) return "";
    return "<ul>" + arr.map(function (x) { return "<li>" + T(x) + "</li>"; }).join("") + "</ul>";
  }
  function paras(v) {
    if (!v) return "";
    if (Array.isArray(v)) return list(v);
    return "<p>" + T(v) + "</p>";
  }
  function telHref(tel) { return "tel:" + String(tel).replace(/[^\d+]/g, ""); }
  function mapHref(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }
  var ICON = {
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9zM5 15H4V4h11v1"/></svg>',
    show: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
  };

  function telLink(tel, display, cls) {
    var num = raw(tel);
    if (!num || /확인필요/.test(num)) return isTbd(tel) ? badge(tel) : '<span class="chk">확인필요</span>';
    return '<a class="' + (cls || "tel-link") + '" href="' + esc(telHref(num)) + '">' + esc(display || num) + "</a>" + (isTbd(tel) ? " " + badge(tel) : "");
  }
  function placeActions(p) {
    var h = '<div class="actions">';
    var addr = raw(p.address), tel = raw(p.tel);
    if (addr) {
      // 구글지도 검색어: 지정값 > 현지 명칭 + 주소 (한국어 명칭은 검색 정확도가 낮음)
      var q = p.mapQuery || ((p.nameLocal ? p.nameLocal + ", " : "") + addr);
      h += '<a class="btn btn-primary" href="' + esc(mapHref(q)) + '" target="_blank" rel="noopener">' + ICON.map + "구글지도에서 열기</a>";
      h += '<button type="button" class="btn" data-copy="' + esc(addr) + '">' + ICON.copy + "주소 복사</button>";
    }
    if (tel && !/확인필요/.test(tel)) {
      h += '<a class="btn" href="' + esc(telHref(tel)) + '">' + ICON.tel + "전화</a>";
    }
    return h + "</div>";
  }
  function sources(arr) {
    if (!arr || !arr.length) return "";
    return '<details class="sources"><summary>출처</summary><ul>' + arr.map(function (u) {
      return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + "</a></li>";
    }).join("") + "</ul></details>";
  }
  // 이미지는 "ready": true 인 것만 표시 (경로만 잡아 둔 항목은 숨김)
  function figure(img) {
    if (!img || !img.src || img.ready !== true) return "";
    return '<figure><img src="' + esc(img.src) + '" alt="' + esc(img.alt || "") + '" loading="lazy" decoding="async"' +
      (img.width ? ' width="' + img.width + '" height="' + img.height + '"' : "") + ">" +
      (img.credit ? "<figcaption>출처: " + (img.sourceUrl ? '<a href="' + esc(img.sourceUrl) + '" target="_blank" rel="noopener">' + esc(img.credit) + "</a>" : esc(img.credit)) + (img.license ? " · " + esc(img.license) : "") + "</figcaption>" : "") + "</figure>";
  }
  function kv(rows) {
    var h = '<dl class="kv">';
    rows.forEach(function (r) { if (r[1]) h += "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; });
    return h + "</dl>";
  }

  // 독일 현지 날짜(YYYY-MM-DD)
  function todayISO() {
    // 점검용: index.html?today=2026-11-17 로 특정 날짜 화면 확인
    var q = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (q) return q[1];
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs()));
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
  }
  function dayDiff(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000); }
  function dateLabel(iso) {
    var w = ["일", "월", "화", "수", "목", "금", "토"][new Date(iso + "T12:00:00Z").getUTCDay()];
    var p = iso.split("-");
    return Number(p[1]) + "/" + Number(p[2]) + "(" + w + ")";
  }
  function byId(arr, id) { for (var i = 0; i < (arr || []).length; i++) if (arr[i].id === id) return arr[i]; return null; }

  /* ---------- 인트로 애니메이션 ----------
   * 끊기지 않는 선 하나(경로 1개)가 비행기 → 로켓 → 버스 → 대학 → 기차 → 자동차를 차례로 그리고,
   * 사물 윤곽이 닫히는 순간 안쪽 색이 채워짐. 마지막에 선이 연수명·기간의 밑줄이 됨.
   * 인라인 SVG + CSS 애니메이션. JS는 경로 길이로 타이밍만 계산. 첫 실행 때만 자동 재생.
   * 점검용: ?intro=1 (강제 재생), ?intro=hold (끝나도 닫지 않음)
   */
  var INTRO_KEY = "de-guide-intro-v1";
  var INTRO_D = 3.8; // 선 그리기 시간(초) — 끝맺음 포함 전체 약 4.7초
  // 사물: 진입점(at)에서 시작해 같은 점으로 돌아오는 닫힌 한 붓 그리기 (상대좌표)
  var INTRO_OBJS = [
    { key: "plane", at: [40, 150], d: "l34 0 l-10 22 l12 0 l22 -22 l30 0 c10 0 16 -6 16 -11 c0 -5 -6 -9 -16 -9 l-66 0 l-12 -16 l-8 0 l-2 36",
      box: [0, -36, 104, 22], lbl: [52, -50],
      extras: '<circle cx="34" cy="-11" r="2.6"/><circle cx="44" cy="-11" r="2.6"/><circle cx="54" cy="-11" r="2.6"/><circle cx="64" cy="-11" r="2.6"/><circle cx="74" cy="-11" r="2.6"/>' },
    { key: "rocket", at: [285, 290], d: "l-8 -16 l-6 0 l-12 14 l12 -32 l0 -30 l8 0 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0 l-8 0 l0 -12 c0 -14 8 -26 14 -32 c6 6 14 18 14 32 l0 42 l12 32 l-12 -14 l-6 0 l-8 16",
      box: [-26, -108, 26, 0], lbl: [0, -120],
      extras: '<circle cx="0" cy="-64" r="5"/>' },
    { key: "bus", at: [156, 400], d: "l-16 0 a10 10 0 0 1 -20 0 l-46 0 a10 10 0 0 1 -20 0 l-14 0 l0 -40 q0 -8 8 -8 l96 0 q12 0 12 12 l0 36",
      box: [-116, -48, 0, 10], lbl: [-58, -62],
      extras: '<rect x="-108" y="-40" width="22" height="14" rx="2"/><rect x="-82" y="-40" width="22" height="14" rx="2"/><rect x="-56" y="-40" width="22" height="14" rx="2"/><rect x="-28" y="-40" width="18" height="20" rx="2"/>' },
    { key: "univ", at: [210, 470], d: "l12 0 l0 -34 l8 0 l0 34 l14 0 l0 -34 l8 0 l0 34 l16 0 l0 -34 l8 0 l0 34 l14 0 l0 -34 l8 0 l0 34 l12 0 l0 -40 l-50 -26 l-50 26 l0 40",
      box: [0, -66, 100, 0], lbl: [50, 24],
      extras: '<circle cx="50" cy="-50" r="4"/>' },
    { key: "train", at: [162, 570], d: "l-8 0 a7 7 0 0 1 -14 0 l-40 0 a7 7 0 0 1 -14 0 l-14 0 a7 7 0 0 1 -14 0 l-18 0 l0 -32 q0 -8 8 -8 l100 0 l22 18 c6 12 2 22 -8 22",
      box: [-122, -40, 8, 7], lbl: [-57, -54],
      extras: '<rect x="-112" y="-32" width="82" height="10" rx="2"/><path d="M-22 -32 l12 0 l10 8 l-22 0z"/>' },
    { key: "car", at: [212, 600], d: "l12 0 a10 10 0 0 0 20 0 l44 0 a10 10 0 0 0 20 0 l14 0 l0 -10 l-18 -6 l-14 -14 l-40 0 l-16 14 l-18 2 q-4 0 -4 4 l0 10",
      box: [0, -30, 110, 10], lbl: [55, -44],
      extras: '<path d="M42 -26 l32 0 l12 9 l-56 0z"/>' }
  ];
  // 사물 사이 연결선 (절대좌표, 앞 사물의 진입점에서 출발)
  var INTRO_LINKS = [
    "M-20,150 C0,150 20,150 40,150",
    "C14,236 196,334 285,290",
    "C292,352 232,406 156,400",
    "C176,400 192,470 210,470",
    "C210,522 206,572 162,570",
    "C180,575 192,600 212,600"
  ];
  var introTimer = null, introEndTimer = null;

  function introPeriod(m) {
    var a = m.start.split("-"), b = m.end.split("-");
    return a[0] + "." + Number(a[1]) + "." + Number(a[2]) + dateLabel(m.start).replace(/^[^(]+/, "") +
      " – " + Number(b[1]) + "." + Number(b[2]) + dateLabel(m.end).replace(/^[^(]+/, "");
  }
  function buildIntro(el) {
    var m = data.meta, labels = (m.intro && m.intro.labels) || {};
    var h = '<svg class="in-svg" viewBox="0 0 360 760" preserveAspectRatio="xMidYMid meet" role="img" aria-label="연수 여정 인트로">';
    // 채움(사물마다 하나) — 선보다 아래에
    INTRO_OBJS.forEach(function (o) {
      h += '<g class="in-obj in-' + o.key + '" transform="translate(' + o.at[0] + " " + o.at[1] + ')">' +
        '<path class="in-fill" d="M0 0 ' + o.d + 'z"/><g class="in-win">' + o.extras + "</g></g>";
    });
    // 도시 이름
    INTRO_OBJS.forEach(function (o) {
      h += '<text class="in-lbl" data-k="' + o.key + '" x="' + (o.at[0] + o.lbl[0]) + '" y="' + (o.at[1] + o.lbl[1]) + '" text-anchor="middle">' + esc(labels[o.key] || "") + "</text>";
    });
    // 연수명·기간
    h += '<text class="in-title" id="in-title" x="180" y="668" text-anchor="middle">' + esc(m.title) + "</text>";
    h += '<text class="in-period" id="in-period" x="180" y="700" text-anchor="middle">' + esc(introPeriod(m)) + "</text>";
    h += '<path class="in-line" id="in-line" d=""/></svg>';
    h += '<p class="in-skip">화면을 누르면 건너뜁니다</p>';
    el.innerHTML = h;
  }
  // 경로 조각을 이어 붙이고, 각 조각 길이로 채움·이름 표시 시점 계산
  function layoutIntro(el) {
    var svg = el.querySelector("svg"), line = el.querySelector("#in-line");
    var title = el.querySelector("#in-title"), period = el.querySelector("#in-period");
    var w = 260;
    try { w = Math.max(title.getComputedTextLength(), period.getComputedTextLength()); } catch (e) {}
    var x0 = 180 - w / 2 - 6, x1 = 180 + w / 2 + 6;
    var tail = "C212,632 40,614 24,662 C14,694 " + (x0 - 18) + ",716 " + x0 + ",716 L" + x1 + ",716";
    var pieces = [], d = "";
    INTRO_LINKS.forEach(function (lk, i) {
      pieces.push({ kind: "link", d: lk, from: i === 0 ? null : INTRO_OBJS[i - 1].at });
      pieces.push({ kind: "obj", d: INTRO_OBJS[i].d, from: INTRO_OBJS[i].at, key: INTRO_OBJS[i].key });
    });
    pieces.push({ kind: "tail", d: tail, from: INTRO_OBJS[INTRO_OBJS.length - 1].at });
    var probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(probe);
    var acc = 0, marks = {};
    pieces.forEach(function (pc) {
      var pd = pc.from ? "M" + pc.from[0] + "," + pc.from[1] + " " + pc.d : pc.d;
      probe.setAttribute("d", pd);
      var len = probe.getTotalLength();
      if (pc.kind === "obj") marks[pc.key] = { start: acc, end: acc + len };
      if (pc.kind === "tail") marks.tail = { start: acc, end: acc + len };
      acc += len;
      d += (d ? " " : "") + (pc.from && !d ? "M" + pc.from[0] + "," + pc.from[1] + " " : "") + pc.d;
    });
    svg.removeChild(probe);
    line.setAttribute("d", d);
    var L = line.getTotalLength();
    var k = INTRO_D / L;
    line.style.setProperty("--L", L.toFixed(1));
    line.style.setProperty("--D", INTRO_D + "s");
    INTRO_OBJS.forEach(function (o) {
      el.querySelector(".in-" + o.key).style.setProperty("--t", (marks[o.key].end * k).toFixed(2) + "s");
      el.querySelector('.in-lbl[data-k="' + o.key + '"]').style.setProperty("--t", Math.max(0, marks[o.key].start * k - 0.1).toFixed(2) + "s");
    });
    var tt = (marks.tail.start * k).toFixed(2) + "s";
    title.style.setProperty("--t", tt);
    period.style.setProperty("--t", tt);
    return { L: L, marks: marks };
  }
  function introSeen() {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) { /* 저장 불가 환경 */ }
  }
  function endIntro(fast) {
    var el = document.getElementById("intro");
    clearTimeout(introTimer); clearTimeout(introEndTimer);
    introSeen();
    var done = function () {
      el.classList.remove("show", "out", "static", "play");
      el.innerHTML = "";
      document.documentElement.classList.remove("intro-pending");
      document.body.classList.remove("sc-open");
    };
    if (fast) { done(); return; }
    el.classList.add("out");
    introEndTimer = setTimeout(done, 400);
  }
  function playIntro() {
    var el = document.getElementById("intro");
    if (!el || !data) return;
    clearTimeout(introTimer); clearTimeout(introEndTimer);
    buildIntro(el);
    el.classList.remove("out", "static", "play");
    el.classList.add("show");
    document.body.classList.add("sc-open"); // 뒤 화면 스크롤 막기
    var hold = /[?&]intro=hold/.test(location.search);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var start = function () {
      layoutIntro(el);
      if (reduce) { el.classList.add("static"); if (!hold) introTimer = setTimeout(function () { endIntro(true); }, 2200); return; }
      void el.offsetWidth; // 애니메이션 처음부터
      el.classList.add("play");
      if (!hold) introTimer = setTimeout(function () { endIntro(false); }, (INTRO_D + 0.5) * 1000);
    };
    // 글꼴(로컬)이 준비된 뒤 글자 폭을 재야 밑줄 길이가 맞음
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
  }
  document.getElementById("intro").addEventListener("click", function () { endIntro(true); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.getElementById("intro").classList.contains("show")) endIntro(true);
  });
  function maybeIntro() {
    var want = /[?&]intro=/.test(location.search);
    try { if (!localStorage.getItem(INTRO_KEY)) want = true; } catch (e) { want = false; }
    if (want) playIntro(); else document.documentElement.classList.remove("intro-pending");
  }

  /* ---------- 이동경로 지도: 버스가 달리는 지도 (오프라인 SVG) ----------
   * 바탕: data/map-base.json (Natural Earth 국경 → 메르카토르 투영, tools/make_map_atlas.py로 생성)
   * 경로·정류지·일차·거리: guidebook.json schedule.map (stops / legs / stays / overview)
   * 전체 보기: 경로 전체를 한 번에. 일차 선택: 그날 구간으로 줌인 → 버스(항공은 비행기)가 구간별로 달림.
   * 구간마다 최대 4초, 지나가며 거리(km)·도착 도시 이름 표시. 동작 줄이기: 애니메이션 없이 구간만 강조.
   */
  var mapBase = null, mapDay = null, mapVB = null, mapWrapEl = null, mapRun = 0, mapRAF = null, mapDone = null;
  var SVGNS = "http://www.w3.org/2000/svg";
  var FULL_VB = [60, 110, 520, 680];
  var BUS_PX_PER_S = 55, LEG_MIN = 1.2, LEG_MAX = 4.0, ZOOM_MS = 650;

  function loadMapBase() {
    if (mapBase) return Promise.resolve(mapBase);
    return fetch("data/map-base.json").then(function (r) { return r.json(); }).then(function (j) { mapBase = j; return j; });
  }
  function proj(pt) {
    if (pt.xy) return pt.xy;
    var P = mapBase.proj, lat = pt.lat * Math.PI / 180;
    return [P.ax * pt.lng + P.bx, P.ay * Math.log(Math.tan(Math.PI / 4 + lat / 2)) + P.by];
  }
  function mapDays() { return data.schedule.days.map(function (d) { return d.day; }); }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function renderMapCard() {
    var h = '<section class="card map-card" id="schedule-map"><h2>이동 경로</h2>' +
      '<div class="segment map-seg" role="group" aria-label="일차 선택">' +
      '<button type="button" data-mapday="all" aria-pressed="' + (mapDay === "all") + '">전체</button>';
    mapDays().forEach(function (n) {
      h += '<button type="button" data-mapday="' + n + '" aria-pressed="' + (String(mapDay) === String(n)) + '">' + n + "일차</button>";
    });
    h += '</div><div class="map-wrap" id="map-wrap"><p class="loading">지도 불러오는 중…</p></div>' +
      '<div class="map-cap" id="map-cap"></div>' +
      '<p class="map-legend"><span class="lg-road"></span>버스 이동 <span class="lg-air"></span>항공 <span class="lg-pin">1</span>숙소</p>' +
      '<p><small class="muted">' + T(data.schedule.map.note) + " " + T(data.schedule.routeNote) + "</small></p>" +
      sources(data.schedule.map.sources) + "</section>";
    return h;
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function legPath(leg) {
    var st = data.schedule.map.stops, a = proj(st[leg.from]), b = proj(st[leg.to]);
    if (leg.mode === "air") {  // 항공은 완만한 곡선
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      var cx = mx - dy * 0.18, cy = my + dx * 0.18;
      return "M" + a[0].toFixed(1) + "," + a[1].toFixed(1) + " Q" + cx.toFixed(1) + "," + cy.toFixed(1) + " " + b[0].toFixed(1) + "," + b[1].toFixed(1);
    }
    return "M" + a[0].toFixed(1) + "," + a[1].toFixed(1) + " L" + b[0].toFixed(1) + "," + b[1].toFixed(1);
  }
  function dayLegs(day) {
    var L = data.schedule.map.legs;
    return day === "all" ? L : L.filter(function (l) { return String(l.day) === String(day); });
  }
  function stayOf(day) { var s = data.schedule.map.stays || {}; return day === "all" ? null : s[String(day)] || null; }

  // 선택한 일차 범위로 확대 (화면 비율 유지, 너무 가까우면 최소 크기). 지도 밖 지점(인천)은 제외
  function viewBoxFor(day, legs) {
    var st = data.schedule.map.stops, xs = [], ys = [];
    if (day === "all") return FULL_VB.slice();
    var stay = stayOf(day);
    if (stay) { var q = proj(st[stay]); xs.push(q[0]); ys.push(q[1]); }
    legs.forEach(function (l) { [l.from, l.to].forEach(function (k) { if (st[k].xy) return; var q2 = proj(st[k]); xs.push(q2[0]); ys.push(q2[1]); }); });
    if (!xs.length) return FULL_VB.slice();
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var ratio = FULL_VB[2] / FULL_VB[3], pad = 70;
    var w = Math.max(x1 - x0 + pad * 2, 200), h = Math.max(y1 - y0 + pad * 2, 200 / ratio);
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    if (w > FULL_VB[2]) return FULL_VB.slice();
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }

  // 이름표 자리 고르기: 오른쪽 → 왼쪽 → 위 → 아래 → 대각선 중 지도 안·안 겹치는 첫 자리
  function placeLabel(q, text, fs, k, vb, placed, prefLeft) {
    var tw = 0;
    for (var i = 0; i < text.length; i++) tw += (text.charCodeAt(i) < 128 ? 0.6 : 1.0) * fs;
    var hgt = fs * 1.2;
    var c = [
      { x: q[0] + 18 * k, y: q[1] + 7 * k, a: "start", r: [q[0] + 18 * k, q[1] - 14 * k, tw, hgt] },
      { x: q[0] - 18 * k, y: q[1] + 7 * k, a: "end", r: [q[0] - 18 * k - tw, q[1] - 14 * k, tw, hgt] },
      { x: q[0], y: q[1] - 20 * k, a: "middle", r: [q[0] - tw / 2, q[1] - 20 * k - fs, tw, hgt] },
      { x: q[0], y: q[1] + 34 * k, a: "middle", r: [q[0] - tw / 2, q[1] + 34 * k - fs, tw, hgt] },
      { x: q[0] + 12 * k, y: q[1] - 16 * k, a: "start", r: [q[0] + 12 * k, q[1] - 16 * k - fs, tw, hgt] },
      { x: q[0] + 12 * k, y: q[1] + 30 * k, a: "start", r: [q[0] + 12 * k, q[1] + 30 * k - fs, tw, hgt] },
      { x: q[0] - 12 * k, y: q[1] - 16 * k, a: "end", r: [q[0] - 12 * k - tw, q[1] - 16 * k - fs, tw, hgt] },
      { x: q[0] - 12 * k, y: q[1] + 30 * k, a: "end", r: [q[0] - 12 * k - tw, q[1] + 30 * k - fs, tw, hgt] }
    ];
    if (prefLeft) c.splice(0, 2, c[1], c[0]);
    for (var j = 0; j < c.length; j++) {
      var r = c[j].r;
      if (r[0] < vb[0] + 4 * k || r[1] < vb[1] + 4 * k || r[0] + r[2] > vb[0] + vb[2] - 4 * k || r[1] + r[3] > vb[1] + vb[3] - 4 * k) continue;
      if (placed.some(function (o) { return r[0] < o[0] + o[2] && o[0] < r[0] + r[2] && r[1] < o[1] + o[3] && o[1] < r[1] + r[3]; })) continue;
      placed.push(r);
      return c[j];
    }
    return null;
  }
  // 거리(km) 이름표: 구간 가운데, 선 양옆 중 빈 쪽
  function placeKm(p0, p1, text, fs, k, vb, placed) {
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    var n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, tw = 0;
    for (var i = 0; i < text.length; i++) tw += (text.charCodeAt(i) < 128 ? 0.6 : 1.0) * fs;
    var hgt = fs * 1.2, cands = [];
    [0.5, 0.35, 0.65].forEach(function (f) { [22, -22, 36, -36, 50, -50].forEach(function (o) { cands.push([f, o]); }); });
    for (var j = 0; j < cands.length; j++) {
      var mx = p0[0] + dx * cands[j][0], my = p0[1] + dy * cands[j][0];
      var cx = mx + nx * cands[j][1] * k, cy = my + ny * cands[j][1] * k;
      var r = [cx - tw / 2 - 4 * k, cy - hgt / 2 - 2 * k, tw + 8 * k, hgt + 4 * k];
      if (r[0] < vb[0] + 2 * k || r[1] < vb[1] + 2 * k || r[0] + r[2] > vb[0] + vb[2] - 2 * k || r[1] + r[3] > vb[1] + vb[3] - 2 * k) continue;
      if (placed.some(function (o) { return r[0] < o[0] + o[2] && o[0] < r[0] + r[2] && r[1] < o[1] + o[3] && o[1] < r[1] + r[3]; })) continue;
      placed.push(r);
      return { x: cx, y: cy + fs * 0.35, r: r };
    }
    return null;
  }
  // 버스·비행기 아이콘 (원점 = 경로 위 지점)
  function vehicle(parent, mode, k) {
    var g = el("g", { class: "m-veh " + (mode === "air" ? "m-plane" : "m-bus") }, parent);
    var inner = el("g", {}, g);
    if (mode === "air") {
      el("path", { d: "M-15 0 l8 -2 l6 -9 l4 0 l-3 8 l9 -1 l4 -5 l3 0 l-2 7 l2 7 l-3 0 l-4 -5 l-9 -1 l3 8 l-4 0 l-6 -9 z", class: "m-veh-body" }, inner);
    } else {
      el("rect", { x: -16, y: -19, width: 32, height: 14, rx: 3.5, class: "m-veh-body" }, inner);
      el("rect", { x: -12, y: -16, width: 6, height: 5, rx: 1, class: "m-veh-win" }, inner);
      el("rect", { x: -4, y: -16, width: 6, height: 5, rx: 1, class: "m-veh-win" }, inner);
      el("rect", { x: 4, y: -16, width: 9, height: 7, rx: 1, class: "m-veh-win" }, inner);
      el("circle", { cx: -9, cy: -4.5, r: 3.2, class: "m-veh-wheel" }, inner);
      el("circle", { cx: 9, cy: -4.5, r: 3.2, class: "m-veh-wheel" }, inner);
    }
    g._k = k;
    g._inner = inner;
    return g;
  }
  function moveVehicle(g, pt, dirX) {
    g.setAttribute("transform", "translate(" + pt.x.toFixed(2) + " " + pt.y.toFixed(2) + ") scale(" + g._k.toFixed(3) + ")");
    g._inner.setAttribute("transform", dirX < 0 ? "scale(-1 1)" : "");
  }

  function drawMap() {
    var wrap = document.getElementById("map-wrap");
    if (!wrap || !mapBase) return;
    var run = ++mapRun;
    if (mapRAF) { cancelAnimationFrame(mapRAF); mapRAF = null; }
    if (mapDone) { clearTimeout(mapDone); mapDone = null; }
    if (wrap !== mapWrapEl) { mapWrapEl = wrap; mapVB = null; } // 탭을 새로 열면 줌 시작점 초기화
    var M = data.schedule.map, st = M.stops, day = mapDay;
    var legs = dayLegs(day), stay = stayOf(day);
    var vb = viewBoxFor(day, legs), k = vb[2] / FULL_VB[2];
    var animate = day !== "all" && !reduceMotion();
    var startVB = animate && mapVB ? mapVB : vb;
    var svg = el("svg", { viewBox: startVB.map(function (v) { return v.toFixed(1); }).join(" "), role: "img", "aria-label": "독일 이동경로 지도", class: "route-map" });
    var defs = el("defs", {}, svg);
    var g0 = el("g", { class: "m-base" }, svg);
    mapBase.nb.forEach(function (dd) { el("path", { d: dd, class: "m-nb" }, g0); });
    el("path", { d: mapBase.de, class: "m-de" }, g0);
    var refRects = [];
    (M.refs || []).forEach(function (r) {
      var q = proj(r), rfs = 17 * k, tw = 0;
      for (var ci = 0; ci < r.name.length; ci++) tw += (r.name.charCodeAt(ci) < 128 ? 0.6 : 1.0) * rfs;
      if (q[0] - 4 * k < vb[0] || q[0] + 12 * k + tw > vb[0] + vb[2] || q[1] - rfs < vb[1] || q[1] + rfs * 0.5 > vb[1] + vb[3]) return; // 확대 화면 밖이면 생략
      el("circle", { cx: q[0], cy: q[1], r: 3 * k, class: "m-ref" }, g0);
      el("text", { x: q[0] + 7 * k, y: q[1] + 6 * k, class: "m-reflbl", "font-size": rfs, "stroke-width": 4 * k }, g0).textContent = r.name;
      refRects.push([q[0] - 4 * k, q[1] - rfs * 0.8, tw + 12 * k, rfs * 1.2]); // 참고 도시 이름 자리도 피해서 배치
    });
    // 전체 경로(연하게) — 일차 보기의 배경
    var gAll = el("g", { class: "m-all" + (day === "all" ? " hidden" : "") }, svg);
    M.legs.forEach(function (l) {
      el("path", { d: legPath(l), class: "m-leg " + l.mode, "stroke-width": 3 * k, "stroke-dasharray": l.mode === "air" ? 2 * k + " " + 9 * k : "none" }, gAll);
    });
    // 강조 구간
    var gSel = el("g", { class: "m-sel" }, svg);
    var segs = legs.map(function (l, i) {
      var dpath = legPath(l), w = (l.mode === "air" ? 3.5 : 6) * k, pth, reveal;
      if (l.mode === "air") {
        // 점선을 유지한 채 앞에서부터 드러나도록 마스크로 그림
        var mk = el("mask", { id: "mk" + run + "-" + i, maskUnits: "userSpaceOnUse", x: -2000, y: -2000, width: 5000, height: 5000 }, defs);
        reveal = el("path", { d: dpath, fill: "none", stroke: "#fff", "stroke-width": w * 3, "stroke-linecap": "round" }, mk);
        pth = el("path", { d: dpath, class: "m-leg on air", "stroke-width": w, "stroke-dasharray": 2.5 * k + " " + 8 * k, mask: "url(#mk" + run + "-" + i + ")" }, gSel);
      } else {
        pth = el("path", { d: dpath, class: "m-leg on road", "stroke-width": w }, gSel);
        reveal = pth;
      }
      return { leg: l, path: pth, reveal: reveal };
    });
    // 탈것 층(핀 아래) → 숙소 핀
    var gVeh = el("g", { class: "m-vehs" }, svg);
    var gPin = el("g", {}, svg);
    Object.keys(st).forEach(function (key) {
      var s0 = st[key]; if (!s0.pin) return;
      var q = proj(s0);
      if (key === stay) el("circle", { cx: q[0], cy: q[1], r: 13 * k, class: "m-pulse", "stroke-width": 4 * k }, gPin);
      el("circle", { cx: q[0], cy: q[1], r: 13 * k, class: "m-pin" + (key === stay ? " on" : ""), "stroke-width": 3 * k }, gPin);
      el("text", { x: q[0], y: q[1] + 5 * k, class: "m-pinnum", "text-anchor": "middle", "font-size": 16 * k }, gPin).textContent = s0.pin;
    });
    // 이름표: 도시(도착 순서), 거리(km)
    var gLbl = el("g", { class: "m-lbls" }, svg), placed = refRects.slice(), fs = 21 * k;
    var order = [];
    if (day === "all") order = (M.overview || []).slice();
    else {
      if (stay) order.push(stay);
      legs.forEach(function (l) { [l.from, l.to].forEach(function (key) { if (order.indexOf(key) < 0) order.push(key); }); });
    }
    // 핀·정류점 자리를 먼저 막아 두어 이름표가 점을 덮지 않게
    order.forEach(function (key) { if (st[key].xy) return; var q = proj(st[key]); placed.push([q[0] - 9 * k, q[1] - 9 * k, 18 * k, 18 * k]); });
    var kmEls = [];
    if (day !== "all") segs.forEach(function (sg, i) {
      var l = sg.leg; if (!l.label || l.mode === "air") return;
      var pk = placeKm(proj(st[l.from]), proj(st[l.to]), l.label, 17 * k, k, vb, placed);
      if (!pk) return;
      var g = el("g", { class: "m-km" }, gLbl);
      el("rect", { x: pk.r[0], y: pk.r[1], width: pk.r[2], height: pk.r[3], rx: 6 * k, class: "m-km-bg" }, g);
      el("text", { x: pk.x, y: pk.y, "text-anchor": "middle", "font-size": 17 * k, class: "m-km-t" }, g).textContent = l.label;
      kmEls[i] = g;
    });
    var labelEls = {};
    order.forEach(function (key) {
      var s0 = st[key]; if (s0.xy) return;
      var q = proj(s0), name = day === "all" && s0.short ? s0.short : s0.name;
      if (!s0.pin) el("circle", { cx: q[0], cy: q[1], r: 5 * k, class: "m-stop", "stroke-width": 3 * k }, gLbl);
      var pk = placeLabel(q, name, fs, k, vb, placed, q[0] > vb[0] + vb[2] * 0.62);
      if (!pk) return;
      var t = el("text", { x: pk.x, y: pk.y, class: "m-lbl", "text-anchor": pk.a, "font-size": fs, "stroke-width": 5 * k }, gLbl);
      t.textContent = name;
      labelEls[key] = t;
    });
    // 탈것
    var veh = segs.length ? vehicle(gVeh, segs[0].leg.mode, k) : null;
    if (animate) {  // 화면에 붙이기 전에 숨겨 두어야 처음에 잠깐 보였다 사라지지 않음
      Object.keys(labelEls).forEach(function (key) { labelEls[key].style.opacity = 0; });
      kmEls.forEach(function (g) { if (g) g.style.opacity = 0; });
      if (stay && labelEls[stay]) labelEls[stay].style.opacity = 1;
      if (segs.length && labelEls[segs[0].leg.from]) labelEls[segs[0].leg.from].style.opacity = 1;
      if (veh) veh.style.opacity = 0;
    }
    wrap.innerHTML = "";
    wrap.appendChild(svg);
    if (!animate && veh) veh.style.display = "none";

    // 설명
    var cap = document.getElementById("map-cap");
    if (day === "all") {
      cap.innerHTML = "<b>전체 일정</b> · " + esc((M.overview || []).map(function (k2) { return st[k2].short || st[k2].name; }).join(" → "));
    } else {
      var dd2 = data.schedule.days.filter(function (x) { return String(x.day) === String(day); })[0];
      var kms = legs.filter(function (l) { return l.label && l.mode !== "air"; }).map(function (l) { return (st[l.from].short || st[l.from].name) + "→" + (st[l.to].short || st[l.to].name) + " " + l.label; });
      cap.innerHTML = "<b>" + dd2.day + "일차 " + dateLabel(dd2.date) + "</b> · " + esc(raw(dd2.title)) +
        (dd2.route ? "<br><small>" + T(dd2.route) + "</small>" : kms.length ? "<br><small>" + esc(kms.join(" · ")) + "</small>" : "") +
        (stay ? "<br><small>도시 간 이동 없음 — " + esc(st[stay].name) + " 일대 일정</small>" : "") +
        (!legs.length && !stay ? "<br><small>지도 이동 없음</small>" : "");
    }

    // 정적 표시(전체 보기·동작 줄이기): 모두 보이게
    var lens = segs.map(function (sg) { return sg.reveal.getTotalLength(); });
    function showAll() {
      segs.forEach(function (sg, i) { sg.reveal.style.strokeDasharray = "none"; sg.reveal.style.strokeDashoffset = 0; });
      Object.keys(labelEls).forEach(function (key) { labelEls[key].style.opacity = 1; });
      kmEls.forEach(function (g) { if (g) g.style.opacity = 1; });
      if (veh && segs.length) {
        veh.style.opacity = 1;
        var last = segs[segs.length - 1], pt = last.path.getPointAtLength(lens[lens.length - 1]);
        var p0 = last.path.getPointAtLength(Math.max(0, lens[lens.length - 1] - 1));
        moveVehicle(veh, pt, pt.x - p0.x);
      }
    }
    mapVB = vb;
    if (!animate) { svg.setAttribute("viewBox", vb.join(" ")); showAll(); return; }

    // 애니메이션 준비: 구간 숨김, 이름표 숨김(출발 도시만 보임)
    segs.forEach(function (sg, i) { sg.reveal.style.strokeDasharray = lens[i] + " " + lens[i]; sg.reveal.style.strokeDashoffset = lens[i]; });
    var pxPerUnit = (wrap.getBoundingClientRect().width || 320) / vb[2];
    var durs = segs.map(function (sg, i) {
      var sec = (sg.leg.mode === "air" ? lens[i] * pxPerUnit / (BUS_PX_PER_S * 3) : lens[i] * pxPerUnit / BUS_PX_PER_S);
      return Math.min(LEG_MAX, Math.max(LEG_MIN, sec)) * 1000;
    });
    var total = ZOOM_MS + durs.reduce(function (x, y) { return x + y; }, 0);
    mapWrapEl.setAttribute("data-durs", durs.map(function (x) { return (x / 1000).toFixed(2); }).join(",")); // 점검용(구간별 재생 시간)
    var ease = function (q) { return q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; };
    var t0 = null;
    function step(ts) {
      if (run !== mapRun || !document.getElementById("map-wrap")) return;
      if (t0 === null) t0 = ts;
      var t = ts - t0;
      // 1) 줌인
      var z = Math.min(1, t / ZOOM_MS), ez = ease(z);
      svg.setAttribute("viewBox", startVB.map(function (v, i) { return (v + (vb[i] - v) * ez).toFixed(2); }).join(" "));
      // 2) 구간별 주행
      var acc = ZOOM_MS;
      for (var i = 0; i < segs.length; i++) {
        var sg = segs[i], q = Math.max(0, Math.min(1, (t - acc) / durs[i]));
        if (t >= acc) {
          if (veh) veh.style.opacity = 1;
          if (kmEls[i]) kmEls[i].style.opacity = 1;
          if (q < 1 || i === segs.length - 1) {
            var part = lens[i] * ease(q), pt = sg.path.getPointAtLength(part), back = sg.path.getPointAtLength(Math.max(0, part - 1));
            if (veh.getAttribute("class").indexOf(sg.leg.mode === "air" ? "m-plane" : "m-bus") < 0) {
              veh.remove(); veh = vehicle(gVeh, sg.leg.mode, k);
            }
            moveVehicle(veh, pt, pt.x - back.x || (sg.path.getPointAtLength(Math.min(lens[i], part + 1)).x - pt.x));
          }
        }
        sg.reveal.style.strokeDashoffset = lens[i] * (1 - ease(q));
        if (q >= 1 && labelEls[sg.leg.to]) labelEls[sg.leg.to].style.opacity = 1;
        acc += durs[i];
      }
      if (t < total) mapRAF = requestAnimationFrame(step);
      else { mapRAF = null; finish(); }
    }
    function finish() {
      if (run !== mapRun) return;
      if (mapDone) { clearTimeout(mapDone); mapDone = null; }
      svg.setAttribute("viewBox", vb.join(" "));
      showAll();
    }
    mapRAF = requestAnimationFrame(step);
    // 화면이 가려져 애니메이션이 멈춰도 끝 상태는 보장
    mapDone = setTimeout(function () { if (mapRAF) { cancelAnimationFrame(mapRAF); mapRAF = null; } finish(); }, total + 400);
  }
  function setMapDay(v) {
    mapDay = v;
    Array.prototype.forEach.call(document.querySelectorAll("[data-mapday]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-mapday") === String(v)));
    });
    drawMap();
  }

  /* ---------- 시계·다음 일정 ----------
   * 휴대폰 시각을 시간대별로 변환(Intl) — 인터넷 불필요. 일정 시각은 항목의 tz(없으면 독일)를 기준으로 계산.
   * 점검용: index.html?now=2026-11-17T09:30 (독일 시각)으로 특정 시점을 흉내 냄
   */
  var nowShift = 0;
  (function () {
    var q = /[?&]now=(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(location.search);
    if (q) nowShift = zonedToUTC(q[1], q[2], TZ) - Date.now();
  })();
  function nowMs() { return Date.now() + nowShift; }

  // 특정 시간대의 시각 정보를 숫자로
  function zparts(ms, tz) {
    var o = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" })
      .formatToParts(new Date(ms)).forEach(function (x) { o[x.type] = x.value; });
    return o;
  }
  function tzOffsetMin(ms, tz) {
    var o = zparts(ms, tz);
    var asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
    return Math.round((asUTC - Math.floor(ms / 1000) * 1000) / 60000);
  }
  // "2026-11-16" + "13:30" + 시간대 → 절대 시각(ms)
  function zonedToUTC(dateISO, hm, tz) {
    var dp = dateISO.split("-"), tp = hm.split(":");
    var guess = Date.UTC(+dp[0], +dp[1] - 1, +dp[2], +tp[0], +tp[1]);
    var t = guess - tzOffsetMin(guess, tz) * 60000;
    return guess - tzOffsetMin(t, tz) * 60000;
  }
  var WEEK = { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" };

  // 일정 → 시각이 정해진 항목 목록(시간순)
  function timedEvents() {
    var out = [];
    data.schedule.days.forEach(function (d) {
      d.items.forEach(function (it) {
        var t = raw(it.time);
        var m = t && /^(\d{1,2}):(\d{2})/.exec(t);
        if (!m) return;
        var tz = it.tz || TZ;
        out.push({ at: zonedToUTC(d.date, m[1].padStart(2, "0") + ":" + m[2], tz), day: d.day, date: d.date,
          time: m[1].padStart(2, "0") + ":" + m[2], tz: tz, title: raw(it.title), tbd: isTbd(it.time) });
      });
    });
    return out.sort(function (a, b) { return a.at - b.at; });
  }
  function durationText(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    if (dd > 0) return dd + "일 " + hh + "시간 " + mm + "분";
    if (hh > 0) return hh + "시간 " + String(mm).padStart(2, "0") + "분 " + String(ss).padStart(2, "0") + "초";
    return mm + "분 " + String(ss).padStart(2, "0") + "초";
  }
  // 홈 표지판에 함께 적는 독일어 지명
  var DE_NAME = { "인천": "Incheon", "뮌헨": "München", "브레멘": "Bremen", "카셀": "Kassel",
    "기센": "Gießen", "뷔르츠부르크": "Würzburg", "뉘른베르크": "Nürnberg" };

  // 다음 일정(위) + 두 나라 시계(아래)를 한 판에
  function renderClock() {
    var clocks = data.meta.clocks || [];
    var h = '<section class="card board"><div class="next-ev" id="next-ev"></div><div class="clocks">';
    clocks.forEach(function (c, i) {
      h += '<div class="clock"><div class="clock-label">' + esc(c.label) + ' <small>' + esc(c.sub || "") + "</small></div>" +
        '<div class="clock-time" id="clk-t' + i + '">--:--</div><div class="clock-date" id="clk-d' + i + '"></div></div>';
    });
    h += '</div><p class="clock-diff" id="clk-diff"></p></section>';
    return h;
  }
  function tickClock() {
    var el = document.getElementById("clk-t0");
    if (!el) return false;
    var now = nowMs(), clocks = data.meta.clocks || [];
    clocks.forEach(function (c, i) {
      var o = zparts(now, c.tz);
      document.getElementById("clk-t" + i).innerHTML = o.hour + ":" + o.minute + '<span class="sec">:' + o.second + "</span>";
      document.getElementById("clk-d" + i).textContent = Number(o.month) + "/" + Number(o.day) + "(" + (WEEK[o.weekday] || "") + ")";
    });
    if (clocks.length === 2) {
      var diff = (tzOffsetMin(now, clocks[1].tz) - tzOffsetMin(now, clocks[0].tz)) / 60;
      document.getElementById("clk-diff").textContent = diff === 0 ? "시차 없음"
        : clocks[1].label + "이 " + Math.abs(diff) + "시간 " + (diff > 0 ? "빠름" : "느림") +
          " · " + clocks[0].label + " 시각 + " + diff + "시간 = " + clocks[1].label + " 시각";
    }
    var evs = timedEvents(), next = null;
    for (var i = 0; i < evs.length; i++) if (evs[i].at > now) { next = evs[i]; break; }
    var ne = document.getElementById("next-ev");
    if (!next) {
      ne.innerHTML = evs.length ? '<div class="ne-label">모든 일정이 끝났습니다</div>' : "";
    } else {
      var tzName = next.tz === "Asia/Seoul" ? "한국시각" : "현지시각";
      ne.innerHTML = '<div class="ne-label">다음 일정</div>' +
        '<div class="ne-title">' + esc(next.title) + (next.tbd ? ' <span class="chk">확인필요</span>' : "") + "</div>" +
        '<div class="ne-when">' + next.day + "일차 · " + dateLabel(next.date) + " " + next.time + " " + tzName + "</div>" +
        '<div class="ne-count">' + durationText(next.at - now) + " 남음</div>";
    }
    return true;
  }
  var clockTimer = null, clockDay = null;
  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockDay = todayISO();
    if (!tickClock()) return;
    clockTimer = setInterval(function () {
      if (document.hidden) return;
      if (todayISO() !== clockDay) { route(); return; } // 날짜가 바뀌면 '오늘 일정' 다시 그림
      if (!tickClock()) { clearInterval(clockTimer); clockTimer = null; }
    }, 1000);
  }

  /* ---------- 보여주기 카드 ----------
   * 호텔 주소·독일어 문장을 전체화면 큰 글씨로. 화면 켜짐 유지(지원 기기), 뒤로가기·화면 탭으로 닫기. 모두 오프라인 동작.
   */
  var sc = document.getElementById("showcard");
  var scBody = document.getElementById("sc-body");
  var wakeLock = null, scPushed = false;

  function showCardHTML(key) {
    var parts = key.split(":"), kind = parts[0], id = parts.slice(1).join(":");
    if (kind === "hotel") {
      var x = byId(data.hotels.items.concat(data.hotels.venues || []), id);
      if (!x) return null;
      var req = (data.info.showCard || {}).hotelRequest || {};
      return '<p class="sc-lead" lang="de">' + esc(req.de || "") + "</p>" +
        '<p class="sc-main" lang="de">' + esc(x.name) + "</p>" +
        '<p class="sc-addr" lang="de">' + esc(raw(x.address) || "") + "</p>" +
        (isTbd(x.address) ? '<p class="sc-warn">⚠ 확인 중인 주소입니다 — 인솔자에게 확인 후 사용</p>' : "") +
        (raw(x.tel) ? '<p class="sc-tel">☎ ' + esc(x.telDisplay || raw(x.tel)) + "</p>" : "") +
        '<p class="sc-ko">' + esc(req.ko || "") + " — 기사님께 보여 주세요</p>";
    }
    if (kind === "phrase") {
      var ph = data.info.phrases[Number(id)];
      if (!ph) return null;
      return '<p class="sc-main" lang="de">' + esc(ph.de) + "</p>" +
        '<p class="sc-ko">' + esc(ph.ko) + "</p>" +
        '<p class="sc-pron">' + esc(ph.pron) + "</p>";
    }
    return null;
  }
  // 글자가 화면을 넘지 않도록 큰 크기부터 줄여 가며 맞춤
  function fitShowCard() {
    var size = Math.min(window.innerWidth, window.innerHeight) * 0.13;
    scBody.style.fontSize = size + "px";
    for (var i = 0; i < 40 && (scBody.scrollHeight > scBody.clientHeight || scBody.scrollWidth > scBody.clientWidth) && size > 16; i++) {
      size *= 0.92;
      scBody.style.fontSize = size + "px";
    }
  }
  function openShowCard(key) {
    var html = showCardHTML(key);
    if (!html) return;
    scBody.innerHTML = html;
    sc.hidden = false;
    document.body.classList.add("sc-open");
    fitShowCard();
    try { history.pushState({ showcard: 1 }, ""); scPushed = true; } catch (e) { scPushed = false; }
    try {
      if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; }).catch(function () {});
    } catch (e) { /* 미지원 기기 */ }
  }
  function closeShowCard(fromPop) {
    if (sc.hidden) return;
    sc.hidden = true;
    document.body.classList.remove("sc-open");
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    if (scPushed && !fromPop) { scPushed = false; history.back(); }
    scPushed = false;
  }
  sc.addEventListener("click", function () { closeShowCard(false); });
  window.addEventListener("popstate", function () { closeShowCard(true); });
  window.addEventListener("resize", function () { if (!sc.hidden) fitShowCard(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeShowCard(false); });
  function showBtn(key, label) {
    return '<button type="button" class="btn btn-show" data-show="' + esc(key) + '">' + ICON.show + esc(label) + "</button>";
  }

  /* ---------- 공지 ----------
   * data/notice.json 만 온라인일 때 새로 받음(서비스워커가 인터넷 우선 처리), 오프라인이면 저장본.
   * 읽음 표시는 이 기기에만 저장(서버 전송 없음).
   */
  var NOTICE_URL = "data/notice.json";
  var SEEN_KEY = "de-guide-notice-seen-v1";
  var notice = { items: [], source: null, checkedAt: null };

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function writeSeen(ids) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch (e) { /* 저장 불가 환경 */ }
  }
  function activeNotices() {
    var today = todayISO();
    return (notice.items || []).filter(function (n) { return n && n.id && (!n.until || n.until >= today); })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  }
  function hhmm(d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  // 홈 맨 위: 아직 확인하지 않은 공지만
  function renderNotices() {
    var seen = readSeen(), h = "";
    activeNotices().filter(function (n) { return seen.indexOf(n.id) < 0; }).forEach(function (n) {
      h += '<section class="notice-banner' + (n.level === "urgent" ? " urgent" : "") + '" role="alert">' +
        '<div class="nb-head"><span class="nb-tag">' + (n.level === "urgent" ? "긴급 공지" : "새 공지") + "</span>" +
        '<small>' + esc(n.date || "") + "</small></div>" +
        "<h3>" + esc(n.title) + "</h3>" + paras(n.body) +
        '<button type="button" class="btn nb-ok" data-notice-ok="' + esc(n.id) + '">확인했어요</button></section>';
    });
    return h;
  }
  // 홈 아래쪽: 지난 공지 전체
  function renderNoticeList() {
    var list = activeNotices();
    if (!list.length) return "";
    var src = notice.source === "network" ? "최신 공지 · " + hhmm(notice.checkedAt) + " 확인"
      : "오프라인 — 저장된 공지 표시 중";
    return '<details class="card notice-all"><summary>공지사항 ' + list.length + "건</summary>" +
      list.map(function (n) {
        return '<div class="notice-item"><div><b>' + esc(n.title) + "</b> <small>" + esc(n.date || "") + "</small></div>" + paras(n.body) + "</div>";
      }).join("") + '<p><small class="muted">' + src + "</small></p></details>";
  }
  function refreshNoticeArea() {
    var el = document.getElementById("notice-area");
    if (el) el.innerHTML = renderNotices();
    var el2 = document.getElementById("notice-list");
    if (el2) el2.innerHTML = renderNoticeList();
  }
  function loadNotices() {
    return fetch(NOTICE_URL, { cache: "no-store" }).then(function (r) {
      var src = r.headers.get("X-Notice-Source") || (navigator.onLine ? "network" : "cache");
      return r.json().then(function (j) {
        notice = { items: j.items || [], source: src, checkedAt: new Date() };
        refreshNoticeArea();
      });
    }).catch(function () { /* 네트워크·저장본 모두 없음: 공지 영역 비움 */ });
  }

  /* ---------- 화면: 홈 ---------- */
  function renderHome() {
    var m = data.meta, today = todayISO(), h = "";
    var day = null;
    data.schedule.days.forEach(function (d) { if (d.date === today) day = d; });

    h += '<div id="notice-area">' + renderNotices() + "</div>";

    // 표지판 히어로: 파란 도로표지 위에 노란 도시 표지(Ortstafel) — 지금 있는(또는 첫) 도시
    var cities = function (d) { return String(d.city || "").split("→").map(function (s) { return s.trim(); }).filter(Boolean); };
    var signCity, signNote, status, statusSub;
    if (day) {
      var cs = cities(day);
      signCity = cs[cs.length - 1];
      signNote = cs.length > 1 ? cs.slice(0, -1).join(" → ") + "에서 이동" : "";
      status = day.day + "일차";
      statusSub = dateLabel(day.date);
    } else if (today < m.start) {
      var first = data.schedule.days[0] ? cities(data.schedule.days[0]) : [];
      signCity = first[first.length - 1] || "";
      signNote = "첫 숙박 도시";
      status = "D-" + dayDiff(today, m.start);
      statusSub = dateLabel(m.start) + " 출발";
    } else {
      signCity = "인천";
      signNote = "";
      status = "연수 종료";
      statusSub = "수고 많으셨습니다";
    }
    h += '<section class="sign-hero"><h1>' + esc(m.title) + "</h1>" +
      '<p class="sh-route">' + esc(m.subtitle || "") + "</p>";
    if (signCity) {
      h += '<div class="ortstafel"><span class="ot-ko">' + esc(signCity) + "</span>" +
        (DE_NAME[signCity] ? '<span class="ot-de" lang="de">' + esc(DE_NAME[signCity]) + "</span>" : "") + "</div>";
    }
    h += '<div class="sh-status"><b>' + esc(status) + "</b><span>" + esc(statusSub) +
      (signNote ? "<br>" + esc(signNote) : "") + "</span></div>";
    h += '<div class="sh-foot"><span>' + esc(m.org || "") + '</span><button type="button" class="intro-replay" data-intro>인트로 다시 보기</button></div>';
    h += "</section>";
    h += renderClock();

    if (day) {
      h += '<h2 class="section-title">오늘 일정</h2>' + dayCard(day, true);
      var hotel = byId(data.hotels.items, day.hotelId);
      if (hotel) {
        h += '<h2 class="section-title">오늘 숙소</h2><section class="card"><h3>' + esc(hotel.name) + "</h3>" +
          kv([["주소", T(hotel.address)], ["전화", telLink(hotel.tel, hotel.telDisplay)], ["체크인", T(hotel.checkin)]]) +
          placeActions(hotel) + '<div class="actions">' + showBtn("hotel:" + hotel.id, "기사님께 보여주기") + '<a class="btn" href="#hotels/' + esc(hotel.id) + '">숙소 상세</a></div></section>';
      }
    }

    var o = data.home;
    h += '<h2 class="section-title">연수 개요</h2><section class="card">';
    if (o.purpose) h += "<h3>연수 목적</h3>" + paras(o.purpose);
    if (o.highlights) h += '<h3 style="margin-top:12px">주요 내용</h3>' + paras(o.highlights);
    h += '<div class="notice">' + T(m.disclaimer) + "</div></section>";

    if (o.flights && o.flights.length) {
      h += '<h2 class="section-title">항공편</h2><section class="card"><div class="table-wrap"><table><thead><tr><th>편명</th><th>일자</th><th>구간</th><th>출발</th><th>도착</th></tr></thead><tbody>';
      o.flights.forEach(function (f) {
        h += "<tr><td><b>" + esc(f.no) + "</b></td><td>" + esc(f.date) + "</td><td>" + T(f.route) + "</td><td>" + T(f.dep) + "</td><td>" + T(f.arr) + "</td></tr>";
      });
      h += "</tbody></table></div>" + (o.flightNote ? "<p><small>" + T(o.flightNote) + "</small></p>" : "") + "</section>";
    }
    if (o.meeting) {
      h += '<h2 class="section-title">출국 시 집결</h2><section class="card">' +
        kv([["장소", T(o.meeting.place)], ["시간", T(o.meeting.time)]]) + paras(o.meeting.notes) + "</section>";
    }
    h += '<div id="notice-list">' + renderNoticeList() + "</div>";
    h += '<p class="footer-note">자료 기준일 ' + esc(m.updated) + " · 오프라인에서도 열람 가능</p>";
    return h;
  }

  /* ---------- 화면: 일정 ---------- */
  function dayCard(d, compact) {
    var today = todayISO();
    var h = '<section class="card' + (d.date === today ? " day-today" : "") + '" id="day-' + d.day + '">';
    h += '<div class="day-head"><span class="day-badge">' + d.day + "일차</span><h3>" + dateLabel(d.date) + " " + esc(d.title) + "</h3></div>";
    if (d.route) h += '<p class="muted"><small>' + T(d.route) + "</small></p>";
    if (!compact && data.schedule.map) h += '<button type="button" class="map-link" data-mapgo="' + d.day + '">지도에서 경로 보기 ↑</button>';
    h += '<ul class="timeline">';
    d.items.forEach(function (it) {
      h += "<li>" + (it.time ? '<span class="t">' + T(it.time) + (it.tz === "Asia/Seoul" && raw(it.time) ? '<small class="tz-kr">한국시각</small>' : "") + "</span>" : "") + "<b>" + T(it.title) + "</b>";
      if (it.desc) h += "<div><small>" + T(it.desc) + "</small></div>";
      if (it.note) h += "<div><small>" + T(it.note) + "</small></div>";
      if (it.placeId) h += '<div><a href="#places/' + esc(it.placeId) + '"><small>기관 정보 보기 →</small></a></div>';
      h += "</li>";
    });
    h += "</ul>";
    if (d.timesTbd) h += '<p><small>세부 시간표 ' + badge(d.timesTbd) + "</small></p>";
    var hotel = byId(data.hotels.items, d.hotelId);
    h += kv([["숙박", hotel ? '<a href="#hotels/' + esc(hotel.id) + '">' + esc(hotel.name) + "</a>" : T(d.stay || "—")], ["식사", T(d.meals)]]);
    return h + "</section>";
  }
  function renderSchedule() {
    var o = data.schedule, h = "";
    h += '<div class="notice">' + T(data.meta.disclaimer) + "</div>";
    if (mapDay === null) mapDay = "all";  // 처음엔 독일 전체 경로를 한 번에
    if (o.map) h += renderMapCard();
    o.days.forEach(function (d) { h += dayCard(d); });
    return h;
  }

  /* ---------- 화면: 숙소 ---------- */
  function renderHotels() {
    var h = "";
    data.hotels.items.concat(data.hotels.venues || []).forEach(function (x) {
      h += '<section class="card" id="hotels-' + esc(x.id) + '">';
      h += '<div class="eyebrow">' + esc(x.label || "") + "</div><h2>" + esc(x.name) + "</h2>";
      h += figure(x.image);
      h += kv([
        ["주소", T(x.address)],
        ["전화", x.tel ? telLink(x.tel, x.telDisplay) : ""],
        ["체크인", T(x.checkin)],
        ["체크아웃", T(x.checkout)],
        ["조식", T(x.breakfast)],
        ["교통", T(x.transit)]
      ]);
      if (x.notes && x.notes.length) h += '<div class="notice">' + x.notes.map(T).join("<br>") + "</div>";
      h += placeActions(x);
      if (raw(x.address)) h += '<div class="actions">' + showBtn("hotel:" + x.id, "기사님께 보여주기 (큰 글씨)") + "</div>";
      if (x.amenities && x.amenities.length) h += "<details><summary>편의시설</summary>" + list(x.amenities) + "</details>";
      if (x.desc) h += "<details><summary>소개</summary>" + paras(x.desc) + "</details>";
      h += sources(x.sources) + "</section>";
    });
    return h;
  }

  /* ---------- 화면: 방문기관 / 도시 ---------- */
  var placesSeg = "orgs";
  function renderPlaces() {
    var h = '<div class="segment" role="group" aria-label="보기 전환">' +
      '<button type="button" data-seg="orgs" aria-pressed="' + (placesSeg === "orgs") + '">방문기관</button>' +
      '<button type="button" data-seg="cities" aria-pressed="' + (placesSeg === "cities") + '">도시 소개</button>' +
      '<button type="button" data-seg="country" aria-pressed="' + (placesSeg === "country") + '">독일 개요</button></div>';
    if (placesSeg === "orgs") {
      data.places.orgs.forEach(function (p) {
        h += '<section class="card" id="places-' + esc(p.id) + '">';
        h += '<div class="eyebrow">' + esc(p.label || "") + "</div><h2>" + esc(p.name) + "</h2>";
        if (p.nameLocal) h += '<p class="muted"><small>' + esc(p.nameLocal) + "</small></p>";
        h += figure(p.image) + paras(p.summary);
        h += kv([["주소", T(p.address)], ["전화", p.tel ? telLink(p.tel, p.telDisplay) : ""], ["운영", T(p.hours)],
          ["웹", p.web ? '<a href="' + esc(p.web) + '" target="_blank" rel="noopener">' + esc(p.web.replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a>" : ""]]);
        if (p.notes && p.notes.length) h += '<div class="notice">' + p.notes.map(T).join("<br>") + "</div>";
        h += placeActions(p) + sources(p.sources) + "</section>";
      });
    } else if (placesSeg === "cities") {
      data.places.cities.forEach(function (c) {
        h += '<section class="card" id="cities-' + esc(c.id) + '"><div class="eyebrow">' + esc(c.label || "") + "</div><h2>" + esc(c.name) + "</h2>";
        h += figure(c.image) + paras(c.intro);
        if (c.weather) h += kv([["11월 기온", T(c.weather.temp)], ["일출·일몰", T(c.weather.sun)]]);
        if (c.sights && c.sights.length) {
          h += "<h3>명소</h3><ul>" + c.sights.map(function (s) { return "<li><b>" + esc(s.name) + "</b> — " + T(s.desc) + "</li>"; }).join("") + "</ul>";
        }
        if (c.foods && c.foods.length) {
          h += "<h3>대표 먹거리</h3><ul>" + c.foods.map(function (s) { return "<li><b>" + esc(s.name) + "</b> — " + T(s.desc) + "</li>"; }).join("") + "</ul>";
        }
        h += sources(c.sources) + "</section>";
      });
    } else {
      var k = data.places.country;
      h += '<section class="card"><h2>독일 연방공화국</h2>' + figure(k.image) + '<div class="table-wrap"><table><tbody>' +
        k.facts.map(function (f) { return "<tr><th>" + esc(f.label) + "</th><td>" + T(f.value) + "</td></tr>"; }).join("") +
        "</tbody></table></div>" + paras(k.notes) + sources(k.sources) + "</section>";
    }
    return h;
  }

  /* ---------- 화면: 생활정보 ---------- */
  function readChecks() {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeChecks(obj) {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(obj)); } catch (e) { /* 저장 불가 환경: 화면 상태만 유지 */ }
  }
  function renderChecklist() {
    var st = readChecks(), total = 0, done = 0, body = "";
    data.info.checklist.forEach(function (g) {
      body += "<h3>" + esc(g.group) + '</h3><ul class="checklist">';
      g.items.forEach(function (it) {
        total++; if (st[it.id]) done++;
        body += '<li><label><input type="checkbox" data-check="' + esc(it.id) + '"' + (st[it.id] ? " checked" : "") + "><span>" + T(it.text) + "</span></label></li>";
      });
      body += "</ul>";
    });
    var pct = total ? Math.round(done / total * 100) : 0;
    return '<section class="card" id="info-checklist"><h2>준비물 체크리스트</h2>' +
      '<div class="progress"><i id="chk-bar" style="width:' + pct + '%"></i></div><p><small id="chk-count">' + done + " / " + total + " 완료 (이 기기에만 저장됨)</small></p>" +
      body + '<div class="actions"><button type="button" class="btn" id="chk-reset">체크 초기화</button></div></section>';
  }
  var infoSeg = null;
  function renderInfo() {
    var secs = data.info.sections;
    if (!infoSeg) infoSeg = secs[0].id;
    var h = '<div class="segment" role="group" aria-label="생활정보 분류">';
    secs.forEach(function (s) { h += '<button type="button" data-iseg="' + esc(s.id) + '" aria-pressed="' + (infoSeg === s.id) + '">' + esc(s.short || s.title) + "</button>"; });
    h += '<button type="button" data-iseg="checklist" aria-pressed="' + (infoSeg === "checklist") + '">준비물</button>';
    h += '<button type="button" data-iseg="phrases" aria-pressed="' + (infoSeg === "phrases") + '">독일어</button></div>';

    if (infoSeg === "checklist") return h + renderChecklist();
    if (infoSeg === "phrases") {
      var phraseBtn = function (p, i) {
        return '<button type="button" class="phrase" data-show="phrase:' + i + '"><span class="ph-ko">' + esc(p.ko) + "</span>" +
          '<span class="ph-de" lang="de">' + esc(p.de) + '</span><span class="ph-pron">' + esc(p.pron) + "</span>" + ICON.show + "</button>";
      };
      var ess = "", rest = "";
      data.info.phrases.forEach(function (p, i) { if (p.essential) ess += phraseBtn(p, i); else rest += phraseBtn(p, i); });
      h += '<section class="card"><h2>필수 문장 — 보여주기</h2><p><small class="muted">누르면 전체 화면 큰 글씨로 표시됩니다. 상대방에게 화면을 보여 주세요.</small></p>' + ess + "</section>";
      return h + '<section class="card"><h2>기본 표현</h2>' + rest + "</section>";
    }
    var s = byId(secs, infoSeg) || secs[0];
    h += '<section class="card" id="info-' + esc(s.id) + '"><h2>' + esc(s.title) + "</h2>" + paras(s.lead);
    if (s.table) {
      h += '<div class="table-wrap"><table><thead><tr>' + s.table.head.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        s.table.rows.map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + T(x) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    }
    (s.items || []).forEach(function (it) {
      h += "<details" + (it.open ? " open" : "") + "><summary>" + esc(it.title) + "</summary>" + paras(it.body) + "</details>";
    });
    return h + sources(s.sources) + "</section>";
  }

  /* ---------- 화면: 비상 ---------- */
  function renderSos() {
    var s = data.sos, h = "";
    h += '<section class="card sos-hero"><h1>긴급 상황 시</h1><p>번호를 누르면 바로 전화가 연결됩니다.</p><div class="sos-grid">';
    s.numbers.slice(0, 2).forEach(function (n) {
      h += '<a class="sos-call" href="' + esc(telHref(n.tel)) + '"><b>' + esc(n.tel) + "</b><span>" + esc(n.label) + "</span></a>";
    });
    h += "</div></section>";

    h += '<h2 class="section-title">인솔·현지 연락처</h2><section class="card">';
    s.staff.forEach(function (p) {
      h += '<div class="tel-row"><div><div class="label">' + esc(p.role) + " " + (isTbd(p.name) ? (p.name.value ? esc(p.name.value) : "") : esc(p.name)) + '</div><div class="desc">' + T(p.desc || "") + "</div></div>" + telLink(p.tel, p.telDisplay, "btn btn-sos tel-link") + "</div>";
    });
    h += "</section>";

    h += '<h2 class="section-title">현지 긴급번호</h2><section class="card">';
    s.numbers.forEach(function (n) {
      h += '<div class="tel-row"><div><div class="label">' + esc(n.label) + '</div><div class="desc">' + T(n.desc || "") + "</div></div>" + telLink(n.tel, n.telDisplay || n.tel, "btn tel-link") + "</div>";
    });
    h += "</section>";

    h += '<h2 class="section-title">대한민국 공관</h2>';
    s.missions.forEach(function (m) {
      h += '<section class="card"><h3>' + esc(m.name) + "</h3>" +
        kv([["관할", T(m.jurisdiction)], ["주소", T(m.address)], ["대표", m.tel ? telLink(m.tel, m.telDisplay) : ""], ["긴급", m.emergencyTel ? telLink(m.emergencyTel, m.emergencyDisplay) : ""], ["업무", T(m.hours)]]);
      if (m.highlight) h += '<div class="notice">' + T(m.highlight) + "</div>";
      h += placeActions({ name: m.name, address: m.address, mapQuery: m.mapQuery }) + "</section>";
    });

    (s.tips || []).forEach(function (t) {
      h += '<section class="card"><h3>' + esc(t.title) + "</h3>" + paras(t.body) + "</section>";
    });
    h += sources(s.sources);
    return h;
  }

  /* ---------- 라우팅 ---------- */
  var RENDER = { home: renderHome, schedule: renderSchedule, hotels: renderHotels, places: renderPlaces, info: renderInfo, sos: renderSos };

  function route() {
    if (!data) return;
    var hash = (location.hash || "#home").slice(1).split("/");
    var tab = RENDER[hash[0]] ? hash[0] : "home";
    var sub = hash[1];
    if (tab === "places" && sub) placesSeg = "orgs";
    view.innerHTML = RENDER[tab]();
    document.getElementById("topbar-title").textContent = tab === "home" ? (data.meta.shortTitle || "독일 연수 가이드북") : TABS[tab];
    document.title = TABS[tab] + " · " + (data.meta.shortTitle || "독일 연수 가이드북");
    Array.prototype.forEach.call(document.querySelectorAll(".tabbar a"), function (a) {
      if (a.getAttribute("data-tab") === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (tab === "home") startClock();
    if (tab === "schedule" && data.schedule.map) loadMapBase().then(drawMap).catch(function () {
      var w = document.getElementById("map-wrap"); if (w) w.innerHTML = "<p class=\"loading\">지도를 불러오지 못했습니다</p>";
    });
    var target = sub && document.getElementById(tab + "-" + sub);
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }

  /* ---------- 이벤트 ---------- */
  function showToast(el, ms) {
    el.hidden = false;
    if (ms) setTimeout(function () { el.hidden = true; }, ms);
  }
  function copyText(text) {
    var done = function () { showToast(document.getElementById("copy-toast"), 1800); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else { legacyCopy(text); done(); }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* 무시 */ }
    document.body.removeChild(ta);
  }

  view.addEventListener("click", function (e) {
    var t = e.target.closest("[data-copy],[data-seg],[data-iseg],[data-notice-ok],[data-show],[data-mapday],[data-mapgo],[data-intro],#chk-reset");
    if (!t) return;
    if (t.hasAttribute("data-intro")) playIntro();
    else if (t.hasAttribute("data-mapday")) {
      var md = t.getAttribute("data-mapday");
      setMapDay(md === "all" ? "all" : Number(md));
    }
    else if (t.hasAttribute("data-mapgo")) {
      setMapDay(Number(t.getAttribute("data-mapgo")));
      document.getElementById("schedule-map").scrollIntoView({ block: "start", behavior: "smooth" });
    }
    else if (t.hasAttribute("data-show")) openShowCard(t.getAttribute("data-show"));
    else if (t.hasAttribute("data-notice-ok")) {
      var seen = readSeen();
      seen.push(t.getAttribute("data-notice-ok"));
      writeSeen(seen.slice(-200));
      refreshNoticeArea();
    }
    else if (t.hasAttribute("data-copy")) copyText(t.getAttribute("data-copy"));
    else if (t.hasAttribute("data-seg")) { placesSeg = t.getAttribute("data-seg"); view.innerHTML = renderPlaces(); }
    else if (t.hasAttribute("data-iseg")) { infoSeg = t.getAttribute("data-iseg"); view.innerHTML = renderInfo(); }
    else if (t.id === "chk-reset") {
      if (confirm("체크 표시를 모두 지울까요?")) { writeChecks({}); view.innerHTML = renderInfo(); }
    }
  });
  view.addEventListener("change", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-check");
    if (!id) return;
    var st = readChecks();
    if (e.target.checked) st[id] = 1; else delete st[id];
    writeChecks(st);
    var boxes = view.querySelectorAll("[data-check]"), done = 0;
    Array.prototype.forEach.call(boxes, function (b) { if (b.checked) done++; });
    document.getElementById("chk-bar").style.width = Math.round(done / boxes.length * 100) + "%";
    document.getElementById("chk-count").textContent = done + " / " + boxes.length + " 완료 (이 기기에만 저장됨)";
  });
  window.addEventListener("hashchange", route);

  /* ---------- 온라인 상태 ---------- */
  var netBadge = document.getElementById("net-badge");
  function updateNet() { netBadge.hidden = navigator.onLine; }
  window.addEventListener("online", function () { updateNet(); loadNotices(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && navigator.onLine) loadNotices(); });
  window.addEventListener("offline", updateNet);
  updateNet();

  /* ---------- 서비스 워커 / 새 버전 안내 ---------- */
  var toast = document.getElementById("update-toast");
  var waitingWorker = null;
  document.getElementById("update-btn").addEventListener("click", function () {
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
    else location.reload();
  });
  if ("serviceWorker" in navigator) {
    var refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshing) return; refreshing = true; location.reload();
    });
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "DATA_UPDATED") showToast(toast);
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        function track(w) {
          w.addEventListener("statechange", function () {
            if (w.state === "installed" && navigator.serviceWorker.controller) { waitingWorker = w; showToast(toast); }
          });
        }
        if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; showToast(toast); }
        reg.addEventListener("updatefound", function () { track(reg.installing); });
        // 앱을 다시 열 때마다 새 버전 확인
        document.addEventListener("visibilitychange", function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function () { /* 로컬 file:// 등에서는 등록 불가 */ });
    });
  }

  /* ---------- 시작 ---------- */
  fetch(DATA_URL).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (json) {
    data = json;
    route();
    loadNotices();
    maybeIntro();
  }).catch(function () {
    document.documentElement.classList.remove("intro-pending");
    view.innerHTML = '<section class="card"><h2>자료를 불러오지 못했습니다</h2><p>인터넷에 한 번 연결한 뒤 다시 열어 주세요. 최초 1회 접속 후에는 오프라인에서도 열람할 수 있습니다.</p></section>';
  });
})();
