// Esporta e reimporta il salvataggio (file e codice) e controlla la barra in alto su iPhone SE. Uso: node tools/test_save.js (richiede Playwright)
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone SE'], acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Salva'); await pg.click('form button');
  await pg.waitForTimeout(1300);
  await pg.evaluate(() => { Tutorial.end(); UI.showWeek = a => a && a(); for (let t = 0; t < 30; t++) { for (const e of [...S.inbox]) resolveEvent(e.id, 0); S.inbox = []; advance(); } UI.go('home'); });
  const hdr = await pg.evaluate(() => { const r = [...document.querySelectorAll('.top-row > *')].map(e => Math.round(e.getBoundingClientRect().right)); return { maxRight: Math.max(...r), vw: innerWidth }; });
  console.log('barra in alto su iPhone SE:', JSON.stringify(hdr));
  await pg.screenshot({ path: require('os').tmpdir() + '/hoop-hdr-se.png', clip: { x: 0, y: 0, width: 320, height: 120 } });
  const before = await pg.evaluate(() => ({ season: S.season, phase: S.phase, week: S.week, cash: Math.round(S.cash), agency: S.agency, clients: S.clients.length }));
  // esporta file
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(() => UI.doExport())]);
  const path = require('os').tmpdir() + '/hoop-export.json'; await dl.saveAs(path);
  console.log('file esportato:', dl.suggestedFilename(), Math.round(fs.statSync(path).size / 1024) + ' KB');
  // copia codice
  await pg.evaluate(() => UI.doCopyCode());
  const code = await pg.evaluate(() => navigator.clipboard.readText());
  console.log('codice:', code.slice(0, 12) + '…', Math.round(code.length / 1024) + ' KB');
  // cancello tutto e importo dal codice
  await pg.evaluate(() => { localStorage.clear(); });
  await pg.reload(); await pg.waitForTimeout(500);
  await pg.click('text=Hai un salvataggio? Caricalo');
  await pg.fill('#imp-code', 'non è un salvataggio'); await pg.click('text=Carica il codice');
  console.log('codice sbagliato →', await pg.textContent('#imp-err'));
  await pg.fill('#imp-code', code); await pg.click('text=Carica il codice');
  await pg.waitForTimeout(1500);
  const after = await pg.evaluate(() => ({ season: S.season, phase: S.phase, week: S.week, cash: Math.round(S.cash), agency: S.agency, clients: S.clients.length }));
  console.log('prima:', JSON.stringify(before)); console.log('dopo il codice:', JSON.stringify(after));
  // importo dal file
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(500);
  await pg.click('text=Hai un salvataggio? Caricalo');
  await pg.setInputFiles('input[type=file]', path); await pg.waitForTimeout(1500);
  console.log('dopo il file:', await pg.evaluate(() => S ? `${S.agency} stagione ${S.season}, ${S.clients.length} clienti` : 'niente'));
  await pg.evaluate(() => { UI.go('home'); document.querySelector('.savebox').scrollIntoView(); });
  await pg.screenshot({ path: require('os').tmpdir() + '/hoop-savebox.png' });
  console.log('errori', errs);
  await b.close();
})();
