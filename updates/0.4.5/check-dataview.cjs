/* Optional, separate integration phase using official pinned Dataview assets. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs'),fixture=require('./wide-fixture.cjs');
const pinned={'main.js':'6bb1cf7010afad830e73575fca0e2bfbd3279c562e3d9d24f2d2f45161eb7d00','manifest.json':'9235db47112da81b85591c79ecb9ae2574e5e72207056e976472f90616286185','styles.css':'3306dd9032e00f989ba7233a37fd255bc4d3f4340cee661762e952f3f6aa1de9'};
assert(process.env.QA_DATAVIEW,'Set QA_DATAVIEW to the official 0.5.70 release assets directory');
const source=path.resolve(process.env.QA_DATAVIEW);for(const [name,hash]of Object.entries(pinned))assert.equal(qa.hashFile(path.join(source,name)),hash,'Unexpected plugin asset');
const out=path.join(__dirname,'evidence/dataview');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Dataview DQL table/cards integration in isolated macOS Obsidian, including desktop mobile emulation. No DataviewJS or other plugins.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),fixtureSha256:qa.hashFile(require.resolve('./wide-fixture.cjs')),plugin:{repository:'blacksmithgu/obsidian-dataview',releaseTag:'0.5.70',declaredManifestVersion:JSON.parse(fs.readFileSync(path.join(source,'manifest.json'))).version,assets:pinned},startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);let p;try{
 p=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);
 assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[],'Integration must start without other community plugins');
 const destination=path.join(qa.vault,'.obsidian/plugins/dataview');fs.mkdirSync(destination,{recursive:true});assert(!fs.lstatSync(destination).isSymbolicLink());for(const name of Object.keys(pinned))fs.copyFileSync(path.join(source,name),path.join(destination,name));
 result.communityPluginsPreviouslyEnabled=await p.evaluate(()=>app.plugins.isEnabled());
 await p.evaluate(async()=>{await app.plugins.setEnable(true);await app.plugins.loadManifests();const loaded=await app.plugins.enablePluginAndSave('dataview');if(!loaded)throw Error('Dataview failed to load');await app.plugins.saveConfig()});
 await p.waitForFunction(()=>!!app.plugins.plugins.dataview?.api);assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),['dataview']);
 const variants=['','table-wide','table-max','cards, table-100'];
 const files=Object.fromEntries(variants.map((helper,i)=>[`QA Release Dataview ${i}.md`,fixture.note({kind:'dataview',helper})]));
 await p.evaluate(async files=>{for(const [name,content]of Object.entries(files)){const old=app.vault.getAbstractFileByPath(name);if(old)await app.vault.modify(old,content);else await app.vault.create(name,content)}},files);
 for(const [geometry,width,height,mobile]of [['desktop',1440,900,false],['phone',390,844,true]]){
  await p.setViewportSize({width,height});
  if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{})}
  for(const tone of qa.tones)for(const mode of ['reading','live']){
   await p.evaluate(async()=>{app.setting.close();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release prose default.md',mode:'preview'}})});
   await qa.selectTheme(p,qa.final);const toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true});
   let control;
   for(const [i,helper]of variants.entries()){
    result.activeCase={geometry,tone,mode,helper};save();
    await p.evaluate(async({i,mode})=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:`QA Release Dataview ${i}.md`,mode:mode==='reading'?'preview':'source',source:false}});if(mode==='live')app.workspace.activeLeaf.view.editor.setCursor({line:4,ch:0})},{i,mode});
    const selector=mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.markdown-source-view';
    await p.waitForFunction(selector=>document.querySelector(selector+' table.dataview tbody')?.textContent.includes('Gamma'),selector);
    await p.waitForTimeout(250);
    const sample=await p.evaluate(({selector,mode})=>{
     const root=app.workspace.activeLeaf.view.containerEl.querySelector(selector),s=mode==='reading'?root:root.querySelector('.cm-scroller'),table=root.querySelector('table.dataview'),block=table.closest('.block-language-dataview'),r=block.getBoundingClientRect();
     const paragraph=[...root.querySelectorAll(mode==='reading'?'.el-p>p':'.cm-line')].find(e=>e.textContent.startsWith('Prose measure before'));
     const ancestors=[];for(let e=table;e&&e!==s;e=e.parentElement)if(['auto','scroll'].includes(getComputedStyle(e).overflowX)&&e.scrollWidth>e.clientWidth){e.scrollLeft=e.scrollWidth;ancestors.push({class:e.className,scrollLeft:e.scrollLeft})}
     const end=table.querySelector('tbody tr:last-child td:last-child').getBoundingClientRect(),sr=s.getBoundingClientRect();
     return{block:{left:r.left,right:r.right,width:r.width,height:r.height},pane:{left:sr.left,right:sr.left+s.clientWidth},paragraphWidth:paragraph.getBoundingClientRect().width,pageOverflow:document.documentElement.scrollWidth-innerWidth,paneOverflow:s.scrollWidth-s.clientWidth,rows:table.querySelectorAll('tbody tr').length,grid:getComputedStyle(table.tBodies[0]).display,end:{left:end.left,right:end.right},ancestors,errors:[...root.querySelectorAll('.dataview-error')].map(e=>e.textContent)};
    },{selector,mode});
    const row={geometry,width,height,tone,mode,helper,toneState,toneAfter:await qa.assertTone(p,tone,qa.final),...sample};result.activeCase=row;save();
    assert.equal(sample.rows,3);assert.equal(sample.errors.length,0);assert(sample.pageOverflow<=1&&sample.paneOverflow<=1);assert(sample.end.right<=sample.pane.right+1&&sample.end.left>=sample.pane.left-1,'Last Dataview field is unreachable');
    if(!helper)control=sample;else{assert(Math.abs(sample.paragraphWidth-control.paragraphWidth)<=1);if(geometry==='desktop')assert(sample.block.width>control.block.width+30)}
    if(helper.startsWith('cards'))assert.equal(sample.grid,'grid');
    if(mode==='reading'&&helper.startsWith('cards')){const screenshot=`${geometry}-${tone}-cards.png`;await qa.screenshot(p,{path:path.join(out,screenshot)},tone,qa.final);row.screenshot=screenshot;row.screenshotSha256=qa.hashFile(path.join(out,screenshot));}
    result.cases.push(row);delete result.activeCase;save();console.log(JSON.stringify({geometry,tone,mode,helper,status:'PASS'}));
   }
  }
 }
 assert.equal(result.cases.length,32);result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{if(p){await p.evaluate(async previous=>{if(app.plugins.plugins.dataview)await app.plugins.disablePluginAndSave('dataview');await app.plugins.saveConfig();if(previous!==undefined)await app.plugins.setEnable(previous)},result.communityPluginsPreviouslyEnabled);result.pluginDisabled=await p.evaluate(()=>!app.plugins.plugins.dataview);save()}await browser.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
