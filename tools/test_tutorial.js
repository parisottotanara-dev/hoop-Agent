// Controlla che ogni passo del tutorial indichi qualcosa di visibile e che il fumetto non lo copra. Uso: node tools/test_tutorial.js (richiede Playwright)
const { chromium, devices } = require('playwright');
const OUT = require('os').tmpdir() + '/hoop-tut/';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await pg.fill('#f-agent', 'T'); await pg.fill('#f-agency', 'Miami beach'); await pg.click('form button');
  await pg.waitForTimeout(700);
  const n = await pg.evaluate(() => Tutorial.steps.length);
  for (let i = 0; i < n; i++) {
    await pg.waitForTimeout(450);
    const info = await pg.evaluate(() => {
      const st = Tutorial.steps[Tutorial.i], sp = document.getElementById('tut-spot').getBoundingClientRect();
      const bub = document.getElementById('tut-coach').getBoundingClientRect();
      const inView = !st.t || (sp.top >= 0 && sp.bottom <= innerHeight + 1 && sp.left >= 0 && sp.right <= innerWidth + 1 && sp.height > 10);
      const overlap = st.t ? Math.max(0, Math.min(sp.bottom, bub.bottom) - Math.max(sp.top, bub.top)) : 0;
      const target = st.t ? !!document.getElementById(st.t) : true;
      return `${Tutorial.i + 1}. ${st.h} — bersaglio ${st.t || '-'} ${target ? '' : 'MANCANTE'} · in vista ${inView ? 'sì' : 'NO'} · sovrapposizione col fumetto ${Math.round(overlap)}px`;
    });
    console.log(info);
    await pg.screenshot({ path: OUT + String(i + 1).padStart(2, '0') + '.png' });
    if (i < n - 1) await pg.click('#tut-bubble .next');
  }
  await pg.click('#tut-bubble .next');
  console.log('chiuso:', await pg.evaluate(() => document.getElementById('tut').hidden && S.tutorialDone), '| errori:', errs);
  await b.close();
})();
