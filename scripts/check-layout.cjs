const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const qa=require('./config.cjs');
const {root,work,out}=qa;
const result={scope:'Real desktop Obsidian 1.13.7, official mobile emulation plus desktop window. Programmatic wheel/scroll, real virtual sections and running CodeMirror. No native iPhone momentum or flicker claim.',cases:[],errors:[]};
qa.begin('LAYOUT',result);
(async()=>{
 const b=await chromium.connectOverCDP(qa.endpoint);
 try{
 const p=b.contexts()[0].pages().find(x=>x.url().includes('index.html'));
 await qa.guard(p,result);
 p.on('pageerror',e=>result.errors.push(String(e)));
 for(const [geometry,width,height,mobile]of [['portrait',430,932,true],['landscape',932,430,true],['desktop',1280,900,false]]){
  await p.setViewportSize({width,height});
  const current=await p.evaluate(()=>app.isMobile);
  if(current!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
  for(const theme of qa.stages.map(x=>x.name))for(const tone of ['light','dark'])for(const mode of ['reading','live','source']){
   await p.evaluate(async({theme,tone,mode})=>{
    app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.customCss.setTheme(theme);
    for(const [k,v]of Object.entries({baseFontSize:23,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',readableLineLength:true,theme:tone==='dark'?'obsidian':'moonstone'}))app.vault.setConfig(k,v);
    app.updateFontSize();app.updateFontFamily();app.updateTheme();
    await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Long.md',mode:mode==='reading'?'preview':'source',source:mode==='source'}});
   },{theme,tone,mode});
   await qa.loadFonts(p);
   await p.waitForTimeout(350);
   const expected=qa.stages.find(x=>x.name===theme);
   await p.evaluate(t=>app.customCss.setTheme(t),theme);
   await p.waitForFunction(expected=>app.customCss.theme===expected.name&&require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,expected);
   const toneState=await qa.stabilizeTone(p,tone,theme,{baseFontSize:23,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',readableLineLength:true});
   const loaded=await p.evaluate(()=>app.customCss.styleEl.textContent);
   assert.equal(require('crypto').createHash('sha256').update(loaded).digest('hex'),expected.css_sha256,'Wrong theme CSS loaded');
   await p.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)&&a.effect.getComputedTiming().endTime<2000).map(a=>a.finished.catch(()=>{}))));
   const scroller=mode==='reading'?'.workspace-leaf-content[data-type="markdown"] .markdown-reading-view > .markdown-preview-view':'.workspace-leaf-content[data-type="markdown"] .cm-scroller';
   await p.evaluate(sel=>{document.querySelector(sel).scrollTop=0},scroller);await p.waitForTimeout(150);
   await qa.assertTone(p,tone,theme);
   const initial=await p.evaluate(async({mode,scroller})=>{
    document.body.getBoundingClientRect();await document.fonts.ready;
    const e=document.querySelector(scroller),title=document.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view h1':'.HyperMD-header-1');
    const props=['overflow-x','overflow-y','position','transform','contain','will-change','mask-image','transition-duration'];
    const structure=[...document.querySelectorAll('.workspace-leaf-content[data-type="markdown"] > .view-content, .markdown-reading-view, .markdown-source-view, .cm-scroller, .markdown-reading-view > .markdown-preview-view')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({class:e.className,style:Object.fromEntries(props.map(k=>[k,getComputedStyle(e).getPropertyValue(k)]))}));
    return {classes:document.body.className,title:title?.getBoundingClientRect().toJSON(),fontStatus:document.fonts.status,scrollHeight:e.scrollHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,structure};
   },{mode,scroller});
   assert(initial.title?.width>0&&initial.title.height>0);assert.equal(initial.fontStatus,'loaded');assert(initial.scrollHeight>height*5);
   if(mode==='reading')await qa.screenshot(p,{path:path.join(out,`${theme||'Default'}-${tone}-${geometry}-matched.png`)},tone,theme);
   const record={theme:theme||'Default',cssSha256:expected.css_sha256,tone,toneState,mode,geometry,initial,scrolls:[],blocks:[],widthSettings:[]};
   // Drawer/font checks can change Obsidian's own navigation visibility. Compare
   // protected properties to v3 in the same live UI state, not an old mask value.
   if(theme!==qa.baseline.name){
    const capture=async selected=>{
     await p.evaluate(t=>app.customCss.setTheme(t),selected);
     await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,qa.stages.find(x=>x.name===selected));await p.waitForTimeout(100);
     const matchedTone=await qa.stabilizeTone(p,tone,selected,{baseFontSize:23,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',readableLineLength:true});
     (record.matchedToneStates||=[]).push(matchedTone);
     await p.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)&&a.effect.getComputedTiming().endTime<2000).map(a=>a.finished.catch(()=>{}))));
     return p.evaluate(()=>{
      const props=['overflow-x','overflow-y','position','transform','contain','will-change','mask-image','transition-duration'];
      const selector='.workspace-leaf-content[data-type="markdown"] > .view-content, .markdown-reading-view, .markdown-source-view, .markdown-source-view > .cm-editor > .cm-scroller, .markdown-reading-view > .markdown-preview-view';
      return [...document.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().width>0).map(e=>({class:e.className,style:Object.fromEntries(props.map(k=>[k,getComputedStyle(e).getPropertyValue(k)]))}));
     });
    };
    record.matchedControl=await capture(qa.baseline.name);
    record.matchedCandidate=await capture(theme);
   }

   // Scan the introductory block suite with overlapping viewport steps.
   if(mode!=='source'){
    const seen=new Set();let collapseDone=false;
    for(let pos=0;pos<6500;pos+=Math.max(220,height*.65)){
     await p.evaluate(({s,pos})=>document.querySelector(s).scrollTop=pos,{s:scroller,pos});await p.waitForTimeout(70);
     await qa.assertTone(p,tone,theme);
     const blocks=await p.evaluate(()=>[...document.querySelectorAll('.markdown-reading-view > .markdown-preview-view .callout, .markdown-reading-view > .markdown-preview-view table, .markdown-reading-view > .markdown-preview-view pre, .markdown-reading-view > .markdown-preview-view img, .markdown-reading-view > .markdown-preview-view .internal-embed, .markdown-source-view .callout, .markdown-source-view .cm-table-widget table, .markdown-source-view .HyperMD-codeblock, .markdown-source-view img, .markdown-source-view .internal-embed')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>100&&r.top<innerHeight-80}).map(e=>{const s=getComputedStyle(e),anc=[];for(let a=e;a&&anc.length<5;a=a.parentElement)anc.push({tag:a.tagName,class:a.className,clientWidth:a.clientWidth,scrollWidth:a.scrollWidth,overflowX:getComputedStyle(a).overflowX});return {kind:e.classList.contains('callout')?'callout':e.classList.contains('HyperMD-codeblock')?'pre':e.tagName.toLowerCase(),type:e.dataset.callout||'',box:e.getBoundingClientRect().toJSON(),color:s.getPropertyValue('--callout-color'),colorValid:!e.classList.contains('callout')||CSS.supports('color',s.getPropertyValue('--callout-color')),border:s.borderLeftWidth,anc}}));
     for(const block of blocks){const k=block.kind+':'+block.type;if(!seen.has(k)){seen.add(k);record.blocks.push(block);if(theme===qa.final.name&&geometry==='portrait'&&mode==='reading'&&['table','pre'].includes(block.kind))await qa.screenshot(p,{path:path.join(out,`candidate-${tone}-${block.kind}.png`)},tone,theme)}}
     if(!collapseDone&&blocks.some(x=>x.type==='tip')){
      const before=await p.evaluate(()=>{const e=[...document.querySelectorAll('.callout.is-collapsible[data-callout="tip"]')].find(e=>e.getBoundingClientRect().height>0);if(!e)return null;const collapsed=e.classList.contains('is-collapsed');e.querySelector('.callout-title').click();return collapsed});
      if(before!==null){await p.waitForTimeout(200);const after=await p.evaluate(()=>{const e=[...document.querySelectorAll('.callout.is-collapsible[data-callout="tip"]')].find(e=>e.getBoundingClientRect().height>0);return {collapsed:e.classList.contains('is-collapsed'),contentHeight:e.querySelector('.callout-content').getBoundingClientRect().height}});assert.notEqual(after.collapsed,before);assert(after.contentHeight>0);record.collapse={before,...after};await p.evaluate(()=>[...document.querySelectorAll('.callout.is-collapsible[data-callout="tip"]')].find(e=>e.getBoundingClientRect().height>0).querySelector('.callout-title').click());collapseDone=true}
     }
    }
    if(mode==='live'&&!record.blocks.some(x=>x.kind==='pre')){
     await p.evaluate(()=>{const e=app.workspace.activeLeaf.view.editor;const line=e.getValue().split('\n').findIndex(s=>s.includes('const steady ='));e.scrollIntoView({from:{line,ch:0},to:{line:line+1,ch:0}},true)});
     await p.waitForTimeout(250);
     const exposed=await p.evaluate(()=>[...document.querySelectorAll('.markdown-source-view .HyperMD-codeblock')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>80&&r.top<innerHeight-80}).map(e=>({kind:'pre',type:'',colorValid:true,box:e.getBoundingClientRect().toJSON(),text:e.textContent,exposure:'Editor.scrollIntoView at known code line'})));
     record.blocks.push(...exposed);
    }
    assert(record.blocks.some(x=>x.kind==='table'),'Table never exposed');assert(record.blocks.some(x=>x.kind==='pre'),'Code block never exposed');assert(record.blocks.some(x=>x.kind==='img'),'Image never exposed');assert(record.blocks.filter(x=>x.kind==='callout').length>=6,'Ordinary callouts missing');assert(record.blocks.every(x=>x.colorValid));assert(record.collapse,'Collapse interaction missing');
   }
   // Exercise real virtual-section/CodeMirror updates, including reversals.
   for(const fraction of [.1,.55,.95,.4,0]){
    await p.evaluate(({s,f})=>{const e=document.querySelector(s);e.scrollTop=(e.scrollHeight-e.clientHeight)*f},{s:scroller,f:fraction});await p.waitForTimeout(130);
    const scrollTone=await qa.assertTone(p,tone,theme);
    const state=await p.evaluate(({mode,s})=>{const e=document.querySelector(s),nodes=[...e.querySelectorAll(mode==='reading'?'p,h1,h2':'.cm-line')];const visible=nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>80&&r.top<innerHeight-80});const v=app.workspace.activeLeaf.view;return {scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,visible:visible.length,sample:visible[0]?.textContent.slice(0,100),overflow:document.documentElement.scrollWidth-innerWidth,attachedSections:mode==='reading'?v.previewMode.renderer.sections.filter(s=>s.el?.isConnected).length:null,totalSections:mode==='reading'?v.previewMode.renderer.sections.length:null,cmViewport:mode!=='reading'?v.editor.cm.viewport:null,fontStatus:document.fonts.status};},{mode,s:scroller});
    assert(state.visible>0,`Empty viewport: ${theme}/${geometry}/${mode}`);assert(state.overflow<=1);assert.equal(state.fontStatus,'loaded');record.scrolls.push({fraction,toneState:scrollTone,...state});
   }
   record.returnedTitle=await p.evaluate(mode=>document.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view h1':'.HyperMD-header-1')?.getBoundingClientRect().toJSON(),mode);
   assert(record.returnedTitle?.width>0);
   assert(Math.abs(record.returnedTitle.y-initial.title.y)<1,'Title moved after returning');
   const baselineRecord=result.cases.find(c=>c.theme===qa.baseline.name&&c.geometry===geometry&&c.mode===mode&&c.tone===tone);
   const normalized=xs=>xs.filter(x=>!x.class.includes('markdown-preview-view')||x.class.includes('is-readable-line-width')).map(x=>({...x,class:x.class.split(/\s+/).sort().join(' ')}));
   if(record.matchedControl)assert.deepEqual(normalized(record.matchedCandidate),normalized(record.matchedControl),'Scroll structure changed in matched live state');
   // Toggle the real readable-line-length setting, then restore it.
   for(const readable of [false,true]){
    await p.evaluate(readable=>app.vault.setConfig('readableLineLength',readable),readable);await p.waitForTimeout(120);
    record.widthSettings.push(await p.evaluate(()=>({readable:app.vault.getConfig('readableLineLength'),overflow:document.documentElement.scrollWidth-innerWidth,classes:document.querySelector('.markdown-reading-view > .markdown-preview-view, .markdown-source-view')?.className})));
   }
   assert(record.widthSettings.every(x=>x.overflow<=1));
   for(const file of ['QA Second Long.md','QA Long.md']){
    await p.evaluate(async({file,mode})=>{await app.workspace.activeLeaf.setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:mode==='source'}})},{file,mode});await p.waitForTimeout(90);
    assert.equal(await p.evaluate(()=>app.workspace.activeLeaf.view.file.path),file);
   }
   record.toneAfter=await qa.assertTone(p,tone,theme);
   result.cases.push(record);console.log(JSON.stringify({theme,tone,mode,geometry,passed:true}));
   fs.writeFileSync(path.join(out,'LAYOUT.json'),JSON.stringify(result,null,2)+'\n');
  }
 }
 qa.finish('LAYOUT',result);assert.equal(result.errors.length,0);console.log(JSON.stringify({cases:result.cases.length,errors:result.errors}));
 }finally{await b.close()}
})().catch(e=>{fs.writeFileSync(path.join(out,'LAYOUT-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1});
