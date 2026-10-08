/* Selector gate by default; --render adds local Obsidian CSS + browser checks. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const postcss = require('postcss');
const selectors = require('postcss-selector-parser');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'theme.css'), 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');

function audit(text) {
  const counts = { width: 0, background: 0, corners: 0 };
  postcss.parse(text).walkRules(rule => {
    const declarations = Object.fromEntries(rule.nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]));
    let kind;
    if (rule.selector.includes('body:not(.full-width-media-off)')) {
      if (declarations.width === '100%') kind = 'width';
      if (declarations.background === 'var(--background-primary-alt)') kind = 'background';
    }
    if (rule.selector.includes('.img-100') && declarations['border-radius'] === '0') kind = 'corners';
    if (!kind) return;
    selectors().astSync(rule.selector).each(selector => {
      const image = selector.nodes.find(n => n.type === 'tag' && n.value === 'img');
      if (!image) return;
      const compound = selector.nodes.slice(selector.nodes.indexOf(image) + 1);
      const boundary = compound.findIndex(n => n.type === 'combinator');
      const excludesSwatch = compound.slice(0, boundary < 0 ? undefined : boundary).some(n =>
        n.type === 'pseudo' && n.value === ':not' && n.nodes.some(option =>
          option.nodes.length === 1 && option.nodes[0].type === 'class' && option.nodes[0].value === 'highlight-swatch'));
      assert(excludesSwatch, `${kind} rule catches highlight swatches: ${selector}`);
      counts[kind]++;
    });
  });
  assert.deepEqual(counts, { width: 2, background: 2, corners: 2 }, 'Review both editor and preview image branches');
  return counts;
}

const coverage = audit(css);
// Each individual missing exclusion must be detected, not just one known rule.
for (let index = 0; index < 6; index++) {
  let seen = 0;
  const broken = css.replace(/\.highlight-swatch,/g, token => seen++ === index ? '' : token);
  assert.equal(seen, 6);
  assert.throws(() => audit(broken), /rule catches highlight swatches/);
}
if (!process.argv.includes('--render')) {
  console.log(JSON.stringify({ status: 'PASS', coverage, negativeControls: 6, cssSha256: sha(css) }));
} else {
  render().catch(error => { console.error(error); process.exitCode = 1; });
}

async function render() {
  assert(process.env.QA_APP_CSS, 'Set QA_APP_CSS to locally extracted Obsidian app.css');
  const appCss = fs.readFileSync(path.resolve(process.env.QA_APP_CSS), 'utf8');
  const baseline = css.replaceAll('.highlight-swatch,', '');
  const out = path.resolve(process.env.QA_HIGHLIGHT_EVIDENCE || path.join(root, 'reports', 'highlight-' + Date.now()));
  fs.mkdirSync(out, { recursive: true });
  const reportFile = path.join(out, 'RESULTS.json');
  assert(!fs.existsSync(reportFile), 'Preserve earlier evidence; choose a new output folder');
  const result = { status: 'INCOMPLETE', scope: 'Synthetic widget DOM and real local app CSS; preview branch is selector coverage, not a native Reading View widget. No native interaction or mobile claim.', cssSha256: sha(css), baselineCssSha256: sha(baseline), appCssSha256: sha(appCss), scriptSha256: sha(fs.readFileSync(__filename)), coverage, cases: [] };
  const save = () => fs.writeFileSync(reportFile, JSON.stringify(result, null, 2) + '\n');
  const { chromium, webkit } = require('playwright');
  const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"/>').toString('base64');
  const swatches = ['red', 'blue'].map(color => `<span class="cm-highlight-color-widget" data-highlight="${color}"><img id="${color}" class="highlight-swatch" data-highlight="${color}" draggable="false" src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'>\u200b</span><span class="cm-highlight cm-highlight-${color}">Highlighted text</span>`).join('<br>');
  const controls = { ordinary: '', sized: 'width="80"', emoji: 'class="emoji"', favicon: 'class="link-favicon"', buffer: 'class="cm-widgetBuffer"', banner: 'alt="banner"' };
  const content = `<div class="cm-line">${swatches}</div>` + Object.entries(controls).map(([id, attrs]) => `<div class="cm-line"><img id="${id}" ${attrs} src="${image}"></div>`).join('');
  const scaffold = 'html,body{margin:0;min-height:100%;overflow:auto}.workspace-leaf-content,.view-content{position:relative;width:100%;height:900px}.markdown-source-view{width:100%;height:900px}.cm-editor,.cm-scroller,.cm-content{width:100%;min-width:0;box-sizing:border-box}.cm-editor{display:flex;flex-direction:column}.cm-scroller{overflow:auto;display:flex}.cm-content{min-height:400px;flex:1}.markdown-preview-sizer{width:100%;min-height:400px}';
  async function sample(page, theme, c) {
    const inner = c.branch === 'editor'
      ? `<div class="markdown-source-view mod-cm6 is-live-preview ${c.helper}"><div class="cm-editor cm-s-obsidian"><div class="cm-scroller"><div class="cm-sizer"><div class="cm-contentContainer"><div class="cm-content">${content}</div></div></div></div></div></div>`
      : `<div class="markdown-reading-view"><div class="markdown-preview-view cm-s-obsidian ${c.helper}"><div class="markdown-preview-sizer">${content}</div></div></div>`;
    await page.setContent(`<!doctype html><html><head><style>${appCss}\n${theme}\n${scaffold}</style></head><body class="mod-macos theme-${c.tone}${c.mediaOff ? ' full-width-media-off' : ''}${c.blockOff ? ' block-width-off' : ''}"><div class="workspace-leaf-content" data-type="markdown"><div class="view-content">${inner}</div></div></body></html>`);
    await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode())); await document.fonts.ready; });
    return page.evaluate(() => {
      const metric = el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return { width: r.width, height: r.height, background: s.backgroundColor, radius: s.borderRadius, objectFit: s.objectFit, fontSize: parseFloat(s.fontSize) };
      };
      const samples = Object.fromEntries([...document.querySelectorAll('img[id]')].map(img => [img.id, metric(img)]));
      for (const color of ['red', 'blue']) {
        const probe = document.createElement('span');
        probe.style.backgroundColor = `var(--color-${color})`;
        document.getElementById(color).parentElement.append(probe);
        samples[color].expectedColor = getComputedStyle(probe).backgroundColor;
        probe.remove();
      }
      samples.containerWidth = document.querySelector('.cm-content,.markdown-preview-sizer').getBoundingClientRect().width;
      return samples;
    });
  }
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      const browser = await type.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.route('**/*', route => route.abort());
        for (const width of [390, 900]) for (const tone of ['light', 'dark'])
          for (const branch of ['editor', 'preview']) for (const helper of ['', 'img-wide', 'img-max', 'img-100'])
            for (const mediaOff of [false, true]) for (const blockOff of [false, true]) {
              const c = { engine, engineVersion: browser.version(), width, tone, branch, helper, mediaOff, blockOff };
              result.activeCase = c; save();
              await page.setViewportSize({ width, height: 1000 });
              const before = await sample(page, baseline, c), after = await sample(page, css, c);
              c.before = before; c.after = after;
              assert(before.containerWidth > 200 && after.containerWidth > 200, 'Invalid fixture containing block');
              for (const color of ['red', 'blue']) {
                const swatch = after[color];
                assert(Math.abs(swatch.width - swatch.fontSize * 0.9) < 1, 'Swatch width differs from native 0.9em');
                assert(Math.abs(swatch.height - swatch.width) < 1, 'Swatch must be square');
                assert.equal(swatch.radius, '50%', 'Swatch must remain circular');
                assert.equal(swatch.background, swatch.expectedColor, 'Swatch lost its themed color');
                if (!mediaOff) {
                  assert(before[color].width > swatch.width * 3, 'Negative control did not expose width defect');
                  assert.notEqual(before[color].background, before[color].expectedColor, 'Negative control did not expose color defect');
                }
                if (helper === 'img-100' && !blockOff) assert.equal(before[color].radius, '0px', 'Negative control did not expose helper corner defect');
              }
              for (const id of Object.keys(controls)) assert.deepEqual(after[id], before[id], `${id} image changed`);
              result.cases.push(c); delete result.activeCase; save();
            }
      } finally { await browser.close(); }
    }
    assert.equal(result.cases.length, 256);
    result.status = 'PASS'; save();
    console.log(JSON.stringify({ status: result.status, cases: result.cases.length, variantsPerCase: 2, cssSha256: result.cssSha256 }));
  } catch (error) { result.status = 'FAIL'; result.error = String(error.stack); save(); throw error; }
}
