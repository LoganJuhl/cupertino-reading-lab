/* Standalone browser regression with Obsidian's own CSS and bundled MathJax.
 * This isolates Reading View geometry; it does not claim native iPhone coverage.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const qa = require('../../scripts/config.cjs');

const out = path.join(__dirname, 'evidence/math-webkit');
fs.mkdirSync(out, { recursive: true });
const identityFile = path.join(qa.work, 'app/QA-IDENTITY.json');
const identity = JSON.parse(fs.readFileSync(identityFile));
const finalCss = fs.readFileSync(path.join(qa.root, qa.final.folder, 'theme.css'), 'utf8');
const appCss = fs.readFileSync(path.join(qa.work, 'app/app.css'), 'utf8');
const repair = '.workspace-leaf-content[data-type="markdown"] .markdown-reading-view .math-block > mjx-container[display="true"] {\n  overflow-x: auto;\n}';
assert.equal(finalCss.split(repair).length, 2, 'The before control must remove exactly the scoped repair');
const beforeCss = finalCss.replace(repair, '');
assert.equal(qa.sha(finalCss), qa.final.css_sha256);
assert.equal(identity.stage_hashes[qa.final.name], qa.final.css_sha256);
assert.equal(qa.sha(appCss), identity.app_css_sha256);
assert.equal(identity.version, '1.13.7');

// No dependency download: serve only the inspected installed app's MathJax assets.
const archive = fs.readFileSync(identity.source_asar);
assert.equal(qa.sha(archive), identity.source_sha256);
const tree = JSON.parse(archive.subarray(16, 16 + archive.readUInt32LE(12)));
const dataOffset = 8 + archive.readUInt32LE(4);
function asarAsset(name) {
  let item = tree;
  for (const part of name.split('/')) item = item?.files?.[part];
  assert(item && Number.isFinite(Number(item.offset)) && item.size > 0, `Missing bundled asset: ${name}`);
  return archive.subarray(dataOffset + Number(item.offset), dataOffset + Number(item.offset) + item.size);
}
const mathScript = 'lib/mathjax/tex-chtml-full.js';
const formula = String.raw`Payment=420,000\times\frac{r(1+r)^{360}}{(1+r)^{360}-1}=\boxed{\$2,726.90}`;
const bodyClasses = 'mod-macos is-frameless is-hidden-frameless obsidian-app show-ribbon show-view-header';
const table = columns => '<div class="el-table" dir="ltr" style="overflow-x: auto;"><table><thead><tr>' +
  Array.from({ length: columns }, (_, i) => `<th>Scenario ${i + 1}</th>`).join('') +
  '</tr></thead><tbody><tr>' + Array.from({ length: columns }, (_, i) => `<td>Example ${i + 1}</td>`).join('') +
  '</tr></tbody></table></div>';
// Ancestor classes, Reading View inline sizing, and the native table wrapper's
// overflow are copied from a synthetic 1.13.7 app capture. There are no helper
// cssclasses, no containment, and no added clipping or math sizing declarations.
const content = '<div class="el-h1"><h1>5. Synthetic payment illustrations</h1></div>' +
  '<div class="el-p"><p id="prose-before">An ordinary reading note keeps its paragraphs within the same column while wide equations and comparison tables remain reachable.</p></div>' +
  table(4) + '<div class="el-div"><div class="math-block"></div></div>' +
  '<div class="el-p"><p id="prose-after">Continue reading after the equation. Its horizontal scroll belongs to the equation alone, so the surrounding note stays still.</p></div>' +
  table(6) + '<div class="el-p"><p>End of the synthetic section.</p></div>';
function html(tone, mobile) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    `<body class="${bodyClasses} theme-${tone}${mobile ? ' emulate-mobile is-mobile is-phone' : ''}" style="--zoom-factor: 1; --font-text-size: 18px; --indent-size: 4;">` +
    '<div class="app-container"><div class="horizontal-main-container"><div class="workspace">' +
    '<div class="workspace-split mod-vertical mod-root mod-visible"><div class="workspace-tabs mod-active mod-visible mod-top mod-top-left-space mod-top-right-space">' +
    '<div class="workspace-tab-container"><div class="workspace-leaf mod-active">' +
    '<div class="workspace-leaf-content" data-type="markdown" data-mode="preview"><div class="view-content">' +
    '<div class="markdown-reading-view" style="width: 100%; height: 100%;">' +
    '<div class="markdown-preview-view markdown-rendered node-insert-event is-readable-line-width allow-fold-headings allow-fold-lists show-indentation-guide show-properties" tabindex="-1">' +
    `<div class="markdown-preview-sizer markdown-preview-section" style="padding-bottom: 375px;">${content}</div>` +
    '</div></div></div></div></div></div></div></div></div></div></div></body></html>';
}

const result = {
  status: 'INCOMPLETE',
  scope: 'Standalone Chromium and WebKit with synthetic Obsidian 1.13.7 Reading View DOM, exact app CSS and bundled MathJax; not the native iOS shell, compositor, or Reading View virtualization.',
  cssSha256: qa.final.css_sha256,
  controlCssSha256: qa.sha(beforeCss),
  control: 'Final CSS with only the new Reading View overflow-x declaration block removed',
  scriptSha256: qa.hashFile(__filename),
  runtimeIdentitySha256: qa.hashFile(identityFile),
  appCssSha256: qa.sha(appCss),
  sourceAsarSha256: identity.source_sha256,
  mathJaxScriptSha256: qa.sha(asarAsset(mathScript)),
  fixtureSha256: qa.sha(html('light', true) + formula),
  startedAt: new Date().toISOString(), engines: {}, assets: {}, cases: [], errors: [],
};
const save = () => fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify(result, null, 2) + '\n');

async function typeset(page) {
  await page.evaluate(() => {
    window.MathJax = {
      loader: { paths: { mathjax: 'https://math-qa.invalid/lib/mathjax' } },
      chtml: { fontURL: 'https://math-qa.invalid/lib/mathjax/output/chtml/fonts/woff-v2' },
      tex: { inlineMath: [], displayMath: [], processEscapes: false, processEnvironments: false, processRefs: false },
      startup: { typeset: false },
      options: { enableMenu: false, renderActions: { assistiveMml: [] } },
    };
  });
  await page.addScriptTag({ url: 'https://math-qa.invalid/' + mathScript });
  await page.evaluate(async text => {
    await MathJax.startup.promise;
    document.querySelector('.math-block').append(MathJax.tex2chtml(text, { display: true }));
    document.head.append(MathJax.chtmlStylesheet());
    await document.fonts.ready;
  }, formula);
  await page.waitForFunction(() => {
    const math = document.querySelector('mjx-math');
    const glyphs = [...document.querySelectorAll('mjx-math mjx-c')];
    return document.querySelector('#MJX-CHTML-styles') && math?.getBoundingClientRect().width > 0 &&
      glyphs.length > 20 && glyphs.every(glyph => glyph.getBoundingClientRect().width > 0) &&
      document.fonts.status === 'loaded' && [...document.fonts].some(font => /MJX/.test(font.family) && font.status === 'loaded');
  });
  // A visible outer container is not sufficient: require stable inner math and
  // prose geometry for six consecutive animation frames after glyph fonts load.
  return page.evaluate(() => new Promise((resolve, reject) => {
    let previous, stable = 0, frames = 0;
    function tick() {
      const selectors = ['mjx-math', '#prose-before', '#prose-after'];
      const bounds = selectors.map(selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return [r.x, r.y, r.width, r.height];
      });
      const signature = JSON.stringify(bounds);
      stable = signature === previous ? stable + 1 : 0;
      previous = signature;
      frames++;
      if (stable >= 6) resolve({ stableFrames: stable, observedFrames: frames, bounds,
        loadedMathFonts: [...document.fonts].filter(font => /MJX/.test(font.family) && font.status === 'loaded').map(font => font.family),
        glyphCount: document.querySelectorAll('mjx-math mjx-c').length });
      else if (frames >= 180) reject(Error('Math or prose geometry did not settle'));
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
}

function sample() {
  const pane = document.querySelector('.markdown-preview-view');
  const equation = document.querySelector('mjx-container[display="true"]');
  const bounds = node => {
    const r = node.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width, height: r.height };
  };
  const prose = () => ['#prose-before', '#prose-after'].map(selector => bounds(document.querySelector(selector)));
  const baseline = prose();
  const glyphs = [...equation.querySelectorAll('mjx-c')].filter(glyph => glyph.getBoundingClientRect().width > 0);
  const edgeSample = () => ({ first: bounds(glyphs[0]), last: bounds(glyphs.at(-1)), scrollLeft: equation.scrollLeft, prose: prose() });
  equation.scrollLeft = 0;
  const start = edgeSample();
  equation.scrollLeft = equation.scrollWidth;
  const end = edgeSample();
  equation.scrollLeft = 0;
  const tables = [...document.querySelectorAll('.el-table')].map(wrapper => {
    const cells = [...wrapper.querySelectorAll('tbody td')];
    wrapper.scrollLeft = 0;
    const first = bounds(cells[0]);
    wrapper.scrollLeft = wrapper.scrollWidth;
    const last = bounds(cells.at(-1));
    const record = { range: wrapper.scrollWidth - wrapper.clientWidth, scrollLeft: wrapper.scrollLeft,
      viewport: bounds(wrapper), clientWidth: wrapper.clientWidth, first, last,
      mathScrollLeft: equation.scrollLeft, paneScrollLeft: pane.scrollLeft, prose: prose() };
    wrapper.scrollLeft = 0;
    return record;
  });
  const paneRange = pane.scrollWidth - pane.clientWidth;
  pane.scrollLeft = pane.scrollWidth;
  const paneScrollAttempt = { scrollLeft: pane.scrollLeft, prose: prose() };
  pane.scrollLeft = 0;
  return { pageOverflow: document.documentElement.scrollWidth - innerWidth,
    paneOverflow: paneRange, paneScrollLeft: pane.scrollLeft, paneScrollAttempt,
    pane: bounds(pane), paneClientWidth: pane.clientWidth, prose: baseline,
    math: { viewport: bounds(equation), clientWidth: equation.clientWidth, range: equation.scrollWidth - equation.clientWidth,
      overflowX: getComputedStyle(equation).overflowX, inner: bounds(equation.querySelector('mjx-math')), start, end },
    tables, tone: document.body.classList.contains('theme-dark') ? 'dark' : 'light',
    textFont: getComputedStyle(document.querySelector('#prose-before')).fontFamily,
    textSize: getComputedStyle(document.querySelector('#prose-before')).fontSize };
}

function sameProse(a, b, message) {
  for (let i = 0; i < a.length; i++) {
    assert(Math.abs(a[i].left - b[i].left) <= 1, `${message}: prose moved sideways`);
    assert(Math.abs(a[i].width - b[i].width) <= 1, `${message}: prose width changed`);
  }
}
function reachable(edge, viewport, clientWidth, message) {
  assert(edge.width > 0 && edge.height > 0, `${message}: empty content bounds`);
  assert(edge.left >= viewport.left - 1, `${message}: left edge clipped`);
  assert(edge.right <= viewport.left + clientWidth + 1, `${message}: right edge clipped`);
}

(async () => {
  save();
  for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    result.engines[engineName] = browser.version();
    try {
      for (const [width, height] of [[390, 844], [430, 932], [844, 390], [1280, 900]]) {
        for (const tone of ['light', 'dark']) {
          let control;
          for (const state of ['before', 'after']) {
            const page = await browser.newPage({ viewport: { width, height } });
            const requests = [], failures = [], pageErrors = [];
            page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
            page.on('pageerror', error => pageErrors.push(String(error)));
            await page.route('**/*', async route => {
              const url = new URL(route.request().url());
              if (url.hostname !== 'math-qa.invalid' || !url.pathname.startsWith('/lib/mathjax/')) {
                failures.push({ url: url.href, error: 'Unexpected external asset was blocked' });
                return route.abort();
              }
              const name = decodeURIComponent(url.pathname.slice(1));
              const data = asarAsset(name);
              const hash = qa.sha(data);
              result.assets[name] = hash;
              requests.push({ name, sha256: hash });
              await route.fulfill({ status: 200, body: data,
                contentType: name.endsWith('.woff') ? 'font/woff' : 'application/javascript',
                headers: { 'Access-Control-Allow-Origin': '*' } });
            });
            try {
              result.activeCase = { engine: engineName, width, height, tone, state }; save();
              await page.setContent(html(tone, width < 900));
              await page.addStyleTag({ content: appCss });
              await page.addStyleTag({ content: state === 'after' ? finalCss : beforeCss });
              const readiness = await typeset(page);
              const geometry = await page.evaluate(sample);
              assert.equal(geometry.tone, tone);
              assert.equal(failures.length, 0, JSON.stringify(failures));
              assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
              assert(requests.some(request => request.name.endsWith('.woff')), 'Bundled math fonts were not loaded');
              for (const table of geometry.tables) {
                reachable(table.first, table.viewport, table.clientWidth, 'Table first cell');
                reachable(table.last, table.viewport, table.clientWidth, 'Table final cell');
                assert.equal(table.mathScrollLeft, 0);
                assert.equal(table.paneScrollLeft, 0);
                sameProse(geometry.prose, table.prose, 'Independent table scrolling');
              }
              if (state === 'before') {
                control = geometry;
                if (width <= 430) assert(geometry.paneOverflow > 1, 'Phone control did not reproduce whole-note overflow');
              } else {
                assert(geometry.pageOverflow <= 1 && geometry.paneOverflow <= 1, 'The repaired note still overflows');
                assert(geometry.paneScrollAttempt.scrollLeft <= 1, 'The repaired note still scrolls horizontally');
                sameProse(geometry.prose, geometry.paneScrollAttempt.prose, 'Attempted note scroll');
                sameProse(control.prose, geometry.prose, 'Before/after layout');
                sameProse(geometry.prose, geometry.math.start.prose, 'Equation start');
                sameProse(geometry.prose, geometry.math.end.prose, 'Equation end');
                assert.equal(geometry.math.overflowX, 'auto');
                reachable(geometry.math.start.first, geometry.math.viewport, geometry.math.clientWidth, 'First math glyph');
                reachable(geometry.math.end.last, geometry.math.viewport, geometry.math.clientWidth, 'Final math glyph');
                if (width <= 430) assert(geometry.math.range > 1 && geometry.math.end.scrollLeft > 1, 'Wide equation did not scroll locally');
                assert(Math.abs(control.math.inner.width - geometry.math.inner.width) <= 1, 'The repair resized the equation');
              }
              const screenshot = `${engineName}-${width}-${tone}-${state}.png`;
              await page.screenshot({ path: path.join(out, screenshot) });
              result.cases.push({ engine: engineName, width, height, tone, state,
                caseKey: [engineName, width, tone, state].join('|'), cssSha256: state === 'after' ? result.cssSha256 : result.controlCssSha256,
                readiness, ...geometry, requests, failures, pageErrors, screenshot,
                screenshotSha256: qa.hashFile(path.join(out, screenshot)) });
              delete result.activeCase; save();
              console.log(JSON.stringify({ engine: engineName, width, tone, state, paneOverflow: geometry.paneOverflow, equationRange: geometry.math.range, status: 'PASS' }));
            } finally { await page.close(); }
          }
        }
      }
    } finally { await browser.close(); }
  }
  assert.equal(result.cases.length, 32);
  assert.equal(new Set(result.cases.map(row => row.caseKey)).size, 32);
  result.status = 'PASS';
  result.finishedAt = new Date().toISOString();
  save();
})().catch(error => {
  result.status = 'FAIL'; result.errors.push(String(error.stack)); save(); console.error(error); process.exitCode = 1;
});
