const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const qa=require('./config.cjs');
const {root,out}=qa;
const build=qa.stages;
const result={scope:'Actual Obsidian in an isolated desktop shell, with official mobile emulation; not a physical iPhone test.',cases:[],fonts:[],errors:[]};


async function configure(p,{width,height,mobile,tone,mode,theme,size=23,font='Newsreader'}){
  await p.setViewportSize({width,height});
  if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
  await p.evaluate(async({tone,mode,theme,size,font,surfaceFile})=>{
    app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();
    for(const [k,v]of Object.entries({baseFontSize:size,textFontFamily:font,monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);
    app.updateFontSize();app.updateFontFamily();app.updateTheme();app.customCss.setTheme(theme);
    await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:surfaceFile,mode:mode==='reading'?'preview':'source',source:mode==='source'}});
  },{tone,mode,theme,size,font,surfaceFile:qa.surfaceFile});
  // Let the app finish its queued Appearance updates before selecting the
  // comparison theme. A config reload can otherwise restore the prior theme.
  await p.waitForTimeout(500);
  await p.evaluate(theme=>app.customCss.setTheme(theme),theme);
  await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,build.find(x=>x.name===theme));
  await p.waitForTimeout(180);
  await qa.loadFonts(p);
  await p.evaluate(()=>document.fonts.ready);
  return qa.stabilizeTone(p,tone,theme,{baseFontSize:size,textFontFamily:font,monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true});
}

qa.begin('SURFACES',result);
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
  const p=b.contexts()[0].pages().find(p=>p.url().includes('index.html'));
  await qa.guard(p,result);
  p.on('pageerror',e=>result.errors.push(String(e)));
  result.runtime=await p.evaluate(()=>({electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform,appVersion:require('electron').ipcRenderer.sendSync('version')}));
  const geometries=[['portrait',430,932,true],['landscape',932,430,true],['desktop',1280,900,false]];
  for(const [geometry,width,height,mobile]of geometries)for(const tone of ['light','dark'])for(const mode of ['reading','live'])for(const theme of qa.stages.map(s=>s.name)){
    const toneState=await configure(p,{width,height,mobile,tone,mode,theme});
    const sel=mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.markdown-source-view .cm-scroller';
    await p.evaluate(sel=>document.querySelector(sel).scrollTop=0,sel);await p.waitForTimeout(150);
    await qa.assertTone(p,tone,theme);
    const preferences=await qa.readPreferences(p,toneState.preferences.requested,theme);
    const top=await p.evaluate(({mode,sel})=>{
      const outer=document.querySelector(sel),s=getComputedStyle(outer),measure=e=>{const c=getComputedStyle(e);return {text:e.textContent.slice(0,100),size:c.fontSize,font:c.fontFamily,weight:c.fontWeight,tracking:c.letterSpacing,transform:c.textTransform,rule:c.borderBlockStartWidth,optical:c.fontVariationSettings,wrap:c.textWrap,box:e.getBoundingClientRect().toJSON()}};
      const h1=outer.querySelector(mode==='reading'?'h1':'.HyperMD-header-1');const h2=outer.querySelector(mode==='reading'?'h2':'.HyperMD-header-2');
      return {textSize:s.fontSize,h1:measure(h1),h2:h2&&measure(h2),family:s.fontFamily,sourceWhitespace:getComputedStyle(outer.querySelector(mode==='reading'?'p':'.cm-content')).whiteSpace,overflow:document.documentElement.scrollWidth-innerWidth};
    },{mode,sel});
    assert.equal(parseFloat(top.textSize),23,'Working Appearance size no longer respected');assert(top.overflow<=1);
    if(theme!==qa.baseline.name){assert.equal(top.h1.transform,'none');assert.equal(top.h1.rule,'0px');assert(['normal','0px'].includes(top.h1.tracking));if(top.h2){assert.equal(top.h2.rule,'0px');assert.equal(top.h2.transform,'none')}}
    if(mode==='reading')await qa.screenshot(p,{path:path.join(out,`${qa.stages.find(s=>s.name===theme).stage===0?'v3':theme===qa.final.name?'v4':'v4-s1'}-${geometry}-${tone}-headings.png`)},tone,theme);
    const record={geometry,tone,toneState,preferences,mode,theme,cssSha256:build.find(x=>x.name===theme).css_sha256,top,tables:[]};
    for(const index of [0,1]){
      if(mode==='live')await p.evaluate(index=>{const e=app.workspace.activeLeaf.view.editor;const lines=e.getValue().split('\n');const line=lines.findIndex(s=>s.startsWith(index===0?'| Item':'| Measure'));e.scrollIntoView({from:{line,ch:0},to:{line:line+4,ch:0}},true)},index);
      else {
        for(let step=0;step<40;step++){
          await p.evaluate(({sel,y})=>document.querySelector(sel).scrollTop=y,{sel,y:step*height*.55});
          await p.waitForTimeout(70);
          const found=await p.evaluate(({sel,index})=>{const t=[...document.querySelector(sel).querySelectorAll('table')].find(t=>t.textContent.includes(index===0?'Width':'LAST COLUMN REACHABLE'));if(!t)return false;t.scrollIntoView({block:'center'});return true},{sel,index});
          if(found)break;
        }
      }
      await p.waitForTimeout(180);
      const tableTone=await qa.assertTone(p,tone,theme);
      const tables=await p.evaluate(({mode,sel,index})=>{
        const outer=document.querySelector(sel),table=[...outer.querySelectorAll('table')].find(t=>t.textContent.includes(index===0?'Width':'LAST COLUMN REACHABLE'));
        if(!table)return null;
        let scroller=table.parentElement;while(scroller&&scroller!==outer&&!['auto','scroll'].includes(getComputedStyle(scroller).overflowX))scroller=scroller.parentElement;
        const details=()=>{const r=table.getBoundingClientRect(),last=table.querySelector('tbody tr td:last-child').getBoundingClientRect(),c=getComputedStyle(table.querySelector('tbody td')),h=getComputedStyle(table.querySelector('thead th'));return {box:r.toJSON(),cellSize:c.fontSize,cellWeight:c.fontWeight,cellMin:c.minWidth,headerSize:h.fontSize,headerTransform:h.textTransform,last:last.toJSON(),scrollLeft:scroller.scrollLeft,clientWidth:scroller.clientWidth,scrollWidth:scroller.scrollWidth,scrollerBox:scroller.getBoundingClientRect().toJSON(),scrollerClass:scroller.className,pageOverflow:document.documentElement.scrollWidth-innerWidth,align:[...table.querySelectorAll('tbody tr:first-child td')].map(e=>getComputedStyle(e).textAlign)}};
        const before=details();scroller.scrollLeft=scroller.scrollWidth;return {before,after:details(),lastText:table.querySelector('tbody tr td:last-child').textContent};
      },{mode,sel,index});
      assert(tables,'Table missing from rendered surface');assert(tables.before.pageOverflow<=1);assert(tables.after.pageOverflow<=1);
      const after=tables.after;assert(after.last.right<=after.scrollerBox.right+2,'Last column unreachable');
      if(theme===qa.final.name){assert.equal(tables.before.headerTransform,'uppercase');assert.equal(tables.before.cellWeight,'650');assert(parseFloat(tables.before.cellSize)<23)}
      if(index===1){assert.equal(tables.before.align[2],'center');assert(['right','end'].includes(tables.before.align[3]));assert(tables.lastText.includes('LAST COLUMN REACHABLE'))}
      record.tables.push({...tables,toneState:tableTone});
      if(mode==='reading'&&index===1)await qa.screenshot(p,{path:path.join(out,`${qa.stages.find(s=>s.name===theme).stage===0?'v3':theme===qa.final.name?'v4':'v4-s1'}-${geometry}-${tone}-tables.png`)},tone,theme);
    }
    record.preferencesAfter=await qa.readPreferences(p,preferences.requested,theme);
    record.toneAfter=await qa.assertTone(p,tone,theme);
    result.cases.push(record);console.log(JSON.stringify({surface:geometry,tone,mode,theme,passed:true}));
    fs.writeFileSync(path.join(out,'SURFACES.json'),JSON.stringify(result,null,2)+'\n');
  }
  // Check the Appearance floor and user font choices in all editor views.
  for(const [width,height,mobile]of [[390,844,true],[932,430,true],[1280,900,false]])for(const mode of ['reading','live','source'])for(const [size,font]of [[15,'Newsreader'],[23,'Newsreader'],[28,'Georgia']]){
    const toneState=await configure(p,{width,height,mobile,tone:'light',mode,theme:qa.final.name,size,font});
    await qa.assertTone(p,'light',qa.final.name);
    const preferences=await qa.readPreferences(p,toneState.preferences.requested,qa.final.name);
    const data=await p.evaluate(mode=>{const e=document.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.markdown-source-view .cm-scroller'),s=getComputedStyle(e);return {configuredSize:app.vault.getConfig('baseFontSize'),configuredFont:app.vault.getConfig('textFontFamily'),size:parseFloat(s.fontSize),family:s.fontFamily,floor:getComputedStyle(document.body).getPropertyValue('--crl3-app-text-size'),overflow:document.documentElement.scrollWidth-innerWidth}},mode);
    assert.equal(data.configuredSize,size,'Appearance size reverted before render measurement');assert.equal(data.configuredFont,font,'Appearance font reverted before render measurement');
    assert(data.size>=size);if(!mobile||size>=23)assert.equal(data.size,size);assert(data.family.includes(font));assert(data.overflow<=1);
    result.fonts.push({width,height,mobile,mode,tone:'light',toneState,preferences,preferencesAfter:await qa.readPreferences(p,preferences.requested,qa.final.name),toneAfter:await qa.assertTone(p,'light',qa.final.name),input:{size,font},computed:data});
  }
  assert.equal(result.errors.length,0);qa.finish('SURFACES',result);
}finally{await b.close()}})().catch(e=>{fs.writeFileSync(path.join(out,'SURFACES-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1});
