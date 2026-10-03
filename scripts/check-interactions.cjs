const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('playwright');
const qa=require('./config.cjs');
const {root,out}=qa;
const expected=qa.stages.at(-1);
const fixture=fs.readFileSync(path.join(root,'design/fixtures/QA Tables Simple.md'),'utf8');
const result={scope:'Native Obsidian table editing through pointer and keyboard input in a guarded disposable vault.',cssSha256:expected.css_sha256,cases:[]};
qa.begin('INTERACTIONS',result);
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
 const p=b.contexts()[0].pages().find(p=>p.url().includes('index.html'));
 await qa.guard(p,result);
 for(const [geometry,width,height,mobile]of [['narrow-desktop',430,932,false],['desktop',1280,900,false]])for(const tone of ['light','dark']){
  await p.setViewportSize({width,height});
  if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
  const fileName=`QA Editing ${Date.now()} ${geometry} ${tone}.md`;
  await p.evaluate(async({tone,fixture,fileName,theme})=>{
   app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.customCss.setTheme(theme);
   for(const [k,v]of Object.entries({baseFontSize:20,textFontFamily:'Arial',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);
   app.updateFontSize();app.updateFontFamily();app.updateTheme();
   const file=await app.vault.create(fileName,fixture);
   await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:file.path,mode:'source',source:false}});
  },{tone,fixture,fileName,theme:qa.final.name});
  await p.waitForTimeout(650);
  await p.waitForFunction(expected=>require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,expected);
  const toneState=await qa.stabilizeTone(p,tone,expected,{baseFontSize:20,textFontFamily:'Arial',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true});
  assert.equal(crypto.createHash('sha256').update(await p.evaluate(()=>app.customCss.styleEl.textContent)).digest('hex'),expected.css_sha256);
  const cell=p.locator('.markdown-source-view .cm-table-widget tbody tr:first-child td:first-child > .table-cell-wrapper:visible').first();
  await cell.dblclick();
  await p.locator('.cm-table-widget td .cm-content[contenteditable=true]').click();
  await p.waitForFunction(()=>!!document.activeElement?.closest('.cm-table-widget'));
  await qa.assertTone(p,tone,expected);
  const editing=await p.evaluate(()=>{
   const e=document.activeElement,s=getComputedStyle(e);return {class:e.className,editable:e.getAttribute('contenteditable'),text:e.textContent,whiteSpace:s.whiteSpace,insideCell:!!e.closest('td')};
  });
  assert(editing.class.includes('cm-content'),'Native CodeMirror did not receive keyboard focus');assert.equal(editing.editable,'true');assert(editing.insideCell);assert(['normal','pre-wrap'].includes(editing.whiteSpace),'Editable text lost wrapping');
  await p.keyboard.press('Meta+a');await p.keyboard.insertText('Edited v4 cell');await p.keyboard.press('Tab');
  await p.locator('.markdown-source-view .HyperMD-header-1').click();
  let saved='';
  for(let attempt=0;attempt<50;attempt++){
   saved=await p.evaluate(fileName=>app.vault.read(app.vault.getAbstractFileByPath(fileName)),fileName);
   if(saved.includes('Edited v4 cell'))break;
   await p.waitForTimeout(200);
  }
  assert(saved.includes('| Item'));assert(saved.includes('A long descriptive cell'));assert(saved.includes('Edited v4 cell'));
  // Use Obsidian's row handle to select both cells through its native control.
  await cell.hover();await p.locator('.cm-table-widget tbody tr:first-child > td:first-child > .table-row-drag-handle').click();
  await p.waitForTimeout(200);
  await qa.assertTone(p,tone,expected);
  const selection=await p.evaluate(()=>[...document.querySelectorAll('.cm-table-widget .is-selected')].map(e=>{
   const s=getComputedStyle(e,'::after');return {tag:e.tagName,class:e.className,fill:s.backgroundColor,top:s.borderTopWidth,bottom:s.borderBottomWidth,left:s.borderLeftWidth,right:s.borderRightWidth};
  }));
  assert(selection.length>=2,'Native table selection did not expand');
  assert(selection.some(s=>s.fill!=='rgba(0, 0, 0, 0)'),'Selection not visible');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);
  await qa.screenshot(p,{path:path.join(out,`editing-${geometry}-${tone}.png`)},tone,expected);
  result.cases.push({geometry,tone,toneState,toneAfter:await qa.assertTone(p,tone,expected),editing,selection,savedContainsEdit:true});
  console.log(JSON.stringify({editing:geometry,tone,passed:true}));
  await p.evaluate(async fileName=>{await app.workspace.activeLeaf.setViewState({type:'empty'});await app.vault.delete(app.vault.getAbstractFileByPath(fileName))},fileName);
 }
 qa.finish('INTERACTIONS',result);
}finally{await b.close()}})().catch(e=>{fs.writeFileSync(path.join(out,'INTERACTIONS-failure.json'),JSON.stringify({error:String(e.stack),result},null,2));console.error(e);process.exitCode=1});
