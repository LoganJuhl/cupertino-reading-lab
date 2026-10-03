/* Synthetic DOM + locally extracted Obsidian CSS. No native-device claim. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
assert(process.env.QA_APP_CSS, 'Set QA_APP_CSS to the locally extracted Obsidian app.css');
const appCss = fs.readFileSync(path.resolve(process.env.QA_APP_CSS), 'utf8');
const current = fs.readFileSync(path.join(root, 'theme.css'), 'utf8');
const out = path.resolve(process.env.QA_WIDTH_EVIDENCE || path.join(root, 'reports', 'width-fallbacks-' + Date.now()));
fs.mkdirSync(out, { recursive: true });
const report = path.join(out, 'RESULTS.json');
assert(!fs.existsSync(report), 'Use a new evidence folder; retain earlier attempts');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const result = {
  status: 'INCOMPLETE',
  scope: 'Synthetic drawer/banner DOM with local Obsidian CSS in headless Chromium/WebKit. Rejecting stretch is simulated by removing those declarations; this is not an older WebKit or native iOS run.',
  cssSha256: sha(current), appCssSha256: sha(appCss), scriptSha256: sha(fs.readFileSync(__filename)),
  cases: [], errors: [],
};
const save = () => fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
save();

function variant({ removeFallback = false, removeStretch = false } = {}) {
  const ast = postcss.parse(current);
  let count = 0;
  ast.walkDecls('width', decl => {
    if (decl.value !== 'stretch') return;
    const fallback = decl.prev();
    assert(fallback?.prop === 'width' && fallback.value === '-webkit-fill-available', 'Missing fallback immediately before stretch');
    count++;
    if (removeFallback) fallback.remove();
    if (removeStretch) decl.remove();
  });
  assert.equal(count, 3, 'Review new stretch surfaces before changing this matrix');
  return ast.toString();
}

const drawer = '<div class="workspace-drawer mod-left"><div class="workspace-drawer-inner"><div class="nav-header"><div class="search-input-container"><input placeholder="Search"></div></div><div class="search-row"><div class="search-input-container global-search-input-container"><input placeholder="Find"></div></div><div class="workspace-drawer-tab-options"><div class="workspace-drawer-tab-select"><div class="workspace-tab-header-inner"><div class="workspace-tab-header-inner-title">Files</div></div></div></div></div></div>';
function banner(intrinsicWidth) {
  const image = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${intrinsicWidth}" height="100"/>`).toString('base64');
  return '<div class="mod-root"><div class="view-content"><div class="markdown-preview-view banner"><img alt="banner" src="data:image/svg+xml;base64,' + image + '"></div></div></div>';
}

async function sample(page, css, kind, tone, collapsed) {
  const html = kind === 'drawer' ? drawer : banner(kind === 'small-banner' ? 100 : 1600);
  // Scaffolding gives the synthetic reading surface a containing block. Drawer
  // layout and all measured widths/margins come from app + theme stylesheets.
  await page.setContent('<!doctype html><html><head><style>' + appCss + '\n' + css + '</style><style>body{margin:0}*,*::before,*::after{animation:none!important;transition:none!important}.mod-root{width:100%}.view-content,.markdown-preview-view{position:relative;width:100%;height:500px}</style></head><body class="theme-' + tone + ' mod-macos is-mobile is-phone">' + html + '</body></html>');
  await page.evaluate(async collapsed => {
    document.querySelector('.workspace-drawer-tab-options')?.classList.toggle('is-collapsed', collapsed);
    await Promise.all([...document.images].map(img => img.decode()));
    await document.fonts.ready;
  }, collapsed);
  return page.evaluate(kind => {
    const selectors = kind === 'drawer'
      ? ['.nav-header > .search-input-container', '.search-row', '.workspace-drawer-tab-options']
      : ['img[alt="banner"]'];
    return selectors.map(selector => {
      const el = document.querySelector(selector), rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      const parent = document.querySelector(kind === 'drawer' ? '.workspace-drawer-inner' : '.markdown-preview-view');
      const parentRect = parent.getBoundingClientRect();
      const start = kind === 'drawer' ? parseFloat(style.marginLeft) : parseFloat(style.left);
      const end = kind === 'drawer' ? parseFloat(style.marginRight) : parseFloat(style.right);
      return { selector, x: rect.x, width: rect.width, expectedX: parentRect.x + start, expectedWidth: parent.clientWidth - start - end, overflow: el.scrollWidth - el.clientWidth };
    });
  }, kind);
}

function same(a, b) {
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) for (const key of ['x', 'width', 'overflow']) {
    assert(Math.abs(a[i][key] - b[i][key]) <= 1, `${a[i].selector}: changed ${key}`);
  }
}

(async () => {
  const variants = {
    current: variant(), modernWithoutFallback: variant({ removeFallback: true }),
    simulatedLegacy: variant({ removeStretch: true }),
    simulatedLegacyWithoutFallback: variant({ removeFallback: true, removeStretch: true }),
  };
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.route('**/*', route => route.abort());
      const support = await page.evaluate(() => ({ stretch: CSS.supports('width', 'stretch'), fill: CSS.supports('width', '-webkit-fill-available') }));
      assert(support.fill, 'This engine cannot exercise the fallback');
      for (const width of [320, 390, 932]) for (const tone of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 844 });
        for (const kind of ['drawer', 'small-banner', 'large-banner']) for (const collapsed of kind === 'drawer' ? [false, true] : [false]) {
          const row = { engine, engineVersion: browser.version(), support, width, tone, kind, collapsed, samples: {} };
          result.activeCase = row; save();
          for (const [name, css] of Object.entries(variants)) row.samples[name] = await sample(page, css, kind, tone, collapsed);
          const samples = row.samples;
          for (const metric of samples.current) {
            assert(Math.abs(metric.width - metric.expectedWidth) <= 1, `${metric.selector}: available width not filled`);
            assert(Math.abs(metric.x - metric.expectedX) <= 1, `${metric.selector}: inset changed`);
            assert(metric.overflow <= 1, `${metric.selector}: contents overflow`);
          }
          same(samples.current, samples.simulatedLegacy);
          if (support.stretch) same(samples.current, samples.modernWithoutFallback);
          // Negative controls must expose each affected surface; auto-sized
          // search rows and already-large images need not visibly differ.
          const affected = kind === 'drawer' ? [0, 2] : kind === 'small-banner' ? [0] : [];
          for (const i of affected) assert(Math.abs(samples.current[i].width - samples.simulatedLegacyWithoutFallback[i].width) > 1, 'Negative control did not expose the missing fallback');
          result.cases.push(row); delete result.activeCase; save();
        }
      }
    } finally { await browser.close(); }
  }
  assert.equal(result.cases.length, 48);
  result.status = 'PASS'; save();
  console.log(JSON.stringify({ status: result.status, cases: result.cases.length, variantsPerCase: 4, cssSha256: result.cssSha256 }));
})().catch(error => { result.status = 'FAIL'; result.errors.push(String(error.stack)); save(); console.error(error); process.exitCode = 1; });
