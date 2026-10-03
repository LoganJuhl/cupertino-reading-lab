/* Changed surfaces exercised in a real, guarded scratch-vault Obsidian app. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('playwright');
const qa=require('./config.cjs');
const {root,out,vault}=qa;
const build={stages:qa.stages};
const result={scope:'Real Obsidian 1.13.7 in isolated desktop app; mobile emulation, not native iOS.',cases:[],comparisons:[],errors:[]};
result.cssSha256=build.stages.at(-1).css_sha256;
let p,requestedTone,requestedTheme;
async function settle(){await p.waitForTimeout(250);await p.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)&&a.effect.getComputedTiming().endTime<2000).map(a=>a.finished.catch(()=>{}))));await p.evaluate(()=>document.fonts.ready)}
async function geometry(width,height,mobile){
 await p.setViewportSize({width,height});
 if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
}
async function setup(theme,tone,mode,file){
 requestedTone=tone;requestedTheme=theme;
 await p.evaluate(async({theme,tone,mode,file})=>{
  app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.customCss.setTheme(theme);
  for(const [k,v]of Object.entries({baseFontSize:20,textFontFamily:'Arial',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);
  app.updateFontSize();app.updateFontFamily();app.updateTheme();app.updateInlineTitleDisplay();
  await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:false}});
 },{theme,tone,mode,file});
 await settle();
 await p.evaluate(t=>app.customCss.setTheme(t),theme);
 await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,build.stages.find(s=>s.name===theme));
 const toneState=await qa.stabilizeTone(p,tone,theme,{baseFontSize:20,textFontFamily:'Arial',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true});
 const loaded=await p.evaluate(()=>app.customCss.styleEl.textContent);
 assert.equal(crypto.createHash('sha256').update(loaded).digest('hex'),build.stages.find(s=>s.name===theme).css_sha256);
 await scroll(mode,0);
 return toneState;
}
async function scroll(mode,y){await p.evaluate(({mode,y})=>document.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller').scrollTop=y,{mode,y});await p.waitForTimeout(120)}
async function tables(mode){
 await qa.assertTone(p,requestedTone,requestedTheme);
 return p.evaluate(mode=>{
  const root=document.querySelector(mode==='reading'?'.markdown-reading-view':'.markdown-source-view');
  return [...root.querySelectorAll('table')].filter(t=>{const r=t.getBoundingClientRect();return r.width&&r.height&&r.bottom>80&&r.top<innerHeight-80}).map(t=>{
   const s=getComputedStyle(t),cells=[...t.querySelectorAll('th,td')];
   let scroller=t.parentElement;
   while(scroller&&!(getComputedStyle(scroller).overflowX==='auto'&&scroller.scrollWidth>scroller.clientWidth+1))scroller=scroller.parentElement;
   let travel=null;
   if(scroller){scroller.scrollLeft=0;const before=scroller.scrollLeft;scroller.scrollLeft=scroller.scrollWidth;const after=scroller.scrollLeft;
    const last=t.querySelector('tr:last-child > :last-child').getBoundingClientRect(),box=scroller.getBoundingClientRect();
    travel={before,after,owner:scroller.className,viewport:scroller.clientWidth,width:scroller.scrollWidth,lastRight:last.right,clipRight:box.right};scroller.scrollLeft=0}
   return {id:cells.filter(c=>c.tagName==='TH').map(c=>c.textContent).join('|'),collapse:s.borderCollapse,wordBreak:s.wordBreak,
    background:getComputedStyle(t.querySelector('tbody')).backgroundColor,travel,
    cells:cells.map(c=>{const e=c.querySelector('.table-cell-wrapper')||c,st=getComputedStyle(c),r=e.getBoundingClientRect();return {text:c.textContent,whiteSpace:st.whiteSpace,radius:st.borderRadius,
     side:st.borderInlineStartWidth,bottom:st.borderBottomWidth,align:st.textAlign,font:st.fontFamily,size:st.fontSize,
     height:r.height,lineHeight:parseFloat(getComputedStyle(e).lineHeight),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}}),
    overflow:document.documentElement.scrollWidth-innerWidth};
  });
 },mode);
}
async function callouts(mode){
 await qa.assertTone(p,requestedTone,requestedTheme);
 return p.evaluate(mode=>{
  const root=document.querySelector(mode==='reading'?'.markdown-reading-view':'.markdown-source-view');
  return [...root.querySelectorAll('.callout')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.bottom>80&&r.top<innerHeight-80}).map(e=>{
   const s=getComputedStyle(e),title=e.querySelector(':scope > .callout-title > .callout-title-inner'),icon=e.querySelector(':scope > .callout-title > .callout-icon');
   const ts=getComputedStyle(title),content=e.querySelector(':scope > .callout-content');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');context.fillStyle=s.borderLeftColor;context.fillRect(0,0,1,1);
   const borderRgba=[...context.getImageData(0,0,1,1).data];
   const infoToken=s.getPropertyValue('--callout-info').trim();
   const infoColor=CSS.supports('color',infoToken)?infoToken:'rgb('+infoToken+')';
   if(!CSS.supports('color',infoColor))throw Error('Unresolved info reference color: '+infoColor);
   context.clearRect(0,0,1,1);context.fillStyle=infoColor;context.fillRect(0,0,1,1);
   const infoBorderRgba=[...context.getImageData(0,0,1,1).data];
   return {type:e.dataset.callout,title:title.textContent,background:s.backgroundColor,image:s.backgroundImage,borderRgba,infoBorderRgba,
    contentInset:getComputedStyle(content).marginLeft,
    border:s.borderLeftWidth,borderColor:s.borderLeftColor,radius:s.borderRadius,shadow:s.boxShadow,
    titleColor:ts.color,titleSize:ts.fontSize,titleWeight:ts.fontWeight,titleFont:ts.fontFamily,uppercase:ts.textTransform,
    icon:icon?getComputedStyle(icon).display:null,fold:!!e.querySelector(':scope > .callout-title > .callout-fold')};
  });
 },mode);
}
async function drawer(tone){
 await p.evaluate(async()=>{
  await app.internalPlugins.getPluginById('file-explorer').enable(true);
  const leaves=app.workspace.getLeavesOfType('file-explorer');
  const leaf=leaves[0]||app.workspace.getLeftLeaf(false);await leaf.setViewState({type:'empty'});await leaf.setViewState({type:'file-explorer'});
  app.workspace.revealLeaf(leaf);app.workspace.leftSplit.expand();
 });await settle();
 await qa.assertTone(p,tone,requestedTheme);
 return p.evaluate(()=>{
  const props=['--background-primary','--background-secondary','--mobile-sidebar-background','--modal-sidebar-background'];
  const b=getComputedStyle(document.body),drawer=[...document.querySelectorAll('.workspace-drawer')].find(e=>e.getBoundingClientRect().width>0);
  const card=document.querySelector('.nav-files-container > div');
  const tokens=Object.fromEntries(props.map(x=>[x,b.getPropertyValue(x).trim()]));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
  const tokenRgba=Object.fromEntries(Object.entries(tokens).map(([name,value])=>{if(!CSS.supports('color',value))throw Error('Invalid drawer token '+name);ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [name,[...ctx.getImageData(0,0,1,1).data]]}));
  return {tokens,tokenRgba,drawer:drawer?getComputedStyle(drawer).backgroundColor:null,
   card:card?getComputedStyle(card).backgroundColor:null,overflow:document.documentElement.scrollWidth-innerWidth};
 });
}
qa.begin('FOCUS',result);
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
 p=b.contexts()[0].pages().find(p=>p.url().includes('index.html'));
 await qa.guard(p,result);
 p.on('pageerror',e=>result.errors.push(String(e)));
 // Remove only generated interaction fixtures, in the guarded disposable vault.
 await p.evaluate(async()=>{
  await app.workspace.activeLeaf.setViewState({type:'empty'});
  for(const f of app.vault.getFiles())if(/^QA Editing \d+ (?:narrow-desktop|portrait|desktop) (?:light|dark)\.md$/.test(f.path)||f.path==='QA Table Editing.md')await app.vault.delete(f);
 });

 // File Explorer is enabled only in the disposable QA vault.
 for(const [name,w,h,mobile]of [['portrait',430,932,true],['landscape',932,430,true],['desktop',1280,900,false]]){
  await geometry(w,h,mobile);
  for(const tone of ['light','dark'])for(const mode of ['reading','live']){
   const record={geometry:name,tone,mode,tables:[],callouts:[]};
   for(const file of ['QA Tables Simple.md','QA Tables Wide.md']){
    record.toneState=await setup(qa.final.name,tone,mode,file);
    const seen=new Map();
    for(let y=0;y<2600;y+=Math.max(190,h*.55)){await scroll(mode,y);for(const t of await tables(mode))seen.set(t.id,t)}
    assert.equal(seen.size,file.includes('Simple')?1:3,'A table was never exposed');
    for(const t of seen.values()){
     assert.equal(t.collapse,'collapse');assert.equal(t.wordBreak,'normal');assert.equal(t.background,'rgba(0, 0, 0, 0)');assert(t.overflow<=1);
     assert(t.cells.every(c=>c.whiteSpace==='normal'&&c.radius==='0px'&&c.side==='0px'&&c.bottom==='1px'));
     assert(t.cells.every(c=>c.scrollWidth<=c.clientWidth+2),'Cell content clipped');
     if(t.travel){assert(t.travel.after>0);assert(t.travel.lastRight<=t.travel.clipRight+2,'Last column unreachable');assert(!t.travel.owner.includes('markdown-preview-view')&&!t.travel.owner.includes('cm-scroller'),'Page took table scrolling')}
     if(name==='portrait'&&file.includes('Simple'))assert(t.cells.find(c=>c.text.startsWith('A long descriptive')).height>t.cells.find(c=>c.text.startsWith('A long descriptive')).lineHeight*1.5,'Description did not wrap');
     if(t.id.startsWith('Variable')){assert.equal(t.cells[1].align,'end');assert.equal(t.cells[3].align,'center')}
    }
    if(file.includes('Wide')&&name==='portrait')assert([...seen.values()].some(t=>t.travel),'Wide table never scrolled');
    record.tables.push({file,tables:[...seen.values()]});
   }
   record.toneState=await setup(qa.final.name,tone,mode,'QA Callouts.md');
   const seen=new Map();
   for(let y=0;y<2300;y+=Math.max(180,h*.5)){await scroll(mode,y);for(const c of await callouts(mode))seen.set(c.title,c)}
   assert.equal(seen.size,7,'Callout missing');
   for(const c of seen.values())if(c.type!=='note-toolbar'){
    assert.equal(c.background,'rgba(0, 0, 0, 0)');assert.equal(c.image,'none');assert.equal(c.border,'2px');
    assert.equal(c.radius,'0px');assert.equal(c.shadow,'none');assert.equal(c.icon,'none');assert.equal(c.uppercase,'uppercase');
    assert.equal(c.contentInset,'0px');
    assert.equal(c.titleColor,tone==='light'?'rgb(26, 25, 22)':'rgb(231, 231, 231)','Callout title must use readable text ink');
   }
   // V4.1 explicitly aliases important to the app's same-tone info border.
   assert.deepEqual(seen.get('Controlled callout').borderRgba,seen.get('Controlled callout').infoBorderRgba,'V4.1 important border must match the info reference');
   assert.notEqual(seen.get('Warning').borderColor,seen.get('Success').borderColor,'Semantic borders must retain their distinct colors');
   assert(seen.get('Foldable details').fold);
   record.callouts=[...seen.values()];record.toneAfter=await qa.assertTone(p,tone,qa.final.name);result.cases.push(record);
   fs.writeFileSync(path.join(out,'FOCUS.json'),JSON.stringify(result,null,2)+'\n');
   console.log(JSON.stringify({focused:name,tone,mode,passed:true}));
  }
 }
 // Matched screenshots and excluded-toolbar comparisons.
 await geometry(430,932,true);
 for(const tone of ['light','dark'])for(const theme of [qa.baseline.name,qa.final.name]){
  const label=theme===qa.final.name?'v4':'v3',rec={tone,theme};
  for(const [subject,file]of [['simple-table','QA Tables Simple.md'],['tables','QA Tables Wide.md'],['callouts','QA Callouts.md']]){
   rec.toneState=await setup(theme,tone,'reading',file);
   await qa.screenshot(p,{path:path.join(out,`${label}-${tone}-${subject}.png`)},tone,theme);
   if(subject==='tables'){
    await p.evaluate(()=>{const t=document.querySelector('.markdown-reading-view > .markdown-preview-view table');let e=t.parentElement;while(e&&!(getComputedStyle(e).overflowX==='auto'&&e.scrollWidth>e.clientWidth))e=e.parentElement;if(e)e.scrollLeft=e.scrollWidth});
    await qa.screenshot(p,{path:path.join(out,`${label}-${tone}-tables-right.png`)},tone,theme);
   }
   if(subject==='callouts'){
    await scroll('reading',1600);rec.toolbar=(await callouts('reading')).find(c=>c.type==='note-toolbar');
    const session=await p.context().newCDPSession(p);await session.send('DOM.enable');await session.send('CSS.enable');
    const doc=await session.send('DOM.getDocument');const found=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.markdown-reading-view > .markdown-preview-view .callout[data-callout="note-toolbar"] .callout-title-inner'});
    assert(found.nodeId,'Missing excluded toolbar glyph probe');
    rec.toolbarFonts=(await session.send('CSS.getPlatformFontsForNode',{nodeId:found.nodeId})).fonts;await session.detach();
    assert(rec.toolbarFonts.some(f=>f.familyName==='Arial'&&f.glyphCount>0),'The explicit toolbar font must actually render');
   }
  }
  rec.drawer=await drawer(tone);
  await qa.screenshot(p,{path:path.join(out,`${label}-${tone}-drawer.png`)},tone,theme);
  if(label==='v4'){
   const expected=tone==='light'?[247,245,239,255]:[0,0,0,255];for(const color of Object.values(rec.drawer.tokenRgba))assert.deepEqual(color,expected,'Rendered drawer token color changed');
   assert.equal(rec.drawer.card,tone==='light'?'rgb(247, 245, 239)':'rgb(0, 0, 0)');
   assert.equal(rec.drawer.drawer,rec.drawer.card);
   const before=result.comparisons.find(x=>x.tone===tone);assert(before.toolbar&&rec.toolbar);
   // The bundled theme default extends the fallback list, while explicit Arial
   // must keep rendering the excluded toolbar with identical style and glyphs.
   const observedToolbar=x=>({...x,titleFont:x.titleFont.split(',')[0].trim()});
   assert.deepEqual(observedToolbar(rec.toolbar),observedToolbar(before.toolbar),'Excluded toolbar changed');
   assert.deepEqual(rec.toolbarFonts,before.toolbarFonts,'Excluded toolbar actual glyph fonts changed');
  }
  rec.toneAfter=await qa.assertTone(p,tone,theme);
  result.comparisons.push(rec);
 }
 assert.equal(result.errors.length,0);
 qa.finish('FOCUS',result);
 console.log(JSON.stringify({focusedCases:result.cases.length,comparisons:result.comparisons.length}));
}finally{await b.close()}})().catch(e=>{fs.writeFileSync(path.join(out,'FOCUS-failure.json'),JSON.stringify({error:String(e.stack),result},null,2));console.error(e);process.exitCode=1});
