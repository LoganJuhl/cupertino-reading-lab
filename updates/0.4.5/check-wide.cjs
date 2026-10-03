/* Real renderer checks. Mobile/tablet cases emulate app classes on macOS. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs'),fixture=require('./wide-fixture.cjs');
const out=path.join(__dirname,'evidence/wide');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Actual Obsidian blocks, built-in Bases/Canvas and inherited width helpers. Phone/tablet are desktop app emulation, not physical iOS.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),fixtureSha256:qa.hashFile(require.resolve('./wide-fixture.cjs')),startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
// A visible custom element can precede CHTML styles, glyphs and webfonts.
// Require the bundled renderer's actual output and stable, fully loaded geometry.
async function waitForMath(page,root){
 return page.evaluate(async root=>{
  const deadline=performance.now()+15000;let previous=null,stable=0,last=null;
  while(performance.now()<deadline){
   const container=document.querySelector(root+' .math-block mjx-container[display="true"]');
   const math=container?.querySelector('mjx-math');
   const glyphs=math?[...math.querySelectorAll('mjx-c')]:[];
   const bounds=math?.getBoundingClientRect();
   const glyphBounds=glyphs.map(g=>g.getBoundingClientRect());
   const families=new Set(glyphs.flatMap(g=>getComputedStyle(g,'::before').fontFamily.split(',').map(f=>f.trim().replace(/^["']|["']$/g,''))).filter(f=>/^MJX/.test(f)));
   const faces=[...document.fonts].filter(f=>families.has(f.family.replace(/^["']|["']$/g,'')));
   const ready=!!(container&&math&&glyphs.length&&bounds.width>0&&bounds.height>0&&
    getComputedStyle(container).display==='block'&&getComputedStyle(math).display==='inline-block'&&
    glyphBounds.some(b=>b.width>0&&b.height>0)&&document.fonts.status==='loaded'&&
    families.size>0&&[...families].every(family=>faces.some(f=>f.family.replace(/^["']|["']$/g,'')===family&&f.status==='loaded'))&&
    faces.every(f=>f.status!=='loading'&&f.status!=='error'));
   last={ready,glyphs:glyphs.length,fontStatus:document.fonts.status,fonts:faces.map(f=>({family:f.family,status:f.status})),
    bounds:bounds?{width:bounds.width,height:bounds.height}:null};
   const signature=ready?JSON.stringify([bounds.x,bounds.y,bounds.width,bounds.height,container.clientWidth,container.scrollWidth,glyphs.length]):null;
   stable=signature&&signature===previous?stable+1:0;previous=signature;
   if(stable>=2)return{...last,stableSamples:3};
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('MathJax did not reach loaded, stable CHTML geometry: '+JSON.stringify(last));
 },root);
}
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);try{
 const p=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);
 assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[],'Run core checks without community plugins');
 await p.evaluate(async files=>{
  for(const id of ['bases','canvas'])await app.internalPlugins.getPluginById(id).enable();
  if(!app.vault.getAbstractFileByPath('QA Release Data'))await app.vault.createFolder('QA Release Data');
  for(const [name,content]of Object.entries(files)){const old=app.vault.getAbstractFileByPath(name);if(old)await app.vault.modify(old,content);else await app.vault.create(name,content)}
 },fixture.files);
 for(const [geometry,width,height,mobile]of [['desktop',1440,900,false],['phone',390,844,true],['tablet',820,1180,true]]){
  await p.setViewportSize({width,height});
  if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{})}
  for(const tone of qa.tones)for(const mode of geometry==='tablet'?['reading']:['reading','live']){
   await p.evaluate(async()=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();for(const l of app.workspace.getLeavesOfType('markdown').slice(1))l.detach();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release prose default.md',mode:'preview'}})});
   await qa.selectTheme(p,qa.final);const toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false});
   const baseline={};
   for(const item of fixture.cases.filter(c=>geometry!=='tablet'||!c.helper)){
    const label={geometry,width,height,tone,mode,kind:item.kind,helper:item.helper};result.activeCase=label;save();
    await p.evaluate(async({file,mode})=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:false}});const v=app.workspace.activeLeaf.view;if(mode==='live'){v.editor.setCursor({line:4,ch:0});v.editor.scrollTo(0,0)}else v.previewMode.containerEl.scrollTop=0;}, {...item,mode});
    const root=mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.markdown-source-view';
    const selectors={prose:mode==='reading'?'.el-p > p':'.cm-line',table:'table',image:'.image-embed img',bases:'.bases-embed',code:mode==='reading'?'pre.language-javascript':'.HyperMD-codeblock',mermaid:'.mermaid svg',math:'.math-block mjx-container',note:'.markdown-embed',canvas:'.canvas-embed'};
    if(item.kind==='mermaid'){
     // Rendering may install the vault trust prompt after setViewState resolves.
     await p.waitForFunction(({root,file})=>{
      const view=app.workspace.activeLeaf?.view;if(view?.file?.path!==file)return false;
      return [...view.containerEl.querySelectorAll(root+' .mermaid-guard-actions button,'+root+' .mermaid svg')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
     },{root,file:item.file},{timeout:15000});
     const allow=p.locator(root+' .mermaid-guard-actions button');
     if(await allow.isVisible()){
      await qa.guard(p,{});
      assert.equal(await p.evaluate(()=>app.vault.cachedRead(app.workspace.activeLeaf.view.file)),fixture.files[item.file],'Only authorize the exact synthetic Mermaid fixture');
      await allow.click();
     }
    }
    await p.locator(root+' '+selectors[item.kind]).first().waitFor({state:'visible',timeout:15000});
    if(item.kind==='bases')await p.waitForFunction(root=>document.querySelector(root+' .bases-tbody')?.textContent.includes('Gamma'),root);
    if(item.kind==='image')await p.waitForFunction(root=>document.querySelector(root+' .image-embed img')?.naturalWidth===1600,root);
    const mathReadiness=item.kind==='math'?await waitForMath(p,root):null;
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const sample=await p.evaluate(({mode,kind,root,selector})=>{
     const view=app.workspace.activeLeaf.view.containerEl.querySelector(root),s=mode==='reading'?view:view.querySelector('.cm-scroller');
     const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height}};
     const paragraph=[...view.querySelectorAll(mode==='reading'?'.el-p>p':'.cm-line')].find(e=>e.textContent.startsWith('Prose measure before'));
     const block=kind==='prose'?paragraph:view.querySelector(selector),scroller=box(s),b=box(block);
     const ancestors=[];for(let e=block;e&&e!==s;e=e.parentElement){const st=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+1&&['auto','scroll'].includes(st.overflowX)){e.scrollLeft=e.scrollWidth;ancestors.push({class:e.className,scrollLeft:e.scrollLeft,max:e.scrollWidth-e.clientWidth,box:box(e)})}}
     const last=kind==='table'?block.querySelector('tbody tr:last-child td:last-child'):kind==='bases'?block.querySelector('.bases-tbody .bases-tr:last-child .bases-td:last-child'):kind==='mermaid'?[...block.querySelectorAll('g.node')].at(-1):null;
     const end=last?box(last):null;
     let math=null;
     if(kind==='math'){
      const formula=block.querySelector('mjx-math'),style=getComputedStyle(block),saved=block.scrollLeft;
      const viewport=()=>{const r=block.getBoundingClientRect();return{left:r.left+block.clientLeft,right:r.left+block.clientLeft+block.clientWidth}};
      block.scrollLeft=0;const start={formula:box(formula),viewport:viewport(),scrollLeft:block.scrollLeft};
      block.scrollLeft=block.scrollWidth;const finish={formula:box(formula),viewport:viewport(),scrollLeft:block.scrollLeft};
      math={start,finish,overflowX:style.overflowX,localOverflow:block.scrollWidth-block.clientWidth,fontStatus:document.fonts.status};
      block.scrollLeft=saved;
     }
     const content=block.textContent;
     return{block:b,paragraph:box(paragraph),scroller,pageOverflow:document.documentElement.scrollWidth-innerWidth,paneOverflow:s.scrollWidth-s.clientWidth,font:getComputedStyle(paragraph).fontFamily,ancestors,end,math,content:content.slice(0,180),image:kind==='image'?{naturalWidth:block.naturalWidth,naturalHeight:block.naturalHeight}:null,rows:kind==='table'?block.querySelectorAll('tbody tr').length:kind==='bases'?block.querySelectorAll('.bases-tbody .bases-tr').length:null,classes:view.className};
    },{mode,kind:item.kind,root,selector:selectors[item.kind]});
    const row={...label,toneState,toneAfter:await qa.assertTone(p,tone,qa.final),...sample,...(mathReadiness?{mathReadiness}:{})};result.activeCase=row;save();
    assert(sample.pageOverflow<=1&&sample.paneOverflow<=1,'A block forces the whole page sideways');
    assert(sample.block.width>0&&sample.block.height>0);assert(sample.font.includes('Cupertino Newsreader'));
    if(sample.math){
     const m=sample.math;assert.equal(m.fontStatus,'loaded');
     assert(m.start.formula.width>0&&m.start.formula.height>0,'Math formula is empty');
     assert(m.start.formula.left>=m.start.viewport.left-1&&m.start.formula.left<=m.start.viewport.right+1,'Math start is not reachable');
     assert(m.finish.formula.right<=m.finish.viewport.right+1&&m.finish.formula.right>=m.finish.viewport.left-1,'Math end is not reachable');
     if(m.localOverflow>1){assert(['auto','scroll'].includes(m.overflowX),'Wide math has no local scroller');assert(m.finish.scrollLeft>m.start.scrollLeft,'Wide math does not scroll locally')}
    }
    // The table itself may be wider than its native local scroller; its last cell must remain reachable.
    if(sample.end){if(item.kind!=='mermaid')assert(sample.rows===3,'Expected three synthetic records');assert(sample.end.right<=sample.scroller.right+1,'Final content is not reachable');assert(sample.end.left>=sample.scroller.left-1,'Final content is clipped on the left')}
    else assert(sample.block.left>=sample.scroller.left-1&&sample.block.right<=sample.scroller.right+1,'Embedded content escapes its pane');
    if(!item.helper)baseline[item.kind]=sample;
    else{
     const control=baseline[item.kind];assert(control,'Missing matched helper control');
     if(item.kind!=='prose')assert(Math.abs(sample.paragraph.width-control.paragraph.width)<=1,'Block helper changes prose width');
     if(geometry==='desktop'){
      const measured=item.kind==='table'&&sample.ancestors.length?sample.ancestors[0].box.width:sample.block.width;
      const before=item.kind==='table'&&control.ancestors.length?control.ancestors[0].box.width:control.block.width;
      assert(measured>before+30,`Width helper has no effect: ${item.helper}`);
     }
    }
    if(mode==='reading'&&['bases','mermaid','canvas'].includes(item.kind)&&!item.helper){const screenshot=`${geometry}-${tone}-${item.kind}.png`;await qa.screenshot(p,{path:path.join(out,screenshot)},tone,qa.final);row.screenshot=screenshot;row.screenshotSha256=qa.hashFile(path.join(out,screenshot));}
    result.cases.push(row);delete result.activeCase;save();console.log(JSON.stringify({...label,status:'PASS'}));
   }
  }
 }
 assert.equal(result.cases.length,178);result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{await browser.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
