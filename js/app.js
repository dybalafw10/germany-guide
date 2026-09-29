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
      return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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

  /* ---------- 화면: 홈 ---------- */
  function renderHome() {
    var m = data.meta, today = todayISO(), h = "";
    var day = null;
    data.schedule.days.forEach(function (d) { if (d.date === today) day = d; });

    h += '<section class="card hero"><div class="eyebrow">' + esc(m.org || "") + "</div><h1>" + esc(m.title) + "</h1>";
    h += '<p class="muted">' + esc(m.subtitle || "") + "</p>";
    if (day) {
      h += '<div class="dday">' + day.day + "일차</div><div>" + dateLabel(day.date) + " · " + esc(day.city || "") + "</div>";
    } else if (today < m.start) {
      h += '<div class="dday">D-' + dayDiff(today, m.start) + "</div><div>출발 " + dateLabel(m.start) + "</div>";
    } else {
      h += '<div class="dday">연수 종료</div><div>수고 많으셨습니다.</div>';
    }
    h += "</section>";

    if (day) {
      h += '<h2 class="section-title">오늘 일정</h2>' + dayCard(day, true);
      var hotel = byId(data.hotels.items, day.hotelId);
      if (hotel) {
        h += '<h2 class="section-title">오늘 숙소</h2><section class="card"><h3>' + esc(hotel.name) + "</h3>" +
          kv([["주소", T(hotel.address)], ["전화", telLink(hotel.tel, hotel.telDisplay)], ["체크인", T(hotel.checkin)]]) +
          placeActions(hotel) + '<div class="actions"><a class="btn" href="#hotels/' + esc(hotel.id) + '">숙소 상세</a></div></section>';
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
    h += '<p class="footer-note">자료 기준일 ' + esc(m.updated) + " · 오프라인에서도 열람 가능</p>";
    return h;
  }

  /* ---------- 화면: 일정 ---------- */
  function dayCard(d, compact) {
    var today = todayISO();
    var h = '<section class="card' + (d.date === today ? " day-today" : "") + '" id="day-' + d.day + '">';
    h += '<div class="day-head"><span class="day-badge">' + d.day + "일차</span><h3>" + dateLabel(d.date) + " " + esc(d.title) + "</h3></div>";
    if (d.route) h += '<p class="muted"><small>' + T(d.route) + "</small></p>";
    h += '<ul class="timeline">';
    d.items.forEach(function (it) {
      h += "<li>" + (it.time ? '<span class="t">' + T(it.time) + "</span>" : "") + "<b>" + T(it.title) + "</b>";
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
    if (o.routeImage) h += '<section class="card"><h2>이동 경로</h2>' + figure(o.routeImage) + paras(o.routeNote) + "</section>";
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
      h += '<section class="card"><h2>독일어 기본 표현</h2><div class="table-wrap"><table><thead><tr><th>한국어</th><th>독일어 (발음)</th></tr></thead><tbody>';
      data.info.phrases.forEach(function (p) { h += "<tr><td>" + esc(p.ko) + "</td><td><b>" + esc(p.de) + "</b><br><small>" + esc(p.pron) + "</small></td></tr>"; });
      return h + "</tbody></table></div></section>";
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
    var t = e.target.closest("[data-copy],[data-seg],[data-iseg],#chk-reset");
    if (!t) return;
    if (t.hasAttribute("data-copy")) copyText(t.getAttribute("data-copy"));
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
  window.addEventListener("online", updateNet);
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
  }).catch(function () {
    view.innerHTML = '<section class="card"><h2>자료를 불러오지 못했습니다</h2><p>인터넷에 한 번 연결한 뒤 다시 열어 주세요. 최초 1회 접속 후에는 오프라인에서도 열람할 수 있습니다.</p></section>';
  });
})();
