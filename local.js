/* Forma na telefonu – podatki in Claude brez strežnika.
   Vse se hrani v brskalniku na telefonu (IndexedDB). Claude se kliče neposredno s telefona s tvojim ključem.
   api(method, path, body) posnema prejšnji strežnik, zato vmesnik ostane enak. */

import Anthropic from "./lib/anthropic-sdk.mjs";

/* ----------------------------- shramba ----------------------------- */

const STORES = ["kv", "meals", "blobs", "steps", "activities", "workouts", "weights", "bodyPhotos", "reviews", "dayPlan"];
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("forma", 1);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new ApiError("Shrambe na telefonu ni bilo mogoče odpreti. Ali si v zasebnem načinu brskalnika?"));
    });
  }
  return dbPromise;
}

function reqP(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = "readonly") {
  return (await openDB()).transaction(name, mode).objectStore(name);
}

const get = async (s, key) => reqP((await store(s)).get(key));
const put = async (s, key, value) => reqP((await store(s, "readwrite")).put(value, key));
const del = async (s, key) => reqP((await store(s, "readwrite")).delete(key));
const all = async (s) => reqP((await store(s)).getAll());
const clear = async (s) => reqP((await store(s, "readwrite")).clear());

async function entries(s) {
  const st = await store(s);
  const [keys, values] = await Promise.all([reqP(st.getAllKeys()), reqP(st.getAll())]);
  return keys.map((k, i) => [k, values[i]]);
}

// Prosi brskalnik, naj podatkov ne briše, ko zmanjka prostora.
navigator.storage?.persist?.().catch(() => {});

/* ----------------------------- pomožno ----------------------------- */

class ApiError extends Error {}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, "").slice(0, 12);
const localISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString().slice(0, 19);
const fromISO = (s) => new Date(s + "T12:00:00");
const isoWeekday = (s) => ((fromISO(s).getDay() + 6) % 7) + 1;

function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ApiError("Neveljaven datum.");
  return s;
}

function weekMonday(s) {
  const d = fromISO(s);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return localISO(d);
}

function isoWeekLabel(s) {
  const d = fromISO(s);
  d.setDate(d.getDate() + 4 - ((d.getDay() + 6) % 7 + 1));
  const y = d.getFullYear();
  const w = Math.ceil(((d - new Date(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-T${String(w).padStart(2, "0")}`;
}

async function dataURLToBlob(dataURL, maxSide = 0, quality = 0.82) {
  const blob = await (await fetch(dataURL)).blob();
  if (!maxSide || typeof createImageBitmap !== "function") return blob;
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  if (scale === 1) return blob;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b || blob), "image/jpeg", quality));
}

const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

const urlCache = new Map();
async function blobURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await get("blobs", id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}

async function dropBlob(id) {
  if (!id) return;
  await del("blobs", id);
  if (urlCache.has(id)) URL.revokeObjectURL(urlCache.get(id));
  urlCache.delete(id);
}

const b64 = (dataURL) => (dataURL.includes(",") ? dataURL.split(",")[1] : dataURL);
const imageBlock = (dataURL) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64(dataURL) } });

/* ----------------------------- izračuni ----------------------------- */

const ACTIVITY_FACTORS = { "sedeče": 1.2, "lahko": 1.375, "zmerno": 1.55, "zelo": 1.725, "ekstremno": 1.9 };
const METS = {
  "Hoja": 3.5, "Hitra hoja": 4.5, "Tek": 9.0, "Kolo": 7.0, "Plavanje": 7.0, "Fitnes (moč)": 5.0,
  "Pohod": 6.0, "Nogomet": 7.0, "Košarka": 6.5, "Ples": 5.0, "Joga": 2.5, "Drugo": 4.0,
};

function targetsFor(p) {
  if (!p) return null;
  const w = +p.weight, h = +p.height, a = +p.age;
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTORS[p.activity] || 1.375);
  let kcal = tdee, protein = 1.6 * w;
  if (p.goal === "hujšanje") { kcal = tdee - Math.min(500, tdee * 0.2); protein = 2.0 * w; }
  else if (p.goal === "mišice") { kcal = tdee + 250; protein = 2.0 * w; }
  const fat = (kcal * 0.27) / 9;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  const r = Math.round;
  return { bmr: r(bmr), tdee: r(tdee), kcal: r(kcal), protein: r(protein), carbs: r(carbs), fat: r(fat), steps: parseInt(p.steps_goal) || 10000 };
}

function mealTotals(items, portion) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const it of items) for (const k in t) t[k] += +it[k] || 0;
  for (const k in t) t[k] = Math.round(t[k] * portion * 10) / 10;
  return t;
}

async function mealRow(m) {
  return { ...m, photo: await blobURL(m.photo), totals: mealTotals(m.items, m.portion) };
}

const e1rm = (kg, reps) => (kg <= 0 || reps <= 0 ? 0 : reps === 1 ? kg : kg * (1 + reps / 30));

function workoutRow(w) {
  const sets = w.sets;
  return {
    ...w,
    volume: Math.round(sets.reduce((a, s) => a + s.kg * s.reps, 0) * 10) / 10,
    best_e1rm: Math.round(Math.max(0, ...sets.map((s) => e1rm(s.kg, s.reps))) * 10) / 10,
    max_kg: Math.max(0, ...sets.map((s) => s.kg)),
  };
}

const stepsKcal = (steps, weight) => steps * weight * 0.0005;

/* ----------------------------- plan ----------------------------- */

const DEFAULT_PLAN = {
  templates: [
    { id: "push", name: "Push", focus: "prsa, ramena, triceps", exercises: [
      { name: "Potisk s klopi", sets: 4, reps: "6–8" },
      { name: "Potisk z ročkami pod kotom", sets: 3, reps: "8–10" },
      { name: "Vojaški potisk", sets: 3, reps: "8–10" },
      { name: "Odročenje z ročkami", sets: 3, reps: "12–15" },
      { name: "Triceps na škripcu", sets: 3, reps: "10–12" },
      { name: "Francoski potisk", sets: 2, reps: "10–12" },
    ] },
    { id: "pull", name: "Pull", focus: "hrbet, biceps", exercises: [
      { name: "Poteg na lat napravi", sets: 4, reps: "8–10" },
      { name: "Veslanje z drogom", sets: 3, reps: "6–8" },
      { name: "Veslanje na škripcu", sets: 3, reps: "10–12" },
      { name: "Face pull", sets: 3, reps: "15" },
      { name: "Biceps upogib", sets: 3, reps: "10–12" },
      { name: "Kladivo upogib", sets: 2, reps: "12" },
    ] },
    { id: "legs", name: "Legs", focus: "noge, zadnjica", exercises: [
      { name: "Počep", sets: 4, reps: "6–8" },
      { name: "Romunski mrtvi dvig", sets: 3, reps: "8–10" },
      { name: "Potisk z nogami", sets: 3, reps: "10–12" },
      { name: "Upogibi nog", sets: 3, reps: "12" },
      { name: "Iztegi nog", sets: 3, reps: "12–15" },
      { name: "Dvig na prste", sets: 4, reps: "12–15" },
    ] },
  ],
  // ISO dan v tednu (1 = ponedeljek): PPL 3× na teden
  week: { 1: "push", 2: null, 3: "pull", 4: null, 5: "legs", 6: null, 7: null },
};

async function getPlan() {
  return (await get("kv", "plan")) || structuredClone(DEFAULT_PLAN);
}

async function planFor(date, plan, override) {
  plan = plan || (await getPlan());
  if (override === undefined) override = (await get("dayPlan", date)) ?? null;
  if (override === "rest") return { template: null, override: true, rest: true };
  const tid = override || plan.week[isoWeekday(date)];
  const tpl = plan.templates.find((t) => t.id === tid) || null;
  return { template: tpl, override: override !== null, rest: !tpl };
}

function cleanPlan(body) {
  if (!body || typeof body !== "object") throw new ApiError("Neveljaven plan.");
  const templates = [];
  for (const t of (body.templates || []).slice(0, 20)) {
    const name = String(t.name || "").trim().slice(0, 40);
    if (!name) continue;
    const id = String(t.id || "").replace(/[^\w-]/g, "") || "t" + newId();
    const exercises = [];
    for (const e of (t.exercises || []).slice(0, 20)) {
      const en = String(e.name || "").trim().slice(0, 60);
      if (!en) continue;
      exercises.push({ name: en, sets: Math.max(1, Math.min(10, parseInt(e.sets) || 3)), reps: String(e.reps || "").trim().slice(0, 12) });
    }
    templates.push({ id, name, focus: String(t.focus || "").trim().slice(0, 60), exercises });
  }
  const ids = new Set(templates.map((t) => t.id));
  const week = {};
  for (let d = 1; d <= 7; d++) week[d] = ids.has(body.week?.[d]) ? body.week[d] : null;
  return { templates, week };
}

/* ----------------------------- Claude ----------------------------- */

const DEFAULT_MODEL = "claude-opus-5-5";

async function settings() {
  const s = (await get("kv", "settings")) || {};
  return { apiKey: "", model: DEFAULT_MODEL, provider: "gemini", geminiKey: "", geminiModel: "", stepsServer: "", ...s };
}

/* ----------------------------- samodejni koraki ----------------------------- */
// Bližnjica na iPhonu pošilja korake iz Zdravja na tvoj strežnik, Forma jih od tam prebere.

function cleanServer(url) {
  let u = String(url || "").trim().replace(/\/+(sync|steps)?\/?$/, "");
  if (u && !/^https?:\/\//.test(u)) u = "https://" + u;
  return u;
}

async function syncRemoteSteps() {
  const s = await settings();
  if (!s.stepsServer) return { enabled: false };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  let j;
  try {
    const res = await fetch(`${s.stepsServer}/steps?days=62`, { signal: ctl.signal, cache: "no-store" });
    j = await res.json();
  } catch {
    return { enabled: true, ok: false, error: "Strežnik s koraki ni dosegljiv. Je Tailscale na telefonu vklopljen?", last: await get("kv", "stepsSync") };
  } finally {
    clearTimeout(timer);
  }
  let changed = false;
  for (const d of j.days || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
    const n = Math.max(0, parseInt(d.steps) || 0);
    if ((await get("steps", d.date)) !== n) { await put("steps", d.date, n); changed = true; }
  }
  const latest = (j.days || []).at(-1) || null;
  const last = { checked: nowISO(), date: latest?.date || null, time: latest?.time || null };
  await put("kv", "stepsSync", last);
  return { enabled: true, ok: true, changed, last };
}

const activeKey = (s) => (s.provider === "claude" ? s.apiKey : s.geminiKey);
const hint = (k) => (k ? "…" + k.slice(-4) : "");

/** Prepoznava: izbrani ponudnik (Gemini zastonj ali Claude). */
async function askAI(content, schema, effort = "medium") {
  const s = await settings();
  return s.provider === "claude" ? askClaude(content, schema, effort) : askGemini(content, schema);
}

/* ----------------------------- Gemini (brezplačno) ----------------------------- */

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
// Brezplačni modeli s slikami, od najboljšega naprej. Prvi, ki deluje, se zapomni.
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

const toInteraction = (content) =>
  content.map((b) => (b.type === "image" ? { type: "image", data: b.source.data, mime_type: b.source.media_type } : { type: "text", text: b.text }));
const toParts = (content) =>
  content.map((b) => (b.type === "image" ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } } : { text: b.text }));

function oldSchema(s) {
  // Starejši generateContent ne pozna additionalProperties.
  if (Array.isArray(s)) return s.map(oldSchema);
  if (!s || typeof s !== "object") return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "additionalProperties") continue;
    out[k] = k === "properties" ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, oldSchema(pv)])) : typeof v === "object" ? oldSchema(v) : v;
  }
  return out;
}

function geminiText(j) {
  const out = [];
  for (const st of j.steps || []) if (st.type === "model_output") for (const c of st.content || []) if (c.type === "text" && c.text) out.push(c.text);
  if (!out.length) for (const o of j.outputs || []) if (o.text) out.push(o.text);
  if (!out.length) for (const p of j.candidates?.[0]?.content?.parts || []) if (p.text) out.push(p.text);
  return out.join("");
}

const geminiMessage = (j) => {
  const e = Array.isArray(j) ? j[0] : j; // napake včasih pridejo zavite v seznam
  return e?.error?.message || e?.errors?.[0]?.message || "";
};

async function geminiCall(key, model, content, schema) {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  let res = await fetch(`${GEMINI}/interactions`, {
    method: "POST", headers,
    body: JSON.stringify({ model, input: toInteraction(content), response_format: { type: "text", mime_type: "application/json", schema } }),
  });
  if (res.status === 404 || res.status === 405) {
    res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: "POST", headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: toParts(content) }],
        generationConfig: { responseMimeType: "application/json", responseSchema: oldSchema(schema) },
      }),
    });
  }
  return { res, j: await res.json().catch(() => ({})) };
}

async function askGemini(content, schema) {
  const s = await settings();
  if (!s.geminiKey) throw new ApiError("Prepoznava potrebuje brezplačen ključ za Gemini. Vpiši ga v Profil → Prepoznava.");
  if (!navigator.onLine) throw new ApiError("Telefon ni povezan z internetom. Prepoznava potrebuje internet, zapisovanje deluje tudi brez.");
  const order = [s.geminiModel, ...GEMINI_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastMsg = "";
  for (const model of order) {
    let r;
    try {
      r = await geminiCall(s.geminiKey, model, content, schema);
    } catch {
      throw new ApiError("Ni povezave z Geminijem. Preveri internet na telefonu.");
    }
    const { res, j } = r;
    const msg = geminiMessage(j);
    if (res.ok && j.status !== "failed") {
      const text = geminiText(j);
      if (!text) throw new ApiError("Gemini ni vrnil odgovora (morda ga je ustavil varnostni filter). Poskusi z drugo sliko.");
      if (s.geminiModel !== model) await put("kv", "settings", { ...s, geminiModel: model });
      try {
        return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      } catch {
        throw new ApiError("Odgovor ni bil v pričakovani obliki. Poskusi znova.");
      }
    }
    if ((res.status === 400 || res.status === 401) && /api key|api_key|credential/i.test(msg)) {
      throw new ApiError("Google je zavrnil ključ. Preveri ga v Profil → Prepoznava.");
    }
    if (res.status === 403) throw new ApiError("Ta ključ nima dovoljenja za Gemini. Ustvari novega na aistudio.google.com.");
    lastMsg = msg || `napaka ${res.status}`;
    // Model ne obstaja ali za brezplačni račun nima kvote: poskusi naslednjega.
    if (res.status === 404 || (res.status === 429 && /limit: 0|not available|free tier/i.test(msg))) continue;
    if (res.status === 429) throw new ApiError("Dosegel si brezplačno mejo Gemini. Počakaj minuto (ali do jutri) in poskusi znova.");
    throw new ApiError("Gemini ni sprejel zahteve: " + lastMsg);
  }
  throw new ApiError("Noben brezplačni model Gemini ni na voljo za ta ključ: " + lastMsg);
}

function client(apiKey) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

function claudeError(e) {
  if (e instanceof Anthropic.AuthenticationError) return new ApiError("Claude je zavrnil ključ. Preveri ga v Profil → Prepoznava.");
  if (e instanceof Anthropic.PermissionDeniedError) return new ApiError("Ta ključ nima dovoljenja za Claude API. Ustvari novega na console.anthropic.com.");
  if (e instanceof Anthropic.RateLimitError) return new ApiError("Preveč zahtev naenkrat. Počakaj minuto in poskusi znova.");
  if (e instanceof Anthropic.BadRequestError) {
    if (/credit balance/i.test(e.message)) return new ApiError("Na Claude računu ni dovolj dobroimetja. Dodaj ga na console.anthropic.com → Billing.");
    return new ApiError("Claude ni sprejel zahteve: " + e.message);
  }
  if (e instanceof Anthropic.APIConnectionError) return new ApiError("Ni povezave s Claudom. Preveri internet na telefonu.");
  if (e instanceof Anthropic.APIError) return new ApiError(`Napaka Claude (${e.status ?? "?"}). Poskusi znova čez nekaj trenutkov.`);
  return e;
}

/** En klic s strukturiranim JSON odgovorom. */
async function askClaude(content, schema, effort = "medium") {
  const s = await settings();
  if (!s.apiKey) throw new ApiError("Prepoznava potrebuje tvoj ključ za Claude API. Vpiši ga v Profil → Prepoznava.");
  if (!navigator.onLine) throw new ApiError("Telefon ni povezan z internetom. Prepoznava potrebuje internet, zapisovanje deluje tudi brez.");
  const c = client(s.apiKey);
  const params = {
    model: s.model || DEFAULT_MODEL,
    max_tokens: 16000,
    output_config: { effort, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  };
  let resp;
  try {
    try {
      resp = await c.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && /fallback/i.test(e.message)) resp = await c.messages.create(params);
      else throw e;
    }
  } catch (e) {
    throw claudeError(e);
  }
  if (resp.stop_reason === "refusal") throw new ApiError("Claude te slike ni želel analizirati. Poskusi z drugo sliko.");
  const text = resp.content.find((b) => b.type === "text")?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Odgovor ni bil v pričakovani obliki. Poskusi znova.");
  }
}

function profileText(p) {
  if (!p) return "Profil uporabnika ni izpolnjen.";
  return `Uporabnik: ${p.sex === "m" ? "moški" : "ženska"}, ${p.age} let, ${p.height} cm, ${p.weight} kg, cilj: ${p.goal}, aktivnost: ${p.activity}.`;
}

const FOOD_SCHEMA = {
  type: "object",
  properties: {
    is_food: { type: "boolean" },
    dish: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" }, grams: { type: "number" }, kcal: { type: "number" },
          protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" },
        },
        required: ["name", "grams", "kcal", "protein", "carbs", "fat"],
        additionalProperties: false,
      },
    },
    confidence: { type: "string", enum: ["nizka", "srednja", "visoka"] },
    note: { type: "string" },
  },
  required: ["is_food", "dish", "items", "confidence", "note"],
  additionalProperties: false,
};

const foodPrompt = (meal, extra) => `Na sliki je obrok (${meal}). Prepoznaj vsako živilo, oceni količino v gramih in izračunaj kalorije ter makrohranila (beljakovine, ogljikovi hidrati, maščobe v gramih) za vsako živilo posebej.

Pri oceni količine uporabi velikost krožnika, pribora, rok ali embalaže kot merilo. Upoštevaj skrite kalorije (olje za pripravo, omake, maslo), kadar je to verjetno. Imena piši v slovenščini.
- dish: kratko ime obroka, npr. "Ovsena kaša z banano".
- confidence: kako zanesljiva je ocena.
- note: en kratek stavek, kaj je bilo težko oceniti ali kaj bi lahko bilo drugače (npr. "Količina olja ni vidna.").
- Če na sliki ni hrane, nastavi is_food na false, items pusti prazen in v note napiši, kaj vidiš.
${extra}`;

const EXERCISE_SCHEMA = {
  type: "object",
  properties: {
    recognized: { type: "boolean" }, name_sl: { type: "string" }, name_en: { type: "string" }, equipment: { type: "string" },
    muscles: { type: "array", items: { type: "string" } }, rating: { type: "integer" },
    good: { type: "array", items: { type: "string" } }, mistakes: { type: "array", items: { type: "string" } },
    tips: { type: "array", items: { type: "string" } }, summary: { type: "string" },
  },
  required: ["recognized", "name_sl", "name_en", "equipment", "muscles", "rating", "good", "mistakes", "tips", "summary"],
  additionalProperties: false,
};

const exerciseVideoPrompt = (n, extra) => `To je ${n} zaporednih sličic iz videa, na katerem uporabnik izvaja vajo v fitnesu (od začetka do konca, v časovnem zaporedju).

1. Prepoznaj vajo: slovensko ime (name_sl), angleško ime (name_en) in opremo (equipment).
2. Naštej glavne mišice, ki jih vaja obremenjuje (slovensko).
3. Oceni tehniko od 1 do 10 (rating). Bodi pošten in konkreten.
4. good: kaj dela dobro. mistakes: konkretne napake v drži, obsegu giba, tempu ali položaju (prazen seznam, če jih ni). tips: kratka, praktična navodila za popravek, kot bi jih dal trener ob strani.
5. summary: dva stavka povzetka.
Če iz sličic ne moreš zanesljivo videti kakšnega dela giba, to povej v summary, ne ugibaj. Če na sličicah ni vaje, nastavi recognized na false.
Piši v slovenščini.
${extra}`;

const exercisePhotoPrompt = (extra) => `Na sliki je naprava ali oprema v fitnesu (ali oseba med vajo).

1. Prepoznaj napravo/vajo: slovensko ime glavne vaje (name_sl), angleško ime (name_en), opremo (equipment).
2. Naštej mišice, ki jih ta vaja obremenjuje (slovensko).
3. rating: če je na sliki oseba med vajo, oceni držo 1–10; če je samo naprava, nastavi 0.
4. good: prazen seznam, razen če je na sliki oseba z dobro držo.
5. mistakes: najpogostejše napake pri tej vaji, na katere naj začetnik pazi.
6. tips: kako napravo nastaviti in vajo pravilno izvesti, korak za korakom (3–6 kratkih točk).
7. summary: dva stavka, za kaj je naprava in kako začeti (priporočeno število ponovitev za začetnika).
Če naprave ne prepoznaš, nastavi recognized na false. Piši v slovenščini.
${extra}`;

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["premalo", "ravno prav", "preveč"] },
    headline: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    tomorrow: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "headline", "points", "tomorrow"],
  additionalProperties: false,
};

const COMPARE_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" }, changes: { type: "array", items: { type: "string" } }, caveats: { type: "string" } },
  required: ["summary", "changes", "caveats"],
  additionalProperties: false,
};

/* ----------------------------- poti ----------------------------- */

const routes = [];
const route = (method, pattern, fn) => routes.push([method, new RegExp(`^${pattern}$`), fn]);

const getProfile = () => get("kv", "profile");

route("GET", "/api/status", async () => {
  const s = await settings();
  return { app: "forma", ai: !!activeKey(s), provider: s.provider, model: s.model || DEFAULT_MODEL, profile: !!(await getProfile()) };
});

route("GET", "/api/profile", async () => {
  const p = await getProfile();
  return { profile: p || null, targets: targetsFor(p) };
});

route("PUT", "/api/profile", async (q, body) => {
  const p = { ...body };
  for (const k of ["age", "height", "weight"]) {
    p[k] = parseFloat(String(p[k]).replace(",", "."));
    if (!p[k]) throw new ApiError("Izpolni starost, višino in težo.");
  }
  await put("kv", "profile", p);
  await put("weights", localISO(), p.weight);
  return { profile: p, targets: targetsFor(p) };
});

async function dayData(date) {
  const [meals, steps, acts, wos, review, p] = await Promise.all([
    all("meals"), get("steps", date), all("activities"), all("workouts"), get("reviews", date), getProfile(),
  ]);
  const dayMeals = await Promise.all(meals.filter((m) => m.date === date).sort((a, b) => a.created.localeCompare(b.created)).map(mealRow));
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of dayMeals) for (const k in totals) totals[k] += m.totals[k];
  for (const k in totals) totals[k] = Math.round(totals[k]);
  return {
    date, meals: dayMeals, totals, steps: steps || 0,
    activities: acts.filter((a) => a.date === date),
    workouts: wos.filter((w) => w.date === date).sort((a, b) => a.created.localeCompare(b.created)).map(workoutRow),
    review: review || null, targets: targetsFor(p), weight: p ? +p.weight : 70,
    plan: await planFor(date),
  };
}

route("GET", "/api/day", (q) => dayData(validDate(q.get("date"))));

route("POST", "/api/meals/analyze", async (q, body) => {
  const date = validDate(body.date);
  const mealType = body.meal_type || "Prigrizek";
  const extra = body.note ? `Uporabnikova opomba: ${body.note}` : "";
  const res = await askAI([imageBlock(body.image), { type: "text", text: foodPrompt(mealType.toLowerCase(), extra) }], FOOD_SCHEMA);
  if (!res.is_food) throw new ApiError(res.note || "Na sliki ni prepoznane hrane.");
  const photo = newId();
  await put("blobs", photo, await dataURLToBlob(body.image, 800));
  const m = { id: newId(), date, created: nowISO(), meal_type: mealType, photo, dish: res.dish, items: res.items, confidence: res.confidence, note: res.note, portion: 1 };
  await put("meals", m.id, m);
  return mealRow(m);
});

route("PATCH", "/api/meals/(\\w+)", async (q, body, id) => {
  const m = await get("meals", id);
  if (!m) throw new ApiError("Obrok ne obstaja.");
  if ("portion" in body) m.portion = Math.max(0.1, Math.min(5, +body.portion));
  if ("meal_type" in body) m.meal_type = String(body.meal_type);
  await put("meals", id, m);
  return mealRow(m);
});

route("DELETE", "/api/meals/(\\w+)", async (q, body, id) => {
  const m = await get("meals", id);
  await del("meals", id);
  if (m) await dropBlob(m.photo);
  return { ok: true };
});

route("POST", "/api/day/review", async (q, body) => {
  const date = validDate(body.date);
  const day = await dayData(date);
  const t = day.targets;
  if (!t) throw new ApiError("Najprej izpolni profil, da vem, koliko potrebuješ.");
  const mealsTxt = day.meals.map((m) => `- ${m.meal_type}: ${m.dish} (${Math.round(m.totals.kcal)} kcal, B ${Math.round(m.totals.protein)} g, OH ${Math.round(m.totals.carbs)} g, M ${Math.round(m.totals.fat)} g)`).join("\n") || "- nič zabeleženega";
  const moveKcal = stepsKcal(day.steps, day.weight) + day.activities.reduce((a, x) => a + x.kcal, 0);
  const woTxt = day.workouts.map((w) => w.exercise).join(", ") || "brez treninga";
  const prompt = `${profileText(await getProfile())}
Dnevni cilji: ${t.kcal} kcal, beljakovine ${t.protein} g, OH ${t.carbs} g, maščobe ${t.fat} g, ${t.steps} korakov.

Danes (${date}) je pojedel:
${mealsTxt}
Skupaj: ${day.totals.kcal} kcal, B ${day.totals.protein} g, OH ${day.totals.carbs} g, M ${day.totals.fat} g.
Gibanje: ${day.steps} korakov, aktivnosti in koraki skupaj približno ${Math.round(moveKcal)} kcal. Trening: ${woTxt}.

Oceni dan glede na cilj uporabnika. verdict: ali je pojedel premalo, ravno prav ali preveč (glede na kalorije in cilj). headline: en jasen stavek. points: 2–4 konkretne ugotovitve (npr. premalo beljakovin za 40 g). tomorrow: 1–3 konkretni predlogi za jutri z živili. Če manjkajo obroki, upoštevaj, da jih morda ni zabeležil. Piši v slovenščini, kratko in neposredno.`;
  const res = await askAI([{ type: "text", text: prompt }], REVIEW_SCHEMA, "low");
  res.created = nowISO();
  await put("reviews", date, res);
  return res;
});

route("PUT", "/api/steps", async (q, body) => {
  const date = validDate(body.date);
  const steps = Math.max(0, parseInt(body.steps) || 0);
  await put("steps", date, steps);
  return { steps };
});

route("POST", "/api/activities", async (q, body) => {
  const date = validDate(body.date);
  const type = METS[body.type] ? body.type : "Drugo";
  const minutes = Math.max(1, Math.min(600, parseInt(body.minutes) || 0));
  const p = await getProfile();
  const a = { id: newId(), date, type, minutes, kcal: Math.round((METS[type] * (p ? +p.weight : 70) * minutes) / 60) };
  await put("activities", a.id, a);
  return a;
});

route("DELETE", "/api/activities/(\\w+)", async (q, body, id) => {
  await del("activities", id);
  return { ok: true };
});

route("GET", "/api/history", async (q) => {
  const end = fromISO(validDate(q.get("end")));
  const days = Math.max(1, Math.min(60, parseInt(q.get("days")) || 7));
  const [steps, meals] = await Promise.all([entries("steps"), all("meals")]);
  const stepMap = Object.fromEntries(steps);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = localISO(d);
    const dm = meals.filter((m) => m.date === iso).map((m) => mealTotals(m.items, m.portion));
    out.push({
      date: iso, steps: stepMap[iso] || 0,
      kcal: Math.round(dm.reduce((a, t) => a + t.kcal, 0)), protein: Math.round(dm.reduce((a, t) => a + t.protein, 0)),
    });
  }
  return { days: out };
});

route("POST", "/api/exercise/analyze", async (q, body) => {
  const frames = body.frames || [];
  if (!frames.length || frames.length > 12) throw new ApiError("Pošlji od 1 do 12 sličic.");
  const extra = body.note ? `Uporabnikova opomba: ${body.note}` : "";
  const text = body.mode === "photo" ? exercisePhotoPrompt(extra) : exerciseVideoPrompt(frames.length, extra);
  const res = await askAI([...frames.map(imageBlock), { type: "text", text }], EXERCISE_SCHEMA);
  if (!res.recognized) throw new ApiError(res.summary || "Vaje ali naprave ni bilo mogoče prepoznati. Poskusi z boljšo svetlobo ali od strani.");
  return res;
});

route("POST", "/api/workouts", async (q, body) => {
  const date = validDate(body.date);
  const exercise = String(body.exercise || "").trim();
  if (!exercise) throw new ApiError("Vpiši ime vaje.");
  const sets = (body.sets || [])
    .map((s) => ({ kg: Math.max(0, parseFloat(s.kg) || 0), reps: Math.max(0, parseInt(s.reps) || 0) }))
    .filter((s) => s.reps > 0);
  if (!sets.length) throw new ApiError("Dodaj vsaj en set s ponovitvami.");
  const prev = (await all("workouts")).filter((w) => w.exercise.toLowerCase() === exercise.toLowerCase()).map(workoutRow);
  const w = { id: newId(), date, created: nowISO(), exercise, sets, note: body.note || "" };
  await put("workouts", w.id, w);
  const row = workoutRow(w);
  row.pr = prev.length > 0 && row.best_e1rm > Math.max(...prev.map((x) => x.best_e1rm));
  return row;
});

route("DELETE", "/api/workouts/(\\w+)", async (q, body, id) => {
  await del("workouts", id);
  return { ok: true };
});

route("GET", "/api/exercises", async () => {
  const wos = (await all("workouts")).sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  const seen = new Map();
  for (const w of wos) {
    const k = w.exercise.toLowerCase();
    if (!seen.has(k)) seen.set(k, { name: w.exercise, last: w.date, count: 0, last_sets: w.sets });
    seen.get(k).count++;
  }
  return { exercises: [...seen.values()] };
});

route("GET", "/api/progress", async (q) => {
  const name = (q.get("exercise") || "").toLowerCase();
  const rows = (await all("workouts")).sort((a, b) => (a.date + a.created).localeCompare(b.date + b.created)).map(workoutRow);
  const weeks = new Map();
  for (const w of rows) {
    const wk = weekMonday(w.date);
    if (!weeks.has(wk)) weeks.set(wk, { week: wk, label: isoWeekLabel(w.date), days: new Set(), sets: 0, volume: 0 });
    const s = weeks.get(wk);
    s.days.add(w.date);
    s.sets += w.sets.length;
    s.volume += w.volume;
  }
  const summary = [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-12)
    .map((v) => ({ week: v.week, label: v.label, days: v.days.size, sets: v.sets, volume: Math.round(v.volume) }));
  let series = [], history = [];
  if (name) {
    const ex = rows.filter((w) => w.exercise.toLowerCase() === name);
    const byWeek = new Map();
    for (const w of ex) {
      const wk = weekMonday(w.date);
      if (!byWeek.has(wk)) byWeek.set(wk, { week: wk, label: isoWeekLabel(w.date), best_e1rm: 0, max_kg: 0, volume: 0 });
      const b = byWeek.get(wk);
      b.best_e1rm = Math.max(b.best_e1rm, w.best_e1rm);
      b.max_kg = Math.max(b.max_kg, w.max_kg);
      b.volume = Math.round(b.volume + w.volume);
    }
    series = [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-12);
    history = ex.reverse().slice(0, 10);
  }
  return { summary, series, history };
});

async function weightsList() {
  const list = (await entries("weights")).map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
  return { weights: list.slice(-60) };
}

route("GET", "/api/weights", weightsList);

route("POST", "/api/weights", async (q, body) => {
  const date = validDate(body.date);
  const kg = parseFloat(body.kg) || 0;
  if (kg < 25 || kg > 350) throw new ApiError("Vpiši težo v kilogramih.");
  await put("weights", date, kg);
  const p = await getProfile();
  const latest = (await weightsList()).weights.at(-1);
  if (p && latest?.date === date) await put("kv", "profile", { ...p, weight: kg });
  return weightsList();
});

async function photosList() {
  const list = (await all("bodyPhotos")).sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created));
  return { photos: await Promise.all(list.map(async (p) => ({ id: p.id, date: p.date, note: p.note, url: await blobURL(p.blob) }))) };
}

route("GET", "/api/bodyphotos", photosList);

route("POST", "/api/bodyphotos", async (q, body) => {
  const date = validDate(body.date);
  const blob = newId();
  await put("blobs", blob, await dataURLToBlob(body.image));
  const id = newId();
  await put("bodyPhotos", id, { id, date, blob, note: body.note || "", created: nowISO() });
  return photosList();
});

route("DELETE", "/api/bodyphotos/(\\w+)", async (q, body, id) => {
  const p = await get("bodyPhotos", id);
  await del("bodyPhotos", id);
  if (p) await dropBlob(p.blob);
  return { ok: true };
});

route("POST", "/api/bodyphotos/compare", async (q, body) => {
  const rows = (await Promise.all([get("bodyPhotos", body.a), get("bodyPhotos", body.b)])).filter(Boolean);
  if (rows.length !== 2) throw new ApiError("Izberi dve sliki.");
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const blocks = [];
  for (const r of rows) {
    blocks.push({ type: "text", text: `Slika z dne ${r.date}:` });
    blocks.push(imageBlock(await blobToDataURL(await get("blobs", r.blob))));
  }
  const days = Math.round((fromISO(rows[1].date) - fromISO(rows[0].date)) / 86400000);
  blocks.push({
    type: "text",
    text: `${profileText(await getProfile())}
To sta dve sliki postave istega uporabnika, posneti v razmiku ${days} dni, za spremljanje napredka v fitnesu.
Primerjaj ju stvarno in spoštljivo: vidne spremembe v mišičnem tonusu, definiciji (ramena, roke, trebuh, noge), drži in obliki telesa.
summary: dva stavka skupne ocene. changes: konkretne vidne razlike (ali "ni opazne razlike" pri posameznem delu). caveats: kaj otežuje primerjavo (svetloba, kot, oblačila, razdalja).
Ne ocenjuj privlačnosti. Piši v slovenščini.`,
  });
  return askAI(blocks, COMPARE_SCHEMA);
});

route("GET", "/api/plan", getPlan);

route("PUT", "/api/plan", async (q, body) => {
  const plan = cleanPlan(body);
  await put("kv", "plan", plan);
  return plan;
});

route("PUT", "/api/plan/day", async (q, body) => {
  const date = validDate(body.date);
  const tid = body.template ?? null;
  if (tid === null) await del("dayPlan", date);
  else {
    if (tid !== "rest" && !(await getPlan()).templates.some((t) => t.id === tid)) throw new ApiError("Ta trening ne obstaja.");
    await put("dayPlan", date, tid);
  }
  return planFor(date);
});

route("GET", "/api/calendar", async (q) => {
  const month = q.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) throw new ApiError("Neveljaven mesec.");
  const [plan, overrides, wos] = await Promise.all([getPlan(), entries("dayPlan"), all("workouts")]);
  const ov = Object.fromEntries(overrides);
  const done = {};
  for (const w of wos) if (w.date.startsWith(month)) done[w.date] = (done[w.date] || 0) + 1;
  const first = fromISO(month + "-01");
  const days = [];
  for (const d = new Date(first); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
    const iso = localISO(d);
    const p = await planFor(iso, plan, ov[iso] ?? null);
    days.push({ date: iso, template: p.template?.id || null, override: p.override, done: done[iso] || 0 });
  }
  return { month, days };
});

/* ---------- nastavitve in varnostna kopija ---------- */

route("GET", "/api/settings", async () => {
  const s = await settings();
  let usage = null;
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) usage = { used: est.usage, quota: est.quota };
  } catch { /* ni podatka */ }
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* ni podatka */ }
  return { ...publicSettings(s), usage, persisted };
});

function publicSettings(s) {
  return {
    provider: s.provider, model: s.model || DEFAULT_MODEL,
    hasKey: !!activeKey(s), keyHint: hint(activeKey(s)),
    hasClaudeKey: !!s.apiKey, hasGeminiKey: !!s.geminiKey,
    stepsServer: s.stepsServer,
  };
}

route("POST", "/api/steps/remote", syncRemoteSteps);

route("PUT", "/api/settings", async (q, body) => {
  const s = await settings();
  if (body.provider === "claude" || body.provider === "gemini") s.provider = body.provider;
  if ("apiKey" in body) s.apiKey = String(body.apiKey || "").trim();
  if ("geminiKey" in body) { s.geminiKey = String(body.geminiKey || "").trim(); s.geminiModel = ""; }
  if ("model" in body && ["claude-opus-5-5", "claude-sonnet-5-5"].includes(body.model)) s.model = body.model;
  if ("stepsServer" in body) s.stepsServer = cleanServer(body.stepsServer);
  await put("kv", "settings", s);
  return publicSettings(s);
});

route("POST", "/api/settings/test", async () => {
  const s = await settings();
  if (!activeKey(s)) throw new ApiError("Ključ ni vpisan.");
  if (s.provider === "gemini") {
    // Seznam modelov je brezplačen klic, samo preveri ključ.
    let res;
    try {
      res = await fetch(`${GEMINI}/models?pageSize=5`, { headers: { "x-goog-api-key": s.geminiKey } });
    } catch {
      throw new ApiError("Ni povezave z Geminijem. Preveri internet na telefonu.");
    }
    if (!res.ok) {
      const msg = geminiMessage(await res.json().catch(() => ({})));
      throw new ApiError(res.status === 400 || res.status === 403 ? "Google je zavrnil ključ. Preveri, ali si ga kopiral v celoti." : `Napaka Gemini (${res.status}): ${msg}`);
    }
    return { ok: true };
  }
  try {
    await client(s.apiKey).models.list({ limit: 1 }); // brezplačen klic, samo preveri ključ
  } catch (e) {
    throw claudeError(e);
  }
  return { ok: true };
});

const BACKUP_STORES = ["meals", "steps", "activities", "workouts", "weights", "bodyPhotos", "reviews", "dayPlan"];

route("GET", "/api/backup", async () => {
  const data = { kv: {} };
  for (const k of ["profile", "plan"]) data.kv[k] = (await get("kv", k)) ?? null;
  for (const s of BACKUP_STORES) data[s] = await entries(s);
  data.blobs = await Promise.all((await entries("blobs")).map(async ([k, b]) => [k, await blobToDataURL(b)]));
  return { app: "forma", version: 1, exported: nowISO(), data }; // ključ za Claude namenoma ni v kopiji
});

route("POST", "/api/restore", async (q, body) => {
  if (body?.app !== "forma" || !body.data) throw new ApiError("To ni kopija Forme.");
  const d = body.data;
  for (const s of [...BACKUP_STORES, "blobs"]) await clear(s);
  for (const k of ["profile", "plan"]) {
    if (d.kv?.[k]) await put("kv", k, d.kv[k]);
    else await del("kv", k);
  }
  for (const s of BACKUP_STORES) for (const [k, v] of d[s] || []) await put(s, k, v);
  for (const [k, url] of d.blobs || []) await put("blobs", k, await dataURLToBlob(url));
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  return { ok: true };
});

/* ----------------------------- vhod ----------------------------- */

export async function api(method, path, body) {
  const url = new URL(path, location.href);
  for (const [m, rx, fn] of routes) {
    if (m !== method) continue;
    const match = url.pathname.replace(/^.*?(\/api\/)/, "/api/").match(rx);
    if (match) {
      try {
        return await fn(url.searchParams, body || {}, ...match.slice(1));
      } catch (e) {
        if (e instanceof ApiError) throw e;
        console.error(e);
        throw new Error(e?.message ? "Napaka: " + e.message : "Prišlo je do napake.");
      }
    }
  }
  throw new Error("Ni najdeno: " + path);
}
