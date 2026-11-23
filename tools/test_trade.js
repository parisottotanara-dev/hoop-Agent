// Prova gli scambi: bisogni delle squadre, proposta, contropartita, giudizio dopo qualche settimana con premio o rapporto in calo.
// Uso: node tools/test_trade.js  (screenshot nella cartella temporanea)
const { chromium, devices } = require('playwright');
const os = require('os'), path = require('path');
const OUT = p => path.join(os.tmpdir(), p);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const pg = await (await b.newContext({ ...devices['iPhone SE'] })).newPage();
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Conti'); await pg.click('form button');
  await pg.waitForTimeout(1200);
  const pid = await pg.evaluate(() => {
    Tutorial.end(); UI.showWeek = a => a && a(); UI.autoPo = true; window.toast = () => {};
    while (!(S.phase === 'reg' && S.week >= 2)) { S.inbox = []; S.cash = 5e6; advance(); }
    S.inbox = [];
    // un cliente con contratto, livello medio-alto
    const p = Object.values(S.players).filter(x => x.team != null && !isClient(x) && x.ovr >= 74 && x.ovr <= 79)[0];
    S.clients.push(p.id); p.agency = S.agency; p.comm = 3;
    UI.render(); UI.recModal(p.id);
    return p.id;
  });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: OUT('tr_list.png') });
  const ow = await pg.evaluate(() => { const m = document.querySelector('#modal .modal, #modal-body'); return m.scrollWidth > m.clientWidth + 1 ? 'esce dai bordi' : 'ok'; });
  console.log('lista squadre:', ow);
  await pg.click('.tr-team .btn:not([disabled])'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: OUT('tr_team.png') });
  const r = await pg.evaluate(pid => {
    const p = P(pid), from = p.team;
    // prova finché una squadra dice sì (ogni tentativo è una settimana diversa)
    let res, tid, c, tries = 0;
    do {
      p.lastRec = null; tries++;
      const opts = S.teams.filter(t => t.id !== from && tradeCands(p, t.id).length).map(t => ({ t, c: tradeCands(p, t.id)[0] })).sort((a, b) => b.c.c - a.c.c);
      tid = opts[0].t.id; c = opts[0].c;
      res = proposeTrade(pid, tid, c.x ? c.x.id : null);
    } while (res.type !== 'good' && tries < 40);
    const ok = p.team === tid && (!c.x || c.x.team === from);
    const again = proposeTrade(pid, from, null).msg;
    UI.closeModal();
    return { msg: res.msg + ' (tentativi: ' + tries + ', probabilità ' + Math.round(c.c * 100) + '%)', ok, again, trades: (S.trades || []).length };
  }, pid);
  console.log('scambio:', r.msg, '| rose aggiornate:', r.ok, '| di nuovo:', r.again, '| da giudicare:', r.trades);
  // tante prove: quanti sì, quanti premi
  const stat = await pg.evaluate(() => {
    let yes = 0, n = 0, fees = 0, good = 0, bad = 0, legalBad = 0;
    const odds = [];
    for (let i = 0; i < 300; i++) {
      const p = pick(Object.values(S.players).filter(x => x.team != null && !x.injury && x.ovr >= 60));
      const tid = pick(S.teams.filter(t => t.id !== p.team)).id;
      const c = tradeCands(p, tid);
      if (!c.length) continue;
      for (const k of c) if (k.x && !tradeLegal(p, k.x, tid)) legalBad++;
      odds.push(c[0].c); n++;
    }
    odds.sort((a, b) => a - b);
    return { n, legalBad, med: Math.round(odds[odds.length >> 1] * 100), p90: Math.round(odds[Math.floor(odds.length * .9)] * 100) };
  });
  console.log('probabilità migliore contropartita: mediana', stat.med + '%', '· 90°', stat.p90 + '%', '· prove', stat.n, '· illegali', stat.legalBad);
  const v = await pg.evaluate(() => {
    const cash0 = S.cash, rel0 = S.teams.map(t => teamRel(t.id));
    for (let i = 0; i < 9; i++) { S.inbox = []; advance(); }
    const news = S.news.filter(n => /scambio/i.test(n.text) && /(contenti|delusi)/.test(n.text)).map(n => n.text.replace(/<[^>]+>/g, ''));
    return { news, left: (S.trades || []).length };
  });
  console.log('giudizi:', v.news.length ? v.news : 'nessuno (scambio equilibrato)', '| ancora da giudicare:', v.left);
  await pg.evaluate(pid => { UI.go('clients'); }, pid);
  await pg.screenshot({ path: OUT('tr_clients.png'), fullPage: false });
  console.log('errori JS:', errs);
  await b.close();
})();
