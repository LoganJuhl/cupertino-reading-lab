/* Serialized actual-app DOM in standalone WebKit; no native iOS claim. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'evidence/wide-webkit');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Standalone WebKit using current Obsidian DOM/CSS; wide-helper geometry only, not the native iOS shell or compositor.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
(async()=>{const appBrowser=await chromium.connectOverCDP(qa.endpoint),browser=await webkit.launch();try{
 const p=appBrowser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[]);
 const appCss=fs.readFileSync(path.join(qa.work,'app/app.css'),'utf8'),cmCss=fs.readFileSync(path.join(qa.work,'app/codemirror.css'),'utf8');
 result.appCssSha256=qa.sha(appCss);result.cmCssSha256=qa.sha(cmCss);result.engine=browser.version();
 for(const [width,height,mobile]of [[1440,900,false],[390,844,true]]){
  await p.setViewportSize({width,height});if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
  for(const tone of qa.tones)for(const mode of ['reading','live']){
   await p.evaluate(()=>app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release prose default.md',mode:'preview'}}));await qa.selectTheme(p,qa.final);await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true});
   for(const [kind,helper]of [['table','table-100'],['image','img-100'],['bases','bases-100'],['bases','']]){
    result.activeCase={width,tone,mode,kind,helper};save();
    await p.evaluate(async({kind,helper,mode})=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:`QA Release ${kind} ${helper||'default'}.md`,mode:mode==='reading'?'preview':'source',source:false}});if(mode==='live')app.workspace.activeLeaf.view.editor.setCursor({line:4,ch:0})},{kind,helper,mode});await p.waitForTimeout(300);
    const selector=mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.markdown-source-view';
    await p.locator(selector+(kind==='table'?' table':kind==='image'?' .image-embed img':' .bases-embed')).first().waitFor({state:'visible'});
    const captured=await p.evaluate(()=>({html:document.body.outerHTML,styles:[...document.querySelectorAll('style')].map(s=>s.textContent).join('\n')}));
    const page=await browser.newPage({viewport:{width,height}});
    // All content comes from the guarded synthetic vault. Prevent external loads.
    await page.route(/^(?:https?:|app:)/,route=>route.abort());
    await page.setContent('<!doctype html><html><head><style>'+appCss+cmCss+captured.styles+'</style></head>'+captured.html+'</html>');
    await page.evaluate(svg=>{for(const e of document.querySelectorAll('script'))e.remove();for(const e of document.querySelectorAll('img[alt="QA Release Image.svg"]'))e.src='data:image/svg+xml;base64,'+svg},Buffer.from(require('./wide-fixture.cjs').files['QA Release Image.svg']).toString('base64'));
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
    const sample=await page.evaluate(({selector,mode,kind})=>{
     const root=document.querySelector(selector),s=mode==='reading'?root:root.querySelector('.cm-scroller'),block=root.querySelector(kind==='table'?'table':kind==='image'?'.image-embed img':'.bases-embed');
     const sr=s.getBoundingClientRect();for(let e=block;e&&e!==s;e=e.parentElement)if(['auto','scroll'].includes(getComputedStyle(e).overflowX))e.scrollLeft=e.scrollWidth;
     const last=kind==='table'?block.querySelector('tbody tr:last-child td:last-child'):kind==='bases'?block.querySelector('.bases-tbody .bases-tr:last-child .bases-td:last-child'):block;
     const r=last.getBoundingClientRect();return{pageOverflow:document.documentElement.scrollWidth-innerWidth,paneOverflow:s.scrollWidth-s.clientWidth,last:{left:r.left,right:r.right,width:r.width,height:r.height},pane:{left:sr.left,right:sr.left+s.clientWidth},tone:document.body.classList.contains('theme-dark')?'dark':'light',containerType:getComputedStyle(s).containerType};
    },{selector,mode,kind});
    const row={width,height,tone,mode,kind,helper,...sample};result.activeCase=row;save();assert.equal(sample.tone,tone);assert(sample.pageOverflow<=1&&sample.paneOverflow<=1);assert(sample.last.width>0&&sample.last.height>0);assert(sample.last.right<=sample.pane.right+1&&sample.last.left>=sample.pane.left-1);
    result.cases.push(row);delete result.activeCase;save();await page.close();console.log(JSON.stringify({width,tone,mode,kind,helper,status:'PASS'}));
   }
  }
 }
 assert.equal(result.cases.length,32);result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{await browser.close();await appBrowser.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
