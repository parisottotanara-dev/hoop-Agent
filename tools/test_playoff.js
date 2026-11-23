// Prova i playoff: tabellone, partita in diretta, simulazioni, campioni. Controlla anche che la telecronaca torni con il risultato.
// Uso: node tools/test_playoff.js  (screenshot nella cartella temporanea)
const { chromium, devices } = require('playwright');
const os = require('os'), path = require('path');
const OUT = p => path.join(os.tmpdir(), p);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const dev of ['iPhone SE', 'iPhone 15']) {
    const pg = await (await b.newContext({ ...devices[dev] })).newPage();
    pg.on('pageerror', e => errs.push(dev + ': ' + e.message));
    await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Conti'); await pg.click('form button');
    await pg.waitForTimeout(1200);
    const chk = await pg.evaluate(() => {
      Tutorial.end(); UI.showWeek = a => a && a(); UI.showDraft = a => a && a(); window.toast = () => {};
      // squadra per i clienti: due titolari di squadre forti
      let n = 0;
      while (S.phase !== 'po' && n++ < 60) { for (const e of [...S.inbox]) resolveEvent(e.id, 0); S.inbox = []; S.cash = 5e6; advance(); }
      const top = powerRanking().slice(0, 3);
      for (const t of top) { const p = rosterOf(t.id).sort(rotCmp)[0]; if (!isClient(p)) { S.clients.push(p.id); p.agency = null; p.comm = 3; } }
      // controlli della telecronaca su tante partite
      const bad = [];
      let ots = 0;
      for (let i = 0; i < 400; i++) {
        const G = simMatch(i % 30, (i + 7) % 30 === i % 30 ? (i + 8) % 30 : (i + 7) % 30);
        const sum = sd => G.box[sd].reduce((s, l) => s + l.pts, 0);
        if (sum('h') !== G.hs || sum('a') !== G.as) bad.push('box ' + i);
        const pb = playByPlay(G);
        let h = 0, a = 0, hr = 0, ar = 0;
        for (const e of pb.ev) { if (e.reb) continue; if (e.side === 'h') h += e.v; else a += e.v; if (e.t < 2880) { if (e.side === 'h') hr += e.v; else ar += e.v; } }
        if (h !== G.hs || a !== G.as) bad.push(`pbp ${i}: ${h}-${a} vs ${G.hs}-${G.as}`);
        if (G.ot) { ots++; if (hr !== ar) bad.push(`ot ${i}: a fine regolamentare ${hr}-${ar}`); }
        if (!G.ot && hr === ar) bad.push('pari senza supplementare ' + i);
      }
      return { phase: S.phase, bad: bad.slice(0, 8), ots };
    });
    console.log(dev, 'fase', chk.phase, '· supplementari su 400:', chk.ots, '· problemi telecronaca:', chk.bad.length ? chk.bad : 'nessuno');
    await pg.evaluate(() => { S.inbox = []; UI.render(); });
    await pg.click('#t-adv'); await pg.waitForTimeout(400);
    await pg.screenshot({ path: OUT(`po_board_${dev}.png`), fullPage: false });
    const wide = await pg.evaluate(() => { const v = document.getElementById('poview'); return v.scrollWidth > v.clientWidth + 1 ? 'esce dai bordi' : 'ok'; });
    console.log(dev, 'tabellone:', wide);
    // guarda una partita a velocità veloce
    await pg.click('.po-acts .btn.big'); await pg.waitForTimeout(300);
    await pg.click('[data-sp="2"]');
    await pg.waitForTimeout(2600);
    await pg.screenshot({ path: OUT(`po_live_${dev}.png`) });
    await pg.click('#pl-end'); await pg.waitForTimeout(500);
    await pg.screenshot({ path: OUT(`po_end_${dev}.png`), fullPage: false });
    const fin = await pg.evaluate(() => [document.getElementById('pl-hs').textContent, document.getElementById('pl-as').textContent].join('-') + ' / ' + (() => { const G = UI.poLast.games[0]; return G.hs + '-' + G.as; })());
    console.log(dev, 'tabellone finale = risultato:', fin);
    await pg.click('.po-endc .btn.primary'); await pg.waitForTimeout(200);
    await pg.click('.po-acts2 .btn:nth-child(2)'); await pg.waitForTimeout(300);
    await pg.screenshot({ path: OUT(`po_round_${dev}.png`) });
    // tutto fino ai campioni
    await pg.evaluate(() => UI.poSim('all')); await pg.waitForTimeout(300);
    await pg.screenshot({ path: OUT(`po_champ_${dev}.png`), fullPage: false });
    const st = await pg.evaluate(() => {
      const po = S.po, errs = [];
      for (const s of po.series) {
        const need = s.bo === 1 ? 1 : 4;
        if (Math.max(s.wa, s.wb) !== need || s.g.length !== s.wa + s.wb) errs.push('serie ' + s.id);
        if (s.round === 2 && po.seeds[s.a] > po.seeds[s.b]) errs.push('fattore campo ' + s.id);
      }
      const g7 = po.series.filter(s => s.g.length === 7).length;
      return { errs, g7, champ: teamName(S.teams[po.champ]), n: po.series.length };
    });
    console.log(dev, 'serie:', st.n, '· gare 7:', st.g7, '· campioni:', st.champ, '· errori:', st.errs.length ? st.errs : 'nessuno');
    await pg.click('.po-champ .btn.primary'); await pg.waitForTimeout(500);
    console.log(dev, 'dopo i playoff la fase è', await pg.evaluate(() => S.phase));
    await pg.evaluate(() => { UI.go('league'); });
    await pg.screenshot({ path: OUT(`po_league_${dev}.png`), fullPage: true });
    const lw = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 ? 'esce dai bordi' : 'ok');
    console.log(dev, 'Lega:', lw);
  }
  console.log('errori JS:', errs);
  await b.close();
})();
