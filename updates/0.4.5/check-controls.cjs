/* Actual settings keyboard focus and painted native caret in the isolated app. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'evidence/controls');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'macOS settings dropdown/button/switch keyboard focus and native painted caret in Live Preview/Source, light/dark. No iPhone or whole-app accessibility certification.',startedAt:new Date().toISOString(),cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');save();
function caretPixels(bytes,clip,coords,paper){const png=PNG.sync.read(bytes),scale=png.width/clip.width,center=(coords.left-clip.x)*scale;let best=0;for(let x=Math.floor(center)-3;x<=Math.ceil(center)+3;x++){let run=0;for(let y=Math.ceil((coords.top-clip.y+2)*scale);y<Math.floor((coords.bottom-clip.y-2)*scale);y++){const i=(y*png.width+x)*4;const ink=Math.max(...[0,1,2].map(k=>Math.abs(png.data[i+k]-paper[k])))>80;run=ink?run+1:0;best=Math.max(best,run)}}return{scale,longestVerticalInkRun:best,required:Math.floor((coords.bottom-coords.top-4)*scale*.65)}}
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);try{
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(page,result);
 if(await page.evaluate(()=>app.isMobile)){await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>app.emulateMobile(false))]);await page.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(page,{})}
 await page.setViewportSize({width:1280,height:900});
 fs.writeFileSync(path.join(qa.vault,'QA Caret.md'),'# Caret check\n\nAlpha     beta gamma delta.\n');await page.waitForTimeout(250);
 for(const tone of ['light','dark'])for(const mode of ['live','source']){
  await page.evaluate(async mode=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();for(const l of app.workspace.getLeavesOfType('markdown').slice(1))l.detach();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Caret.md',mode:'source',source:mode==='source'}});},mode);
  await qa.selectTheme(page,qa.final);const toneState=await qa.stabilizeTone(page,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:23,showInlineTitle:false,readableLineLength:true});
  await page.evaluate(()=>{app.setting.open();app.setting.openTabById('appearance')});await page.waitForTimeout(1200);
  // Obsidian can retain an empty settings window while moving the active tab.
  // Identify its actual owner document instead of taking the first blank page.
  const windowMarker=`controls-${tone}-${mode}`;
  await page.waitForFunction(()=>app.setting.activeTab?.containerEl.isConnected&&app.setting.activeTab.containerEl.querySelector('select.dropdown:not(.is-measuring)'));
  await page.evaluate(marker=>{app.setting.activeTab.containerEl.ownerDocument.documentElement.dataset.qaControls=marker},windowMarker);
  let settings;for(const candidate of browser.contexts()[0].pages())if(candidate.url()==='about:blank'&&await candidate.evaluate(marker=>document.documentElement.dataset.qaControls===marker,windowMarker)){settings=candidate;break}
  assert(settings,'Active isolated settings popout missing');assert((await settings.title()).includes('qa-vault'));
  const settingCss=await settings.evaluate(()=>{const s=[...document.querySelectorAll('style')].find(s=>s.textContent.includes('Embedded Newsreader:'));return s&&require('crypto').createHash('sha256').update(s.textContent).digest('hex')});assert.equal(settingCss,qa.final.css_sha256);
  await settings.bringToFront();await settings.keyboard.press('Tab');const controls=[];
  for(const [kind,selector]of [['dropdown','select.dropdown:not(.is-measuring)'],['button','.setting-item-control button'],['switch','.checkbox-container']]){
   const target=settings.locator(selector).first();await target.scrollIntoViewIfNeeded();await target.focus();await settings.waitForTimeout(550);
   const sample=await settings.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect(),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;return{label:e.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent,tag:e.tagName,class:e.className,focusVisible:e.matches(':focus-visible'),documentFocused:document.hasFocus(),outlineStyle:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,boxShadow:s.boxShadow,text:e.tagName==='SELECT'?e.selectedOptions[0].textContent:e.textContent,availableTextWidth:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),requiredTextWidth:e.tagName==='SELECT'?ctx.measureText(e.selectedOptions[0].textContent).width:null,rect:r.toJSON()}});
   result.activeCase={tone,mode,kind,sample};save();
   assert(sample.focusVisible&&sample.documentFocused);assert(sample.outlineWidth>0||sample.boxShadow!=='none');if(kind==='switch'){assert.equal(sample.outlineStyle,'solid');assert.equal(sample.outlineWidth,2);assert.equal(sample.outlineOffset,'3px')}if(kind==='dropdown')assert(sample.availableTextWidth>=sample.requiredTextWidth,'Selected value is clipped');
   const screenshot=`${tone}-${mode}-${kind}.png`;await settings.screenshot({path:path.join(out,screenshot)});controls.push({kind,...sample,screenshot,screenshotSha256:qa.hashFile(path.join(out,screenshot))});
  }
  await page.evaluate(()=>app.setting.close());await page.bringToFront();await page.evaluate(()=>require('@electron/remote').getCurrentWindow().focus());await page.waitForTimeout(650);await page.evaluate(async()=>document.fonts.ready);
  await page.evaluate(()=>{const e=app.workspace.activeLeaf.view.editor;e.focus();e.setCursor({line:2,ch:7});e.scrollIntoView({from:{line:2,ch:7},to:{line:2,ch:7}},true)});await page.keyboard.press('ArrowRight');
  const caret=await page.evaluate(()=>{const e=app.workspace.activeLeaf.view.editor,cm=e.cm;return{position:e.getCursor(),coords:cm.coordsAtPos(cm.state.selection.main.head),focused:cm.hasFocus,documentFocused:document.hasFocus(),caretColor:getComputedStyle(cm.contentDOM).caretColor,domCursors:cm.dom.querySelectorAll('.cm-cursor').length}});assert(caret.focused&&caret.documentFocused);assert.deepEqual(caret.position,{line:2,ch:8});assert(caret.coords.bottom>caret.coords.top);
  const c=caret.coords,clip={x:Math.floor(c.left)-10,y:Math.floor(c.top)-5,width:60,height:Math.ceil(c.bottom-c.top)+15};const frames=[];let painted=false,accepted;
  for(let i=0;i<7;i++){const screenshot=`${tone}-${mode}-caret-${i}.png`;const bytes=await page.screenshot({path:path.join(out,screenshot),clip,caret:'initial'});const pixels=caretPixels(bytes,clip,c,toneState.palette.paperRgba);frames.push({screenshot,screenshotSha256:qa.hashFile(path.join(out,screenshot)),...pixels});if(pixels.longestVerticalInkRun>=pixels.required){painted=true;accepted=frames.at(-1);break}await page.waitForTimeout(170)}
  assert(painted,'No painted caret was captured at its logical whitespace position');
  result.cases.push({tone,mode,toneState,toneAfter:await qa.assertTone(page,tone,qa.final),settingsCssSha256:settingCss,controls,caret:{...caret,painted,clip,frames},screenshot:accepted.screenshot,screenshotSha256:accepted.screenshotSha256});save();console.log(JSON.stringify({tone,mode,controls:controls.length,paintedCaret:painted,status:'PASS'}));
 }
 result.mobileSettings=[];
 await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>app.emulateMobile(true))]);await page.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(page,{});
 for(const [geometry,width,height]of [['portrait',390,844],['landscape',844,390]])for(const tone of ['light','dark']){
  await page.setViewportSize({width,height});await page.evaluate(async()=>app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Caret.md',mode:'preview'}}));await qa.selectTheme(page,qa.final);await qa.stabilizeTone(page,tone,qa.final,{textFontFamily:'',baseFontSize:23});await page.evaluate(()=>{app.setting.open();app.setting.openTabById('appearance')});await page.waitForTimeout(1000);
  assert(await page.evaluate(()=>app.setting.activeTab.containerEl.ownerDocument===document),'Unexpected mobile settings document');
  const dropdowns=await page.evaluate(()=>[...app.setting.activeTab.containerEl.querySelectorAll('select.dropdown:not(.is-measuring)')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;return{text:e.selectedOptions[0].textContent,available:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),required:ctx.measureText(e.selectedOptions[0].textContent).width,left:r.left,right:r.right}}));
  assert(dropdowns.length>=2);for(const d of dropdowns){assert(d.available>=d.required,'Mobile selected value clipped');assert(d.left>=0&&d.right<=width+1,'Mobile settings control outside viewport')}
  const screenshot=`mobile-${geometry}-${tone}-settings.png`;await page.screenshot({path:path.join(out,screenshot)});result.mobileSettings.push({geometry,tone,width,height,scope:'Desktop Obsidian mobile emulation',dropdowns,screenshot,screenshotSha256:qa.hashFile(path.join(out,screenshot))});save();await page.evaluate(()=>app.setting.close());
 }
 assert.equal(result.cases.length,4);assert.equal(result.mobileSettings.length,4);delete result.activeCase;result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{await browser.close()}})().catch(error=>{result.status='FAIL';result.errors.push(String(error.stack));save();console.error(error);process.exitCode=1});
