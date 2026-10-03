/* Supplemental matched H3–H6 captures for the independent typography review. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright'),qa=require('./config.cjs');
const result={scope:'H3–H6 in actual desktop Obsidian Reading View and Live Preview; still-image review only',cases:[],errors:[],status:'INCOMPLETE'};
(async()=>{
 const browser=await chromium.connectOverCDP(qa.endpoint);
 try{
  const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));
  await qa.guard(page,result);page.on('pageerror',error=>result.errors.push(String(error)));
  if(await page.evaluate(()=>app.isMobile)){
   await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>app.emulateMobile(false))]);
   await page.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);
  }
  await page.setViewportSize({width:1280,height:900});
  result.qaFonts=await qa.loadFonts(page);
  result.fixtureSha256=qa.hashFile(path.join(qa.vault,qa.surfaceFile));
  for(const mode of ['reading','live'])for(const tone of qa.tones)for(const stage of [qa.baseline,qa.final]){
   await page.evaluate(async({mode,tone,file})=>{
    app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();
    for(const[k,v]of Object.entries({baseFontSize:23,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);
    app.updateFontSize();app.updateFontFamily();app.updateTheme();
    await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:false}});
   },{mode,tone,file:qa.surfaceFile});
   await page.waitForTimeout(500);await qa.selectTheme(page,stage);
   const toneState=await qa.stabilizeTone(page,tone,stage.name,{baseFontSize:23,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true});
   await page.evaluate(mode=>{
    const view=app.workspace.activeLeaf.view;
    if(mode==='live'){
     const line=view.editor.getValue().split('\n').findIndex(line=>line.startsWith('### '));
     view.editor.scrollIntoView({from:{line,ch:0},to:{line:line+9,ch:0}},true);
    }else view.containerEl.querySelector('h3').scrollIntoView({block:'start'});
   },mode);
   await page.waitForTimeout(200);
   await page.evaluate(mode=>{
    const root=app.workspace.activeLeaf.view.containerEl;
    const outer=root.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller');
    const heading=root.querySelector(mode==='reading'?'h3':'.HyperMD-header-3');
    outer.scrollTop+=heading.getBoundingClientRect().top-outer.getBoundingClientRect().top-24;
   },mode);
   await page.waitForTimeout(220);
   const headings=await page.evaluate(mode=>{
    const root=app.workspace.activeLeaf.view.containerEl,outer=root.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller'),clip=outer.getBoundingClientRect();
    return [3,4,5,6].map(level=>{
     const e=root.querySelector(mode==='reading'?'h'+level:'.HyperMD-header-'+level),s=getComputedStyle(e),r=e.getBoundingClientRect();
     return{level,text:e.textContent,size:s.fontSize,weight:s.fontWeight,font:s.fontFamily,style:s.fontStyle,color:s.color,box:r.toJSON(),fullyVisible:r.top>=clip.top&&r.bottom<=clip.bottom,overflow:document.documentElement.scrollWidth-innerWidth};
    });
   },mode);
   assert(headings.every(h=>h.fullyVisible&&h.overflow<=1),'Lower headings must be fully visible');
   const file=`${stage.name===qa.final.name?'v4':'v3'}-hierarchy-${tone}-${mode}.png`;
   const toneCapture=await qa.screenshot(page,{path:path.join(qa.out,file)},tone,stage.name);
   result.cases.push({theme:stage.name,cssSha256:stage.css_sha256,mode,tone,toneState,toneCapture,headings,file,sha256:qa.hashFile(path.join(qa.out,file))});
  }
  assert.equal(result.cases.length,8);assert.equal(result.errors.length,0);
  result.scriptSha256=qa.hashFile(__filename);result.configSha256=qa.hashFile(path.join(__dirname,'config.cjs'));result.status='PASS';
  fs.writeFileSync(path.join(qa.out,'HIERARCHY.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({hierarchyCases:8,status:'PASS'}));
 }finally{await browser.close()}
})().catch(error=>{fs.writeFileSync(path.join(qa.out,'HIERARCHY-failure.json'),JSON.stringify({error:String(error.stack),partial:result},null,2));console.error(error);process.exitCode=1});
