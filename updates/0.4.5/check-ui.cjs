/* Representative native core UI interactions in the guarded synthetic vault. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'evidence/ui');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Actual macOS core UI, plus desktop phone emulation. Native drag/drop, Windows/Linux chrome, touch/keyboard ergonomics and full accessibility certification are outside this check.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);let p;try{
 p=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[]);
 result.originalNativeMenus=await p.evaluate(()=>app.vault.getConfig('nativeMenus'));result.menuScope='Themeable app menus with nativeMenus=false; macOS-owned native menus are outside CSS testing.';
 // A native OS menu cannot be dismissed through CDP Escape. Start with fresh
 // action elements so an earlier native menu cannot leave has-active-menu set.
 await p.reload();await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{});
 // Enabling queues a debounced save; flush it before mobile emulation reloads.
 await p.evaluate(async()=>{for(const id of ['file-explorer','global-search','command-palette','switcher','page-preview','properties','word-count'])await app.internalPlugins.getPluginById(id).enable();await app.internalPlugins.saveConfig();const name='QA Release UI.md',text='---\nstatus: Draft\ntags: [qa]\n---\n\n# A quiet interface\n\nSynthetic interface specimen for core UI checks.\n\nFollow [[QA Release Companion|a connected idea]].\n\n- [ ] Review the next section.\n';const old=app.vault.getAbstractFileByPath(name);if(old)await app.vault.modify(old,text);else await app.vault.create(name,text)});
 for(const [geometry,width,height,mobile]of [['desktop',1280,900,false],['phone',390,844,true]]){
  await p.setViewportSize({width,height});if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{})}
  for(const tone of qa.tones){
   const row={geometry,width,height,tone,checks:{}};result.activeCase=row;save();
   await p.evaluate(async()=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();for(const l of app.workspace.getLeavesOfType('markdown').slice(1))l.detach();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release UI.md',mode:'preview'}})});
   await qa.selectTheme(p,qa.final);row.toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false,nativeMenus:false});
   await p.bringToFront();await p.evaluate(()=>{require('@electron/remote').getCurrentWindow().focus();app.updateUseNativeMenu()});
   async function capture(label,selector){const e=p.locator(selector).filter({visible:true}).first();await e.waitFor({state:'visible'});await p.waitForTimeout(800);const sample=await e.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},text:e.textContent.slice(0,350),font:s.fontFamily,overflow:e.scrollWidth-e.clientWidth}});row.checks[label]=sample;save();assert(sample.box.width>0&&sample.box.height>0);assert(sample.box.left>=-1&&sample.box.right<=width+1,`${label} escapes the viewport`);return sample}
   for(const [command,label,query]of [['command-palette:open','palette','Toggle reading'],['switcher:open','switcher','QA Release UI']]){
    assert(await p.evaluate(id=>app.commands.executeCommandById(id),command));await p.locator('.prompt-input').fill(query);await p.waitForTimeout(250);await capture(label,'.prompt');assert(await p.locator('.prompt .suggestion-item').count());assert(await p.locator('.prompt-input').evaluate(e=>e===document.activeElement));await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.prompt'));
   }
   await p.evaluate(()=>app.commands.executeCommandById('global-search:open'));const search=p.locator('.workspace-leaf-content[data-type="search"] input[type="search"]');await search.fill('"Synthetic interface specimen"');await p.waitForFunction(()=>document.querySelector('.search-result-file-title')?.textContent.includes('QA Release UI'));await capture('search','.workspace-leaf-content[data-type="search"]');await p.evaluate(()=>app.workspace.leftSplit.collapse());await p.waitForTimeout(800);
   await p.evaluate(()=>app.commands.executeCommandById('file-explorer:open'));await p.locator('.workspace-leaf-content[data-type="file-explorer"]').waitFor({state:'visible'});
   // The explorer virtualizes rows; its first deferred reveal can precede the
   // sidebar's layout. Materialize the row, then scroll its actual DOM bounds.
   await p.waitForFunction(()=>{const v=app.workspace.getLeavesOfType('file-explorer')[0].view,item=v.fileItems['QA Release UI.md'],s=v.containerEl.querySelector('.nav-files-container');if(!item||!s||s.clientHeight<100)return false;const r=item.selfEl.getBoundingClientRect();if(item.selfEl.isConnected&&r.height>0&&r.width>0)return true;v.revealInFolder(app.vault.getAbstractFileByPath('QA Release UI.md'));return false;});const file=p.locator('.nav-file-title[data-path="QA Release UI.md"]');await file.scrollIntoViewIfNeeded();await capture('file-explorer','.workspace-leaf-content[data-type="file-explorer"]');await file.click();await p.evaluate(()=>app.workspace.leftSplit.collapse());await p.waitForTimeout(800);
   await capture('properties','.markdown-reading-view .metadata-container');assert(await p.locator('.markdown-reading-view .metadata-property').count()>=2);
   const more=p.locator('.workspace-leaf.mod-active .view-action[aria-label="More options"]');await more.click();await capture('menu','.menu');assert(await p.locator('.menu-item').count()>=5);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.menu'));
   if(!mobile){
    await p.mouse.move(10,850);await p.waitForTimeout(250);await more.hover();await p.waitForTimeout(850);await capture('tooltip','.tooltip');await p.mouse.move(10,850);
    const link=p.locator('.markdown-reading-view a.internal-link').first();await p.keyboard.down('Meta');await link.hover();await p.waitForTimeout(1000);await capture('hover-preview','.hover-popover');await p.keyboard.up('Meta');await p.mouse.move(10,850);await p.waitForTimeout(400);
   }
   const screenshot=`${geometry}-${tone}-ui.png`;await qa.screenshot(p,{path:path.join(out,screenshot)},tone,qa.final);row.screenshot=screenshot;row.screenshotSha256=qa.hashFile(path.join(out,screenshot));row.toneAfter=await qa.assertTone(p,tone,qa.final);result.cases.push(row);delete result.activeCase;save();console.log(JSON.stringify({geometry,tone,checks:Object.keys(row.checks),status:'PASS'}));
  }
 }
 assert.equal(result.cases.length,4);result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{if(p&&result.originalNativeMenus!==undefined)await p.evaluate(async value=>{app.vault.setConfig('nativeMenus',value);await app.vault.saveConfig();app.updateUseNativeMenu()},result.originalNativeMenus);await browser.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
