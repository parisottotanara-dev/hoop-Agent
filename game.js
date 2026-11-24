/* Hoop Agent — gioco manageriale: sei un procuratore sportivo nel basket americano.
   Squadre e giocatori sono inventati. Tutto gira nel browser, salvataggio in localStorage. */
'use strict';

/* ================================================================== */
/* Utilità                                                             */
/* ================================================================== */
const SAVE_KEY = 'superAgenteNBA.save.v2';
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const chance = p => Math.random() < p;
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtM = m => '$' + r1(m).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
function fmt$(d) {
  const s = d < 0 ? '-' : ''; d = Math.abs(d);
  if (d >= 1e6) return s + '$' + (d / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + 'M';
  if (d >= 1e3) return s + '$' + (d < 1e4 ? (d / 1e3).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : Math.round(d / 1e3).toLocaleString('it-IT')) + 'k';
  return s + '$' + Math.round(d);
}

/* ================================================================== */
/* Costanti di gioco                                                   */
/* ================================================================== */
const CAP = 140;          // salary cap (milioni)
const MIN_SAL = 1.2;      // contratto minimo
const MID_LEVEL = 12;     // eccezione per squadre sopra il cap
const MAX_SAL = 50;
const REG_WEEKS = 20, FA_WEEKS = 3;
const TURNS_PER_YEAR = FA_WEEKS + REG_WEEKS + 2;
const SPONSOR_CUT = 0.15; // percentuale dell'agente sugli sponsor
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const POS_IT = { PG: 'Playmaker', SG: 'Guardia', SF: 'Ala piccola', PF: 'Ala grande', C: 'Centro' };

const RIVALS = ['Apex Sports Group', 'Stellar Management', 'Prime Hoops Agency', 'Northline Talent'];
// TEAMS, BRANDS, CELEBS, STARS e VIP_PLAYERS sono in names.js; EVENTS in events.js; grafica in art.js
const COLLEGES = ['Univ. Bluewater', 'State Tech', 'Riverside College', 'Northern Pines', 'Coastal Univ.',
  'Lakeshore', 'Desert State', 'Mountain View U.', 'Ironwood College', 'Real Madrid B (Spagna)',
  'Olimpia Juniores (Italia)', 'Partizan Youth (Serbia)', 'ASVEL Espoirs (Francia)', 'G-League Ignite', 'Liceo Oak Ridge'];
const FIRST = ['Jalen', 'Marcus', 'Tyrese', 'DeShawn', 'Malik', 'Jordan', 'Caleb', 'Isaiah', 'Andre', 'Darius',
  'Trey', 'Kobe', 'Luca', 'Matteo', 'Nikola', 'Marko', 'Theo', 'Elijah', 'Cameron', 'Xavier', 'Brandon', 'Devin',
  'Zion', 'Amir', 'Jaylen', 'Omar', 'Tariq', 'Reggie', 'Kevin', 'Chris', 'Mason', 'Noah', 'Gabriel', 'Ousmane',
  'Lorenzo', 'Dante', 'Victor', 'Kai', 'Miles', 'Jamal', 'Terrence', 'Rashad', 'Quentin', 'Hugo', 'Aleksej', 'Pau'];
const LAST = ['Johnson', 'Williams', 'Carter', 'Brooks', 'Bennett', 'Harris', 'Coleman', 'Walker', 'Mitchell',
  'Rossi', 'Bianchi', 'Jovic', 'Petrovic', 'Diallo', 'Moreau', 'Okafor', 'Simmons', 'Hayes', 'Freeman', 'Reed',
  'Barnes', 'Fontana', 'Greene', 'Thompson', 'Wallace', 'Price', 'Holloway', 'Banks', 'Dalton', 'Ivanov', 'Silva',
  'Ndiaye', 'Morgan', 'Bryant', 'Kowalski', 'Ramirez', 'Lindqvist', 'Fischer', 'Okoro', 'Sullivan', 'Gatti', 'Marino'];

/* ================================================================== */
/* Stato                                                               */
/* ================================================================== */
let S = null; // stato di gioco

const P = id => S.players[id];
const clients = () => S.clients.map(P).filter(Boolean);
const teamOf = p => (p && p.team != null ? S.teams[p.team] : null);
const teamName = t => t ? `${t.city} ${t.name}` : '—';
const rosterOf = tid => Object.values(S.players).filter(p => p.team === tid && !p.retired);
const payroll = tid => rosterOf(tid).reduce((s, p) => s + p.salary, 0);
const isClient = p => S.clients.includes(p.id);
const seasonLabel = () => `${S.season}-${String((S.season + 1) % 100).padStart(2, '0')}`;
const capacity = () => 4 + S.staff.office * 3;

// quanto piace alle squadre al di là dei numeri: fisso per ogni giocatore
const newAppeal = () => Math.round((Math.random() + Math.random() - 1) * 12) / 100;
/* ---------- Nazionalità ---------- */
function pickNat() {
  const list = Object.entries(NATIONS).filter(([, n]) => n.w > 0), tot = list.reduce((s, [, n]) => s + n.w, 0);
  let x = Math.random() * tot;
  for (const [k, n] of list) { x -= n.w; if (x <= 0) return k; }
  return 'USA';
}
const natName = p => (NATIONS[p.nat] || NATIONS.USA).name;
const nameFor = nat => { const n = NATIONS[nat] && NATIONS[nat].first.length ? NATIONS[nat] : NATIONS.USA; return `${pick(n.first)} ${pick(n.last)}`; };
function setNat(p, nat, rename = true) { p.nat = nat; if (rename && !p.star && !p.vip) p.name = nameFor(nat); }
const US_SCHOOLS = COLLEGES.filter(c => !CLUB_NAT[c]);
// dove gioca prima del Draft, coerente con il paese: gli europei spesso restano nei club di casa
function schoolFor(p) {
  const club = Object.keys(CLUB_NAT).find(c => CLUB_NAT[c] === p.nat);
  if (club && chance(0.55)) return club;
  return pick(US_SCHOOLS);
}
// salvataggi vecchi: la nazionalità si ricava da squadra giovanile, storia o cognome
function inferNat(p) {
  if (STAR_NAT[p.name]) return STAR_NAT[p.name];
  if (p.school && CLUB_NAT[p.school]) return CLUB_NAT[p.school];
  if (p.star || p.vip) return 'USA';
  if (p.story) for (const [k, n] of Object.entries(NATIONS)) if (k !== 'USA' && n.places.some(pl => p.story.includes(pl))) return k;
  const last = p.name.split(' ').slice(-1)[0];
  for (const [k, n] of Object.entries(NATIONS)) if (k !== 'USA' && n.last.includes(last)) return k;
  return 'USA';
}
function newPlayer(kind) {
  const age = kind === 'prospect' ? randi(18, 22) : randi(21, 34);
  const p = {
    id: S.nextId++, name: '', nat: 'USA', pos: pick(POS), age,
    ovr: 60, pot: 70, team: null, salary: 0, years: 0, comm: 3, morale: 70, hype: 10, appeal: newAppeal(),
    agency: null, noise: gauss(), noise2: gauss(), teamNoise: gauss(), scouted: false,
    injury: 0, sponsors: [], refusals: 0, lockedUntil: 0, lastPitch: -1, lastContact: -1,
    gp: 0, pts: 0, reb: 0, ast: 0, school: null, rookieSeason: null,
    career: { titles: 0, allstar: 0, mvp: 0, roy: 0, seasons: 0 },
    num: pick(NUMBERS), look: genLook(), traits: genTraits(),
  };
  setNat(p, pickNat());
  genBody(p);
  return p;
}
function growPot(p) {
  const room = Math.max(0, 27 - p.age);
  p.pot = clamp(Math.round(p.ovr + room * rand(0.6, 3.2)), p.ovr, 99);
}

/* Valore di mercato (stipendio annuo "giusto", in milioni) */
function marketValue(p) {
  let o = p.ovr;
  if (p.age < 25) o += (p.pot - p.ovr) * 0.15;
  if (p.age > 31) o -= (p.age - 31) * 1.3;
  const x = clamp((o - 58) / 37, 0, 1.15);
  // conta anche quanto è famoso, come gioca davvero e quanto piace alle squadre (ognuno ha il suo mercato)
  const ppg = p.gp >= 10 ? p.pts / p.gp : null;
  const prod = ppg == null ? 0 : clamp((ppg - Math.max(2, (p.ovr - 45) * 0.42)) / 60, -0.08, 0.1);
  const fame = clamp(((p.hype || 0) - 25) / 500, -0.04, 0.12);
  return clamp(r1((MIN_SAL + 54 * Math.pow(x, 2.1)) * (1 + (p.appeal || 0) + prod + fame)), MIN_SAL, MAX_SAL);
}

function scoutSD() { return Math.max(1.5, 9 - S.staff.scout * 1.5); }
function shownOvr(p) {
  if (p.team != null || isClient(p) || p.scouted || !p.school) return p.ovr;
  return clamp(Math.round(p.ovr + p.noise2 * scoutSD() * 0.5), 30, 99);
}
function shownPot(p) {
  if (!p.school) return p.pot;
  const k = isClient(p) || p.scouted ? 0.25 : 1;
  // se l'informatore ne sa più dello scout, vale la sua stima
  if (!isClient(p) && p.intelPot != null && p.intelSd < scoutSD() * k) return clamp(p.intelPot, shownOvr(p), 99);
  return clamp(Math.round(p.pot + p.noise * scoutSD() * k), shownOvr(p), 99);
}
const exact = p => isClient(p) || p.scouted || !p.school;
// valore come lo percepisci tu (per i prospetti si basa sulle stime dello scout)
const shownValue = p => exact(p) ? marketValue(p) : marketValue({ ...p, ovr: shownOvr(p), pot: shownPot(p) });

function newGame(agencyName, agentName) {
  S = {
    v: 2, namesV: 2, agency: agencyName || 'Hoop Dreams Agency', agent: agentName || 'Agente',
    cash: 300000, rep: 15, season: 2026, phase: 'fa', week: 1, turn: 0,
    staff: { scout: 0, legal: 0, marketing: 0, office: 0, informer: 0, hq: 0, academy: 0, center: 0 }, intel: [],
    teams: TEAMS.map((t, i) => ({ id: i, city: t[0], name: t[1], abbr: t[2], market: t[3], color: t[4], color2: t[5], w: 0, l: 0 })),
    players: {}, clients: [], offers: [], inbox: [], news: [], nextId: 1, nextEv: 1,
    goals: {}, debtWeeks: 0, history: [], lastChampion: null, over: false,
    seasonIncome: 0, seasonExpense: 0, recentEv: [], tutorialDone: false, teamRel: {}, brandRel: {}, talks: {},
  };
  // squadre: prima le star (nomi parodia, nella loro squadra), poi giocatori inventati
  const slots = [84, 79, 76, 73, 71, 69, 67, 65, 63, 61, 59, 57, 55];
  for (const t of S.teams) {
    const boost = gauss() * 2.5;
    const stars = STARS.filter(x => x[1] === t.abbr);
    for (const [name, , pos, age, ovr, num] of stars) {
      const p = newPlayer('pro');
      Object.assign(p, { name, pos, age, ovr, num, team: t.id, star: true, nat: STAR_NAT[name] || 'USA' }); genBody(p);
      growPot(p);
      p.salary = clamp(r1(marketValue(p) * rand(0.9, 1.1)), MIN_SAL, MAX_SAL);
      p.years = randi(1, 4);
      p.agency = pick(RIVALS);
      p.hype = clamp(Math.round((ovr - 70) * 2.5), 10, 80);
      p.career.seasons = Math.max(0, age - 20);
      S.players[p.id] = p;
    }
    for (const base of slots.slice(stars.length)) {
      const p = newPlayer('pro');
      p.ovr = clamp(Math.round(base + boost + gauss() * 4), 45, 97);
      growPot(p);
      p.team = t.id;
      p.salary = clamp(r1(marketValue(p) * rand(0.75, 1.15)), MIN_SAL, MAX_SAL);
      p.years = randi(1, 4);
      p.agency = chance(0.85) ? pick(RIVALS) : null;
      p.career.seasons = Math.max(0, p.age - 21);
      S.players[p.id] = p;
    }
  }
  // free agent iniziali
  for (let i = 0; i < 45; i++) {
    const p = newPlayer('pro');
    p.ovr = clamp(Math.round(62 + gauss() * 6), 48, 82);
    growPot(p);
    p.agency = chance(0.6) ? pick(RIVALS) : null;
    p.career.seasons = Math.max(0, p.age - 21);
    S.players[p.id] = p;
  }
  // personaggi famosi che giocano: metà free agent, metà prospetti
  const vips = shuffle([...VIP_PLAYERS]);
  const kidName = vips.pop();
  vips.forEach((name, i) => {
    const p = newPlayer(i % 2 ? 'prospect' : 'pro');
    p.name = name; p.vip = true; p.hype = 35; p.nat = STAR_NAT[name] || 'USA';
    if (i % 2) { p.ovr = randi(52, 66); p.pot = clamp(p.ovr + randi(8, 25), p.ovr + 3, 95); p.school = schoolFor(p); }
    else { p.ovr = randi(58, 74); growPot(p); p.career.seasons = Math.max(0, p.age - 21); }
    p.agency = chance(0.4) ? pick(RIVALS) : null;
    S.players[p.id] = p;
  });
  genDraftClass();
  // clienti iniziali
  const vet = newPlayer('pro');
  Object.assign(vet, { age: randi(24, 29), ovr: randi(68, 73), team: randi(0, 29), years: 2, comm: 3, morale: 75 });
  growPot(vet); vet.salary = r1(marketValue(vet)); vet.career.seasons = 4;
  S.players[vet.id] = vet; S.clients.push(vet.id);
  const kid = newPlayer('prospect');
  Object.assign(kid, { name: kidName, vip: true, nat: STAR_NAT[kidName] || 'USA', hype: 35, age: 19, ovr: 56, pot: 78, comm: 3, morale: 80 });
  kid.school = schoolFor(kid);
  S.players[kid.id] = kid; S.clients.push(kid.id);

  addNews(`🏢 Nasce <b>${esc(S.agency)}</b>! Primi clienti: ${esc(vet.name)} e il giovane ${esc(kid.name)}.`, 'gold');
  addNews('📋 È iniziata la Free Agency: sfoglia il <b>Mercato</b> per firmare nuovi assistiti.');
  makeOffersForClientFAs();
  newChallenges();
  recInit();
  save();
}

function genDraftClass() {
  for (let i = 0; i < 72; i++) {
    const p = newPlayer('prospect');
    const tier = Math.random();
    p.ovr = clamp(Math.round((tier < 0.08 ? 66 : tier < 0.3 ? 60 : 54) + gauss() * 4), 42, 74);
    p.pot = clamp(Math.round(p.ovr + rand(6, 28) - (p.age - 19) * 2), p.ovr + 3, 99);
    p.school = schoolFor(p);
    p.agency = chance(0.3) ? pick(RIVALS) : null;
    S.players[p.id] = p;
  }
}

/* ================================================================== */
/* Notizie, eventi, salvataggio                                        */
/* ================================================================== */
function phaseLabel() {
  return { fa: `Free Agency · sett. ${S.week}/${FA_WEEKS}`, reg: `Stagione regolare · sett. ${S.week}/${REG_WEEKS}`,
    po: 'Playoff', draft: 'Draft' }[S.phase];
}
function addNews(text, cls = '') {
  S.news.unshift({ when: `${seasonLabel()} · ${phaseLabel()}`, text, cls });
  if (S.news.length > 80) S.news.length = 80;
}
function save() {
  if (!S) return;
  S.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage pieno o bloccato */ }
  Cloud.schedule();
}
// salvataggi vecchi: aggiorna i nomi parodia che sono stati cambiati
function fixNames() {
  if (!S || S.namesV >= 2) return;
  const fix = n => RENAMED[n] || n;
  for (const p of Object.values(S.players || {})) p.name = fix(p.name);
  const R = S.records;
  if (R) {
    for (const g of [R.game, R.season, R.era && R.era.game, R.era && R.era.season]) for (const r of Object.values(g || {})) if (r) r.name = fix(r.name);
    for (const r of R.retired || []) r.name = fix(r.name);
  }
  const re = new RegExp(Object.keys(RENAMED).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  for (const n of S.news || []) n.text = n.text.replace(re, m => RENAMED[m]);
  S.namesV = 2;
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { S = JSON.parse(raw); fixNames(); return true; } } catch (e) { /* ignora */ }
  return false;
}
function hasLocalSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

/* Salvataggio sul proprio account claude.ai, quando il gioco è aperto come Artifact.
   Fuori da claude.ai window.claude non esiste e resta solo il salvataggio locale. */
const Cloud = {
  doc: null, timer: null,
  async init() {
    if (!window.claude || !window.claude.use || typeof CompressionStream === 'undefined') return;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      this.doc = db.collection('data/users/' + id).doc('partita2');
      const snap = await this.doc.get();
      const d = snap && snap.exists ? snap.data() : null;
      if (d && d.data && (!S || (d.savedAt || 0) > (S.savedAt || 0))) {
        S = JSON.parse(await gunzip(d.data)); fixNames();
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignora */ }
        UI.render();
      } else if (S) this.schedule();
    } catch (e) { this.doc = null; }
  },
  schedule() {
    if (!this.doc) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 1500);
  },
  async push() {
    if (!this.doc || !S) return;
    try { await this.doc.set({ data: await gzip(JSON.stringify(S)), savedAt: S.savedAt, v: 1 }); } catch (e) { /* riprova al prossimo salvataggio */ }
  },
  async clear() { clearTimeout(this.timer); if (this.doc) try { await this.doc.delete(); } catch (e) { /* ignora */ } },
};
/* ================================================================== */
/* Pareri, statistiche anonime e copia del salvataggio                 */
/* ================================================================== */
// Indirizzo del modulo per i pareri (Tally o Google Form). Vuoto = non ancora pronto.
const FEEDBACK_URL = '';
const GAME_VERSION = '1.0';
// Statistiche anonime senza cookie (GoatCounter): si caricano solo dal sito, non dalla chat.
function track(name) {
  try {
    const go = () => window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: 'evento/' + name, title: name, event: true });
    if (window.goatcounter && window.goatcounter.count) go(); else setTimeout(go, 3000);
  } catch (e) { /* le statistiche non devono mai bloccare il gioco */ }
}
// chi torna a giocare: il primo giorno e l'ultimo giorno di gioco restano solo su questo dispositivo
function trackVisit() {
  try {
    const today = new Date().toISOString().slice(0, 10), K = 'superAgenteNBA.visite';
    const v = JSON.parse(localStorage.getItem(K) || 'null') || { first: today, last: null };
    if (v.last !== today) {
      const days = Math.round((new Date(today) - new Date(v.first)) / 864e5);
      if (v.last) track(days <= 1 ? 'ritorno-giorno-dopo' : days <= 7 ? 'ritorno-entro-7-giorni' : days <= 30 ? 'ritorno-entro-30-giorni' : 'ritorno-dopo-30-giorni');
      else track('prima-visita');
      v.last = today; localStorage.setItem(K, JSON.stringify(v));
    }
  } catch (e) { /* ignora */ }
}
function openFeedback() {
  track('parere-aperto');
  if (!FEEDBACK_URL) return toast('Il modulo per i pareri arriva a breve. Grazie per la pazienza!', 'info', 'Quasi pronto');
  const q = new URLSearchParams({ versione: GAME_VERSION, stagione: S ? seasonLabel() : 'nessuna', stagioni_giocate: S ? S.history.length : 0,
    clienti: S ? S.clients.length : 0, dispositivo: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone/iPad' : /Android/.test(navigator.userAgent) ? 'Android' : 'computer' });
  window.open(FEEDBACK_URL + (FEEDBACK_URL.includes('?') ? '&' : '?') + q, '_blank', 'noopener');
}
// esporta: un file da tenere (o un codice da copiare) con tutta la partita
function saveFileName() { return `hoop-agent-${(S.agency || 'partita').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${S.season}.json`; }
async function exportSave() {
  save(); S.lastExport = S.season; save();
  // dentro la chat di Claude non si possono scaricare file: lì si usa il codice
  if (window.claude && window.claude.use) return copySaveCode();
  const text = JSON.stringify(S), name = saveFileName();
  track('salvataggio-esportato');
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Salvataggio Hoop Agent' }); return { msg: 'Salvataggio pronto: tienilo in un posto sicuro (File, Drive, una mail a te stesso).', type: 'good' }; }
  } catch (e) { if (e && e.name === 'AbortError') return { msg: 'Esportazione annullata.', type: 'info' }; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return { msg: `Ho scaricato il file ${name}. Tienilo da parte: con quello riprendi la partita anche su un altro telefono.`, type: 'good' };
}
async function copySaveCode() {
  save(); S.lastExport = S.season; save();
  const code = typeof CompressionStream !== 'undefined' ? 'SAN1:' + await gzip(JSON.stringify(S)) : JSON.stringify(S);
  try { await navigator.clipboard.writeText(code); track('codice-copiato'); return { msg: 'Codice copiato. Incollalo in una nota o mandalo a te stesso: serve per riprendere la partita.', type: 'good' }; }
  catch (e) {
    // copia automatica bloccata: mostro il codice da copiare a mano
    UI.openModal(`<h3>Il codice della tua partita</h3><p class="small">Tieni premuto nel riquadro, seleziona tutto e copia. Incollalo in una nota o mandalo a te stesso.</p>
      <textarea id="imp-code" rows="6" readonly>${esc(code)}</textarea><div class="actions"><button class="btn" onclick="UI.closeModal()">Fatto</button></div>`);
    const ta = document.getElementById('imp-code'); if (ta) { ta.focus(); ta.select(); }
    return { msg: 'Copia il codice dal riquadro.', type: 'info' };
  }
}
// importa: da file o da codice. Controlla che sia davvero una partita prima di sovrascrivere.
async function readSave(text) {
  text = String(text || '').trim();
  let obj = null;
  try {
    if (text.startsWith('SAN1:')) obj = JSON.parse(await gunzip(text.slice(5)));
    else obj = JSON.parse(text);
  } catch (e) { return null; }
  if (!obj || typeof obj !== 'object' || !obj.players || !obj.teams || !obj.clients || !obj.agency) return null;
  return obj;
}
function applyImport(obj) {
  obj.savedAt = Date.now(); // così vince anche sul salvataggio nel cloud
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) { return { msg: 'Il telefono non ha spazio per salvare la partita.', type: 'bad' }; }
  track('salvataggio-importato');
  setTimeout(() => location.reload(), 300);
  return { msg: `Partita di ${obj.agency} caricata (stagione ${obj.season}-${String(obj.season + 1).slice(2)}).`, type: 'good' };
}
async function gzip(str) {
  const buf = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function gunzip(b64) {
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

/* ================================================================== */
/* Economia agenzia                                                    */
/* ================================================================== */
const STAFF = {
  scout: { name: 'Rete di scout', icon: '🔭', desc: 'Stime più precise sul potenziale dei prospetti, e ogni livello fa costare meno le osservazioni (fino a 4 a settimana).' },
  legal: { name: 'Ufficio legale', icon: '⚖️', desc: 'Avvocati più bravi: le squadre finiscono per offrire qualcosa in più ai tuoi clienti.' },
  marketing: { name: 'Marketing', icon: '📣', desc: 'Il tuo nome gira di più: gli sponsor pagano meglio i tuoi clienti e i giocatori ti conoscono già quando li contatti.' },
  office: { name: 'Uffici', icon: '🏢', desc: 'Uffici più grandi e più collaboratori: puoi seguire più clienti.' },
  hq: { name: 'Sede', icon: '🏙️', desc: 'Una sede che fa colpo: i giocatori accettano più volentieri di incontrarti e il tuo nome resta sulla bocca di tutti.' },
  academy: { name: 'Accademia giovanile', icon: '🎓', desc: 'Ogni estate forma ragazzi che arrivano al Draft già legati a te. Un\'accademia più grande attira ragazzi migliori, e ogni tanto ci passa un talento generazionale da trasformare in campione.' },
  center: { name: 'Centro di allenamento', icon: '🏋️', desc: 'Palestre, piscina, medici e campi tutti per i tuoi clienti. Si fanno male meno spesso, guariscono prima e da veterani calano più piano.' },
  informer: { name: 'Informatore', icon: '🕵️', desc: 'Ti passa soffiate sui prospetti del prossimo Draft: potenziale, chi vuole essere seguito, chi sta per firmare con un rivale. All\'inizio è scarso e a volte sbaglia.' },
};
const UPGRADE_COSTS = { center: [8000000, 15000000, 25000000, 40000000, 60000000], hq: [250000, 900000, 3000000, 9000000, 25000000], academy: [1500000, 4000000, 10000000, 22000000, 45000000] };
const upgradeCost = (lvl, k) => (UPGRADE_COSTS[k] || [60000, 220000, 750000, 2500000, 7000000])[lvl] ?? Infinity;
// costi fissi: staff, sede, accademia e gestione dei clienti (dal quarto in poi)
// quanto aumentano le spese settimanali con un livello in più
const ACADEMY_REP = 45;
// reputazione che serve per il livello successivo: i professionisti migliori lavorano solo per agenzie con un nome
const STAFF_REP = { office: [0, 10, 25, 40, 55], hq: [0, 20, 35, 50, 65], marketing: [0, 15, 30, 45, 60], legal: [0, 15, 30, 45, 60],
  scout: [0, 0, 15, 30, 45], informer: [0, 10, 25, 40, 55], academy: [45, 50, 55, 62, 70], center: [40, 50, 60, 70, 80] };
const staffRepReq = (k, lvl = S.staff[k] || 0) => (STAFF_REP[k] || [])[lvl] || 0;
const STAFF_WHY = { office: 'i collaboratori bravi vogliono lavorare in un\'agenzia che conta', hq: 'i palazzi migliori non si affittano a chi non ha un nome',
  marketing: 'le agenzie di comunicazione top scelgono clienti famosi', legal: 'gli studi legali migliori non lavorano per chiunque',
  scout: 'gli osservatori più esperti vogliono un\'agenzia seria', informer: 'chi sa le cose le racconta solo a chi conta',
  academy: 'le famiglie affidano i figli solo a un agente con un nome', center: 'medici e preparatori di alto livello vogliono un\'agenzia famosa' };
const staffStep = k => ({ office: 4000, hq: 6000, academy: 12000, center: 25000 })[k] || 3000;
const weeklyCost = () => 6000 + 3000 * (S.staff.scout + S.staff.legal + S.staff.marketing + (S.staff.informer || 0)) + 4000 * S.staff.office
  + 6000 * (S.staff.hq || 0) + 12000 * (S.staff.academy || 0) + 25000 * (S.staff.center || 0) + pstaffWeekly() + 1200 * Math.max(0, S.clients.length - 3);
/* ---------- Prestiti della banca ----------
   Un prestito alla volta, da restituire a rate settimanali in 2-5 stagioni.
   Quanto ti prestano e a che tasso dipende da reputazione e incassi. */
function loanOffer() {
  const yearly = weeklyIncomeEstimate() * TURNS_PER_YEAR;
  const max = Math.round(clamp(150000 + S.rep * 12000 + yearly * 1.5, 150000, 8000000) / 50000) * 50000;
  const rate = r1(clamp(14 - S.rep * 0.08 - (S.loansRepaid || 0) * 0.5, 5, 14));
  return { max, rate };
}
// rata costante: ogni settimana paghi gli interessi sul debito che resta più una parte del capitale
function loanPlan(amount, years) {
  const { rate } = loanOffer(), n = years * TURNS_PER_YEAR, r = rate / 100 / TURNS_PER_YEAR;
  const perWeek = Math.ceil(amount * r / (1 - Math.pow(1 + r, -n)) / 10) * 10;
  return { rate, perWeek, total: perWeek * n };
}
function fixLoan() { // prestiti presi con la versione precedente
  const L = S.loan; if (!L || L.balance != null) return;
  L.balance = Math.round(L.amount * L.left / (L.total || L.left));
  L.weeksLeft = Math.max(1, Math.round(L.left / L.perWeek));
}
const loanRate = () => { if (!S.loan) return 0; fixLoan(); return Math.min(S.loan.perWeek, Math.round(S.loan.balance * (1 + S.loan.rate / 100 / TURNS_PER_YEAR))); };
function takeLoan(amount, years) {
  if (S.loan) return { msg: 'Hai già un prestito in corso: prima finisci di pagarlo.', type: 'bad' };
  const { max } = loanOffer();
  amount = clamp(Math.round(amount / 1000) * 1000, 50000, max); years = clamp(Math.round(years), 2, 5);
  const pl = loanPlan(amount, years);
  S.loan = { amount, years, rate: pl.rate, perWeek: pl.perWeek, balance: amount, weeksLeft: years * TURNS_PER_YEAR, season: S.season };
  S.cash += amount; // non è un guadagno: non conta nelle entrate della stagione
  changeRep(-0.5);
  addNews(`🏦 La banca ti presta ${fmt$(amount)} al ${pl.rate}% l'anno: rata di ${fmt$(pl.perWeek)} a settimana per ${years} stagioni.`, 'warn');
  return { msg: `Ricevuti ${fmt$(amount)}. Rata: ${fmt$(pl.perWeek)} a settimana.`, type: 'good' };
}
function payLoanWeek() {
  if (!S.loan) return;
  fixLoan();
  const L = S.loan, interest = L.balance * L.rate / 100 / TURNS_PER_YEAR, pay = loanRate();
  spend(pay); L.balance = Math.max(0, Math.round(L.balance + interest - pay)); L.weeksLeft--;
  if (L.balance <= 0) {
    S.loan = null; S.loansRepaid = (S.loansRepaid || 0) + 1; changeRep(0.5);
    addNews('🏦 Hai finito di pagare il prestito. In banca adesso ti salutano con un sorriso.', 'good');
  }
}
// chiuderlo prima: paghi il debito che resta più una piccola penale
const loanPayoff = () => { if (!S.loan) return 0; fixLoan(); return Math.round(S.loan.balance * 1.02 / 100) * 100; };
function repayLoan() {
  if (!S.loan) return;
  const cost = loanPayoff();
  if (S.cash < cost) return { msg: `Per chiudere il prestito servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); S.loan = null; S.loansRepaid = (S.loansRepaid || 0) + 1; changeRep(0.5);
  addNews(`🏦 Hai chiuso in anticipo il prestito pagando ${fmt$(cost)}.`, 'good');
  return { msg: `Prestito chiuso con ${fmt$(cost)}.`, type: 'good' };
}
// quanto entra in una settimana di questa fase: le commissioni sugli stipendi arrivano solo in stagione regolare
function weeklyIncomeIn(phase) {
  let inc = 0;
  for (const p of clients()) {
    if (phase === 'reg' && p.team != null) inc += p.salary * 1e6 * p.comm / 100 / REG_WEEKS;
    for (const sp of p.sponsors) inc += sp.value * 1e6 * SPONSOR_CUT / TURNS_PER_YEAR;
  }
  return inc;
}
const weeklyNetIn = phase => weeklyIncomeIn(phase) - weeklyCost() - loanRate();
function weeklyIncomeEstimate() {
  let inc = 0;
  for (const p of clients()) {
    if (p.team != null) inc += p.salary * 1e6 * p.comm / 100 / REG_WEEKS * (REG_WEEKS / TURNS_PER_YEAR);
    for (const sp of p.sponsors) inc += sp.value * 1e6 * SPONSOR_CUT / TURNS_PER_YEAR;
  }
  return inc;
}
function earn(amount, why) { S.cash += amount; S.seasonIncome += amount; }
function spend(amount) { S.cash -= amount; S.seasonExpense += amount; }
function changeRep(d) {
  if (d > 0) d *= Math.max(0.15, 1.15 - S.rep / 85); // più sei famoso, più è difficile crescere
  S.rep = clamp(r1(S.rep + d), 0, 100);
}

/* ================================================================== */
/* Squadre e partite                                                   */
/* ================================================================== */
function teamStrength(tid) {
  const r = rosterOf(tid).filter(p => !p.injury).map(p => p.ovr).sort((a, b) => b - a).slice(0, 8);
  if (!r.length) return 50;
  const w = [1.5, 1.35, 1.2, 1.05, 0.95, 0.75, 0.6, 0.5];
  let s = 0, ws = 0; r.forEach((o, i) => { s += o * w[i]; ws += w[i]; });
  return s / ws;
}
const winProb = (a, b) => 1 / (1 + Math.exp(-(a - b) / 3.2));

function pairRound() {
  const ids = shuffle(S.teams.map(t => t.id)), m = {};
  for (let i = 0; i < ids.length; i += 2) { m[ids[i]] = { opp: ids[i + 1], home: true }; m[ids[i + 1]] = { opp: ids[i], home: false }; }
  return m;
}
// Voto di una partita: punti, rimbalzi e assist pesati, più un bonus se si vince.
function gameGrade(pts, reb, ast, win) {
  const gs = pts + reb * 0.5 + ast * 0.7 + (win ? 3 : 0);
  const T = [[46, 'A+'], [39, 'A'], [34, 'A-'], [29, 'B+'], [24, 'B'], [20, 'B-'], [16, 'C+'], [12, 'C'], [9, 'C-'], [6, 'D']];
  for (const [v, g] of T) if (gs >= v) return g;
  return 'F';
}
const gradeClass = g => g[0] === 'A' ? 'ga' : g[0] === 'B' ? 'gb' : g[0] === 'C' ? 'gc' : 'gd';
function simWeekGames() {
  const str = S.teams.map(t => teamStrength(t.id));
  if (!S.nextRound) S.nextRound = pairRound();
  const rounds = [S.nextRound, pairRound(), pairRound(), pairRound()];
  const results = []; // per ogni giornata: { teamId: { opp, home, win, us, them } }
  for (const rd of rounds) {
    const res = {};
    for (const [a, g] of Object.entries(rd)) {
      if (!g.home) continue;
      const b = g.opp, ai = +a;
      const win = chance(winProb(str[ai] + 1, str[b]));
      const base = randi(98, 116), diff = randi(1, 18);
      const sa = win ? base + diff : base, sb = win ? base : base + diff;
      if (win) { S.teams[ai].w++; S.teams[b].l++; } else { S.teams[b].w++; S.teams[ai].l++; }
      for (const [id, v] of [[ai, win], [b, !win]]) { const t = S.teams[id]; (t.last = t.last || []).push(v ? 1 : 0); if (t.last.length > 10) t.last.shift(); }
      res[ai] = { opp: b, home: true, win, us: sa, them: sb };
      res[b] = { opp: ai, home: false, win: !win, us: sb, them: sa };
    }
    results.push(res);
  }
  S.nextRound = pairRound(); // il primo avversario della prossima settimana
  // statistiche individuali
  recInit();
  for (const p of clients()) p.week = null;
  rotationNews();
  for (const t of S.teams) {
    const r = rosterOf(t.id).filter(p => !p.injury).sort(rotCmp);
    const dc = depthChart(t.id);
    r.forEach((p, i) => {
      const e = dc.get(p.id), m = e ? e.min : 0; if (!m) return;
      const starter = e.slot === 'start';
      const f = m / 36, q = Math.max(1, p.ovr - 40);
      const rebK = { PG: .07, SG: .09, SF: .13, PF: .2, C: .24 }[p.pos];
      const astK = { PG: .2, SG: .11, SF: .09, PF: .06, C: .05 }[p.pos];
      const mine = isClient(p);
      if (mine) p.week = [];
      for (let g = 0; g < 4; g++) {
        const g2 = results[g][t.id];
        // minuti: variano partita per partita (falli, partite già decise, supplementari)
        const blow = Math.abs(g2.us - g2.them) >= 18;
        const mins = clamp(Math.round(m * (1 + gauss() * 0.12) * (blow ? (starter ? 0.85 : e.slot === 'bench' ? 1.2 : 3) : 1) + (chance(0.04) ? 5 : 0)), 0, 48);
        if (!mins) continue;
        if (chance(p.age >= 31 ? 0.12 : 0.07)) continue; // riposo o acciacco: salta la partita
        const fg = mins / 36;
        let form = 1 + gauss() * 0.22;
        if (i < 3 && chance(0.012)) form *= rand(1.4, 1.9); // serata di grazia: può nascere un record
        const pts = Math.max(0, Math.round(q * 0.53 * fg * form));
        const reb = Math.max(0, Math.round(q * rebK * fg * (1 + gauss() * .25)));
        const ast = Math.max(0, Math.round(q * astK * fg * (1 + gauss() * .25)));
        p.gp++; p.min = (p.min || 0) + mins; p.pts += pts; p.reb += reb; p.ast += ast;
        p.cgp = (p.cgp || 0) + 1; p.cpts = (p.cpts || 0) + pts; p.creb = (p.creb || 0) + reb; p.cast = (p.cast || 0) + ast;
        recGame(p, t, pts, reb, ast);
        if (mine) p.week.push({ opp: g2.opp, home: g2.home, win: g2.win, us: g2.us, them: g2.them, min: mins, pts, reb, ast, grade: gameGrade(pts, reb, ast, g2.win) });
      }
      if (mine && !p.week.length) p.week = null;
      if (mine && p.week) p.last = p.week[p.week.length - 1];
    });
  }
}
/* ---------- Gerarchie per ruolo: chi gioca e quanto ----------
   Ogni ruolo (play, guardia, ala piccola, ala grande, centro) ha 48 minuti a partita:
   il titolare è il migliore sano in quel ruolo, poi la riserva, poi il terzo.
   Se si fa male il centro titolare entra il centro di riserva, non un play.
   Se in un ruolo non c'è nessuno, si adatta chi gioca nel ruolo vicino. */
const rotCmp = (a, b) => b.ovr - a.ovr || a.id - b.id;
const POS_ADJ = { PG: ['SG'], SG: ['PG', 'SF'], SF: ['SG', 'PF'], PF: ['SF', 'C'], C: ['PF'] };
const POS_FILL = ['C', 'PG', 'PF', 'SG', 'SF']; // prima i ruoli più difficili da coprire
const POS_NAME = { PG: 'play', SG: 'guardia', SF: 'ala piccola', PF: 'ala grande', C: 'centro' };
const SLOT_RANK = { start: 0, bench: 1, third: 2, deep: 3 };
// pid → { slot: start|bench|third|deep, pos (ruolo che copre), min }. extra = giocatore che arriverebbe (offerte)
function depthChart(tid, healthy = true, extra = null) {
  let r = rosterOf(tid).filter(x => !extra || x.id !== extra.id);
  if (extra) r.push(extra);
  if (healthy) r = r.filter(x => !x.injury);
  r.sort(rotCmp);
  const free = new Set(r), out = new Map(), st = {}, bk = {};
  const take = pos => {
    let c = r.find(x => free.has(x) && x.pos === pos);
    if (!c) c = r.find(x => free.has(x) && POS_ADJ[pos].includes(x.pos));
    if (c) free.delete(c);
    return c;
  };
  for (const pos of POS_FILL) st[pos] = take(pos);
  for (const pos of POS_FILL) if (!st[pos]) { const c = r.find(x => free.has(x)); if (c) { free.delete(c); st[pos] = c; } }
  for (const pos of POS_FILL) bk[pos] = take(pos);
  const thirds = {};
  for (const x of r) if (free.has(x)) (thirds[x.pos] = thirds[x.pos] || []).push(x);
  for (const pos of POS) {
    const s = st[pos], b = bk[pos]; if (!s) continue;
    const th = (thirds[pos] || []).slice(0, 2);
    const sm = b ? clamp(Math.round(30 + (s.ovr - b.ovr) * 0.35 + (s.ovr >= 85 ? 2 : 0)), 26, s.ovr >= 85 ? 37 : 35) : 42;
    out.set(s.id, { slot: 'start', pos, min: sm });
    if (b) out.set(b.id, { slot: 'bench', pos, min: Math.max(6, 48 - sm - th.length * 2) });
    th.forEach(x => out.set(x.id, { slot: 'third', pos, min: 2 }));
  }
  for (const x of r) if (!out.has(x.id)) out.set(x.id, { slot: 'deep', pos: x.pos, min: 0 });
  // una riserva forte ruba minuti nel ruolo vicino: prima alla riserva di quel ruolo, poi (se è più forte) anche al titolare
  const who = id => r.find(x => x.id === id);
  const benchers = r.filter(x => out.get(x.id).slot === 'bench').sort(rotCmp);
  for (const b of benchers) {
    const eb = out.get(b.id);
    for (const q of POS_ADJ[b.pos] || []) {
      if (q === eb.pos || eb.min >= 30) continue;
      let gain = 0;
      const donors = [...out.entries()].filter(([id, e]) => e.pos === q && (e.slot === 'bench' || e.slot === 'start') && id !== b.id)
        .sort((x, y) => SLOT_RANK[y[1].slot] - SLOT_RANK[x[1].slot]); // prima la riserva, poi il titolare
      for (const [id, e] of donors) {
        const d = who(id), diff = b.ovr - d.ovr;
        if (diff < (e.slot === 'start' ? 4 : 2)) continue;
        const floor = e.slot === 'start' ? 26 : 2;
        const t = Math.min(Math.round(diff * 1.3), e.min - floor, 30 - eb.min - gain);
        if (t <= 0) continue;
        e.min -= t; gain += t;
      }
      if (gain) { eb.min += gain; eb.also = (eb.also || []).concat(q); }
    }
  }
  return out;
}
function roleLabel(e, p) {
  if (!e) return 'fuori rotazione';
  const n = POS_NAME[e.pos], fem = e.pos === 'SG' || e.pos === 'SF' || e.pos === 'PF';
  const base = e.slot === 'start' ? `${n} titolare` : e.slot === 'bench' ? `${n} di riserva` : e.slot === 'third' ? `terz${fem ? 'a' : 'o'} ${n}` : 'fondo panchina';
  return base + (e.slot !== 'deep' && p && e.pos !== p.pos ? ` (adattato, è ${{ PG: 'un play', SG: 'una guardia', SF: 'un\'ala piccola', PF: 'un\'ala grande', C: 'un centro' }[p.pos]})` : '');
}
const roleWithMin = (e, p) => roleLabel(e, p) + (e && e.min ? ` · ~${e.min} min` : '') + (e && e.also ? ` (gioca anche da ${e.also.map(q => POS_NAME[q]).join(' e da ')})` : '');
// "centro di riserva · ~16 min", con la nota sugli infortuni dei compagni nello stesso ruolo
function roleTxt(p, tid) {
  const extra = p.team === tid ? null : p;
  const full = depthChart(tid, false, extra).get(p.id);
  if (p.injury) return `${roleWithMin(full, p)} quando rientra`;
  const now = depthChart(tid, true, extra).get(p.id);
  let s = roleWithMin(now, p);
  if (roleLabel(now, p) !== roleLabel(full, p) || Math.abs(now.min - full.min) >= 3) {
    const hurt = rosterOf(tid).filter(x => x.id !== p.id && x.injury && (x.pos === now.pos || x.pos === p.pos)).sort(rotCmp).map(x => x.name.split(' ').slice(-1)[0]);
    if (hurt.length) s += ` finché ${hurt.slice(0, 2).join(' e ')} ${hurt.length > 1 ? 'sono fermi' : 'è fermo'}, poi ${roleWithMin(full, p)}`;
  }
  return s;
}
// avvisa quando un tuo cliente sale (o torna giù) per un infortunio di un compagno di ruolo
function rotationNews() {
  for (const p of clients()) {
    if (p.team == null || p.injury) { p.roleKey = null; continue; }
    const now = depthChart(p.team, true).get(p.id), full = depthChart(p.team, false).get(p.id);
    const key = roleLabel(now, p), was = p.roleKey;
    if (was && key !== was) {
      if (SLOT_RANK[now.slot] < SLOT_RANK[full.slot]) addNews(`🔥 Infortunio nei ${esc(teamOf(p).name)}: <b>${esc(p.name)}</b> ora è ${key} (circa ${now.min} minuti a partita).`, 'good');
      else if (key === roleLabel(full, p)) addNews(`🔁 Rientrano gli infortunati dei ${esc(teamOf(p).name)}: ${esc(p.name)} torna ${key}.`);
    }
    p.roleKey = key;
  }
}
const teamRank = tid => standings().findIndex(t => t.id === tid) + 1;
function nextGameTxt(p) {
  if (p.team == null || !S.nextRound || S.phase !== 'reg') return null;
  const g = S.nextRound[p.team]; if (!g) return null;
  return `${g.home ? 'vs' : '@'} ${S.teams[g.opp].name}`;
}
const avg = (p, k) => p.gp ? p[k] / p.gp : 0;
const statLine = p => p.gp ? `${r1(avg(p, 'min'))} min · ${r1(avg(p, 'pts'))} pt · ${r1(avg(p, 'reb'))} rb · ${r1(avg(p, 'ast'))} as` : 'nessuna partita';
const winPct = t => (t.w + t.l) ? t.w / (t.w + t.l) : 0.5;
const standings = () => [...S.teams].sort((a, b) => winPct(b) - winPct(a) || b.w - a.w);
const playerScore = p => p.ovr + avg(p, 'pts') * 0.45 + (teamOf(p) ? winPct(teamOf(p)) * 12 : 0);

/* ================================================================== */
/* Free agency e offerte                                               */
/* ================================================================== */
function affordable(tid) {
  const pr = payroll(tid), room = CAP - pr;
  if (room >= MIN_SAL) return room;
  return pr < CAP + 25 ? MID_LEVEL : MIN_SAL;
}
function preferredYears(p) {
  return p.age <= 24 ? randi(3, 5) : p.age <= 29 ? randi(2, 4) : p.age <= 32 ? randi(1, 3) : randi(1, 2);
}
function makeOffersFor(p, n, fromTeam = null, ext = fromTeam != null) {
  const val = marketValue(p);
  const existing = new Set(S.offers.filter(o => o.pid === p.id).map(o => o.teamId));
  let teams = fromTeam != null ? [S.teams[fromTeam]] :
    shuffle(S.teams.filter(t => rosterOf(t.id).length < 15 && !existing.has(t.id))).sort((a, b) => stakeOf(b.id) - stakeOf(a.id));
  let made = 0;
  for (const t of teams) {
    if (made >= n) break;
    // solo i rinnovi possono superare il tetto salariale (come i "diritti Bird"); le altre offerte lo rispettano
    // soglia massima: per rinnovare si può superare il tetto salariale, ma non oltre $180M di monte ingaggi
    const APRON = CAP + 40;
    const room = fromTeam != null && ext
      ? Math.max(affordable(t.id), Math.min(p.salary * 1.3, APRON - (payroll(t.id) - (p.team === t.id ? p.salary : 0))))
      : affordable(t.id) - pendingOffers(t.id); // conta anche i soldi già promessi in altre offerte
    const rel = teamRel(t.id);
    if (fromTeam == null && rel < 25 && chance(0.6)) continue; // con te non vogliono trattare
    const max = r1(Math.min(val * rand(0.95, 1.22) * (1 + S.staff.legal * 0.03) * (1 + (rel - 50) / 500) * (1 + stakeOf(t.id) / 400), room, MAX_SAL));
    if (max < MIN_SAL) continue;
    const salary = r1(Math.max(MIN_SAL, max * rand(0.68, 0.9)));
    S.offers.push({ id: S.nextEv++, pid: p.id, teamId: t.id, salary, years: preferredYears(p),
      max, patience: 3 + (rel >= 70 ? 1 : 0) - (rel < 30 ? 1 : 0), ext, expires: S.turn + (ext ? 4 : randi(1, 3)) });
    made++;
  }
  return made;
}
function offersCountFor(p) {
  const o = p.ovr;
  return o >= 82 ? randi(3, 5) : o >= 74 ? randi(2, 4) : o >= 66 ? randi(1, 3) : randi(0, 2);
}
function makeOffersForClientFAs() {
  for (const p of clients()) {
    if (p.team != null || p.school || p.retired) continue;
    const n = makeOffersFor(p, offersCountFor(p));
    if (n) addNews(`📨 ${n} nuov${n > 1 ? 'e offerte' : 'a offerta'} per <b>${esc(p.name)}</b>. Vai a negoziare dalla scheda Clienti.`);
  }
}

function signContract(p, teamId, salary, years) {
  // rinnovo: gli anni nuovi partono dopo quello in corso
  if (p.team === teamId && p.years > 0) years += p.years;
  const newcomer = p.team !== teamId;
  p.team = teamId; p.salary = clamp(r1(salary), MIN_SAL, MAX_SAL); p.years = years; p.school = null;
  // rosa piena: la squadra taglia il giocatore più debole (mai un tuo cliente)
  if (newcomer) {
    const r = rosterOf(teamId);
    if (r.length > 15) {
      const cut = r.filter(x => x.id !== p.id && !isClient(x)).sort((a, b) => a.ovr - b.ovr)[0];
      if (cut) { cut.team = null; cut.years = 0; }
    }
  }
  S.offers = S.offers.filter(o => o.pid !== p.id);
  if (isClient(p)) {
    const val = marketValue(p);
    const [fit, why] = teamFit(p, teamId, salary);
    let yrsNote = '';
    if (p.age >= 30 && years <= 1) { p.morale -= 6; yrsNote = ' Avrebbe voluto più sicurezza.'; }
    if (hasTrait(p, 'ambizioso') && p.age <= 25 && years >= 4) { p.morale -= 4; yrsNote = ' Avrebbe preferito un contratto corto per guadagnare di più dopo.'; }
    p.morale = clamp(Math.round(p.morale + 10 + (salary / val - 1) * 40 + fit * 12), 0, 100);
    p.signMood = `${PREFS[prefOf(p)][0]} ${fit >= 0.6 ? 'Felice' : fit >= 0 ? 'Abbastanza contento' : 'Non è contento'}: ${why}.${yrsNote}`;
    changeRep(clamp(salary / 12, 0.2, 3));
    changeTeamRel(teamId, 4);
    addNews(`✍️ <b>${esc(p.name)}</b> firma con i ${esc(teamName(S.teams[teamId]))}: ${fmtM(salary)} × ${years} ann${years > 1 ? 'i' : 'o'}. ` +
      `Commissione: ${fmt$(salary * 1e6 * p.comm / 100)}/anno. ${esc(p.signMood)}`, 'good');
    checkGoal('bigdeal', salary >= 30);
  }
}

function negotiate(offerId, ask, years) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return { msg: 'Offerta non più disponibile.' };
  const p = P(o.pid);
  if (o.final && ask > o.salary) return { msg: 'È la loro offerta finale: prendere o lasciare.' };
  const eff = o.max * (1 - Math.abs(years - o.years) * 0.04);
  if (ask <= eff) { if (!offerAffordable(o, ask)) return budgetGone(o); signContract(p, o.teamId, ask, years); return { done: true, msg: `Accordo raggiunto a ${fmtM(ask)} × ${years}!` }; }
  if (ask <= eff * 1.12) {
    o.salary = r1(Math.min(eff, Math.max(o.salary + 0.1, (o.salary + eff) / 2 + rand(-0.3, 0.3))));
    o.years = years; o.patience--; changeTeamRel(o.teamId, -1);
    if (o.patience <= 0) return withdraw(o);
    return { msg: `La squadra rilancia: ${fmtM(o.salary)} × ${o.years}. Pazienza in calo.` };
  }
  o.patience -= 2; changeTeamRel(o.teamId, -3);
  if (o.patience <= 0) return withdraw(o);
  return { msg: 'Richiesta fuori mercato: il GM si irrigidisce.' };
}
function withdraw(o) {
  S.offers = S.offers.filter(x => x.id !== o.id);
  const p = P(o.pid);
  p.morale = clamp(p.morale - 6, 0, 100);
  changeTeamRel(o.teamId, -5);
  addNews(`🚪 I ${esc(teamName(S.teams[o.teamId]))} ritirano l'offerta per ${esc(p.name)}.`, 'bad');
  return { done: true, msg: 'La squadra ha abbandonato la trattativa.' };
}
// Soldi già promessi da una squadra in offerte ancora aperte (rinnovi esclusi)
const pendingOffers = (tid, except = null) => S.offers.filter(o => o.teamId === tid && !o.ext && o.id !== except).reduce((s, o) => s + o.salary, 0);
// Al momento della firma la squadra ricontrolla di avere ancora spazio salariale
function offerAffordable(o, salary) {
  if (o.ext) return true;
  return salary <= Math.max(affordable(o.teamId), MIN_SAL) + 0.05;
}
function budgetGone(o) {
  S.offers = S.offers.filter(x => x.id !== o.id);
  const t = S.teams[o.teamId];
  addNews(`💸 I ${esc(teamName(t))} hanno speso il budget con altre firme e ritirano l'offerta per ${esc(P(o.pid).name)}.`, 'warn');
  return { done: true, msg: `I ${t.name} non hanno più spazio salariale: offerta ritirata.` };
}
function acceptOffer(offerId) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return;
  if (!offerAffordable(o, o.salary)) return budgetGone(o);
  signContract(P(o.pid), o.teamId, o.salary, o.years);
  return { done: true };
}

function aiFreeAgency(prob) {
  const fas = Object.values(S.players).filter(p => p.team == null && !p.school && !p.retired && !isClient(p))
    .sort((a, b) => b.ovr - a.ovr);
  for (const p of fas) {
    if (!chance(prob)) continue;
    const val = marketValue(p);
    const cands = S.teams.map(t => ({ t, room: affordable(t.id), n: rosterOf(t.id).length }))
      .filter(c => c.n < 15 && c.room >= Math.min(val * 0.8, MID_LEVEL) || (c.n < 13 && c.room >= MIN_SAL));
    if (!cands.length) continue;
    cands.sort((a, b) => a.n - b.n + rand(-2, 2));
    const c = cands[0];
    signContract(p, c.t.id, Math.max(MIN_SAL, Math.min(val * rand(0.85, 1.05), c.room)), preferredYears(p));
  }
}
function fillRosters() {
  for (const t of S.teams) {
    let n = rosterOf(t.id).length;
    while (n < 13) {
      const fa = Object.values(S.players).filter(p => p.team == null && !p.school && !p.retired && !isClient(p))
        .sort((a, b) => b.ovr - a.ovr)[0];
      if (fa) signContract(fa, t.id, MIN_SAL, 1);
      else {
        const p = newPlayer('pro'); p.ovr = randi(50, 60); growPot(p);
        p.team = t.id; p.salary = MIN_SAL; p.years = 1; p.agency = pick(RIVALS); S.players[p.id] = p;
      }
      n++;
    }
  }
}

/* ================================================================== */
/* Reclutamento                                                        */
/* ================================================================== */
/* ================================================================== */
/* Trattativa con un giocatore per diventare il suo agente             */
/* 1) gli chiedi un incontro: accetta solo se pensa che tu possa       */
/*    rappresentarlo; 2) offri commissione e bonus alla firma, lui     */
/*    risponde con una controfferta; 3) se tiri troppo perde pazienza. */
/* ================================================================== */
function starPower(p) { return p.school ? Math.max(p.ovr, (p.ovr + p.pot) / 2) : p.ovr; }
function pitchCost(p) { return Math.round(Math.max(1500, (starPower(p) - 50) * 450) / 100) * 100; }
// Probabilità che accetti di sedersi al tavolo: è qui che i campioni sono difficili
// jet privato, cena in un resort, la famiglia ospite: è difficile dire di no
const luxChance = p => { const o = openChance(p, 6); if (!o) return 0; return clamp(Math.min(o + 0.25, o * 2 + 0.05) + (hasTrait(p, 'vanitoso') || hasTrait(p, 'avido') ? 0.06 : 0), 0.05, 0.97); };
// Reputazione che un giocatore pretende dal suo agente: i campioni parlano solo con i nomi grossi.
// Il legame costruito con un prospetto e una sede che fa colpo abbassano l'asticella.
function repNeeded(p) {
  return clamp(Math.round((starPower(p) - 64) * 3.3 - (p.bond || 0) * 0.5 - (S.staff.hq || 0) * 2), 0, 95);
}
const REP_GAP_MAX = 14; // oltre questa distanza non ti risponde nemmeno
function openChance(p, lux = 0) {
  const gap = repNeeded(p) - lux - S.rep;
  if (gap >= REP_GAP_MAX) return 0;
  let c = 0.55 + (S.rep - (starPower(p) - 55) * 1.6) / 80 + S.staff.marketing * 0.03 + (S.staff.hq || 0) * 0.04 + (p.bond || 0) / 150;
  if (p.agency) c -= 0.15;
  c -= p.refusals * 0.12;
  if (gap > 0) c *= 1 - gap / REP_GAP_MAX; // sotto la sua soglia: più sei lontano, più è difficile
  return clamp(c, 0.03, 0.97);
}
const roundHalf = v => Math.round(v * 2) / 2;
const r5 = v => Math.round(v / 5) * 5;
// Cosa vuole davvero (segreto). Tutti stanno nella norma (2-4%): i campioni trattano un po' più duro e
// chiedono un bonus alla firma più alto; contano reputazione, legame e carattere, più un po' di umore del giorno.
function talkWants(p) {
  const st = starPower(p), bond = p.bond || 0, greedy = hasTrait(p, 'avido');
  const comm = clamp(roundHalf(3 - Math.max(0, st - 75) / 25 + (S.rep - 40) / 80 + bond / 100 - (greedy ? 0.5 : 0) + pick([-0.5, 0, 0, 0.5])), 2, 4);
  const bonus = Math.max(0, r5(Math.max(0, st - 62) * 9 * (1 - bond / 150) * (p.agency ? 1.3 : 1) * (greedy ? 1.3 : 1)));
  return { comm, bonus };
}
// Promesse: valgono come moneta in trattativa, ma vanno mantenute entro fine stagione regolare
const PROMISES = {
  sponsor: { label: 'Gli trovo uno sponsor entro fine stagione', value: 14, likes: ['avido', 'vanitoso', 'festaiolo'] },
  contender: { label: 'Lo porto in una squadra da playoff', value: 14, likes: ['ambizioso', 'leader', 'professionista'] },
  camp: { label: 'Gli pago un camp con una leggenda quest\'anno', value: 10, likes: ['professionista', 'ambizioso'] },
};
// Si può davvero mantenere? Un ragazzo del college non può giocare in una squadra da playoff prima del Draft,
// e nessun marchio sponsorizza un giocatore troppo debole o ancora al college.
const promiseFeasible = (p, k) => k === 'camp' || (!p.school && (k === 'contender' || p.ovr >= 62));
const promiseValue = (p, keys) => keys.reduce((s, k) => s + PROMISES[k].value * (PROMISES[k].likes.some(t => hasTrait(p, t)) ? 1.6 : 1), 0);
const luxCost = p => Math.round(Math.max(80000, pitchCost(p) * 12) / 1000) * 1000;
function startTalk(pid, lux = false) {
  const p = P(pid);
  if (clients().length >= capacity()) return { msg: 'Hai raggiunto il limite di clienti: amplia gli uffici.', type: 'bad' };
  if (S.talks[pid]) return { ok: true };
  if (p.lastPitch === S.turn) return { msg: 'Ti ha già detto di no questa settimana. Riprova la prossima.', type: 'warn' };
  if (p.lockedUntil > S.season) return { msg: 'Non vuole più sentirti fino alla prossima stagione.', type: 'bad' };
  if (!(lux ? luxChance(p) : openChance(p))) return { msg: `${p.name} non risponde nemmeno alle tue chiamate: lavora solo con agenti di reputazione ${repNeeded(p)} o più (tu hai ${Math.round(S.rep)}).`, type: 'bad' };
  const cost = lux ? luxCost(p) : pitchCost(p);
  if (S.cash < cost) return { msg: `Per organizzare l'incontro servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); p.lastPitch = S.turn;
  if (!chance(lux ? luxChance(p) : openChance(p))) {
    p.refusals++;
    if (p.refusals >= 3) p.lockedUntil = S.season + 1;
    return { msg: `${p.name} non crede che tu possa rappresentarlo. ${p.refusals >= 3 ? 'Per un po\' non vuole più sentirti.' : 'Riprova più avanti.'}`, type: 'bad' };
  }
  const w = talkWants(p);
  const patience = clamp(3 + Math.floor((p.bond || 0) / 35) + (S.rep >= 60 ? 1 : 0) - (p.agency ? 1 : 0), 2, 5);
  // la prima richiesta è più dura di quello che accetterebbe davvero
  // quanto parte basso è imprevedibile: così non si può indovinare il suo limite a colpo sicuro
  const ask = { comm: Math.max(1.5, w.comm - pick([0.5, 1, 1, 1.5])), bonus: r5(w.bonus * rand(1.2, 1.5)) };
  S.talks[pid] = { want: w, ask, patience, max: patience, turn: S.turn, log: [`🤝 Ha accettato di incontrarti. Chiede ${talkTxt(ask)}.`] };
  return { ok: true };
}
const talkTxt = o => `${o.comm}% di commissione${o.bonus ? ` + $${o.bonus}k alla firma` : ''}`;
// Probabilità che un'agenzia rivale si intrometta a ogni giro di trattativa
const rivalCut = p => 0.12 + (p.agency ? 0.08 : 0) + (starPower(p) >= 80 ? 0.08 : 0) + (Object.values(S.stakes || {}).some(v => v >= 100) ? 0.06 : 0);
function talkOffer(pid, comm, bonus, promises = []) {
  const p = P(pid), t = S.talks[pid]; if (!t) return;
  promises = promises.filter(k => promiseFeasible(p, k));
  comm = clamp(roundHalf(comm), 1, 4); bonus = Math.max(0, Math.round(bonus));
  if (bonus * 1000 > S.cash) return { msg: `Non hai $${bonus}k da dare alla firma.`, type: 'bad' };
  t.log.push(`➡️ Offri ${talkTxt({ comm, bonus })}${promises.length ? ` e prometti: ${promises.map(k => PROMISES[k].label.toLowerCase()).join(', ')}` : ''}.`);
  // quanto è lontana l'offerta da ciò che vuole davvero (le promesse accorciano la distanza)
  // un bonus sopra il suo minimo compensa un po' la commissione alta: al massimo mezzo punto (15)
  const commGap = Math.max(0, comm - t.want.comm) * 30;
  const credit = Math.min(15, commGap, Math.max(0, bonus - t.want.bonus) / Math.max(40, t.want.bonus) * 15);
  const gap = commGap - credit + Math.max(0, t.want.bonus - bonus) / Math.max(20, t.want.bonus) * 30 - promiseValue(p, promises);
  if (gap <= 0) return talkSign(pid, comm, bonus, promises);
  t.patience -= gap > 30 ? 2 : 1;
  // se superi il suo limite può alzarsi e andarsene: più lo superi, più è probabile
  const walk = clamp((commGap - credit) / 15 * 0.2 + (bonus < t.want.bonus ? 0.05 : 0), 0, 0.6);
  if (t.patience > 0 && chance(walk)) t.patience = 0;
  if (t.patience <= 0) {
    delete S.talks[pid];
    p.refusals++; p.bond = Math.max(0, (p.bond || 0) - 10);
    if (p.refusals >= 3) p.lockedUntil = S.season + 1;
    addNews(`🚪 ${esc(p.name)} ha chiuso la trattativa con te.`, 'bad');
    return { msg: `${p.name} si è stancato e ha chiuso la trattativa.`, type: 'bad', done: true };
  }
  let mood;
  if (gap > 30) {
    // tirare troppo la corda lo irrigidisce: ora chiede di più
    t.ask = { comm: Math.max(1.5, t.ask.comm - 0.5), bonus: r5(t.ask.bonus * 1.1) };
    t.want = { comm: Math.max(1.5, t.want.comm - 0.5), bonus: r5(t.want.bonus * 1.1) };
    mood = '😠 L\'offerta lo ha offeso: ora chiede di più.';
  } else {
    // si avvicina a te, ma mai oltre quello che vuole davvero
    t.ask = { comm: Math.max(t.ask.comm, Math.min(t.want.comm, roundHalf((t.ask.comm + comm) / 2))), bonus: Math.min(t.ask.bonus, Math.max(t.want.bonus, r5((t.ask.bonus + bonus) / 2))) };
    mood = credit > 0 ? '🤔 Il bonus lo tenta, ma la commissione gli sembra ancora alta.' : '🤔 Ci pensa.';
  }
  // un'agenzia rivale si intromette
  if (chance(rivalCut(p))) {
    const r = pick(RIVALS);
    t.ask = { comm: Math.max(1.5, t.ask.comm - 0.5), bonus: t.ask.bonus };
    t.want = { comm: Math.max(1.5, t.want.comm - 0.5), bonus: t.want.bonus };
    t.log.push(`🦈 ${r} gli ha offerto condizioni migliori. Ora vuole pagare meno commissione.`);
  }
  t.log.push(`⬅️ ${mood} Controfferta: ${talkTxt(t.ask)}.`);
  return { msg: `Controfferta: ${talkTxt(t.ask)}`, type: gap > 30 ? 'warn' : 'info' };
}
function talkAcceptAsk(pid) { const t = S.talks[pid]; if (!t) return; if (t.ask.bonus * 1000 > S.cash) return { msg: `Non hai $${t.ask.bonus}k da dare alla firma.`, type: 'bad' }; return talkSign(pid, t.ask.comm, t.ask.bonus, []); }
function talkSign(pid, comm, bonus, promises = []) {
  const p = P(pid);
  delete S.talks[pid];
  if (clients().length >= capacity()) return { msg: 'Non hai più posti in agenzia.', type: 'bad', done: true };
  if (bonus) spend(bonus * 1000);
  p.comm = comm; p.agency = S.agency; p.morale = clamp(60 + Math.round((p.bond || 0) / 4) + (bonus ? 8 : 0), 0, 100); p.scouted = true;
  p.rivalDeadline = null; p.bondTip = false;
  S.clients.push(p.id); pruneIntel();
  changeRep(clamp((p.ovr - 60) / 15, 0.1, 2));
  // promesse da mantenere entro fine stagione regolare
  // promessa fatta tardi (dopo metà stagione regolare): c'è tempo fino alla fine della prossima
  const pSeason = S.phase === 'po' || S.phase === 'draft' || (S.phase === 'reg' && S.week > REG_WEEKS / 2) ? S.season + 1 : S.season;
  p.promises = promises.map(k => ({ k, season: pSeason, base: p.sponsorCount || 0 }));
  chalUpdate('sign', p.ovr, 'max');
  addNews(`🤝 <b>${esc(p.name)}</b> (${p.pos}, ${p.ovr}) è il tuo nuovo assistito! Commissione ${comm}%${bonus ? `, bonus alla firma $${bonus}k` : ''}${promises.length ? `. Gli hai promesso: ${promises.map(k => PROMISES[k].label.toLowerCase()).join(', ')}` : ''}.`, 'good');
  if (p.team == null && !p.school && S.phase === 'fa') {
    const n = makeOffersFor(p, offersCountFor(p));
    if (n) addNews(`📨 Già ${n} offert${n > 1 ? 'e' : 'a'} per ${esc(p.name)}!`);
  }
  checkGoals();
  return { msg: `${p.name} ha firmato con la tua agenzia: ${comm}%${bonus ? ` e $${bonus}k alla firma` : ''}.`, type: 'good', done: true };
}
function talkQuit(pid) { delete S.talks[pid]; }
// osservare un prospetto: viaggio e biglietti costano, all'estero di più. La rete di scout fa risparmiare.
const SCOUT_MAX = 4;
const scoutCost = p => Math.round((/\(|G-League/.test(p.school || '') ? 12000 : 7000) * (1 - (S.staff.scout || 0) * 0.12) / 500) * 500;
const scoutsLeft = () => SCOUT_MAX - (S.scoutWeek === S.turn ? S.scoutN || 0 : 0);
function scout(pid) {
  const p = P(pid), cost = scoutCost(p);
  if (p.scouted) return `${p.name} lo hai già fatto osservare.`;
  if (scoutsLeft() <= 0) return `I tuoi scout sono già in viaggio per altri ${SCOUT_MAX} ragazzi: torna la prossima settimana.`;
  if (S.cash < cost) return `Servono ${fmt$(cost)} per mandare uno scout.`;
  spend(cost); p.scouted = true;
  if (S.scoutWeek !== S.turn) { S.scoutWeek = S.turn; S.scoutN = 0; }
  S.scoutN++;
  return `Rapporto dello scout su ${p.name}: OVR ${shownOvr(p)}, potenziale ~${shownPot(p)}.`;
}
function releaseClient(pid) {
  const p = P(pid);
  S.clients = S.clients.filter(id => id !== pid);
  S.offers = S.offers.filter(o => o.pid !== pid);
  S.inbox = S.inbox.filter(e => e.pid !== pid);
  p.agency = pick(RIVALS); p.refusals = 3; p.lockedUntil = S.season + 2;
  changeRep(-1);
  addNews(`👋 Hai lasciato andare ${esc(p.name)}.`, 'bad');
}
/* ---------- Regali e attenzioni ai clienti ----------
   Tenere contento un giocatore costa: più guadagna, più deve essere bello il regalo. */
const GIFTS = [
  { label: 'Cena in un ristorante di lusso', k: 1, mor: [4, 8], likes: ['festaiolo', 'gentile'] },
  { label: 'Regalo su misura', k: 4, mor: [9, 14], likes: ['vanitoso', 'avido'], hint: 'orologio, scarpe da collezione, una giacca fatta a mano' },
  { label: 'Vacanza pagata per tutta la famiglia', k: 12, mor: [16, 24], likes: ['festaiolo', 'leale'], loyal: true },
];
// prezzo di base: circa lo 0,05% dello stipendio, minimo $1.000 (i ragazzi del college si accontentano)
const giftBase = p => Math.round(clamp((p.salary || 0) * 1e6 * 0.0005, 1000, 25000) / 100) * 100;
const giftCost = (p, i) => giftBase(p) * GIFTS[i].k;
function giveGift(pid, i = 0) {
  const p = P(pid), gft = GIFTS[i], cost = giftCost(p, i);
  if (p.lastContact === S.turn) return { msg: `Hai già pensato a ${p.name} questa settimana.`, type: 'warn' };
  if (S.cash < cost) return { msg: `Servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); p.lastContact = S.turn;
  let m = randi(gft.mor[0], gft.mor[1]);
  const loves = gft.likes.some(t => hasTrait(p, t));
  if (loves) m = Math.round(m * 1.5);
  if (hasTrait(p, 'professionista') && gft.loyal) m = Math.round(m * 0.6); // in vacanza pensa solo alla palestra
  p.morale = clamp(p.morale + m, 0, 100);
  if (gft.loyal) p.giftLoyal = S.season; // per un po' non ascolta le agenzie rivali
  if (p.school) p.bond = clamp((p.bond || 0) + Math.round(m / 2), 0, 100);
  const txt = i === 0 ? pick([`Cena con ${p.name}: è di ottimo umore.`, `Serata in un ristorante stellato con ${p.name} e la sua famiglia.`])
    : i === 1 ? `${p.name} ha aperto il regalo e ha fatto subito una storia sui social.${loves ? ' Lo ha adorato.' : ''}`
    : `${p.name} e la famiglia partono per una settimana al mare, tutto pagato da te.${loves ? ' Non smette di ringraziarti.' : ''}`;
  return { msg: txt, type: 'good' };
}
// compatibilità (bot di prova): l'attenzione più economica
function contact(pid) { const r = giveGift(pid, 0); return r.msg; }

/* ================================================================== */
/* Eventi settimanali dei clienti                                      */
/* ================================================================== */
function sponsorChance(p) { return clamp(0.2 + (p.ovr - 62) / 40 + p.hype / 200 + S.staff.marketing * 0.06, 0.1, 0.9); }
function seekSponsor(pid) {
  const p = P(pid);
  if (p.school || p.ovr < 62) return { msg: 'I marchi non sono ancora interessati a lui: deve crescere (almeno 62 di valutazione).', type: 'warn' };
  if (p.sponsors.length >= 4) return { msg: 'Ha già 4 sponsor.', type: 'warn' };
  if (S.turn - (p.lastSponsorTry ?? -99) < 4) return { msg: `Hai già bussato alle porte dei marchi per lui: riprova tra ${4 - (S.turn - p.lastSponsorTry)} settimane.`, type: 'warn' };
  if (S.cash < 10000) return { msg: 'Servono $10k per le presentazioni.', type: 'bad' };
  spend(10000); p.lastSponsorTry = S.turn;
  if (!chance(sponsorChance(p))) return { msg: `Nessun marchio ha detto sì per ${p.name}, per ora.`, type: 'bad' };
  const brand = pick(BRANDS.filter(b => !p.sponsors.some(x => x.brand === b)));
  const value = r1(sponsorValue(p) * (0.8 + brandRel(brand) / 250) * rand(0.8, 1));
  p.sponsors.push({ brand, value, years: randi(1, 3) }); p.sponsorCount = (p.sponsorCount || 0) + 1;
  changeBrandRel(brand, 3); checkGoal('sponsor', true); chalUpdate('sponsors', 1);
  addNews(`💼 Hai trovato uno sponsor a ${esc(p.name)}: ${esc(brand)}, ${fmtM(value)} l'anno.`, 'good');
  return { msg: `${brand} sponsorizza ${p.name}: ${fmtM(value)} l'anno (tua quota ${fmt$(value * 1e6 * SPONSOR_CUT)}).`, type: 'good' };
}
// campagna d'immagine: uno studio di comunicazione lavora su di lui per una stagione
const campaignCost = p => Math.round(clamp(60000 + (p.salary || 0) * 1e6 * 0.008 + p.ovr * 1500, 120000, 900000) / 1000) * 1000;
function imageCampaign(pid) {
  const p = P(pid), cost = campaignCost(p);
  if (p.campaignSeason === S.season) return { msg: `La campagna per ${p.name} è già in corso in questa stagione.`, type: 'warn' };
  if (S.cash < cost) return { msg: `Servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); p.campaignSeason = S.season;
  let h = randi(12, 22);
  if (hasTrait(p, 'vanitoso')) h += 6;
  if (hasTrait(p, 'timido')) h -= 5;
  p.hype = clamp(p.hype + h, 0, 100); p.morale = clamp(p.morale + 4, 0, 100);
  addNews(`📣 Campagna d'immagine per <b>${esc(p.name)}</b>: interviste, spot e un documentario sui social. Popolarità +${h}.`, 'good');
  return { msg: `Popolarità di ${p.name} +${h}: gli sponsor pagheranno di più.`, type: 'good' };
}
function sponsorValue(p) {
  const t = teamOf(p), mkt = t ? t.market : 0.3;
  const base = Math.pow(clamp((p.ovr - 60) / 33, 0.03, 1.2), 2) * 5;
  return r1(Math.max(0.1, base * (0.7 + mkt * 0.6) * (1 + p.hype / 100) * (1 + S.staff.marketing * 0.08) * (p.campaignSeason === S.season ? 1.15 : 1)));
}
function moraleDrift() {
  for (const p of clients()) {
    let d = 0;
    const t = teamOf(p);
    if (t) {
      d += (winPct(t) - 0.5) * 3;
      const ratio = p.salary / marketValue(p);
      if (ratio < 0.7) d -= 1.5;
      if (ratio > 1.1) d += 0.5;
    } else if (!p.school && S.phase === 'reg') d -= 3; // disoccupato
    d += (65 - p.morale) * 0.03; // ritorno verso la media
    p.morale = clamp(Math.round(p.morale + d), 0, 100);
  }
}

/* Imprevisti: non ogni settimana, e mai uno per ogni cliente. Più clienti hai, più è probabile che succeda qualcosa. */
function condOk(e, p) {
  const c = e.cond || {}, t = p ? teamOf(p) : null;
  if (!p) return !!e.any;
  if (e.any) return false;
  if (p.school ? !(e.college || COLLEGE_OK.has(e.id)) : e.college) return false; // al college solo imprevisti da college
  if (c.phases && !c.phases.includes(S.phase)) return false;
  if (c.ncaa && !isNcaa(p)) return false;
  if (c.minAge && p.age < c.minAge) return false;
  if (c.maxAge && p.age > c.maxAge) return false;
  if (c.invented && (p.vip || p.star)) return false; // i fatti più pesanti solo per giocatori inventati
  if (c.team && !t) return false;
  if (c.healthy && p.injury) return false;
  if (c.inj && !p.injury) return false;
  if (c.ovr && p.ovr < c.ovr) return false;
  if (c.max && p.ovr > c.max) return false;
  if (c.star && p.ovr < 80) return false;
  if (c.young && p.age > 23) return false;
  if (c.vet && p.age < 31) return false;
  if (c.losing && (!t || t.w + t.l < 8 || winPct(t) >= 0.4)) return false;
  if (c.winning && (!t || t.w + t.l < 8 || winPct(t) <= 0.6)) return false;
  if (c.lowMor && p.morale >= 40) return false;
  if (c.sponsor && !p.sponsors.length) return false;
  const fxs = e.choices.map(ch => ch.fx);
  const has = k => fxs.some(f => f[k] || (f.odds && (f.odds[1][k] || f.odds[2][k])));
  if (has('sponsor') && (p.ovr < 60 || p.sponsors.length >= 4)) return false;
  return true;
}
function fillText(t, d) {
  return t.replace(/\{P\}/g, d.p || '').replace(/\{P1\}/g, (d.p || '').split(' ').pop()).replace(/\{T\}/g, d.t || '')
    .replace(/\{C\}/g, d.c).replace(/\{B\}/g, d.b).replace(/\{R\}/g, d.r).replace(/\{N\}/g, d.n)
    .replace(/\{age\}/g, d.age ?? '').replace(/\{num\}/g, d.num ?? '').replace(/\{TD\}/g, d.td || '');
}
// Quanto vale un giocatore per media e marchi: i guadagni degli imprevisti si adattano al suo livello.
function fameMult(p) { return p ? clamp(0.3 + (p.ovr - 60) / 22 + p.hype / 110, 0.25, 3) : 1; }

/* ---------- Rapporti ---------- */
const teamRel = tid => tid == null ? 50 : ((S.teamRel = S.teamRel || {})[tid] ?? 50);
const brandRel = b => (S.brandRel = S.brandRel || {})[b] ?? 50;
function changeTeamRel(tid, d) { if (tid == null || !d) return; S.teamRel[tid] = clamp(Math.round(teamRel(tid) + d), 0, 100); }
function changeBrandRel(b, d) { if (!b || !d) return; S.brandRel[b] = clamp(Math.round(brandRel(b) + d), 0, 100); }
function relLabel(v) { return v >= 75 ? '😄 ottimo' : v >= 60 ? '🙂 buono' : v >= 40 ? '😐 neutro' : v >= 25 ? '😒 freddo' : '😠 pessimo'; }
function relOf(who, inst, p) {
  if (who === 'player') return p ? p.morale : 50;
  if (who === 'team') return p ? teamRel(p.team) : 50;
  if (who === 'brand') return brandRel(inst.data.b);
  return clamp(30 + S.rep * 0.6, 0, 100); // personaggi esterni: conta la tua reputazione
}
const WHO_TXT = { player: 'il giocatore', team: 'la squadra', brand: 'lo sponsor', other: 'loro' };
// Probabilità che la controparte accetti: base della scelta, corretta dal rapporto (±35 punti).
function askProb(base, who, inst, p) { return clamp(base + (relOf(who, inst, p) - 50) / 100 * 0.7, 0.05, 0.95); }

function createEvent(e, p) {
  const leagueNames = new Set(Object.values(S.players).map(x => x.name));
  const others = Object.values(S.players).filter(x => x.team != null && !isClient(x) && x.ovr >= 80 && (!p || x.id !== p.id));
  // un personaggio famoso non compare mai nell'imprevisto di sé stesso, né se gioca nella lega
  const pool = e.celeb && CELEB_KIND[e.celeb] ? CELEB_KIND[e.celeb] : CELEBS;
  const celebs = pool.filter(c => !leagueNames.has(c) && (!p || c !== p.name));
  const d = {
    p: p ? p.name : '', t: p && teamOf(p) ? teamName(teamOf(p)) : '', c: pick(celebs.length ? celebs : CELEBS.filter(c => !leagueNames.has(c))), r: pick(RIVALS),
    n: others.length ? pick(others).name : 'un avversario', age: p ? p.age : '', num: p ? p.num : '',
    b: pick(BRANDS.filter(b => !p || !p.sponsors.some(s => s.brand === b))), mult: r1(fameMult(p)), td: teamName(pick(S.teams)),
  };
  if (e.cond && e.cond.sponsor && p) d.b = pick(p.sponsors).brand;
  // il valore dello sponsor dipende dal livello del giocatore e dal rapporto col marchio
  if (p) { d.value = r1(sponsorValue(p) * (0.8 + brandRel(d.b) / 250)); d.years = randi(1, 3); }
  S.inbox.push({ id: S.nextEv++, ev: e.id, rare: !!e.rare, pid: p ? p.id : null, ico: e.ico, title: fillText(e.title, d), text: fillText(e.text, d), data: d });
  S.recentEv.push(e.id);
  if (S.recentEv.length > 45) S.recentEv.shift();
  if (p) p.lastEv = S.turn;
}
// Il carattere pesa sulla scelta: imprevisti "suoi" molto più probabili, altri più o meno probabili
function pickByTrait(pool, p) {
  const w = pool.map(e => {
    let x = e.trait ? 9 : 1;
    for (const t of (p && p.traits) || []) {
      if (TRAITS[t].boost.includes(e.id)) x *= 3;
      if (TRAITS[t].dampen.includes(e.id)) x *= 0.3;
    }
    return x;
  });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
function genWeeklyEvents() {
  const k = clients().filter(p => !p.retired).length;
  const active = S.phase === 'reg' || S.phase === 'fa';
  const p1 = active ? 0.36 + Math.min(k, 12) * 0.02 : 0.2;           // 2 clienti ≈ 40%, 12 clienti ≈ 60%
  const p2 = active && k >= 5 ? 0.03 + Math.min(k, 15) * 0.01 : 0;   // 10 clienti ≈ 13%
  const p3 = active && k >= 12 ? 0.04 : 0;
  const n = chance(p1) ? 1 + (chance(p2) ? 1 : 0) + (chance(p3) ? 1 : 0) : 0;
  // colpo di scena: raro, una volta sola per giocatore e per tipo
  if (active && k && chance(0.008 + 0.002 * Math.min(k, 12))) {
    const cand = shuffle(clients().filter(p => !p.retired && !S.inbox.some(x => x.pid === p.id)));
    for (const p of cand) {
      const pool = EVENTS.filter(e => e.rare && condOk(e, p) && !(p.rareSeen || []).includes(e.id));
      if (pool.length) { const e = pick(pool); p.rareSeen = [...(p.rareSeen || []), e.id]; createEvent(e, p); break; }
    }
  }
  for (let i = 0; i < n; i++) {
    // chi ha appena avuto un imprevisto aspetta qualche settimana
    const free = clients().filter(p => !p.retired && !S.inbox.some(x => x.pid === p.id) && S.turn - (p.lastEv ?? -99) >= 4);
    let p = null, pool = [];
    for (let tries = 0; tries < 6 && !pool.length; tries++) {
      p = free.length && !chance(0.1) ? pick(free) : null;
      if (p && p.morale < 35 && p.giftLoyal !== S.season && chance(hasTrait(p, 'leale') ? 0.15 : 0.5)) pool = EVENTS.filter(e => e.id === 'rivale');
      else pool = EVENTS.filter(e => !e.rare && (!e.trait || hasTrait(p, e.trait)) && condOk(e, p) && !S.recentEv.includes(e.id));
    }
    if (pool.length) createEvent(pickByTrait(pool, p), p);
  }
}

const LOOK_TXT = {
  tattoo: v => v === 'face' ? 'tatuaggio sul viso' : 'tatuaggio sul braccio', hairColor: () => 'capelli colorati',
  hair: v => ({ mohawk: 'cresta', short: 'capelli corti', bald: 'testa rasata', braids: 'treccine' })[v],
  beard: v => v === 'long' ? 'barbone' : v === 'mustache' ? 'baffi' : 'barba', glasses: v => v === 'sun' ? 'occhiali da sole' : 'occhialoni',
  mask: () => 'maschera protettiva', headband: () => 'fascia in testa', number: v => 'maglia numero ' + v,
  chain: () => 'catena d\'oro', tooth: () => 'dente scheggiato',
};
const gain = (f, inst) => f.cash > 0 ? Math.round(f.cash * (inst ? inst.data.mult || 1 : 1)) : f.cash;
// Testo breve degli effetti di una scelta, mostrato sotto il pulsante e nel risultato.
function fxText(f, inst) {
  const o = [];
  if (f.cash) { const c = gain(f, inst); o.push(`${c > 0 ? '+' : '−'}$${Math.abs(c)}k`); }
  if (f.rep) o.push(`reputazione ${f.rep > 0 ? '+' : ''}${f.rep}`);
  if (f.mor) o.push(`rapporto col giocatore ${f.mor > 0 ? '+' : ''}${f.mor}${f.all ? ' (tutti i clienti)' : ''}`);
  if (f.tr) o.push(`rapporto con la squadra ${f.tr > 0 ? '+' : ''}${f.tr}`);
  if (f.br) o.push(`rapporto con lo sponsor ${f.br > 0 ? '+' : ''}${f.br}`);
  if (f.hype) o.push(`popolarità ${f.hype > 0 ? '+' : ''}${f.hype}`);
  if (f.ovr) o.push(`valutazione ${f.ovr > 0 ? '+' : ''}${f.ovr}`);
  if (f.raise) o.push(`stipendio +${Math.round(f.raise * 100)}%`);
  if (f.height) o.push(`+${f.height} cm`);
  if (f.weight) o.push(`${f.weight > 0 ? '+' : ''}${f.weight} kg`);
  if (f.pot) o.push(`potenziale ${f.pot > 0 ? '+' : ''}${f.pot}`);
  if (f.draftBoost) o.push(f.draftBoost > 0 ? 'sale nelle previsioni del Draft' : 'scende nelle previsioni del Draft');
  if (f.stayCollege) o.push('salta questo Draft');
  if (f.inj) o.push(`fermo ${f.inj} sett.`);
  if (f.comm) o.push(`commissione ${f.comm > 0 ? '+' : ''}${f.comm}%`);
  if (f.leave) o.push('lascia l\'agenzia');
  if (f.trade) o.push('ceduto a una big');
  if (f.sponsor && inst && inst.data.value) {
    const v = r1(inst.data.value * f.sponsor);
    o.push(`sponsor ${fmtM(v)}/anno (tua quota ${fmt$(v * 1e6 * SPONSOR_CUT)})`);
  }
  if (f.sponsorCut) o.push('sponsor ridotto del 30%');
  if (f.dropSponsor) o.push('perde lo sponsor');
  if (f.gem) o.push('scopri un talento nascosto');
  if (f.look) o.push('👤 ' + Object.entries(f.look).map(([k, v]) => LOOK_TXT[k](v)).join(', '));
  if (f.odds) o.push(`${Math.round(f.odds[0] * 100)}%: ${fxText(f.odds[1], inst) || 'niente'} · altrimenti: ${fxText(f.odds[2], inst) || 'niente'}`);
  return o.join(' · ');
}
function applyFx(f, inst, p) {
  if (f.cash) { const c = gain(f, inst); c > 0 ? earn(c * 1000) : spend(-c * 1000); }
  if (f.rep) changeRep(f.rep);
  const targets = f.all ? clients() : p ? [p] : [];
  for (const x of targets) if (f.mor) x.morale = clamp(Math.round(x.morale + (f.mor < 0 && hasTrait(x, 'permaloso') ? f.mor * 1.4 : f.mor)), 0, 100);
  if (f.height && p) { if (!p.h) genBody(p); p.h += f.height; }
  if (f.weight && p) { if (!p.h) genBody(p); p.w += f.weight; }
  if (f.raise && p && p.team != null) p.salary = Math.min(MAX_SAL, r1(p.salary * (1 + f.raise)));
  if (f.br) changeBrandRel(inst.data.b, f.br);
  if (!p) { if (f.gem) findGem(); return; }
  if (f.tr) changeTeamRel(p.team, f.tr);
  if (f.hype) p.hype = clamp(p.hype + f.hype, 0, 100);
  if (f.ovr) { p.ovr = clamp(p.ovr + f.ovr, 35, 99); p.pot = Math.max(p.pot, p.ovr); }
  if (f.pot) p.pot = clamp(p.pot + f.pot, p.ovr, 99);
  if (f.pot || f.ovr) capPot(p);
  if (f.draftBoost) p.draftBoost = (p.draftBoost || 0) + f.draftBoost;
  if (f.stayCollege && p.school) p.skipDraft = S.season;
  if (f.inj) {
    const k = careFactor(p);
    if (k < 1 && chance((1 - k) * 0.5)) { /* i medici lo hanno fermato in tempo */ }
    else { const w = Math.max(1, Math.round(f.inj * k)); p.injury = Math.max(p.injury, w); injuryHit(p, w); }
  }
  if (f.comm) p.comm = clamp(p.comm + f.comm, 1, 4);
  if (f.look) { p.look = { ...(p.look || {}), ...f.look }; if (f.look.number != null) p.num = f.look.number; }
  if (f.sponsor && inst.data.value) {
    if (p.sponsors.length >= 4) p.sponsors.sort((a, b) => a.value - b.value).shift();
    p.sponsors.push({ brand: inst.data.b, value: r1(inst.data.value * f.sponsor), years: inst.data.years });
    p.sponsorCount = (p.sponsorCount || 0) + 1;
    checkGoal('sponsor', true);
    chalUpdate('sponsors', 1);
  }
  if (f.sponsorCut) { const s = p.sponsors.find(x => x.brand === inst.data.b) || p.sponsors[0]; if (s) { s.value = r1(s.value * 0.7); } }
  if (f.dropSponsor && p.sponsors.length) {
    const i = Math.max(0, p.sponsors.findIndex(x => x.brand === inst.data.b));
    changeBrandRel(p.sponsors[i].brand, -8);
    p.sponsors.splice(i, 1);
  }
  if (f.trade && p.team != null) { const to = tradePlayer(p, true); addNews(`🔁 ${esc(p.name)} passa ai ${esc(teamName(to))}.`); }
  if (f.gem) findGem();
  if (f.leave && isClient(p)) lose(p);
}
function findGem() {
  const g = newPlayer('prospect');
  Object.assign(g, { age: randi(17, 19), ovr: randi(56, 63), school: 'Liceo di Akron (Ohio)', scouted: true, agency: null }); setNat(g, 'USA');
  g.pot = randi(86, 96);
  S.players[g.id] = g;
  addNews(`🔭 Il tuo scout ha trovato <b>${esc(g.name)}</b>, talento del liceo con potenziale ~${g.pot}. Lo trovi nel Mercato, tra i prospetti.`, 'good');
}
// Probabilità mostrata e usata per una scelta (null se non c'è nulla di incerto).
function choiceProb(ch, inst, p) {
  if (ch.fx.odds) return ch.ask ? askProb(ch.fx.odds[0], ch.ask, inst, p) : ch.fx.odds[0];
  if (ch.ask) return askProb(0.7, ch.ask, inst, p);
  return null;
}
function choiceHint(ch, inst, p) {
  const pr = choiceProb(ch, inst, p);
  let h;
  if (ch.fx.odds) {
    const f = { ...ch.fx }; delete f.odds;
    h = [fxText(f, inst), `${Math.round(pr * 100)}%: ${fxText(ch.fx.odds[1], inst) || 'niente'} · altrimenti: ${fxText(ch.fx.odds[2], inst) || 'niente'}`].filter(Boolean).join(' · ');
  } else {
    h = fxText(ch.fx, inst) || 'nessun effetto';
    if (ch.ask) h = `${Math.round(pr * 100)}% che ${WHO_TXT[ch.ask]} accetti: ${h}`;
  }
  const rel = [ch.tr ? `squadra ${ch.tr > 0 ? '+' : ''}${ch.tr}` : '', ch.br ? `sponsor ${ch.br > 0 ? '+' : ''}${ch.br}` : ''].filter(Boolean).join(', ');
  if (rel) h += ` · rapporto ${rel}`;
  if (ch.ask) h += ` · rapporto attuale con ${WHO_TXT[ch.ask]}: ${relLabel(relOf(ch.ask, inst, p))}`;
  if (ch.risk) h += ` · ⚠️ ${Math.round(ch.risk.p * 100)}%: ${ch.risk.note}`;
  return h;
}
function resolveEvent(instId, idx) {
  const inst = S.inbox.find(e => e.id === instId); if (!inst) return;
  const e = EVENTS.find(x => x.id === inst.ev), ch = e && e.choices[idx];
  if (!ch) { S.inbox = S.inbox.filter(x => x.id !== instId); UI.render(); return; }
  const p = inst.pid != null ? P(inst.pid) : null;
  const cost = Math.max(0, -(ch.fx.cash || 0)) * 1000;
  if (cost && S.cash < cost) return toast(`Servono ${fmt$(cost)}: non hai abbastanza contanti.`);
  const f = { ...ch.fx }, pr = choiceProb(ch, inst, p);
  // cambia il rapporto con squadra e sponsor in base alla scelta
  applyFx({ tr: ch.tr, br: ch.br }, inst, p);
  let out;
  if (f.odds) {
    const [, win, bad] = f.odds; delete f.odds;
    const ok = chance(pr), res = ok ? win : bad;
    applyFx(f, inst, p); applyFx(res, inst, p);
    out = (ok ? '✅ È andata bene! ' : '❌ Non è andata come speravi. ') + [fxText(f, inst), fxText(res, inst)].filter(Boolean).join(' · ');
  } else if (ch.ask && !chance(pr)) {
    // la controparte dice di no: paghi comunque i costi e il rapporto peggiora
    const no = { cash: f.cash < 0 ? f.cash : 0 };
    if (ch.ask === 'player') no.mor = -5;
    if (ch.ask === 'team') no.tr = -3;
    if (ch.ask === 'brand') no.br = -3;
    applyFx(no, inst, p);
    out = `❌ ${WHO_TXT[ch.ask].replace(/^./, c => c.toUpperCase())} non ha accettato. ${fxText(no, inst)}`;
  } else {
    applyFx(f, inst, p);
    out = (ch.ask ? '✅ Ha accettato! ' : '') + (fxText(f, inst) || 'Fatto.');
  }
  if (ch.risk && p && chance(ch.risk.p)) {
    applyFx(ch.risk.fx, inst, p);
    out += ` · ⚠️ ${ch.risk.note.replace(/^./, c => c.toUpperCase())}: ${fxText(ch.risk.fx, inst)}`;
  }
  S.inbox = S.inbox.filter(x => x.id !== instId);
  addNews(`${inst.ico} <b>${esc(inst.title)}</b> → ${esc(ch.label)}. ${esc(out)}`);
  save(); UI.render(); toast(`${ch.label}: ${out}`);
}
function lose(p) {
  if (S.chal) for (const c of S.chal.list) if (c.id === 'loyal' && !c.done) c.failed = true;
  S.clients = S.clients.filter(id => id !== p.id);
  S.offers = S.offers.filter(o => o.pid !== p.id);
  S.inbox = S.inbox.filter(e => e.pid !== p.id);
  p.agency = pick(RIVALS); p.lockedUntil = S.season + 2;
  changeRep(-clamp((p.ovr - 60) / 8, 0.5, 4));
  addNews(`💔 Hai perso ${esc(p.name)}, passato a un'agenzia rivale.`, 'bad');
}
function tradePlayer(p, toContender, dest = null) {
  const cur = p.team;
  let pool = S.teams.filter(t => t.id !== cur);
  if (toContender) pool = standings().filter(t => t.id !== cur).slice(0, 12);
  const to = dest != null ? S.teams[dest] : pick(pool);
  // contropartita: un giocatore di valore simile fa il viaggio opposto
  const back = rosterOf(to.id).filter(x => !isClient(x)).sort((a, b) => Math.abs(a.salary - p.salary) - Math.abs(b.salary - p.salary))[0];
  if (back) back.team = cur;
  p.team = to.id;
  return to;
}


/* ================================================================== */
/* Bisogni delle squadre e scambi                                      */
/* ================================================================== */
const POS_LIST = ['PG', 'SG', 'SF', 'PF', 'C'];
const POS_ART = { PG: 'un play', SG: 'una guardia', SF: 'un\'ala piccola', PF: 'un\'ala grande', C: 'un centro' };
const TRADE_DEADLINE = 14; // dopo questa settimana della stagione regolare il mercato degli scambi chiude
const TRADE_EVAL = 8;      // settimane dopo cui le squadre giudicano lo scambio
const tradeOpen = () => S.phase === 'fa' || (S.phase === 'reg' && S.week <= TRADE_DEADLINE);
let NEEDS = null;
// titolare e riserva di ogni ruolo (giocatori sani)
function slotsAt(tid) {
  const out = {};
  for (const [pid, e] of depthChart(tid, true)) {
    const o = out[e.pos] = out[e.pos] || {};
    if (e.slot === 'start') o.s = S.players[pid]; else if (e.slot === 'bench') o.b = S.players[pid];
  }
  return out;
}
function needData() {
  if (NEEDS && NEEDS.turn === S.turn && NEEDS.v === (S.tradeV || 0)) return NEEDS;
  const sl = S.teams.map(t => slotsAt(t.id)), med = {};
  for (const pos of POS_LIST) { const v = sl.map(x => x[pos] && x[pos].s ? x[pos].s.ovr : 60).sort((a, b) => a - b); med[pos] = v[15]; }
  return NEEDS = { turn: S.turn, v: S.tradeV || 0, sl, med };
}
// in quali ruoli una squadra ha più bisogno: confronta titolare e riserva con il resto della lega
function teamNeeds(tid) {
  const { sl, med } = needData(), me = sl[tid];
  return POS_LIST.map(pos => {
    const s = me[pos] && me[pos].s ? me[pos].s.ovr : 52, b = me[pos] && me[pos].b ? me[pos].b.ovr : 50;
    const gap = (med[pos] - s) + Math.max(0, med[pos] - 9 - b) * 0.35;
    return { pos, gap, lvl: gap >= 5 ? 2 : gap >= 1.5 ? 1 : 0 };
  }).sort((a, b) => b.gap - a.gap);
}
const needOf = (tid, pos) => teamNeeds(tid).find(n => n.pos === pos);
// quanto un giocatore migliorerebbe quel ruolo (senza chi se ne va)
function fitGain(tid, inP, outP) {
  const me = needData().sl[tid][inP.pos] || {};
  let s = me.s; if (outP && s && s.id === outP.id) s = me.b;
  let cmp = s ? s.ovr : 52;
  if (outP && outP.pos === inP.pos) cmp = Math.max(cmp, outP.ovr); // se se ne va uno dello stesso ruolo, il confronto è con lui
  return inP.ovr - cmp;
}
function needBonus(tid, inP, outP) {
  const g = fitGain(tid, inP, outP), n = needOf(tid, inP.pos);
  return clamp(g * 0.3, -1, 4) + (g > -2 ? n.lvl : 0);
}
// valore di un giocatore per una squadra: talento, età, contratto
function tradeVal(p) {
  let v = p.ovr;
  if (p.age <= 24) v += (p.pot - p.ovr) * 0.35;
  if (p.age >= 31) v -= (p.age - 30) * 1.1;
  return v - clamp((p.salary - marketValue(p)) / 4, -3, 5);
}
// un giocatore che entra in un roster deve rispettare il tetto salariale (o pareggiare gli stipendi)
function tradeLegal(p, x, tid) {
  if (!x) return rosterOf(tid).length < 15 && CAP - payroll(tid) >= p.salary;
  const hi = Math.max(p.salary, x.salary), lo = Math.min(p.salary, x.salary);
  if (hi <= lo * 1.25 + 2) return true;
  const recv = p.salary > x.salary ? tid : p.team; // chi riceve lo stipendio più alto
  return CAP - payroll(recv) >= hi - lo;
}
const teamYes = (d, tid) => stakeOf(tid) >= 100 ? 1 : 1 / (1 + Math.exp(-(d + (teamRel(tid) - 50) / 20) / 2.2));
// probabilità che le due squadre accettino
function tradeOdds(p, x, tid) {
  const a = p.team;
  const dB = tradeVal(p) + needBonus(tid, p, x) - (x ? tradeVal(x) : 64);
  const dA = x ? tradeVal(x) + needBonus(a, x, p) - tradeVal(p) : 64 + clamp((p.salary - marketValue(p)) / 3, 0, 4) - tradeVal(p);
  const pB = teamYes(dB, tid), pA = teamYes(dA, a);
  return { pA, pB, c: clamp(pA * pB, 0.02, 0.92) };
}
function tradeCands(p, tid) {
  const out = rosterOf(tid).filter(x => !isClient(x) && !x.injury && tradeLegal(p, x, tid))
    .map(x => ({ x, ...tradeOdds(p, x, tid), g: fitGain(p.team, x, p) }))
    .sort((u, v) => v.c - u.c || v.g - u.g).slice(0, 6);
  if (tradeLegal(p, null, tid)) out.push({ x: null, ...tradeOdds(p, null, tid), g: 0 });
  return out;
}
// premio di una squadra contenta: cresce con il livello del giocatore arrivato, ma resta contenuto
const tradeFee = p => Math.round(clamp(Math.pow(Math.max(0, p.ovr - 60) / 25, 2) * 60000, 3000, 60000) / 1000) * 1000;
const gsOf = p => p.pts + p.reb * 0.5 + p.ast * 0.7;
function tradeBlock(p) {
  if (!tradeOpen()) return S.phase === 'reg' ? `Il mercato degli scambi ha chiuso dopo la settimana ${TRADE_DEADLINE}. Riapre in estate.` : 'In questo momento le squadre non fanno scambi: riprovaci in Free Agency o a inizio stagione.';
  if (p.tradeDone === S.season) return `${p.name} è già stato scambiato in questa stagione. Lascialo ambientare.`;
  if (p.lastRec === S.turn) return `Hai già proposto ${p.name} a una squadra questa settimana.`;
  return '';
}
function proposeTrade(pid, tid, xid) {
  const p = P(pid), x = xid != null ? P(xid) : null, a = p.team, A = S.teams[a], B = S.teams[tid];
  const why = tradeBlock(p); if (why) return { msg: why, type: 'warn' };
  if (x && x.team !== tid) return { msg: 'Quel giocatore non è più lì.', type: 'warn' };
  if (!tradeLegal(p, x, tid)) return { msg: 'Gli stipendi non tornano: con il tetto salariale questo scambio non si può fare.', type: 'warn' };
  p.lastRec = S.turn;
  const o = tradeOdds(p, x, tid);
  if (!chance(o.pB)) { changeTeamRel(tid, -3); return { msg: `I ${B.name} hanno detto di no: ${x ? 'non vogliono rinunciare a ' + x.name : 'non sono interessati'}. Il rapporto con loro cala un po'.`, type: 'bad' }; }
  if (!chance(o.pA)) { changeTeamRel(a, -2); return { msg: `I ${B.name} erano d'accordo, ma i ${A.name} hanno bloccato tutto: non vogliono perdere ${p.name}. Il rapporto con loro cala un po'.`, type: 'bad' }; }
  // si fa: prima la foto della situazione, per giudicare lo scambio più avanti
  const snap = q => q ? { gp: q.gp, gs: gsOf(q) } : null;
  (S.trades = S.trades || []).push({ season: S.season, pid, xid: x ? x.id : null, a, b: tid, wk: 0,
    rec: { a: [A.w, A.l], b: [B.w, B.l] }, sp: snap(p), sx: snap(x) });
  const fit = teamFit(p, tid, p.salary)[0];
  p.team = tid; if (x) x.team = a;
  p.tradeDone = S.season; S.tradeV = (S.tradeV || 0) + 1;
  p.morale = clamp(p.morale + 3 + Math.round(fit * 5), 0, 100);
  changeTeamRel(tid, 2); changeTeamRel(a, 1);
  addNews(`🔁 Scambio firmato grazie a te: <b>${esc(p.name)}</b> passa ai ${esc(B.name)}${x ? `, ${esc(x.name)} fa il viaggio opposto` : ''}. Tra qualche settimana le squadre tireranno le somme.`, 'good');
  return { msg: `${p.name} ora gioca nei ${B.name}: ${roleTxt(p, tid)}.`, type: 'good' };
}
// dopo qualche settimana le squadre giudicano: chi ci ha guadagnato ti premia, chi ci ha perso se lo ricorda
function tradeWeek(final = false) {
  if (!S.trades || !S.trades.length) return;
  const keep = [];
  for (const T of S.trades) {
    if (!final) T.wk++;
    const p = S.players[T.pid], x = T.xid != null ? S.players[T.xid] : null;
    const gp = p ? p.gp - T.sp.gp : 0;
    if (!final && T.wk < TRADE_EVAL) { keep.push(T); continue; }
    if (!p || p.retired || T.season !== S.season || gp < 4) continue; // troppo presto o non più valutabile
    const perG = (q, s0) => q && s0 && q.gp - s0.gp > 0 ? (gsOf(q) - s0.gs) / (q.gp - s0.gp) : null;
    const gp1 = perG(p, T.sp), gx = x ? perG(x, T.sx) : null;
    const wp = (tid, r0) => { const t = S.teams[tid], w = t.w - r0[0], l = t.l - r0[1]; const before = r0[0] + r0[1] >= 8 ? r0[0] / (r0[0] + r0[1]) : 0.5; return (w + l ? w / (w + l) : 0.5) - before; };
    const sB = ((gp1 || 0) - (gx ?? 6)) / 6 + wp(T.b, T.rec.b) * 5;
    const sA = ((gx ?? 0) - (gp1 || 0)) / 6 + wp(T.a, T.rec.a) * 5 + (x ? 0 : 0.6);
    for (const [tid, sc, got] of [[T.b, sB, p], [T.a, sA, x]]) {
      const t = S.teams[tid];
      if (sc > 0.4) {
        const fee = got ? tradeFee(got) : 3000;
        earn(fee); changeTeamRel(tid, 5); changeRep(0.3);
        addNews(`🤝 I ${esc(t.name)} sono contenti dello scambio ${got ? 'per ' + esc(got.name) : 'di ' + esc(p.name)}: ti mandano un premio di ${fmt$(fee)} e ora si fidano di più di te.`, 'good');
        UI.pendingToast = UI.pendingToast || [`I ${t.name} ti ringraziano per lo scambio: premio di ${fmt$(fee)}.`, 'good', 'Scambio riuscito!'];
      } else if (sc < -0.4) {
        changeTeamRel(tid, -5);
        addNews(`😤 I ${esc(t.name)} sono delusi dallo scambio ${got ? 'per ' + esc(got.name) : 'di ' + esc(p.name)}: il rapporto con loro peggiora.`, 'bad');
      }
    }
  }
  S.trades = final ? [] : keep;
}

/* ================================================================== */
/* Informatore e legame con i prospetti del prossimo Draft             */
/* ================================================================== */
const INFORMER_LV = ['Non assunto', 'Scarso', 'Discreto', 'Buono', 'Ottimo', 'Leggendario'];
function informerWeek() {
  const lv = S.staff.informer || 0;
  if (!lv || !chance(0.2 + lv * 0.07)) return;
  const pros = Object.values(S.players).filter(p => p.school && !p.retired && !isClient(p));
  if (!pros.length) return;
  // più è bravo, più le sue soffiate riguardano i veri talenti
  const noise = 14 - lv * 2.4;
  const ranked = pros.map(p => [p, p.pot + gauss() * noise]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const p = ranked[randi(0, Math.min(9, ranked.length - 1))];
  const sd = Math.max(1.5, 9 - lv * 1.6);
  const r = Math.random();
  let text, type = 'pot';
  if (r < 0.25 && !p.bondTip && !p.agency) {
    p.bondTip = true; type = 'bond';
    text = `${p.name} (${p.school}) cerca un agente che lo segua da vicino: se lo coltivi ora, il legame crescerà il doppio.`;
  } else if (r < 0.45 && !p.agency && p.rivalDeadline == null) {
    p.rivalDeadline = S.turn + randi(2, 5); p.rivalWho = pick(RIVALS); type = 'rival';
    text = intelText({ type, pid: p.id });
  } else {
    let est = Math.round(p.pot + gauss() * sd);
    if (lv <= 2 && chance(0.3 - lv * 0.1)) est += pick([-1, 1]) * randi(5, 10); // l'informatore scarso a volte prende cantonate
    est = clamp(est, p.ovr, 99);
    if (p.intelSd == null || sd <= p.intelSd) { p.intelPot = est; p.intelSd = sd; }
    text = `${p.name} (${p.school}): secondo me il suo potenziale è ~${est}.`;
  }
  S.intel.unshift({ when: `${seasonLabel()} · ${phaseLabel()}`, pid: p.id, text, lv, type });
  pruneIntel();
  addNews(`🕵️ Soffiata dell'informatore: ${esc(text)}`);
  UI.pendingToast = UI.pendingToast || [text, 'intel'];
}
// Le agenzie rivali corteggiano i prospetti migliori: ci provano sempre di più man mano che il Draft si avvicina
const RIVAL_PITCH = ['gli ha regalato un orologio da 20.000 dollari', 'ha portato sua madre a cena in un ristorante stellato', 'gli ha promesso uno sponsor di scarpe prima ancora del Draft',
  'si è presentato a ogni sua partita in prima fila', 'ha assunto suo cugino come autista', 'gli ha fatto visitare la sede con l\'elicottero'];
function rivalCourtWeek() {
  if (!['fa', 'reg', 'po'].includes(S.phase)) return;
  const free = draftBoard().slice(0, 30).map((p, i) => [p, i]).filter(([p]) => !p.agency && !isClient(p) && p.rivalDeadline == null);
  if (!free.length) return;
  const heat = S.phase === 'fa' ? 0.15 : S.phase === 'reg' ? 0.2 + S.week / REG_WEEKS * 0.3 : 0.6;
  const n = (chance(heat) ? 1 : 0) + (chance(heat * 0.3) ? 1 : 0);
  for (let k = 0; k < n && free.length; k++) {
    // i primi della lista attirano più agenti
    let r = Math.random() * free.reduce((s, [, i]) => s + 1 / (i + 3), 0), j = 0;
    for (; j < free.length - 1; j++) { r -= 1 / (free[j][1] + 3); if (r <= 0) break; }
    const [p, i] = free.splice(j, 1)[0];
    const weeks = randi(2, 4);
    p.rivalDeadline = S.turn + weeks; p.rivalWho = pick(RIVALS);
    const mine = (p.bond || 0) > 0 || S.talks[p.id];
    addNews(`🦈 ${esc(p.rivalWho)} corteggia <b>${esc(p.name)}</b> (${esc(p.school)}, oggi #${i + 1} al Draft): ${pick(RIVAL_PITCH)}. Se non ti muovi, tra ${weeks} settimane firma con loro.`, mine ? 'bad' : '');
    if (mine || i < 10) UI.pendingToast = UI.pendingToast || [`${p.rivalWho} vuole ${p.name}: hai ${weeks} settimane per convincerlo.`, 'warn', 'Concorrenza!'];
  }
}
// a che punto è un rivale con un prospetto: dipende da quante settimane mancano alla firma
function rivalStage(p) {
  const w = p.rivalDeadline - S.turn;
  return w >= 4 ? ['ancora agli inizi', 'l'] : w >= 2 ? ['in contatto ravvicinato', 'm'] : ['questione di firme', 'h'];
}
function intelText(r) {
  const p = S.players[r.pid];
  if (r.type === 'rival' && p.rivalDeadline != null) {
    const w = p.rivalDeadline - S.turn, st = rivalStage(p)[0];
    return `${p.rivalWho} è ${st === 'questione di firme' ? 'a un passo da' : st === 'ancora agli inizi' ? 'ancora agli inizi con' : 'in contatto ravvicinato con'} ${p.name} (${p.school}). ${w <= 1 ? 'È questione di firme: hai questa settimana per convincerlo.' : `Hai ${w} settimane per convincerlo.`}`;
  }
  return r.text;
}
// le soffiate scadono: via quelle su chi hai già preso, chi ha firmato con altri, chi è già stato scelto al Draft
function intelValid(r) {
  const p = S.players[r.pid];
  if (!p || p.retired || !p.school || isClient(p)) return false;
  if (r.type === 'rival') return !p.agency && p.rivalDeadline != null && S.turn < p.rivalDeadline;
  if (r.type === 'bond') return !p.agency && !!p.bondTip;
  return true;
}
function pruneIntel() {
  for (const r of S.intel || []) if (!r.type) r.type = /sta per far firmare/.test(r.text) ? 'rival' : /cerca un agente/.test(r.text) ? 'bond' : 'pot'; // soffiate dei salvataggi vecchi
  S.intel = (S.intel || []).filter(intelValid).slice(0, 20);
}
function rivalDeadlines() {
  for (const p of Object.values(S.players)) {
    if (p.rivalDeadline == null || S.turn < p.rivalDeadline) continue;
    if (!isClient(p) && !p.agency && p.school) {
      // chi ti è legato resiste: con un legame forte non cede mai, con uno medio a volte dice di no
      const b = p.bond || 0;
      if (b < 60 && chance(0.85 - b / 100)) {
        p.agency = p.rivalWho; p.bondTip = false;
        const talk = !!S.talks[p.id]; delete S.talks[p.id];
        addNews(`🦈 ${esc(p.rivalWho)} ha fatto firmare ${esc(p.name)} prima di te${talk ? ': la vostra trattativa salta' : ''}.`, b > 0 || talk ? 'bad' : '');
      } else {
        if (b > 0) p.bond = clamp(b + 5, 0, 100);
        addNews(`💪 ${esc(p.name)} ha detto no a ${esc(p.rivalWho)}${b >= 30 ? ': aspetta te' : ''}.`, b >= 30 ? 'good' : '');
      }
    }
    p.rivalDeadline = null;
  }
  pruneIntel();
}
const cultivateCost = p => Math.round(Math.max(1000, (starPower(p) - 50) * 180) / 100) * 100;
function cultivate(pid) {
  const p = P(pid);
  if (p.lastBond === S.turn) return { msg: 'Lo hai già incontrato questa settimana.', type: 'warn' };
  const cost = cultivateCost(p);
  if (S.cash < cost) return { msg: `Servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); p.lastBond = S.turn;
  let gain = randi(6, 12) + (S.staff.informer || 0) * 2;
  const tip = p.bondTip; if (tip) { gain *= 2; p.bondTip = false; }
  p.bond = clamp((p.bond || 0) + gain, 0, 100);
  const what = pick(['Hai visto una sua partita in prima fila', 'Cena con la sua famiglia', 'Gli hai regalato un paio di Naik',
    'Lo hai invitato al tuo camp estivo', 'Lunga chiacchierata dopo l\'allenamento', 'Hai conosciuto il suo allenatore del college']);
  return { msg: `${what}. Legame con ${p.name} ${p.bond}/100 (+${gain}${tip ? ', raddoppiato dalla soffiata' : ''}).`, type: 'good' };
}
// Prima del Draft i prospetti con cui hai un legame forte possono scegliere te
function bondedJoin() {
  const pros = Object.values(S.players).filter(p => p.school && !p.retired && !isClient(p) && (p.bond || 0) >= 70)
    .sort((a, b) => b.bond - a.bond);
  for (const p of pros) {
    if (clients().length >= capacity()) break;
    if (!chance(0.35 + (p.bond - 70) / 60)) continue;
    p.comm = 3; p.agency = S.agency; p.morale = clamp(60 + Math.round(p.bond / 3), 0, 100); p.scouted = true;
    p.rivalDeadline = null; p.bondTip = false;
    S.clients.push(p.id); pruneIntel();
    chalUpdate('sign', p.ovr, 'max');
    addNews(`🤝 <b>${esc(p.name)}</b> ti ha scelto come agente prima del Draft, grazie al legame che avete costruito!`, 'good');
    UI.pendingToast = [`${p.name} ti ha scelto come agente prima del Draft!`, 'good'];
  }
}

/* ================================================================== */
/* Consigliare un giocatore a una squadra                              */
/* ================================================================== */
// Posizione al Draft di ogni squadra se la stagione finisse oggi (le peggiori scelgono prima)
const draftSlot = tid => [...standings()].reverse().findIndex(t => t.id === tid) + 1;
const draftScore = p => p.ovr * 0.55 + p.pot * 0.45 + p.teamNoise * 3 + (p.draftBoost || 0) + (p.draftForm || 0);
// Dove lo sceglierebbero oggi le squadre
// classifica dei prospetti per il prossimo Draft
function draftBoard() { return Object.values(S.players).filter(x => x.school && !x.retired && x.skipDraft !== S.season).sort((a, b) => draftScore(b) - draftScore(a)); }
// proiezione con il movimento della settimana: "#12 ↑6"
function projTxt(p) {
  const now = draftProjection(p); if (!now) return '';
  const d = p.projWas ? p.projWas - now : 0;
  return `#${now}${d ? ` <span class="${d > 0 ? 'good' : 'bad'}">${d > 0 ? '↑' : '↓'}${Math.abs(d)}</span>` : ''}`;
}
/* Ogni settimana al college: partite buone e cattive, voci, osservatori. La proiezione si muove. */
const PROSPECT_NEWS = [
  { ph: ['reg'], b: 4, t: '{N} ({S}) segna 38 punti contro una delle migliori difese del campionato. Gli osservatori NBA prendono appunti.' },
  { ph: ['reg'], b: 3, t: 'Tripla doppia per {N} ({S}) in diretta nazionale. Il suo nome sale nelle liste di molte squadre.' },
  { ph: ['reg'], b: -3, t: 'Serata da dimenticare per {N} ({S}): 2 su 15 al tiro con venti osservatori NBA in tribuna.' },
  { ph: ['reg'], b: -5, inj: true, t: '{N} ({S}) si rompe il polso: stagione finita. Le squadre NBA aspettano le visite mediche.' },
  { ph: ['reg'], b: -3, t: '{N} ({S}) sospeso per tre partite dopo una lite con il suo allenatore.' },
  { ph: ['reg'], b: 2, t: '{N} ({S}) è cresciuto di 3 centimetri in un anno. Alcuni scout lo vedono in un ruolo nuovo.', h: 3 },
  { ph: ['reg', 'po'], b: 4, ncaa: true, t: '{N} ({S}) trascina il suo college nel torneo di marzo con 27 punti di media.' },
  { ph: ['reg', 'po'], b: 4, ncaa: false, t: '{N} ({S}) è il migliore dei playoff del suo campionato: 24 punti di media contro uomini di 30 anni.' },
  { ph: ['po'], b: 3, t: 'Alla Combine {N} salta più in alto di tutti. Due squadre chiedono un provino privato.' },
  { ph: ['po'], b: -4, t: 'Alla Combine i medici trovano un problema al ginocchio di {N}. Alcune squadre lo tolgono dalla lista.' },
  { ph: ['po', 'draft'], b: -3, t: 'Colloquio disastroso di {N} con un GM: è arrivato in ritardo e ha parlato solo di macchine.' },
  { ph: ['po', 'draft'], b: 2, t: 'Provino privato perfetto per {N}: si dice che una squadra della lotteria lo voglia a tutti i costi.' },
  { ph: ['fa', 'reg'], b: -2, t: 'Spuntano vecchi post di {N} di quando aveva 15 anni. La sua squadra lo difende, ma qualche squadra NBA si raffredda.' },
];
// gioca in un college americano (non all'estero, non in G-League)
const isNcaa = p => !!p.school && !/\(|G-League/.test(p.school);
function prospectWeek() {
  if (!['fa', 'reg', 'po', 'draft'].includes(S.phase)) return;
  const board = draftBoard();
  board.forEach((p, i) => { p.projWas = i + 1; });
  for (const p of board) {
    // forma della stagione: alti e bassi che durano qualche settimana
    p.draftForm = r1((p.draftForm || 0) * 0.88 + gauss() * (S.phase === 'reg' ? 0.9 : 0.4));
  }
  // una notizia sui prospetti più seguiti (mai i tuoi: a loro capitano gli imprevisti)
  if (chance(0.55)) {
    const pool = board.slice(0, 40).filter(p => !isClient(p));
    const opts = PROSPECT_NEWS.filter(n => n.ph.includes(S.phase));
    if (pool.length && opts.length) {
      const p = pick(pool), n = pick(opts.filter(n => n.ncaa == null || n.ncaa === isNcaa(p)));
      p.draftBoost = (p.draftBoost || 0) + n.b;
      if (n.h) p.h = (p.h || 200) + n.h;
      if (n.inj) p.injury = Math.max(p.injury || 0, 6);
      p.hype = clamp((p.hype || 0) + (n.b > 0 ? 4 : -2), 0, 100);
      addNews(`${n.b > 0 ? '📈' : '📉'} ${esc(n.t.replace(/\{N\}/g, p.name).replace(/\{S\}/g, p.school))}`);
    }
  }
}
function draftProjection(p) {
  if (!p.school) return null;
  return draftBoard().indexOf(p) + 1;
}
function recChance(p, tid) {
  if (stakeOf(tid) >= 100) return 1; // è la tua squadra
  const rel = teamRel(tid);
  let c = (p.school ? 0.25 : p.team == null ? 0.2 : 0.08) + rel / 100 * 0.6;
  if (p.school) { // promettere una scelta molto più alta del suo valore è difficile
    const gap = draftSlot(tid) - (draftProjection(p) || 60);
    if (gap < 0) c -= Math.min(0.4, -gap * 0.03);
  } else if (p.team != null) c *= p.years > 1 ? 1 : 1.3;
  c += needOf(tid, p.pos).lvl * 0.06;
  return clamp(c, 0.03, 0.9);
}
function recommend(pid, tid) {
  const p = P(pid), t = S.teams[tid];
  if (p.lastRec === S.turn) return { msg: `Hai già parlato di ${p.name} con una squadra questa settimana.`, type: 'warn' };
  if (p.team === tid) return { msg: `${p.name} gioca già nei ${t.name}.`, type: 'warn' };
  // per chi ha già una squadra si propone uno scambio (i bot scelgono la contropartita migliore)
  if (p.team != null && !p.school) { const c = tradeCands(p, tid)[0]; return c ? proposeTrade(pid, tid, c.x ? c.x.id : null) : { msg: 'Nessuno scambio possibile con quella squadra.', type: 'warn' }; }
  p.lastRec = S.turn;
  const ok = chance(recChance(p, tid));
  if (!ok) {
    changeTeamRel(tid, -2);
    return { msg: `I ${t.name} ti hanno ascoltato, ma non sono convinti. Il rapporto con loro cala un po'.`, type: 'bad' };
  }
  changeTeamRel(tid, 1);
  if (p.school) {
    p.promise = tid; p.draftBoost = (p.draftBoost || 0) + 4;
    if (!isClient(p)) p.bond = clamp((p.bond || 0) + 10, 0, 100);
    addNews(`📣 I ${esc(teamName(t))} hanno messo ${esc(p.name)} nella loro lista: se è libero al loro turno, lo sceglieranno.`, 'good');
    return { msg: `I ${t.name} lo sceglieranno se è ancora libero alla loro scelta (oggi la #${draftSlot(tid)}).`, type: 'good' };
  }
  if (p.team == null) {
    makeOffersFor(p, 1, tid, false);
    return { msg: `I ${t.name} gli hanno fatto un'offerta: la trovi nelle trattative.`, type: 'good' };
  }
}

/* ================================================================== */
/* Mercato con le squadre: preferenze, valore stimato, asta e bluff    */
/* ================================================================== */
const PREFS = { soldi: ['💰', 'i soldi'], vincere: ['🏆', 'vincere'], citta: ['🌆', 'una grande città'], minuti: ['⏱️', 'giocare tanti minuti'] };
function prefOf(p) {
  if (!p.pref) {
    p.pref = hasTrait(p, 'avido') ? 'soldi' : hasTrait(p, 'ambizioso') || hasTrait(p, 'leader') ? 'vincere'
      : hasTrait(p, 'vanitoso') || hasTrait(p, 'festaiolo') ? 'citta' : hasTrait(p, 'professionista') || hasTrait(p, 'permaloso') ? 'minuti'
        : pick(Object.keys(PREFS));
  }
  return p.pref;
}
// Quanto gli piace una squadra, da -1 a +1, e perché
function teamFit(p, tid, salary) {
  const t = S.teams[tid], pr = prefOf(p);
  if (pr === 'soldi') { const r = salary / marketValue(p); return [clamp((r - 0.9) * 3, -1, 1), r >= 1 ? 'lo pagano bene' : 'lo pagano poco']; }
  if (pr === 'vincere') {
    // a inizio stagione la classifica non dice niente: conta la forza della rosa
    const early = t.w + t.l < 8;
    const k = early ? [...S.teams].sort((a, b) => teamStrength(b.id) - teamStrength(a.id)).findIndex(x => x.id === tid) + 1 : teamRank(tid);
    return [k <= 8 ? 1 : k <= 16 ? 0.3 : k <= 22 ? -0.4 : -1, early ? `${k}ª rosa più forte della lega` : `squadra ${k}ª della lega`];
  }
  if (pr === 'citta') return [t.market >= 0.75 ? 1 : t.market >= 0.5 ? 0.3 : t.market >= 0.3 ? -0.4 : -1, t.market >= 0.75 ? 'grande città' : t.market >= 0.5 ? 'città media' : 'città piccola'];
  const e = depthChart(tid, false, p.team === tid ? null : p).get(p.id) || { slot: 'deep', min: 0 };
  return [e.slot === 'start' ? 1 : e.slot === 'bench' ? (e.min >= 16 ? 0.4 : -0.2) : e.slot === 'third' ? -0.7 : -1, `sarebbe ${roleTxt(p, tid)}`];
}
const fitIcon = f => `<i class="dot ${f >= 0.6 ? 'good' : f >= 0 ? 'warn' : 'bad'}"></i>`;
// Il valore di mercato non si conosce con precisione: una forbice che l'ufficio legale restringe
function valRange(p) {
  const v = marketValue(p), e = Math.max(0.05, 0.18 - S.staff.legal * 0.026);
  const f = x => r1(x).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `$${f(v * (1 - e))}–${f(v * (1 + e))}M`;
}
// Asta: dici a una squadra che hai un'offerta migliore. Se bluffi possono scoprirti.
function leverage(offerId, claim) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return { msg: 'Offerta non più disponibile.', type: 'warn', done: true };
  if (o.lev) return { msg: 'Hai già giocato questa carta con loro.', type: 'warn' };
  const p = P(o.pid), t = S.teams[o.teamId];
  claim = r1(claim);
  if (!(claim > o.salary)) return { msg: 'Devi citare una cifra più alta della loro offerta.', type: 'warn' };
  o.lev = true;
  const real = Math.max(0, ...S.offers.filter(x => x.pid === o.pid && x.id !== o.id).map(x => x.salary));
  const bluff = claim > real * 1.03;
  if (bluff && chance(clamp(0.3 + (real ? claim / real - 1 : 0.5), 0.3, 0.85))) {
    S.offers = S.offers.filter(x => x.id !== o.id); changeTeamRel(o.teamId, -6);
    addNews(`🃏 I ${esc(teamName(t))} hanno scoperto il tuo bluff su ${esc(p.name)} e hanno ritirato l'offerta.`, 'bad');
    return { msg: `Hanno scoperto il bluff! I ${t.name} ritirano l'offerta e il rapporto con loro peggiora.`, type: 'bad', done: true };
  }
  if (o.max >= claim) { o.salary = r1(Math.min(o.max, claim * rand(1, 1.04))); return { msg: `I ${t.name} rilanciano: ${fmtM(o.salary)} × ${o.years}.`, type: 'good' }; }
  if (o.max >= claim * 0.9) { o.salary = o.max; o.final = true; return { msg: `"Più di così non possiamo": ${fmtM(o.salary)} è la loro offerta finale.`, type: 'info' }; }
  S.offers = S.offers.filter(x => x.id !== o.id); changeTeamRel(o.teamId, -1);
  return { msg: `"Non possiamo competere": i ${t.name} si ritirano.`, type: 'bad', done: true };
}
function expireOffers() {
  const old = S.offers.filter(o => o.expires != null && o.expires < S.turn);
  if (!old.length) return;
  S.offers = S.offers.filter(o => !old.includes(o));
  for (const o of old) { const p = P(o.pid); if (p && isClient(p)) addNews(`⌛ È scaduta l'offerta dei ${esc(teamName(S.teams[o.teamId]))} per ${esc(p.name)}.`, 'warn'); }
}
const weeksLeft = o => o.expires == null ? null : Math.max(0, o.expires - S.turn + 1);

/* ================================================================== */
/* Sfide della stagione: 3 nuove ogni anno, sempre un po' più difficili */
/* ================================================================== */
const CHAL_TYPES = {
  sign: { t: n => `Porta in agenzia un giocatore da almeno ${n} di valutazione`, n: i => Math.min(88, 72 + i * 2) },
  playoff: { t: n => `Porta ${n} client${n > 1 ? 'i' : 'e'} ai playoff`, n: i => Math.min(4, 1 + Math.floor(i / 2)) },
  sponsors: { t: n => `Chiudi ${n} nuov${n > 1 ? 'i' : 'o'} sponsor`, n: i => Math.min(4, 1 + Math.floor(i / 2)) },
  income: { t: n => `Incassa ${fmt$(n * 1000)} in stagione`, n: () => Math.max(300, Math.round((S.history.length ? S.history[S.history.length - 1].income : 250000) * 1.15 / 50000) * 50) },
  draft: { t: n => `Un tuo cliente scelto tra i primi ${n} al Draft`, n: () => 10 },
  allstar: { t: n => `Porta ${n} client${n > 1 ? 'i' : 'e'} all'All-Star Game`, n: i => Math.min(3, 1 + Math.floor(i / 3)) },
  camp: { t: n => `Fai fare ${n} camp con le leggende`, n: i => Math.min(4, 1 + Math.floor(i / 2)) },
  loyal: { t: () => 'Non perdere nessun cliente per colpa delle agenzie rivali', n: () => 1 },
};
const chalReward = () => { const i = S.season - 2026; return { cash: Math.min(900, 100 + i * 50), rep: 1 }; };
function newChallenges() {
  S.chal = { season: S.season, list: shuffle(Object.keys(CHAL_TYPES)).slice(0, 3).map(id => ({ id, n: CHAL_TYPES[id].n(S.season - 2026), prog: 0, done: false, failed: false })) };
}
function chalUpdate(id, v, mode = 'add') {
  if (!S.chal) return;
  for (const c of S.chal.list) {
    if (c.id !== id || c.done || c.failed) continue;
    if (mode === 'add') c.prog += v; else if (mode === 'max') c.prog = Math.max(c.prog, v); else c.prog = v;
    const ok = id === 'draft' ? c.prog > 0 && c.prog <= c.n : c.prog >= c.n;
    if (ok) completeChal(c);
  }
}
function completeChal(c) {
  c.done = true;
  const r = chalReward();
  earn(r.cash * 1000); changeRep(r.rep);
  const txt = `${CHAL_TYPES[c.id].t(c.n)} · Premio: ${fmt$(r.cash * 1000)} e +${r.rep} reputazione`;
  addNews(`🎯 Sfida completata: <b>${esc(CHAL_TYPES[c.id].t(c.n))}</b>! Premio ${fmt$(r.cash * 1000)}.`, 'gold');
  const msg = [txt, 'goal', 'Sfida vinta!'];
  if (UI.advancing) UI.goalQueue.push(msg); else toast(...msg);
}
function closeChallenges() {
  if (!S.chal) return;
  for (const c of S.chal.list) {
    if (c.id === 'loyal' && !c.failed && !c.done) { completeChal(c); continue; }
    if (!c.done) addNews(`🎯 Sfida mancata: ${esc(CHAL_TYPES[c.id].t(c.n))}.`, 'warn');
  }
}
function chalProgressTxt(c) {
  if (c.done) return 'Completata ✅';
  if (c.failed) return 'Fallita ❌';
  if (c.id === 'draft') return c.prog ? `migliore scelta finora: #${c.prog}` : 'al Draft di fine stagione';
  if (c.id === 'loyal') return 'fino a fine stagione';
  if (c.id === 'income') return `${fmt$(c.prog * 1000)} / ${fmt$(c.n * 1000)}`;
  if (c.id === 'sign') return c.prog ? `migliore finora: ${c.prog}` : 'nessuno ancora';
  return `${c.prog} / ${c.n}`;
}

/* ================================================================== */
/* Accademia giovanile: ragazzi che arrivano al Draft già legati a te  */
/* ================================================================== */
function academyClass() {
  const lv = S.staff.academy || 0; if (!lv) return;
  const n = 1 + Math.floor(lv / 2), names = [];
  for (let i = 0; i < n; i++) {
    const p = newPlayer('prospect');
    Object.assign(p, { age: randi(18, 19), ovr: randi(52, 57) + lv, school: `Accademia ${S.agency}`, scouted: true, agency: null, bond: clamp(55 + lv * 6 + randi(0, 8), 0, 100) });
    p.pot = clamp(66 + lv * 3 + randi(0, 10), p.ovr + 6, 92); // di solito buoni giocatori: al massimo livello potenziale 81-91
    p.academy = true;
    S.players[p.id] = p; names.push(p.name);
  }
  addNews(`🎓 Dalla tua accademia escono ${names.map(n => `<b>${esc(n)}</b>`).join(', ')}: sono nel Mercato tra i prospetti, già legati a te.`, 'good');
  // ogni tanto nasce un talento generazionale: più l'accademia è grande, più è probabile
  if (chance(0.06 * lv)) {
    const g = newPlayer('prospect');
    Object.assign(g, { age: 18, ovr: randi(58, 63) + lv, school: `Accademia ${S.agency}`, scouted: true, agency: null, academy: true, gem: true, bond: clamp(70 + lv * 5, 0, 100), hype: 30 });
    g.pot = randi(92, 98);
    S.players[g.id] = g;
    addNews(`💎 Nella tua accademia è sbocciato un <b>talento generazionale</b>: <b>${esc(g.name)}</b>, 18 anni, potenziale ~${g.pot}. Non fartelo scappare!`, 'gold');
    UI.pendingToast = [`${g.name}, 18 anni, potenziale ~${g.pot}: è nel Mercato tra i prospetti.`, 'goal', 'Talento generazionale!'];
  }
}

/* ================================================================== */
/* Investimenti di lungo periodo: quote di una squadra NBA, fondazione */
/* ================================================================== */
const stakePrice = t => Math.round((10 + t.market * 20) * 1e6); // prezzo di un 5%
const stakeOf = tid => (S.stakes || {})[tid] || 0;
function buyStake(tid) {
  const t = S.teams[tid], cur = stakeOf(tid), price = stakePrice(t);
  if (cur >= 100) return { msg: 'Possiedi già tutta la squadra.', type: 'warn' };
  if (S.cash < price) return { msg: `Servono ${fmt$(price)} per un altro 5%.`, type: 'bad' };
  spend(price); S.stakes = S.stakes || {}; S.stakes[tid] = cur + 5;
  S.teamRel[tid] = Math.max(teamRel(tid), Math.min(100, 60 + S.stakes[tid] / 2));
  addNews(`🏟️ Hai comprato il 5% dei ${esc(teamName(t))}: ora ne possiedi il <b>${S.stakes[tid]}%</b>.`, 'gold');
  checkGoal('owner', true);
  checkGoal('majority', S.stakes[tid] >= 51);
  if (S.stakes[tid] >= 100) {
    checkGoal('fullowner', true);
    // conflitto d'interessi: le altre squadre si fidano meno di te
    for (const o of S.teams) if (o.id !== tid) changeTeamRel(o.id, -8);
    addNews(`👑 <b>I ${esc(teamName(t))} sono tuoi al 100%.</b> Da proprietario decidi tu chi gioca lì, ma le altre squadre parlano di conflitto d'interessi.`, 'gold');
  }
  return { msg: `Ora possiedi il ${S.stakes[tid]}% dei ${t.name}.`, type: 'good' };
}
function payDividends() {
  let tot = 0;
  for (const [tid, pct] of Object.entries(S.stakes || {})) { const v = pct / 5 * stakePrice(S.teams[tid]) * 0.04; tot += v; S.teamRel[tid] = Math.max(teamRel(+tid), Math.min(100, 60 + pct / 2)); }
  if (tot) { earn(tot); addNews(`🏟️ Dividendi dalle tue quote societarie: ${fmt$(tot)}.`, 'good'); }
}
function donate() {
  if (S.donated === S.season) return { msg: 'Hai già fatto una donazione in questa stagione.', type: 'warn' };
  if (S.cash < 1e6) return { msg: 'Servono $1M.', type: 'bad' };
  spend(1e6); S.donated = S.season; changeRep(3);
  for (const b of BRANDS) changeBrandRel(b, 3);
  addNews('💛 La tua fondazione ha donato $1M per i campetti nei quartieri difficili.', 'good');
  return { msg: 'Donazione fatta: +3 reputazione e +3 rapporto con tutti gli sponsor.', type: 'good' };
}

// Promesse fatte in trattativa: si controllano a fine stagione regolare
function promiseStatus(p, pr) {
  const t = teamOf(p);
  if (pr.k === 'sponsor') return (p.sponsorCount || 0) > pr.base ? '✅' : '<i class="dot warn"></i>';
  if (pr.k === 'camp') return p.campSeason === pr.season ? '✅' : '<i class="dot warn"></i>';
  return t && confRank(t.id) <= 8 ? '<i class="dot good"></i>' : '⚠️';
}
function checkPromises() {
  for (const p of clients()) {
    if (!p.promises || !p.promises.length) continue;
    const keep = [];
    for (const pr of p.promises) {
      if (pr.season > S.season) { keep.push(pr); continue; }
      const t = teamOf(p);
      const ok = pr.k === 'sponsor' ? (p.sponsorCount || 0) > pr.base : pr.k === 'contender' ? !!t && confRank(t.id) <= 8 : p.campSeason === pr.season;
      if (ok) { p.morale = clamp(p.morale + 10, 0, 100); changeRep(0.5); addNews(`🤝 Promessa mantenuta con ${esc(p.name)}: ${esc(PROMISES[pr.k].label.toLowerCase())}.`, 'good'); }
      else { p.morale = clamp(p.morale - 25, 0, 100); changeRep(-1); addNews(`💔 Promessa mancata con ${esc(p.name)}: ${esc(PROMISES[pr.k].label.toLowerCase())}. Si fida meno di te.`, 'bad'); }
    }
    p.promises = keep;
  }
}

/* ================================================================== */
/* Fisico dei giocatori: altezza e peso realistici per ruolo           */
/* ================================================================== */
const BODY = { PG: [183, 196, 24.2], SG: [190, 201, 24.6], SF: [198, 208, 25.0], PF: [203, 211, 25.6], C: [208, 221, 26.2] };
function genBody(p) {
  const [lo, hi, bmi] = BODY[p.pos] || BODY.SF;
  let h = Math.round(lo + (hi - lo) * Math.min(1, Math.max(0, 0.5 + gauss() * 0.28)));
  if (Math.random() < 0.03) h += randi(3, 6); // ogni tanto un gigante per il suo ruolo
  p.h = h;
  p.w = Math.round((h / 100) ** 2 * (bmi + gauss() * 1.2));
}
function bodyTxt(p) {
  if (!p.h) genBody(p);
  const inch = Math.round(p.h / 2.54), ft = Math.floor(inch / 12);
  return `${p.h} cm (${ft}'${inch % 12}") · ${p.w} kg`;
}

/* ================================================================== */
/* Record della lega: partono da quelli reali della NBA                */
/* ================================================================== */
const REC_LABEL = { pts: 'Punti', reb: 'Rimbalzi', ast: 'Assist', ppg: 'Punti a partita', rpg: 'Rimbalzi a partita', apg: 'Assist a partita',
  gp: 'Partite giocate', titles: 'Titoli', mvp: 'MVP', allstar: 'All-Star' };
const clone = o => JSON.parse(JSON.stringify(o));
// Prepara i record (una volta sola): record reali, leggende ritirate, numeri di carriera delle star in attività
function recInit() {
  if (!S.records) S.records = { game: {}, season: {}, retired: [] };
  const R = S.records;
  if (R.real) return;
  // salvataggi precedenti: quello che era stato registrato diventa "il migliore dal 2026"
  R.era = { game: R.game || {}, season: R.season || {} };
  R.game = clone(REAL_RECORDS.game); R.season = clone(REAL_RECORDS.season);
  for (const sec of ['game', 'season']) for (const [k, r] of Object.entries(R.era[sec])) if (r && r.v > R[sec][k].v) R[sec][k] = clone(r);
  R.retired = [...clone(REAL_LEGENDS), ...(R.retired || [])];
  for (const p of Object.values(S.players)) {
    if (!p.star || p.cgp) continue;
    const real = REAL_ACTIVE[p.name] || {};
    if (real.pts) { p.cpts = real.pts; p.creb = real.reb; p.cast = real.ast; p.cgp = real.gp; }
    else { // stima coerente con età e livello
      const seasons = clamp(p.age - 20, 0, 22), gp = Math.round(seasons * 63), ppg = Math.max(6, (p.ovr - 45) * 0.52);
      p.cgp = gp; p.cpts = Math.round(gp * ppg);
      p.creb = Math.round(gp * ppg * ({ PG: .18, SG: .2, SF: .3, PF: .42, C: .5 }[p.pos]));
      p.cast = Math.round(gp * ppg * ({ PG: .35, SG: .2, SF: .17, PF: .12, C: .1 }[p.pos]));
    }
    for (const k of ['titles', 'mvp', 'allstar']) if (real[k]) p.career[k] = Math.max(p.career[k] || 0, real[k]);
  }
  R.real = true;
}
// record di una singola partita: di sempre e dal 2026
function recGame(p, team, pts, reb, ast) {
  const R = S.records;
  p.hi = p.hi || {};
  for (const [k, v] of [['pts', pts], ['reb', reb], ['ast', ast]]) {
    if (v > (p.hi[k] || 0)) p.hi[k] = v; // il suo massimo in carriera
    const rec = { v, name: p.name, pid: p.id, team: team.abbr, season: seasonLabel() };
    if (!R.era.game[k] || v > R.era.game[k].v) {
      const had = !!R.era.game[k];
      R.era.game[k] = rec;
      if (v > R.game[k].v) { R.game[k] = clone(rec); recNews(p, `${v} ${REC_LABEL[k].toLowerCase()} in una partita`, true); }
      else if (had && v >= (k === 'pts' ? 50 : k === 'reb' ? 22 : 17)) recNews(p, `${v} ${REC_LABEL[k].toLowerCase()} in una partita`, false);
    }
  }
}
// record stagionali: a fine stagione regolare, minimo 40 partite
function recSeason() {
  recInit();
  const R = S.records;
  for (const p of Object.values(S.players)) {
    if (p.retired || p.team == null || p.gp < 40) continue;
    for (const [k, base] of [['ppg', 'pts'], ['rpg', 'reb'], ['apg', 'ast']]) {
      const v = r1(p[base] / p.gp), rec = { v, name: p.name, pid: p.id, team: teamOf(p).abbr, season: seasonLabel() };
      if (!R.era.season[k] || v > R.era.season[k].v) {
        const had = !!R.era.season[k];
        R.era.season[k] = rec;
        if (v > R.season[k].v) { R.season[k] = clone(rec); recNews(p, `${v} ${REC_LABEL[k].toLowerCase()} in una stagione`, true); }
        else if (had) recNews(p, `${v} ${REC_LABEL[k].toLowerCase()} in una stagione`, false);
      }
    }
  }
}
function recNews(p, what, allTime) {
  addNews(allTime ? `📜 <b>RECORD DI SEMPRE!</b> ${esc(p.name)}: ${esc(what)}. Battuto un primato della storia NBA!`
    : `📜 Migliore prestazione dal 2026: ${esc(p.name)}, ${esc(what)}.`, isClient(p) || allTime ? 'gold' : '');
  if (isClient(p)) { const m = [`${p.name}: ${what}${allTime ? ' · record di sempre!' : ' · il migliore dal 2026'}`, 'goal', allTime ? 'Record storico!' : 'Record!']; if (UI.advancing) UI.goalQueue.push(m); else toast(...m); }
}
const careerStat = (p, k) => k === 'titles' || k === 'mvp' || k === 'allstar' ? (p.career ? p.career[k] : p[k]) || 0 : k === 'gp' ? p.cgp || 0 : p['c' + k] || 0;
// classifica di sempre: giocatori in attività + leggende ritirate (reali e della tua era)
function careerBoard(k, n = 10) {
  recInit();
  const act = Object.values(S.players).filter(p => !p.retired && (careerStat(p, k) > 0)).map(p => ({ name: p.name, pid: p.id, v: careerStat(p, k), active: true }));
  const ret = S.records.retired.map(r => ({ name: r.name, v: r[k] || 0, active: false, until: r.until }));
  return [...act, ...ret].filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n);
}
// quando un giocatore si ritira, i suoi numeri restano nella storia se sono tra i migliori
function recRetire(p) {
  recInit();
  if (!(p.cgp > 0)) return;
  const snap = { name: p.name, until: seasonLabel(), pts: p.cpts || 0, reb: p.creb || 0, ast: p.cast || 0, gp: p.cgp || 0,
    titles: p.career.titles, mvp: p.career.mvp, allstar: p.career.allstar, client: isClient(p) };
  const keys = ['pts', 'reb', 'ast', 'gp', 'titles', 'mvp', 'allstar'];
  const worthy = keys.some(k => { const b = careerBoard(k, 25); return snap[k] > 0 && (b.length < 25 || snap[k] > b[b.length - 1].v); });
  if (!worthy) return;
  S.records.retired.push(snap);
  if (S.records.retired.length > 90) {
    const keep = new Set();
    for (const k of keys) [...S.records.retired].sort((a, b) => (b[k] || 0) - (a[k] || 0)).slice(0, 25).forEach(r => keep.add(r));
    S.records.retired = S.records.retired.filter(r => keep.has(r));
  }
}

/* ================================================================== */
/* Avanzamento                                                         */
/* ================================================================== */
function advance() {
  if (S.over) return;
  if (S.inbox.length) {
    UI.focusEvents(true);
    toast(`Hai ${S.inbox.length === 1 ? 'un imprevisto' : S.inbox.length + ' imprevisti'} da risolvere prima di andare avanti.`, 'warn', 'Prima decidi!');
    return;
  }
  // i playoff si giocano nella loro schermata; si va avanti solo a campione deciso
  if (S.phase === 'po' && !UI.autoPo && !(S.po && S.po.season === seasonLabel() && S.po.champ != null)) return UI.openPlayoffs();
  S.turn++;
  UI.advancing = true; UI.goalQueue = [];
  expireOffers();
  let played = false, draftNight = false;
  spend(weeklyCost());
  payLoanWeek();
  S.rep = r1(S.rep * (0.997 + (S.staff.hq || 0) * 0.0005)); // la fama va mantenuta (una bella sede aiuta)
  for (const p of clients()) for (const sp of p.sponsors) earn(sp.value * 1e6 * SPONSOR_CUT / TURNS_PER_YEAR);

  if (S.phase === 'fa') {
    aiFreeAgency(0.35);
    if (S.week >= FA_WEEKS) {
      const expired = S.offers.filter(o => !o.ext).length;
      S.offers = S.offers.filter(o => o.ext);
      fillRosters();
      if (expired) addNews(`⌛ La Free Agency è chiusa: ${expired} offert${expired > 1 ? 'e scadute' : 'a scaduta'}.`, 'warn');
      for (const p of clients()) if (p.team == null && !p.school) addNews(`⚠️ ${esc(p.name)} è ancora senza squadra.`, 'warn');
      S.phase = 'reg'; S.week = 1;
      addNews(`🏀 Inizia la stagione regolare ${seasonLabel()}!`, 'gold');
    } else { S.week++; makeOffersForClientFAs(); }
  } else if (S.phase === 'reg') {
    powerSnapshot();
    simWeekGames(); played = true;
    for (const p of clients()) if (p.team != null) earn(p.salary * 1e6 * p.comm / 100 / REG_WEEKS);
    for (const p of Object.values(S.players)) {
      if (p.injury) p.injury--;
      else if (p.injDebt) { p.injDebt--; p.ovr = Math.min(99, p.ovr + 1); p.pot = Math.max(p.pot, p.ovr); if (!p.injDebt && isClient(p)) addNews(`💪 <b>${esc(p.name)}</b> è di nuovo al top della forma: valutazione ${p.ovr}.`, 'good'); } // torna in forma un punto a settimana
      p.hype = Math.max(0, p.hype * 0.98 + (p.team != null && p.gp ? (avg(p, 'pts') - 12) * 0.05 : 0));
    }
    moraleDrift();
    aiFreeAgency(0.04);
    // offerte a stagione in corso per i clienti senza squadra
    for (const p of clients()) if (p.team == null && !p.school && !S.offers.some(o => o.pid === p.id) && chance(0.3)) {
      if (makeOffersFor(p, 1)) addNews(`📨 Offerta a stagione in corso per ${esc(p.name)}.`);
    }
    if (S.week === 10) allStar();
    if (S.week === 12) extensionOffers();
    tradeWeek();
    if (S.week === TRADE_DEADLINE) addNews('⏰ Chiude il mercato degli scambi: fino all\'estate le rose restano queste.');
    if (chance(0.25)) randomLeagueNews();
    if (S.week >= REG_WEEKS) { tradeWeek(true); recSeason(); checkPromises(); S.phase = 'po'; S.week = 1; poInit(); addNews('🏆 Stagione regolare finita: si va ai playoff! Le prime sei di ogni conference sono dentro, dalla settima alla decima passano dal play-in.', 'gold'); }
    else S.week++;
  } else if (S.phase === 'po') {
    if (!S.po || S.po.season !== seasonLabel() || S.po.champ == null) poSimAll();
    poFinish();
    S.phase = 'draft'; S.week = 1;
  } else if (S.phase === 'draft') {
    bondedJoin();
    runDraft(); draftNight = true;
    offseason();
    S.phase = 'fa'; S.week = 1;
    makeOffersForClientFAs();
  }

  chalUpdate('income', Math.round(S.seasonIncome / 1000), 'set');
  if (S.phase === 'fa' || S.phase === 'reg') informerWeek();
  prospectWeek();
  rivalDeadlines();
  rivalCourtWeek();
  if (!S.over) genWeeklyEvents();

  // bancarotta
  if (S.cash < 0) {
    S.debtWeeks++;
    if (S.debtWeeks >= 4) { S.over = true; addNews('☠️ Licenza revocata per insolvenza. Fine della carriera.', 'bad'); }
    else addNews(`⚠️ Conto in rosso! Hai ${4 - S.debtWeeks} settiman${4 - S.debtWeeks > 1 ? 'e' : 'a'} per rientrare${S.loan ? '' : ', oppure chiedi un prestito alla banca'}.`, 'bad');
  } else S.debtWeeks = 0;

  checkGoals();
  save(); UI.render();
  if (S.over) { UI.advancing = false; return UI.gameOver(); }
  const after = () => {
    UI.advancing = false;
    const goals = UI.goalQueue || []; UI.goalQueue = [];
    const busy = S.inbox.length || UI.pendingToast;
    // gli obiettivi arrivano subito dopo l'avviso degli imprevisti, uno alla volta
    if (goals.length) setTimeout(() => goals.length === 1 ? toast(...goals[0])
      : toast(goals.slice(0, 3).map(a => a[0]).join(' · ') + (goals.length > 3 ? ` e altri ${goals.length - 3}` : ''), 'goal', `${goals.length} traguardi!`), busy ? 3600 : 0);
    const down = UI.devDown; UI.devDown = null;
    if (down) setTimeout(() => toast(...down), (busy ? 3600 : 0) + (goals.length ? 3800 : 0));
    if (S.inbox.length) {
      UI.focusEvents(false);
      const rare = S.inbox.find(e => e.rare);
      if (rare) toast(rare.title, 'goal', 'Colpo di scena!');
      else toast(S.inbox.length === 1 ? S.inbox[0].title : `${S.inbox.length} imprevisti questa settimana: scegli cosa fare.`, 'event', 'Imprevisto!');
    } else if (UI.pendingToast) toast(...UI.pendingToast);
    UI.pendingToast = null;
  };
  if (draftNight && S.lastDraft) UI.showDraft(after);
  else if (played && S.showGames !== false) UI.showWeek(after); else after();
}

function allStar() {
  const all = Object.values(S.players).filter(p => p.team != null && !p.retired).sort((a, b) => playerScore(b) - playerScore(a)).slice(0, 24);
  const mine = all.filter(isClient);
  for (const p of all) { p.career.allstar++; p.hype = clamp(p.hype + 12, 0, 100); }
  mine.forEach(() => changeRep(1.2));
  chalUpdate('allstar', mine.length, 'set');
  addNews(`⭐ All-Star Game: ${mine.length ? 'tra i convocati i tuoi ' + mine.map(p => '<b>' + esc(p.name) + '</b>').join(', ') : 'nessun tuo cliente convocato'}.`, mine.length ? 'gold' : '');
  if (mine.length) checkGoal('allstar', true);
}
function extensionOffers() {
  for (const p of clients()) {
    if (p.team == null || p.years !== 1 || p.ovr < 62) continue;
    if (chance(0.75) && makeOffersFor(p, 1, p.team))
      addNews(`🖊️ I ${esc(teamName(teamOf(p)))} propongono il rinnovo a ${esc(p.name)}. Trattativa aperta.`);
  }
}
function randomLeagueNews() {
  const p = pick(Object.values(S.players).filter(x => x.team != null && !isClient(x) && x.ovr >= 75));
  if (!p) return;
  const to = tradePlayer(p, false);
  addNews(`🔁 Mercato: ${esc(p.name)} (${p.ovr}) passa ai ${esc(teamName(to))}.`);
}

/* ================================================================== */
/* Conference, power ranking e playoff                                 */
/* ================================================================== */
const EAST = new Set(['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NYK', 'ORL', 'PHI', 'TOR', 'WAS']);
const confOf = t => EAST.has(t.abbr) ? 'E' : 'W';
const CONF_NAME = { E: 'Est', W: 'Ovest' };
const confStandings = c => standings().filter(t => confOf(t) === c);
const confRank = tid => confStandings(confOf(S.teams[tid])).findIndex(x => x.id === tid) + 1;
// partite di distanza dalla prima della conference
const gamesBehind = (t, lead) => ((lead.w - t.w) + (t.l - lead.l)) / 2;
const last10 = t => { const l = (t.last || []).slice(-10); return l.length ? `${l.filter(x => x).length}-${l.filter(x => !x).length}` : '-'; };
function streakTxt(t) {
  const l = t.last || []; if (!l.length) return '-';
  const v = l[l.length - 1]; let n = 0;
  for (let i = l.length - 1; i >= 0 && l[i] === v; i--) n++;
  return (v ? 'V' : 'P') + n;
}
// power ranking: a inizio stagione conta la rosa, poi sempre di più i risultati e la forma recente
function powerScore(t) {
  const g = t.w + t.l, k = Math.min(1, g / 30);
  const l = (t.last || []).slice(-10), form = l.length ? l.filter(x => x).length / l.length : 0.5;
  return (teamStrength(t.id) - 70) * 2.2 * (1 - k * 0.55) + winPct(t) * 45 * k + form * 12 * k;
}
const powerRanking = () => [...S.teams].sort((a, b) => powerScore(b) - powerScore(a));
function powerSnapshot() { S.powerPrev = {}; powerRanking().forEach((t, i) => S.powerPrev[t.id] = i + 1); }

const PO_ROUNDS = ['Play-in', 'Play-in, ultimo posto', 'Primo turno', 'Semifinali di conference', 'Finali di conference', 'Finali'];
const REAL_PO_RECORDS = {
  pts: { v: 63, name: 'Michael Giordano', team: 'CHI', season: '1985-86' },
  reb: { v: 41, name: 'Wilt Ciambellano', team: 'PHI', season: '1966-67' },
  ast: { v: 24, name: 'Magic Johnsong', team: 'LAL', season: '1983-84' },
};
function poRecInit() {
  recInit();
  if (!S.records.po) S.records.po = { game: clone(REAL_PO_RECORDS), era: {} };
  return S.records.po;
}
function mkSeries(po, conf, round, slot, a, b) {
  const s = { id: po.series.length, conf, round, slot, a, b, bo: round < 2 ? 1 : 7, wa: 0, wb: 0, g: [], w: null };
  po.series.push(s); return s;
}
function poInit() {
  const po = { season: seasonLabel(), round: 0, day: 1, series: [], seeds: {}, seed0: {}, stats: {}, champ: null, fmvp: null };
  for (const c of ['E', 'W']) {
    const st = confStandings(c);
    st.slice(0, 10).forEach((t, i) => po.seeds[t.id] = po.seed0[t.id] = i + 1);
    mkSeries(po, c, 0, 0, st[6].id, st[7].id);
    mkSeries(po, c, 0, 1, st[8].id, st[9].id);
  }
  S.po = po;
  poRecInit();
  return po;
}
const poOn = () => S.po && S.po.season === seasonLabel() && S.phase === 'po';
const poRound = (r = S.po.round) => S.po.series.filter(s => s.round === r);
const poActive = () => poRound().filter(s => s.w == null);
const poLoser = s => s.w == null ? null : s.w === s.a ? s.b : s.a;
const poWins = (s, tid) => tid === s.a ? s.wa : s.wb;
const poHome = s => s.bo === 1 || [0, 1, 4, 6].includes(s.g.length) ? s.a : s.b;
const isGame7 = s => s.bo === 7 && s.wa === 3 && s.wb === 3;
const myTeamIds = () => new Set(clients().filter(p => p.team != null).map(p => p.team));
// la serie da guardare oggi: prima quelle con i tuoi clienti, poi la più equilibrata
function poFeatured() {
  const my = myTeamIds();
  return [...poActive()].sort((x, y) => ((my.has(y.a) || my.has(y.b)) - (my.has(x.a) || my.has(x.b))) || (Math.min(y.wa, y.wb) - Math.min(x.wa, x.wb)))[0];
}

// tabellino di una squadra: i punti della squadra divisi tra chi gioca
function teamBox(tid, score, ot) {
  const dc = depthChart(tid);
  const lines = rosterOf(tid).filter(p => !p.injury && dc.get(p.id) && dc.get(p.id).min).sort(rotCmp).map(p => {
    const e = dc.get(p.id), st = e.slot === 'start';
    // ai playoff i titolari giocano di più e la panchina si accorcia
    let min = e.min * (st ? 1.12 : e.slot === 'bench' ? 0.95 : 0.5) * (1 + gauss() * 0.08) + (st ? ot * randi(3, 5) : ot);
    min = clamp(Math.round(min), 0, 48 + ot * 5);
    const q = Math.max(1, p.ovr - 40), f = min / 36;
    let form = 1 + gauss() * 0.24;
    if (st && chance(0.035)) form *= rand(1.35, 1.8); // serata storica
    const rebK = { PG: .07, SG: .09, SF: .13, PF: .2, C: .24 }[p.pos], astK = { PG: .2, SG: .11, SF: .09, PF: .06, C: .05 }[p.pos];
    return { pid: p.id, min, w: q * f * form, pts: 0,
      reb: Math.max(0, Math.round(q * rebK * f * (1 + gauss() * .28))), ast: Math.max(0, Math.round(q * astK * f * (1 + gauss() * .28))) };
  }).filter(l => l.min > 0);
  const W = lines.reduce((s, l) => s + l.w, 0) || 1;
  let left = score;
  for (const l of lines) { l.pts = Math.floor(score * l.w / W); left -= l.pts; }
  while (left > 0 && lines.length) {
    let r = Math.random() * W, l = lines[0];
    for (const x of lines) { r -= x.w; if (r <= 0) { l = x; break; } }
    l.pts++; left--;
  }
  for (const l of lines) delete l.w;
  return lines;
}
// una partita dei playoff, completa di tabellino
function simMatch(h, a) {
  const sh = teamStrength(h), sa = teamStrength(a);
  const hw = chance(winProb(sh + 1.2, sa));
  const close = chance(0.35);
  let diff = close ? randi(1, 6) : randi(4, 22);
  const ot = close && chance(0.18) ? (chance(0.12) ? 2 : 1) : 0;
  if (ot) diff = randi(1, 8);
  const base = randi(94, 112) + ot * randi(8, 13);
  const hs = hw ? base + diff : base, as = hw ? base : base + diff;
  return { h, a, hs, as, ot, box: { h: teamBox(h, hs, ot), a: teamBox(a, as, ot) } };
}
// record nei playoff: di sempre, dal 2026, e il massimo in carriera per i tuoi clienti
function poRecGame(p, team, l) {
  const R = poRecInit(), notes = [];
  p.hi = p.hi || {};
  for (const k of ['pts', 'reb', 'ast']) {
    const v = l[k], lab = REC_LABEL[k].toLowerCase();
    const rec = { v, name: p.name, pid: p.id, team: team.abbr, season: seasonLabel() };
    if (v > R.game[k].v) {
      const old = R.game[k];
      R.game[k] = rec; R.era[k] = clone(rec);
      notes.push({ gold: true, pid: p.id, t: `${p.name}: ${v} ${lab}, record di sempre nei playoff! Il vecchio primato era di ${old.name} (${old.v}).` });
      addNews(`📜 <b>RECORD DEI PLAYOFF!</b> ${esc(p.name)}: ${v} ${lab} in una partita. Battuto ${esc(old.name)} (${old.v}).`, 'gold');
    } else if (!R.era[k] || v > R.era[k].v) {
      const had = !!R.era[k];
      R.era[k] = rec;
      if (had && v >= (k === 'pts' ? 45 : k === 'reb' ? 20 : 16)) {
        notes.push({ pid: p.id, t: `${p.name}: ${v} ${lab}, la migliore partita di playoff dal 2026.` });
        addNews(`📜 Playoff: ${esc(p.name)} fa ${v} ${lab}, il massimo dal 2026.`, isClient(p) ? 'gold' : '');
      }
    }
    if (v > (p.hi[k] || 0)) {
      if (isClient(p) && v >= (k === 'pts' ? 20 : 10)) notes.push({ mine: true, pid: p.id, t: `${p.name}: ${v} ${lab}, il suo massimo in carriera.` });
      p.hi[k] = v;
    }
  }
  return notes;
}
// gioca la prossima gara di una serie e aggiorna statistiche, record e umore
function poPlay(s) {
  const po = S.po, n = s.g.length + 1, g7 = isGame7(s);
  const h = poHome(s), a = h === s.a ? s.b : s.a;
  const G = simMatch(h, a);
  const hw = G.hs > G.as;
  if ((hw ? h : a) === s.a) s.wa++; else s.wb++;
  const need = s.bo === 1 ? 1 : 4;
  if (s.wa === need) s.w = s.a; else if (s.wb === need) s.w = s.b;
  G.n = n; G.g7 = g7; G.sid = s.id; G.notes = [];
  s.g.push({ h, hs: G.hs, as: G.as, ot: G.ot });
  for (const side of ['h', 'a']) {
    const tid = G[side], win = side === 'h' ? hw : !hw, team = S.teams[tid];
    for (const l of G.box[side]) {
      const p = S.players[l.pid];
      const st = po.stats[p.id] = po.stats[p.id] || { gp: 0, min: 0, pts: 0, reb: 0, ast: 0, tid };
      st.gp++; st.min += l.min; st.pts += l.pts; st.reb += l.reb; st.ast += l.ast; st.tid = tid;
      if (s.round === 5) { const f = st.f = st.f || { gp: 0, pts: 0, reb: 0, ast: 0 }; f.gp++; f.pts += l.pts; f.reb += l.reb; f.ast += l.ast; }
      G.notes.push(...poRecGame(p, team, l));
      l.grade = gameGrade(l.pts, l.reb, l.ast, win);
      if (isClient(p)) {
        const gs = l.pts + l.reb * .5 + l.ast * .7;
        p.hype = clamp(p.hype + clamp((gs - 15) * 0.09, -1.5, 3) * (g7 ? 2 : 1), 0, 100);
        p.last = { opp: side === 'h' ? a : h, home: side === 'h', win, us: side === 'h' ? G.hs : G.as, them: side === 'h' ? G.as : G.hs, min: l.min, pts: l.pts, reb: l.reb, ast: l.ast, grade: l.grade, po: true };
      }
    }
  }
  if (s.w != null) poSeriesEnd(s, G);
  G.st = UI.poStatus(s);
  return G;
}
function poSeriesEnd(s, G) {
  const w = S.teams[s.w], l = S.teams[poLoser(s)];
  const score = s.bo === 1 ? `${Math.max(G.hs, G.as)}-${Math.min(G.hs, G.as)}` : `${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}`;
  G.result = s.bo === 1 ? `${teamName(w)} battono ${teamName(l)} ${score}` : `${teamName(w)} vincono la serie ${score}${s.g.length === 7 ? ' a gara 7' : ''}`;
  if (s.round >= 2 && clients().some(p => p.team === s.w)) changeRep(0.25); // una volta per serie, non per ogni cliente
  for (const p of clients()) {
    if (p.team === s.w) p.morale = clamp(p.morale + 3, 0, 100);
    if (p.team === poLoser(s) && s.round >= 2) addNews(`🏀 Finisce la stagione di <b>${esc(p.name)}</b>: i ${esc(teamName(l))} escono ${s.round === 5 ? 'in finale' : 'al ' + PO_ROUNDS[s.round].toLowerCase()} (${score}).`);
  }
  if (s.round >= 3 || s.g.length === 7) addNews(`🏆 ${PO_ROUNDS[s.round]}: i ${esc(G.result)}.`, s.round === 5 ? 'gold' : '');
}
// turno finito: si preparano le serie successive
function poNextRound() {
  const po = S.po, r = po.round;
  if (r === 5) return poChampion();
  if (r === 0) for (const c of ['E', 'W']) {
    const [x, y] = poRound(0).filter(s => s.conf === c).sort((p, q) => p.slot - q.slot);
    const lx = poLoser(x);
    po.seeds[x.w] = 7; po.seeds[lx] = 8; po.seeds[poLoser(y)] = 0;
    mkSeries(po, c, 1, 0, lx, y.w);
  }
  else if (r === 1) {
    for (const s of poRound(1)) { po.seeds[s.w] = 8; po.seeds[poLoser(s)] = 0; }
    for (const c of ['E', 'W']) {
      const by = {}; for (const [id, sd] of Object.entries(po.seeds)) if (sd >= 1 && sd <= 8 && confOf(S.teams[id]) === c) by[sd] = +id;
      [[1, 8], [4, 5], [3, 6], [2, 7]].forEach(([x, y], i) => mkSeries(po, c, 2, i, by[x], by[y]));
    }
    const ids = new Set(po.series.filter(s => s.round === 2).flatMap(s => [s.a, s.b]));
    chalUpdate('playoff', clients().filter(p => ids.has(p.team)).length, 'set');
  } else if (r < 4) for (const c of ['E', 'W']) {
    const prev = poRound(r).filter(s => s.conf === c).sort((x, y) => x.slot - y.slot);
    for (let i = 0; i < prev.length; i += 2) {
      const x = prev[i].w, y = prev[i + 1].w, [a, b] = po.seeds[x] <= po.seeds[y] ? [x, y] : [y, x];
      mkSeries(po, c, r + 1, i / 2, a, b);
    }
  } else {
    const [e, w] = ['E', 'W'].map(c => poRound(4).find(s => s.conf === c).w);
    const [a, b] = winPct(S.teams[e]) >= winPct(S.teams[w]) ? [e, w] : [w, e];
    mkSeries(po, 'F', 5, 0, a, b);
  }
  po.round++;
}
function poChampion() {
  const po = S.po, fin = poRound(5)[0];
  po.champ = fin.w;
  S.lastChampion = fin.w;
  const fs = f => (f.pts + f.reb * .5 + f.ast * .7) / f.gp;
  const cands = Object.entries(po.stats).filter(([, st]) => st.tid === fin.w && st.f).sort((x, y) => fs(y[1].f) - fs(x[1].f));
  if (cands[0]) {
    const p = S.players[cands[0][0]], f = cands[0][1].f;
    po.fmvp = { pid: p.id, line: `${r1(f.pts / f.gp)} pt · ${r1(f.reb / f.gp)} rb · ${r1(f.ast / f.gp)} as` };
    p.career.fmvp = (p.career.fmvp || 0) + 1; p.hype = clamp(p.hype + 20, 0, 100);
    addNews(`🥇 MVP delle Finali: <b>${esc(p.name)}</b> (${esc(teamName(teamOf(p)))}).`, 'gold');
    if (isClient(p)) changeRep(4);
  }
}
// simula senza guardare: la giornata, il turno o tutto fino al titolo
function poDay(skip = null) {
  for (const s of poActive()) if (s.id !== skip) poPlay(s);
  S.po.day++;
  if (!poActive().length) poNextRound();
}
function poSimRound() { const r = S.po.round; while (S.po.champ == null && S.po.round === r) poDay(); }
function poSimAll() { if (!S.po || S.po.season !== seasonLabel()) poInit(); while (S.po.champ == null) poDay(); }

// fine dei playoff: titolo, premi, reputazione
function poFinish() {
  const po = S.po, champ = po.champ;
  const fin = poRound(5)[0];
  addNews(`🏆 <b>Finali</b>: i ${esc(teamName(S.teams[champ]))} battono i ${esc(teamName(S.teams[poLoser(fin)]))} ${Math.max(fin.wa, fin.wb)}-${Math.min(fin.wa, fin.wb)}! Campioni ${seasonLabel()}.`, 'gold');
  const playoffTeams = new Set(po.series.filter(s => s.round >= 2).flatMap(s => [s.a, s.b]));
  for (const p of clients()) {
    if (p.team === champ) {
      p.career.titles++; p.hype = clamp(p.hype + 12, 0, 100); p.morale = clamp(p.morale + 15, 0, 100);
      changeRep(4); addNews(`💍 Il tuo cliente <b>${esc(p.name)}</b> è campione!`, 'gold'); checkGoal('ring', true);
    } else if (playoffTeams.has(p.team)) changeRep(0.3);
  }
  // premi
  const pool = Object.values(S.players).filter(p => p.team != null && !p.retired && p.gp > 20);
  const mvp = pool.sort((a, b) => playerScore(b) - playerScore(a))[0];
  if (mvp) {
    mvp.career.mvp++; mvp.hype = clamp(mvp.hype + 30, 0, 100);
    addNews(`🥇 MVP della stagione: <b>${esc(mvp.name)}</b> (${esc(teamName(teamOf(mvp)))}, ${statLine(mvp)}).`, 'gold');
    if (isClient(mvp)) { changeRep(6); checkGoal('mvp', true); }
  }
  const rookies = pool.filter(p => p.rookieSeason === S.season).sort((a, b) => avg(b, 'pts') - avg(a, 'pts'));
  if (rookies[0]) {
    const roy = rookies[0]; roy.career.roy++; roy.hype = clamp(roy.hype + 15, 0, 100);
    addNews(`🌱 Rookie of the Year: <b>${esc(roy.name)}</b> (${statLine(roy)}).`);
    if (isClient(roy)) changeRep(2.5);
  }
  // reputazione di fine stagione in base al portafoglio
  const tot = clients().reduce((s, p) => s + (p.team != null ? p.salary : 0), 0);
  changeRep(tot / 90 - 0.5);
  S.history.push({ season: seasonLabel(), income: S.seasonIncome, expense: S.seasonExpense, rep: S.rep, clients: S.clients.length });
  checkGoal('million', S.seasonIncome >= 1e6);
}

/* ---------- Telecronaca: la partita raccontata canestro per canestro ---------- */
const PER = 720, OTL = 300; // secondi di un quarto e di un supplementare
// divide i punti di un giocatore in tiri liberi, canestri da due e triple
function splitPts(pts, pos) {
  const share = { PG: .38, SG: .4, SF: .32, PF: .22, C: .08 }[pos] || .3;
  let t3 = Math.max(0, Math.round(pts * share / 3 * rand(.6, 1.4)));
  while (t3 * 3 > pts) t3--;
  let ft = Math.min(pts - t3 * 3, Math.round(pts * rand(.1, .24)));
  if ((pts - t3 * 3 - ft) % 2) ft++;
  if (ft > pts - t3 * 3) { ft = (pts - t3 * 3) % 2; }
  const t2 = (pts - t3 * 3 - ft) / 2;
  return [...Array(t3).fill(3), ...Array(t2).fill(2), ...Array(ft).fill(1)];
}
function playByPlay(G) {
  const end = 4 * PER + G.ot * OTL, ev = [];
  const sides = { h: [], a: [] };
  // i supplementari partono dal pareggio: i punti di ogni supplementare sono esatti
  const ties = [];
  if (G.ot) { let lv = Math.min(G.hs, G.as); for (let k = G.ot; k >= 1; k--) { lv -= randi(6, 12); ties.unshift(lv); } }
  for (const side of ['h', 'a']) {
    let pool = [];
    for (const l of G.box[side]) for (const v of splitPts(l.pts, S.players[l.pid].pos)) pool.push({ side, pid: l.pid, v });
    pool = shuffle(pool);
    const fin = side === 'h' ? G.hs : G.as, segs = [];
    for (let k = 0; k <= G.ot; k++) segs.push((k < G.ot ? ties[k] : fin) - (k ? ties[k - 1] : 0));
    const take = target => {
      const out = []; let need = target;
      for (let i = pool.length - 1; i >= 0 && need > 0; i--) if (pool[i].v <= need) { need -= pool[i].v; out.push(...pool.splice(i, 1)); }
      while (need > 0) { // spezza un canestro da due in due liberi
        const i = pool.findIndex(x => x.v === 2); if (i < 0) break;
        const b = pool.splice(i, 1)[0]; pool.push({ ...b, v: 1 }); out.push({ ...b, v: 1 }); need--;
      }
      return out;
    };
    for (let k = G.ot; k >= 1; k--) {
      const from = 4 * PER + (k - 1) * OTL;
      for (const b of take(segs[k])) ev.push({ ...b, t: from + Math.random() * (OTL - 2) });
    }
    for (const b of pool) ev.push({ ...b, t: Math.random() * (4 * PER - 2) });
    sides[side] = G.box[side];
  }
  ev.sort((x, y) => x.t - y.t);
  // assist: legati ai canestri dei compagni
  for (const side of ['h', 'a']) {
    const shots = ev.filter(e => e.side === side && e.v > 1);
    for (const l of sides[side]) {
      let k = l.ast;
      const opts = shuffle(shots.filter(e => e.pid !== l.pid && !e.ast));
      while (k-- > 0 && opts.length) opts.pop().ast = l.pid;
    }
    for (const l of sides[side]) for (let i = 0; i < l.reb; i++) ev.push({ side, pid: l.pid, v: 0, reb: true, t: Math.random() * (end - 2) });
  }
  ev.sort((x, y) => x.t - y.t);
  return { end, ev };
}

function runDraft() {
  const order = [...standings()].reverse().map(t => t.id);
  // lotteria: rimescola le prime 4 tra le 6 peggiori
  const top = shuffle(order.slice(0, 6));
  const draftOrder = [...top.slice(0, 4), ...order.filter(id => !top.slice(0, 4).includes(id))];
  const pros = Object.values(S.players).filter(p => p.school && !p.retired && p.skipDraft !== S.season)
    .sort((a, b) => draftScore(b) - draftScore(a));
  const avail = [...pros];
  let n = 0;
  const mine = [];
  const picks = []; // per la schermata della serata del Draft
  for (let round = 1; round <= 2; round++) {
    for (const tid of draftOrder) {
      if (!avail.length) break;
      // una squadra mantiene la promessa se il ragazzo non è troppo indietro nella sua lista
      const pi = avail.findIndex(x => x.promise === tid);
      // ogni squadra ha la sua lista: guarda i migliori rimasti, il ruolo che le manca e il proprio gusto
      let k = 0;
      if (!(pi >= 0 && pi <= 14)) {
        const need = pos => rosterOf(tid).filter(x => x.pos === pos).length < 2 ? 1.2 : 0;
        const look = avail.slice(0, round === 1 ? 5 : 8);
        let best = -1e9;
        look.forEach((x, i) => { const v = draftScore(x) + need(x.pos) + gauss() * 1.6; if (v > best) { best = v; k = i; } });
      } else k = pi;
      const p = avail.splice(k, 1)[0];
      n++;
      if (pi >= 0 && pi <= 14 && isClient(p)) changeTeamRel(tid, 3);
      const sal = round === 1 ? r1(Math.max(2.2, 11 - (n - 1) * 0.3)) : MIN_SAL;
      picks.push({ n, round, tid, pid: p.id, name: p.name, pos: p.pos, school: p.school, nat: p.nat, mine: isClient(p), proj: p.projWas || null, sal, promised: pi >= 0 && pi <= 14 && p.promise === tid });
      p.school = null; p.team = tid; p.salary = sal; p.years = round === 1 ? 4 : 2; p.rookieSeason = S.season + 1;
      p.draftPick = n; p.promise = null; p.draftBoost = 0; p.draftForm = 0; p.projWas = null;
      if (isClient(p)) { mine.push(p); changeRep(round === 1 ? Math.max(0.5, (31 - n) / 5) : 0.3); p.morale = clamp(p.morale + (round === 1 ? 15 : 0), 0, 100); }
    }
  }
  const first = pros[0];
  if (first) addNews(`🎓 Draft ${S.season + 1}: prima scelta assoluta <b>${esc(first.name)}</b> ai ${esc(teamName(teamOf(first)))}.`, 'gold');
  for (const p of mine) addNews(`🎓 Il tuo cliente <b>${esc(p.name)}</b> scelto con la #${p.draftPick} dai ${esc(teamName(teamOf(p)))} (${fmtM(p.salary)} × ${p.years}).`, 'good');
  if (mine.some(p => p.draftPick <= 5)) checkGoal('top5', true);
  if (mine.length) chalUpdate('draft', Math.min(...mine.map(p => p.draftPick)), 'set');
  // non scelti → free agent
  const undrafted = [];
  for (const p of Object.values(S.players)) if (p.school && !p.retired) {
    if (isClient(p)) undrafted.push({ pid: p.id, name: p.name, stay: p.skipDraft === S.season });
    if (p.skipDraft === S.season) { p.promise = null; continue; } // resta un altro anno al college
    p.school = null;
    if (isClient(p)) addNews(`😕 ${esc(p.name)} non è stato scelto: ora è free agent.`, 'warn');
  }
  S.lastDraft = { year: S.season + 1, picks, undrafted };
}

/* ================================================================== */
/* Carriera: età, potenziale, carattere, infortuni, camp con leggende  */
/* ================================================================== */
// Quanto può ancora crescere un giocatore in base all'età: da giovane tanto, dai 29 anni il tetto è il livello attuale
const potRoom = age => age <= 20 ? 38 : age <= 21 ? 33 : age <= 22 ? 27 : age <= 23 ? 21 : age <= 24 ? 15 : age <= 25 ? 10 : age <= 26 ? 6 : age <= 27 ? 3 : age <= 28 ? 1 : 0;
function capPot(p) { p.pot = clamp(Math.min(p.pot, p.ovr + potRoom(p.age)), p.ovr, 99); }
function careerPhase(p) {
  if (p.school || p.age <= 22) return p.pot - p.ovr >= 8 ? ['🌱', 'In crescita'] : ['🌱', 'Giovane'];
  if (p.age <= 26) return p.pot - p.ovr >= 4 ? ['📈', 'In ascesa'] : ['💪', 'Nel pieno'];
  if (p.age <= 29) return ['⭐', 'All\'apice'];
  if (p.age <= 32) return ['📉', 'Inizia il declino'];
  return ['🧓', 'Fine carriera'];
}
// Sviluppo di fine stagione (dopo il compleanno)
function developPlayer(p) {
  const pro = hasTrait(p, 'professionista'), amb = hasTrait(p, 'ambizioso'), sat = hasTrait(p, 'appagato');
  let d;
  if (p.age <= 22) d = (p.pot - p.ovr) * rand(0.15, 0.35);
  else if (p.age <= 26) d = (p.pot - p.ovr) * rand(0.15, 0.4) + rand(-1, 1);
  else if (p.age <= 29) d = rand(-1.5, 1.5);
  else if (p.age <= 32) d = rand(-3.5, 0.5);
  else d = rand(-6, -1.5);
  if (pro) d = d < 0 ? d * 0.5 : d + (chance(0.6) ? 1 : 0); // lavora come un matto: cresce di più, cala la metà
  if (amb && p.age <= 30 && chance(0.5)) d += 1;
  if (sat) d = d > 0 ? d * 0.6 : d * 1.3;
  if (hasTrait(p, 'festaiolo') && chance(0.3)) d -= 1;
  // il camp estivo, il centro di allenamento e lo staff personale frenano il declino (ma nessuno ferma il tempo)
  if (d < 0) d *= Math.max(0.35, careFactor(p) * (p.campBoost ? (p.campBoost === true ? 0.5 : p.campBoost) : 1));
  p.campBoost = false;
  p.ovr = clamp(Math.round(p.ovr + d), 35, 99);
  p.potNote = null;
  if (amb && p.age <= 29 && chance(0.45)) { p.pot += randi(1, 3); p.potNote = 'up'; }
  if (sat && (p.salary >= 12 || p.career.allstar || p.career.titles) && chance(0.5)) { p.pot -= randi(2, 5); p.potNote = 'down'; }
  capPot(p);
}
// Un infortunio lungo fa perdere un po' di forma, che si recupera piano piano. Lo stakanovista no.
// quanto un cliente è protetto: 1 = come tutti, più basso = meno infortuni e declino più lento
// staff personale (preparatore, fisioterapista, chef): costa ogni settimana, in base allo stipendio
const pstaffCost = p => Math.round((6000 + (p.salary || 0) * 1e6 * 0.0004) / 100) * 100;
const pstaffWeekly = () => S ? clients().filter(p => p.pstaff).reduce((s, p) => s + pstaffCost(p), 0) : 0;
function togglePstaff(pid) {
  const p = P(pid);
  p.pstaff = !p.pstaff;
  if (p.pstaff) p.morale = clamp(p.morale + 6, 0, 100);
  return { msg: p.pstaff ? `${p.name} ha un preparatore, un fisioterapista e uno chef tutti per sé (${fmt$(pstaffCost(p))} a settimana).` : `Hai tolto lo staff personale a ${p.name}.`, type: p.pstaff ? 'good' : 'info' };
}
function careFactor(p) {
  if (!isClient(p)) return 1;
  return (1 - 0.1 * (S.staff.center || 0)) * (p.pstaff ? 0.65 : 1);
}
function injuryHit(p, weeks) {
  if (weeks < 3 || hasTrait(p, 'professionista')) return;
  const k = Math.min(4, Math.ceil(weeks / 5));
  p.ovr = Math.max(35, p.ovr - k); p.injDebt = (p.injDebt || 0) + k;
  if (isClient(p)) addNews(`🩹 Lo stop pesa: <b>${esc(p.name)}</b> perde ${k} punt${k > 1 ? 'i' : 'o'} di valutazione (ora ${p.ovr}). Li recupera piano piano quando torna in campo.`, 'bad');
}

/* ---------- Camp estivo con una leggenda ---------- */
const LEGENDS = {
  PG: ['Magic Johnsong', 'Steve Nachos', 'Allen Inverno'], SG: ['Michael Giordano', 'Kobe Manzo', 'Dwyane Guado'],
  SF: ['Larry Uccello', 'Scottie Pipetta', 'Paul Piercing'], PF: ['Tim Donut', 'Dirk Novità', 'Kevin Granata'],
  C: ['Kareem Abdul-Gabbiano', 'Shaquille O\'Nil', 'Hakeem Olé-Juwon'],
};
const CAMPS = [
  { id: 0, label: 'Una settimana', cost: 60, base: 0.5 },
  { id: 1, label: 'Un mese', cost: 150, base: 1 },
  { id: 2, label: 'Tutta l\'estate', cost: 300, base: 2 },
];
const legendFor = p => LEGENDS[p.pos][(p.id + S.season) % 3];
// Stima del camp: stessa formula del risultato vero, senza la parte casuale
function campPreview(p, c) {
  const mod = (hasTrait(p, 'professionista') || hasTrait(p, 'ambizioso') ? 1 : 0) - (hasTrait(p, 'appagato') ? 1 : 0) - (p.age >= 30 ? 1 : 0);
  const lo = Math.round(c.base - 0.5) + mod - (hasTrait(p, 'festaiolo') ? 1 : 0);
  const hi = Math.round(c.base + 1) + mod + (p.age <= 24 ? 1 : 0);
  return [Math.max(0, lo), Math.max(0, hi)];
}
function legendCamp(pid, ci) {
  const p = P(pid), c = CAMPS[ci], cost = c.cost * 1000;
  if (p.campSeason === S.season) return { msg: `${p.name} ha già fatto il camp questa stagione.`, type: 'warn' };
  if (S.cash < cost) return { msg: `Servono ${fmt$(cost)}.`, type: 'bad' };
  spend(cost); p.campSeason = S.season;
  chalUpdate('camp', 1);
  const lg = legendFor(p);
  // il camp fa crescere prima, ma non oltre il talento che ha: chi è già al suo massimo migliora poco
  const room = Math.max(0, p.pot - p.ovr);
  let gain = Math.round(c.base + rand(-0.5, 0.8));
  if (p.age <= 24 && room >= 6 && chance(0.4)) gain += 1; // un vero talento risponde meglio agli allenamenti
  if (hasTrait(p, 'professionista') || hasTrait(p, 'ambizioso')) gain += chance(0.5) ? 1 : 0;
  if (hasTrait(p, 'appagato')) gain -= 1;
  let note = '';
  if (hasTrait(p, 'festaiolo') && chance(0.3)) { gain -= 1; note = ' Ha saltato qualche allenamento per una festa.'; }
  gain = Math.min(Math.max(0, gain), room + (room === 0 && chance(0.15) ? 1 : 0));
  if (p.age >= 29) gain = Math.min(gain, chance(0.25) ? 1 : 0); // da veterano conta soprattutto non calare
  p.ovr = clamp(p.ovr + gain, 35, 99);
  let potUp = 0;
  if (p.age <= 24 && c.id === 2 && chance(0.2)) { potUp = 1; p.pot += potUp; }
  if (p.age >= 29) p.campBoost = [0.7, 0.55, 0.4][c.id]; // più lungo il camp, più frena il declino
  capPot(p);
  p.morale = clamp(p.morale + 5 + c.id * 2, 0, 100);
  const txt = `${c.label} con ${lg}: ${gain ? `+${gain} di valutazione` : 'nessun miglioramento visibile'}${potUp ? `, potenziale +${potUp}` : ''}${p.age >= 29 ? ', il declino rallenterà' : ''}.${note}`;
  addNews(`${ic('dumbbell')} Camp di <b>${esc(p.name)}</b> con la leggenda ${esc(lg)}: ${esc(txt)}`, gain ? 'good' : '');
  return { msg: txt, type: gain ? 'good' : 'info' };
}

// com'è andata l'estate dei tuoi giocatori: le crescite sono una festa, i cali un campanello d'allarme
const UP_TXT = ['ha passato l\'estate in palestra e si vede', 'è tornato dalle vacanze un altro giocatore', 'ha lavorato ogni giorno sul tiro', 'ha messo su muscoli dove servivano', 'ha fatto il salto che aspettavi'];
const DOWN_TXT = ['ha perso un passo', 'si è presentato al raduno fuori forma', 'comincia a sentire gli anni', 'non è più esplosivo come prima'];
function devNews(dev) {
  if (!dev.length) return;
  dev.sort((a, b) => (b[0].ovr - b[1]) - (a[0].ovr - a[1]));
  for (const [p, was] of dev) {
    const d = p.ovr - was;
    if (d > 0) addNews(`${d >= 4 ? '🚀' : '📈'} <b>${esc(p.name)}</b> ${pick(UP_TXT)}: valutazione da ${was} a <b>${p.ovr}</b> (+${d})${d >= 4 ? '. Che estate!' : '.'}`, d >= 3 ? 'gold' : 'good');
    else addNews(`📉 <b>${esc(p.name)}</b> ${pick(DOWN_TXT)}: valutazione da ${was} a <b>${p.ovr}</b> (−${-d}).${p.age >= 30 ? ' Il centro di allenamento e lo staff personale possono rallentare il declino.' : ''}`, 'bad');
  }
  const ups = dev.filter(([p, w]) => p.ovr > w), downs = dev.filter(([p, w]) => p.ovr < w);
  const fmtD = ([p, w]) => `${p.name} ${p.ovr > w ? '+' + (p.ovr - w) : '−' + (w - p.ovr)}`;
  if (ups.length) (UI.goalQueue = UI.goalQueue || []).push([ups.slice(0, 3).map(fmtD).join(' · ') + (ups.length > 3 ? ` e altri ${ups.length - 3}` : ''), 'goal', ups.length > 1 ? 'Sono cresciuti!' : `${ups[0][0].name} è cresciuto!`]);
  if (downs.length) UI.devDown = [downs.slice(0, 3).map(fmtD).join(' · ') + (downs.length > 3 ? ` e altri ${downs.length - 3}` : ''), 'warn', downs.length > 1 ? 'In calo' : `${downs[0][0].name} è in calo`];
}
function offseason() {
  const played = S.history.length + 1;
  if ([1, 2, 3, 5, 10, 20, 30].includes(played)) track('stagioni-giocate-' + played);
  // promemoria: copia la partita ogni tanto
  if (played >= 2 && (S.lastExport == null || S.lastExport < S.season - 1)) addNews('💾 Hai giocato tante stagioni: in Home, sezione Impostazioni, puoi <b>esportare il salvataggio</b>. Se il telefono cancella i dati del sito, con quello riprendi da dove eri.', 'warn');
  const retiredNow = [], dev = [];
  for (const p of Object.values(S.players)) {
    if (p.retired) continue;
    p.age++;
    // sviluppo: età, carattere, camp estivo
    const before = p.ovr;
    developPlayer(p);
    // traguardi dei tuoi giocatori: un campione costruito da te
    if (isClient(p)) for (const lvl of [85, 90, 95]) if (before < lvl && p.ovr >= lvl) {
      addNews(`🌟 <b>${esc(p.name)}</b> è arrivato a <b>${lvl}</b> di valutazione${p.academy ? ', ed è cresciuto nella tua accademia' : ''}!`, 'gold');
      if (p.academy && lvl >= 90) checkGoal('homegrown', true);
    }
    if (isClient(p) && p.ovr !== before) { dev.push([p, before]); p.dev = { season: S.season + 1, d: p.ovr - before }; }
    if (isClient(p) && p.potNote === 'up') addNews(`🔥 ${esc(p.name)} vuole sempre migliorare: il suo potenziale è salito a ${p.pot}.`, 'good');
    if (isClient(p) && p.potNote === 'down') addNews(`😴 ${esc(p.name)} si è accontentato: il suo potenziale è sceso a ${p.pot}.`, 'warn');
    if (p.team != null) p.career.seasons++;
    // ritiro
    const ret = (p.age >= 35 && chance(0.35 + (p.age - 35) * 0.2)) || (p.age >= 31 && p.ovr < 54 && chance(0.5)) ||
      (p.team == null && p.age >= 30 && p.ovr < 60 && chance(0.4));
    if (ret) { p.retired = true; p.team = null; retiredNow.push(p); continue; }
    // contratti
    if (p.team != null) { p.years--; if (p.years <= 0) { p.team = null; p.years = 0; } }
    p.gp = p.pts = p.reb = p.ast = p.min = 0; p.injury = 0;
    p.refusals = Math.max(0, p.refusals - 1);
    p.sponsors = p.sponsors.map(s => ({ ...s, years: s.years - 1 })).filter(s => s.years > 0);
    p.hype *= 0.6;
  }
  devNews(dev.filter(([p]) => !p.retired));
  for (const p of retiredNow) {
    if (isClient(p)) {
      const c = p.career, bonus = c.titles * 2 + c.allstar * 0.8 + c.mvp * 4 + c.seasons * 0.2;
      changeRep(bonus);
      addNews(`🎖️ Il tuo cliente <b>${esc(p.name)}</b> si ritira dopo ${c.seasons} stagioni (${c.titles} titoli, ${c.allstar} All-Star).`, 'gold');
      S.clients = S.clients.filter(id => id !== p.id);
    }
  }
  // i free agent troppo scarsi escono dal giro
  for (const p of Object.values(S.players)) {
    if (p.team == null && !p.school && !p.retired && !isClient(p) && p.ovr < 54) { p.retired = true; retiredNow.push(p); }
  }
  // pulizia: rimuovi i ritirati non clienti per tenere leggero il salvataggio
  for (const p of retiredNow) recRetire(p);
  for (const p of retiredNow) delete S.players[p.id];
  // rose troppo lunghe
  for (const t of S.teams) {
    const r = rosterOf(t.id).sort((a, b) => a.ovr - b.ovr);
    while (r.length > 15) { const cut = r.shift(); cut.team = null; if (isClient(cut)) addNews(`✂️ ${esc(cut.name)} è stato tagliato dai ${esc(t.name)}.`, 'bad'); }
  }
  for (const t of S.teams) { t.w = 0; t.l = 0; t.last = []; if (S.teamRel[t.id] != null) S.teamRel[t.id] = Math.round(S.teamRel[t.id] + (50 - S.teamRel[t.id]) * 0.2); }
  for (const b of Object.keys(S.brandRel)) S.brandRel[b] = Math.round(S.brandRel[b] + (50 - S.brandRel[b]) * 0.2);
  closeChallenges();
  payDividends();
  // i free agent che non trovano squadra da anni si ritirano: la lega non si gonfia
  const fas = Object.values(S.players).filter(p => p.team == null && !p.school && !p.retired && !isClient(p));
  for (const p of fas) if ((p.age >= 28 && p.ovr < 62) || p.ovr < 50) { p.retired = true; delete S.players[p.id]; }
  const rest = Object.values(S.players).filter(p => p.team == null && !p.school && !p.retired && !isClient(p)).sort((a, b) => b.ovr - a.ovr);
  for (const p of rest.slice(140)) delete S.players[p.id];
  S.offers = [];
  S.talks = {};
  S.season++;
  S.seasonIncome = 0; S.seasonExpense = 0;
  genDraftClass();
  academyClass();
  newChallenges();
  const fa = clients().filter(p => p.team == null).length;
  addNews(`📅 Nuova stagione ${seasonLabel()}. ${fa ? `Hai ${fa} client${fa > 1 ? 'i' : 'e'} free agent: è il momento di trattare!` : ''}`, 'gold');
}

/* ================================================================== */
/* Obiettivi                                                           */
/* ================================================================== */
const GOALS = [
  ['five', 'Rappresenta 5 giocatori'],
  ['sponsor', 'Chiudi un contratto di sponsorizzazione'],
  ['allstar', 'Porta un cliente all\'All-Star Game'],
  ['top5', 'Un cliente scelto tra i primi 5 al Draft'],
  ['bigdeal', 'Firma un contratto da almeno $30M l\'anno'],
  ['million', 'Incassa $1M di commissioni in una stagione'],
  ['ring', 'Un cliente vince il titolo'],
  ['mvp', 'Un cliente vince l\'MVP'],
  ['rep50', 'Reputazione 50'],
  ['rich', 'Patrimonio di $10M'],
  ['legend', 'Reputazione 100: agente leggendario'],
  ['owner', 'Diventa socio di una squadra NBA'],
  ['majority', 'Compra il 51% di una squadra: sei il presidente'],
  ['fullowner', 'Compra un\'intera squadra NBA'],
  ['homegrown', 'Crea un campione: un ragazzo della tua accademia arriva a 90'],
];
// Ricompense degli obiettivi: più è difficile, più si vince
const GOAL_REWARDS = {
  five: { cash: 50 },
  sponsor: { cash: 40, brandRel: 5 },
  allstar: { cash: 100, rep: 2 },
  top5: { cash: 100, rep: 2, teamRel: 5 },
  bigdeal: { cash: 250, rep: 1 },
  million: { cash: 300, staff: 'informer' },
  ring: { cash: 500, rep: 5 },
  mvp: { cash: 750, rep: 5 },
  rep50: { cash: 200, staff: 'office' },
  rich: { rep: 3, staff: 'marketing' },
  legend: { cash: 1000, title: true },
  owner: { rep: 3, teamRel: 3 },
  majority: { cash: 2000, badge: true },
  fullowner: { rep: 5 },
  homegrown: { cash: 1500, rep: 5, star: true },
};
function rewardText(r) {
  const o = [];
  if (r.cash) o.push(fmt$(r.cash * 1000));
  if (r.rep) o.push(`+${r.rep} reputazione`);
  if (r.teamRel) o.push(`+${r.teamRel} rapporto con tutte le squadre`);
  if (r.brandRel) o.push(`+${r.brandRel} rapporto con tutti gli sponsor`);
  if (r.staff) o.push(`${STAFF[r.staff].icon} ${STAFF[r.staff].name} +1 livello gratis`);
  if (r.title) o.push('🏆 titolo di Agente leggendario');
  if (r.badge) o.push('👑 titolo di Presidente');
  if (r.star) o.push('🌟 titolo di Scopritore di talenti');
  return o.join(' · ');
}
function giveReward(k) {
  const r = GOAL_REWARDS[k]; if (!r || (S.goalRewards || {})[k]) return '';
  S.goalRewards = S.goalRewards || {};
  S.goalRewards[k] = true;
  if (r.cash) earn(r.cash * 1000);
  if (r.rep) changeRep(r.rep);
  if (r.teamRel) for (const t of S.teams) changeTeamRel(t.id, r.teamRel);
  if (r.brandRel) for (const b of BRANDS) changeBrandRel(b, r.brandRel);
  let txt = rewardText(r);
  if (r.staff) {
    if ((S.staff[r.staff] || 0) < 5) S.staff[r.staff] = (S.staff[r.staff] || 0) + 1;
    else { earn(150000); txt = txt.replace(/[^·]*livello gratis/, ' $150k (staff già al massimo)'); }
  }
  if (r.title) S.legend = true;
  if (r.badge) S.president = true;
  if (r.star) S.talentScout = true;
  return txt;
}
function checkGoal(k, cond) {
  if (!cond || S.goals[k]) return;
  S.goals[k] = seasonLabel();
  const g = GOALS.find(x => x[0] === k);
  const prize = giveReward(k);
  addNews(`🏅 Obiettivo raggiunto: <b>${esc(g[1])}</b>! Ricompensa: ${esc(prize)}.`, 'gold');
  const msg = [`${g[1]} · Ricompensa: ${prize}`, 'goal', 'Obiettivo!'];
  if (UI.advancing) UI.goalQueue.push(msg); else toast(...msg);
}
function checkGoals() {
  checkGoal('five', S.clients.length >= 5);
  checkGoal('rep50', S.rep >= 50);
  checkGoal('rich', S.cash >= 1e7);
  checkGoal('legend', S.rep >= 100);
}

/* ================================================================== */
/* Interfaccia                                                         */
/* ================================================================== */
let toastTimer = null;
function hideToast() { const el = document.getElementById('toast'); if (el && el.classList.contains('show')) el.classList.add('hidden'); }
// un tocco ovunque fa sparire il banner
let toastAt = 0;
// pulsanti − / + per le cifre: un tocco = un passo, tenendo premuto scorre veloce
let stepTimer = null;
// campo cifra con − e +: si può toccare i pulsanti oppure scrivere il numero
function stepper(id, v, step, min, max, suf) {
  return `<div class="stepper" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}">
    <button type="button" class="st-btn" data-d="-1" aria-label="Diminuisci" ${v <= min ? 'disabled' : ''}>−</button>
    <label class="st-mid"><span>$</span><input id="${id}" type="number" inputmode="decimal" step="any" min="${min}" max="${max}" value="${v}" style="width:${String(v).length + 0.7}ch" oninput="this.style.width=(this.value.length + 0.7)+'ch'" onchange="stepFix(this)"><span>${suf}</span></label>
    <button type="button" class="st-btn" data-d="1" aria-label="Aumenta" ${v >= max ? 'disabled' : ''}>+</button></div>`;
}
function stepSet(box, v) {
  const inp = document.getElementById(box.dataset.id), min = +box.dataset.min, max = +box.dataset.max;
  v = clamp(Math.round(v * 10) / 10, min, max);
  inp.value = v; inp.style.width = (String(v).length + 0.7) + 'ch';
  inp.dispatchEvent(new Event('input'));
  box.querySelectorAll('.st-btn').forEach(b => { b.disabled = (+b.dataset.d < 0 && v <= min) || (+b.dataset.d > 0 && v >= max); });
  return v;
}
function stepFix(inp) { const box = inp.closest('.stepper'); stepSet(box, isFinite(+inp.value) && inp.value !== '' ? +inp.value : +box.dataset.min); }
function stepBy(btn) {
  const box = btn.closest('.stepper'), inp = document.getElementById(box.dataset.id);
  stepSet(box, (+inp.value || 0) + +box.dataset.step * +btn.dataset.d);
  if (btn.disabled) clearInterval(stepTimer);
}
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest && e.target.closest('.st-btn'); if (!btn || btn.disabled) return;
  e.preventDefault(); stepBy(btn);
  let n = 0; clearInterval(stepTimer);
  stepTimer = setInterval(() => { if (++n > 4) stepBy(btn); }, 90);
});
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => clearInterval(stepTimer)));
// niente zoom: né con due dita né con il doppio tocco
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
document.addEventListener('pointerdown', () => { if (Date.now() - toastAt > 500) hideToast(); }, true);
const TOAST_TITLES = { good: 'Grande!', bad: 'Ops!', warn: 'Attenzione!', goal: 'Obiettivo!', event: 'Imprevisto!', info: 'Info', intel: 'Soffiata!' };
function toast(msg, type, title) {
  const el = document.getElementById('toast');
  msg = String(msg);
  type = type || (/^✅/.test(msg) ? 'good' : /^❌/.test(msg) ? 'bad' : /^🏅/.test(msg) ? 'goal' : /insufficient|Servono|non hai abbastanza/i.test(msg) ? 'bad' : 'info');
  const modalOpen = !document.getElementById('modal').classList.contains('hidden');
  el.className = 'toast arc ' + type + (modalOpen ? ' low' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = `<b>${esc(title || TOAST_TITLES[type])}</b><span>${esc(msg.replace(EMO_RE, ''))}</span>`;
  void el.offsetWidth; el.classList.add('show'); toastAt = Date.now();
  el.onclick = () => el.classList.add('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, type === 'warn' || type === 'event' || type === 'bad' ? 3400 : 2600);
}

const CALM = ['Nessun imprevisto. I tuoi clienti si sono comportati bene, o hanno imparato a nasconderlo meglio.',
  'Il telefono non ha squillato. Hai controllato tre volte che funzionasse.', 'Niente drammi questa settimana. Goditela, non durerà.',
  'Tutto calmo. Persino i paparazzi sono in ferie.', 'Nessuna rissa, nessun tatuaggio, nessuna intervista sbagliata. Strano.',
  'Settimana liscia. Sospetta, ma liscia.'];
const EMO_KEEP = { '✅': 'check', '❌': 'x', '⚠': 'alert', '▶': 'play' };
const EMO_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D|\p{Extended_Pictographic}|\p{Regional_Indicator})*\s?/gu;
function deEmo(html) {
  return String(html).replace(/(^|>)([^<]+)/g, (m, a, t) => a + t.replace(EMO_RE, e => { const k = EMO_KEEP[[...e][0]]; return k ? ic(k, 'in') + (/\s$/.test(e) ? ' ' : '') : ''; }));
}
const UI = {
  tab: 'home', mkt: 'prospect', q: '', pos: '', sort: 'ovr',

  render() {
    const app = document.getElementById('app');
    if (!S) { app.innerHTML = this.startScreen(); return; }
    const inbox = S.inbox.length;
    const nOffers = S.offers.length;
    const advLabel = { fa: 'Avanza settimana ▶', reg: 'Gioca settimana ▶', po: S.po && S.po.champ != null && S.po.season === seasonLabel() ? 'Chiudi la stagione ▶' : 'Vai ai playoff ▶', draft: 'Vai al Draft ▶' }[S.phase];
    app.innerHTML = deEmo(`
      <header class="top">
        <div class="top-row">
          <div class="brand">${ic('ball', 'logo')} <span>${esc(S.agency)}</span>${S.legend ? ` <span class="legend" title="Agente leggendario">${ic('trophy')}</span>` : ''}${S.president ? ` <span class="legend" title="Presidente">${ic('crown')}</span>` : ''}${S.talentScout ? ` <span class="legend" title="Scopritore di talenti">${ic('star')}</span>` : ''}</div>
          <div class="spacer"></div>
          <div class="cash-pill ${S.cash < 0 ? 'bad' : ''}" id="t-cash2">${fmt$(S.cash)}</div>
          <button class="btn help" id="t-feedback" onclick="openFeedback()" aria-label="Dai un parere">${ic('chat')}</button>
          <button class="btn help" id="t-help" onclick="Tutorial.start()" aria-label="Rivedi il tutorial">?</button>
          <button class="btn primary big ${inbox ? 'blocked' : ''}" id="t-adv" onclick="advance()" ${S.over ? 'disabled' : ''}>${inbox ? `Decidi ${inbox === 1 ? 'l\'imprevisto' : 'gli ' + inbox + ' imprevisti'}` : advLabel}</button>
        </div>
        <nav class="tabs">
          ${[['home', 'Home', inbox, 'home'], ['clients', 'Clienti', nOffers, 'users'], ['market', 'Mercato', 0, 'search'], ['league', 'Lega', 0, 'trophy'], ['staff', 'Staff', 0, 'building']]
            .map(([k, l, b, i]) => `<button id="tab-${k}" class="${this.tab === k ? 'on' : ''}" onclick="UI.go('${k}')">${ic(i)}<span>${l}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}
        </nav>
      </header>
      <main>${this['v_' + this.tab]()}</main>`);
  },
  go(t) { hideToast(); this.tab = t; this.render(); window.scrollTo(0, 0); },
  setGames(on) { S.showGames = on; save(); toast(on ? 'Dopo ogni settimana vedrai i risultati delle partite.' : 'I risultati delle partite non verranno più mostrati.', 'info', on ? 'Risultati accesi' : 'Risultati spenti'); },
  focusEvents(blocked) {
    this.closeModal();
    if (this.tab !== 'home') { this.tab = 'home'; this.render(); }
    const el = document.getElementById('t-ev'); if (!el) return;
    const head = document.querySelector('header.top'), hb = head ? head.getBoundingClientRect().bottom : 0;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - hb - 10, behavior: smooth ? 'smooth' : 'auto' });
    el.classList.remove('nudge', 'shake'); void el.offsetWidth;
    el.classList.add('nudge'); if (blocked) el.classList.add('shake');
  },

  startScreen() {
    const has = hasLocalSave();
    return `<div class="start">
      <div class="start-hero">${heroSVG(null)}</div>
      <h1>Hoop <span>Agent</span></h1>
      <p>Un telefono, due clienti e trecentomila dollari per arrivare in cima alla NBA.</p>
      ${UI.installHint()}
      <form onsubmit="event.preventDefault(); UI.start(this)">
        <label>Il tuo nome<input id="f-agent" name="agent" maxlength="30" placeholder="Es. Marco Rossi" required></label>
        <label>Nome dell'agenzia<input id="f-agency" name="agency" maxlength="34" placeholder="Es. Hoop Dreams Agency" required></label>
        <button class="btn primary big">Fonda l'agenzia</button>
      </form>
      <div class="rules"><p>Scopri un ragazzo al college prima di tutti, conquista la sua fiducia e portalo al Draft. Poi strappa alle squadre il contratto che merita e guardalo diventare una stella.</p>
        <p>Firma i campioni che gli altri agenti non riescono nemmeno a incontrare, fai crescere la tua agenzia e prova a portare un tuo cliente oltre i record di Wilt Ciambellano e LeBonno James.</p></div>
      ${has ? '<p class="small">C\'è una partita salvata: verrà sovrascritta.</p>' : ''}
      <p class="start-links"><button class="linkbtn" onclick="UI.importModal()">Hai un salvataggio? Caricalo</button> · <button class="linkbtn" onclick="openFeedback()">Dai un parere</button></p>
      <p class="small muted">Squadre, giocatori, sponsor e personaggi famosi sono parodie con nomi storpiati.</p>
    </div>`;
  },
  // Invito a installare l'app: solo nel browser del telefono, non quando è già installata
  installHint() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let framed = true; try { framed = window.self !== window.top; } catch (e) { /* dentro un'altra pagina */ }
    if (standalone || framed || window.claude || !/^https?:/.test(location.protocol)) return '';
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return `<div class="install"><b>📲 Installa l'app</b><span>${ios
      ? 'In Safari tocca <b>Condividi</b> (il quadrato con la freccia) e poi <b>Aggiungi alla schermata Home</b>.'
      : 'Apri il menu del browser e scegli <b>Installa app</b> o <b>Aggiungi alla schermata Home</b>.'}
      Si aprirà a schermo intero e funzionerà anche senza internet.</span></div>`;
  },
  async doExport() { const r = await exportSave(); toast(r.msg, r.type, r.type === 'good' ? 'Salvataggio esportato' : undefined); this.render(); },
  async doCopyCode() { const r = await copySaveCode(); toast(r.msg, r.type, r.type === 'good' ? 'Codice copiato' : undefined); this.render(); },
  importModal() {
    this.openModal(`<h3>Carica un salvataggio</h3>
      <p class="small">Scegli il file che hai esportato, oppure incolla il codice copiato.${S ? ' <b>La partita di adesso verrà sostituita.</b>' : ''}</p>
      <label class="btn sm filebtn">Scegli il file<input type="file" accept=".json,application/json,text/plain" onchange="UI.importFile(this)" hidden></label>
      <textarea id="imp-code" rows="4" placeholder="Oppure incolla qui il codice (inizia con SAN1:)"></textarea>
      <p class="bad small" id="imp-err" hidden></p>
      <div class="actions"><button class="btn primary" onclick="UI.importCode()">Carica il codice</button><button class="btn" onclick="UI.closeModal()">Annulla</button></div>`);
  },
  async importFile(input) { const f = input.files && input.files[0]; if (f) this.importText(await f.text()); },
  importCode() { this.importText(document.getElementById('imp-code').value); },
  async importText(text) {
    const obj = await readSave(text), err = document.getElementById('imp-err');
    if (!obj) { if (err) { err.hidden = false; err.textContent = 'Questo non sembra un salvataggio di Hoop Agent. Controlla di aver copiato tutto il codice.'; } return; }
    const r = applyImport(obj); this.closeModal(); toast(r.msg, r.type, r.type === 'good' ? 'Partita caricata' : undefined);
  },
  start(f) { track('nuova-partita'); newGame(f.agency.value.trim(), f.agent.value.trim()); this.tab = 'home'; this.render(); window.scrollTo(0, 0); setTimeout(() => Tutorial.start(), 400); },

  /* ---------- Home ---------- */
  heroPlayer() {
    const cl = clients().filter(p => !p.retired);
    return cl.filter(p => p.team != null).sort((a, b) => b.salary - a.salary)[0] || cl.sort((a, b) => b.ovr - a.ovr)[0] || null;
  },
  v_home() {
    const cl = clients();
    const hp = this.heroPlayer();
    const stars = Math.round(S.rep / 20);
    const ranking = this.agencyRanking();
    const myPos = ranking.findIndex(r => r.mine) + 1;
    const netNow = weeklyNetIn(S.phase), netSeason = weeklyNetIn('reg');
    const net = weeklyIncomeEstimate() - weeklyCost() - loanRate();
    const hpT = hp && teamOf(hp);
    const feed3 = S.news.slice(0, 3).map(n => this.newsItem(n)).join('');
    return `
      <div class="hero">
        ${heroSVG(hp)}
        <div class="hero-txt"><h1>${esc(S.agency)}</h1><p>${seasonLabel()} · ${phaseLabel()}</p></div>
        ${hp ? `<button class="hero-tag" onclick="UI.player(${hp.id})">⭐ ${esc(hp.name)} · #${hp.num}${hpT ? ` · ${esc(hpT.name)}` : ''}${hp.team != null ? ` · ${fmtM(hp.salary)}` : ''}</button>` : ''}
      </div>
      <div class="chips">
        <div class="chip" id="t-cash"><small>💰 Cassa</small><b class="${S.cash < 0 ? 'bad' : ''}">${fmt$(S.cash)}</b><span class="${netNow >= 0 ? 'good' : 'bad'}">${netNow >= 0 ? '+' : ''}${fmt$(netNow)}/sett.</span>${S.phase !== 'reg' ? `<small class="cash-note">in stagione ${netSeason >= 0 ? '+' : ''}${fmt$(netSeason)}</small>` : ''}</div>
        <div class="chip" id="t-rep"><small>Reputazione</small><b>${S.rep.toFixed(0)}</b><span class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span></div>
        <div class="chip" id="t-cl"><small>👥 Clienti</small><b>${cl.length} / ${capacity()}</b><span class="muted">${myPos}ª agenzia</span></div>
      </div>

      ${S.cash < 0 ? `<div class="debt-box">${ic('alert')}<div><b>Sei in rosso di ${fmt$(-S.cash)}</b>
        <span>${S.debtWeeks ? `Hai ${4 - S.debtWeeks} settiman${4 - S.debtWeeks > 1 ? 'e' : 'a'} per rientrare, poi ti ritirano la licenza.` : 'Se resti in rosso per 4 settimane ti ritirano la licenza.'}</span>
        ${S.loan ? `<span>Hai già un prestito in corso: la banca non ti dà altro.</span>` : `<button class="btn primary sm" onclick="UI.loanModal()">Chiedi un prestito</button>`}</div></div>` : ''}
      <div id="t-ev">
      ${poOn() ? this.poHomeCard() : ''}
      <section class="box"><div class="box-h"><h2>Questa settimana</h2>${S.inbox.length ? `<span class="pill warn">${S.inbox.length} da decidere</span>` : ''}</div>
      ${S.inbox.length ? `<div class="evs">${S.inbox.map(e => this.eventCard(e)).join('')}</div>`
        : `<div class="ev calm"><div class="ev-top"><div class="ev-ico">${ic('ball')}</div><div><h3>Settimana tranquilla</h3><p>${CALM[S.turn % CALM.length]} Premi <b>${{ fa: 'Avanza settimana', reg: 'Gioca settimana', po: 'Vai ai playoff', draft: 'Vai al Draft' }[S.phase]}</b> per andare avanti.</p></div></div></div>`}
      </section>
      </div>

      ${S.offers.length ? `<section class="box"><div class="box-h"><h2>Trattative aperte</h2></div><div class="rowlist">${[...new Set(S.offers.map(o => o.pid))].map(pid => {
        const p = P(pid), n = S.offers.filter(o => o.pid === pid).length;
        return `<button class="row" onclick="UI.negotiation(${pid})">${avatarSVG(p, 36)}<span class="row-t"><b>${esc(p.name)}</b><small>${n} offert${n > 1 ? 'e' : 'a'}${S.offers.some(o => o.pid === pid && o.ext) ? ' · rinnovo' : ''}</small></span><span class="go">Negozia ›</span></button>`;
      }).join('')}</div></section>` : ''}

      <section class="box" id="t-pls"><div class="box-h"><h2>I tuoi giocatori</h2><a href="#" onclick="UI.go('clients');return false">Tutti ›</a></div>
        <div class="rowlist">${[...cl].sort((a, b) => (b.team != null) - (a.team != null) || b.salary - a.salary || b.ovr - a.ovr).map(p => this.clientRow(p)).join('')}</div>
        ${cl.length < capacity() ? `<button class="btn add-row" onclick="UI.go('market')">＋ Trova un nuovo cliente</button>` : ''}</section>

      <section class="box"><div class="box-h"><h2>Dalla lega</h2><a href="#" onclick="UI.newsModal();return false">Tutte ›</a></div>
        <div class="feed">${feed3}</div></section>

      <div class="tiles">
        ${S.chal ? this.tile('target', 'Sfide della stagione', `${S.chal.list.filter(c => c.done).length} su ${S.chal.list.length} completate`, 'UI.chalModal()', 't-chal') : ''}
        ${this.tile('medal', 'Obiettivi', `${Object.keys(S.goals).length} su ${GOALS.length}`, 'UI.goalsModal()')}
        ${S.history.length ? this.tile('chart', 'Storico stagioni', `${S.history.length} giocat${S.history.length > 1 ? 'e' : 'a'}`, 'UI.historyModal()') : ''}
        ${this.tile('gear', 'Impostazioni', 'Salvataggio, risultati, tutorial', 'UI.settingsModal()')}
        ${this.tile('chat', 'Dai un parere', 'Due minuti per migliorarlo', 'openFeedback()')}
      </div>`;
  },
  tile(icon, label, sub, onclick, id = '') {
    return `<button class="tile" ${id ? `id="${id}"` : ''} onclick="${onclick}"><span class="tile-ic">${ic(icon)}</span><span class="tile-t"><b>${label}</b><small>${sub}</small></span><span class="go">›</span></button>`;
  },
  newsModal() {
    this.openModal(`<h3>Dalla lega</h3><div class="feed">${S.news.slice(0, 40).map(n => this.newsItem(n)).join('')}</div>`);
  },
  newsItem(n) {
    const m = n.text.match(/^(\p{Extended_Pictographic}️?)\s*/u);
    return `<div class="item ${n.cls}"><i>${ic(m ? emoIcon(m[1]) : 'ball')}</i><div>${m ? n.text.slice(m[0].length) : n.text}<small>${esc(n.when)}</small></div></div>`;
  },
  chalModal() {
    this.openModal(`<h3>Sfide della stagione</h3><p class="small muted">Premio di ${fmt$(chalReward().cash * 1000)} per ognuna.</p>
      <div class="chals">${S.chal.list.map(c => `<div class="chal ${c.done ? 'done' : c.failed ? 'failed' : ''}"><b>${esc(CHAL_TYPES[c.id].t(c.n))}</b><small>${esc(chalProgressTxt(c))}</small></div>`).join('')}</div>`);
  },
  goalsModal() {
    this.openModal(`<h3>Obiettivi</h3><p class="small muted">${Object.keys(S.goals).length} raggiunti su ${GOALS.length}. Ognuno ha la sua ricompensa.</p>
      <div class="goals">${GOALS.map(([k, l]) => `<div class="goal ${S.goals[k] ? 'done' : ''}"><span class="gi">${S.goals[k] ? ic('check') : '<i class="box"></i>'}</span>
        <span class="gt"><b>${esc(l)}</b><small>${S.goals[k] ? `Ricompensa ottenuta (${S.goals[k]}): ` : '🎁 '}${esc(rewardText(GOAL_REWARDS[k]))}</small></span></div>`).join('')}</div>`);
  },
  historyModal() {
    this.openModal(`<h3>Storico stagioni</h3><div class="tbl-wrap"><table><tr><th>Stagione</th><th class="num">Entrate</th><th class="num">Spese</th><th class="num">Clienti</th><th class="num">Rep.</th></tr>
        ${S.history.map(h => `<tr><td>${h.season}</td><td class="num good">${fmt$(h.income)}</td><td class="num bad">${fmt$(h.expense)}</td><td class="num">${h.clients}</td><td class="num">${h.rep.toFixed(1)}</td></tr>`).join('')}</table></div>`);
  },
  settingsModal() {
    this.openModal(`<h3>Impostazioni</h3>
      <div class="settings">
        <label class="switch-row" for="set-games">
          <span><b>Risultati delle partite</b><small>Dopo ogni settimana mostra le partite dei tuoi giocatori, con statistiche e voto.</small></span>
          <input type="checkbox" id="set-games" class="switch" ${S.showGames !== false ? 'checked' : ''} onchange="UI.setGames(this.checked)">
        </label>
      </div>
      <div class="card savebox"><b>Il tuo salvataggio</b>
        <span class="small muted">La partita è salvata solo su questo dispositivo, e Safari a volte cancella i dati dei siti che non apri da un po'. Esportala ogni tanto: con il file (o il codice) la riprendi anche su un altro telefono.${S.lastExport != null ? ` Ultima esportazione: stagione ${S.lastExport}-${String(S.lastExport + 1).slice(2)}.` : ''}</span>
        <div class="actions"><button class="btn primary sm" onclick="UI.doExport()">Esporta file</button><button class="btn sm" onclick="UI.doCopyCode()">Copia codice</button><button class="btn sm" onclick="UI.importModal()">Importa</button></div></div>
      <div class="card savebox"><b>Ti piace il gioco? Cosa cambieresti?</b>
        <span class="small muted">È ancora in prova: ogni parere aiuta a migliorarlo. Bastano due minuti.</span>
        <div class="actions"><button class="btn primary sm" onclick="openFeedback()">Dai un parere</button></div></div>
      <p class="small muted">Il gioco conta le visite in forma anonima, senza cookie e senza dati personali, solo per sapere quante persone lo provano e quante ci tornano.</p>
      <p style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" onclick="UI.closeModal();Tutorial.start()">❓ Rivedi il tutorial</button><button class="btn bad sm" onclick="UI.reset()">Ricomincia da capo</button></p>`);
  },
  eventCard(e) {
    const def = EVENTS.find(x => x.id === e.ev);
    const p = e.pid != null ? P(e.pid) : null;
    if (!def) return '';
    return `<div class="ev ${e.rare ? 'rare' : ''}">${e.rare ? '<div class="rare-tag">Colpo di scena</div>' : ''}
      <div class="ev-top">${p ? `<div class="ev-av">${avatarSVG(p, 54)}<span>${ic(emoIcon(e.ico))}</span></div>` : `<div class="ev-ico">${ic(emoIcon(e.ico))}</div>`}
        <div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>${def.trait && TRAITS[def.trait] ? `<span class="trait why">Succede perché è ${TRAITS[def.trait].label.toLowerCase()}</span>` : ''}</div></div>
      <div class="choices">${def.choices.map((ch, i) => {
        return `<button onclick="resolveEvent(${e.id}, ${i})">${esc(ch.label)}<small>${esc(choiceHint(ch, e, p))}</small></button>`;
      }).join('')}</div></div>`;
  },
  agencyRanking() {
    const tot = {}; RIVALS.forEach(r => tot[r] = 0);
    let mine = 0;
    for (const p of Object.values(S.players)) {
      if (p.team == null) continue;
      if (isClient(p)) mine += p.salary; else if (p.agency && tot[p.agency] != null) tot[p.agency] += p.salary;
    }
    const rows = RIVALS.map(r => ({ name: r, sal: tot[r] }));
    rows.push({ name: S.agency, sal: mine, mine: true });
    return rows.sort((a, b) => b.sal - a.sal);
  },

  /* ---------- Clienti ---------- */
  v_clients() {
    const cl = clients().sort((a, b) => b.ovr - a.ovr);
    if (!cl.length) return `<div class="card">Non hai clienti. Vai al <a href="#" onclick="UI.go('market');return false">Mercato</a> per reclutarne.</div>`;
    return `<h2>I tuoi assistiti (${cl.length}/${capacity()})</h2><div class="grid">${cl.map(p => this.playerCard(p)).join('')}</div>`;
  },
  mkMore: {},
  mkShow(cls) { return Math.min(30, this.mkMore[this.mkt + ':' + cls] || 6); },
  ovrClass: o => o >= 85 ? 't1' : o >= 77 ? 't2' : o >= 70 ? 't3' : '',
  playerCard(p) {
    const t = teamOf(p), offers = S.offers.filter(o => o.pid === p.id).length;
    const mc = p.morale >= 65 ? 'var(--good)' : p.morale >= 35 ? 'var(--warn)' : 'var(--bad)';
    const where = t ? `${esc(teamName(t))} · ${roleLabel(depthChart(t.id, true).get(p.id), null)}` : p.school ? `${esc(p.school)} · Draft ${projTxt(p)}` : 'Senza squadra';
    const prom = (p.promises || []).length;
    return `<div class="card cc">
      <button class="cc-head" onclick="UI.player(${p.id})">${avatarSVG(p, 48)}
        <span class="cc-t"><b>${esc(p.name)}</b><small>${POS_IT[p.pos]} · ${p.age} anni · potenziale ${shownPot(p)}</small></span>
        <span class="ovr ${this.ovrClass(p.ovr)}">${p.ovr}</span></button>
      <div class="cc-info">
        <span>${where}</span>
        ${t ? `<span>${fmtM(p.salary)} per ${p.years} ann${p.years > 1 ? 'i' : 'o'} · a te ${fmt$(p.salary * 1e6 * p.comm / 100)} l'anno</span>` : ''}
        ${p.injury ? `<span class="bad">Infortunato, fermo ${p.injury} sett.</span>` : ''}
        ${prom ? `<span class="warn">${prom} promess${prom > 1 ? 'e' : 'a'} da mantenere</span>` : ''}
        <span class="cc-mor">Rapporto ${p.morale}/100<span class="bar"><i style="width:${p.morale}%;background:${mc}"></i></span></span>
      </div>
      <div class="cc-act">
        ${offers ? `<button class="btn primary sm" onclick="UI.negotiation(${p.id})">Offerte (${offers})</button>` : ''}
        <button class="btn sm" onclick="UI.player(${p.id})">Scheda e azioni</button>
        <button class="btn sm" onclick="UI.giftModal(${p.id})" ${p.lastContact === S.turn ? 'disabled' : ''}>${ic('heart')} Regalo</button>
      </div></div>`;
  },
  doContact(pid) { toast(contact(pid)); save(); this.render(); },
  careModal(pid) {
    const p = P(pid), cc = campaignCost(p), done = p.campaignSeason === S.season;
    this.openModal(`<h3>Cura e immagine di ${esc(p.name)}</h3>
      <div class="card care"><b>Staff personale</b><span class="small muted">Preparatore, fisioterapista e chef solo per lui: si fa male meno spesso, guarisce prima e da veterano cala più piano.</span>
        <p>${p.pstaff ? `<span class="good">Attivo</span> · ${fmt$(pstaffCost(p))} a settimana` : `Costa ${fmt$(pstaffCost(p))} a settimana`}</p>
        <button class="btn sm ${p.pstaff ? 'bad' : 'primary'}" onclick="UI.doPstaff(${pid})">${p.pstaff ? 'Toglilo' : 'Assumilo'}</button></div>
      <div class="card care"><b>Campagna d'immagine</b><span class="small muted">Uno studio di comunicazione lavora su di lui per tutta la stagione: interviste, spot, un documentario. Sale la popolarità e gli sponsor pagano di più. Utile prima di un rinnovo.</span>
        <p>${done ? '<span class="good">Già fatta in questa stagione</span>' : `Costa ${fmt$(cc)}`}</p>
        <button class="btn sm primary" onclick="UI.doCampaign(${pid})" ${done || S.cash < cc ? 'disabled' : ''}>Lancia la campagna</button></div>
      <div class="actions"><button class="btn" onclick="UI.closeModal()">Chiudi</button></div>`);
  },
  doPstaff(pid) { const r = togglePstaff(pid); save(); this.render(); this.careModal(pid); toast(r.msg, r.type); },
  doCampaign(pid) { const r = imageCampaign(pid); save(); this.render(); this.careModal(pid); toast(r.msg, r.type, r.type === 'good' ? 'Campagna lanciata' : undefined); },
  giftModal(pid) {
    const p = P(pid);
    this.openModal(`<h3>Un pensiero per ${esc(p.name)}</h3>
      <p class="small">Il morale ora è <b>${p.morale}</b>. Un giocatore contento rinnova più volentieri e ascolta meno le altre agenzie.</p>
      <div class="gifts">${GIFTS.map((gft, i) => `<button class="gift" onclick="UI.doGift(${pid}, ${i})" ${S.cash < giftCost(p, i) ? 'disabled' : ''}>
        <b>${gft.label}</b>${gft.hint ? `<small>${gft.hint}</small>` : ''}${gft.likes.some(t => hasTrait(p, t)) ? '<small class="good">gli piacerà molto</small>' : ''}
        <span>${fmt$(giftCost(p, i))}</span></button>`).join('')}</div>
      <div class="actions"><button class="btn" onclick="UI.closeModal()">Non questa settimana</button></div>`);
  },
  doGift(pid, i) { const r = giveGift(pid, i); save(); this.closeModal(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Regalo fatto' : undefined); },

  /* ---------- Mercato ---------- */
  v_market() {
    let list = Object.values(S.players).filter(p => !p.retired && !isClient(p));
    if (this.mkt === 'prospect') list = list.filter(p => p.school);
    else if (this.mkt === 'fa') list = list.filter(p => p.team == null && !p.school);
    else list = list.filter(p => p.team != null);
    if (this.pos) list = list.filter(p => p.pos === this.pos);
    if (this.q) { const q = this.q.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q)); }
    const key = { ovr: p => shownOvr(p), pot: p => shownPot(p), age: p => -p.age, val: p => shownValue(p) }[this.sort];
    list.sort((a, b) => key(b) - key(a));
    const full = clients().length >= capacity();
    const pros = this.mkt === 'prospect';
    // gruppi ben separati: i tuoi obiettivi, chi è libero, chi ha già un agente
    const groups = [];
    if (pros) groups.push(['🎯 I tuoi obiettivi', 'Prospetti con cui hai già un legame', list.filter(p => (p.bond || 0) >= 30 && p.agency !== S.agency), 'target']);
    groups.push(['🟢 Senza agente', 'I più facili da convincere', list.filter(p => !p.agency && !(pros && (p.bond || 0) >= 30)), 'free']);
    groups.push(['🔒 Con altre agenzie', 'Più difficili: devi strapparli a un rivale', list.filter(p => p.agency && !(pros && (p.bond || 0) >= 30)), 'rival']);
    return `
      <h2>Mercato</h2>
      <div class="filters">
        <div class="seg">${[['prospect', '🎓 Prospetti'], ['fa', '🆓 Free agent'], ['pro', '📝 Sotto contratto']].map(([k, l]) =>
          `<button class="${this.mkt === k ? 'on' : ''}" onclick="UI.mkt='${k}';UI.render()">${l}</button>`).join('')}</div>
        <select id="f-pos" onchange="UI.pos=this.value;UI.render()" aria-label="Ruolo"><option value="">Tutti i ruoli</option>${POS.map(x => `<option ${this.pos === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select id="f-sort" onchange="UI.sort=this.value;UI.render()" aria-label="Ordina">${[['ovr', 'Ordina: OVR'], ['pot', 'Ordina: potenziale'], ['age', 'Ordina: più giovani'], ['val', 'Ordina: valore']].map(([k, l]) => `<option value="${k}" ${this.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input id="f-q" placeholder="Cerca nome…" value="${esc(this.q)}" onchange="UI.q=this.value;UI.render()" aria-label="Cerca">
      </div>
      ${full ? '<div class="note warn">Hai raggiunto il limite di clienti: amplia gli <b>Uffici</b> nella scheda Staff.</div>' : ''}
      ${pros ? this.intelBox() : ''}
      <p class="small"><a href="#" class="help-link" onclick="UI.mktHelp();return false">${ic('help')} Come funziona il Mercato</a>${pros ? ` · osservazioni rimaste: <b>${scoutsLeft()}</b>` : ''}</p>
      ${groups.filter(g => g[2].length).map(([h, sub, g, cls]) => `
        <section class="mk-group">
          <div class="mk-head"><h3>${h} <span>${g.length}</span></h3><small>${sub}</small></div>
          <div class="mk-list">${g.slice(0, this.mkShow(cls)).map(p => this.mkCard(p, cls, full)).join('')}</div>
          ${g.length > this.mkShow(cls) ? (this.mkShow(cls) < 30 ? `<button class="btn add-row" onclick="UI.mkMore['${this.mkt}:${cls}']=(UI.mkShow('${cls}'))+12;UI.render()">Mostra altri (${g.length - this.mkShow(cls)})</button>` : `<p class="small muted">Mostrati 30 di ${g.length}: usa filtri e ricerca per gli altri.</p>`) : ''}
        </section>`).join('') || '<div class="card muted">Nessun giocatore con questi filtri.</div>'}`;
  },
  mkCard(p, cls, full) {
    const ex = exact(p), t = teamOf(p), bond = p.bond || 0;
    const intel = !ex && p.intelPot != null;
    const deadline = p.rivalDeadline != null && !p.agency ? p.rivalDeadline - S.turn : null;
    return `<article class="mk ${cls}">
      <button class="mk-main" onclick="UI.player(${p.id})">
        ${avatarSVG(p, 48)}
        <span class="mk-info"><b>${esc(p.name)}${p.gem ? ' ' + ic('gem', 'in gem') : p.academy ? ' ' + ic('cap', 'in') : ''}${p.star || p.vip ? ' ' + ic('star', 'in star') : ''}</b>
          <span>${p.pos} · ${p.age} anni · ${p.h || (genBody(p), p.h)} cm · ${natName(p)} · ${p.school ? esc(p.school) : t ? esc(teamName(t)) : 'senza squadra'}</span>
          <span class="${p.agency ? '' : 'good'}">${p.agency ? ic('lock', 'in') + ' ' + esc(p.agency) : '<i class="dot good"></i>nessun agente'}</span>
          <span class="ti">${(p.traits || []).map(t => TRAITS[t].label).join(' · ')}</span></span>
        <span class="mk-rat"><span><small>OVR</small><b>${ex ? '' : '~'}${shownOvr(p)}</b></span><span><small>POT</small><b class="pot">${ex ? '' : '~'}${shownPot(p)}</b></span></span>
      </button>
      ${p.school ? `<div class="mk-bond"><small>Legame</small><div class="bar"><i style="width:${bond}%;background:${bond >= 70 ? 'var(--good)' : bond >= 30 ? 'var(--accent)' : 'var(--muted)'}"></i></div><b>${bond}</b></div>` : ''}
      ${intel || p.bondTip || deadline != null ? `<div class="mk-tags">${intel ? '<span class="tag intel">🕵️ soffiata sul potenziale</span>' : ''}${p.bondTip ? '<span class="tag hot">💬 vuole essere seguito</span>' : ''}${deadline != null ? `<span class="tag inj">⏳ ${esc(p.rivalWho || 'un rivale')}: ${rivalStage(p)[0]}${deadline > 1 ? `, ${deadline} sett.` : ''}</span>` : ''}</div>` : ''}
      <div class="mk-foot"><span class="val">Valore ${ex ? '' : '~'}${fmtM(shownValue(p))}${repNeeded(p) > S.rep ? `<span class="mk-rep ${openChance(p) ? 'warn' : 'bad'}">${ic('lock')} vuole rep. ${repNeeded(p)}</span>` : ''}</span>
        <span class="mk-act">
          ${!ex && p.school ? `<button class="btn sm" onclick="UI.doScout(${p.id})" ${scoutsLeft() <= 0 ? 'disabled' : ''} title="Manda uno scout">${ic('eye')} Osserva ${fmt$(scoutCost(p))}</button>` : ''}
          ${p.school ? `<button class="btn sm" onclick="UI.doCultivate(${p.id})" ${p.lastBond === S.turn ? 'disabled' : ''} title="Costa ${fmt$(cultivateCost(p))}">🤝 Coltiva ${fmt$(cultivateCost(p))}</button>` : ''}
          <button class="btn primary sm" onclick="UI.pitchModal(${p.id})" ${full ? 'disabled' : ''}>Proponi</button>
        </span></div>
    </article>`;
  },
  intelBox() {
    const lv = S.staff.informer || 0;
    if (!lv) return `<button class="tile" onclick="UI.go('staff')"><span class="tile-ic">${ic('eye')}</span><span class="tile-t"><b>Nessun informatore</b><small>Assumine uno nello Staff per avere soffiate sui prospetti</small></span><span class="go">›</span></button>`;
    pruneIntel();
    const urgent = S.intel.filter(r => r.type === 'rival').length;
    return `<button class="tile" onclick="UI.intelModal()"><span class="tile-ic">${ic('eye')}</span><span class="tile-t"><b>Soffiate dell'informatore</b><small>${S.intel.length ? `${S.intel.length} in corso${urgent ? ` · <span class="warn">${urgent} su rivali</span>` : ''}` : 'Nessuna per ora'}</small></span><span class="go">›</span></button>`;
  },
  intelModal() {
    const lv = S.staff.informer || 0;
    this.openModal(`<h3>Il tuo informatore · ${INFORMER_LV[lv]}</h3><p class="small muted">${lv <= 2 ? 'È ancora alle prime armi: a volte sbaglia. Potenzialo nella scheda Staff.' : 'Le sue soffiate sono affidabili.'}</p>
      <div class="intel-box">${(pruneIntel(), S.intel.length) ? `<ul>${[...S.intel].sort((a, b) => (a.type === 'rival' ? S.players[a.pid].rivalDeadline - S.turn : 99) - (b.type === 'rival' ? S.players[b.pid].rivalDeadline - S.turn : 99)).map(r => { const p = S.players[r.pid], st = r.type === 'rival' ? rivalStage(p) : null;
        return `<li><a href="#" onclick="UI.player(${r.pid});return false">${st ? `<span class="rv-st ${st[1]}">${st[0]}</span> ` : ''}${esc(intelText(r))}</a><small>${esc(r.when)}</small></li>`; }).join('')}</ul>` : '<p class="small muted">Nessuna soffiata in corso: le prossime arriveranno nelle prossime settimane.</p>'}</div>`);
  },
  mktHelp() {
    this.openModal(`<h3>Come funziona il Mercato</h3><p>Le valutazioni dei prospetti sono stime (~). <b>Osserva</b> per vederli meglio: i tuoi scout possono seguirne ${SCOUT_MAX} a settimana, questa settimana ne restano ${scoutsLeft()}.</p>
      <p><b>Coltiva</b> per creare un legame prima del Draft: chi ti è legato accetta più facilmente, chiede meno reputazione e a volte sceglie te da solo.</p>
      <p>Occhio alle agenzie rivali: più si avvicina il Draft, più corteggiano i migliori, e solo un legame forte li tiene lontani.</p>
      <p>I free agent firmati in Free Agency ricevono subito offerte dalle squadre. Strappare un giocatore a un'agenzia rivale è più difficile.</p>`);
  },
  doCultivate(pid) { const r = cultivate(pid); toast(r.msg, r.type); save(); this.render(); },
  doScout(pid) { const m = scout(pid); toast(m + (P(pid).scouted && /^Rapporto/.test(m) ? ` Osservazioni rimaste questa settimana: ${scoutsLeft()}.` : ''), 'intel', 'Rapporto scout'); save(); this.render(); },

  /* ---------- Righe dei clienti in Home ---------- */
  clientRow(p) {
    const t = teamOf(p), L = p.last, ng = nextGameTxt(p);
    let meta;
    if (p.injury) meta = `🚑 Fermo ancora ${p.injury} sett.${p.injDebt ? ` · forma −${p.injDebt}` : ''}`;
    else if (p.injDebt) meta = `🩹 Sta tornando in forma (−${p.injDebt} di valutazione per qualche settimana)`;
    else if (p.school) { const pr = draftProjection(p); meta = `🎓 ${esc(p.school)} · proiezione Draft <b>${projTxt(p)}</b>${p.promise != null ? ` · 📣 promesso ai ${esc(S.teams[p.promise].name)}` : ''}`; }
    else if (!t) { const n = S.offers.filter(o => o.pid === p.id).length; meta = `🆓 Senza squadra${n ? ` · <b>${n} offert${n > 1 ? 'e' : 'a'}</b>` : ''}`; }
    else meta = `${roleLabel(depthChart(t.id, true).get(p.id), null)}${ng ? ` · ${esc(ng)}` : ''}`;
    const stats = '';
    return `<button class="pl" onclick="UI.player(${p.id})">
      ${avatarSVG(p, 44)}
      <span class="pl-main"><span class="pl-name"><b>${esc(p.name)}</b><span class="ov ${this.ovrClass(p.ovr)}">${p.ovr}</span>${p.dev && p.dev.season === S.season ? `<span class="dv ${p.dev.d > 0 ? 'up' : 'down'}">${p.dev.d > 0 ? '↑' : '↓'}${Math.abs(p.dev.d)}</span>` : ''}</span>
        <span class="pl-sub">${p.pos} · ${p.age} anni${t ? ` · ${esc(t.name)}` : ''}${t && p.gp ? ` · ${r1(avg(p, 'pts'))} pt a partita` : ''}</span>
        <span class="pl-meta">${meta}</span>${stats}</span>
      ${L && t ? `<span class="pl-last"><span class="grade ${gradeClass(L.grade)}">${L.grade}</span><small>ultima</small></span>` : ''}
    </button>`;
  },

  /* ---------- Risultati della settimana ---------- */
  showDraft(after) {
    const D = S.lastDraft;
    let box = document.getElementById('weekres');
    if (!box) { box = document.createElement('div'); box.id = 'weekres'; document.body.appendChild(box); }
    const mine = D.picks.filter(x => x.mine);
    const row = (x, i) => `<div class="dn-row ${x.mine ? 'mine' : ''}" style="animation-delay:${Math.min(i, 30) * 70}ms">
        <span class="dn-n">#${x.n}</span><div class="dn-info"><b>${esc(x.name)}${x.mine ? ' <span class="tag fa">tuo</span>' : ''}</b>
        <span>${esc(S.teams[x.tid].name)} · ${x.pos} · ${esc(x.school || '')}</span></div>
        ${x.proj ? `<span class="dn-proj ${x.proj - x.n >= 3 ? 'good' : x.n - x.proj >= 3 ? 'bad' : ''}">prev. #${x.proj}</span>` : ''}</div>`;
    const summary = [
      ...mine.map(x => `<div class="dn-sum good">${ic('check')}<div><b>${esc(x.name)}</b> scelto con la <b>#${x.n}</b> dai ${esc(teamName(S.teams[x.tid]))}${x.promised ? ', come promesso' : ''}.
        <small>${x.round === 1 ? `Primo giro: contratto da ${fmtM(x.sal)} per 4 anni.` : 'Secondo giro: contratto al minimo per 2 anni.'}${x.proj ? ` Le previsioni lo davano alla #${x.proj}.` : ''}</small></div></div>`),
      ...D.undrafted.map(u => u.stay
        ? `<div class="dn-sum">${ic('cap')}<div><b>${esc(u.name)}</b> resta un altro anno a farsi le ossa.</div></div>`
        : `<div class="dn-sum bad">${ic('x')}<div><b>${esc(u.name)}</b> non è stato scelto. <small>Ora è free agent: puoi trovargli una squadra tu.</small></div></div>`),
    ].join('');
    const first = D.picks.filter(x => x.round === 1), second = D.picks.filter(x => x.round === 2 && x.mine);
    box.innerHTML = deEmo(`<div class="wr-panel dn-panel" role="dialog" aria-label="Serata del Draft">
      <div class="wr-title">Draft ${D.year}</div>
      ${summary || '<div class="dn-sum">Nessun tuo cliente al Draft quest\'anno. Ecco chi è andato dove.</div>'}
      <div class="dn-head">Primo giro</div>
      <div class="dn-list">${first.map(row).join('')}</div>
      ${second.length ? `<div class="dn-head">Secondo giro</div><div class="dn-list">${second.map((x, i) => row(x, first.length + i)).join('')}</div>` : ''}
      <div class="wr-foot"><button class="btn primary wr-go" id="dn-go">Continua ▶</button></div></div>`);
    box.hidden = false;
    const m = box.querySelector('.dn-row.mine');
    if (m) setTimeout(() => m.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), Math.min(2200, (+m.style.animationDelay.replace('ms', '') || 0) + 300));
    document.getElementById('dn-go').onclick = () => { box.hidden = true; after && after(); };
  },
  showWeek(after) {
    const rows = clients().filter(p => p.week && p.week.length).sort((a, b) => b.salary - a.salary);
    if (!rows.length) { after && after(); return; }
    let box = document.getElementById('weekres');
    if (!box) { box = document.createElement('div'); box.id = 'weekres'; document.body.appendChild(box); }
    const best = rows.reduce((m, p) => { const g = p.week.reduce((x, y) => (y.pts + y.reb * .5 + y.ast * .7) > (x.pts + x.reb * .5 + x.ast * .7) ? y : x); return !m || (g.pts + g.reb * .5 + g.ast * .7) > m.s ? { p, g, s: g.pts + g.reb * .5 + g.ast * .7 } : m; }, null);
    box.innerHTML = deEmo(`<div class="wr-panel" role="dialog" aria-label="Risultati della settimana">
      <div class="wr-title">Risultati · settimana ${S.week - 1 || REG_WEEKS}</div>
      ${best && best.g.grade[0] === 'A' ? `<div class="wr-top">Partita top: <b>${esc(best.p.name)}</b> ${best.g.pts} pt · ${best.g.reb} rb · ${best.g.ast} as <span class="grade ${gradeClass(best.g.grade)}">${best.g.grade}</span></div>` : ''}
      <div class="wr-list">${rows.map(p => {
        const L = p.week[p.week.length - 1], w = p.week.filter(g => g.win).length, n = p.week.length;
        return `<div class="wr-row ${L.grade[0] === 'A' ? 'top' : ''}">${avatarSVG(p, 40)}
          <div class="wr-info"><b>${esc(p.name)}</b><span>${L.win ? '<b class="good">V</b>' : '<b class="bad">P</b>'} ${L.us}-${L.them} ${L.home ? 'vs' : '@'} ${esc(S.teams[L.opp].name)} · settimana ${w}-${n - w}${n < 4 ? ` (${4 - n} saltat${4 - n > 1 ? 'e' : 'a'})` : ''}</span>
          <span class="wr-line">${L.min != null ? `${L.min}' · ` : ''}${L.pts} pt · ${L.reb} rb · ${L.ast} as</span></div>
          <span class="grade big ${gradeClass(L.grade)}">${L.grade}</span></div>`;
      }).join('')}</div>
      <div class="wr-foot"><button class="btn primary wr-go" id="wr-go">Continua ▶</button>
      <button class="wr-off" id="wr-off">Non mostrare più i risultati</button></div></div>`);
    box.hidden = false;
    let closed = false;
    const close = () => { if (closed) return; closed = true; box.hidden = true; clearTimeout(this.wrTimer); after && after(); };
    document.getElementById('wr-go').onclick = close;
    document.getElementById('wr-off').onclick = () => { S.showGames = false; save(); close(); this.render(); toast('Non vedrai più i risultati dopo ogni settimana. Puoi riattivarli in Home, sezione Impostazioni.', 'info', 'Risultati spenti'); };
    box.onclick = e => { if (e.target === box) close(); };
    this.wrTimer = setTimeout(close, 6000 + rows.length * 600);
  },

  /* ---------- Trattativa per diventare suo agente ---------- */
  pitchModal(pid) {
    const p = P(pid), t = S.talks[pid];
    if (!t) {
      const c = openChance(p), cost = pitchCost(p);
      const blocked = p.lockedUntil > S.season ? 'Non vuole parlarti fino alla prossima stagione.' : p.lastPitch === S.turn ? 'Ti ha già detto di no questa settimana.' : '';
      return this.openModal(`
        <div class="tk-head">${avatarSVG(p, 64)}<div><h3>${esc(p.name)}</h3><p class="muted small">${p.pos} · ${p.age} anni · OVR ${exact(p) ? '' : '~'}${shownOvr(p)} · POT ${exact(p) ? '' : '~'}${shownPot(p)}<br>${p.agency ? '🔒 assistito da ' + esc(p.agency) : '🟢 senza agente'}${p.school ? ` · legame ${p.bond || 0}/100` : ''}</p></div></div>
        <p>Prima di tutto deve credere che tu possa rappresentarlo. Se accetta l'incontro, si apre una trattativa: tu offri, lui fa la sua controfferta.</p>
        ${repNeeded(p) > S.rep ? `<div class="rep-need ${c ? 'warn' : 'bad'}">${ic('lock')}<span>Lavora con agenti di reputazione <b>${repNeeded(p)}</b> o più, tu hai <b>${Math.round(S.rep)}</b>. ${c ? 'Sei vicino: può darti una possibilità, ma è dura.' : luxChance(p) ? 'Con le chiamate normali non ti risponde: solo un incontro di lusso può fargli cambiare idea.' : 'Per ora non ti risponde nemmeno.'}${p.school ? ' Coltivare il legame abbassa le sue pretese.' : ''}</span></div>` : ''}
        <div class="tk-odds"><span>Probabilità che accetti di incontrarti</span><b class="${c > .6 ? 'good' : c > .3 ? 'warn' : 'bad'}">${Math.round(c * 100)}%</b></div>
        <p class="small muted">Organizzare l'incontro costa ${fmt$(cost)}. Contano la tua reputazione, il legame con lui e se ha già un agente.</p>
        ${blocked ? `<p class="bad">${blocked}</p>` : ''}
        <div class="actions"><button class="btn primary" onclick="UI.doStartTalk(${pid})" ${blocked || !c ? 'disabled' : ''}>Chiedi un incontro (${fmt$(cost)})</button>
        <button class="btn" onclick="UI.closeModal()">Annulla</button></div>
        <div class="lux"><b>Incontro di lusso</b><span class="small muted">Lo vai a prendere con un jet privato e lo porti a cena in un resort con la famiglia.</span>
          <div class="tk-odds"><span>Probabilità che accetti</span><b class="${luxChance(p) > .6 ? 'good' : luxChance(p) > .3 ? 'warn' : 'bad'}">${Math.round(luxChance(p) * 100)}%</b></div>
          <button class="btn sm" onclick="UI.doStartTalk(${pid}, true)" ${blocked || !luxChance(p) || S.cash < luxCost(p) ? 'disabled' : ''}>Organizza (${fmt$(luxCost(p))})</button></div>`);
    }
    const hearts = '<i class="pip"></i>'.repeat(Math.max(0, t.patience)) + '<i class="pip off"></i>'.repeat(Math.max(0, t.max - t.patience));
    const sug = { comm: Math.min(4, t.ask.comm + 0.5), bonus: Math.max(0, Math.round(t.ask.bonus * 0.8 / 5) * 5) };
    this.openModal(`
      <div class="tk-head">${avatarSVG(p, 64)}<div><h3>Trattativa con ${esc(p.name)}</h3><p class="muted small">${p.pos} · ${p.age} anni · OVR ${exact(p) ? '' : '~'}${shownOvr(p)}${p.agency ? ' · 🔒 ' + esc(p.agency) : ''}</p></div></div>
      <div class="tk-pat"><span>Pazienza</span><span class="hearts">${hearts}</span></div>
      <div class="tk-ask"><small>La sua richiesta</small><b>${talkTxt(t.ask)}</b></div>
      <ul class="tk-log">${t.log.slice(-5).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="neg-form">
        <label>Commissione che chiedi: <b id="tk-cv">${sug.comm}%</b><input id="tk-c" type="range" min="1" max="4" step="0.5" value="${sug.comm}" oninput="document.getElementById('tk-cv').textContent=this.value+'%'"></label>
        <div class="lbl">Bonus alla firma che offri${stepper('tk-b', sug.bonus, 5, 0, Math.max(100, Math.ceil(t.ask.bonus * 2 / 5) * 5), 'k')}<small>tocca − e + (passi di $5k, tieni premuto per andare veloce) oppure tocca la cifra e scrivila</small></div>
      </div>
      <div class="promises"><b>🤝 Promesse</b> <span class="small muted">possono convincerlo, ma poi vanno mantenute entro fine stagione regolare</span>
        ${Object.entries(PROMISES).filter(([k]) => promiseFeasible(p, k)).map(([k, pr]) => `<label class="pr-row"><input type="checkbox" id="tk-pr-${k}"><span>${pr.label}${pr.likes.some(t => hasTrait(p, t)) ? ' <span class="good small">· gli piace molto</span>' : ''}</span></label>`).join('')}</div>
      <p class="small muted">Più commissione chiedi, più guadagni ogni anno, ma più si irrita. Un bonus alla firma generoso lo rende più disponibile. Se tiri troppo si offende e chiede di più. Un'agenzia rivale può sempre intromettersi: non tirarla per le lunghe.</p>
      <div class="actions">
        <button class="btn primary" onclick="UI.doTalkOffer(${pid})">Fai l'offerta</button>
        <button class="btn good" onclick="UI.doTalkAccept(${pid})">Accetta la sua richiesta</button>
        <button class="btn bad" onclick="UI.doTalkQuit(${pid})">Lascia perdere</button>
      </div>`);
  },
  doStartTalk(pid, lux = false) {
    const r = startTalk(pid, lux); save(); this.render();
    if (r.ok) { toast(`${P(pid).name} ha accettato di incontrarti!`, 'good', 'Si tratta!'); this.pitchModal(pid); }
    else { this.closeModal(); toast(r.msg, r.type); }
  },
  doTalkOffer(pid) {
    const c = +document.getElementById('tk-c').value, b = +document.getElementById('tk-b').value || 0;
    const prom = Object.keys(PROMISES).filter(k => { const el = document.getElementById('tk-pr-' + k); return el && el.checked; });
    const r = talkOffer(pid, c, b, prom); save(); this.render();
    if (!r) return;
    if (r.done) { this.closeModal(); toast(r.msg, r.type, r.type === 'good' ? 'Firmato!' : undefined); }
    else { toast(r.msg, r.type); this.pitchModal(pid); }
  },
  doTalkAccept(pid) { const r = talkAcceptAsk(pid); save(); this.render(); if (!r) return; if (r.done) { this.closeModal(); toast(r.msg, r.type, 'Firmato!'); } else toast(r.msg, r.type); },
  doTalkQuit(pid) { talkQuit(pid); save(); this.closeModal(); this.render(); toast('Trattativa chiusa. Potrai riprovare più avanti.', 'info'); },

  /* ---------- Consiglia a una squadra ---------- */
  recModal(pid) {
    const p = P(pid);
    if (p.team != null && !p.school) return this.tradeModal(pid);
    const teams = S.teams.filter(t => t.id !== p.team).map(t => ({ t, c: recChance(p, t.id), slot: draftSlot(t.id), rel: teamRel(t.id) }));
    teams.forEach(x => x.need = needOf(x.t.id, p.pos).lvl);
    teams.sort((a, b) => b.c - a.c || b.need - a.need || a.slot - b.slot);
    const done = p.lastRec === S.turn;
    const intro = p.school
      ? `Consiglia ${esc(p.name)} a una squadra: se ti ascoltano, lo sceglieranno al Draft se è ancora libero al loro turno, e sale nelle classifiche. Oggi è proiettato alla <b>#${draftProjection(p)}</b>.`
      : p.team == null ? `Consiglia ${esc(p.name)} a una squadra: se ti ascoltano, gli fanno un'offerta.`
        : `Proponi ${esc(p.name)} a un'altra squadra: se ti ascoltano, organizzano uno scambio.`;
    this.openModal(`<h3>${ic('megaphone')} Consiglia ${esc(p.name)}</h3><p class="small">${intro}</p>
      <p class="small muted">Accanto a ogni squadra vedi i ruoli in cui ha più bisogno: se cerca proprio ${POS_ART[p.pos]}, ti ascolta più volentieri. Più è buono il tuo rapporto con la squadra, più ti danno retta. Se non ti ascoltano, il rapporto cala un po'. Puoi parlarne con una squadra a settimana.</p>
      ${done ? '<p class="warn">Ne hai già parlato con una squadra questa settimana.</p>' : ''}
      <div class="rec-list">${teams.map(({ t, c, slot, rel }) => `<div class="rec">
        <span class="rec-t"><b>${esc(teamName(t))}</b><span class="needs">${needChips(t.id, p.pos)}</span><small>${p.school ? `scelta #${slot} · ` : ''}rapporto ${relLabel(rel)}</small></span>
        <span class="rec-c ${c > .6 ? 'good' : c > .3 ? 'warn' : 'bad'}">${Math.round(c * 100)}%</span>
        <button class="btn sm primary" onclick="UI.doRecommend(${pid}, ${t.id})" ${done ? 'disabled' : ''}>Consiglia</button></div>`).join('')}</div>`);
  },
  campModal(pid) {
    const p = P(pid), lg = legendFor(p), done = p.campSeason === S.season;
    this.openModal(`<h3>${ic('dumbbell')} Camp con ${esc(lg)}</h3>
      <p class="small">La leggenda ${esc(lg)} può allenare ${esc(p.name)} (${careerPhase(p).join(' ').toLowerCase()}, ${p.age} anni, OVR ${p.ovr}). I giovani migliorano di più, i veterani rallentano il declino. Contano anche il carattere e la voglia di lavorare.</p>
      ${done ? '<p class="warn">Ha già fatto il camp in questa stagione.</p>' : ''}
      <div class="rec-list">${CAMPS.map(c => { const [lo, hi] = campPreview(p, c); return `<div class="rec">
        <span class="rec-t"><b>${c.label}</b><small>Miglioramento previsto: ${lo === hi ? `+${lo}` : `da +${lo} a +${hi}`} di valutazione${p.age <= 25 && c.id === 2 ? ' · può alzare il potenziale' : ''}</small></span>
        <button class="btn sm primary" onclick="UI.doCamp(${pid}, ${c.id})" ${done || S.cash < c.cost * 1000 ? 'disabled' : ''}>${fmt$(c.cost * 1000)}</button></div>`; }).join('')}</div>`);
  },
  doCamp(pid, ci) { const r = legendCamp(pid, ci); save(); this.closeModal(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Allenamento!' : undefined); },
  doSponsor(pid) { const r = seekSponsor(pid); save(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Sponsor!' : undefined); },
  doRecommend(pid, tid) { const r = recommend(pid, tid); save(); this.closeModal(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Ti hanno ascoltato!' : undefined); },

  /* ---------- Trattative ---------- */
  negotiation(pid, selId = null, msg = '') {
    const p = P(pid);
    const offers = S.offers.filter(o => o.pid === pid);
    if (!offers.length) { this.closeModal(); this.render(); return; }
    const sel = offers.find(o => o.id === selId) || offers[0];
    const pr = PREFS[prefOf(p)];
    const others = offers.filter(o => o.id !== sel.id);
    const best = others.length ? Math.max(...others.map(o => o.salary)) : 0;
    this.openModal(`
      <div class="tk-head">${avatarSVG(p, 56)}<div><h3>Trattative per ${esc(p.name)}</h3>
        <p class="muted small">${p.pos} · ${p.age} anni · OVR ${p.ovr} · valore stimato <b>${valRange(p)}</b> · commissione ${p.comm}%</p></div></div>
      <div class="pref">${pr[0]} Per lui conta soprattutto <b>${pr[1]}</b>. Se firma dove non gli piace, il rapporto con te ne risente.</div>
      ${offers.map(o => { const [f, why] = teamFit(p, o.teamId, o.salary); const wl = weeksLeft(o); return `<div class="offer ${o.id === sel.id ? 'sel' : ''}" onclick="UI.negotiation(${pid}, ${o.id})" style="cursor:pointer">
        <div class="of-top"><b>${esc(teamName(S.teams[o.teamId]))}</b>${o.ext ? '<span class="tag">rinnovo</span>' : ''}${o.final ? '<span class="tag inj">offerta finale</span>' : ''}<span class="fit">${fitIcon(f)} ${esc(why)}</span></div>
        <div>${fmtM(o.salary)} × ${o.years} ann${o.years > 1 ? 'i' : 'o'} · totale ${fmtM(o.salary * o.years)}</div>
        ${prefOf(p) === 'minuti' ? '' : `<div class="small role-line">Ruolo: <b>${roleTxt(p, o.teamId)}</b></div>`}
        <div class="small muted">Pazienza GM: <span class="patience">${'<i class="pip"></i>'.repeat(Math.max(0, o.patience))}${'<i class="pip off"></i>'.repeat(Math.max(0, 3 - o.patience))}</span> · rapporto ${relLabel(teamRel(o.teamId))}${wl != null ? ` · <span class="${wl <= 1 ? 'warn' : ''}">⏳ ${wl <= 1 ? 'scade questa settimana' : `ancora ${wl} settimane`}</span>` : ''}</div>
      </div>`; }).join('')}
      ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
      <h3 style="margin-top:14px">Trattativa con ${esc(S.teams[sel.teamId].name)}</h3>
      <div class="neg-form">
        <div class="lbl">Stipendio che chiedi (all'anno)${stepper('ask', r1(sel.salary * 1.12), 0.5, MIN_SAL, MAX_SAL, 'M')}</div>
        <label>Anni<select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === sel.years ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      </div>
      <p class="small muted">Chiedere troppo fa perdere pazienza al GM. <b>Contratto corto</b>: se migliora, il prossimo sarà più ricco (e anche la tua commissione), ma rischi se si infortuna o cala. <b>Contratto lungo</b>: soldi sicuri. ${p.age >= 30 ? 'A questa età preferisce la sicurezza.' : hasTrait(p, 'ambizioso') && p.age <= 25 ? 'Da ambizioso preferirebbe un contratto corto.' : ''}</p>
      <div class="actions">
        <button class="btn good" onclick="UI.doAccept(${sel.id})">Accetta ${fmtM(sel.salary)} × ${sel.years}</button>
        <button class="btn primary" onclick="UI.doCounter(${pid}, ${sel.id})" ${sel.final ? 'disabled' : ''}>Controproposta</button>
        <button class="btn bad" onclick="UI.doReject(${pid}, ${sel.id})">Rifiuta</button>
      </div>
      ${sel.lev || sel.final ? '' : `<div class="lev">
        <b>📢 Gioca la carta dell'asta</b>
        <p class="small muted">Dì ai ${esc(S.teams[sel.teamId].name)} che hai un'offerta più alta: possono rilanciare, fermarsi o ritirarsi. ${best ? `La tua offerta migliore vera è <b>${fmtM(best)}</b>.` : 'Non hai altre offerte: sarebbe un bluff.'} Se bluffi e ti scoprono, ritirano l'offerta. Una volta sola per squadra.</p>
        <div class="lev-row">${stepper('claim', r1(best > sel.salary ? best : sel.salary * 1.15), 0.5, MIN_SAL, MAX_SAL, 'M')}<button class="btn sm" onclick="UI.doLeverage(${pid}, ${sel.id})">Cita questa offerta</button></div>
      </div>`}`);
  },
  doLeverage(pid, oid) {
    const r = leverage(oid, +document.getElementById('claim').value); save(); this.render();
    toast(r.msg, r.type, r.type === 'good' ? 'Rilancio!' : r.type === 'bad' ? 'Ops!' : undefined);
    if (S.offers.some(o => o.pid === pid)) this.negotiation(pid, r.done ? null : oid); else this.closeModal();
  },
  doAccept(oid) { const r = acceptOffer(oid); save(); this.closeModal(); this.render(); if (r && r.msg) toast(r.msg, 'bad'); else toast('Contratto firmato!', 'good'); },
  doCounter(pid, oid) {
    const ask = r1(+document.getElementById('ask').value), yrs = +document.getElementById('yrs').value;
    if (!(ask >= MIN_SAL)) return toast(`Minimo ${fmtM(MIN_SAL)}.`);
    const r = negotiate(oid, Math.min(ask, MAX_SAL), yrs);
    save();
    if (r.done && !S.offers.some(o => o.pid === pid)) { this.closeModal(); this.render(); toast(r.msg); return; }
    this.render(); this.negotiation(pid, r.done ? null : oid, r.msg);
  },
  doReject(pid, oid) {
    const o = S.offers.find(x => x.id === oid);
    S.offers = S.offers.filter(x => x.id !== oid);
    if (o) changeTeamRel(o.teamId, -2);
    if (o) addNews(`❌ Rifiutata l'offerta dei ${esc(teamName(S.teams[o.teamId]))} per ${esc(P(pid).name)}.`);
    save(); this.render(); this.negotiation(pid);
  },

  /* ---------- Scheda giocatore ---------- */
  ptab: 'info',
  player(pid, tab) {
    const p = P(pid), t = teamOf(p), mine = isClient(p), ex = exact(p);
    const c = p.career;
    if (tab) this.ptab = tab; else if (this.ptabPid !== pid) this.ptab = 'info';
    this.ptabPid = pid;
    const T = this.ptab;
    const offers = S.offers.filter(o => o.pid === p.id).length;
    const head = `<div class="pc-head">${avatarSVG(p, 64)}
        <div class="pc-ht"><div class="pc-name">${esc(p.name)} ${mine ? '<span class="tag fa">tuo cliente</span>' : ''}</div>
        <div class="pc-sub">${POS_IT[p.pos]} · ${p.age} anni · potenziale ${ex ? '' : '~'}${shownPot(p)}</div>
        <div class="phase">${careerPhase(p).join(' ')}${p.injDebt ? ` · forma −${p.injDebt}` : ''}</div></div>
        <div class="ovr ${this.ovrClass(p.ovr)}">${ex ? '' : '~'}${shownOvr(p)}</div></div>
      <div class="seg ptabs">${[['info', 'Sintesi'], ['car', 'Statistiche'], ['story', 'Storia']].map(([k, l]) => `<button class="${T === k ? 'on' : ''}" onclick="UI.player(${pid}, '${k}')">${l}</button>`).join('')}</div>`;
    let body = '';
    if (T === 'info') body = `<dl class="rows">
        <dt>Squadra</dt><dd>${t ? esc(teamName(t)) + ' · #' + p.num : p.school ? esc(p.school) : 'Free agent'}</dd>
        ${t ? `<dt>Ruolo</dt><dd>${roleTxt(p, t.id)}</dd>` : ''}
        ${p.school ? `<dt>Proiezione Draft</dt><dd>${projTxt(p)}</dd>` : ''}
        ${t ? `<dt>Contratto</dt><dd>${fmtM(p.salary)} × ${p.years}</dd>` : ''}
        <dt>Agenzia</dt><dd>${mine ? esc(S.agency) : p.agency ? esc(p.agency) : 'Nessuna'}</dd>
        ${mine ? `<dt>Commissione</dt><dd>${p.comm}%</dd><dt>Rapporto</dt><dd>${p.morale}/100</dd>` : ''}
        ${p.sponsors.length ? `<dt>Sponsor</dt><dd>${p.sponsors.map(s => `${esc(s.brand)} ${fmtM(s.value)} (${s.years}a)`).join('<br>')}</dd>` : ''}
        ${(p.promises || []).length ? `<dt>Promesse</dt><dd>${p.promises.map(pr => `${promiseStatus(p, pr)} ${esc(PROMISES[pr.k].label)}${pr.season > S.season ? ' (prossima stagione)' : ''}`).join('<br>')}</dd>` : ''}
      </dl>
      <div class="act-grid">
        ${mine ? `${offers ? `<button class="btn primary" onclick="UI.negotiation(${p.id})">Offerte (${offers})</button>` : ''}
          <button class="btn" onclick="UI.giftModal(${p.id})" ${p.lastContact === S.turn ? 'disabled' : ''}>${ic('heart')} Regalo</button>
          <button class="btn" onclick="UI.careModal(${p.id})">${ic('star')} Cura e immagine</button>
          <button class="btn" onclick="UI.recModal(${p.id})">${p.team != null && !p.school ? ic('swap') + ' Scambio' : ic('megaphone') + ' Consiglia'}</button>
          <button class="btn" onclick="UI.campModal(${p.id})" ${p.campSeason === S.season ? 'disabled' : ''}>${ic('dumbbell')} Camp</button>
          ${!p.school && p.ovr >= 62 ? `<button class="btn" onclick="UI.doSponsor(${p.id});UI.player(${p.id})" ${S.turn - (p.lastSponsorTry ?? -99) < 4 || p.sponsors.length >= 4 ? 'disabled' : ''}>${ic('coin')} Cerca sponsor</button>` : ''}
          <button class="btn bad sm wide" onclick="UI.release(${p.id})">Interrompi rapporto</button>`
          : `<button class="btn primary" onclick="UI.pitchModal(${p.id})">${S.talks[p.id] ? 'Riprendi la trattativa' : 'Proponi agenzia'}</button>
          ${p.school ? `<button class="btn" onclick="UI.recModal(${p.id})">${ic('megaphone')} Consiglia</button>` : ''}
          ${!ex && p.school ? `<button class="btn" onclick="UI.doScout(${p.id});UI.player(${p.id})" ${scoutsLeft() <= 0 ? 'disabled' : ''}>${ic('eye')} Osserva (${fmt$(scoutCost(p))})</button>` : ''}`}
      </div>`;
    else if (T === 'car') body = `${t && p.gp ? `<div class="statbox"><span><b>${r1(avg(p, 'min'))}</b>min</span><span><b>${r1(avg(p, 'pts'))}</b>punti</span><span><b>${r1(avg(p, 'reb'))}</b>rimbalzi</span><span><b>${r1(avg(p, 'ast'))}</b>assist</span></div>
        <p class="small muted">Media in questa stagione, ${p.gp} partite.${p.last ? ` Ultima: ${p.last.pts} pt, ${p.last.reb} rb, ${p.last.ast} as, voto ${p.last.grade}.` : ''}</p>` : ''}
      <dl class="rows">
        ${p.cgp ? `<dt>In carriera</dt><dd>${p.cgp} gare · ${(p.cpts || 0).toLocaleString('it-IT')} pt · ${(p.creb || 0).toLocaleString('it-IT')} rb · ${(p.cast || 0).toLocaleString('it-IT')} as</dd>` : ''}
        ${p.hi && p.hi.pts ? `<dt>Massimi in una partita</dt><dd>${p.hi.pts} pt · ${p.hi.reb || 0} rb · ${p.hi.ast || 0} as</dd>` : ''}
        <dt>Palmarès</dt><dd>${c.seasons} stag. · ${c.titles} titoli · ${c.allstar} All-Star · ${c.mvp} MVP</dd>
        ${p.draftPick ? `<dt>Draft</dt><dd>scelta #${p.draftPick}</dd>` : ''}
        <dt>Valore di mercato</dt><dd>${ex ? '' : '~'}${fmtM(shownValue(p))}</dd>
        <dt>Popolarità</dt><dd>${Math.round(p.hype)}/100</dd>
      </dl>`;
    else body = `<p class="story">${esc(storyOf(p))}</p>
      <div class="traits">${traitChips(p)}</div>
      ${(p.traits || []).map(t => `<p class="small muted trait-desc"><b>${TRAITS[t].label}</b>: ${TRAITS[t].desc}</p>`).join('')}
      <dl class="rows"><dt>Nazionalità</dt><dd>${natName(p)}</dd><dt>Fisico</dt><dd>${bodyTxt(p)}</dd></dl>`;
    this.openModal(head + body);
  },

  release(pid) {
    this.ask(`Vuoi davvero interrompere il rapporto con <b>${esc(P(pid).name)}</b>? Perderai un po' di reputazione.`, 'Interrompi',
      () => { releaseClient(pid); save(); this.closeModal(); this.render(); });
  },
  // conferma dentro la pagina (confirm() del browser non funziona dentro claude.ai)
  ask(html, yesLabel, onYes) {
    this._yes = onYes;
    this.openModal(`<p>${html}</p><div class="actions"><button class="btn bad" onclick="UI._yes()">${yesLabel}</button>
      <button class="btn" onclick="UI.closeModal()">Annulla</button></div>`);
  },

  /* ---------- Lega ---------- */
  lgTab: null,
  // rosa di una squadra, ruolo per ruolo
  teamModal(tid) {
    const t = S.teams[tid], dc = depthChart(tid, false), now = depthChart(tid, true);
    const roster = rosterOf(tid), pr = payroll(tid), stake = stakeOf(tid);
    const pw = powerRanking().findIndex(x => x.id === tid) + 1;
    const row = p => {
      const e = now.get(p.id) || dc.get(p.id);
      return `<button class="tm-p ${isClient(p) ? 'mine' : ''}" onclick="UI.player(${p.id})">${avatarSVG(p, 34)}
        <span class="tm-i"><b>${esc(p.name)}${isClient(p) ? ' <span class="tag fa">tuo</span>' : ''}${p.star || p.vip ? ' ' + ic('star', 'in star') : ''}</b>
          <small>${p.injury ? `<span class="bad">infortunato ${p.injury} sett.</span> · ` : ''}${roleLabel(e, p)}${e && e.min ? ` · ~${e.min} min` : ''}</small>
          <small>${p.age} anni · ${fmtM(p.salary)} per ${p.years} ann${p.years > 1 ? 'i' : 'o'}${p.gp ? ` · ${r1(avg(p, 'pts'))} pt` : ''}</small></span>
        <span class="tm-o"><small>OVR</small><b>${p.ovr}</b></span></button>`;
    };
    const order = { start: 0, bench: 1, third: 2, deep: 3 };
    const groups = POS_LIST.map(pos => [pos, roster.filter(p => (dc.get(p.id) || {}).pos === pos && (dc.get(p.id) || {}).slot !== 'deep')
      .sort((a, b) => order[dc.get(a.id).slot] - order[dc.get(b.id).slot])]);
    const deep = roster.filter(p => !dc.get(p.id) || dc.get(p.id).slot === 'deep').sort(rotCmp);
    this.openModal(`<div class="tm-head">${teamChip(tid, true)}<div><h3>${esc(teamName(t))}</h3>
        <p class="small muted">${confRank(tid)}ª a ${CONF_NAME[confOf(t)]} · ${t.w}-${t.l} · ultime 10: ${last10(t)} · ${pw}ª nel power ranking</p></div></div>
      <div class="tm-facts"><span>Forza <b>${teamStrength(tid).toFixed(1)}</b></span><span>Monte ingaggi <b>${fmtM(pr)}</b></span>
        <span>Spazio cap <b class="${CAP - pr > 0 ? 'good' : 'muted'}">${CAP - pr > 0 ? fmtM(CAP - pr) : 'nessuno'}</b></span><span>Rapporto <b>${relLabel(teamRel(tid))}</b></span>${stake ? `<span>Tua quota <b class="gold">${stake}%</b></span>` : ''}</div>
      <p class="small">Cercano: ${needChips(tid)}</p>
      ${groups.map(([pos, ps]) => ps.length ? `<div class="tm-pos">${POS_NAME[pos][0].toUpperCase() + POS_NAME[pos].slice(1)}</div>${ps.map(row).join('')}` : '').join('')}
      ${deep.length ? `<div class="tm-pos">Fondo panchina</div>${deep.map(row).join('')}` : ''}`);
  },
  // in Home durante i playoff: a che punto sono le squadre dei tuoi clienti
  poHomeCard() {
    const po = S.po, my = myTeamIds();
    const cur = tid => [...po.series].reverse().find(s => s.a === tid || s.b === tid);
    const rows = [...my].map(tid => {
      const s = cur(tid), t = S.teams[tid];
      if (!s) return `<li>${teamChip(tid)} <span class="muted">fuori dai playoff</span></li>`;
      const out = s.w != null && s.w !== tid, opp = S.teams[s.a === tid ? s.b : s.a].abbr, me = poWins(s, tid), them = poWins(s, s.a === tid ? s.b : s.a);
      const txt = po.champ === tid ? '<b class="gold">campioni!</b>' : out ? (s.round < 2 ? 'fuori al play-in' : s.round === 5 ? 'battuti in finale' : 'eliminati, ' + PO_ROUNDS[s.round].toLowerCase())
        : s.w === tid ? 'passano il turno' : s.bo === 1 ? `play-in contro ${opp}` : me > them ? `avanti <b>${me}-${them}</b> con ${opp}` : me < them ? `sotto <b>${me}-${them}</b> con ${opp}` : `<b>${me}-${them}</b> con ${opp}`;
      return `<li>${teamChip(tid)} <span class="${out ? 'muted' : ''}">${txt}</span></li>`;
    }).join('');
    return `<div class="po-banner live home">${ic('trophy')}<div><b>${po.champ != null ? 'Playoff finiti: ' + esc(teamName(S.teams[po.champ])) + ' campioni' : 'Playoff · ' + PO_ROUNDS[po.round]}</b>
      ${rows ? `<ul class="po-mylist">${rows}</ul>` : '<small>Nessun tuo cliente gioca i playoff, ma puoi seguirli lo stesso.</small>'}</div>
      <button class="btn sm primary" onclick="UI.openPlayoffs()">${po.champ != null ? 'Rivedi' : 'Tabellone'}</button></div>`;
  },
  v_conf(c, myTeams) {
    const st = confStandings(c), lead = st[0];
    return `<div class="tbl-wrap"><table class="conf-t">
        <tr><th>#</th><th>Squadra</th><th class="num">V</th><th class="num">P</th><th class="num">%</th><th class="num">Dist.</th><th class="num">Ult. 10</th><th class="num">Serie</th></tr>
        ${st.map((t, i) => { const gb = gamesBehind(t, lead); return `<tr class="${myTeams.has(t.id) ? 'mine' : ''}${i === 6 ? ' cutline' : ''}${i === 10 ? ' cutline out' : ''}"><td>${i + 1}</td><td><a class="tlink" href="#" onclick="UI.teamModal(${t.id});return false">${esc(teamName(t))}</a>${myTeams.has(t.id) ? ' <i class="po-dot"></i>' : ''}</td><td class="num">${t.w}</td><td class="num">${t.l}</td>
          <td class="num">${winPct(t).toFixed(3).replace(/^0/, '')}</td><td class="num">${gb ? String(gb).replace('.', ',') : '-'}</td><td class="num">${last10(t)}</td><td class="num">${streakTxt(t)}</td></tr>`; }).join('')}
      </table></div>
      <p class="small muted">Conference ${CONF_NAME[c]}. Le prime 6 vanno dritte ai playoff, dalla 7ª alla 10ª si giocano gli ultimi due posti nel play-in. Righe evidenziate: squadre con tuoi clienti. Tocca una squadra per vedere la rosa.</p>`;
  },
  v_power(myTeams) {
    const pw = powerRanking(), prev = S.powerPrev || {};
    return `<div class="tbl-wrap"><table>
        <tr><th>#</th><th></th><th>Squadra</th><th class="num">V-P</th><th class="num">Forza</th><th class="num">Monte ingaggi</th><th class="num">Spazio cap</th><th>Rapporto</th></tr>
        ${pw.map((t, i) => { const pr = payroll(t.id), was = prev[t.id], mv = was ? was - (i + 1) : 0;
          return `<tr class="${myTeams.has(t.id) ? 'mine' : ''}"><td>${i + 1}</td><td class="pw-mv ${mv > 0 ? 'good' : mv < 0 ? 'bad' : 'muted'}">${mv > 0 ? '↑' + mv : mv < 0 ? '↓' + (-mv) : '='}</td><td><a class="tlink" href="#" onclick="UI.teamModal(${t.id});return false">${esc(teamName(t))}</a> <small class="muted">${CONF_NAME[confOf(t)]}</small></td><td class="num">${t.w}-${t.l}</td>
          <td class="num">${teamStrength(t.id).toFixed(1)}</td><td class="num">${fmtM(pr)}</td><td class="num ${CAP - pr > 0 ? 'good' : 'muted'}">${CAP - pr > 0 ? fmtM(CAP - pr) : '-'}</td><td>${relLabel(teamRel(t.id))} <span class="muted">${teamRel(t.id)}</span></td></tr>`; }).join('')}
      </table></div>
      <p class="small muted">Le 30 squadre in ordine di forza vera: conta la rosa, ma con il passare delle settimane contano sempre di più i risultati e la forma delle ultime partite. Le frecce dicono quanti posti hanno guadagnato o perso dalla settimana scorsa. Tocca una squadra per vedere la rosa. Salary cap: ${fmtM(CAP)}.</p>`;
  },
  v_league() {
    if (!this.lgTab) { const t = clients().map(teamOf).find(Boolean); this.lgTab = t ? confOf(t) : 'E'; }
    const myTeams = new Set(clients().map(p => p.team));
    const rk = this.agencyRanking();
    return `
      ${S.po ? `<div class="po-banner ${poOn() ? 'live' : ''}">${ic('trophy')}<div><b>${poOn() ? (S.po.champ != null ? 'Playoff finiti: ' + esc(teamName(S.teams[S.po.champ])) + ' campioni' : 'Playoff in corso: ' + PO_ROUNDS[S.po.round].toLowerCase()) : 'Playoff ' + esc(S.po.season)}</b>
        <small>${!poOn() && S.po.champ != null ? 'Campioni: ' + esc(teamName(S.teams[S.po.champ])) : 'Tabellone, risultati e partite in diretta'}</small></div><button class="btn sm primary" onclick="UI.openPlayoffs()">Tabellone</button></div>` : ''}
      <div class="subnav">${[['cls', 'Classifiche', 'trophy'], ['top', 'Migliori', 'star'], ['rec', 'Record', 'medal'], ['ag', 'Agenzie', 'building'], ['sp', 'Sponsor', 'deal']].map(([k, l, i]) =>
        `<button class="${this.lgSec === k ? 'on' : ''}" onclick="UI.lgSec='${k}';UI.render()">${ic(i)}<span>${l}</span></button>`).join('')}</div>
      ${this.lgSec === 'cls' ? this.lgCls(myTeams) : this.lgSec === 'top' ? this.lgTop() : this.lgSec === 'ag' ? this.lgAg(rk) : this.lgSec === 'sp' ? this.lgSp() : `<div id="t-rec">${this.v_records()}</div>`}`;
  },
  lgSec: 'cls',
  lgCls(myTeams) { return `      <h2>Classifiche ${seasonLabel()}</h2>
      ${S.lastChampion != null && !(S.po && S.po.champ != null && !poOn()) ? `<p class="small muted">Ultimi campioni: <b class="gold">${esc(teamName(S.teams[S.lastChampion]))}</b></p>` : ''}
      <div class="seg lg-seg">${[['E', 'Est'], ['W', 'Ovest'], ['P', 'Power ranking']].map(([k, l]) => `<button class="${this.lgTab === k ? 'on' : ''}" onclick="UI.lgTab='${k}';UI.render()">${l}</button>`).join('')}</div>
      ${this.lgTab === 'P' ? this.v_power(myTeams) : this.v_conf(this.lgTab, myTeams)}
`; },
  lgAg(rk) { return `      <h2>Classifica agenzie (stipendi gestiti)</h2>
      <div class="tbl-wrap"><table><tr><th>#</th><th>Agenzia</th><th class="num">Stipendi</th></tr>
        ${rk.map((r, i) => `<tr class="${r.mine ? 'mine' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td class="num">${fmtM(r.sal)}</td></tr>`).join('')}</table></div>
`; },
  lgSp() { return `      <h2>Rapporti con gli sponsor</h2>
      <p class="small muted">Un buon rapporto porta contratti più ricchi e più probabilità che accettino le tue richieste.</p>
      <div class="rels">${[...BRANDS].sort((a, b) => brandRel(b) - brandRel(a)).map(b => `<span class="rel">${esc(b)} <b>${relLabel(brandRel(b))}</b></span>`).join('')}</div>
`; },
  lgTop() { return `      <h2>Migliori giocatori</h2>
      <div class="tbl-wrap"><table><tr><th>Giocatore</th><th>Squadra</th><th class="num">OVR</th><th>Statistiche</th><th class="num">Stipendio</th></tr>
        ${Object.values(S.players).filter(p => p.team != null && !p.retired).sort((a, b) => playerScore(b) - playerScore(a)).slice(0, 15)
          .map(p => `<tr class="${isClient(p) ? 'mine' : ''}"><td><a class="pname" href="#" onclick="UI.player(${p.id});return false">${avatarSVG(p, 28)}${esc(p.name)}${p.star || p.vip ? ' ' + ic('star', 'in star') : ''}</a></td><td>${teamOf(p).abbr}</td><td class="num">${p.ovr}</td><td>${statLine(p)}</td><td class="num">${fmtM(p.salary)}</td></tr>`).join('')}
      </table></div>
`; },

  /* ---------- Record della lega ---------- */
  recTab: 'game',
  v_records() {
    recInit();
    const R = S.records, tab = this.recTab;
    const mine = clients().filter(p => !p.retired);
    const tuo = pid => pid != null && S.players[pid] && isClient(S.players[pid]) ? ' <span class="tag fa">tuo</span>' : '';
    let body = '';
    if (tab === 'po') {
      const P = poRecInit();
      body = `<div class="grid">${['pts', 'reb', 'ast'].map(k => {
        const r = P.game[k], era = P.era[k];
        const myv = mine.map(p => ({ name: p.name, v: (p.hi || {})[k] || 0 })).sort((a, b) => b.v - a.v)[0];
        return `<div class="card rec-card"><h3>${REC_LABEL[k]} in una partita di playoff</h3>
          <div class="rec-main"><b class="gold">${r.v}</b><span><b>${esc(r.name)}</b>${tuo(r.pid)}<small>${esc(r.team || '')} · ${esc(r.season)}</small></span></div>
          <p class="small muted">Migliore dal 2026: ${era ? `<b>${era.v}</b>, ${esc(era.name)}${tuo(era.pid)} (${esc(era.season)})` : 'ancora nessuno'}</p></div>`;
      }).join('')}</div>`;
    } else if (tab === 'game' || tab === 'season') {
      const keys = tab === 'game' ? ['pts', 'reb', 'ast'] : ['ppg', 'rpg', 'apg'];
      body = `<div class="grid">${keys.map(k => {
        const r = R[tab][k], era = R.era[tab][k];
        const myv = mine.map(p => ({ name: p.name, v: tab === 'game' ? ((p.hi || {})[k] || 0) : (p.gp >= 10 ? r1(p[{ ppg: 'pts', rpg: 'reb', apg: 'ast' }[k]] / p.gp) : 0) })).sort((a, b) => b.v - a.v)[0];
        const pct = myv ? Math.min(100, Math.round(myv.v / r.v * 100)) : 0;
        return `<div class="card rec-card"><h3>${REC_LABEL[k]} ${tab === 'game' ? 'in una partita' : 'in una stagione'}</h3>
          <div class="rec-main"><b class="gold">${r.v}</b><span><b>${esc(r.name)}</b>${tuo(r.pid)}<small>${esc(r.team || '')} · ${esc(r.season)}</small></span></div>
          <p class="small muted">Migliore dal 2026: ${era ? `<b>${era.v}</b>, ${esc(era.name)}${tuo(era.pid)} (${esc(era.season)})` : 'ancora nessuno'}</p>
          ${myv && myv.v ? `<div class="small">Il tuo migliore: <b>${esc(myv.name)}</b>, ${myv.v} <span class="muted">(${pct}% del record di sempre)</span><div class="bar"><i style="width:${pct}%;background:var(--accent)"></i></div></div>` : ''}</div>`;
      }).join('')}</div>
        <p class="small muted">${tab === 'game' ? '"Il tuo migliore" è il massimo in carriera di un tuo cliente in una partita.' : 'Per la stagione servono almeno 40 partite; "il tuo migliore" è la media attuale di un tuo cliente (almeno 10 gare).'}</p>`;
    } else {
      const keys = tab === 'career' ? ['pts', 'reb', 'ast', 'gp'] : ['titles', 'mvp', 'allstar'];
      body = `<div class="grid">${keys.map(k => {
        const board = careerBoard(k), top = board[0];
        const myBest = mine.map(p => ({ name: p.name, v: careerStat(p, k) })).sort((a, b) => b.v - a.v)[0];
        const pct = myBest && top ? Math.min(100, Math.round(myBest.v / top.v * 100)) : 0;
        return `<div class="card rec-card"><h3>${REC_LABEL[k]} in carriera</h3>
          ${myBest && myBest.v ? `<div class="small">Il tuo migliore: <b>${esc(myBest.name)}</b>, ${myBest.v.toLocaleString('it-IT')} <span class="muted">(${pct}% del record)</span><div class="bar"><i style="width:${pct}%;background:var(--accent)"></i></div></div>` : ''}
          <ol class="rec-list">${board.map(x => { const pl = x.pid != null ? S.players[x.pid] : null, cl = pl && isClient(pl);
            return `<li class="${cl ? 'mine' : ''}"><span>${esc(x.name)}${cl ? ' <span class="tag fa">tuo</span>' : ''}${x.active ? ' <small class="good">in attività</small>' : ` <small class="muted">ritirato ${esc(x.until || '')}</small>`}</span><b>${x.v.toLocaleString('it-IT')}</b></li>`; }).join('')}</ol></div>`;
      }).join('')}</div>`;
    }
    return `<h2>Record della lega</h2>
      <p class="small muted">Sono i record veri della storia NBA, con i nomi del gioco. Le classifiche di carriera mettono insieme le leggende del passato e chi gioca oggi: i tuoi clienti possono scalarle stagione dopo stagione.</p>
      <div class="filters"><div class="seg">${[['game', 'Partita'], ['season', 'Stagione'], ['po', 'Playoff'], ['career', 'Carriera'], ['awards', 'Premi']].map(([k, l]) =>
        `<button class="${tab === k ? 'on' : ''}" onclick="UI.recTab='${k}';UI.tab='league';UI.render();document.getElementById('t-rec').scrollIntoView()">${l}</button>`).join('')}</div></div>
      ${body}`;
  },



  /* ---------- Staff ---------- */
  v_staff() {
    const net = weeklyIncomeEstimate() - weeklyCost() - loanRate();
    const sec = this.stSec || 'str';
    return `<div class="subnav three">${[['str', 'Strutture', 'building'], ['bank', 'Banca', 'coin'], ['inv', 'Investimenti', 'chart']].map(([k, l, i]) =>
        `<button class="${sec === k ? 'on' : ''}" onclick="UI.stSec='${k}';UI.render()">${ic(i)}<span>${l}</span></button>`).join('')}</div>
      ${sec === 'str' ? `<h2>Staff e strutture</h2>
      <p class="muted small">Costi fissi attuali: <b>${fmt$(weeklyCost())}</b> a settimana · entrate medie sull'anno <b>${fmt$(weeklyIncomeEstimate())}</b> a settimana (in stagione regolare ${fmt$(weeklyIncomeIn('reg'))}, fuori stagione ${fmt$(weeklyIncomeIn('fa'))}) · saldo medio <b class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${fmt$(net)}</b>. Ogni livello aumenta le spese settimanali.</p>
      ${net < 0 ? '<div class="note warn">⚠️ Stai spendendo più di quanto incassi: prima di potenziare, trova nuovi clienti o firma contratti più ricchi.</div>' : ''}
      <div class="grid">${Object.entries(STAFF).map(([k, s]) => {
        const lvl = S.staff[k] || 0, cost = upgradeCost(lvl, k);
        return `<div class="card"><h3>${s.icon} ${s.name}</h3><div class="muted small">${s.desc}</div>
          <p>${k === 'informer' ? `<b>${INFORMER_LV[lvl]}</b>` : `Livello <b>${lvl}</b> / 5`} ${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</p>
          ${lvl < 5 && net - staffStep(k) < 0 ? `<p class="small bad">Con questo livello andresti in perdita di ${fmt$(staffStep(k) - net)} a settimana.</p>` : ''}
          ${lvl < 5 && S.rep < staffRepReq(k) ? `<p class="small warn">${ic('lock', 'in')} Per il livello ${lvl + 1} serve una reputazione di almeno ${staffRepReq(k)} (tu hai ${Math.round(S.rep)}): ${STAFF_WHY[k]}.</p>` : ''}
          ${lvl < 5 ? `<button class="btn primary sm" onclick="UI.upgrade('${k}')" ${S.cash < cost || S.rep < staffRepReq(k) ? 'disabled' : ''}>${k === 'informer' && !lvl ? 'Assumi' : k === 'center' && !lvl ? 'Costruiscilo' : 'Potenzia'} (${fmt$(cost)})</button>` : '<span class="good">Al massimo!</span>'}</div>`;
      }).join('')}</div>
` : sec === 'bank' ? `      <h2>Banca</h2>
      <div class="card bank">${S.loan ? `<p>Prestito di <b>${fmt$(S.loan.amount)}</b> al ${S.loan.rate}% l'anno. Rata <b>${fmt$(S.loan.perWeek)}</b> a settimana. Debito che resta: <b>${fmt$((fixLoan(), S.loan.balance))}</b>.</p>
        <button class="btn sm" onclick="UI.doRepayLoan()" ${S.cash < loanPayoff() ? 'disabled' : ''}>Chiudilo subito (${fmt$(loanPayoff())})</button>`
        : `<p class="muted small">La banca ti può prestare fino a <b>${fmt$(loanOffer().max)}</b>, da restituire a rate in qualche stagione. Più sei famoso, meno interessi paghi.</p>
        <button class="btn sm" onclick="UI.loanModal()">Chiedi un prestito</button>`}</div>
` : `      <h2>Investimenti</h2>
      <p class="muted small">Quando l'agenzia è grande, i soldi servono a crescere ancora. Ogni 5% di una squadra rende il 4% l'anno in dividendi, migliora il rapporto con lei e le sue offerte ai tuoi clienti. Con il 51% diventi presidente. Con il 100% la squadra è tua: decidi tu chi ci gioca, ma le altre squadre e le agenzie rivali parlano di conflitto d'interessi.</p>
      ${Object.keys(S.stakes || {}).length ? `<div class="rels">${Object.entries(S.stakes).map(([tid, pct]) => `<span class="rel">${esc(teamName(S.teams[tid]))} <b>${pct}%</b></span>`).join('')}</div>` : ''}
      <div class="lev-row" style="margin:10px 0">
        <select id="stake-team" aria-label="Squadra">${[...S.teams].sort((a, b) => stakePrice(a) - stakePrice(b)).map(t => `<option value="${t.id}">${esc(teamName(t))} · 5% a ${fmt$(stakePrice(t))}${stakeOf(t.id) ? ` (hai il ${stakeOf(t.id)}%)` : ''}</option>`).join('')}</select>
        <button class="btn primary sm" onclick="UI.doStake()">Compra il 5%</button>
      </div>
      <div class="card"><h3>Fondazione benefica</h3><div class="muted small">Dona $1M una volta a stagione: +3 reputazione e un rapporto migliore con tutti gli sponsor.</div>
        <div class="actions"><button class="btn sm" onclick="UI.doDonate()" ${S.donated === S.season || S.cash < 1e6 ? 'disabled' : ''}>Dona $1M</button></div></div>`}`;
  },
  doStake() { const r = buyStake(+document.getElementById('stake-team').value); save(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Investimento!' : undefined); },
  doDonate() { const r = donate(); save(); this.render(); toast(r.msg, r.type); },
  upgrade(k) {
    const cost = upgradeCost(S.staff[k] || 0, k);
    if (S.rep < staffRepReq(k)) return toast(`Serve una reputazione di almeno ${staffRepReq(k)}: ${STAFF_WHY[k]}.`, 'bad', 'Troppo presto');
    if (S.cash < cost) return toast('Fondi insufficienti.', 'bad');
    spend(cost); S.staff[k] = (S.staff[k] || 0) + 1;
    toast(k === 'informer' ? (S.staff[k] === 1 ? 'Hai assunto un informatore. È ancora scarso, ma ti passerà le prime soffiate.' : `Il tuo informatore ora è: ${INFORMER_LV[S.staff[k]]}.`) : `${STAFF[k].name}: livello ${S.staff[k]}.`, 'good', 'Upgrade!');
    addNews(`🔧 ${STAFF[k].name} potenziato al livello ${S.staff[k]}.`);
    save(); this.render();
  },

  /* ---------- Modale ---------- */
  openModal(html) { hideToast(); document.getElementById('modal-body').innerHTML = deEmo(html); document.getElementById('modal').classList.remove('hidden'); },
  closeModal() { document.getElementById('modal').classList.add('hidden'); },
  loanModal() {
    if (S.loan) return toast('Hai già un prestito in corso.', 'bad');
    const { max, rate } = loanOffer();
    const need = Math.max(50, Math.ceil((-S.cash + weeklyCost() * 6) / 50000) * 50);
    const v = Math.min(max / 1000, need);
    this.openModal(`<h3>Prestito dalla banca</h3>
      <p class="small">Con la tua reputazione la banca ti presta fino a <b>${fmt$(max)}</b> al <b>${rate}%</b> l'anno. Lo restituisci a rate ogni settimana e puoi chiuderlo prima quando vuoi.</p>
      <div class="neg-form">
        <div class="lbl">Quanto chiedi${stepper('loan-a', v, 50, 50, max / 1000, 'k')}</div>
        <label>In quante stagioni lo restituisci<select id="loan-y" onchange="UI.loanCalc()">${[2, 3, 4, 5].map(y => `<option value="${y}" ${y === 3 ? 'selected' : ''}>${y} stagioni</option>`).join('')}</select></label>
      </div>
      <p class="loan-sum" id="loan-sum"></p>
      <div class="actions"><button class="btn primary" onclick="UI.doLoan()">Firma il prestito</button><button class="btn" onclick="UI.closeModal()">Lascia stare</button></div>`);
    document.getElementById('loan-a').addEventListener('input', () => this.loanCalc());
    this.loanCalc();
  },
  loanCalc() {
    const a = (+document.getElementById('loan-a').value || 0) * 1000, y = +document.getElementById('loan-y').value;
    const pl = loanPlan(a, y), el = document.getElementById('loan-sum');
    if (el) el.innerHTML = `Rata: <b>${fmt$(pl.perWeek)}</b> a settimana per ${y} stagioni. In tutto restituisci <b>${fmt$(pl.total)}</b>, di cui ${fmt$(pl.total - a)} di interessi.`;
  },
  doLoan() {
    const r = takeLoan((+document.getElementById('loan-a').value || 0) * 1000, +document.getElementById('loan-y').value);
    save(); this.closeModal(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Prestito firmato' : undefined);
  },
  doRepayLoan() { const r = repayLoan(); save(); this.render(); if (r) toast(r.msg, r.type); },
  gameOver() {
    this.openModal(`<h3>Licenza revocata</h3><p>La tua agenzia è rimasta in rosso troppo a lungo.</p>
      <p>Hai resistito fino alla stagione ${seasonLabel()} con reputazione ${S.rep.toFixed(1)} e ${Object.keys(S.goals).length} obiettivi raggiunti.</p>
      <div class="actions"><button class="btn primary" onclick="UI.reset(true)">Nuova carriera</button></div>`);
  },
  reset(force) {
    if (!force) return this.ask('Cancellare la partita e ricominciare da capo?', 'Cancella', () => this.reset(true));
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignora */ }
    Cloud.clear();
    S = null; this.closeModal(); this.render();
  },
};

document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') UI.closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') UI.closeModal(); });

/* ================================================================== */
/* Tutorial con Coach Gigi                                             */
/* ================================================================== */
/* ---------- Playoff: tabellone, partite in diretta, campioni ---------- */
const txtOn = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return r * .3 + g * .59 + b * .11 > 150 ? '#111' : '#fff'; };
const teamChip = (tid, big) => { const t = S.teams[tid]; return `<span class="po-chip${big ? ' big' : ''}" style="background:${t.color};color:${txtOn(t.color)};border-color:${t.color2}">${t.abbr}</span>`; };
const PO_SPEED = [['Lenta', 1.6], ['Normale', 0.75], ['Veloce', 0.2]]; // secondi veri per ogni minuto di partita
const SHOT_TXT = { 3: ['Tripla di {N}', 'Tripla di {N} dall\'angolo', 'Bomba di {N} da nove metri'], 2: ['Canestro di {N}', 'Entrata di {N}', 'Arresto e tiro di {N}', 'Schiacciata di {N}', 'Tiro dalla media di {N}'], 2.5: ['Gancio di {N}', 'Schiacciata di {N}', 'Canestro da sotto di {N}', 'Tap-in di {N}'], 1: ['Tiro libero di {N}'] };
Object.assign(UI, {
  poSide: null, poSpeed: 1, poLast: null,
  openPlayoffs() {
    if (S.phase === 'po' && (!S.po || S.po.season !== seasonLabel())) { poInit(); save(); }
    if (!S.po) return;
    if (!this.poSide) { const my = myTeamIds(); this.poSide = [...my].some(id => confOf(S.teams[id]) === 'W') && ![...my].some(id => confOf(S.teams[id]) === 'E') ? 'W' : 'E'; }
    let box = document.getElementById('poview');
    if (!box) { box = document.createElement('div'); box.id = 'poview'; document.body.appendChild(box); }
    box.hidden = false; document.body.classList.add('po-open');
    hideToast();
    this.poDraw();
  },
  poClose() {
    clearInterval(this.poTimer); this.poTimer = null;
    const box = document.getElementById('poview'); if (box) box.hidden = true;
    document.body.classList.remove('po-open');
    this.render();
  },
  poSeed(tid, s) { const v = s && s.round < 2 && S.po.seed0 ? S.po.seed0[tid] : S.po.seeds[tid]; return v || ''; },
  poSeries(s, ph) {
    if (!s) return `<div class="po-s empty">${ph || '<div class="po-t"><b>da definire</b></div>'}</div>`;
    const my = myTeamIds();
    const row = (tid, wins) => `<div class="po-t ${s.w === tid ? 'w' : s.w != null ? 'l' : ''} ${my.has(tid) ? 'mine' : ''}">
      <span class="sd">${this.poSeed(tid, s)}</span><b>${S.teams[tid].abbr}</b>${my.has(tid) ? '<i class="po-dot"></i>' : ''}<span class="wn">${s.bo === 1 ? (s.g[0] ? (tid === s.g[0].h ? s.g[0].hs : s.g[0].as) : '') : wins}</span></div>`;
    const g7 = s.g.length === 7 || isGame7(s);
    return `<div class="po-s ${my.has(s.a) || my.has(s.b) ? 'mine' : ''}">${g7 ? '<span class="po-g7">Gara 7</span>' : ''}${row(s.a, s.wa)}${row(s.b, s.wb)}</div>`;
  },
  poBracket(c) {
    const po = S.po, by = (r, slot) => po.series.find(s => s.conf === c && s.round === r && s.slot === slot);
    const col = (r, n, name) => `<div class="po-col"><div class="po-ch">${name}</div><div class="po-cb">${Array.from({ length: n }, (_, i) => this.poSeries(by(r, i))).join('')}</div></div>`;
    const pin = po.series.filter(s => s.conf === c && s.round < 2);
    return `<div class="po-pin"><div class="po-ch">Play-in</div><div class="po-pin-l">${pin.map(s => this.poSeries(s)).join('')}</div></div>
      <div class="po-br">${col(2, 4, 'Primo turno')}${col(3, 2, 'Semifinali')}${col(4, 1, 'Finale ' + CONF_NAME[c])}</div>`;
  },
  poGameTxt(G) {
    const hw = G.hs > G.as;
    return `${teamChip(G.h)} <b class="${hw ? '' : 'muted'}">${G.hs}</b> - <b class="${hw ? 'muted' : ''}">${G.as}</b> ${teamChip(G.a)}${G.ot ? ` <small class="muted">${G.ot > 1 ? G.ot + ' supplementari' : 'dopo un supplementare'}</small>` : ''}`;
  },
  poStatus(s) {
    const A = S.teams[s.a].abbr, B = S.teams[s.b].abbr;
    if (s.bo === 1) return s.w != null ? `vince ${S.teams[s.w].abbr}` : '';
    if (s.w != null) return `${S.teams[s.w].abbr} vince ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}`;
    if (s.wa === s.wb) return s.wa ? `serie pari ${s.wa}-${s.wb}` : 'si comincia';
    return `${s.wa > s.wb ? A : B} avanti ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}`;
  },
  // righe dei tuoi clienti in una partita
  poMine(G) {
    const out = [];
    for (const side of ['h', 'a']) for (const l of G.box[side]) {
      const p = S.players[l.pid]; if (!isClient(p)) continue;
      out.push(`<div class="po-me">${avatarSVG(p, 30)}<span><b>${esc(p.name)}</b><small>${l.min}' · ${l.pts} pt · ${l.reb} rb · ${l.ast} as</small></span><span class="grade ${gradeClass(l.grade)}">${l.grade}</span></div>`);
    }
    return out.join('');
  },
  poNotes(G) { return (G.notes || []).map(n => `<div class="po-note ${n.gold ? 'gold' : n.mine ? 'mine' : ''}">${ic(n.gold ? 'trophy' : 'star')}<span>${esc(n.t)}</span></div>`).join(''); },
  poDraw() {
    const po = S.po, box = document.getElementById('poview'); if (!box) return;
    clearInterval(this.poTimer); this.poTimer = null;
    const live = S.phase === 'po' && po.season === seasonLabel() && po.champ == null;
    let top = '';
    if (po.champ != null) {
      const fin = po.series.find(s => s.round === 5), ct = S.teams[po.champ], mvp = po.fmvp && S.players[po.fmvp.pid];
      const rings = clients().filter(p => p.team === po.champ);
      top = `<div class="po-champ" style="--tc:${ct.color};--tc2:${ct.color2}">
        <div class="po-cup">${ic('trophy')}</div><small>Campioni ${esc(po.season)}</small><h2>${esc(teamName(ct))}</h2>
        <p>Finali vinte ${Math.max(fin.wa, fin.wb)}-${Math.min(fin.wa, fin.wb)} contro i ${esc(teamName(S.teams[poLoser(fin)]))}${fin.g.length === 7 ? ', a gara 7' : ''}.</p>
        ${mvp ? `<p class="small">MVP delle Finali: <b>${esc(mvp.name)}</b>${isClient(mvp) ? ' <span class="tag fa">tuo</span>' : ''} · ${po.fmvp.line}</p>` : ''}
        ${rings.length ? `<p class="po-ring">${ic('ring')} ${rings.map(p => `<b>${esc(p.name)}</b>`).join(', ')} ${rings.length > 1 ? 'vincono' : 'vince'} l'anello!</p>` : ''}
        ${S.phase === 'po' ? `<button class="btn primary big" onclick="UI.poClose();advance()">Continua la stagione ▶</button>` : ''}</div>`;
    } else if (live) {
      const act = poActive(), my = myTeamIds(), feat = poFeatured();
      const games = act.map(s => {
        const h = poHome(s), mine = my.has(s.a) || my.has(s.b);
        return `<div class="po-game ${mine ? 'mine' : ''} ${isGame7(s) ? 'g7' : ''}">
          <div class="po-gl">${teamChip(s.a)}<span class="sd">${this.poSeed(s.a)}</span>${s.bo === 1 ? '<span class="muted">contro</span>' : `<b>${poWins(s, s.a)}</b><span class="muted">-</span><b>${poWins(s, s.b)}</b>`}<span class="sd">${this.poSeed(s.b)}</span>${teamChip(s.b)}</div>
          <div class="po-gm">${isGame7(s) ? '<span class="po-g7">Gara 7</span> ' : ''}${s.bo === 1 ? 'Partita secca' : 'Gara ' + (s.g.length + 1)} a ${esc(S.teams[h].city)}${s.bo === 1 ? (s.round === 0 ? (s.slot === 0 ? ' · chi vince è settimo' : ' · chi perde è fuori') : ' · in palio l\'ottavo posto') : ' · ' + this.poStatus(s)}</div>
          <button class="btn sm ${mine ? 'primary' : ''}" onclick="UI.poWatch(${s.id})">${ic('play')} Guarda</button></div>`;
      }).join('');
      top = `<div class="po-acts">
          <button class="btn primary big" onclick="UI.poWatch(${feat.id})">${ic('play')} Guarda ${S.teams[feat.a].abbr}-${S.teams[feat.b].abbr}${isGame7(feat) ? ', gara 7' : ''}</button>
          <div class="po-acts2"><button class="btn" onclick="UI.poSim('day')">Simula la giornata</button><button class="btn" onclick="UI.poSim('round')">Simula il turno</button></div>
          <button class="btn sm po-skip" onclick="UI.poSim('all')">Salta fino al campione</button></div>
        <div class="po-today"><div class="po-ch">Si gioca oggi</div>${games}</div>`;
    }
    const last = this.poLast && this.poLast.po === po ? this.poLast : null;
    const lastHtml = last && last.games.length ? `<div class="po-last"><div class="po-ch">${last.title}</div>
      ${last.games.map(G => `<div class="po-res ${G.mine ? 'mine' : ''}"><div class="po-rl">${G.g7 ? '<span class="po-g7">Gara 7</span>' : ''}${this.poGameTxt(G)}</div>
        <small class="muted">${G.result ? `<b class="gold">${esc(G.result)}</b>` : `${po.series[G.sid].bo === 1 ? 'Play-in' : 'Gara ' + G.n} · ${G.st}`}</small>${this.poMine(G)}${this.poNotes(G)}</div>`).join('')}</div>` : '';
    const side = this.poSide;
    const fin = po.series.find(s => s.round === 5);
    box.innerHTML = deEmo(`<div class="po-panel" role="dialog" aria-label="Playoff">
      <div class="po-head"><div><div class="po-title">Playoff ${esc(po.season)}</div>
        <small>${po.champ != null ? 'Si è chiusa la stagione' : PO_ROUNDS[po.round] + (po.round >= 2 ? ' · al meglio delle 7 partite' : ' · partita secca')}</small></div>
        <button class="btn help" onclick="UI.poClose()" aria-label="Chiudi">${ic('x')}</button></div>
      ${top}${lastHtml}
      <div class="po-ch">Tabellone</div>
      <div class="seg po-seg">${['E', 'W'].map(c => `<button class="${side === c ? 'on' : ''}" onclick="UI.poSide='${c}';UI.poDraw()">${CONF_NAME[c]}</button>`).join('')}</div>
      ${this.poBracket(side)}
      <div class="po-fin"><div class="po-ch">Finali</div>${this.poSeries(fin, '<div class="po-t"><b>Est</b></div><div class="po-t"><b>Ovest</b></div>')}</div>
      <p class="small muted po-legend"><i class="po-dot"></i> squadre con tuoi clienti</p></div>`);
    box.scrollTop = 0;
  },
  poSim(what) {
    const po = S.po, before = po.series.filter(s => s.w != null).length, games = [];
    const keep = G => { G.mine = [G.h, G.a].some(id => myTeamIds().has(id)); games.push(G); };
    const day = () => { for (const s of poActive()) keep(poPlay(s)); po.day++; if (!poActive().length) poNextRound(); };
    if (what === 'day') day();
    else if (what === 'round') { const r = po.round; while (po.champ == null && po.round === r) day(); }
    else while (po.champ == null) day();
    save();
    // dopo una giornata si vede tutto; dopo un turno solo record, gare 7 e serie finite con i tuoi
    const shown = what === 'day' ? games : games.filter(G => (G.notes || []).some(n => n.gold || n.mine) || (G.result && (G.mine || G.g7 || po.series[G.sid].round >= 4)));
    this.poLast = { po, title: what === 'day' ? 'Risultati di oggi' : 'Com\'è andata', games: shown.slice(-14) };
    this.poDraw();
  },
  /* partita in diretta */
  poWatch(sid) {
    const po = S.po, s = po.series[sid];
    if (!s || s.w != null) return;
    const g7 = isGame7(s), round = s.round, n = s.g.length + 1;
    const pre = s.bo === 1 ? (s.round === 0 && s.slot === 0 ? 'Partita secca per il settimo posto' : 'Partita secca, chi perde va in vacanza') : `Gara ${n} · ${this.poStatus(s)}`;
    const G = poPlay(s);
    // le altre partite del giorno si giocano in contemporanea
    const others = [];
    for (const x of poActive()) others.push(poPlay(x));
    po.day++;
    if (!poActive().length) poNextRound();
    save();
    G.mine = true;
    this.poLast = { po, title: 'Risultati di oggi', games: [G, ...others.map(o => (o.mine = [o.h, o.a].some(id => myTeamIds().has(id)), o))] };
    const pbp = playByPlay(G);
    const my = new Set(clients().map(p => p.id));
    const inBox = [...G.box.h, ...G.box.a];
    let follow = inBox.filter(l => my.has(l.pid)).map(l => l.pid);
    if (!follow.length) follow = ['h', 'a'].map(sd => [...G.box[sd]].sort((x, y) => S.players[y.pid].ovr - S.players[x.pid].ovr)[0].pid);
    const L = { t: 0, i: 0, hs: 0, as: 0, feed: [], st: {}, done: false, marks: {} };
    for (const l of inBox) L.st[l.pid] = { pts: 0, reb: 0, ast: 0 };
    const nm = pid => { const p = S.players[pid]; return `<b class="${my.has(pid) ? 'me' : ''}">${esc(p.name)}</b>`; };
    const clockTxt = t => {
      const reg = 4 * PER, per = t < reg ? Math.min(3, Math.floor(t / PER)) : Math.floor((t - reg) / OTL);
      const len = t < reg ? PER : OTL, into = t < reg ? t - per * PER : t - reg - per * OTL, left = Math.max(0, Math.ceil(len - into));
      return [t < reg ? `${per + 1}° quarto` : per ? `${per + 1}° suppl.` : 'Supplementare', `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`];
    };
    const perEnds = []; for (let k = 1; k <= 4 + G.ot; k++) perEnds.push(k <= 4 ? k * PER : 4 * PER + (k - 4) * OTL);
    let pe = 0;
    const box = document.getElementById('poview');
    const hT = S.teams[G.h], aT = S.teams[G.a];
    box.innerHTML = deEmo(`<div class="po-panel po-livep" role="dialog" aria-label="Partita in diretta">
      <div class="po-head"><div><div class="po-title">${PO_ROUNDS[round]}</div><small>${pre}</small></div>${g7 ? '<span class="po-g7 big">Gara 7</span>' : ''}</div>
      <div class="po-board">
        <div class="po-tm">${teamChip(G.h, true)}<small>${esc(hT.name)}</small></div>
        <div class="po-sc"><b id="pl-hs">0</b><span>-</span><b id="pl-as">0</b><small id="pl-clk"></small></div>
        <div class="po-tm">${teamChip(G.a, true)}<small>${esc(aT.name)}</small></div></div>
      <div class="po-follow" id="pl-fol"></div>
      <div class="po-feed" id="pl-feed" aria-live="off"></div>
      <div class="po-ctl" id="pl-ctl"><div class="seg">${PO_SPEED.map(([l], i) => `<button data-sp="${i}" class="${this.poSpeed === i ? 'on' : ''}">${l}</button>`).join('')}</div>
        <button class="btn sm" id="pl-end">Vai alla fine</button></div>
      <div id="pl-final"></div></div>`);
    box.scrollTop = 0;
    const $ = id => document.getElementById(id);
    const drawFollow = () => {
      $('pl-fol').innerHTML = deEmo(follow.map(pid => {
        const p = S.players[pid], st = L.st[pid], l = inBox.find(x => x.pid === pid);
        return `<div class="po-me ${my.has(pid) ? '' : 'other'}">${avatarSVG(p, 30)}<span><b>${esc(p.name)}</b><small>${Math.round(l.min * Math.min(1, L.t / pbp.end))}' in campo · ${S.teams[p.team] ? S.teams[p.team].abbr : ''}</small></span>
          <span class="po-stat"><b>${st.pts}</b> pt <b>${st.reb}</b> rb <b>${st.ast}</b> as</span></div>`;
      }).join(''));
    };
    const push = (html, cls = '') => {
      const [q, c] = clockTxt(L.t);
      const f = $('pl-feed');
      f.insertAdjacentHTML('afterbegin', deEmo(`<div class="po-ev ${cls}"><small>${q.replace(' quarto', 'Q').replace('° ', '°')} ${c}</small><span>${html}</span></div>`));
      while (f.children.length > 9) f.lastElementChild.remove();
    };
    const step = until => {
      while (L.i < pbp.ev.length && pbp.ev[L.i].t <= until) {
        while (pe < perEnds.length - 1 && perEnds[pe] <= pbp.ev[L.i].t) { L.t = perEnds[pe] - 0.01; push(`Fine del ${pe < 4 ? ['primo', 'secondo', 'terzo', 'quarto'][pe] + ' quarto' : 'supplementare'}: <b>${hT.abbr} ${L.hs} - ${L.as} ${aT.abbr}</b>${pe === 3 && L.hs === L.as ? '. Si va al supplementare!' : ''}`, 'q'); pe++; }
        const e = pbp.ev[L.i++]; L.t = e.t;
        if (e.reb) { L.st[e.pid].reb++; if (follow.includes(e.pid)) push(`Rimbalzo di ${nm(e.pid)}`, my.has(e.pid) ? 'me' : ''); continue; }
        if (e.side === 'h') L.hs += e.v; else L.as += e.v;
        L.st[e.pid].pts += e.v;
        if (e.ast) L.st[e.ast].ast++;
        const p = S.players[e.pid];
        const pool = e.v === 2 && (p.pos === 'C' || p.pos === 'PF') ? SHOT_TXT[2.5] : SHOT_TXT[e.v];
        const big = follow.includes(e.pid) || follow.includes(e.ast) || e.v === 3 || chance(0.35);
        if (big) push(`${pick(pool).replace('{N}', nm(e.pid))}${e.ast ? `, assist di ${nm(e.ast)}` : ''} · <b>${L.hs}-${L.as}</b>`, my.has(e.pid) || my.has(e.ast) ? 'me' : '');
        const pts = L.st[e.pid].pts;
        for (const m of [20, 30, 40, 50, 60]) if (pts >= m && !L.marks[e.pid + ':' + m] && (m >= 30 || my.has(e.pid))) {
          L.marks[e.pid + ':' + m] = 1; push(`${nm(e.pid)} arriva a <b>${m} punti</b>!`, 'gold');
        }
      }
      L.t = Math.max(L.t, until);
    };
    const paint = () => {
      $('pl-hs').textContent = L.hs; $('pl-as').textContent = L.as;
      const [q, c] = clockTxt(Math.min(L.t, pbp.end - 0.01));
      $('pl-clk').textContent = L.done ? (G.ot ? 'Finale dopo ' + (G.ot > 1 ? G.ot + ' supplementari' : 'il supplementare') : 'Finale') : `${q} · ${c}`;
      drawFollow();
    };
    const finish = () => {
      clearInterval(this.poTimer); this.poTimer = null;
      step(pbp.end + 1); L.t = pbp.end; L.done = true;
      L.hs = G.hs; L.as = G.as;
      push(`<b>Finale: ${hT.abbr} ${G.hs} - ${G.as} ${aT.abbr}</b>`, 'q');
      paint();
      $('pl-ctl').hidden = true;
      const top = sd => [...G.box[sd]].sort((x, y) => y.pts - x.pts)[0];
      const s2 = po.series[sid];
      $('pl-final').innerHTML = deEmo(`<div class="po-endc">
        ${G.result ? `<div class="po-sres">${ic('trophy')} <b>${esc(G.result)}</b></div>` : `<div class="po-sres small">${this.poStatus(s2)}</div>`}
        ${this.poNotes(G)}
        <div class="po-ch">Migliori in campo</div>
        ${['h', 'a'].map(sd => { const l = top(sd), p = S.players[l.pid]; return `<div class="po-top">${teamChip(G[sd])} <b>${esc(p.name)}</b> <span class="muted">${l.pts} pt · ${l.reb} rb · ${l.ast} as</span></div>`; }).join('')}
        ${this.poMine(G) ? `<div class="po-ch">I tuoi clienti</div>${this.poMine(G)}` : ''}
        <button class="btn primary big" onclick="UI.poDraw()">Torna al tabellone</button></div>`);
      $('pl-final').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { this.poSpeed = +b.dataset.sp; box.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); });
    $('pl-end').onclick = finish;
    const TICK = 100;
    paint();
    this.poTimer = setInterval(() => {
      if (box.hidden) return finish();
      const adv = 60 / (PO_SPEED[this.poSpeed][1] * 1000 / TICK);
      step(L.t + adv);
      if (L.t >= pbp.end) return finish();
      paint();
    }, TICK);
  },
});

/* ---------- Scambi ---------- */
const needChips = (tid, hl) => {
  const n = teamNeeds(tid).filter(x => x.lvl);
  return n.length ? n.map(x => `<span class="need l${x.lvl} ${x.pos === hl ? 'hl' : ''}">${POS_NAME[x.pos]}</span>`).join('') : '<span class="need l0">rosa completa</span>';
};
Object.assign(UI, {
  tradeModal(pid, tid = null) {
    const p = P(pid), why = tradeBlock(p);
    const head = `<div class="tk-head">${avatarSVG(p, 56)}<div><h3>Scambio per ${esc(p.name)}</h3><p class="muted small">${POS_NAME[p.pos]} · ${p.age} anni · OVR ${p.ovr} · ${fmtM(p.salary)} per ${p.years} ann${p.years > 1 ? 'i' : 'o'} · ${esc(teamOf(p).name)}</p></div></div>`;
    if (tid == null) {
      const rows = S.teams.filter(t => t.id !== p.team).map(t => {
        const n = needOf(t.id, p.pos), best = tradeCands(p, t.id)[0];
        return { t, n, c: best ? best.c : 0, role: roleLabel(depthChart(t.id, true, p).get(p.id), p) };
      }).sort((x, y) => y.n.lvl - x.n.lvl || y.c - x.c);
      return this.openModal(`${head}
        <p class="small">Scegli la squadra a cui proporlo. Accanto vedi i ruoli in cui hanno più bisogno: se cercano proprio ${POS_ART[p.pos]}, ti ascoltano più volentieri.</p>
        <p class="small muted">Dopo ${TRADE_EVAL} settimane le due squadre giudicano lo scambio. Chi ci ha guadagnato ti manda un premio (fino a ${fmt$(tradeFee(p))} per un giocatore come lui) e si fida di più di te; chi ci ha perso se lo ricorda. Se dicono di no, il rapporto cala un po'.</p>
        ${why ? `<p class="warn">${esc(why)}</p>` : ''}
        <div class="tr-list">${rows.map(({ t, c, role }) => `<div class="rec tr-team">
          <span class="rec-t"><b>${esc(teamName(t))}</b><span class="needs">${needChips(t.id, p.pos)}</span><small>Da loro sarebbe: ${role} · rapporto ${relLabel(teamRel(t.id))}</small></span>
          <span class="rec-c ${c > .5 ? 'good' : c > .25 ? 'warn' : 'bad'}">${c ? Math.round(c * 100) + '%' : '-'}</span>
          <button class="btn sm primary" onclick="UI.tradeModal(${pid}, ${t.id})" ${why || !c ? 'disabled' : ''}>Scegli</button></div>`).join('')}</div>`);
    }
    const t = S.teams[tid], fit = teamFit(p, tid, p.salary), cands = tradeCands(p, tid);
    const A = teamOf(p);
    this.openModal(`${head}
      <p class="small"><b>${esc(teamName(t))}</b> · cercano: ${needChips(tid, p.pos)}</p>
      <p class="small">Da loro sarebbe <b>${roleTxt(p, tid)}</b>. ${prefOf(p) === 'minuti' ? `Lui vuole giocare tanto, e ${fit[0] > 0.2 ? 'qui lo farebbe' : fit[0] < -0.2 ? 'qui giocherebbe poco' : 'qui avrebbe il suo spazio'}` : `A lui ${fit[0] > 0.2 ? 'piace' : fit[0] < -0.2 ? 'non piace' : 'va bene'}: ${esc(fit[1])}`}.</p>
      <p class="small muted">Scegli chi chiedere in cambio. I ${esc(A.name)} cercano: ${needChips(A.id)}</p>
      ${why ? `<p class="warn">${esc(why)}</p>` : ''}
      <div class="tr-list">${cands.length ? cands.map(({ x, c, pA, pB }) => `<div class="rec tr-c">
        ${x ? avatarSVG(x, 36) : `<span class="tr-none">${ic('swap')}</span>`}
        <span class="rec-t">${x ? `<b>${esc(x.name)}</b><small>${POS_NAME[x.pos]} · ${x.age} anni · OVR ${x.ovr} · ${fmtM(x.salary)} (${x.years}a)</small><small>Ai ${esc(A.name)} sarebbe: ${roleLabel(depthChart(A.id, true, x).get(x.id), x)}</small>`
          : `<b>Nessuno in cambio</b><small>Hanno spazio salariale per prenderlo e basta</small>`}
          <small>Sì dei ${esc(t.abbr)} ${Math.round(pB * 100)}% · sì dei ${esc(A.abbr)} ${Math.round(pA * 100)}%</small></span>
        <span class="rec-c ${c > .5 ? 'good' : c > .25 ? 'warn' : 'bad'}">${Math.round(c * 100)}%</span>
        <button class="btn sm primary" onclick="UI.doTrade(${pid}, ${tid}, ${x ? x.id : 'null'})" ${why ? 'disabled' : ''}>Proponi</button></div>`).join('')
        : '<p class="muted small">Con gli stipendi che hanno, nessuno scambio è possibile.</p>'}</div>
      <div class="actions"><button class="btn" onclick="UI.tradeModal(${pid})">‹ Altre squadre</button></div>`);
  },
  doTrade(pid, tid, xid) { const r = proposeTrade(pid, tid, xid); save(); this.closeModal(); this.render(); toast(r.msg, r.type, r.type === 'good' ? 'Scambio fatto!' : r.type === 'bad' ? 'Niente da fare' : undefined); },
});

const Tutorial = {
  i: 0, el: null,
  steps: [
    { t: null, h: 'Benvenuto, agente!', x: 'Sono <b>Coach Gigi</b> e ti spiego come funziona. Sei un procuratore: trovi giocatori, li porti nella tua agenzia e guadagni una percentuale sui loro <b>stipendi</b> (1-4%) e sui loro <b>sponsor</b> (15%).' },
    { t: 't-adv', h: 'Avanza settimana', x: 'Ogni tocco fa passare una settimana: si giocano 4 partite, incassi le commissioni e paghi lo staff. Poi vedi i <b>risultati</b> dei tuoi giocatori con un voto da A+ a F. Se il pulsante diventa <b>giallo</b>, prima devi decidere un imprevisto. La stagione è: Free Agency → stagione regolare → playoff → Draft.' },
    { t: 't-cash', h: 'La tua cassa', x: 'Qui vedi i soldi e quanto guadagni o perdi questa settimana. Le commissioni sugli stipendi arrivano solo durante la stagione regolare: d\'estate le spese corrono e gli incassi no, quindi tieni da parte qualcosa. Ci paghi lo staff, gli incontri con i giocatori e i bonus alla firma. <b>Se resti in rosso per 4 settimane perdi la licenza!</b>' },
    { t: 't-rep', h: 'La reputazione', x: 'È il tuo biglietto da visita. I giocatori forti parlano solo con agenti che hanno un nome: nel Mercato vedi quanta reputazione vuole ognuno. Serve anche per far crescere l\'agenzia: uffici più grandi, sede, accademia. Sale con i contratti ricchi, i premi e le scelte azzeccate; scende con figuracce e clienti persi.' },
    { t: 't-cl', h: 'I posti in agenzia', x: 'Puoi seguire un numero limitato di clienti. Per averne di più, amplia gli <b>Uffici</b> nella scheda Staff.' },
    { t: 't-ev', h: 'Gli imprevisti', x: 'Ogni tanto qualcuno dei tuoi ne combina una, o arriva una proposta strana. Sotto ogni scelta vedi cosa succede e con che probabilità. Alcune scelte cambiano anche l\'aspetto del giocatore. Più raramente arriva un <b>⚡ colpo di scena</b> che può cambiare una carriera, in bene o in male.' },
    { t: 't-pls', h: 'I tuoi giocatori', x: 'Per ognuno vedi ruolo, prossima partita e il <b>voto dell\'ultima gara</b>. Toccalo per aprire la sua scheda: lì trovi statistiche, storia e tutte le azioni, da <b>Regalo</b> a <b>Scambio</b>.' },
    { t: 't-chal', h: 'Sfide della stagione', x: 'Ogni stagione arrivano 3 sfide nuove, sempre un po\' più difficili, con un premio in soldi e reputazione. Gli <b>obiettivi</b>, nel pulsante accanto, sono traguardi di carriera da raggiungere una volta sola.' },
    { t: null, h: 'Il carattere', x: 'Ogni giocatore ha il suo carattere e la sua storia, e il carattere si vede in quello che combina: un 🎉 <b>festaiolo</b> può fare serata prima di una partita, un 😤 <b>aggressivo</b> finire in una rissa, un 💛 <b>gentile</b> fare beneficenza. Conta anche negli affari: un leale è difficile da portarti via, uno attaccato ai soldi chiede di più.' },
    { t: null, h: 'I rapporti', x: 'Giocatori, squadre e sponsor si ricordano di te. Se li tratti bene accettano più volentieri le tue richieste, pagano di più e hanno più pazienza nelle trattative. Se tiri troppo la corda… si chiudono le porte. Trovi i rapporti nelle schede dei clienti e nella scheda Lega.' },
    { t: 'tab-clients', h: 'Clienti', x: 'Le schede complete dei tuoi assistiti. Quando una squadra fa un\'offerta compare il pulsante <b>Offerte</b>: tratti stipendio e anni, guardi cosa preferisce il giocatore e puoi giocare la carta dell\'<b>asta</b> (occhio ai bluff). Le offerte scadono! Fagli un <b>Regalo</b> per tenerli contenti, <b>Camp</b> per farli allenare con una leggenda, <b>Cura e immagine</b> per dargli uno staff personale o lanciare una campagna, e <b>Consiglia</b> per proporli a una squadra che cerca proprio il loro ruolo. Per chi ha già un contratto c\'è <b>Scambio</b>: scegli la squadra e chi chiedere in cambio. Se lo scambio funziona, le squadre ti premiano.' },
    { t: 'tab-market', h: 'Mercato', x: 'Qui trovi nuovi clienti: <b>prospetti</b> del college, <b>free agent</b> e giocatori di altre agenzie. Con <b>🔭 Osserva</b> scopri il loro potenziale, con <b>🤝 Coltiva</b> crei un legame prima del Draft. <b>Proponi</b> chiede un incontro: se accetta inizia una vera trattativa. Tu offri commissione, bonus e <b>promesse</b> da mantenere; lui fa una controfferta e ha una pazienza di 2-5 🏀.' },
    { t: null, h: 'Il Draft', x: 'Puoi <b>consigliare</b> un prospetto a una squadra: se ti danno retta, lo sceglieranno al Draft se è ancora libero al loro turno. Più è buono il rapporto con la squadra, più ti ascoltano. E un ragazzo a cui sei molto legato può sceglierti come agente da solo, prima del Draft.' },
    { t: 'tab-league', h: 'Lega', x: 'Le classifiche di Est e Ovest, il power ranking con il tuo rapporto con ogni squadra, gli sponsor, i migliori giocatori e i record. In ogni conference le prime 6 vanno ai playoff, dalla 7ª alla 10ª passano dal play-in. I playoff li puoi guardare partita per partita.' },
    { t: 'tab-staff', h: 'Staff', x: 'Investi in scout, avvocati, marketing e uffici. Qui assumi anche l\'<b>🕵️ informatore</b>, ingrandisci la <b>🏙️ sede</b> e apri un\'<b>🎓 accademia</b> che ti porta ogni anno ragazzi già legati a te. Più avanti puoi costruire un <b>centro di allenamento</b> per i tuoi clienti, comprare quote delle squadre e perfino una squadra intera. Ogni livello aumenta le spese settimanali.' },
    { t: 't-help', h: 'Tocca a te!', x: 'Puoi rivedere questo tutorial quando vuoi dal pulsante <b>?</b>. Primo consiglio: vai nel <b>Mercato</b>, chiedi un incontro a un free agent e chiudi la trattativa. In bocca al lupo!' },
  ],
  start() {
    if (!S) return;
    UI.closeModal();
    if (UI.tab !== 'home') { UI.tab = 'home'; UI.render(); }
    this.i = 0; this.build(); document.documentElement.classList.add('tut-on'); this.show();
  },
  build() {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = 'tut'; el.hidden = true;
    el.innerHTML = `<div class="tut-block"></div><div class="spot" id="tut-spot"></div>
      <div class="coach" id="tut-coach">${COACH_SVG}<div class="bubble" id="tut-bubble" role="dialog" aria-live="polite"></div></div>`;
    document.body.appendChild(el);
    this.el = el;
    // blocca lo scorrimento col dito o con la rotella mentre il tutorial è aperto
    const block = e => { if (!this.el.hidden) e.preventDefault(); };
    document.addEventListener('touchmove', block, { passive: false });
    document.addEventListener('wheel', block, { passive: false });
    window.addEventListener('resize', () => { if (!this.el.hidden) this.place(); });
  },
  show() {
    const st = this.steps[this.i], n = this.steps.length;
    this.el.hidden = false;
    document.getElementById('tut-bubble').innerHTML = deEmo(`<div class="who">Coach Gigi · ${this.i + 1} di ${n}</div><h4>${st.h}</h4><p>${st.x}</p>
      <div class="nav">${this.i < n - 1 ? '<button class="skip" onclick="Tutorial.end()">Salta</button>' : '<span></span>'}
      <span class="btns">${this.i ? '<button class="back" onclick="Tutorial.go(-1)" aria-label="Indietro">‹</button>' : ''}<button class="next" onclick="Tutorial.go(1)">${this.i < n - 1 ? 'Avanti ›' : 'Inizia a giocare!'}</button></span></div>`);
    const tg = st.t && document.getElementById(st.t);
    if (tg && tg.closest('nav')) {
      window.scrollTo(0, 0);
      const nav = tg.closest('nav');
      nav.scrollLeft = tg.offsetLeft - (nav.clientWidth - tg.offsetWidth) / 2;
    } else if (tg && tg.closest('main')) {
      const head = document.querySelector('header.top'), hb = head ? head.getBoundingClientRect().bottom : 0;
      window.scrollTo(0, window.scrollY + tg.getBoundingClientRect().top - hb - 12);
    } else window.scrollTo(0, 0);
    requestAnimationFrame(() => this.place());
  },
  place() {
    const st = this.steps[this.i]; if (!st || !this.el || this.el.hidden) return;
    const spot = document.getElementById('tut-spot'), coach = document.getElementById('tut-coach');
    const tg = st.t && document.getElementById(st.t);
    if (!tg) { Object.assign(spot.style, { left: '50%', top: '40%', width: '0px', height: '0px' }); spot.classList.add('none'); coach.className = 'coach mid'; return; }
    const r = tg.getBoundingClientRect(), pad = 6;
    spot.classList.remove('none');
    const bh = coach.getBoundingClientRect().height || 240;
    const below = innerHeight - r.bottom, above = r.top;
    let h = r.height;
    // se il bersaglio è troppo alto, ne evidenzio solo la parte che lascia spazio al fumetto
    if (below < bh + 24 && above < bh + 24) h = Math.max(60, innerHeight - r.top - bh - 40);
    const L = Math.max(4, r.left - pad), R = Math.min(innerWidth - 4, r.right + pad);
    Object.assign(spot.style, { left: L + 'px', top: r.top - pad + 'px', width: Math.max(0, R - L) + 'px', height: h + pad * 2 + 'px' });
    coach.className = 'coach ' + (innerHeight - (r.top + h) >= bh + 24 || above < bh + 24 ? 'bottom' : 'top');
  },
  go(d) { this.i += d; if (this.i >= this.steps.length) return this.end(); this.i = Math.max(0, this.i); this.show(); },
  end() { document.documentElement.classList.remove('tut-on'); if (this.el) this.el.hidden = true; if (S) { S.tutorialDone = true; save(); } },
};

load();
if (S) { for (const p of Object.values(S.players)) { if (p.appeal == null) p.appeal = newAppeal(); if (!p.nat) p.nat = inferNat(p); } S.teamRel = S.teamRel || {}; S.brandRel = S.brandRel || {}; recInit(); S.staff.hq = S.staff.hq || 0; S.staff.academy = S.staff.academy || 0; if (!S.chal || S.chal.season !== S.season) newChallenges(); for (const p of Object.values(S.players)) capPot(p); S.goalRewards = S.goalRewards || {}; for (const k of Object.keys(S.goals || {})) if (!S.goalRewards[k]) { const t = giveReward(k); if (t) addNews(`🎁 Ricompensa per un obiettivo già raggiunto (${esc(GOALS.find(x => x[0] === k)[1])}): ${esc(t)}.`, 'gold'); } for (const p of Object.values(S.players)) if (!p.traits) p.traits = genTraits(); S.talks = S.talks || {}; S.staff.informer = S.staff.informer || 0; S.intel = S.intel || []; pruneIntel(); S.recentEv = S.recentEv || []; S.teamRel = S.teamRel || {}; S.brandRel = S.brandRel || {}; S.inbox = (S.inbox || []).filter(e => e.ev && e.data && e.data.mult); }
UI.render();
Cloud.init();
