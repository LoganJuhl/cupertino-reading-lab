/* Capture app-owned runtime CSS locally; never redistribute the Obsidian app. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('playwright'), qa = require('./config.cjs');
(async () => {
  const browser = await chromium.connectOverCDP(qa.endpoint);
  try {
    const page = browser.contexts()[0].pages().find(p => p.url().includes('index.html'));
    await qa.guard(page, {});
    await page.evaluate(async file => {
      await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:'source',source:false}});
    }, qa.surfaceFile);
    const css = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
    }).filter(rule => rule.includes('.ͼ') || /^@keyframes cm-/.test(rule)).join('\n'));
    assert(css.includes('.cm-scroller') && css.includes('.cm-content'));
    fs.writeFileSync(path.join(qa.work, 'app/codemirror.css'), css + '\n');
    console.log(JSON.stringify({status:'PASS',bytes:Buffer.byteLength(css),sha256:qa.sha(css+'\n')}));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
