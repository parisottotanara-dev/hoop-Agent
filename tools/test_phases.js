// Apre tutte le schermate per 2 stagioni e carica un salvataggio vecchio: controlla che non ci siano errori. Uso: node tools/test_phases.js (richiede Playwright)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Fasi'); await pg.click('form button');
  await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => {
    Tutorial.end(); UI.showWeek = a => a && a(); UI.autoPo = true; const bad = new Set(); let n = 0;
    for (let t = 0; t < 52; t++) {
      for (const e of [...S.inbox]) resolveEvent(e.id, 0); S.inbox = []; S.cash = 2e6;
      for (const tab of ['home', 'clients', 'market', 'league', 'staff']) { try { UI.tab = tab; UI.render(); n++; } catch (e) { bad.add(`${S.phase}${S.week} ${tab}: ${e.message}`); } }
      for (const p of clients()) { try { UI.player(p.id); UI.recModal(p.id); UI.campModal(p.id); } catch (e) { bad.add(`${S.phase} scheda: ${e.message}`); } }
      UI.closeModal(); advance();
    }
    return { bad: [...bad], n, season: S.season, phase: S.phase };
  });
  console.log('schermate aperte:', r.n, '· arrivato a', r.season, r.phase, '· problemi:', r.bad.length ? r.bad : 'nessuno');
  // salvataggio "vecchio": tolgo i campi aggiunti nelle ultime versioni
  await pg.evaluate(() => {
    delete S.chal; delete S.stakes; delete S.talks; delete S.intel; delete S.goalRewards; delete S.teamRel; delete S.brandRel; delete S.recentEv;
    delete S.staff.hq; delete S.staff.academy; delete S.staff.informer; delete S.showGames; delete S.nextRound;
    for (const p of Object.values(S.players)) { delete p.traits; delete p.story; delete p.promises; delete p.sponsorCount; delete p.pref; delete p.injDebt; delete p.week; delete p.last; delete p.look; }
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  });
  await pg.reload(); await pg.waitForTimeout(600);
  const r2 = await pg.evaluate(() => {
    const bad = [];
    try { for (const tab of ['home', 'clients', 'market', 'league', 'staff']) { UI.tab = tab; UI.render(); } } catch (e) { bad.push('render: ' + e.message); }
    try { for (let t = 0; t < 30; t++) { for (const e of [...S.inbox]) resolveEvent(e.id, 0); S.inbox = []; advance(); } } catch (e) { bad.push('advance: ' + e.message); }
    try { for (const p of clients()) { UI.player(p.id); UI.clientRow(p); } } catch (e) { bad.push('schede: ' + e.message); }
    return bad;
  });
  console.log('salvataggio vecchio:', r2.length ? r2 : 'caricato e giocato senza problemi');
  console.log('errori JS:', errs.slice(0, 6));
  await b.close();
})();
