/* Actual guarded app lifecycle evidence; desktop mobile emulation is not iOS. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('playwright'), qa = require('../../scripts/config.cjs'), fixture = require('./math-fixture.cjs');
const repair = '.workspace-leaf-content[data-type="markdown"] .markdown-reading-view .math-block > mjx-container[display="true"] {\n  overflow-x: auto;\n}';
const out = path.join(__dirname, 'evidence/math-scroll');
const result = {status:'INCOMPLETE', scope:'Actual Obsidian MathJax initial render and observed scroll-away/return cycles; detach/remount counts are recorded, not assumed. Mobile widths use desktop app emulation, not physical iOS.', startedAt:new Date().toISOString(), cssSha256:qa.final.css_sha256, scriptSha256:qa.hashFile(__filename), fixtureSha256:qa.hashFile(require.resolve('./math-fixture.cjs')), configSha256:qa.hashFile(require.resolve('../../scripts/config.cjs')), noteSha256:qa.sha(fixture.text), cases:[], errors:[]};
fs.mkdirSync(out,{recursive:true});
const save = () => fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
const selector = mode => mode === 'reading' ? '.markdown-reading-view > .markdown-preview-view' : '.markdown-source-view > .cm-editor > .cm-scroller';
async function navigate(p, line) {
  // The inspected preview applyScroll returns false until sections are measured;
  // setEphemeralState's single deferred retry can otherwise silently lose a jump.
  await p.waitForFunction(line => {const v=app.workspace.activeLeaf.view;if(v.getMode()==='source'){v.editor.scrollIntoView({from:{line,ch:0},to:{line:line+3,ch:0}},true);return true;}return v.previewMode.renderer.applyScroll(line,{center:true});},line);
}
async function readyMath(p, root) {
  await p.waitForFunction(root => {
    const s=app.workspace.activeLeaf.view.containerEl.querySelector(root);
    const m=s?.querySelector('mjx-container[display="true"] mjx-math');
    const glyph=m?.querySelector('mjx-c');
    const r=m?.getBoundingClientRect(),sr=s?.getBoundingClientRect();
    return document.fonts.status==='loaded' && r?.width>100 && glyph?.getBoundingClientRect().height>0 && r.bottom>sr.top && r.top<sr.bottom;
  },root,{timeout:20000});
  await p.evaluate(()=>document.fonts.ready);
  return p.evaluate(async root=>{
    let previous='',stable=0,last;
    const deadline=performance.now()+15000;
    while(performance.now()<deadline){
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const s=app.workspace.activeLeaf.view.containerEl.querySelector(root),m=s?.querySelector('mjx-container[display="true"] mjx-math'),glyph=m?.querySelector('mjx-c');
      if(!glyph){stable=0;continue;}
      const r=m.getBoundingClientRect(),sr=s.getBoundingClientRect(),g=glyph.getBoundingClientRect(),font=getComputedStyle(glyph,'::before');
      const families=font.fontFamily.split(',').map(f=>f.trim().replace(/["']/g,''));
      const loaded=[...document.fonts].filter(f=>f.status==='loaded'&&families.includes(f.family.replace(/["']/g,''))).map(f=>f.family);
      const fontReady=document.fonts.status==='loaded'&&families.some(f=>f.includes('MJX'))&&loaded.length>0&&document.fonts.check(`${font.fontSize} ${font.fontFamily}`);
      const signature=JSON.stringify([r.left,r.width,r.height,g.width,g.height,font.fontFamily]);
      const fullyInView=r.top>=sr.top-1&&r.bottom<=sr.bottom+1;
      stable=fontReady&&fullyInView&&signature===previous?stable+1:fontReady&&fullyInView?1:0;previous=signature;
      last={width:r.width,height:r.height,glyphWidth:g.width,glyphHeight:g.height,fontFamily:font.fontFamily,loadedFamilies:loaded,stableFrames:stable,fullyInView,attached:m.isConnected,scrollTop:s.scrollTop,paneOverflow:s.scrollWidth-s.clientWidth,paneWidth:s.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,mathBounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},paneBounds:{left:sr.left,right:sr.right,top:sr.top,bottom:sr.bottom}};
      if(stable>=3)return last;
    }
    throw Error('MathJax geometry/font did not stabilize: '+JSON.stringify(last));
  },root);
}
async function observeAway(p,root) {
  await p.waitForFunction(root=>{const s=app.workspace.activeLeaf.view.containerEl.querySelector(root),m=s?.querySelector('mjx-container[display="true"] mjx-math');if(!s)return false;if(!m)return true;const r=m.getBoundingClientRect(),sr=s.getBoundingClientRect();return r.bottom<=sr.top||r.top>=sr.bottom;},root);
  return p.evaluate(root=>{const s=app.workspace.activeLeaf.view.containerEl.querySelector(root),m=s.querySelector('mjx-container[display="true"] mjx-math'),r=m?.getBoundingClientRect(),sr=s.getBoundingClientRect();return {scrollTop:s.scrollTop,attached:!!m,inView:!!r&&r.bottom>sr.top&&r.top<sr.bottom,paneOverflow:s.scrollWidth-s.clientWidth};},root);
}
async function startTrace(p, root) {
  await p.evaluate(({root,file})=>{
    window.__mathTrace={running:true,phase:'open',frames:[],events:[],previous:{}};
    const state=window.__mathTrace;
    const tick=()=>{
      if(!state.running)return;
      const view=app.workspace.activeLeaf?.view,s=view?.containerEl.querySelector(root);
      if(view?.file?.path===file&&s&&s.clientWidth){
        const sr=s.getBoundingClientRect(),nodes=[...s.querySelectorAll('.el-p > p,.cm-line')].filter(e=>e.textContent.startsWith('Synthetic passage')&&e.getBoundingClientRect().bottom>sr.top&&e.getBoundingClientRect().top<sr.bottom);
        const prose=nodes.map(e=>{const r=e.getBoundingClientRect();return {key:e.textContent.slice(0,80),left:r.left,width:r.width}});
        let proseDrift=0;
        for(const n of prose){const old=state.previous[n.key];if(old&&old.pane===s.clientWidth)proseDrift=Math.max(proseDrift,Math.abs(old.left-n.left),Math.abs(old.width-n.width));state.previous[n.key]={...n,pane:s.clientWidth};}
        state.frames.push({t:performance.now(),phase:state.phase,scrollTop:s.scrollTop,scrollLeft:s.scrollLeft,paneOverflow:s.scrollWidth-s.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,pageScrollLeft:document.scrollingElement.scrollLeft,proseDrift,prose,fontStatus:document.fonts.status,mathCount:s.querySelectorAll('mjx-container[display="true"] mjx-math').length,viewport:window.visualViewport?{width:visualViewport.width,offsetLeft:visualViewport.offsetLeft}:null});
      }
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  },{root,file:fixture.file});
}
async function localScroll(p, root, kind, columns) {
  return p.evaluate(async ({root,kind,columns})=>{
    const s=app.workspace.activeLeaf.view.containerEl.querySelector(root),block=kind==='math'?s.querySelector('mjx-container[display="true"]'):[...s.querySelectorAll('table')].find(t=>t.querySelectorAll('thead th').length===columns);
    if(!block)throw Error('Expected rendered '+kind);
    const scrollers=[];
    for(let e=block;e&&e!==s;e=e.parentElement)if(e.scrollWidth>e.clientWidth+1&&['auto','scroll'].includes(getComputedStyle(e).overflowX))scrollers.push(e);
    const scroller=scrollers[0],inner=kind==='math'?block.querySelector('mjx-math'):block;
    if(!scroller){const r=inner.getBoundingClientRect(),b=s.getBoundingClientRect();return {kind,columns,local:false,inner:{left:r.left,right:r.right,width:r.width},pane:{left:b.left+s.clientLeft,right:b.left+s.clientLeft+s.clientWidth,width:s.clientWidth}};}
    const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const marker=[...s.querySelectorAll('.el-p > p,.cm-line')].find(e=>e.textContent.startsWith('Synthetic passage'));
    const baseline={paneLeft:s.scrollLeft,pageLeft:document.scrollingElement.scrollLeft,proseLeft:marker?.getBoundingClientRect().left};
    const samples=[];
    for(const target of [0,scroller.scrollWidth,0]){
      scroller.scrollLeft=target;await frame();
      const edge=kind==='math'?block.querySelector('mjx-math'):block.querySelector(target?'tr:last-child td:last-child':'th:first-child');
      const r=edge.getBoundingClientRect(),b=scroller.getBoundingClientRect();
      samples.push({target,left:scroller.scrollLeft,max:scroller.scrollWidth-scroller.clientWidth,paneLeft:s.scrollLeft,pageLeft:document.scrollingElement.scrollLeft,proseLeft:marker?.getBoundingClientRect().left,edge:{left:r.left,right:r.right},port:{left:b.left+scroller.clientLeft,right:b.left+scroller.clientLeft+scroller.clientWidth}});
    }
    return {kind,columns,local:true,baseline,samples};
  },{root,kind,columns});
}
function assertLocal(check) {
  if(!check.local){assert(check.inner.width<=check.pane.width+2,'Oversized '+check.kind+' lacks local scrolling');assert(check.inner.left>=check.pane.left-2&&check.inner.right<=check.pane.right+2,'Fitting '+check.kind+' is clipped');return;}
  const [start,end,back]=check.samples;
  assert(end.max>1&&end.left>1&&Math.abs(end.max-end.left)<=1,'Local far edge unreachable');
  assert(Math.abs(start.left)<=1&&Math.abs(back.left)<=1,'Local start unreachable');
  assert(end.edge.right>=end.port.left-2&&end.edge.right<=end.port.right+2,'Last content clipped');
  for(const sample of [start,back])assert(sample.edge.left>=sample.port.left-2&&sample.edge.left<=sample.port.right+2,'First content clipped');
  for(const sample of check.samples){assert(Math.abs(sample.paneLeft-check.baseline.paneLeft)<=1);assert(Math.abs(sample.pageLeft-check.baseline.pageLeft)<=1);if(sample.proseLeft!==undefined)assert(Math.abs(sample.proseLeft-check.baseline.proseLeft)<=1,'Local scroll moves prose');}
}
(async()=>{
  const browser=await chromium.connectOverCDP(qa.endpoint);
  let p,original;
  try {
    p=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);
    assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[],'Use core-only QA');
    await p.evaluate(async ({file,text})=>{const old=app.vault.getAbstractFileByPath(file);if(old)await app.vault.modify(old,text);else await app.vault.create(file,text);},fixture);
    for(const width of [390,430,844,1280]){
      const mobile=width<1280,height=width===844?390:900;
      await p.setViewportSize({width,height});
      if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{});}
      for(const tone of qa.tones)for(const mode of ['reading','live'])for(const variant of ['before','after']){
        await p.evaluate(async file=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();for(const l of app.workspace.getLeavesOfType('markdown').slice(1))l.detach();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:'preview'}});},qa.surfaceFile);
        await qa.selectTheme(p,qa.final);
        const toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true});
        original=await p.evaluate(()=>app.customCss.styleEl.textContent);
        assert.equal(original.split(repair).length,2,'Repair rule must exist exactly once');
        const effective=variant==='before'?original.replace(repair,''):original;
        await p.evaluate(css=>{app.customCss.styleEl.textContent=css;},effective);
        const row={width,height,mobile,tone,mode,variant,toneState,effectiveCssSha256:qa.sha(effective),cycleObservations:[],checks:[]};result.activeCase=row;save();
        const root=selector(mode);await startTrace(p,root);
        await p.evaluate(async ({file,mode})=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:false}});if(mode==='live')app.workspace.activeLeaf.view.editor.setCursor({line:0,ch:0});},{file:fixture.file,mode});
        await navigate(p,0);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await navigate(p,fixture.lines.equation);row.mathReady=await readyMath(p,root);await p.waitForTimeout(250);
        for(let cycle=0;cycle<10;cycle++){
          await p.evaluate(c=>{window.__mathTrace.phase='away-'+c;},cycle);await navigate(p,fixture.lines.section23);await p.waitForTimeout(200);
          const away=await observeAway(p,root);
          await p.evaluate(c=>{window.__mathTrace.phase='return-'+c;},cycle);await navigate(p,fixture.lines.equation);const returned=await readyMath(p,root);await p.waitForTimeout(250);
          const navigationDelta=Math.abs(away.scrollTop-returned.scrollTop);
          row.cycleObservations.push({cycle,away,returned,navigationDelta});save();
          assert(!away.inView&&returned.fullyInView&&navigationDelta>100,'Scroll-away/return navigation was not observed');
        }
        row.cycles=row.cycleObservations.length;
        row.checks.push(await localScroll(p,root,'math'));
        for(const [columns,tableLine] of [[4,fixture.lines.table4],[6,fixture.lines.table6]]){
          await navigate(p,tableLine);await p.waitForFunction(({root,columns})=>[...app.workspace.activeLeaf.view.containerEl.querySelectorAll(root+' table')].some(t=>t.querySelectorAll('thead th').length===columns),{root,columns});await p.waitForTimeout(100);row.checks.push(await localScroll(p,root,'table',columns));
        }
        const frames=await p.evaluate(()=>{window.__mathTrace.running=false;return window.__mathTrace.frames;});
        const initial=frames.filter(f=>f.phase==='open');
        row.initialMount={unmounted:initial.some(f=>f.mathCount===0),mounted:initial.some(f=>f.mathCount>0)};
        row.lifecycle={attachedFrames:frames.filter(f=>f.mathCount>0).length,detachedFrames:frames.filter(f=>f.mathCount===0).length,detachCount:frames.filter((f,i)=>i>0&&frames[i-1].mathCount>0&&f.mathCount===0).length,mountCount:frames.filter((f,i)=>i>0&&frames[i-1].mathCount===0&&f.mathCount>0).length};
        row.lifecycle.remountCount=Math.max(0,row.lifecycle.mountCount-(row.initialMount.unmounted&&row.initialMount.mounted?1:0));
        row.frameCount=frames.length;row.max=Object.fromEntries(['paneOverflow','pageOverflow','scrollLeft','pageScrollLeft','proseDrift'].map(k=>[k,Math.max(0,...frames.map(f=>Math.abs(f[k])))]));
        const stem=`${width}-${tone}-${mode}-${variant}`;
        row.trace=stem+'.json';fs.writeFileSync(path.join(out,row.trace),JSON.stringify(frames)+'\n');row.traceSha256=qa.hashFile(path.join(out,row.trace));
        row.actualEffectiveCssSha256=await p.evaluate(()=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex'));
        assert.equal(row.actualEffectiveCssSha256,row.effectiveCssSha256,'App restored CSS during case');
        await navigate(p,fixture.lines.equation);await readyMath(p,root);
        row.screenshot=stem+'.png';await p.screenshot({path:path.join(out,row.screenshot)});row.screenshotSha256=qa.hashFile(path.join(out,row.screenshot));
        await p.evaluate(css=>{app.customCss.styleEl.textContent=css;},original);row.toneAfter=await qa.assertTone(p,tone,qa.final);
        result.cases.push(row);delete result.activeCase;save();
        assert(frames.length>30,'Missing frame trace');
        assert(row.initialMount.unmounted&&row.initialMount.mounted,'Missing cold initial equation mount evidence');
        if(variant==='after'||mode==='live'){
          for(const key of ['paneOverflow','pageOverflow','scrollLeft','pageScrollLeft','proseDrift'])assert(row.max[key]<=1,`${stem}: ${key}=${row.max[key]}`);
          for(const check of row.checks)assertLocal(check);
        }
        console.log(JSON.stringify({width,tone,mode,variant,max:row.max}));
      }
    }
    assert.equal(result.cases.length,32);
    result.matchedControls=[];
    for(const width of [390,430])for(const tone of qa.tones){
      const before=result.cases.find(c=>c.width===width&&c.tone===tone&&c.mode==='reading'&&c.variant==='before'),after=result.cases.find(c=>c.width===width&&c.tone===tone&&c.mode==='reading'&&c.variant==='after');
      const ready=c=>[c.mathReady,...c.cycleObservations.map(o=>o.returned)];
      const reproduced=ready(before).some(s=>s.fullyInView&&s.stableFrames>=3&&s.width>s.paneWidth+1&&s.paneOverflow>1);
      const contained=ready(after).every(s=>s.fullyInView&&s.stableFrames>=3&&s.paneOverflow<=1&&s.pageOverflow<=1);
      result.matchedControls.push({width,tone,reproduced,contained});save();
      assert(reproduced,`${width}/${tone}: fully rendered visible equation did not reproduce control overflow`);assert(contained,`${width}/${tone}: matched equation remains uncontained`);
    }
    result.status='PASS';result.finishedAt=new Date().toISOString();save();
  } finally {
    if(p&&original)await p.evaluate(css=>{if(window.__mathTrace)window.__mathTrace.running=false;app.customCss.styleEl.textContent=css;},original).catch(()=>{});
    await browser.close();
  }
})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1;});
