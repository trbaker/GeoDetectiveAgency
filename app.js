/* ============================================================
   GEO DETECTIVE AGENCY — game logic (vanilla JS, no build step)
   Screens: home | case (intro→sort→quiz→ask→report) | notebook | practice
   Progress persists in localStorage (falls back to memory if blocked).
   ============================================================ */

/* ---------------- SAVE / STORAGE ---------------- */

const BUILD = 3; // bump when redeploying so the footer shows which version is live
const SAVE_KEY = "geodetective:save";

const DEFAULT_SAVE = {
  qstatus: {},   // questionId -> 'first' | 'recovered' | 'missed'
  sortFirst: 0,  // sort items classified correctly on the first try (max 15)
  askFirst: 0,   // "pick the strongest question" first tries (max 5)
  pins: {},      // caseId -> 'first' | 'recovered' | 'missed' (map pin challenge)
  stamps: {},    // caseId -> true (case closed)
  badges: {},    // badgeId -> true
};

let memoryFallback = null; // used if localStorage is unavailable (e.g. blocked)

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch (e) {
    if (memoryFallback) return memoryFallback;
  }
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

function persistSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    memoryFallback = save; // keep playing; progress lasts for this visit
  }
}

/* ---------------- HELPERS ---------------- */

function qId(caseId, i) { return caseId + "-q" + i; }

function lensOfQ(id) {
  const [caseId, qi] = id.split("-q");
  const c = CASES.find((x) => x.id === caseId);
  return c ? c.questions[Number(qi)].lens : null;
}

function questionById(id) {
  const [caseId, qi] = id.split("-q");
  const c = CASES.find((x) => x.id === caseId);
  return c ? { ...c.questions[Number(qi)], place: c.place, emoji: c.emoji } : null;
}

function solvedCount(save, lens) {
  return Object.entries(save.qstatus)
    .filter(([id, st]) => lensOfQ(id) === lens && (st === "first" || st === "recovered")).length;
}

function firstTryCount(save, lens) {
  return Object.entries(save.qstatus)
    .filter(([id, st]) => lensOfQ(id) === lens && st === "first").length;
}

function recoveredCount(save) {
  return Object.values(save.qstatus).filter((st) => st === "recovered").length;
}

function missedIds(save) {
  return Object.entries(save.qstatus).filter(([, st]) => st === "missed").map(([id]) => id);
}

function pinCount(save) {
  return Object.values(save.pins || {}).filter((v) => v === "first" || v === "recovered").length;
}

/* ---------------- MAPS (ArcGIS REST tile services, zero dependencies) ----------------
   Basemap tiles come straight from Esri's public ArcGIS REST services
   (server.arcgisonline.com) and are drawn by a tiny built-in tile viewer.
   No SDK, no loader, no API key — just standard Web Mercator tiles at
   {service}/tile/{z}/{y}/{x}, so the maps work anywhere the site loads.
   Esri attribution is displayed on every map. */

const TILE_SIZE = 256;
const BASEMAPS = {
  imagery: {
    url: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile",
    attr: "Powered by Esri | Esri, Maxar, Earthstar Geographics, GIS User Community",
  },
  topo: {
    url: "https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile",
    attr: "Powered by Esri | Esri, HERE, Garmin, FAO, NOAA, USGS",
  },
};

/* Web Mercator math (standard XYZ tile scheme) */
function lonToWorldX(lon, z) { return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, z); }
function latToWorldY(lat, z) {
  const r = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  const merc = Math.log(Math.tan(Math.PI / 4 + r / 2));
  return ((1 - merc / Math.PI) / 2) * TILE_SIZE * Math.pow(2, z);
}
function worldXToLon(x, z) { return (x / (TILE_SIZE * Math.pow(2, z))) * 360 - 180; }
function worldYToLat(y, z) {
  const n = Math.PI * (1 - (2 * y) / (TILE_SIZE * Math.pow(2, z)));
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

let activeViews = [];
function destroyActiveViews() {
  activeViews.forEach((v) => { try { v.destroy(); } catch (e) {} });
  activeViews = [];
}

class MiniMap {
  constructor(el, opts) {
    this.el = el;
    this.center = { lat: opts.lat, lon: opts.lon };
    this.zoom = opts.zoom;
    this.minZoom = opts.minZoom != null ? opts.minZoom : 1;
    this.maxZoom = opts.maxZoom != null ? opts.maxZoom : 12;
    this.basemap = opts.basemap || "imagery";
    this.onClick = null;
    this.markers = [];
    this.tilePool = {};
    this.tilesLoaded = 0;
    this.tilesTried = 0;
    this.tilesErrored = 0;

    el.classList.add("mini-map");
    if (opts.crosshair) el.classList.add("crosshair");
    el.innerHTML = `
      <div class="mm-tiles"></div>
      <div class="mm-markers"></div>
      <div class="mm-zoom">
        <button type="button" class="mm-in" aria-label="Zoom in">+</button>
        <button type="button" class="mm-out" aria-label="Zoom out">−</button>
      </div>
      <div class="mm-attr"></div>
      <div class="mm-offline" hidden>🗺️ Map tiles couldn't load on this network — no worries, detectives adapt! The case continues without them.</div>`;
    this.tilesEl = el.querySelector(".mm-tiles");
    this.markersEl = el.querySelector(".mm-markers");
    this.attrEl = el.querySelector(".mm-attr");
    this.offlineEl = el.querySelector(".mm-offline");
    this.attrEl.textContent = BASEMAPS[this.basemap].attr;

    el.querySelector(".mm-in").addEventListener("click", () => this.setZoom(this.zoom + 1));
    el.querySelector(".mm-out").addEventListener("click", () => this.setZoom(this.zoom - 1));

    /* drag to pan; a short press without movement counts as a click */
    this._down = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".mm-zoom") || e.target.closest(".mm-offline") || e.target.closest(".mm-attr")) return;
      this._down = { x: e.clientX, y: e.clientY, moved: false, t: Date.now() };
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    el.addEventListener("pointermove", (e) => {
      if (!this._down) return;
      const dx = e.clientX - this._down.x, dy = e.clientY - this._down.y;
      if (!this._down.moved && Math.abs(dx) + Math.abs(dy) <= 4) return;
      this._down.moved = true;
      this._down.x = e.clientX; this._down.y = e.clientY;
      const z = this.zoom;
      const cx = lonToWorldX(this.center.lon, z) - dx;
      const cy = latToWorldY(this.center.lat, z) - dy;
      this.center = { lat: worldYToLat(cy, z), lon: worldXToLon(cx, z) };
      this.render();
    });
    el.addEventListener("pointerup", (e) => {
      if (!this._down) return;
      const wasClick = !this._down.moved && Date.now() - this._down.t < 700;
      this._down = null;
      if (wasClick && this.onClick) {
        const rect = el.getBoundingClientRect();
        const p = this.screenToLatLon(e.clientX - rect.left, e.clientY - rect.top);
        this.onClick(p.lat, p.lon);
      }
    });
    el.addEventListener("pointercancel", () => { this._down = null; });

    this._wheelLock = 0;
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - this._wheelLock < 250) return;
      this._wheelLock = now;
      this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1));
    }, { passive: false });
    el.addEventListener("dblclick", () => this.setZoom(this.zoom + 1));

    this._onResize = () => this.render();
    window.addEventListener("resize", this._onResize);

    /* if not a single tile arrives, say so (but keep trying quietly) */
    this._offlineTimer = setTimeout(() => {
      if (this.tilesTried > 0 && this.tilesLoaded === 0) {
        const any = Object.values(this.tilePool)[0];
        this.showOffline(any ? any.src : BASEMAPS[this.basemap].url + "/1/0/0");
      }
    }, 8000);

    this.render();
  }

  showOffline(sampleUrl) {
    if (!this.offlineEl || !this.offlineEl.hidden) return;
    console.error("Geo Detective: map tiles failed to load from", sampleUrl);
    this.offlineEl.innerHTML = `🗺️ Map tiles couldn't load on this network — no worries, detectives adapt! The case continues without them.<br><br><a href="${sampleUrl}" target="_blank" rel="noopener" style="color:#9FD3F0">Tap here to test the map service directly</a> — if a photo of Earth appears, tell your teacher to check the game's network settings.`;
    this.offlineEl.hidden = false;
  }

  destroy() {
    clearTimeout(this._offlineTimer);
    window.removeEventListener("resize", this._onResize);
    this.el.classList.remove("mini-map", "crosshair");
    this.el.innerHTML = "";
  }

  size() { return { w: this.el.clientWidth || 640, h: this.el.clientHeight || 320 }; }

  setZoom(z) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, z));
    this.render();
  }

  setView(lat, lon, zoom) {
    this.center = { lat, lon };
    if (zoom != null) this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.render();
  }

  setBasemap(key) {
    this.basemap = key;
    this.attrEl.textContent = BASEMAPS[key].attr;
    Object.values(this.tilePool).forEach((img) => img.remove());
    this.tilePool = {};
    this.render();
  }

  screenToLatLon(px, py) {
    const { w, h } = this.size(), z = this.zoom;
    const x = lonToWorldX(this.center.lon, z) + (px - w / 2);
    const y = latToWorldY(this.center.lat, z) + (py - h / 2);
    return { lat: worldYToLat(y, z), lon: worldXToLon(x, z) };
  }

  addMarker(lat, lon, cls, text) {
    const m = document.createElement("div");
    m.className = "mm-marker " + cls;
    if (text) m.textContent = text;
    this.markersEl.appendChild(m);
    this.markers.push({ lat, lon, el: m });
    this.positionMarkers();
  }

  positionMarkers() {
    const { w, h } = this.size(), z = this.zoom;
    const cx = lonToWorldX(this.center.lon, z), cy = latToWorldY(this.center.lat, z);
    const world = TILE_SIZE * Math.pow(2, z);
    this.markers.forEach((m) => {
      let x = lonToWorldX(m.lon, z) - cx;
      if (x > world / 2) x -= world;   // show the marker on the nearest copy
      if (x < -world / 2) x += world;  // of the wrapped world
      const y = latToWorldY(m.lat, z) - cy;
      m.el.style.transform = `translate(${Math.round(w / 2 + x)}px, ${Math.round(h / 2 + y)}px)`;
    });
  }

  render() {
    const { w, h } = this.size(), z = this.zoom;
    const n = Math.pow(2, z);
    const left = lonToWorldX(this.center.lon, z) - w / 2;
    const top = latToWorldY(this.center.lat, z) - h / 2;
    const x0 = Math.floor(left / TILE_SIZE) - 1, x1 = Math.floor((left + w) / TILE_SIZE) + 1;
    const y0 = Math.max(0, Math.floor(top / TILE_SIZE) - 1);
    const y1 = Math.min(n - 1, Math.floor((top + h) / TILE_SIZE) + 1);
    const keep = {};
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const wrapX = ((tx % n) + n) % n; // wrap tiles across the date line
        const key = `${this.basemap}:${z}:${wrapX}:${ty}:${tx}`;
        keep[key] = true;
        let img = this.tilePool[key];
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          img.decoding = "async";
          img.draggable = false;
          this.tilesTried++;
          img.addEventListener("load", () => { this.tilesLoaded++; if (this.offlineEl) this.offlineEl.hidden = true; });
          img.addEventListener("error", () => {
            this.tilesErrored++;
            if (this.tilesLoaded === 0 && this.tilesErrored >= 6) this.showOffline(img.src);
          });
          img.src = `${BASEMAPS[this.basemap].url}/${z}/${ty}/${wrapX}`;
          this.tilePool[key] = img;
          this.tilesEl.appendChild(img);
        }
        img.style.transform = `translate(${Math.round(tx * TILE_SIZE - left)}px, ${Math.round(ty * TILE_SIZE - top)}px)`;
      }
    }
    Object.keys(this.tilePool).forEach((key) => {
      if (!keep[key]) { this.tilePool[key].remove(); delete this.tilePool[key]; }
    });
    this.positionMarkers();
  }
}

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function compassDir(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(to.lat));
  const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) - Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return dirs[Math.round(brng / 45) % 8];
}

function fmtMiles(km) {
  const mi = km * 0.621371;
  return Math.max(50, Math.round(mi / 50) * 50).toLocaleString() + " miles";
}

function normLon(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function initExploreMap(c) {
  const el = document.getElementById("exploreMap");
  if (!el) return;
  const mm = new MiniMap(el, {
    lat: c.map.lat, lon: c.map.lon, zoom: c.map.zoom,
    minZoom: 2, maxZoom: 12, basemap: "imagery",
  });
  mm.addMarker(c.map.lat, c.map.lon, "mk-place", "📍");
  activeViews.push(mm);
  const toggle = document.getElementById("mapToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const toTopo = mm.basemap === "imagery";
      mm.setBasemap(toTopo ? "topo" : "imagery");
      toggle.textContent = toTopo ? "🛰️ Switch to satellite" : "🗺️ Switch to map view";
    });
  }
}

function initPinMap(c) {
  const el = document.getElementById("pinMap");
  if (!el) return;
  const startZoom = (el.clientWidth || 600) >= 700 ? 2 : 1;
  const mm = new MiniMap(el, {
    lat: 20, lon: 10, zoom: startZoom,
    minZoom: 1, maxZoom: 8, basemap: "imagery", crosshair: true,
  });
  mm.onClick = (lat, lon) => {
    if (ui.pin.resolved) return;
    handlePinGuess(mm, c, { lat, lon: normLon(lon) });
  };
  activeViews.push(mm);
}

function recordPin(caseId, status) {
  const rank = { first: 3, recovered: 2, missed: 1 };
  const old = save.pins[caseId];
  if (!old || rank[status] > rank[old]) save.pins[caseId] = status;
  commit();
}

function handlePinGuess(mm, c, guess) {
  const p = ui.pin;
  const target = { lat: c.map.lat, lon: c.map.lon };
  p.tries++;
  const d = haversineKm(guess, target);
  const inZone = d <= c.map.radius;
  mm.addMarker(guess.lat, guess.lon, inZone ? "mk-hit" : "mk-miss");
  const fb = document.getElementById("pinFeedback");
  if (!fb) return;

  if (inZone) {
    p.resolved = p.tries === 1 ? "first" : "recovered";
    mm.addMarker(target.lat, target.lon, "mk-target", "⭐");
    mm.setView(target.lat, target.lon, Math.max(mm.zoom, 4));
    recordPin(c.id, p.resolved);
    fb.innerHTML = `
      <div class="result-box win">
        <div class="result-title">${p.tries === 1 ? "🎯 Bullseye on the first try!" : "💪 Pinned it! Hints + second looks = detective skill."}</div>
        Your pin landed about ${fmtMiles(d)} from the gold star — inside the target zone. That's how a geographer reads coastlines and continent shapes!
      </div>
      <button class="btn-big" data-action="pin-next">On to the questions ➜</button>`;
  } else if (p.tries >= 3) {
    p.resolved = "missed";
    mm.addMarker(target.lat, target.lon, "mk-target", "⭐");
    mm.setView(target.lat, target.lon, 3);
    recordPin(c.id, "missed");
    fb.innerHTML = `
      <div class="result-box lose">
        <div class="result-title">📌 The gold star shows the real spot.</div>
        Your closest pin was about ${fmtMiles(p.best == null ? d : Math.min(p.best, d))} away. Take a good look at where it really is — every pin teaches your brain the map, and you can replay this case to try again!
      </div>
      <button class="btn-big" data-action="pin-next">On to the questions ➜</button>`;
  } else {
    const warm = p.lastDist != null ? (d < p.lastDist ? "🔥 Warmer! " : "🧊 Colder! ") : "";
    fb.innerHTML = `
      <div class="hint-box">
        ${warm}Your pin is about <b>${fmtMiles(d)}</b> from ${esc(c.place.split("·")[0].trim())}. Head <b>${compassDir(guess, target)}</b> and try again. (Try ${p.tries} of 3)
      </div>`;
  }
  p.best = p.best == null ? d : Math.min(p.best, d);
  p.lastDist = d;
}

const LENS_TOTALS = (() => {
  const t = { where: 0, why: 0, matters: 0 };
  CASES.forEach((c) => c.questions.forEach((q) => t[q.lens]++));
  return t;
})();

const SORT_TOTAL = CASES.reduce((n, c) => n + c.sort.length, 0);
const ASK_TOTAL = CASES.length;

function checkBadges(save) {
  const newly = [];
  // run twice so "master" can unlock in the same pass as its last requirement
  for (let pass = 0; pass < 2; pass++) {
    BADGES.forEach((b) => {
      if (!save.badges[b.id] && b.check(save)) {
        save.badges[b.id] = true;
        newly.push(b);
      }
    });
  }
  return newly;
}

/* ---------------- STATE ---------------- */

let save = loadSave();

const ui = {
  screen: "home",          // home | case | notebook | practice
  caseId: null,
  phase: "intro",          // intro | pin | sort | quiz | ask | report
  qi: 0,
  pin: { tries: 0, best: null, lastDist: null, resolved: null, skipped: false },
  local: null,             // per-case results: { qstatusLocal:{}, sortFirst:0, askFirst:false }
  sort: { idx: 0, wrong: [], resolved: null, firstCount: 0 },
  quiz: { picked: [], done: null },       // shared by case quiz + practice
  ask: { picked: [], resolved: null },
  practiceIds: [],
};

function currentCase() { return CASES.find((c) => c.id === ui.caseId); }

function resetQuiz() { ui.quiz = { picked: [], done: null }; }

/* ---------------- COMMIT (save + badges + toasts) ---------------- */

function commit() {
  const newly = checkBadges(save);
  persistSave(save);
  newly.forEach(showToast);
}

function finishCase() {
  const c = currentCase();
  const local = ui.local;
  const rank = { first: 3, recovered: 2, missed: 1 };
  // Never downgrade a question a student already solved in a past playthrough.
  c.questions.forEach((q, i) => {
    const id = qId(c.id, i);
    const newSt = local.qstatusLocal[i];
    const oldSt = save.qstatus[id];
    if (!oldSt || rank[newSt] > rank[oldSt]) save.qstatus[id] = newSt;
  });
  save.sortFirst = Math.min(SORT_TOTAL, save.sortFirst + local.sortFirst);
  if (local.askFirst) save.askFirst = Math.min(ASK_TOTAL, save.askFirst + 1);
  save.stamps[c.id] = true;
  commit();
}

/* ---------------- RENDER HELPERS ---------------- */

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function chip(lens) {
  const L = LENSES[lens];
  return `<span class="chip ${lens}">${L.emoji} ${L.short}</span>`;
}

function meter(value, max, color) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `<div class="meter"><span style="width:${pct}%;background:${color}"></span></div>`;
}

function lensColor(lens) {
  return getComputedStyle(document.documentElement).getPropertyValue("--" + lens).trim() || "#2B6CB0";
}

function answerBtn(text, state, action, arg) {
  const cls = state ? " " + state : "";
  const mark = state === "correct" ? " ✔" : state === "wrong" ? " ✘" : state === "reveal" ? " ★" : "";
  return `<button class="answer${cls}" data-action="${action}" data-arg="${arg}">${esc(text)}${mark}</button>`;
}

/* ---------------- SCREENS ---------------- */

function renderHome() {
  const missed = missedIds(save).length;
  const badgeCount = Object.keys(save.badges).length;

  const cards = CASES.map((c) => {
    const closed = !!save.stamps[c.id];
    return `
      <button class="case-card${closed ? " closed" : ""}" data-action="open-case" data-arg="${c.id}">
        ${closed ? '<span class="stamp-mini">★ CLOSED ★</span>' : ""}
        <div class="emoji">${c.emoji}</div>
        <div class="title">${esc(c.title)}</div>
        <div class="place">${esc(c.place)}</div>
        <div class="cta">${closed ? "Play again ↺" : "Investigate ➜"}</div>
      </button>`;
  }).join("");

  return `
    <div class="card hero">
      <div class="hero-row">
        <svg width="54" height="54" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="#FFF" stroke="#1F3347" stroke-width="4"/>
          <polygon points="50,12 58,50 50,88 42,50" fill="#D64545"/>
          <polygon points="12,50 50,42 88,50 50,58" fill="#2B6CB0"/>
          <circle cx="50" cy="50" r="7" fill="#F0B429" stroke="#1F3347" stroke-width="2"/>
        </svg>
        <div style="flex:1;min-width:220px">
          <div class="hero-title">Geo Detective Agency</div>
          <div class="hero-sub">Every place hides three clues:
            <span class="w">Where is it?</span>
            <span class="y">Why is it there?</span>
            <span class="m">Why does it matter to me?</span>
          </div>
        </div>
      </div>
      <div class="pill-row">
        <button class="btn-pill gold" data-action="go-notebook">🛂 Passport &amp; Skills (${badgeCount}/${BADGES.length} badges)</button>
        <button class="btn-pill ${missed > 0 ? "cold-hot" : "cold-empty"}" data-action="go-practice">
          🗄️ Cold Case Files ${missed > 0 ? `(${missed} to crack!)` : "(empty)"}
        </button>
      </div>
    </div>

    <div class="section-title">Open a case file:</div>
    <div class="case-grid">${cards}</div>

    <p class="footnote">Wrong answers are never the end — they become Cold Cases you can still crack. Detectives improve with every clue. 🕵️<br><span style="opacity:0.6">map build ${BUILD} · tiles by Esri</span></p>`;
}

function renderIntro(c) {
  return `
    <button class="btn-back" data-action="go-home">← Back to HQ</button>
    <div class="card center">
      <div class="big-emoji">${c.emoji}</div>
      <div class="case-title">${esc(c.title)}</div>
      <div class="case-place">${esc(c.place)}</div>
      <p class="intro-text">${esc(c.intro)}</p>
      <div class="map-note">🔭 <b>Scope out the scene:</b> ${esc(c.map.lookFor)}</div>
      <div id="exploreMap" class="map-box" aria-label="Interactive map of ${esc(c.place)}"></div>
      <button class="btn-pill gold map-toggle" id="mapToggle" type="button">🗺️ Switch to map view</button>
      <div class="chip-row">${chip("where")}${chip("why")}${chip("matters")}</div>
      <button class="btn-big" data-action="start-pin">Take the case 🕵️</button>
    </div>`;
}

function renderPin(c) {
  return `
    <button class="btn-back" data-action="go-home">← Leave case (finish all 4 steps to save it)</button>
    <div class="card">
      <div class="step-label">STEP 1 · PIN THE PLACE</div>
      <div class="q-text">Where in the world is ${esc(c.place.split("·")[0].trim())}? Tap the map to drop your pin!</div>
      <p class="muted">No labels on this map, detective — read the shapes of the continents, coastlines, and colors like a real geographer. You get 3 tries, with a distance-and-direction hint after each one.</p>
      <div id="pinMap" class="map-box tall" aria-label="World map — click where you think the place is"></div>
      <div id="pinFeedback"></div>
      <button class="btn-back pin-skip" data-action="pin-skip">Map not loading or want to move on? Skip this step ➜</button>
    </div>`;
}

function renderSort(c) {
  const s = ui.sort;
  const item = c.sort[s.idx];

  const buttons = Object.values(LENSES).map((L) => {
    let st = null;
    if (s.resolved && L.key === item.answer) st = "correct";
    else if (s.wrong.includes(L.key)) st = s.resolved ? "dim" : "wrong";
    else if (s.resolved) st = "dim";
    return answerBtn(L.emoji + "  " + L.label, st, "sort-pick", L.key);
  }).join("");

  const hint = !s.resolved && s.wrong.length > 0
    ? `<div class="hint-box">🕵️ Hint: Does it ask about a <b>spot on the map</b> (WHERE), a <b>reason</b> (WHY THERE), or a <b>connection to your life</b> (MATTERS)? Try again!</div>`
    : "";

  const done = s.resolved
    ? `<div style="margin-top:10px">
         <div style="font-size:15px;margin-bottom:12px">
           ${s.resolved === "first" ? "🎯 Sorted on the first try!" : "💪 Got it with a second look — nice recovery!"}
           This is a <b>${LENSES[item.answer].label}</b> question.
         </div>
         <button class="btn-big" data-action="sort-next">${s.idx + 1 >= c.sort.length ? "Start the investigation ➜" : "Next question ➜"}</button>
       </div>`
    : "";

  return `
    <button class="btn-back" data-action="go-home">← Leave case (finish all 4 steps to save it)</button>
    <div class="card">
      <div class="step-label">STEP 2 · SORT THE QUESTIONS (${s.idx + 1} of ${c.sort.length})</div>
      <p class="muted">Detectives know their question types. Which kind of geographic question is this?</p>
      <div class="q-text">“${esc(item.q)}”</div>
      ${buttons}
      ${hint}
      ${done}
    </div>`;
}

function renderQuizQuestion(question, headerHtml, nextAction, backAction, extraTopHtml) {
  const qz = ui.quiz;
  const L = LENSES[question.lens];

  const buttons = question.options.map((opt, i) => {
    let st = null;
    if (qz.done && i === question.correct) st = qz.done === "missed" ? "reveal" : "correct";
    else if (qz.picked.includes(i)) st = qz.done ? "dim" : "wrong";
    else if (qz.done) st = "dim";
    return answerBtn(opt, st, "quiz-pick", i);
  }).join("");

  const hint = !qz.done && qz.picked.length === 1
    ? `<div class="hint-box"><strong style="font-family:var(--font-display)">🕵️ Detective hint:</strong> ${esc(question.hint)} <em>Try again — you've got this!</em></div>`
    : "";

  let resolution = "";
  if (qz.done) {
    const title =
      qz.done === "first" ? "🎯 First try — outstanding detective work!" :
      qz.done === "recovered" ? "💪 You used the hint and cracked it. That's real learning!" :
      "📂 Tough one! It goes in your Cold Case Files so you can crack it later.";
    resolution = `
      <div class="result-box ${qz.done === "missed" ? "lose" : "win"}">
        <div class="result-title">${title}</div>
        <div><strong>Why:</strong> ${esc(question.explain)}</div>
      </div>
      <button class="btn-big ${question.lens === "why" ? "why" : question.lens === "matters" ? "matters" : ""}" data-action="${nextAction}">Next ➜</button>`;
  }

  return `
    <button class="btn-back" data-action="${backAction}">← ${backAction === "go-home" ? "Back to HQ" : "Leave case (finish all 4 steps to save it)"}</button>
    ${extraTopHtml || ""}
    <div class="card">
      <div class="q-head">
        ${chip(question.lens)}
        <span class="q-count">${headerHtml}</span>
      </div>
      <div class="q-text">${esc(question.q)}</div>
      ${buttons}
      ${hint}
      ${qz.done ? resolution : ""}
    </div>`;
}

function renderAsk(c) {
  const a = ui.ask;
  const goodIndex = c.ask.options.findIndex((o) => o.good);

  const buttons = c.ask.options.map((o, i) => {
    let st = null;
    if (a.resolved && i === goodIndex) st = "correct";
    else if (a.picked.includes(i)) st = a.resolved ? "dim" : "wrong";
    else if (a.resolved) st = "dim";
    return answerBtn(o.text, st, "ask-pick", i);
  }).join("");

  const hint = !a.resolved && a.picked.length > 0
    ? `<div class="hint-box">🕵️ Hint: A strong geographic question connects <b>people and places</b> — and you could investigate it with maps and evidence. Try again!</div>`
    : "";

  const done = a.resolved
    ? `<div style="margin-top:10px">
        <div class="result-box win">
          <div class="result-title">${a.resolved === "first" ? "🎯 You picked the strongest question on your first try!" : "💪 Found it! Second looks make sharp detectives."}</div>
          ${esc(c.ask.why)}
        </div>
        <button class="btn-big" data-action="ask-next">See your Detective Report ➜</button>
      </div>`
    : "";

  return `
    <button class="btn-back" data-action="go-home">← Leave case (finish all 4 steps to save it)</button>
    <div class="card">
      <div class="step-label">STEP 4 · YOU ASK THE QUESTIONS</div>
      <div class="q-text">${esc(c.ask.prompt)}</div>
      ${buttons}
      ${hint}
      ${done}
    </div>`;
}

function renderReport(c) {
  const local = ui.local;
  const byLens = { where: [], why: [], matters: [] };
  c.questions.forEach((q, i) => byLens[q.lens].push(local.qstatusLocal[i]));
  const lensScore = (arr) => arr.filter((s) => s === "first" || s === "recovered").length;
  const missed = Object.values(local.qstatusLocal).filter((s) => s === "missed").length;
  const weakest = Object.entries(byLens).sort((x, y) => lensScore(x[1]) - lensScore(y[1]))[0][0];

  const meters = Object.values(LENSES).map((L) => `
    <div class="meter-row">
      <div class="meter-label">
        <span>${L.emoji} ${L.label}</span>
        <span>${lensScore(byLens[L.key])} / ${byLens[L.key].length} solved</span>
      </div>
      ${meter(lensScore(byLens[L.key]), byLens[L.key].length, lensColor(L.key))}
    </div>`).join("");

  const tip = missed === 0
    ? "A flawless investigation — try the next case, and keep asking why places are the way they are!"
    : `Your trickiest clue type was "${LENSES[weakest].label}" — ${missed} question${missed > 1 ? "s" : ""} went to your Cold Case Files. Visit them from HQ to crack them and level up!`;

  const pinLine =
    ui.pin.resolved === "first" ? "🗺️ Map pin: 🎯 bullseye on the first try!" :
    ui.pin.resolved === "recovered" ? "🗺️ Map pin: found it using the hints — that's map sense growing!" :
    ui.pin.resolved === "missed" ? "🗺️ Map pin: the star showed you the spot. Replay the case to pin it yourself!" :
    "🗺️ Map pin: skipped this time — try it on your next case!";

  return `
    <div class="card">
      <div class="center" style="margin-bottom:8px">
        <div style="font-size:48px">${c.emoji}</div>
        <div class="case-title" style="font-size:26px">Case Closed!</div>
        <div class="case-place" style="margin-bottom:6px">${esc(c.place)}</div>
        <div class="stamp-big">★ CASE CLOSED ★</div>
      </div>
      <div style="margin:18px 0">${meters}</div>
      <div class="tip-box">${pinLine}</div>
      <div class="tip-box"><b>🕵️ Detective's tip for next time:</b> ${tip}</div>
      <button class="btn-big" data-action="go-home">Back to HQ ➜</button>
    </div>`;
}

function renderNotebook() {
  const lensMeters = Object.values(LENSES).map((L) => {
    const solved = solvedCount(save, L.key);
    const first = firstTryCount(save, L.key);
    return `
      <div class="meter-row">
        <div class="meter-label">
          <span>${L.emoji} ${L.label}</span>
          <span>${solved} / ${LENS_TOTALS[L.key]} solved · ${first} first-try</span>
        </div>
        ${meter(solved, LENS_TOTALS[L.key], lensColor(L.key))}
      </div>`;
  }).join("");

  const badgeCards = BADGES.map((b) => {
    const earned = !!save.badges[b.id];
    const [p, max] = b.progress(save);
    return `
      <div class="badge${earned ? " earned" : ""}">
        <div class="b-emoji">${b.emoji}</div>
        <div class="b-name">${esc(b.name)}</div>
        <div class="b-concept">${esc(b.concept)}</div>
        <div class="b-desc">${esc(b.desc)}</div>
        ${earned
          ? `<div class="b-earned">EARNED ✔</div>`
          : `${meter(Math.min(p, max), max, "#F0B429")}<div class="meter-note">${Math.min(p, max)} / ${max}</div>`}
      </div>`;
  }).join("");

  const stamps = CASES.map((c) => {
    const got = !!save.stamps[c.id];
    return `
      <div class="stamp-card${got ? " got" : ""}">
        <div class="s-emoji">${c.emoji}</div>
        ${esc(c.place.split("·")[0].trim())}
        <div class="s-status">${got ? "★ CLOSED ★" : "OPEN CASE"}</div>
      </div>`;
  }).join("");

  return `
    <button class="btn-back" data-action="go-home">← Back to HQ</button>
    <div class="card">
      <div class="case-title" style="font-size:22px;margin-bottom:12px">📓 Skill Meters</div>
      ${lensMeters}
      <div class="meter-label" style="margin-top:4px"><span>🧭 Question sorting (first-try)</span><span>${save.sortFirst} / ${SORT_TOTAL}</span></div>
      <div style="margin:4px 0 10px">${meter(save.sortFirst, SORT_TOTAL, "#F0B429")}</div>
      <div class="meter-label"><span>🗺️ Places pinned on the map</span><span>${pinCount(save)} / ${CASES.length}</span></div>
      <div style="margin:4px 0 10px">${meter(pinCount(save), CASES.length, "#F0B429")}</div>
      <div class="meter-label"><span>💪 Comebacks (fixed mistakes)</span><span>${recoveredCount(save)}</span></div>
    </div>
    <div class="card">
      <div class="case-title" style="font-size:22px;margin-bottom:4px">🛂 Detective Passport</div>
      <p class="muted" style="font-size:14.5px">Badges show the concepts you've attained. Stamps show cases you've closed.</p>
      <div class="badge-grid">${badgeCards}</div>
      <div class="b-name" style="margin-bottom:8px">Case stamps</div>
      <div class="stamp-row">${stamps}</div>
    </div>`;
}

function renderPractice() {
  if (ui.practiceIds.length === 0) {
    return `
      <div class="card center">
        <div style="font-size:48px">🗄️</div>
        <div class="case-title" style="font-size:24px;margin-bottom:6px">Cold Case Files: empty!</div>
        <p class="muted" style="font-size:16px">No unsolved questions right now. Take on a new case to keep investigating.</p>
        <button class="btn-big" data-action="go-home">Back to HQ ➜</button>
      </div>`;
  }
  const id = ui.practiceIds[0];
  const q = questionById(id);
  const top = `
    <div class="case-title" style="font-size:20px;margin-bottom:4px">🗄️ Cold Case Files</div>
    <p class="muted">These are questions that got away. Crack them now to boost your mastery — solving cold cases counts toward your Comeback Detective badge! (${ui.practiceIds.length} left) · from ${q.emoji} ${esc(q.place)}</p>`;
  return renderQuizQuestion(q, "COLD CASE", "practice-next", "go-home", top);
}

/* ---------------- MAIN RENDER ---------------- */

const app = document.getElementById("app");

function render() {
  destroyActiveViews(); // tear down any live map before replacing the DOM
  let html = "";
  if (ui.screen === "home") html = renderHome();
  else if (ui.screen === "notebook") html = renderNotebook();
  else if (ui.screen === "practice") html = renderPractice();
  else if (ui.screen === "case") {
    const c = currentCase();
    if (ui.phase === "intro") html = renderIntro(c);
    else if (ui.phase === "pin") html = renderPin(c);
    else if (ui.phase === "sort") html = renderSort(c);
    else if (ui.phase === "quiz") {
      html = renderQuizQuestion(
        c.questions[ui.qi],
        `STEP 3 · CLUE ${ui.qi + 1} of ${c.questions.length}`,
        "quiz-next",
        "go-home"
      );
    }
    else if (ui.phase === "ask") html = renderAsk(c);
    else if (ui.phase === "report") html = renderReport(c);
  }
  app.innerHTML = html;
  if (document.getElementById("exploreMap")) initExploreMap(currentCase());
  if (document.getElementById("pinMap")) initPinMap(currentCase());
  window.scrollTo({ top: 0 });
}

/* ---------------- ACTIONS ---------------- */

const actions = {
  "go-home": () => {
    ui.screen = "home";
    ui.caseId = null;
  },

  "go-notebook": () => { ui.screen = "notebook"; },

  "go-practice": () => {
    ui.screen = "practice";
    ui.practiceIds = missedIds(save);
    resetQuiz();
  },

  "open-case": (id) => {
    ui.screen = "case";
    ui.caseId = id;
    ui.phase = "intro";
    ui.qi = 0;
    ui.local = { qstatusLocal: {}, sortFirst: 0, askFirst: false };
    ui.pin = { tries: 0, best: null, lastDist: null, resolved: null, skipped: false };
    ui.sort = { idx: 0, wrong: [], resolved: null, firstCount: 0 };
    ui.ask = { picked: [], resolved: null };
    resetQuiz();
  },

  "start-pin": () => { ui.phase = "pin"; },

  "pin-next": () => { ui.phase = "sort"; },

  "pin-skip": () => {
    ui.pin.skipped = true;
    ui.phase = "sort";
  },

  "sort-pick": (lensKey) => {
    const s = ui.sort;
    if (s.resolved) return;
    const item = currentCase().sort[s.idx];
    if (lensKey === item.answer) {
      s.resolved = s.wrong.length === 0 ? "first" : "late";
      if (s.resolved === "first") s.firstCount++;
    } else if (!s.wrong.includes(lensKey)) {
      s.wrong.push(lensKey);
    }
  },

  "sort-next": () => {
    const c = currentCase();
    const s = ui.sort;
    if (s.idx + 1 >= c.sort.length) {
      ui.local.sortFirst = s.firstCount;
      ui.phase = "quiz";
      resetQuiz();
    } else {
      s.idx++;
      s.wrong = [];
      s.resolved = null;
    }
  },

  "quiz-pick": (iStr) => {
    const i = Number(iStr);
    const qz = ui.quiz;
    if (qz.done) return;
    const q = ui.screen === "practice" ? questionById(ui.practiceIds[0]) : currentCase().questions[ui.qi];
    if (i === q.correct) {
      qz.done = qz.picked.length === 0 ? "first" : "recovered";
    } else if (!qz.picked.includes(i)) {
      qz.picked.push(i);
      if (qz.picked.length >= 2) qz.done = "missed";
    }
  },

  "quiz-next": () => {
    const c = currentCase();
    ui.local.qstatusLocal[ui.qi] = ui.quiz.done;
    if (ui.qi + 1 >= c.questions.length) {
      ui.phase = "ask";
    } else {
      ui.qi++;
    }
    resetQuiz();
  },

  "ask-pick": (iStr) => {
    const i = Number(iStr);
    const a = ui.ask;
    if (a.resolved) return;
    const goodIndex = currentCase().ask.options.findIndex((o) => o.good);
    if (i === goodIndex) a.resolved = a.picked.length === 0 ? "first" : "late";
    else if (!a.picked.includes(i)) a.picked.push(i);
  },

  "ask-next": () => {
    ui.local.askFirst = ui.ask.resolved === "first";
    finishCase();
    ui.phase = "report";
  },

  "practice-next": () => {
    const id = ui.practiceIds[0];
    const result = ui.quiz.done;
    const finalStatus = result === "missed" ? "missed" : "recovered";
    save.qstatus[id] = finalStatus;
    commit();
    if (finalStatus === "missed") {
      // move it to the back of the deck to try again later
      ui.practiceIds.push(ui.practiceIds.shift());
    } else {
      ui.practiceIds.shift();
    }
    resetQuiz();
    if (ui.practiceIds.length === 0) ui.screen = "practice"; // shows "empty" state
  },
};

app.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const fn = actions[btn.dataset.action];
  if (!fn) return;
  fn(btn.dataset.arg);
  render();
});

/* ---------------- TOASTS ---------------- */

const toastQueue = [];
let toastShowing = false;

function showToast(badge) {
  toastQueue.push(badge);
  if (!toastShowing) nextToast();
}

function nextToast() {
  const badge = toastQueue.shift();
  if (!badge) { toastShowing = false; return; }
  toastShowing = true;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span class="t-emoji">${badge.emoji}</span>
    <span><b>Badge earned: ${esc(badge.name)}!</b><br><span class="t-concept">${esc(badge.concept)}</span></span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); nextToast(); }, 4200);
}

/* ---------------- GO ---------------- */

render();
