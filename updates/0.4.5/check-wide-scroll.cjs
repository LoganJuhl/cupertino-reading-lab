/* Virtualized long-note scrolling with all explicit edge-to-edge helpers. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'evidence/wide-scroll');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Settled actual-app scroll/geometry checks for long helper notes. Desktop phone emulation does not measure the physical iOS compositor.',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),startedAt:new Date().toISOString(),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');
const text='---\ncssclasses: [table-100, img-100, bases-100]\n---\n\n'+Array.from({length:100},(_,i)=>`## Section ${i+1}\n\n`+Array.from({length:4},(_,j)=>`Passage ${i+1}.${j+1}: `+'A clear reading surface gives an idea enough room to develop. We follow the evidence, return to a sentence, and keep our place in the document. '.repeat(3)).join('\n\n')+(i%8===0?'\n\n| First field | Second field | Third field |\n|---|---|---|\n| A synthetic record | Readable content | Last column |\n\n![[QA Release Image.svg]]':'')).join('\n\n');
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
 const p=b.contexts()[0].pages().find(p=>p.url().includes('index.html'));await qa.guard(p,result);assert.deepEqual(await p.evaluate(()=>Object.keys(app.plugins.plugins)),[]);
 await p.evaluate(async text=>{const name='QA Release Long Wide.md',old=app.vault.getAbstractFileByPath(name);if(old)await app.vault.modify(old,text);else await app.vault.create(name,text)},text);result.noteSha256=qa.sha(text);
 for(const [geometry,width,height,mobile]of [['desktop',1280,900,false],['phone',390,844,true]])for(const tone of qa.tones)for(const mode of ['reading','live']){
  await p.setViewportSize({width,height});if(await p.evaluate(()=>app.isMobile)!==mobile){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(m=>app.emulateMobile(m),mobile)]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady);await qa.guard(p,{})}
  await p.evaluate(async mode=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();for(const leaf of app.workspace.getLeavesOfType('markdown').slice(1))leaf.detach();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release Long Wide.md',mode:mode==='reading'?'preview':'source',source:false}});if(mode==='live')app.workspace.activeLeaf.view.editor.setCursor({line:0,ch:0})},mode);
  await qa.selectTheme(p,qa.final);const toneState=await qa.stabilizeTone(p,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true});
  // Startup workspace restoration may finish after layoutReady. Reassert the
  // intended file after preference queues settle and bind the test to its DOM.
  await p.evaluate(async mode=>{await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'QA Release Long Wide.md',mode:mode==='reading'?'preview':'source',source:false}});if(mode==='live')app.workspace.activeLeaf.view.editor.setCursor({line:0,ch:0})},mode);
  await p.waitForFunction(mode=>app.workspace.activeLeaf?.view?.file?.path==='QA Release Long Wide.md'&&!!app.workspace.activeLeaf.view.containerEl.querySelector((mode==='reading'?'.markdown-reading-view>.markdown-preview-view':'.markdown-source-view')+'.table-100.img-100.bases-100'),mode);
  const row={geometry,width,height,tone,mode,toneState,scrolls:[]};result.activeCase=row;save();
  const selector=mode==='reading'?'.markdown-reading-view>.markdown-preview-view':'.markdown-source-view>.cm-editor>.cm-scroller';
  for(const fraction of [0,.25,.9,.1,.95,0]){
   await p.evaluate(({selector,fraction})=>{const s=document.querySelector(selector);s.scrollTop=(s.scrollHeight-s.clientHeight)*fraction},{selector,fraction});await p.waitForTimeout(650);
   const samples=[];for(let frame=0;frame<2;frame++){
    samples.push(await p.evaluate(({selector,mode})=>{const s=document.querySelector(selector),r=s.getBoundingClientRect(),nodes=[...s.querySelectorAll(mode==='reading'?'.el-p>p,h2':'.cm-line')].filter(e=>{const b=e.getBoundingClientRect();return e.textContent.trim()&&b.height>0&&b.bottom>r.top&&b.top<r.bottom});const first=nodes[0];return{scrollTop:s.scrollTop,scrollHeight:s.scrollHeight,clientHeight:s.clientHeight,paneOverflow:s.scrollWidth-s.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,containerType:getComputedStyle(s).containerType,visible:nodes.length,text:first?.textContent.slice(0,100),font:first&&getComputedStyle(first).fontFamily,fontStatus:document.fonts.status}},{selector,mode}));await p.waitForTimeout(250);
   }
   row.scrolls.push({fraction,samples});save();for(const s of samples){assert(s.visible>0&&s.text);assert(s.scrollHeight>10000);assert(s.paneOverflow<=1&&s.pageOverflow<=1);assert.equal(s.containerType,'inline-size');assert.equal(s.fontStatus,'loaded');assert(s.font.includes('Cupertino Newsreader'))}assert.equal(samples[0].text,samples[1].text,'Settled text moved between frames');assert(Math.abs(samples[0].scrollTop-samples[1].scrollTop)<=1,'Settled scroll position drifted');
  }
  row.toneAfter=await qa.assertTone(p,tone,qa.final);const screenshot=`${geometry}-${tone}-${mode}.png`;await qa.screenshot(p,{path:path.join(out,screenshot)},tone,qa.final);row.screenshot=screenshot;row.screenshotSha256=qa.hashFile(path.join(out,screenshot));result.cases.push(row);delete result.activeCase;save();console.log(JSON.stringify({geometry,tone,mode,status:'PASS'}));
 }
 assert.equal(result.cases.length,8);result.status='PASS';result.finishedAt=new Date().toISOString();save();
}finally{await b.close()}})().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack));save();console.error(e);process.exitCode=1});
