/* Compare normalized CSS with exact 0.4.1 under the same explicit reading font. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright'),qa=require('../../scripts/config.cjs');
const {html}=require('../../scripts/fixture.cjs');
const modules=fs.existsSync(path.join(qa.root,'node_modules/postcss'))?path.join(qa.root,'node_modules'):path.join(qa.root,'work/lint/node_modules');
const postcss=require(path.join(modules,'postcss')),parser=require(path.join(modules,'postcss-selector-parser'));
const out=path.join(__dirname,'evidence/normalization');fs.mkdirSync(out,{recursive:true});
const beforePath=path.join(qa.root,'updates/0.4.1/theme/Cupertino Reading Lab v4/theme.css');
const previous=fs.readFileSync(beforePath),base=fs.readFileSync(path.join(__dirname,'source/base.css'));
const result={status:'INCOMPLETE',scope:'Selector preservation and matched actual-app V4.1/current rendering using Times New Roman. Font bundling has its own tests.',startedAt:new Date().toISOString(),scriptSha256:qa.hashFile(__filename),beforeCssSha256:qa.sha(previous),cssSha256:qa.final.css_sha256,cases:[],comparisons:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
const legacy={':before':'::before',':after':'::after',':first-line':'::first-line',':first-letter':'::first-letter'};
function normalizedSelector(selector){function plain(n){return{type:n.type,value:legacy[n.value]||n.value,attribute:n.attribute,operator:n.operator,namespace:n.namespace,insensitive:n.insensitive,nodes:n.nodes?.map(plain)}}return plain(parser().astSync(selector));}
function selectors(css){const rows=[];postcss.parse(css).walkRules(n=>{if(n.selector.includes('::focus-visible'))return;if(n.parent.type==='atrule'&&/keyframes$/.test(n.parent.name))rows.push({keyframe:n.selector.replace(/\bfrom\b/g,'0%').replace(/\bto\b/g,'100%')});else rows.push({selector:normalizedSelector(n.selector)});});return rows;}
const oldSelectors=selectors(previous),newSelectors=selectors(base);assert.deepEqual(newSelectors,oldSelectors);
result.selectorPreservation={status:'PASS',rules:oldSelectors.length,scope:'Identical selector AST and rule order, except removed dead focus rule and equivalent attribute quotes, legacy pseudo-element and keyframe notation. Chained not() and specificity preserved.'};save();

(async()=>{
 // Regression guard: the modern base word-wrap must still be canceled by the
 // reading-table override. Otherwise long identifiers make thousand-pixel rows.
 result.tableWrap=[];
 for(const [engine,launcher]of Object.entries({chromium,webkit})){
  const browser=await launcher.launch({headless:true});try{
   const pair=[];
   for(const [version,css]of [['before',previous],['after',fs.readFileSync(path.join(qa.root,qa.final.folder,'theme.css'))]]){
    const p=await browser.newPage({viewport:{width:390,height:844}});await p.setContent(html('reading','light',23,'Georgia',390));await p.addStyleTag({content:fs.readFileSync(path.join(qa.work,'app/app.css'),'utf8')});await p.addStyleTag({content:css.toString()});
    const values=await p.evaluate(()=>{const table=document.querySelector('table');table.querySelector('tbody td:nth-child(3)').textContent='LongUnbrokenIdentifier'.repeat(16);const c=table.querySelector('tbody td:nth-child(3)');const measure=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{width:r.width,height:r.height,wordBreak:s.wordBreak,overflowWrap:s.overflowWrap}};return{table:measure(table),cell:measure(c)}});pair.push(values);result.tableWrap.push({engine,version,...values});await p.close();
   }
   assert.deepEqual(pair[1],pair[0],`${engine}: long-word table wrap changed`);save();
  }finally{await browser.close()}
 }
 const browser=await chromium.connectOverCDP(qa.endpoint);try{
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(page,result);
 const before={name:'Cupertino v4 0.4.1 Control QA',css_sha256:qa.sha(previous)};
 const dir=path.join(qa.vault,'.obsidian/themes',before.name);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'theme.css'),previous);fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({name:before.name,version:'0.4.1',minAppVersion:'1.13.4',author:'Disposable regression control'}));
 for(const [geometry,width,height,mobile]of [['desktop',1280,900,false],['portrait',390,844,true]])for(const tone of ['light','dark'])for(const mode of ['reading','live','source']){
  if(await page.evaluate(()=>app.isMobile)!==mobile){await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(m=>app.emulateMobile(m),mobile)]);await page.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(page,{});}
  await page.setViewportSize({width,height});const pair=[];
  for(const [version,stage]of [['before',before],['after',qa.final]]){
   await page.evaluate(async({file,mode})=>{document.querySelector('#qa-text-spacing')?.remove();app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();const leaves=app.workspace.getLeavesOfType('markdown');for(const leaf of leaves.slice(1))leaf.detach();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:mode==='source'}});if(mode!=='reading')app.workspace.activeLeaf.view.editor.setCursor({line:0,ch:0});},{file:qa.surfaceFile,mode});
   await qa.selectTheme(page,stage);const toneState=await qa.stabilizeTone(page,tone,stage,{textFontFamily:'Times New Roman',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:23,showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false});
   await page.evaluate(()=>{for(const e of document.querySelectorAll('.markdown-preview-view,.cm-scroller'))e.scrollTop=0;return document.fonts.ready});await page.waitForTimeout(300);
   const snapshot=await page.evaluate(mode=>{const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};const root=[...document.querySelectorAll('.markdown-reading-view > .markdown-preview-view,.markdown-source-view > .cm-editor > .cm-scroller')].find(visible);const rows=[...root.querySelectorAll(mode==='reading'?'h1,h2,h3,h4,h5,h6,p,code,mark,a,.callout,.callout-title,table,th,td':'.cm-line')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&r.bottom>100&&r.top<innerHeight-50}).slice(0,30).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,text:e.textContent,box:[r.x,r.y,r.width,r.height],style:Object.fromEntries(['fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','color','backgroundColor','marginTop','marginBottom','paddingTop','paddingBottom','borderTopWidth','borderLeftWidth','textTransform'].map(k=>[k,s[k]]))}});return{rows,pageOverflow:document.documentElement.scrollWidth-innerWidth};},mode);
   assert(snapshot.pageOverflow<=1);assert(snapshot.rows.length);
   const file=`${geometry}-${tone}-${mode}-${version}.png`;await qa.screenshot(page,{path:path.join(out,file)},tone,stage);
   const row={geometry,tone,mode,version,theme:stage.name,cssSha256:stage.css_sha256,toneState,toneAfter:await qa.assertTone(page,tone,stage),snapshot,screenshot:file,screenshotSha256:qa.hashFile(path.join(out,file))};pair.push(row);result.cases.push(row);save();
  }
  const [a,b]=pair;assert.equal(a.snapshot.rows.length,b.snapshot.rows.length);
  for(let i=0;i<a.snapshot.rows.length;i++){const left=a.snapshot.rows[i],right=b.snapshot.rows[i];assert.equal(left.text,right.text);assert.equal(left.tag,right.tag);assert.deepEqual(right.style,left.style,`${geometry}/${tone}/${mode}/${i}: computed styles changed`);for(let j=0;j<4;j++)assert(Math.abs(right.box[j]-left.box[j])<.1,`${geometry}/${tone}/${mode}/${i}: geometry changed`);}
  result.comparisons.push({geometry,tone,mode,status:'PASS',rows:a.snapshot.rows.length});save();console.log(JSON.stringify({geometry,tone,mode,status:'PASS'}));
 }
 assert.equal(result.cases.length,24);assert.equal(result.comparisons.length,12);result.status='PASS';result.finishedAt=new Date().toISOString();save();
 await qa.selectTheme(page,qa.final);
}finally{await browser.close()}})().catch(error=>{result.status='FAIL';result.errors.push(String(error.stack));save();console.error(error);process.exitCode=1});
