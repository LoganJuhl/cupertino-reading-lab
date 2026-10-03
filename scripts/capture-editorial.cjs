/* Matched actual-app long-form captures. A visual review, not a flicker proof. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {chromium} = require('playwright');
const qa = require('./config.cjs');
const result = {scope: 'Matched original long-form prose in actual desktop Obsidian and mobile emulation; QA-only static Newsreader faces.', cases: [], errors: []};
(async () => {
  const browser = await chromium.connectOverCDP(qa.endpoint);
  try {
    const page = browser.contexts()[0].pages().find(p => p.url().includes('index.html'));
    await qa.guard(page, result);
    page.on('pageerror', e => result.errors.push(String(e)));
    const file = 'QA Editorial.md';
    result.fixtureSha256 = qa.hashFile(path.join(qa.root, 'design/fixtures', file));
    for (const [geometry, width, height, mobile] of [['portrait',430,932,true], ['desktop',1280,900,false]]) {
      await page.setViewportSize({width,height});
      if ((await page.evaluate(() => app.isMobile)) !== mobile) {
        await Promise.all([page.waitForEvent('domcontentloaded'), page.evaluate(m => app.emulateMobile(m), mobile)]);
        await page.waitForFunction(() => typeof app !== 'undefined' && app.workspace?.layoutReady);
      }
      result.qaFonts = await qa.loadFonts(page);
      for (const tone of qa.tones) for (const stage of [qa.baseline, qa.final]) {
        await page.evaluate(async ({file,tone}) => {
          app.workspace.leftSplit?.collapse(); app.workspace.rightSplit?.collapse();
          for (const [key,value] of Object.entries({baseFontSize:23,textFontFamily:'Newsreader',showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false,theme:tone==='light'?'moonstone':'obsidian'})) app.vault.setConfig(key,value);
          app.updateFontSize(); app.updateFontFamily(); app.updateTheme();
          app.updateAutoFullScreenDisplay(); app.updateFloatingNavigationDisplay();
          await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:'preview'}});
        }, {file,tone});
        await page.waitForTimeout(500);
        await qa.selectTheme(page,stage);
        const toneState=await qa.stabilizeTone(page,tone,stage,{baseFontSize:23,textFontFamily:'Newsreader',showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false});
        await page.evaluate(async () => {
          document.querySelector('.markdown-reading-view > .markdown-preview-view').scrollTop=0;
          await document.fonts.ready;
          await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime) && a.effect.getComputedTiming().endTime<2000).map(a=>a.finished.catch(()=>{})));
        });
        await page.waitForTimeout(200);
        const prefix = stage.name === qa.final.name ? 'v4' : 'v3';
        const screenshots = [];
        for (const [position, scrollTop] of [['top',0],['prose',geometry==='portrait'?660:500]]) {
          await page.evaluate(y => document.querySelector('.markdown-reading-view > .markdown-preview-view').scrollTop=y,scrollTop);
          await page.waitForTimeout(180);
          // Restore through the native app API after scrolling. Otherwise its
          // automatic navigation hiding can confound the visual comparison.
          await page.evaluate(() => app.mobileNavbar?.restoreNavigation());
          await page.waitForTimeout(350);
          const observedTone=await qa.assertTone(page,tone,stage);
          const observation = await page.evaluate(() => {
            const root=document.querySelector('.markdown-reading-view > .markdown-preview-view');
            const paragraphs=[...root.querySelectorAll('p')].filter(e=>e.getBoundingClientRect().height>0);
            const visible=paragraphs.filter(e=>{const r=e.getBoundingClientRect();return r.bottom>100 && r.top<innerHeight-80});
            const p=visible[0], s=p&&getComputedStyle(p);
            return {visibleParagraphs:visible.length,overflow:document.documentElement.scrollWidth-innerWidth,scrollTop:root.scrollTop,bodyClasses:document.body.className,autoFullScreen:app.vault.getConfig('autoFullScreen'),floatingNavigation:app.vault.getConfig('floatingNavigation'),
              body:s&&{size:s.fontSize,lineHeight:s.lineHeight,font:s.fontFamily,width:p.getBoundingClientRect().width},
              paragraphs:paragraphs.slice(0,5).map(p=>({text:p.textContent.slice(0,60),box:p.getBoundingClientRect().toJSON(),marginTop:getComputedStyle(p).marginTop,marginBottom:getComputedStyle(p).marginBottom}))};
          });
          assert(observation.visibleParagraphs>0); assert(observation.overflow<=1);
          const name=`${prefix}-editorial-${geometry}-${tone}-${position}.png`;
          const captureTone=await qa.screenshot(page,{path:path.join(qa.out,name)},tone,stage);
          screenshots.push({file:name,sha256:qa.hashFile(path.join(qa.out,name)),position,toneState:observedTone,captureTone,...observation});
        }
        result.cases.push({theme:stage.name,cssSha256:stage.css_sha256,geometry,tone,toneState,toneAfter:await qa.assertTone(page,tone,stage),size:23,screenshots});
      }
    }
    assert.equal(result.cases.length,8); assert.equal(result.errors.length,0);
    result.status='PASS';
    result.scriptSha256=qa.hashFile(__filename);
    result.configSha256=qa.hashFile(path.join(qa.root,'scripts/config.cjs'));
    fs.writeFileSync(path.join(qa.out,'EDITORIAL.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({editorialCases:8,screenshots:16,status:'PASS'}));
  } finally { await browser.close(); }
})().catch(e=>{fs.writeFileSync(path.join(qa.out,'EDITORIAL-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1;});
