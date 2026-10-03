/* Measure the document against its own usable pane, including native scrollbars. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'evidence/panes');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Actual macOS Obsidian renderer; desktop viewport resizing, all sidebar combinations and both split directions. Not native Windows or iOS.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);try{
 const p=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);
 if(await p.evaluate(()=>app.isMobile)){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(()=>app.emulateMobile(false))]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{})}
 await p.evaluate(async()=>{for(const id of ['file-explorer','outline'])await app.internalPlugins.getPluginById(id).enable();});
 for(const [width,height]of [[900,900],[1440,900],[2560,1440]])for(const tone of qa.tones)for(const mode of qa.modes)for(const layout of ['single','vertical','horizontal'])for(const sidebars of ['none','left','right','both']){
  await p.setViewportSize({width,height});
  await p.evaluate(async({mode,layout,sidebars,file})=>{
   app.setting.close();document.querySelector('#qa-text-spacing')?.remove();
   for(const leaf of app.workspace.getLeavesOfType('markdown').slice(1))leaf.detach();
   const state={type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:mode==='source'}};
   const first=app.workspace.getLeaf();await first.setViewState(state);
   if(layout!=='single'){const second=app.workspace.getLeaf('split',layout);await second.setViewState(state);app.workspace.setActiveLeaf(first,{focus:true})}
   app.workspace.leftSplit[sidebars==='left'||sidebars==='both'?'expand':'collapse']();
   app.workspace.rightSplit[sidebars==='right'||sidebars==='both'?'expand':'collapse']();
  },{mode,layout,sidebars,file:qa.surfaceFile});
  await qa.selectTheme(p,qa.final);const toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,readableLineLength:true,showInlineTitle:false,autoFullScreen:false,floatingNavigation:false});
  const sample=await p.evaluate(mode=>{
   const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
   const leaves=app.workspace.getLeavesOfType('markdown').map(leaf=>{
    const root=leaf.view.containerEl,s=root.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller'),c=root.querySelector(mode==='reading'?'.markdown-preview-sizer':'.cm-sizer');
    s.scrollLeft=0;
    const ss=getComputedStyle(s),cs=getComputedStyle(c),sr=box(s),cr=box(c),padL=parseFloat(ss.paddingLeft),padR=parseFloat(ss.paddingRight);
    const left=sr.x+s.clientLeft+padL,available=s.clientWidth-padL-padR,expectedCenter=left+available/2;
    const nativeTableLines=[...s.querySelectorAll('.cm-line')].filter(e=>e.getBoundingClientRect().right>sr.x+s.clientWidth+1).map(e=>({table:e.classList.contains('HyperMD-table-row'),right:e.getBoundingClientRect().right,text:e.textContent.slice(0,80)}));
    let tableEndReachable=null;if(mode==='source'&&s.scrollWidth>s.clientWidth){s.scrollLeft=s.scrollWidth;tableEndReachable=[...s.querySelectorAll('.cm-line.HyperMD-table-row')].every(e=>e.getBoundingClientRect().right<=sr.x+s.clientWidth+1);s.scrollLeft=0;}
    return{nativeTableLines,tableEndReachable,scroller:sr,column:cr,clientWidth:s.clientWidth,scrollbar:s.offsetWidth-s.clientWidth,available,centerError:cr.x+cr.width/2-expectedCenter,maximum:parseFloat(cs.maxWidth),overflow:s.scrollWidth-s.clientWidth,visibleText:c.textContent.trim().length,font:getComputedStyle(root.querySelector(mode==='reading'?'p':'.cm-line')).fontFamily};
   });
   return{leaves,pageOverflow:document.documentElement.scrollWidth-innerWidth,leftOpen:!app.workspace.leftSplit.collapsed,rightOpen:!app.workspace.rightSplit.collapsed};
  },mode);
  const row={width,height,tone,mode,layout,sidebars,toneState,toneAfter:await qa.assertTone(p,tone,qa.final),...sample};result.activeCase=row;save();
  assert.equal(sample.leaves.length,layout==='single'?1:2);assert.equal(sample.leftOpen,['left','both'].includes(sidebars));assert.equal(sample.rightOpen,['right','both'].includes(sidebars));
  assert(sample.pageOverflow<=1,'Workspace overflow');
  for(const pane of sample.leaves){assert(pane.column.width>0&&pane.visibleText>0);assert(Math.abs(pane.centerError)<=1.25,`Column is not centered in its own pane: ${pane.centerError}`);assert(pane.column.width<=Math.min(pane.available,pane.maximum)+1.25,'Prose exceeds available measure');if(pane.overflow>1){assert(mode==='source'&&pane.nativeTableLines.length>0&&pane.nativeTableLines.every(line=>line.table)&&pane.tableEndReachable,'Unexpected horizontal overflow or unreachable source table');}assert(pane.font.includes('Cupertino Newsreader'));}
  if(sidebars==='both'&&layout==='vertical'&&mode==='reading'){
   const name=`${width}-${tone}-${layout}-${sidebars}.png`;await qa.screenshot(p,{path:path.join(out,name)},tone,qa.final);row.screenshot=name;row.screenshotSha256=qa.hashFile(path.join(out,name));
  }
  result.cases.push(row);delete result.activeCase;save();console.log(JSON.stringify({width,tone,mode,layout,sidebars,status:'PASS'}));
 }
 assert.equal(result.cases.length,216);result.status='PASS';result.finishedAt=new Date().toISOString();save();
 await p.evaluate(()=>{for(const leaf of app.workspace.getLeavesOfType('markdown').slice(1))leaf.detach();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse()});
}finally{await browser.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
