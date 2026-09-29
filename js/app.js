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

  /* ---------- 이동경로 지도 (오프라인 SVG) ----------
   * 바탕 윤곽선: data/map-base.json (메르카토르 투영식 포함). 경로·정류지: guidebook.json schedule.map
   * 일차를 고르면 해당 구간을 순서대로 그리며 점이 따라 이동(동작 줄이기 설정 시 애니메이션 생략)
   */
  var mapBase = null, mapDay = null, mapAnim = null, mapDone = null;
  var SVGNS = "http://www.w3.org/2000/svg";

  function loadMapBase() {
    if (mapBase) return Promise.resolve(mapBase);
    return fetch("data/map-base.json").then(function (r) { return r.json(); }).then(function (j) { mapBase = j; return j; });
  }
  function proj(pt) {
    if (pt.xy) return pt.xy;
    var P = mapBase.proj, lat = pt.lat * Math.PI / 180;
    return [P.ax * pt.lng + P.bx, P.ay * Math.log(Math.tan(Math.PI / 4 + lat / 2)) + P.by];
  }
  function mapDays() {
    var set = {};
    data.schedule.map.legs.forEach(function (l) { set[l.day] = 1; });
    return data.schedule.days.map(function (d) { return d.day; });
  }
  function renderMapCard() {
    var h = '<section class="card map-card" id="schedule-map"><h2>이동 경로</h2>' +
      '<div class="segment map-seg" role="group" aria-label="일차 선택">' +
      '<button type="button" data-mapday="all" aria-pressed="' + (mapDay === "all") + '">전체</button>';
    mapDays().forEach(function (n) {
      h += '<button type="button" data-mapday="' + n + '" aria-pressed="' + (String(mapDay) === String(n)) + '">' + n + "일차</button>";
    });
    h += '</div><div class="map-wrap" id="map-wrap"><p class="loading">지도 불러오는 중…</p></div>' +
      '<div class="map-cap" id="map-cap"></div>' +
      '<p class="map-legend"><span class="lg-road"></span>차량 이동 <span class="lg-air"></span>항공 <span class="lg-pin">1</span>숙소</p>' +
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
  var FULL_VB = [60, 110, 520, 680];
  // 선택한 일차의 경로 범위로 확대 (화면 비율 유지, 너무 가까우면 최소 크기)
  function viewBoxFor(legs) {
    if (mapDay === "all" || !legs.length) return FULL_VB.slice();
    var st = data.schedule.map.stops, xs = [], ys = [];
    // 지도 밖 지점(인천)은 확대 범위에서 제외 — 항공선은 화면 밖으로 이어짐
    legs.forEach(function (l) { [l.from, l.to].forEach(function (k) { if (st[k].xy) return; var q = proj(st[k]); xs.push(q[0]); ys.push(q[1]); }); });
    if (!xs.length) return FULL_VB.slice();
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var ratio = FULL_VB[2] / FULL_VB[3], pad = 70;
    var w = Math.max(x1 - x0 + pad * 2, 200), h = Math.max(y1 - y0 + pad * 2, 200 / ratio);
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    if (w > FULL_VB[2]) return FULL_VB.slice();
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function drawMap() {
    var wrap = document.getElementById("map-wrap");
    if (!wrap || !mapBase) return;
    if (mapAnim) { cancelAnimationFrame(mapAnim); mapAnim = null; }
    if (mapDone) { clearTimeout(mapDone); mapDone = null; }
    var M = data.schedule.map, st = M.stops;
    var legs = mapDay === "all" ? M.legs : M.legs.filter(function (l) { return String(l.day) === String(mapDay); });
    var vb = viewBoxFor(legs), k = vb[2] / FULL_VB[2]; // k: 확대 배율에 따른 글자·선 크기 보정
    var svg = el("svg", { viewBox: vb.map(function (v) { return v.toFixed(1); }).join(" "), role: "img", "aria-label": "독일 이동경로 지도", class: "route-map" });
    var g0 = el("g", { class: "m-base" }, svg);
    mapBase.nb.forEach(function (d) { el("path", { d: d, class: "m-nb" }, g0); });
    el("path", { d: mapBase.de, class: "m-de" }, g0);
    (M.refs || []).forEach(function (r) {
      var q = proj(r);
      el("circle", { cx: q[0], cy: q[1], r: 3 * k, class: "m-ref" }, g0);
      el("text", { x: q[0] + 7 * k, y: q[1] + 6 * k, class: "m-reflbl", "font-size": 17 * k }, g0).textContent = r.name;
    });
    // 전체 경로(연하게)
    var gAll = el("g", { class: "m-all" }, svg);
    M.legs.forEach(function (l) {
      el("path", { d: legPath(l), class: "m-leg " + l.mode, "stroke-width": 3 * k, "stroke-dasharray": l.mode === "air" ? 2 * k + " " + 9 * k : "none" }, gAll);
    });
    // 선택 일차
    var gSel = el("g", { class: "m-sel" }, svg);
    var paths = legs.map(function (l) {
      return el("path", { d: legPath(l), class: "m-leg on " + l.mode, "stroke-width": (l.mode === "air" ? 4 : 6) * k }, gSel);
    });
    // 숙소 핀
    var gPin = el("g", {}, svg);
    Object.keys(st).forEach(function (key) {
      var s0 = st[key]; if (!s0.pin) return;
      var q = proj(s0);
      el("circle", { cx: q[0], cy: q[1], r: 13 * k, class: "m-pin", "stroke-width": 3 * k }, gPin);
      el("text", { x: q[0], y: q[1] + 5 * k, class: "m-pinnum", "text-anchor": "middle", "font-size": 16 * k }, gPin).textContent = s0.pin;
    });
    // 선택 일차 정류지 이름 (가까워서 겹치는 이름은 생략)
    var order = [];
    legs.forEach(function (l) { [l.from, l.to].forEach(function (key) { if (order.indexOf(key) < 0) order.push(key); }); });
    if (mapDay === "all") order = order.filter(function (key) { return st[key].pin || key === "giessen" || key === "wuerzburg"; });
    var gLbl = el("g", { class: "m-lbls" }, svg), placed = [];
    order.forEach(function (key) {
      var s0 = st[key]; if (s0.xy) return;
      var q = proj(s0);
      if (!s0.pin) el("circle", { cx: q[0], cy: q[1], r: 5 * k, class: "m-stop", "stroke-width": 3 * k }, gLbl);
      // 이름표 자리: 오른쪽 → 왼쪽 → 위 → 아래 중 지도 안에 들어가고 다른 이름과 안 겹치는 첫 자리
      var fs = 21 * k, tw = 0;
      for (var ci = 0; ci < s0.name.length; ci++) tw += (s0.name.charCodeAt(ci) < 128 ? 0.6 : 1.0) * fs;
      var prefLeft = q[0] > vb[0] + vb[2] * 0.62;
      var cands = [
        { x: q[0] + 18 * k, y: q[1] + 7 * k, anchor: "start", r: [q[0] + 18 * k, q[1] - 14 * k, tw, fs * 1.2] },
        { x: q[0] - 18 * k, y: q[1] + 7 * k, anchor: "end", r: [q[0] - 18 * k - tw, q[1] - 14 * k, tw, fs * 1.2] },
        { x: q[0], y: q[1] - 20 * k, anchor: "middle", r: [q[0] - tw / 2, q[1] - 20 * k - fs, tw, fs * 1.2] },
        { x: q[0], y: q[1] + 34 * k, anchor: "middle", r: [q[0] - tw / 2, q[1] + 34 * k - fs, tw, fs * 1.2] },
        { x: q[0] + 12 * k, y: q[1] - 16 * k, anchor: "start", r: [q[0] + 12 * k, q[1] - 16 * k - fs, tw, fs * 1.2] },
        { x: q[0] + 12 * k, y: q[1] + 30 * k, anchor: "start", r: [q[0] + 12 * k, q[1] + 30 * k - fs, tw, fs * 1.2] },
        { x: q[0] - 12 * k, y: q[1] - 16 * k, anchor: "end", r: [q[0] - 12 * k - tw, q[1] - 16 * k - fs, tw, fs * 1.2] },
        { x: q[0] - 12 * k, y: q[1] + 30 * k, anchor: "end", r: [q[0] - 12 * k - tw, q[1] + 30 * k - fs, tw, fs * 1.2] }
      ];
      if (prefLeft) cands.splice(0, 2, cands[1], cands[0]);
      var fits = function (r) {
        if (r[0] < vb[0] + 4 * k || r[1] < vb[1] + 4 * k || r[0] + r[2] > vb[0] + vb[2] - 4 * k || r[1] + r[3] > vb[1] + vb[3] - 4 * k) return false;
        return !placed.some(function (o) { return r[0] < o[0] + o[2] && o[0] < r[0] + r[2] && r[1] < o[1] + o[3] && o[1] < r[1] + r[3]; });
      };
      var pick = null;
      for (var cj = 0; cj < cands.length && !pick; cj++) if (fits(cands[cj].r)) pick = cands[cj];
      if (!pick) return;
      placed.push(pick.r);
      el("text", { x: pick.x, y: pick.y, class: "m-lbl", "text-anchor": pick.anchor,
        "font-size": fs, "stroke-width": 5 * k }, gLbl).textContent = s0.name;
    });
    var dot = el("circle", { r: 7 * k, class: "m-dot", "stroke-width": 3 * k }, svg);
    wrap.innerHTML = "";
    wrap.appendChild(svg);

    // 설명
    var cap = document.getElementById("map-cap");
    if (mapDay === "all") {
      cap.innerHTML = "<b>전체 일정</b> · 브레멘 → 카셀 → 뉘른베르크 → 뮌헨";
    } else {
      var d = data.schedule.days.filter(function (x) { return String(x.day) === String(mapDay); })[0];
      var stopNames = order.filter(function (key) { return !st[key].xy; }).map(function (key) { return st[key].name; });
      cap.innerHTML = "<b>" + d.day + "일차 " + dateLabel(d.date) + "</b> · " + esc(raw(d.title)) +
        (d.route ? "<br><small>" + T(d.route) + "</small>" : stopNames.length ? "<br><small>" + esc(stopNames.join(" → ")) + "</small>" : "") +
        (legs.length ? "" : "<br><small>지도 이동 없음</small>");
    }

    // 애니메이션: 구간을 순서대로 그리고 점이 따라감. 끝나면 항공 구간은 점선으로
    var lens = paths.map(function (pth) { return pth.getTotalLength(); });
    var total = lens.reduce(function (x, y) { return x + y; }, 0);
    paths.forEach(function (pth, i) { pth.style.strokeDasharray = lens[i] + " " + lens[i]; });
    function frame(progress) {
      var done = progress * total, acc = 0;
      paths.forEach(function (pth, i) {
        var part = Math.max(0, Math.min(lens[i], done - acc));
        pth.style.strokeDashoffset = lens[i] - part;
        if (done >= acc && done <= acc + lens[i] + 0.01) {
          var pt = pth.getPointAtLength(part);
          dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
        }
        acc += lens[i];
      });
    }
    function finish() {
      frame(1);
      paths.forEach(function (pth, i) {
        if (legs[i].mode === "air") { pth.style.strokeDasharray = 2 * k + " " + 9 * k; pth.style.strokeDashoffset = 0; }
      });
    }
    if (!paths.length) { dot.style.display = "none"; return; }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { finish(); return; }
    var dur = Math.min(4500, 900 + (total / k) * 4), t0 = null;
    function step(ts) {
      if (!document.getElementById("map-wrap")) { mapAnim = null; return; }
      if (t0 === null) t0 = ts;
      var q = Math.min(1, (ts - t0) / dur);
      frame(q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2); // 부드럽게 가속·감속
      if (q < 1) mapAnim = requestAnimationFrame(step); else { mapAnim = null; if (mapDone) { clearTimeout(mapDone); mapDone = null; } finish(); }
    }
    frame(0);
    mapAnim = requestAnimationFrame(step);
    // 화면이 가려져 애니메이션이 멈춰도 끝 상태는 보장
    mapDone = setTimeout(function () {
      if (mapAnim) { cancelAnimationFrame(mapAnim); mapAnim = null; }
      finish();
    }, dur + 300);
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
  function renderClock() {
    var clocks = data.meta.clocks || [];
    var h = '<section class="card clock-card"><div class="clocks">';
    clocks.forEach(function (c, i) {
      h += '<div class="clock"><div class="clock-label">' + esc(c.label) + ' <small>' + esc(c.sub || "") + "</small></div>" +
        '<div class="clock-time" id="clk-t' + i + '">--:--</div><div class="clock-date" id="clk-d' + i + '"></div></div>';
    });
    h += '</div><p class="clock-diff" id="clk-diff"></p>';
    h += '<div class="next-ev" id="next-ev"></div></section>';
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
      ne.innerHTML = '<div class="ne-label">다음 일정 · ' + next.day + "일차 " + dateLabel(next.date) + " " + next.time + " (" + tzName + ")" +
        (next.tbd ? ' <span class="chk">확인필요</span>' : "") + "</div>" +
        '<div class="ne-title">' + esc(next.title) + "</div>" +
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

  function renderNotices() {
    var list = activeNotices();
    if (!list.length) return "";
    var seen = readSeen(), h = "";
    list.filter(function (n) { return seen.indexOf(n.id) < 0; }).forEach(function (n) {
      h += '<section class="notice-banner' + (n.level === "urgent" ? " urgent" : "") + '" role="alert">' +
        '<div class="nb-head"><span class="nb-tag">' + (n.level === "urgent" ? "긴급 공지" : "새 공지") + "</span>" +
        '<small>' + esc(n.date || "") + "</small></div>" +
        "<h3>" + esc(n.title) + "</h3>" + paras(n.body) +
        '<button type="button" class="btn nb-ok" data-notice-ok="' + esc(n.id) + '">확인</button></section>';
    });
    var src = notice.source === "network" ? "최신 공지 · " + hhmm(notice.checkedAt) + " 확인"
      : "오프라인 — 저장된 공지 표시 중";
    h += '<details class="card notice-all"><summary>공지사항 ' + list.length + "건</summary>" +
      list.map(function (n) {
        return '<div class="notice-item"><div><b>' + esc(n.title) + "</b> <small>" + esc(n.date || "") + "</small></div>" + paras(n.body) + "</div>";
      }).join("") + '<p><small class="muted">' + src + "</small></p></details>";
    return h;
  }
  function refreshNoticeArea() {
    var el = document.getElementById("notice-area");
    if (el) el.innerHTML = renderNotices();
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
    if (mapDay === null) {  // 연수 중이면 오늘 일차, 아니면 전체
      var td = o.days.filter(function (d) { return d.date === todayISO(); })[0];
      mapDay = td ? td.day : "all";
    }
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
    var t = e.target.closest("[data-copy],[data-seg],[data-iseg],[data-notice-ok],[data-show],[data-mapday],[data-mapgo],#chk-reset");
    if (!t) return;
    if (t.hasAttribute("data-mapday")) {
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
  }).catch(function () {
    view.innerHTML = '<section class="card"><h2>자료를 불러오지 못했습니다</h2><p>인터넷에 한 번 연결한 뒤 다시 열어 주세요. 최초 1회 접속 후에는 오프라인에서도 열람할 수 있습니다.</p></section>';
  });
})();
