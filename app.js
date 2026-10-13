/* ===================================================================
   Forma na telefonu — vmesnik. Podatki in Claude so v local.js.
   =================================================================== */

import { api as localApi } from "./local.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf0 = new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 });
const n0 = (v) => nf0.format(Math.round(v || 0));
const n1 = (v) => nf1.format(v || 0);

function localISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
}
function mondayOf(iso) {
  const d = new Date(iso + "T12:00:00");
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return localISO(d);
}
const today = () => localISO();
const isToday = () => S.date === today();
function dayLabel(iso) {
  if (iso === today()) return "Danes";
  if (iso === addDays(today(), -1)) return "Včeraj";
  return new Intl.DateTimeFormat("sl-SI", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso + "T12:00:00"));
}
const shortDate = (iso) =>
  new Intl.DateTimeFormat("sl-SI", { day: "numeric", month: "short" }).format(new Date(iso + "T12:00:00"));
const WEEKDAYS = ["N", "P", "T", "S", "Č", "P", "S"];

const ICON = {
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>`,
  chevL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  chevR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`,
};

const MEAL_TYPES = ["Zajtrk", "Kosilo", "Večerja", "Prigrizek"];
const PORTIONS = [[0.5, "½"], [0.75, "¾"], [1, "1×"], [1.25, "1¼"], [1.5, "1½"], [2, "2×"]];
const ACTIVITIES = ["Hoja", "Hitra hoja", "Tek", "Kolo", "Plavanje", "Fitnes (moč)", "Pohod", "Nogomet", "Košarka", "Ples", "Joga", "Drugo"];
const ACTIVITY_LEVELS = [
  ["sedeče", "Sedeče – pisarna, malo gibanja"],
  ["lahko", "Lahko – 1 do 3 treningi na teden"],
  ["zmerno", "Zmerno – 3 do 5 treningov na teden"],
  ["zelo", "Zelo aktivno – 6 do 7 treningov"],
  ["ekstremno", "Fizično delo in treningi"],
];
const COMMON_EXERCISES = [
  "Počep", "Mrtvi dvig", "Romunski mrtvi dvig", "Potisk s klopi", "Potisk s klopi pod kotom", "Vojaški potisk",
  "Potisk z ročkami nad glavo", "Veslanje z drogom", "Veslanje na škripcu", "Poteg na lat napravi", "Zgibi",
  "Potisk z nogami", "Iztegi nog", "Upogibi nog", "Izpadni korak", "Bolgarski počep", "Hip thrust", "Dvig na prste",
  "Biceps upogib", "Kladivo upogib", "Triceps na škripcu", "Francoski potisk", "Dipi", "Sklece", "Odročenje z ročkami",
  "Prsni metulj", "Face pull", "Plank", "Trebušnjaki",
];

/* ---------------------------- stanje ---------------------------- */

const S = {
  tab: "hrana",
  date: today(),
  status: null,
  profile: null,
  targets: null,
  pf: null,
  day: null,
  pending: [],
  openMeal: null,
  reviewBusy: false,
  history: null,
  fitSub: "trening",
  exercises: [],
  exBusy: null,
  exResult: null,
  exName: "",
  sets: [{ kg: "", reps: "" }],
  saving: false,
  progress: null,
  progEx: "",
  weights: [],
  photos: [],
  selPhotos: [],
  compare: null,
  compareBusy: false,
  settings: null,
  settingsLoading: false,
  keyBusy: false,
  backupBusy: false,
  backupFile: null,
  plan: null,
  planDirty: false,
  editTpl: null,
  cal: { month: today().slice(0, 7), days: null },
  loaded: { exercises: false, weights: false, photos: false },
};

/* ----------------------------- API ------------------------------ */

const api = (method, path, body) => localApi(method, path, body);

async function loadDay() {
  S.day = await api("GET", `/api/day?date=${S.date}`);
  S.targets = S.day.targets;
}
async function loadHistory() {
  const end = S.date;
  const r = await api("GET", `/api/history?end=${end}&days=7`);
  S.history = { end, days: r.days };
}
async function loadExercises() {
  S.loaded.exercises = true;
  S.exercises = (await api("GET", "/api/exercises")).exercises;
}
async function loadProgress() {
  if (!S.progEx && S.exercises.length) S.progEx = S.exercises[0].name;
  S.progress = await api("GET", `/api/progress?exercise=${encodeURIComponent(S.progEx || "")}`);
}
async function loadWeights() {
  S.loaded.weights = true;
  S.weights = (await api("GET", "/api/weights")).weights;
}
async function loadPhotos() {
  S.loaded.photos = true;
  S.photos = (await api("GET", "/api/bodyphotos")).photos;
}

/* --------------------------- obvestila --------------------------- */

function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), err ? 6000 : 3200);
}

function sheet({ title, body = "", actions }) {
  return new Promise((resolve) => {
    const bd = document.createElement("div");
    bd.className = "sheet-backdrop";
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>${body}
      <div class="btn-row even">${actions
        .map((a, i) => `<button class="btn ${a.cls || ""}" data-i="${i}">${esc(a.label)}</button>`)
        .join("")}</div></div>`;
    const close = (v) => { bd.remove(); resolve(v); };
    bd.addEventListener("click", (e) => {
      if (e.target === bd) return close(null);
      const b = e.target.closest("button[data-i]");
      if (b) {
        const a = actions[+b.dataset.i];
        close(a.value === "form" ? Object.fromEntries([...bd.querySelectorAll("input")].map((i) => [i.name, i.value])) : a.value);
      }
    });
    document.body.append(bd);
    const first = bd.querySelector("input") || bd.querySelector("button[data-i]:last-child");
    first?.focus();
    bd.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter" && e.target.tagName === "INPUT") bd.querySelector("button[data-i]:last-child").click();
    });
  });
}

const confirmSheet = (title, label = "Izbriši") =>
  sheet({ title, actions: [{ label: "Prekliči", value: false }, { label, value: true, cls: "btn-danger" }] });

/* --------------------------- slike, video --------------------------- */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Slike ni mogoče odpreti. Poskusi z JPG ali PNG.")); };
    img.src = url;
  });
}

async function fileToJpeg(file, maxSide = 1568, quality = 0.85) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

function waitFor(el, ev, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Videa ni bilo mogoče prebrati. Poskusi s krajšim posnetkom.")), ms);
    el.addEventListener(ev, () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

/** Iz videa izreže n enakomerno razporejenih sličic (JPEG data URL). */
async function extractFrames(file, n = 8, maxSide = 960) {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await waitFor(v, "loadedmetadata");
    if (v.readyState < 2) {
      // iOS naloži sličice šele po predvajanju
      try { await v.play(); v.pause(); } catch { /* ni nujno */ }
      if (v.readyState < 2) await waitFor(v, "loadeddata");
    }
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) throw new Error("Dolžine videa ni mogoče prebrati.");
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext("2d");
    const span = Math.min(dur, 45); // daljši posnetek: vzamemo prvih 45 s
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = (span * (i + 0.5)) / n;
      const seeked = waitFor(v, "seeked");
      v.currentTime = t;
      await seeked;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      frames.push(c.toDataURL("image/jpeg", 0.8));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* --------------------------- grafi (SVG) --------------------------- */

let gradId = 0;

function ring(value, total, center, size = 124) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, value / total) : 0;
  const over = total && value > total * 1.05;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 124 124"><circle class="track" cx="62" cy="62" r="${r}" fill="none" stroke-width="9"/>
    <circle class="val ${over ? "over" : ""}" cx="62" cy="62" r="${r}" fill="none" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>
    <div class="ring-center">${center}</div></div>`;
}

function macro(label, val, target, color) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  return `<div class="macro"><div class="macro-top"><span><span class="dot" style="background:${color}"></span>${label}</span>
    <span class="num">${n0(val)}<span class="faint">${target ? " / " + n0(target) : ""} g</span></span></div>
    <div class="bar"><i style="width:${pct}%;background:${color}"></i></div></div>`;
}

function barChart(points, { goal = 0, h = 140, fmt = n0, hiColor = "#4a4a54" } = {}) {
  const W = 320, top = 16, bottom = 22, H = h;
  const max = Math.max(goal * 1.15, ...points.map((p) => p.value), 1);
  const bw = W / points.length;
  const y = (v) => top + (H - top - bottom) * (1 - v / max);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  s += `<line class="grid" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>`;
  points.forEach((p, i) => {
    const x = i * bw + bw * 0.22, w = bw * 0.56;
    const yy = y(p.value), hh = Math.max(0, H - bottom - yy);
    const fill = goal && p.value >= goal ? "var(--accent)" : p.hi ? hiColor : "#2c2c33";
    s += `<rect x="${x}" y="${yy}" width="${w}" height="${hh}" rx="4" fill="${fill}"/>`;
    s += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" ${p.hi ? 'style="fill:var(--text)"' : ""}>${esc(p.label)}</text>`;
    if (p.value > 0 && p.showValue) s += `<text x="${x + w / 2}" y="${yy - 5}" text-anchor="middle">${fmt(p.value)}</text>`;
  });
  if (goal) s += `<line class="goal" x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}"/>`;
  return s + "</svg>";
}

function lineChart(points, { h = 160, fmt = n1, unit = "" } = {}) {
  if (points.length < 2) return `<p class="small muted">Graf se pokaže, ko boš imel zapise iz vsaj dveh različnih tednov ali dni.</p>`;
  const W = 320, left = 36, right = 14, top = 18, bottom = 22, H = h;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.2 || Math.max(1, hi * 0.05);
  lo -= pad; hi += pad;
  const x = (i) => left + ((W - left - right) * i) / (points.length - 1);
  const y = (v) => top + (H - top - bottom) * (1 - (v - lo) / (hi - lo));
  const id = "g" + ++gradId;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#8fd3ff" stop-opacity=".22"/><stop offset="1" stop-color="#8fd3ff" stop-opacity="0"/></linearGradient></defs>`;
  for (let k = 0; k <= 2; k++) {
    const v = lo + ((hi - lo) * k) / 2;
    s += `<line class="grid" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text x="${left - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v)}</text>`;
  }
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  s += `<path d="${d}L${x(points.length - 1)},${H - bottom}L${x(0)},${H - bottom}Z" fill="url(#${id})"/>`;
  s += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const step = Math.ceil(points.length / 6);
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    s += `<circle cx="${x(i)}" cy="${y(p.value)}" r="${last ? 4 : 2.5}" fill="${last ? "var(--accent)" : "var(--bg)"}" stroke="var(--accent)" stroke-width="1.5"/>`;
    const anchor = last ? "end" : i === 0 ? "start" : "middle";
    if (i % step === 0 || last) s += `<text x="${x(i) + (last ? 4 : i === 0 ? -4 : 0)}" y="${H - 6}" text-anchor="${anchor}">${esc(p.label)}</text>`;
  });
  const lp = points[points.length - 1];
  s += `<text x="${x(points.length - 1)}" y="${y(lp.value) - 9}" text-anchor="end" style="fill:var(--text)">${fmt(lp.value)}${unit}</text>`;
  return s + "</svg>";
}

const loadingCard = (text = "Nalagam…") => `<div class="card"><div class="loading-card"><span class="spinner"></span>${esc(text)}</div></div>`;

/* ============================ HRANA ============================ */

function autoMealType() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "Zajtrk";
  if (h >= 11 && h < 16) return "Kosilo";
  if (h >= 16 && h < 18) return "Prigrizek";
  if (h >= 18 && h < 23) return "Večerja";
  return "Prigrizek";
}

function ruleLine(d, t) {
  if (!t) return `Izpolni <b>profil</b>, da izračunam, koliko kalorij in beljakovin potrebuješ.`;
  if (!d.meals.length) return `Za ta dan še ni zabeleženih obrokov. Tvoj cilj je <b>${n0(t.kcal)} kcal</b> in <b>${n0(t.protein)} g beljakovin</b>.`;
  const kLeft = t.kcal - d.totals.kcal;
  const pLeft = t.protein - d.totals.protein;
  const kPart = kLeft >= 0 ? `Do cilja ti manjka <b>${n0(kLeft)} kcal</b>` : `Cilj kalorij si presegel za <b>${n0(-kLeft)} kcal</b>`;
  const pPart = pLeft > 0 ? ` in <b>${n0(pLeft)} g beljakovin</b>.` : `, beljakovine so <b>dosežene</b>.`;
  return kPart + pPart;
}

function verdictPill(v) {
  if (!v) return "";
  const cls = v === "ravno prav" ? "ok" : v === "premalo" ? "warn" : "bad";
  return `<span class="pill ${cls}">${v === "ravno prav" ? "Ravno prav" : v === "premalo" ? "Premalo" : "Preveč"}</span>`;
}

function mealCard(m) {
  const open = S.openMeal === m.id;
  const t = m.totals;
  let body = "";
  if (open) {
    const conf = { nizka: "warn", srednja: "accent", visoka: "ok" }[m.confidence] || "";
    body = `<div class="meal-body">
      <table class="items"><tbody>${m.items
        .map((it) => `<tr><td>${esc(it.name)}</td><td class="r">${n0(it.grams * m.portion)} g</td><td class="r">${n0(it.kcal * m.portion)} kcal</td></tr>`)
        .join("")}</tbody></table>
      <div class="status-line"><span class="pill ${conf}">Zanesljivost: ${esc(m.confidence || "–")}</span></div>
      ${m.note ? `<p class="small muted">${esc(m.note)}</p>` : ""}
      <div class="field"><span>Porcija – popravi, če si pojedel več ali manj</span>
        <div class="seg">${PORTIONS.map(([v, l]) => `<button data-act="meal-portion" data-id="${m.id}" data-v="${v}" aria-pressed="${m.portion === v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Obrok</span>
        <div class="seg">${MEAL_TYPES.map((x) => `<button data-act="meal-type" data-id="${m.id}" data-v="${x}" aria-pressed="${m.meal_type === x}">${x}</button>`).join("")}</div></div>
      <button class="btn btn-danger" data-act="meal-delete" data-id="${m.id}">${ICON.trash} Izbriši obrok</button>
    </div>`;
  }
  return `<div class="meal">
    <button class="meal-main" data-act="meal-toggle" data-id="${m.id}" aria-expanded="${open}">
      ${m.photo ? `<img class="thumb" src="${m.photo}" alt="" loading="lazy">` : `<div class="thumb"></div>`}
      <div style="min-width:0"><div class="meal-name">${esc(m.dish)}</div>
        <div class="meal-meta">
          <span><span class="dot" style="background:var(--protein)"></span>B <b class="num">${n0(t.protein)}</b></span>
          <span><span class="dot" style="background:var(--carbs)"></span>OH <b class="num">${n0(t.carbs)}</b></span>
          <span><span class="dot" style="background:var(--fat)"></span>M <b class="num">${n0(t.fat)}</b></span>
        </div></div>
      <div class="meal-kcal"><div class="num">${n0(t.kcal)}</div><div class="small faint">kcal</div></div>
    </button>${body}</div>`;
}

function pendingCard(p) {
  return `<div class="meal pending"><div class="meal-main">
    <img class="thumb" src="${p.url}" alt="">
    <div><div class="meal-name">Prepoznavam hrano…</div><div class="meal-meta">Claude ocenjuje količine in kalorije</div></div>
    <span class="spinner" style="color:var(--muted)"></span></div></div>`;
}

function renderFood() {
  const v = $("#view-hrana");
  const d = S.day, t = S.targets;
  if (!d) return (v.innerHTML = loadingCard());
  const tot = d.totals;
  const kT = t?.kcal || 0;

  const groups = MEAL_TYPES.map((type) => {
    const ms = d.meals.filter((m) => m.meal_type === type);
    const ps = S.pending.filter((p) => p.meal_type === type && p.date === S.date);
    if (!ms.length && !ps.length) {
      if (type === "Prigrizek") return "";
      return `<div class="meal-group"><div class="empty-slot"><span>${type} še ni zabeležen</span>
        <button class="link" data-act="meal-camera" data-type="${type}">Slikaj</button></div></div>`;
    }
    const sub = ms.reduce((a, m) => a + m.totals.kcal, 0);
    return `<div class="meal-group"><div class="meal-group-head"><span class="label">${type}</span><span class="small muted num">${n0(sub)} kcal</span></div>
      ${ms.map(mealCard).join("")}${ps.map(pendingCard).join("")}</div>`;
  }).join("");

  const r = d.review;
  const review = `<div class="card">
    <div class="card-head"><h2>Ocena dneva</h2>${verdictPill(r?.verdict)}</div>
    <div class="status-line"><span>${ruleLine(d, t)}</span></div>
    ${r ? `<div class="ai-result"><p style="font-weight:500">${esc(r.headline)}</p>
      ${r.points.length ? `<ul class="bullets">${r.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${r.tomorrow.length ? `<div class="feedback tip"><h4>Za jutri</h4><ul class="bullets">${r.tomorrow.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>` : ""}
    <button class="btn btn-block" data-act="review" ${S.reviewBusy || !d.meals.length ? "disabled" : ""}>
      ${S.reviewBusy ? `<span class="spinner"></span> Ocenjujem…` : `${ICON.spark} ${r ? "Oceni znova" : "Oceni moj dan"}`}</button>
  </div>`;

  v.innerHTML = `
    <div class="card summary">
      ${ring(tot.kcal, kT, `<div class="big num">${n0(tot.kcal)}</div><div class="sub">${kT ? "od " + n0(kT) + " kcal" : "kcal"}</div>`)}
      <div class="macros">
        ${macro("Beljakovine", tot.protein, t?.protein, "var(--protein)")}
        ${macro("Ogljikovi hidrati", tot.carbs, t?.carbs, "var(--carbs)")}
        ${macro("Maščobe", tot.fat, t?.fat, "var(--fat)")}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary btn-lg" data-act="meal-camera">${ICON.camera} Slikaj obrok</button>
      <button class="btn btn-lg" data-act="meal-gallery" aria-label="Izberi sliko iz galerije">${ICON.image}</button>
    </div>
    ${groups}
    ${review}`;
}

async function analyzeMeal(file, type) {
  if (!S.status?.ai) return toast("Za prepoznavo najprej vpiši ključ v Profil → Prepoznava (Gemini je zastonj).", true);
  const p = { meal_type: type || autoMealType(), url: URL.createObjectURL(file), date: S.date };
  S.pending.push(p);
  render();
  try {
    const image = await fileToJpeg(file);
    const m = await api("POST", "/api/meals/analyze", { image, meal_type: p.meal_type, date: p.date });
    S.openMeal = m.id;
    toast(`${m.dish} · ${n0(m.totals.kcal)} kcal`);
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.pending = S.pending.filter((x) => x !== p);
    URL.revokeObjectURL(p.url);
    await loadDay().catch(() => {});
    render();
  }
}

/* ============================ GIBANJE ============================ */

function renderMove() {
  const v = $("#view-gibanje");
  const d = S.day;
  if (!d) return (v.innerHTML = loadingCard());
  if (!S.history || S.history.end !== S.date) {
    loadHistory().then(() => S.tab === "gibanje" && renderMove()).catch(() => {});
  }
  const t = S.targets;
  const goal = t?.steps || 10000;
  const steps = d.steps;
  const stride = ((S.profile?.height || 175) * 0.415) / 100;
  const km = (steps * stride) / 1000;
  const kcalSteps = steps * d.weight * 0.0005;
  const actKcal = d.activities.reduce((a, x) => a + x.kcal, 0);

  let week = `<p class="small muted">Nalagam…</p>`;
  if (S.history?.end === S.date) {
    week = barChart(
      S.history.days.map((x) => ({
        label: WEEKDAYS[new Date(x.date + "T12:00:00").getDay()],
        value: x.steps,
        hi: x.date === S.date,
      })),
      { goal }
    );
    const avg = S.history.days.reduce((a, x) => a + x.steps, 0) / S.history.days.length;
    week += `<p class="small muted">Povprečje zadnjih 7 dni: <span class="num" style="color:var(--text)">${n0(avg)}</span> korakov · črtkana črta je tvoj cilj.</p>`;
  }

  const manual = `<div class="btn-row">
      <input class="input num" id="stepsIn" type="number" inputmode="numeric" min="0" aria-label="Koraki za ta dan"
        placeholder="${d.steps ? "Popravi: " + n0(d.steps) : "Koraki iz Zdravja"}">
      <button class="btn ${S.settings?.stepsServer ? "" : "btn-primary"}" data-act="steps-save">${ICON.edit} ${d.steps ? "Popravi" : "Shrani"}</button>
    </div>`;
  const rs = S.remoteSteps;
  const counter = S.settings?.stepsServer
    ? `<div class="status-line" style="align-items:center">
         <span class="pill ${rs?.ok ? "ok" : rs ? "warn" : ""}">${ICON.heart} Zdravje · samodejno</span>
         <span class="small">${rs?.ok
           ? rs.last?.date ? `Zadnji podatek: ${esc(rs.last.date === today() ? "danes" : shortDate(rs.last.date))} ob ${esc(rs.last.time)}` : "Še ni podatkov. Zaženi bližnjico na iPhonu."
           : rs ? esc(rs.error) : "Preverjam…"}</span>
       </div>
       <div class="btn-row even">
         <button class="btn" data-act="steps-refresh">Osveži</button>
         <button class="btn" data-act="steps-guide">Navodila</button>
       </div>
       <details><summary class="small muted">Popravi ročno</summary><div style="margin-top:10px">${manual}</div></details>`
    : `${manual}
       <p class="small faint">Število prepiši iz aplikacije Zdravje. Lahko pa nastaviš, da se koraki prenašajo sami.</p>
       <button class="btn btn-block" data-act="steps-setup">${ICON.heart} Samodejni koraki iz Zdravja</button>`;

  v.innerHTML = `
    <div class="card">
      <div class="summary" style="display:grid">
        ${ring(steps, goal, `<div class="big num" id="stepsBig">${n0(steps)}</div><div class="sub">od ${n1(goal / 1000)}k korakov</div>`)}
        <div class="macros">
          <div class="macro"><span class="label">Porabljeno z gibanjem</span>
            <span class="num" style="font-size:24px">${n0(kcalSteps + actKcal)} <span class="small muted">kcal</span></span></div>
          <p class="small muted">${steps >= goal ? "Dnevni cilj korakov je dosežen." : `Do cilja še <span class="num" style="color:var(--text)">${n0(goal - steps)}</span> korakov, približno ${n0(((goal - steps) * stride) / 1000 * 12)} minut hoje.`}</p>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><span class="num">${n1(km)}</span><span class="small muted">km</span></div>
        <div class="stat"><span class="num">${n0(kcalSteps)}</span><span class="small muted">kcal hoja</span></div>
        <div class="stat"><span class="num">${n0(actKcal)}</span><span class="small muted">kcal aktivnosti</span></div>
      </div>
      ${counter}
    </div>

    <div class="card"><div class="card-head"><h2>Zadnjih 7 dni</h2></div>${week}</div>

    <div class="card">
      <div class="card-head"><h2>Aktivnosti</h2><span class="small muted">tek, kolo, šport …</span></div>
      <div class="grid-2" style="grid-template-columns: 1.4fr 1fr auto; align-items:end">
        <label class="field"><span>Vrsta</span>
          <select class="input" id="actType">${ACTIVITIES.map((a) => `<option>${a}</option>`).join("")}</select></label>
        <label class="field"><span>Minute</span><input class="input num" id="actMin" type="number" inputmode="numeric" min="1" max="600" placeholder="30"></label>
        <button class="btn" data-act="act-add" aria-label="Dodaj aktivnost">${ICON.plus}</button>
      </div>
      ${d.activities.length ? `<div class="row-list">${d.activities
        .map((a) => `<div class="row"><span>${esc(a.type)} <span class="muted small">· ${a.minutes} min</span></span>
          <span class="num">${n0(a.kcal)} kcal</span>
          <button class="icon-btn" data-act="act-delete" data-id="${a.id}" aria-label="Izbriši">${ICON.x}</button></div>`)
        .join("")}</div>` : `<p class="small muted">Za ta dan ni aktivnosti. Poraba se oceni iz trajanja in tvoje teže.</p>`}
    </div>`;
}

/* ============================ FITNES ============================ */

function lastFor(name) {
  return S.exercises.find((e) => e.name.toLowerCase() === name.trim().toLowerCase());
}

/** Zaporedne enake sete združi: 87,5 kg · 3×6, 80 kg · 1×5 */
function setsSummary(sets) {
  const groups = [];
  for (const s of sets) {
    const g = groups[groups.length - 1];
    if (g && g.kg === s.kg && g.reps === s.reps) g.n++;
    else groups.push({ kg: s.kg, reps: s.reps, n: 1 });
  }
  return groups.map((g) => `${n1(g.kg)} kg · ${g.n}×${g.reps}`).join(", ");
}

function hintHTML() {
  const ex = lastFor(S.exName);
  if (!ex) return S.exName.trim() ? "Nova vaja – po prvem zapisu boš tu videl prejšnji rezultat." : "";
  return `Zadnjič (${shortDate(ex.last)}): <b class="num">${esc(setsSummary(ex.last_sets))}</b> kg × ponovitve`;
}

function exResultHTML(r) {
  const list = (cls, title, arr) =>
    arr?.length ? `<div class="feedback ${cls}"><h4>${title}</h4><ul class="bullets">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  const isPhoto = r.mode === "photo";
  return `<div class="ai-result">
    <div class="ai-name"><div><h3>${esc(r.name_sl)}</h3><p class="small muted">${esc(r.name_en)}${r.equipment ? " · " + esc(r.equipment) : ""}</p></div>
      ${r.rating > 0 ? `<div class="score"><div class="num">${r.rating}<span class="faint" style="font-size:14px">/10</span></div><div class="small muted">tehnika</div></div>` : ""}</div>
    ${r.muscles?.length ? `<div class="chips">${r.muscles.map((m) => `<span class="chip">${esc(m)}</span>`).join("")}</div>` : ""}
    <p class="small">${esc(r.summary)}</p>
    ${list("good", "Dobro", r.good)}
    ${list("bad", isPhoto ? "Pogoste napake" : "Napake", r.mistakes)}
    ${list("tip", isPhoto ? "Kako izvajati" : "Popravki", r.tips)}
    <button class="btn btn-block" data-act="ex-use">${ICON.plus} Zapiši to vajo</button>
  </div>`;
}

function renderFit() {
  const v = $("#view-fitnes");
  if (!S.day) return (v.innerHTML = loadingCard());
  if (!S.loaded.exercises) {
    loadExercises().then(render).catch((e) => toast(e.message, true));
  }
  if (!S.plan) loadPlan().then(render).catch((e) => toast(e.message, true));
  const sub = (k, l) => `<button data-act="fit-sub" data-v="${k}" aria-pressed="${S.fitSub === k}">${l}</button>`;
  const seg = `<div class="seg">${sub("trening", "Trening")}${sub("plan", "Plan")}${sub("napredek", "Napredek")}</div>`;
  v.innerHTML = seg + ({ trening: trainingHTML, plan: planHTML, napredek: progressHTML })[S.fitSub]();
}

/* ---------- plan: predloge, razpored, koledar ---------- */

const TPL_COLORS = ["#8fd3ff", "#c4a8ff", "#e8c66f", "#5fd39c", "#ff9f7a", "#7ae0d6", "#f08fc0"];
const WEEKDAY_NAMES = ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
const tplById = (id) => S.plan?.templates.find((t) => t.id === id);
const tplColor = (id) => TPL_COLORS[Math.max(0, S.plan?.templates.findIndex((t) => t.id === id) ?? 0) % TPL_COLORS.length];

async function loadPlan() {
  S.plan = await api("GET", "/api/plan");
}
async function loadCal() {
  const month = S.cal.month;
  const r = await api("GET", `/api/calendar?month=${month}`);
  if (S.cal.month === month) S.cal.days = r.days;
}
async function savePlan() {
  S.plan = await api("PUT", "/api/plan", S.plan);
  S.planDirty = false;
  S.cal.days = null;
  await loadDay();
  render();
}

function tplOptions(selected, { rest = true, week = false } = {}) {
  return (week ? `<option value="__week">Po tedenskem razporedu</option>` : "") +
    (S.plan?.templates || []).map((t) => `<option value="${esc(t.id)}" ${selected === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("") +
    (rest ? `<option value="rest" ${selected === "rest" || selected === null ? "selected" : ""}>Počitek</option>` : "");
}

function dayPlanHTML() {
  const P = S.day.plan;
  const tpl = P.template;
  const when = isToday() ? "Danes" : dayLabel(S.date);
  const sel = `<select class="input" id="dayTpl" aria-label="Trening za ta dan" style="width:auto;max-width:150px;height:38px;font-size:16px">
    ${P.override ? tplOptions(tpl ? tpl.id : "rest", { week: true }) : tplOptions(tpl ? tpl.id : "rest")}</select>`;
  if (!tpl) {
    return `<div class="card">
      <div class="card-head"><div><span class="label">${esc(when)}</span><h2 style="font-size:22px;margin-top:2px">Počitek</h2></div>${sel}</div>
      <p class="small muted">Mišice rastejo med počitkom. Če vseeno greš v fitnes, zgoraj izberi trening za ta dan.</p></div>`;
  }
  const doneNames = new Set(S.day.workouts.map((w) => w.exercise.toLowerCase()));
  const doneCount = tpl.exercises.filter((e) => doneNames.has(e.name.toLowerCase())).length;
  const color = tplColor(tpl.id);
  return `<div class="card">
    <div class="card-head"><div style="min-width:0"><span class="label">${esc(when)}</span>
      <h2 style="font-size:22px;margin-top:2px"><span class="dot" style="background:${color};width:9px;height:9px"></span>${esc(tpl.name)}</h2>
      ${tpl.focus ? `<p class="small muted">${esc(tpl.focus)}</p>` : ""}</div>${sel}</div>
    <div class="bar"><i style="width:${tpl.exercises.length ? (doneCount / tpl.exercises.length) * 100 : 0}%;background:${color}"></i></div>
    <span class="small muted"><span class="num">${doneCount} / ${tpl.exercises.length}</span> vaj opravljenih</span>
    <div>${tpl.exercises.map((e, i) => {
      const done = doneNames.has(e.name.toLowerCase());
      const last = lastFor(e.name);
      return `<div class="pex">
        <span class="chk ${done ? "on" : ""}">${done ? ICON.check : ""}</span>
        <div style="min-width:0"><div class="nm">${esc(e.name)}</div>
          <div class="tg"><span class="num">${e.sets} × ${esc(e.reps || "?")}</span>${last ? ` · zadnjič ${esc(setsSummary(last.last_sets))}` : ""}</div></div>
        <button class="btn" style="height:36px;padding:0 12px;font-size:14px" data-act="plan-log" data-i="${i}">${done ? "Dodaj" : "Zapiši"}</button>
      </div>`;
    }).join("")}</div>
  </div>`;
}

function calendarHTML() {
  const month = S.cal.month;
  if (!S.cal.days) {
    loadCal().then(() => S.tab === "fitnes" && S.fitSub === "plan" && render()).catch((e) => toast(e.message, true));
  }
  const first = new Date(month + "-01T12:00:00");
  const offset = (first.getDay() + 6) % 7;
  const label = new Intl.DateTimeFormat("sl-SI", { month: "long", year: "numeric" }).format(first);
  const t = today();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(`<span class="cal-day blank"></span>`);
  (S.cal.days || []).forEach((d) => {
    const tpl = tplById(d.template);
    const c = tpl ? tplColor(tpl.id) : null;
    cells.push(`<button class="cal-day ${d.date === t ? "today" : ""} ${d.date === S.date ? "sel" : ""} ${d.date < t ? "past" : ""}" data-act="cal-day" data-date="${d.date}" aria-label="${esc(dayLabel(d.date))}${tpl ? ", " + esc(tpl.name) : ""}">
      <span class="d">${+d.date.slice(8)}</span>
      ${tpl ? `<span class="t" style="color:${c};background:color-mix(in srgb, ${c} 16%, transparent)">${esc(tpl.name)}</span>` : `<span class="t faint">·</span>`}
      ${d.done ? `<span class="done" title="Opravljeno"></span>` : ""}
    </button>`);
  });
  const P = S.day?.plan;
  return `<div class="card">
    <div class="cal-head">
      <button class="icon-btn" data-act="cal-prev" aria-label="Prejšnji mesec">${ICON.chevL}</button>
      <h2 style="text-transform:capitalize">${esc(label)}</h2>
      <button class="icon-btn" data-act="cal-next" aria-label="Naslednji mesec">${ICON.chevR}</button>
    </div>
    <div class="cal">${["P", "T", "S", "Č", "P", "S", "N"].map((w) => `<span class="cal-wd">${w}</span>`).join("")}${cells.join("")}</div>
    <p class="small faint"><span class="dot" style="background:var(--ok)"></span>pika pomeni, da si ta dan zapisal trening. Tapni dan, da ga spremeniš.</p>
    ${P ? `<div class="sel-day">
      <span style="font-weight:500">${esc(dayLabel(S.date))}</span>
      <select class="input" id="dayTpl" aria-label="Trening za ta dan" style="height:38px;font-size:16px">
        ${P.override ? tplOptions(P.template ? P.template.id : "rest", { week: true }) : tplOptions(P.template ? P.template.id : "rest")}</select>
      <button class="btn" style="height:38px" data-act="cal-open">Odpri</button>
    </div>` : ""}
  </div>`;
}

function planHTML() {
  if (!S.plan) return loadingCard("Nalagam plan…");
  const names = [...new Set([...S.exercises.map((e) => e.name), ...COMMON_EXERCISES])];
  const week = WEEKDAY_NAMES.map((n, i) => {
    const k = String(i + 1);
    const id = S.plan.week[k];
    return `<div class="wk-row"><span><span class="dot" style="background:${id ? tplColor(id) : "var(--line-2)"}"></span>${n}</span>
      <select class="input" data-week="${k}" style="height:40px;font-size:16px">${tplOptions(id ?? null)}</select></div>`;
  }).join("");

  const tpls = S.plan.templates.map((t) => {
    const open = S.editTpl === t.id;
    const head = `<button class="tpl-head" data-act="tpl-toggle" data-id="${esc(t.id)}" aria-expanded="${open}">
        <span class="dot" style="background:${tplColor(t.id)};width:9px;height:9px"></span>
        <span style="min-width:0;text-align:left"><b>${esc(t.name)}</b>${t.focus ? `<span class="small muted"> · ${esc(t.focus)}</span>` : ""}</span>
        <span class="small muted num">${t.exercises.length} vaj</span></button>`;
    if (!open) return `<div class="tpl">${head}</div>`;
    return `<div class="tpl open">${head}
      <div class="tpl-body">
        <div class="grid-2">
          <label class="field"><span>Ime</span><input class="input" data-tpl="${esc(t.id)}" data-k="name" value="${esc(t.name)}"></label>
          <label class="field"><span>Mišice</span><input class="input" data-tpl="${esc(t.id)}" data-k="focus" value="${esc(t.focus)}" placeholder="npr. prsa, ramena"></label>
        </div>
        <div class="tex-list">${t.exercises.map((e, i) => `<div class="tex">
          <div class="tex-top">
            <input class="input" list="tplExList" data-tpl="${esc(t.id)}" data-ex="${i}" data-k="name" value="${esc(e.name)}" placeholder="Ime vaje" aria-label="Ime vaje">
            <button class="icon-btn" data-act="tplex-del" data-id="${esc(t.id)}" data-i="${i}" aria-label="Odstrani vajo">${ICON.x}</button>
          </div>
          <div class="tex-bottom">
            <label class="mini"><span>Seti</span><input class="input num" type="number" inputmode="numeric" min="1" max="10" data-tpl="${esc(t.id)}" data-ex="${i}" data-k="sets" value="${esc(e.sets)}"></label>
            <label class="mini"><span>Ponovitve</span><input class="input num" data-tpl="${esc(t.id)}" data-ex="${i}" data-k="reps" value="${esc(e.reps)}" placeholder="8–10"></label>
          </div>
        </div>`).join("")}</div>
        <button class="btn" data-act="tplex-add" data-id="${esc(t.id)}">${ICON.plus} Dodaj vajo</button>
        <div class="btn-row">
          <button class="btn btn-primary" data-act="plan-save">Shrani</button>
          <button class="btn btn-danger" data-act="tpl-del" data-id="${esc(t.id)}" aria-label="Izbriši trening">${ICON.trash}</button>
        </div>
      </div></div>`;
  }).join("");

  return `
    ${calendarHTML()}
    <div class="card">
      <div class="card-head"><h2>Tedenski razpored</h2></div>
      <div class="chips">
        <button class="chip chip-btn" data-act="preset" data-v="3">PPL 3× na teden</button>
        <button class="chip chip-btn" data-act="preset" data-v="6">PPL 6× na teden</button>
      </div>
      <div class="wk-list">${week}</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Treningi</h2><span class="small muted">tapni za urejanje</span></div>
      <datalist id="tplExList">${names.map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>
      <div class="tpl-list">${tpls}</div>
      <button class="btn" data-act="tpl-add">${ICON.plus} Nov trening</button>
      ${S.planDirty && !S.editTpl ? `<button class="btn btn-primary" data-act="plan-save">Shrani spremembe</button>` : ""}
    </div>`;
}

function trainingHTML() {
  const names = [...new Set([...S.exercises.map((e) => e.name), ...COMMON_EXERCISES])];
  const wos = S.day.workouts;
  const busy = S.exBusy ? `<div class="loading-card"><span class="spinner"></span>${esc(S.exBusy)}</div>` : "";
  return `
    ${S.day.plan ? dayPlanHTML() : ""}

    <div class="card" id="logCard">
      <div class="card-head"><h2>Zapiši vajo</h2></div>
      <label class="field"><span>Vaja</span>
        <input class="input" id="exName" list="exList" autocomplete="off" placeholder="npr. Potisk s klopi" value="${esc(S.exName)}"></label>
      <datalist id="exList">${names.map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>
      <p class="hint" id="exHint">${hintHTML()}</p>
      <div class="sets">
        <div class="set-row set-head"><span></span><span>Teža (kg)</span><span>Ponovitve</span><span></span></div>
        ${S.sets.map((s, i) => `<div class="set-row">
          <span class="idx">${i + 1}</span>
          <input class="input num" type="number" inputmode="decimal" step="0.5" min="0" data-set="${i}" data-k="kg" value="${esc(s.kg)}" placeholder="0">
          <input class="input num" type="number" inputmode="numeric" min="0" data-set="${i}" data-k="reps" value="${esc(s.reps)}" placeholder="0">
          <button class="icon-btn" data-act="set-remove" data-i="${i}" aria-label="Odstrani set" ${S.sets.length === 1 ? "disabled" : ""}>${ICON.x}</button>
        </div>`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-act="wo-save" ${S.saving ? "disabled" : ""}>Shrani vajo</button>
        <button class="btn" data-act="set-add">${ICON.plus} Set</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>${isToday() ? "Današnji trening" : "Trening – " + esc(dayLabel(S.date))}</h2>
        ${wos.length ? `<span class="small muted num">${n0(wos.reduce((a, w) => a + w.volume, 0))} kg volumna</span>` : ""}</div>
      ${wos.length ? `<div>${wos.map((w) => `<div class="wo">
          <div class="wo-head"><h3>${esc(w.exercise)}</h3>
            <button class="icon-btn" data-act="wo-delete" data-id="${w.id}" aria-label="Izbriši vajo">${ICON.trash}</button></div>
          <div class="chips">${w.sets.map((s) => `<span class="chip num">${n1(s.kg)} kg × ${s.reps}</span>`).join("")}</div>
          <span class="small muted">Volumen <span class="num">${n0(w.volume)}</span> kg · ocenjen 1RM <span class="num">${n1(w.best_e1rm)}</span> kg</span>
        </div>`).join("")}</div>` : `<p class="small muted">Za ta dan še ni zapisanih vaj.</p>`}
    </div>

    <div class="card">
      <div class="card-head"><h2>Ne veš, kako se vaja imenuje?</h2></div>
      <p class="small muted">Posnemi 5–15 sekund od strani, da se vidi celo telo. Claude prepozna vajo, oceni tehniko in pove, kaj popraviti. Lahko pa samo slikaš napravo.</p>
      <div class="btn-row even">
        <button class="btn" data-act="ex-video" ${S.exBusy ? "disabled" : ""}>${ICON.video} Posnemi vajo</button>
        <button class="btn" data-act="ex-photo" ${S.exBusy ? "disabled" : ""}>${ICON.camera} Slikaj napravo</button>
      </div>
      <button class="link" data-act="ex-video-gallery" style="justify-self:start">Izberi obstoječ video iz galerije</button>
      ${busy}
      ${S.exResult && !S.exBusy ? exResultHTML(S.exResult) : ""}
    </div>`;
}

function progressHTML() {
  if (!S.progress) {
    loadProgress().then(render).catch((e) => toast(e.message, true));
    return loadingCard("Računam napredek…");
  }
  const P = S.progress;
  const thisMon = mondayOf(today());
  const lastMon = addDays(thisMon, -7);
  const wk = (m) => P.summary.find((x) => x.week === m) || { days: 0, sets: 0, volume: 0 };
  const a = wk(thisMon), b = wk(lastMon);
  const delta = (x, y) => {
    if (!y) return `<span class="small faint">prejšnji teden 0</span>`;
    const p = Math.round(((x - y) / y) * 100);
    const cls = p > 0 ? "delta-up" : p < 0 ? "delta-down" : "faint";
    return `<span class="small ${cls} num">${p > 0 ? "+" : ""}${p} %</span>`;
  };
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const m = addDays(thisMon, -7 * i);
    const d = new Date(m + "T12:00:00");
    weeks.push({ label: `${d.getDate()}.${d.getMonth() + 1}.`, value: wk(m).volume, hi: i === 0 });
  }

  let exCard = `<p class="small muted">Ko zapišeš prvo vajo, boš tu videl, kako napreduješ iz tedna v teden.</p>`;
  if (S.exercises.length) {
    const s = P.series;
    let deltaTxt = "";
    if (s.length >= 2) {
      const diff = s[s.length - 1].best_e1rm - s[0].best_e1rm;
      const pct = s[0].best_e1rm ? Math.round((diff / s[0].best_e1rm) * 100) : 0;
      deltaTxt = `<p class="small muted">Od ${esc(shortDate(s[0].week))}: <span class="num ${diff >= 0 ? "delta-up" : "delta-down"}">${diff >= 0 ? "+" : ""}${n1(diff)} kg (${pct >= 0 ? "+" : ""}${pct} %)</span> pri ocenjenem 1RM.</p>`;
    }
    exCard = `
      <label class="field"><span>Vaja</span>
        <select class="input" id="progEx">${S.exercises.map((e) => `<option ${e.name === S.progEx ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
      <div><span class="label">Najboljši ocenjeni 1RM po tednih</span></div>
      ${lineChart(s.map((x) => ({ label: shortDate(x.week), value: x.best_e1rm })), { unit: " kg" })}
      ${deltaTxt}
      <p class="small faint">1RM je ocena največje teže za eno ponovitev, izračunana iz teže in ponovitev (Epley). Raste, ko dvigneš več ali narediš več ponovitev z isto težo.</p>
      ${P.history.length ? `<div class="row-list">${P.history.map((w) => `<div class="row" style="grid-template-columns: auto 1fr auto">
          <span class="small muted num">${esc(shortDate(w.date))}</span>
          <span class="small num" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(setsSummary(w.sets))}</span>
          <span class="small muted num">${n0(w.volume)} kg</span></div>`).join("")}</div>` : ""}`;
  }

  return `
    <div class="card">
      <div class="card-head"><h2>Ta teden</h2><span class="small muted">od ${esc(shortDate(thisMon))}</span></div>
      <div class="kpis">
        <div class="kpi"><span class="small muted">Treningi</span><span class="num">${a.days}</span>${delta(a.days, b.days)}</div>
        <div class="kpi"><span class="small muted">Seti</span><span class="num">${a.sets}</span>${delta(a.sets, b.sets)}</div>
        <div class="kpi"><span class="small muted">Volumen</span><span class="num">${n0(a.volume)}</span>${delta(a.volume, b.volume)}</div>
      </div>
      <p class="small faint">Odstotki so primerjava s prejšnjim tednom.</p>
      <div><span class="label">Volumen po tednih (kg × ponovitve)</span></div>
      ${barChart(weeks, { hiColor: "var(--accent)" })}
    </div>
    <div class="card"><div class="card-head"><h2>Napredek pri vaji</h2></div>${exCard}</div>`;
}

async function analyzeExercise(file, mode) {
  if (!S.status?.ai) return toast("Za prepoznavo najprej vpiši ključ v Profil → Prepoznava (Gemini je zastonj).", true);
  S.exResult = null;
  S.exBusy = mode === "video" ? "Izrezujem sličice iz videa…" : "Pripravljam sliko…";
  render();
  try {
    const frames = mode === "video" ? await extractFrames(file) : [await fileToJpeg(file)];
    S.exBusy = mode === "video" ? "Claude pregleduje tehniko – to traja do pol minute…" : "Claude prepoznava napravo…";
    render();
    const r = await api("POST", "/api/exercise/analyze", { frames, mode });
    S.exResult = { ...r, mode };
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.exBusy = null;
    render();
  }
}

async function saveWorkout() {
  const exercise = S.exName.trim();
  const sets = S.sets.filter((s) => +s.reps > 0).map((s) => ({ kg: +s.kg || 0, reps: +s.reps }));
  if (!exercise) return toast("Vpiši ime vaje.", true);
  if (!sets.length) return toast("Vpiši vsaj en set s ponovitvami.", true);
  S.saving = true;
  render();
  try {
    const w = await api("POST", "/api/workouts", { date: S.date, exercise, sets });
    toast(w.pr ? `Nov osebni rekord pri vaji ${w.exercise}!` : `Shranjeno: ${w.exercise}`);
    const last = sets[sets.length - 1];
    S.sets = [{ kg: String(last.kg), reps: "" }];
    S.exName = "";
    S.progress = null;
    S.cal.days = null;
    await Promise.all([loadDay(), loadExercises()]);
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.saving = false;
    render();
  }
}

/* ============================ PROFIL ============================ */

function profileDraft() {
  if (!S.pf) {
    S.pf = S.profile
      ? { ...S.profile }
      : { name: "", sex: "m", age: "", height: "", weight: "", goal: "vzdrževanje", activity: "zmerno", steps_goal: 10000 };
  }
  return S.pf;
}

function renderProfile() {
  const v = $("#view-profil");
  const p = profileDraft();
  const t = S.targets;
  if (!S.loaded.weights) loadWeights().then(render).catch(() => {});
  if (!S.loaded.photos) loadPhotos().then(render).catch(() => {});

  const segBtns = (key, opts) =>
    `<div class="seg">${opts.map(([val, lab]) => `<button data-act="pf-seg" data-k="${key}" data-v="${val}" aria-pressed="${p[key] === val}">${lab}</button>`).join("")}</div>`;

  const welcome = !S.profile
    ? `<div class="welcome" style="display:grid;gap:8px;padding:8px 2px 4px"><h1>Dobrodošel v Formi</h1>
        <p class="muted">Najprej mi povej nekaj o sebi. Iz tega izračunam, koliko kalorij, beljakovin in korakov potrebuješ na dan.</p></div>`
    : `<div class="view-title"><h1>${esc(S.profile.name || "Profil")}</h1></div>`;

  const targets = t ? `<div class="card">
      <div class="card-head"><h2>Tvoji dnevni cilji</h2><span class="pill accent">${esc(S.profile?.goal || "")}</span></div>
      <div class="target-grid">
        <div class="kpi"><span class="small muted">Kalorije</span><span class="num">${n0(t.kcal)}</span></div>
        <div class="kpi"><span class="small muted">Beljakovine</span><span class="num">${n0(t.protein)} g</span></div>
        <div class="kpi"><span class="small muted">OH</span><span class="num">${n0(t.carbs)} g</span></div>
        <div class="kpi"><span class="small muted">Maščobe</span><span class="num">${n0(t.fat)} g</span></div>
      </div>
      <p class="small faint">Bazalni metabolizem ${n0(t.bmr)} kcal, z dnevno aktivnostjo ${n0(t.tdee)} kcal (Mifflin-St Jeor). Cilj se posodobi, ko vpišeš novo težo.</p>
    </div>` : "";

  const ws = S.weights;
  let weightBody = `<p class="small muted">Vpiši težo enkrat na teden, zjutraj na tešče.</p>`;
  if (ws.length) {
    const first = ws[0], last = ws[ws.length - 1];
    const diff = last.kg - first.kg;
    weightBody = lineChart(ws.map((w) => ({ label: shortDate(w.date), value: w.kg })), { unit: " kg" }) +
      (ws.length > 1 ? `<p class="small muted">Od ${esc(shortDate(first.date))}: <span class="num" style="color:var(--text)">${diff > 0 ? "+" : ""}${n1(diff)} kg</span></p>` : "");
  }

  const sel = S.selPhotos.map((id) => S.photos.find((x) => x.id === id)).filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : 1));
  const compare = sel.length === 2 ? `
      <div class="compare">${sel.map((x) => `<figure><img src="${x.url}" alt="Postava ${esc(x.date)}"><figcaption>${esc(shortDate(x.date))}</figcaption></figure>`).join("")}</div>
      <button class="btn btn-block" data-act="photo-compare" ${S.compareBusy ? "disabled" : ""}>${S.compareBusy ? `<span class="spinner"></span> Primerjam…` : `${ICON.spark} Primerjaj z AI`}</button>
      ${S.compare ? `<div class="ai-result"><p>${esc(S.compare.summary)}</p>
        <ul class="bullets">${S.compare.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        ${S.compare.caveats ? `<p class="small faint">${esc(S.compare.caveats)}</p>` : ""}</div>` : ""}
      <button class="btn btn-danger" data-act="photo-delete-sel">${ICON.trash} Izbriši izbrani sliki</button>` : "";

  v.innerHTML = `
    ${welcome}
    <div class="card">
      <div class="card-head"><h2>O tebi</h2></div>
      <label class="field"><span>Ime</span><input class="input" data-pf="name" value="${esc(p.name)}" placeholder="Kako ti je ime?"></label>
      <div class="field"><span>Spol</span>${segBtns("sex", [["m", "Moški"], ["z", "Ženska"]])}</div>
      <div class="grid-3">
        <label class="field"><span>Starost</span><input class="input num" data-pf="age" type="number" inputmode="numeric" value="${esc(p.age)}" placeholder="25"></label>
        <label class="field"><span>Višina (cm)</span><input class="input num" data-pf="height" type="number" inputmode="numeric" value="${esc(p.height)}" placeholder="180"></label>
        <label class="field"><span>Teža (kg)</span><input class="input num" data-pf="weight" type="number" inputmode="decimal" step="0.1" value="${esc(p.weight)}" placeholder="78"></label>
      </div>
      <div class="field"><span>Cilj</span>${segBtns("goal", [["hujšanje", "Hujšanje"], ["vzdrževanje", "Vzdrževanje"], ["mišice", "Mišice"]])}</div>
      <label class="field"><span>Aktivnost</span>
        <select class="input" data-pf="activity">${ACTIVITY_LEVELS.map(([k, l]) => `<option value="${k}" ${p.activity === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field"><span>Dnevni cilj korakov</span><input class="input num" data-pf="steps_goal" type="number" inputmode="numeric" value="${esc(p.steps_goal)}"></label>
      <button class="btn btn-primary btn-block" data-act="pf-save">${S.profile ? "Shrani spremembe" : "Shrani in začni"}</button>
    </div>
    ${targets}
    ${S.profile ? `
    <div class="card">
      <div class="card-head"><h2>Teža</h2></div>
      <div class="btn-row"><input class="input num" id="wIn" type="number" inputmode="decimal" step="0.1" placeholder="Današnja teža v kg">
        <button class="btn" data-act="w-add">${ICON.plus} Dodaj</button></div>
      ${weightBody}
    </div>
    <div class="card">
      <div class="card-head"><h2>Napredek postave</h2><span class="small muted">${S.photos.length} ${S.photos.length === 1 ? "slika" : S.photos.length === 2 ? "sliki" : S.photos.length === 3 || S.photos.length === 4 ? "slike" : "slik"}</span></div>
      <p class="small muted">Slikaj se enkrat na teden: ista svetloba, isti kot, ista razdalja. Izberi dve sliki za primerjavo.</p>
      <button class="btn" data-act="photo-add">${ICON.camera} Dodaj sliko tega tedna</button>
      ${S.photos.length ? `<div class="photo-grid">${S.photos.map((x) => {
        const i = S.selPhotos.indexOf(x.id);
        return `<button class="photo-tile" data-act="photo-sel" data-id="${x.id}" aria-pressed="${i >= 0}"><img src="${x.url}" alt="" loading="lazy">
          <span>${esc(shortDate(x.date))}</span>${i >= 0 ? `<b>${i + 1}</b>` : ""}</button>`;
      }).join("")}</div>` : ""}
      ${compare}
    </div>` : ""}
    ${settingsHTML()}
    ${backupHTML()}`;
}

const mb = (bytes) => n1((bytes || 0) / 1048576);

function lastBackup() {
  try { return localStorage.getItem("forma.lastBackup"); } catch { return null; }
}

function settingsHTML() {
  if (!S.settings && !S.settingsLoading) {
    S.settingsLoading = true;
    api("GET", "/api/settings")
      .then((r) => { S.settings = r; })
      .catch(() => {})
      .finally(() => { S.settingsLoading = false; if (S.tab === "profil") render(); });
  }
  const st = S.settings;
  const gemini = (st?.provider || "gemini") === "gemini";
  const model = st?.model || "claude-opus-5-5";
  const key = st?.hasKey
    ? `<div class="status-line" style="align-items:center"><span class="pill ok">Ključ vpisan</span><span class="num muted">${esc(st.keyHint)}</span></div>
       <div class="btn-row even">
         <button class="btn" data-act="key-test" ${S.keyBusy ? "disabled" : ""}>${S.keyBusy ? `<span class="spinner"></span> Preverjam…` : "Preveri ključ"}</button>
         <button class="btn btn-danger" data-act="key-remove">Odstrani ključ</button>
       </div>`
    : gemini
      ? `<ol class="steps-guide">
           <li>Na računalniku ali telefonu odpri <b>aistudio.google.com/apikey</b> in se prijavi z Google računom.</li>
           <li>Tapni <b>Create API key</b> in ga kopiraj (začne se z <code>AIza</code>).</li>
           <li>Prilepi ga spodaj. Ključ ostane samo na tem telefonu.</li>
         </ol>
         <div class="btn-row">
           <input class="input" id="keyIn" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…" aria-label="Ključ za Gemini">
           <button class="btn btn-primary" data-act="key-save">Shrani</button>
         </div>`
      : `<p class="small muted">Ključ ustvariš na console.anthropic.com → API Keys, tam dodaš tudi nekaj dobroimetja. Ključ ostane samo na tem telefonu.</p>
         <div class="btn-row">
           <input class="input" id="keyIn" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" aria-label="Ključ za Claude API">
           <button class="btn btn-primary" data-act="key-save">Shrani</button>
         </div>`;
  return `<div class="card">
    <div class="card-head"><h2>Prepoznava</h2>${st && !st.hasKey ? `<span class="pill warn">Ni ključa</span>` : ""}</div>
    <div class="seg">
      <button data-act="provider" data-v="gemini" aria-pressed="${gemini}">Gemini · zastonj</button>
      <button data-act="provider" data-v="claude" aria-pressed="${!gemini}">Claude</button>
    </div>
    ${key}
    ${gemini
      ? `<p class="small faint">Gemini je Googlov brezplačni model. Pri brezplačni različici lahko Google slike, ki jih pošlješ v prepoznavo, uporabi za izboljšanje svojih storitev. Brezplačna uporaba ima dnevno mejo, za nekaj obrokov na dan zadošča.</p>`
      : `<div class="field"><span>Model</span><div class="seg">
          <button data-act="model" data-v="claude-opus-5-5" aria-pressed="${model === "claude-opus-5-5"}">Opus 5.5</button>
          <button data-act="model" data-v="claude-sonnet-5-5" aria-pressed="${model === "claude-sonnet-5-5"}">Sonnet 5.5</button>
        </div></div>
        <p class="small faint">Plačljivo, okoli 1–3 cente na sliko. Anthropic podatkov iz API-ja ne uporablja za učenje modelov.</p>`}
    <p class="small faint">V prepoznavo gre samo slika, ki jo slikaš. Vsi ostali podatki ostanejo na telefonu.</p>
  </div>`;
}

function backupHTML() {
  const u = S.settings?.usage;
  const last = lastBackup();
  const old = !last || (Date.now() - new Date(last).getTime()) / 86400000 > 7;
  return `<div class="card">
    <div class="card-head"><h2>Kopija podatkov</h2>${u ? `<span class="small muted num">${mb(u.used)} MB</span>` : ""}</div>
    <p class="small muted">Tvoji podatki so samo na tem telefonu. Enkrat na teden shrani kopijo v Datoteke ali iCloud Drive. Če izbrišeš Formo z začetnega zaslona ali zamenjaš telefon, jih iz kopije obnoviš.</p>
    ${S.backupFile
      ? `<button class="btn btn-primary btn-block" data-act="backup-share">Shrani datoteko (${mb(S.backupFile.size)} MB)</button>`
      : `<div class="btn-row even">
          <button class="btn ${old ? "btn-primary" : ""}" data-act="backup" ${S.backupBusy ? "disabled" : ""}>${S.backupBusy ? `<span class="spinner"></span> Pripravljam…` : "Shrani kopijo"}</button>
          <button class="btn" data-act="restore">Naloži kopijo</button>
        </div>`}
    <p class="small ${old ? "" : "faint"}" ${old ? 'style="color:var(--warn)"' : ""}>${last ? `Zadnja kopija: ${esc(shortDate(last.slice(0, 10)))}` : "Kopije še nisi shranil."}</p>
  </div>`;
}

/* ============================ IZRIS ============================ */

function render() {
  document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== S.tab));
  $("#datenav").style.visibility = S.tab === "profil" ? "hidden" : "visible";
  $("#dateLabel").textContent = dayLabel(S.date);
  $("#nextDay").disabled = S.date >= today();
  $("#nextDay").style.opacity = S.date >= today() ? 0.3 : 1;
  ({ hrana: renderFood, gibanje: renderMove, fitnes: renderFit, profil: renderProfile })[S.tab]();
}

async function setDate(iso, { future = false } = {}) {
  if (iso > today() && !future) return;
  S.date = iso;
  if (S.cal.month !== iso.slice(0, 7)) S.cal = { month: iso.slice(0, 7), days: null };
  S.day = null;
  S.openMeal = null;
  render();
  try { await loadDay(); } catch (e) { toast(e.message, true); }
  render();
}

function setTab(tab) {
  S.tab = tab;
  try { localStorage.setItem("forma.tab", tab); } catch { /* zasebni način */ }
  history.replaceState(null, "", "#" + tab);
  window.scrollTo({ top: 0 });
  render();
}

/* ============================ DOGODKI ============================ */

let pickTarget = null;

function pick(id, cb) {
  pickTarget = cb;
  const input = $("#" + id);
  input.value = "";
  input.click();
}

["mealCamera", "mealGallery", "exVideo", "exVideoGallery", "exPhoto", "bodyPhoto", "restoreFile"].forEach((id) => {
  $("#" + id).addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f && pickTarget) pickTarget(f);
    pickTarget = null;
  });
});

document.addEventListener("click", async (e) => {
  const tab = e.target.closest(".tab");
  if (tab) return setTab(tab.dataset.tab);
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;

  try {
    switch (act) {
      /* hrana */
      case "meal-camera": return pick("mealCamera", (f) => analyzeMeal(f, el.dataset.type));
      case "meal-gallery": return pick("mealGallery", (f) => analyzeMeal(f));
      case "meal-toggle":
        S.openMeal = S.openMeal === id ? null : id;
        return render();
      case "meal-portion":
        await api("PATCH", `/api/meals/${id}`, { portion: +el.dataset.v });
        await loadDay();
        return render();
      case "meal-type":
        await api("PATCH", `/api/meals/${id}`, { meal_type: el.dataset.v });
        await loadDay();
        return render();
      case "meal-delete":
        if (!(await confirmSheet("Izbrišem ta obrok?"))) return;
        await api("DELETE", `/api/meals/${id}`);
        S.openMeal = null;
        await loadDay();
        return render();
      case "review":
        S.reviewBusy = true;
        render();
        try {
          S.day.review = await api("POST", "/api/day/review", { date: S.date });
        } finally {
          S.reviewBusy = false;
          render();
        }
        return;

      /* gibanje */
      case "steps-refresh":
        S.remoteSteps = null;
        render();
        await syncSteps(true);
        return;
      case "steps-setup": {
        const r = await sheet({
          title: "Samodejni koraki",
          body: `<p class="small muted">Koraki iz Zdravja gredo na tvoj strežnik, od tam jih Forma prebere ob vsakem odprtju. Vpiši naslov strežnika s koraki (dobiš ga od tistega, ki ti je postavil strežnik).</p>
            <input class="input" name="server" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="https://…ts.net:8443">`,
          actions: [{ label: "Prekliči", value: null }, { label: "Naprej", value: "form", cls: "btn-primary" }],
        });
        if (!r?.server?.trim()) return;
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", { stepsServer: r.server })) };
        await syncSteps(true);
        return showStepsGuide();
      }
      case "steps-guide": return showStepsGuide();
      case "copy-sync":
        try {
          await navigator.clipboard.writeText(`${S.settings.stepsServer}/sync?steps=`);
          toast("Naslov kopiran. Prilepi ga v bližnjico.");
        } catch {
          const c = el.parentElement.querySelector(".url");
          if (c) getSelection().selectAllChildren(c);
          toast("Naslov je označen, kopiraj ga.");
        }
        return;
      case "steps-off":
        if (!(await confirmSheet("Izklopim samodejne korake?", "Izklopi"))) return;
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", { stepsServer: "" })) };
        S.remoteSteps = null;
        document.querySelector(".sheet-backdrop")?.remove();
        return render();
      case "steps-save": {
        const raw = String($("#stepsIn").value).replace(/\D/g, "");
        if (!raw) return toast("Vpiši število korakov.", true);
        await api("PUT", "/api/steps", { date: S.date, steps: +raw });
        await loadDay();
        S.history = null;
        render();
        return toast(`Shranjeno: ${n0(+raw)} korakov.`);
      }
      case "steps-edit": {
        const r = await sheet({
          title: "Koraki za " + dayLabel(S.date).toLowerCase(),
          body: `<p class="small muted">Vpiši skupno število korakov iz aplikacije Zdravje. Zamenja trenutno vrednost.</p>
            <input class="input num" name="steps" type="number" inputmode="numeric" min="0" value="${S.day.steps}">`,
          actions: [{ label: "Prekliči", value: null }, { label: "Shrani", value: "form", cls: "btn-primary" }],
        });
        if (!r) return;
        await api("PUT", "/api/steps", { date: S.date, steps: +r.steps || 0 });
        await loadDay();
        S.history = null;
        return render();
      }
      case "act-add": {
        const minutes = +$("#actMin").value;
        if (!minutes) return toast("Vpiši, koliko minut je trajala aktivnost.", true);
        await api("POST", "/api/activities", { date: S.date, type: $("#actType").value, minutes });
        await loadDay();
        return render();
      }
      case "act-delete":
        await api("DELETE", `/api/activities/${id}`);
        await loadDay();
        return render();

      /* fitnes */
      case "fit-sub":
        S.fitSub = el.dataset.v;
        if (S.fitSub === "napredek") S.progress = null;
        if (S.fitSub === "plan") S.cal.days = null;
        return render();

      /* plan in koledar */
      case "cal-prev":
      case "cal-next": {
        const d = new Date(S.cal.month + "-15T12:00:00");
        d.setMonth(d.getMonth() + (act === "cal-next" ? 1 : -1));
        S.cal = { month: localISO(d).slice(0, 7), days: null };
        return render();
      }
      case "cal-day":
        return setDate(el.dataset.date, { future: true });
      case "cal-open":
        S.fitSub = "trening";
        render();
        window.scrollTo({ top: 0 });
        return;
      case "preset":
        if (!["push", "pull", "legs"].every(tplById)) return toast("Za ta razpored potrebuješ treninge Push, Pull in Legs.", true);
        S.plan.week = el.dataset.v === "6"
          ? { 1: "push", 2: "pull", 3: "legs", 4: "push", 5: "pull", 6: "legs", 7: null }
          : { 1: "push", 2: null, 3: "pull", 4: null, 5: "legs", 6: null, 7: null };
        await savePlan();
        return toast("Razpored nastavljen.");
      case "tpl-toggle":
        S.editTpl = S.editTpl === id ? null : id;
        return render();
      case "tpl-add": {
        const t = { id: "t" + Date.now().toString(36), name: "Nov trening", focus: "", exercises: [{ name: "", sets: 3, reps: "8–10" }] };
        S.plan.templates.push(t);
        S.editTpl = t.id;
        S.planDirty = true;
        return render();
      }
      case "tpl-del": {
        const t = tplById(id);
        if (!(await confirmSheet(`Izbrišem trening ${t?.name || ""}?`))) return;
        S.plan.templates = S.plan.templates.filter((x) => x.id !== id);
        for (const k in S.plan.week) if (S.plan.week[k] === id) S.plan.week[k] = null;
        S.editTpl = null;
        return savePlan();
      }
      case "tplex-add":
        tplById(id).exercises.push({ name: "", sets: 3, reps: "8–10" });
        S.planDirty = true;
        return render();
      case "tplex-del":
        tplById(id).exercises.splice(+el.dataset.i, 1);
        S.planDirty = true;
        return render();
      case "plan-save":
        S.editTpl = null;
        await savePlan();
        return toast("Plan shranjen.");
      case "plan-log": {
        const ex = S.day.plan.template.exercises[+el.dataset.i];
        const last = lastFor(ex.name)?.last_sets || [];
        S.exName = ex.name;
        S.sets = Array.from({ length: ex.sets }, (_, i) => ({ kg: String(last[i]?.kg ?? last[last.length - 1]?.kg ?? ""), reps: "" }));
        render();
        $("#logCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      case "ex-video": return pick("exVideo", (f) => analyzeExercise(f, "video"));
      case "ex-video-gallery": return pick("exVideoGallery", (f) => analyzeExercise(f, "video"));
      case "ex-photo": return pick("exPhoto", (f) => analyzeExercise(f, "photo"));
      case "ex-use":
        S.exName = S.exResult?.name_sl || "";
        render();
        $("#logCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      case "set-add": {
        const last = S.sets[S.sets.length - 1];
        S.sets.push({ kg: last.kg, reps: last.reps });
        return render();
      }
      case "set-remove":
        S.sets.splice(+el.dataset.i, 1);
        return render();
      case "wo-save": return saveWorkout();
      case "wo-delete":
        if (!(await confirmSheet("Izbrišem to vajo iz treninga?"))) return;
        await api("DELETE", `/api/workouts/${id}`);
        S.progress = null;
        S.cal.days = null;
        await Promise.all([loadDay(), loadExercises()]);
        return render();

      /* profil */
      case "pf-seg":
        profileDraft()[el.dataset.k] = el.dataset.v;
        return render();
      case "pf-save": {
        const r = await api("PUT", "/api/profile", profileDraft());
        const first = !S.profile;
        S.profile = r.profile;
        S.targets = r.targets;
        S.pf = null;
        S.status.profile = true;
        await Promise.all([loadDay(), loadWeights()]);
        toast(first ? "Profil shranjen. Začni s prvim obrokom." : "Profil shranjen.");
        if (first) return setTab("hrana");
        return render();
      }
      case "w-add": {
        const kg = parseFloat(String($("#wIn").value).replace(",", "."));
        if (!kg) return toast("Vpiši težo v kilogramih.", true);
        S.weights = (await api("POST", "/api/weights", { date: today(), kg })).weights;
        const p = await api("GET", "/api/profile");
        S.profile = p.profile;
        S.targets = p.targets;
        S.pf = null;
        toast("Teža shranjena, cilji posodobljeni.");
        return render();
      }
      case "photo-add":
        return pick("bodyPhoto", async (f) => {
          try {
            const image = await fileToJpeg(f, 1400, 0.85);
            S.photos = (await api("POST", "/api/bodyphotos", { date: today(), image })).photos;
            toast("Slika shranjena.");
          } catch (err) { toast(err.message, true); }
          render();
        });
      case "photo-sel": {
        const i = S.selPhotos.indexOf(id);
        if (i >= 0) S.selPhotos.splice(i, 1);
        else S.selPhotos = [...S.selPhotos.slice(-1), id];
        S.compare = null;
        return render();
      }
      case "photo-compare":
        if (!S.status?.ai) return toast("Primerjava potrebuje ključ v Profil → Prepoznava.", true);
        S.compareBusy = true;
        render();
        try {
          S.compare = await api("POST", "/api/bodyphotos/compare", { a: S.selPhotos[0], b: S.selPhotos[1] });
        } finally {
          S.compareBusy = false;
          render();
        }
        return;
      /* nastavitve */
      case "key-save": {
        const key = String($("#keyIn").value || "").trim();
        const isGemini = (S.settings?.provider || "gemini") === "gemini";
        if (isGemini && key.length < 20) return toast("Ključ je prekratek. Kopiraj ga v celoti z aistudio.google.com.", true);
        if (!isGemini && !key.startsWith("sk-ant-")) return toast("Ključ se začne s sk-ant-. Kopiraj ga v celoti s console.anthropic.com.", true);
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", isGemini ? { geminiKey: key } : { apiKey: key })) };
        S.status.ai = true;
        S.keyBusy = true;
        render();
        try {
          await api("POST", "/api/settings/test");
          toast("Ključ shranjen in deluje.");
        } finally {
          S.keyBusy = false;
          render();
        }
        return;
      }
      case "key-test":
        S.keyBusy = true;
        render();
        try {
          await api("POST", "/api/settings/test");
          toast("Ključ deluje.");
        } finally {
          S.keyBusy = false;
          render();
        }
        return;
      case "key-remove":
        if (!(await confirmSheet("Odstranim ključ s tega telefona?", "Odstrani"))) return;
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", (S.settings?.provider || "gemini") === "gemini" ? { geminiKey: "" } : { apiKey: "" })) };
        S.status.ai = false;
        return render();
      case "provider":
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", { provider: el.dataset.v })) };
        S.status.ai = S.settings.hasKey;
        return render();
      case "model":
        S.settings = { ...S.settings, ...(await api("PUT", "/api/settings", { model: el.dataset.v })) };
        S.status.model = S.settings.model;
        return render();

      /* kopija podatkov */
      case "backup": {
        S.backupBusy = true;
        render();
        try {
          const data = await api("GET", "/api/backup");
          const json = JSON.stringify(data);
          S.backupFile = new File([json], `forma-kopija-${today()}.json`, { type: "application/json" });
        } finally {
          S.backupBusy = false;
          render();
        }
        return;
      }
      case "backup-share": {
        // Deljenje mora steči takoj ob tapu, zato je datoteka pripravljena vnaprej.
        const file = S.backupFile;
        const done = () => {
          try { localStorage.setItem("forma.lastBackup", new Date().toISOString()); } catch { /* zasebni način */ }
          S.backupFile = null;
          render();
        };
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Forma – kopija podatkov" });
            done();
            toast("Kopija shranjena.");
          } catch (err) {
            if (err?.name !== "AbortError") toast("Deljenje ni uspelo. Poskusi znova.", true);
          }
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file);
          a.download = file.name;
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 10000);
          done();
          toast("Kopija prenesena.");
        }
        return;
      }
      case "restore":
        return pick("restoreFile", async (f) => {
          try {
            const data = JSON.parse(await f.text());
            if (data?.app !== "forma") throw new Error("Ta datoteka ni kopija Forme.");
            const when = data.exported ? shortDate(data.exported.slice(0, 10)) : "neznano";
            if (!(await confirmSheet(`Zamenjam vse podatke na telefonu s kopijo z dne ${when}?`, "Zamenjaj"))) return;
            await api("POST", "/api/restore", data);
            toast("Kopija naložena.");
            setTimeout(() => location.reload(), 800);
          } catch (err) {
            toast(err.message || "Kopije ni bilo mogoče prebrati.", true);
          }
        });
      case "photo-delete-sel":
        if (!(await confirmSheet("Izbrišem izbrani sliki?"))) return;
        for (const pid of S.selPhotos) await api("DELETE", `/api/bodyphotos/${pid}`);
        S.selPhotos = [];
        S.compare = null;
        await loadPhotos();
        return render();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.pf) profileDraft()[t.dataset.pf] = t.value;
  else if (t.dataset.set != null) S.sets[+t.dataset.set][t.dataset.k] = t.value;
  else if (t.dataset.tpl) {
    const tpl = tplById(t.dataset.tpl);
    if (!tpl) return;
    if (t.dataset.ex != null) tpl.exercises[+t.dataset.ex][t.dataset.k] = t.value;
    else tpl[t.dataset.k] = t.value;
    S.planDirty = true;
  }
  else if (t.id === "exName") {
    S.exName = t.value;
    const h = $("#exHint");
    if (h) h.innerHTML = hintHTML();
  }
});

document.addEventListener("change", async (e) => {
  const t = e.target;
  try {
    if (t.id === "progEx") {
      S.progEx = t.value;
      S.progress = null;
      render();
    } else if (t.id === "dayTpl") {
      // Sprememba samo za ta dan; "__week" vrne dan na tedenski razpored.
      await api("PUT", "/api/plan/day", { date: S.date, template: t.value === "__week" ? null : t.value });
      S.cal.days = null;
      await loadDay();
      render();
    } else if (t.dataset.week) {
      S.plan.week[t.dataset.week] = t.value === "rest" ? null : t.value;
      await savePlan();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

$("#prevDay").addEventListener("click", () => setDate(addDays(S.date, -1)));
$("#nextDay").addEventListener("click", () => setDate(addDays(S.date, 1)));
$("#dateLabel").addEventListener("click", () => setDate(today()));
window.addEventListener("scroll", () => $("#top").classList.toggle("scrolled", window.scrollY > 4), { passive: true });

// Ob vrnitvi v aplikacijo po polnoči skoči na nov dan.
let lastToday = today();
/* Samodejni koraki: ob odprtju in ob vrnitvi v aplikacijo preberi korake s strežnika. */
async function syncSteps(announce = false) {
  if (!S.settings?.stepsServer) return;
  try {
    S.remoteSteps = await api("POST", "/api/steps/remote");
    if (S.remoteSteps.changed) {
      await loadDay();
      S.history = null;
    }
    if (announce) toast(S.remoteSteps.ok ? "Koraki posodobljeni." : S.remoteSteps.error, !S.remoteSteps.ok);
  } catch { /* tiho */ }
  render();
}

function showStepsGuide() {
  const url = `${S.settings.stepsServer}/sync?steps=`;
  return sheet({
    title: "Bližnjica za korake",
    body: `<div class="guide">
      <p class="small muted">Nastaviš enkrat. Potem iPhone sam pošilja korake, Forma jih pokaže ob vsakem odprtju.</p>
      <ol class="steps-guide">
        <li>Odpri aplikacijo <b>Bližnjice</b> (Shortcuts) in tapni <b>+</b>.</li>
        <li>Dodaj dejanje <b>Najdi zdravstvene vzorce</b> (Find Health Samples). Vrsta: <b>Koraki</b> (Steps). Dodaj filter <b>Datum začetka je danes</b> (Start Date is Today) in nastavi <b>Združi po: Dan</b> (Group By: Day).</li>
        <li>Dodaj dejanje <b>Pridobi vsebino URL-ja</b> (Get Contents of URL). Prilepi spodnji naslov, takoj za <code>=</code> pa vstavi spremenljivko <b>Zdravstveni vzorci</b> (Health Samples).</li>
      </ol>
      <code class="url">${esc(url)}</code>
      <button class="btn" data-act="copy-sync">Kopiraj naslov</button>
      <ol class="steps-guide" start="4">
        <li>Bližnjico poimenuj <b>Forma koraki</b> in jo enkrat zaženi s ▶. Dovoli dostop do Zdravja.</li>
        <li>Zavihek <b>Avtomatizacija</b> → <b>+</b> → <b>Ura dneva</b> (Time of Day) → izberi uro, <b>Dnevno</b>, <b>Zaženi takoj</b> (Run Immediately) → <b>Forma koraki</b>. Naredi jih več, npr. ob 10:00, 13:00, 16:00, 19:00, 21:00 in 23:55.</li>
        <li>V aplikaciji <b>Tailscale</b> vklopi <b>VPN On Demand</b>, da je povezava vedno vklopljena.</li>
      </ol>
      <button class="link" data-act="steps-off" style="justify-self:start">Izklopi samodejne korake</button>
    </div>`,
    actions: [{ label: "Zapri", value: null }, { label: "Razumem", value: true, cls: "btn-primary" }],
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncSteps();
  if (document.visibilityState === "visible" && today() !== lastToday) {
    const wasToday = S.date === lastToday;
    lastToday = today();
    if (wasToday) setDate(lastToday);
  }
});

/* ============================ ZAGON ============================ */

async function boot() {
  const hash = location.hash.slice(1);
  let saved = null;
  try { saved = localStorage.getItem("forma.tab"); } catch { /* zasebni način */ }
  S.tab = ["hrana", "gibanje", "fitnes", "profil"].includes(hash) ? hash : saved || "hrana";
  render();
  try {
    S.status = await api("GET", "/api/status");
    const p = await api("GET", "/api/profile");
    S.profile = p.profile;
    S.targets = p.targets;
    if (!S.profile) S.tab = "profil";
    S.settings = await api("GET", "/api/settings");
    await loadDay();
    syncSteps();
  } catch (e) {
    toast(e.message, true);
  }
  render();
}

boot();

// Service worker shrani aplikacijo na telefon, da se odpre tudi brez interneta.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
