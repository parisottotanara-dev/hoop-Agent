// Revisore automatico: simula N stagioni e controlla che la lega resti sana. Uso: node tools/audit.js 50 (richiede Playwright).
const { chromium } = require('playwright');
const SEASONS = +process.argv[2] || 50;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Audit'); await pg.click('form button');
  await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    Tutorial.end(); UI.showWeek = a => a && a(); UI.autoPo = true;
    window.ISS = {}; window.issue = (k, ex) => { ISS[k] = ISS[k] || { n: 0, ex }; ISS[k].n++; };
    window.STATS = []; window.GEMS = 0; window.PROM = { kept: 0, broken: 0, made: 0, byType: {} };
    const oa = addNews; window.addNews = (t, c) => {
      if (/talento generazionale/.test(t)) GEMS++;
      const m = t.match(/Promessa (mantenuta|mancata) con .*?: (.*?)[.]/);
      if (m) { const k = m[1] === 'mantenuta' ? 'kept' : 'broken'; PROM[k]++; PROM.byType[m[2]] = PROM.byType[m[2]] || { kept: 0, broken: 0 }; PROM.byType[m[2]][k]++; }
      oa(t, c);
    };
    const num = v => typeof v === 'number' && isFinite(v);
    window.check = () => {
      if (!num(S.cash)) issue('cassa non numerica', S.cash);
      if (!num(S.rep) || S.rep < 0 || S.rep > 100) issue('reputazione fuori scala', S.rep);
      const ids = new Set(S.clients);
      if (ids.size !== S.clients.length) issue('cliente duplicato', S.clients.join());
      for (const id of S.clients) { const p = S.players[id]; if (!p) issue('cliente inesistente', id); else if (p.retired) issue('cliente ritirato ancora in agenzia', p.name); }
      const roster = {};
      for (const p of Object.values(S.players)) {
        for (const k of ['ovr', 'pot', 'age', 'morale', 'hype', 'salary', 'gp', 'pts', 'reb', 'ast', 'h', 'w'])
          if (!num(p[k])) issue(`campo ${k} non numerico`, `${p.name}: ${p[k]}`);
        if (p.ovr < 35 || p.ovr > 99) issue('valutazione fuori scala', `${p.name} ${p.ovr}`);
        if (p.pot > 99) issue('potenziale > 99', `${p.name} ${p.pot}`);
        if (p.pot < p.ovr) issue('potenziale sotto la valutazione', `${p.name} ${p.ovr}/${p.pot}`);
        if (!p.school && p.age >= 29 && p.pot > p.ovr + (p.injDebt || 0)) issue('veterano con potenziale sopra il livello', `${p.name} ${p.age}a ${p.ovr}/${p.pot}`);
        if (p.morale < 0 || p.morale > 100) issue('rapporto fuori scala', `${p.name} ${p.morale}`);
        if (p.hype < 0 || p.hype > 100) issue('popolarità fuori scala', `${p.name} ${p.hype}`);
        if (p.injury < 0) issue('infortunio negativo', p.name);
        if ((p.injDebt || 0) < 0) issue('forma persa negativa', p.name);
        if (p.age > 42) issue('giocatore troppo vecchio', `${p.name} ${p.age}`);
        if (p.team != null) {
          if (!S.teams[p.team]) issue('squadra inesistente', p.name);
          if (p.school) issue('in squadra e al college insieme', p.name);
          if (p.retired) issue('ritirato ma in squadra', p.name);
          if (p.years <= 0) issue('in squadra con contratto di 0 anni', `${p.name} ${S.phase}${S.week}`);
          if (!(p.salary >= MIN_SAL - 0.01) || p.salary > MAX_SAL + 0.01) issue('stipendio fuori scala', `${p.name} ${p.salary}`);
          (roster[p.team] = roster[p.team] || []).push(p);
        }
        if (p.school && p.agency === S.agency && !isClient(p)) issue('agenzia tua ma non cliente', p.name);
      }
      if (S.phase === 'reg') for (const t of S.teams) { const n = (roster[t.id] || []).length; if (n < 10) issue('rosa troppo corta in stagione', `${t.abbr} ${n}`); if (n > 15) issue('rosa troppo lunga', `${t.abbr} ${n}`); }
      for (const t of S.teams) { const pr = payroll(t.id); if (pr > CAP + 70) issue('monte ingaggi esagerato', `${t.abbr} ${Math.round(pr)}M fase ${S.phase}${S.week} quota ${stakeOf(t.id)}% · ` + rosterOf(t.id).sort((a,b)=>b.salary-a.salary).slice(0,6).map(x => `${x.name}${isClient(x)?'(C)':''} ${x.salary}×${x.years}${x.rookieSeason?'R':''}`).join(', ')); }
      for (const o of S.offers) { const p = S.players[o.pid]; if (!p) issue('offerta per giocatore inesistente', o.pid); else if (p.team != null && !o.ext && p.team !== o.teamId) issue('offerta a chi ha già squadra', p.name); if (!S.teams[o.teamId]) issue('offerta di squadra inesistente', o.teamId); }
      for (const e of S.inbox) if (e.pid != null && !S.players[e.pid]) issue('imprevisto per giocatore inesistente', e.ev);
      for (const id of Object.keys(S.talks)) if (!S.players[id]) issue('trattativa con giocatore inesistente', id);
      for (const [tid, v] of Object.entries(S.stakes || {})) if (v > 100) issue('quota oltre il 100%', v);
    };
  });
  const t0 = Date.now();
  for (let season = 0; season < SEASONS; season++) {
    const line = await pg.evaluate(() => {
      const s0 = S.season;
      for (let t = 0; t < 26 && S.season === s0; t++) {
        // reclutamento realistico, con promesse
        if (clients().length < capacity() && S.cash > 100000) {
          const c = Object.values(S.players).filter(p => !p.retired && !isClient(p) && (p.school || p.team == null || chance(0.3)) && p.lastPitch !== S.turn && p.lockedUntil <= S.season)
            .filter(p => openChance(p) > 0.35).sort((a, b) => starPower(b) - starPower(a))[randi(0, 4)];
          if (c && pitchCost(c) < S.cash * 0.2) { startTalk(c.id);
            if (S.talks[c.id]) { const feas = Object.keys(PROMISES).filter(k => promiseFeasible(c, k)); const pr = chance(0.5) && feas.length ? [pick(feas)] : [];
              const tk = S.talks[c.id]; talkOffer(c.id, tk.ask.comm + 0.5, tk.ask.bonus, pr); if (S.talks[c.id]) talkAcceptAsk(c.id);
              if (isClient(c) && pr.length) PROM.made++; } }
        }
        // mantenere le promesse
        for (const p of clients()) for (const pr of (p.promises || [])) {
          if (pr.season !== S.season) continue;
          if (pr.k === 'sponsor' && (p.sponsorCount || 0) <= pr.base) seekSponsor(p.id);
          if (pr.k === 'camp' && p.campSeason !== pr.season && S.cash > 100000) legendCamp(p.id, 0);
          if (pr.k === 'contender' && p.team != null && teamRank(p.team) > 14 && S.phase === 'reg') { const top = standings().slice(0, 12).filter(t => t.id !== p.team).sort((a, b) => recChance(p, b.id) - recChance(p, a.id))[0]; if (top) recommend(p.id, top.id); }
          if (pr.k === 'contender' && p.team == null) for (const o of S.offers.filter(o => o.pid === p.id)) if (teamRank(o.teamId) <= 12) acceptOffer(o.id);
        }
        for (const p of Object.values(S.players).filter(p => p.school && !isClient(p)).sort((a, b) => shownPot(b) - shownPot(a)).slice(0, 2)) if (S.cash > 300000) cultivate(p.id);
        for (const pid of [...new Set(S.offers.map(o => o.pid))]) {
          const offs = S.offers.filter(o => o.pid === pid); if (!offs.length) continue;
          if (offs.length > 1 && chance(0.5)) { const s2 = [...offs].sort((a, b) => a.salary - b.salary); leverage(s2[0].id, s2[s2.length - 1].salary * 1.01); }
          const o = S.offers.filter(x => x.pid === pid).sort((a, b) => b.salary - a.salary)[0]; if (!o) continue;
          const r = negotiate(o.id, o.salary * 1.08, o.years); if (!r.done && S.offers.includes(o)) acceptOffer(o.id);
        }
        for (const e of [...S.inbox]) { const d = EVENTS.find(x => x.id === e.ev); if (!d) { issue('imprevisto sconosciuto', e.ev); S.inbox = S.inbox.filter(x => x !== e); continue; }
          resolveEvent(e.id, Math.floor(Math.random() * d.choices.length)); if (S.inbox.includes(e)) { S.cash += 300000; resolveEvent(e.id, Math.floor(Math.random() * d.choices.length)); } if (S.inbox.includes(e)) { issue('imprevisto che non si chiude', e.ev); S.inbox = S.inbox.filter(x => x !== e); } }
        for (const p of clients()) if (p.age <= 25 && p.campSeason !== S.season && S.cash > 800000) legendCamp(p.id, 1);
        for (const k of ['office', 'hq', 'academy', 'marketing', 'legal', 'scout', 'informer']) if ((S.staff[k] || 0) < 5 && S.rep >= staffRepReq(k) && S.cash > upgradeCost(S.staff[k] || 0, k) * 2.5 && weeklyIncomeEstimate() > weeklyCost() * 1.4 + 6000) { spend(upgradeCost(S.staff[k] || 0, k)); S.staff[k] = (S.staff[k] || 0) + 1; }
        for (const p of clients()) if (p.lastContact !== S.turn && p.morale < 55) giveGift(p.id, S.cash > 20e6 ? 2 : S.cash > 2e6 ? 1 : 0);
        if (S.cash > 25e6) { const t = [...S.teams].sort((x, y) => stakeOf(y.id) - stakeOf(x.id))[0]; buyStake(stakeOf(t.id) && stakeOf(t.id) < 100 ? t.id : S.teams.filter(x => stakeOf(x.id) < 100)[0].id); }
        if (S.cash > 3e6 && S.rep < 98) donate();
        if (S.phase === 'po') { const tot = S.teams.reduce((a, t) => a + t.w + t.l, 0); if (S.teams.some(t => t.w + t.l !== 80)) issue('partite giocate diverse da 80', S.teams.map(t => t.w + t.l).join()); if (S.teams.reduce((a, t) => a + t.w, 0) !== tot / 2) issue('vittorie e sconfitte non tornano', tot); }
        advance(); check();
        if (S.over) return 'GAME OVER';
      }
      const all = Object.values(S.players).filter(p => !p.retired);
      const ros = all.filter(p => p.team != null), fa = all.filter(p => p.team == null && !p.school), pros = all.filter(p => p.school);
      const ov = ros.map(p => p.ovr).sort((a, b) => b - a);
      const pay = S.teams.map(t => payroll(t.id));
      const rs = S.teams.map(t => rosterOf(t.id).length);
      const h = S.history[S.history.length - 1] || {};
      return [S.season, all.length, ros.length, fa.length, pros.length, Math.min(...rs) + '-' + Math.max(...rs),
        (ov.reduce((a, b) => a + b, 0) / ov.length).toFixed(1), ov.filter(o => o >= 85).length, ov.filter(o => o >= 90).length, ov[0],
        Math.round(Math.min(...pay)) + '-' + Math.round(Math.max(...pay)), pay.filter(x => x > CAP).length,
        S.clients.length, (S.cash / 1e6).toFixed(1), S.rep, Math.round((h.income || 0) / 1e3), Object.keys(S.goals).length,
        Math.round(JSON.stringify(S).length / 1024),
        'accad85+ ' + ros.filter(p => p.academy && p.ovr >= 85).length + ' accad90+ ' + ros.filter(p => p.academy && p.ovr >= 90).length + ' clienti85+ ' + clients().filter(p => p.ovr >= 85).length + ' gemme ' + (window.GEMS || 0) + (S.goals.homegrown ? ' CAMPIONE:' + S.goals.homegrown : '')].join(' | ');
    });
    console.log(line);
    if (season % 10 === 9) {
      const ui = await pg.evaluate(() => {
        const bad = [];
        const tryIt = (lab, f) => { try { f(); } catch (e) { bad.push(lab + ': ' + e.message); } };
        for (const t of ['home', 'clients', 'market', 'league', 'staff']) tryIt('scheda ' + t, () => { UI.tab = t; UI.render(); });
        for (const m of ['prospect', 'fa', 'pro']) tryIt('mercato ' + m, () => { UI.tab = 'market'; UI.mkt = m; UI.render(); });
        const ps = shuffle(Object.values(S.players)).slice(0, 25);
        for (const p of ps) { tryIt('scheda giocatore', () => UI.player(p.id)); tryIt('consiglia', () => UI.recModal(p.id)); }
        for (const p of clients().slice(0, 5)) { tryIt('camp', () => UI.campModal(p.id)); tryIt('rigaHome', () => UI.clientRow(p)); }
        const fa = Object.values(S.players).find(p => p.team == null && !p.school && !isClient(p));
        if (fa) tryIt('trattativa agente', () => UI.pitchModal(fa.id));
        for (const pid of new Set(S.offers.map(o => o.pid))) tryIt('trattativa squadre', () => UI.negotiation(pid));
        tryIt('tutorial', () => { Tutorial.start(); for (let i = 0; i < Tutorial.steps.length; i++) Tutorial.go(1); });
        UI.closeModal();
        return bad;
      });
      console.log('   controllo interfaccia:', ui.length ? ui.join(' | ') : 'ok');
    }
    if (line === 'GAME OVER') break;
  }
  const res = await pg.evaluate(() => ({ ISS, PROM }));
  console.log('\nPROBLEMI TROVATI:'); for (const [k, v] of Object.entries(res.ISS)) console.log(`  ${k}: ${v.n} volte (es. ${JSON.stringify(v.ex)})`);
  console.log('PROMESSE:', JSON.stringify(res.PROM));
  console.log('ERRORI JS:', errs.slice(0, 10));
  console.log('tempo', Math.round((Date.now() - t0) / 1000), 's');
  await b.close();
})();
