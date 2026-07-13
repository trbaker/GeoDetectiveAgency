/* ============================================================
   GEO DETECTIVE AGENCY — game logic (vanilla JS, no build step)
   Screens: home | case (intro→sort→quiz→ask→report) | notebook | practice
   Progress persists in localStorage (falls back to memory if blocked).
   ============================================================ */

/* ---------------- SAVE / STORAGE ---------------- */

const SAVE_KEY = "geodetective:save";

const DEFAULT_SAVE = {
  qstatus: {},   // questionId -> 'first' | 'recovered' | 'missed'
  sortFirst: 0,  // sort items classified correctly on the first try (max 15)
  askFirst: 0,   // "pick the strongest question" first tries (max 5)
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
  phase: "intro",          // intro | sort | quiz | ask | report
  qi: 0,
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

    <p class="footnote">Wrong answers are never the end — they become Cold Cases you can still crack. Detectives improve with every clue. 🕵️</p>`;
}

function renderIntro(c) {
  return `
    <button class="btn-back" data-action="go-home">← Back to HQ</button>
    <div class="card center">
      <div class="big-emoji">${c.emoji}</div>
      <div class="case-title">${esc(c.title)}</div>
      <div class="case-place">${esc(c.place)}</div>
      <p class="intro-text">${esc(c.intro)}</p>
      <div class="chip-row">${chip("where")}${chip("why")}${chip("matters")}</div>
      <button class="btn-big" data-action="start-sort">Take the case 🕵️</button>
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
    <button class="btn-back" data-action="go-home">← Leave case (finish all 3 steps to save it)</button>
    <div class="card">
      <div class="step-label">STEP 1 · SORT THE QUESTIONS (${s.idx + 1} of ${c.sort.length})</div>
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
    <button class="btn-back" data-action="${backAction}">← ${backAction === "go-home" ? "Back to HQ" : "Leave case (finish all 3 steps to save it)"}</button>
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
    <button class="btn-back" data-action="go-home">← Leave case (finish all 3 steps to save it)</button>
    <div class="card">
      <div class="step-label">STEP 3 · YOU ASK THE QUESTIONS</div>
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

  return `
    <div class="card">
      <div class="center" style="margin-bottom:8px">
        <div style="font-size:48px">${c.emoji}</div>
        <div class="case-title" style="font-size:26px">Case Closed!</div>
        <div class="case-place" style="margin-bottom:6px">${esc(c.place)}</div>
        <div class="stamp-big">★ CASE CLOSED ★</div>
      </div>
      <div style="margin:18px 0">${meters}</div>
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
  let html = "";
  if (ui.screen === "home") html = renderHome();
  else if (ui.screen === "notebook") html = renderNotebook();
  else if (ui.screen === "practice") html = renderPractice();
  else if (ui.screen === "case") {
    const c = currentCase();
    if (ui.phase === "intro") html = renderIntro(c);
    else if (ui.phase === "sort") html = renderSort(c);
    else if (ui.phase === "quiz") {
      html = renderQuizQuestion(
        c.questions[ui.qi],
        `STEP 2 · CLUE ${ui.qi + 1} of ${c.questions.length}`,
        "quiz-next",
        "go-home"
      );
    }
    else if (ui.phase === "ask") html = renderAsk(c);
    else if (ui.phase === "report") html = renderReport(c);
  }
  app.innerHTML = html;
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
    ui.sort = { idx: 0, wrong: [], resolved: null, firstCount: 0 };
    ui.ask = { picked: [], resolved: null };
    resetQuiz();
  },

  "start-sort": () => { ui.phase = "sort"; },

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
