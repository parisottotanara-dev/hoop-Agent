// Controlla per 30 settimane che nessuna schermata esca dai bordi su iPhone. Uso: node tools/test_overflow.js (richiede Playwright)
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch();
  const pg = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Academy'); await pg.click('form button');
  await pg.waitForTimeout(1300);
  const r = await pg.evaluate(() => {
    Tutorial.end(); UI.showWeek = a => a && a(); UI.autoPo = true; UI.showDraft = a => a && a();
    const bad = [];
    const check = where => {
      const vw = innerWidth;
      if (document.documentElement.scrollWidth > vw + 1) bad.push(`${where}: pagina larga ${document.documentElement.scrollWidth}`);
      for (const el of document.querySelectorAll('#app *, #modal *')) {
        const rc = el.getBoundingClientRect();
        if (rc.width && rc.right > vw + 1 && !el.closest('.tbl-wrap') && getComputedStyle(el).position !== 'fixed') { bad.push(`${where}: ${el.tagName}.${el.className} fino a ${Math.round(rc.right)}`); break; }
      }
    };
    for (let w = 0; w < 30; w++) {
      for (const t of ['home', 'clients', 'market', 'league', 'staff']) { UI.tab = t; UI.render(); check(t + ' sett.' + S.turn); }
      const c = clients()[0]; if (c) { UI.player(c.id); check('scheda'); UI.closeModal(); }
      for (const e of [...S.inbox]) resolveEvent(e.id, 0); S.inbox = []; S.cash = 2e6; advance();
    }
    return [...new Set(bad)].slice(0, 12);
  });
  console.log(r.length ? r.join('\n') : 'nessuna schermata esce dai bordi'); console.log('errori', errs);
  await b.close(); })();
