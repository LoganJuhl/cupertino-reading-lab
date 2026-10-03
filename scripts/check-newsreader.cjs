/* Supplemental actual-app typography comparison with a QA-only font fixture.
 * This is NOT a system-font/iPhone flicker reproduction. No asset enters theme.css.
 */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const qa=require('./config.cjs');
const {root,out}=qa;
const stages=qa.stages;
const result={scope:'Supplemental Obsidian render with Newsreader loaded through the FontFace API only in a disposable page. Theme CSS remains unchanged and has no embedded font. Native system-font flicker acceptance remains pending.',cases:[],scrolls:[]};
qa.begin('NEWSREADER',result);
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
 const p=b.contexts()[0].pages().find(p=>p.url().includes('index.html'));
 await qa.guard(p,result);
 if(!await p.evaluate(()=>app.isMobile)){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(()=>app.emulateMobile(true))]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
 result.fontAssets=await qa.loadFonts(p);
 for(const [geometry,width,height]of [['portrait',430,932],['landscape',932,430]])for(const tone of ['light','dark'])for(const theme of [qa.baseline.name,qa.final.name]){
  await p.setViewportSize({width,height});
  await p.evaluate(async({tone,surfaceFile})=>{for(const[k,v]of Object.entries({baseFontSize:23,textFontFamily:'Newsreader',readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);app.updateFontSize();app.updateFontFamily();app.updateTheme();app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:surfaceFile,mode:'preview'}})},{tone,surfaceFile:qa.surfaceFile});
  await p.waitForTimeout(500);await p.evaluate(theme=>app.customCss.setTheme(theme),theme);
  await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,stages.find(s=>s.name===theme));
  const toneState=await qa.stabilizeTone(p,tone,theme,{baseFontSize:23,textFontFamily:'Newsreader',readableLineLength:true});
  await p.evaluate(()=>{document.querySelector('.markdown-reading-view > .markdown-preview-view').scrollTop=0;return document.fonts.ready});await p.waitForTimeout(180);
  const session=await p.context().newCDPSession(p);await session.send('DOM.enable');await session.send('CSS.enable');
  const doc=await session.send('DOM.getDocument');const found=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.markdown-reading-view > .markdown-preview-view p'});
  const fonts=await session.send('CSS.getPlatformFontsForNode',{nodeId:found.nodeId});
  assert(fonts.fonts.some(f=>f.familyName.toLowerCase().includes('newsreader')),'Newsreader fixture did not render');
  await qa.assertTone(p,tone,theme);
  const observations=await p.evaluate(()=>{const s=document.querySelector('.markdown-reading-view > .markdown-preview-view'),p=s.querySelector('p'),h=s.querySelector('h1'),c=getComputedStyle(p);return{size:c.fontSize,paragraphHeight:p.getBoundingClientRect().height,headingOptical:getComputedStyle(h).fontVariationSettings,overflow:document.documentElement.scrollWidth-innerWidth}});
  assert.equal(observations.size,'23px');assert(observations.overflow<=1);
  const label=theme===qa.final.name?'v4':'v3';await qa.screenshot(p,{path:path.join(out,`${label}-newsreader-${geometry}-${tone}.png`)},tone,theme);
  await p.evaluate(()=>{const s=document.querySelector('.markdown-reading-view > .markdown-preview-view');s.scrollTop=440});await p.waitForTimeout(150);
  await qa.screenshot(p,{path:path.join(out,`${label}-newsreader-${geometry}-${tone}-emphasis.png`)},tone,theme);
  await qa.assertTone(p,tone,theme);
  const emphasis=await p.evaluate(()=>{const root=document.querySelector('.markdown-reading-view > .markdown-preview-view'),a=root.querySelector('a.external-link'),m=root.querySelector('mark');return {link:a?{thickness:getComputedStyle(a).textDecorationThickness,offset:getComputedStyle(a).textUnderlineOffset}:null,highlight:m?{radius:getComputedStyle(m).borderRadius,padding:getComputedStyle(m).padding,decoration:getComputedStyle(m).boxDecorationBreak}:null}});
  result.cases.push({geometry,tone,toneState,toneAfter:await qa.assertTone(p,tone,theme),theme,cssSha256:stages.find(s=>s.name===theme).css_sha256,fonts:fonts.fonts,observations,emphasis});
  await session.detach();
 }
 // Exercise the actual Newsreader glyphs after loading has completed. This
 // supplements, rather than substitutes for, the native system-font comparison.
 await p.setViewportSize({width:430,height:932});
 for(const theme of [qa.baseline.name,qa.final.name]){
  const tone='dark';
  await p.evaluate(async theme=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Long.md',mode:'preview'}});app.customCss.setTheme(theme)},theme);
  await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,stages.find(s=>s.name===theme));
  await qa.stabilizeTone(p,tone,theme,{baseFontSize:23,textFontFamily:'Newsreader',readableLineLength:true});
  await p.evaluate(()=>document.querySelector('.markdown-reading-view > .markdown-preview-view').scrollTop=0);await p.waitForTimeout(200);
  const before=await p.evaluate(()=>document.querySelector('.markdown-reading-view > .markdown-preview-view h1').getBoundingClientRect().toJSON());
  for(const fraction of [.2,.85,.1,.95,.4,0]){
   await p.evaluate(f=>{const e=document.querySelector('.markdown-reading-view > .markdown-preview-view');e.scrollTop=(e.scrollHeight-e.clientHeight)*f},fraction);await p.waitForTimeout(150);
   const toneState=await qa.assertTone(p,tone,theme);
   const observed=await p.evaluate(()=>{const e=document.querySelector('.markdown-reading-view > .markdown-preview-view');return {visible:[...e.querySelectorAll('p,h1,h2')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.bottom>100&&r.top<innerHeight-80}).length,overflow:document.documentElement.scrollWidth-innerWidth,fontStatus:document.fonts.status}});
   assert(observed.visible>0);assert(observed.overflow<=1);assert.equal(observed.fontStatus,'loaded');result.scrolls.push({theme,tone,toneState,toneAfter:await qa.assertTone(p,tone,theme),fraction,...observed});
  }
  const after=await p.evaluate(()=>document.querySelector('.markdown-reading-view > .markdown-preview-view h1').getBoundingClientRect().toJSON());assert(Math.abs(before.y-after.y)<1);
 }
 qa.finish('NEWSREADER',result);console.log(JSON.stringify({newsreaderCases:result.cases.length,scrollObservations:result.scrolls.length}));
}finally{await b.close()}})().catch(e=>{fs.writeFileSync(path.join(out,'NEWSREADER-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1});
