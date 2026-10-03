/* Scoped app checks for reflow, larger text, text spacing, contrast and caret.
 * Does not certify the entire app or establish physical-device flicker absence. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright'),qa=require('./config.cjs');
const result={scope:'Actual Obsidian desktop narrow split-pane, 200% user-style text enlargement from 23px to 46px, and text-spacing overrides. The app Appearance setting itself clamps at 30px. Contrast samples foreground/background-color compositing, not every gradient or opacity case. Scoped theme checks, not whole-app WCAG certification or native iOS flicker acceptance.',cases:[],errors:[]};
qa.begin('ACCESSIBILITY',result);
const scenarios=[['narrow-split',800,900,23],['enlarged',1280,900,46],['text-spacing',1280,900,23]];
(async()=>{const b=await chromium.connectOverCDP(qa.endpoint);try{
 const p=b.contexts()[0].pages().find(x=>x.url().includes('index.html'));await qa.guard(p,result);p.on('pageerror',e=>result.errors.push(String(e)));
 if(await p.evaluate(()=>app.isMobile)){await Promise.all([p.waitForEvent('domcontentloaded'),p.evaluate(()=>app.emulateMobile(false))]);await p.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
 for(const stage of qa.stages)for(const [scenario,width,height,size]of scenarios)for(const tone of qa.tones)for(const mode of qa.modes){
  await p.setViewportSize({width,height});
  await p.evaluate(async({scenario,size,tone,mode,file})=>{
   document.querySelector('#qa-text-spacing')?.remove();
   const leaves=app.workspace.getLeavesOfType('markdown');for(const leaf of leaves.slice(1))leaf.detach();
   app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();
   for(const [k,v]of Object.entries({baseFontSize:scenario==='enlarged'?23:size,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:tone==='light'?'moonstone':'obsidian'}))app.vault.setConfig(k,v);
   app.updateFontSize();app.updateFontFamily();app.updateTheme();
   const leaf=leaves[0]||app.workspace.getLeaf();await leaf.setViewState({type:'markdown',state:{file,mode:mode==='reading'?'preview':'source',source:mode==='source'}});app.workspace.setActiveLeaf(leaf,{focus:true});
   if(scenario==='narrow-split'){const second=app.workspace.getLeaf('split','vertical');await second.setViewState({type:'markdown',state:{file:'QA Companion.md',mode:'preview'}});app.workspace.setActiveLeaf(leaf,{focus:true})}
   if(scenario==='text-spacing'){const style=document.createElement('style');style.id='qa-text-spacing';style.textContent='.workspace-leaf-content[data-type="markdown"] .markdown-rendered :is(p,h1,h2,h3,h4,h5,h6,li,td,th),.workspace-leaf-content[data-type="markdown"] .cm-line {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.workspace-leaf-content[data-type="markdown"] .markdown-rendered p{margin-block:2em!important}';document.head.append(style)}
   if(scenario==='enlarged'){const style=document.createElement('style');style.id='qa-text-spacing';style.textContent='body{--font-text-size:46px!important}html{font-size:46px!important}';document.head.append(style);app.workspace.trigger('css-change')}
  },{scenario,size,tone,mode,file:qa.surfaceFile});
  await p.waitForTimeout(450);await qa.selectTheme(p,stage);const assets=await qa.loadFonts(p);await p.waitForTimeout(200);
  const toneState=await qa.stabilizeTone(p,tone,stage,{baseFontSize:scenario==='enlarged'?23:size,textFontFamily:'Newsreader',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true});
  const record={theme:stage.name,cssSha256:stage.css_sha256,scenario,tone,toneState,mode,fontAssets:assets,headings:[],paragraphs:[],contrast:[],scrolls:[],tables:[]};result.activeCase=record;
  const sample=async()=>{const observedTone=await qa.assertTone(p,tone,stage);const data=await p.evaluate(mode=>{
   const root=app.workspace.activeLeaf.view.containerEl,outer=root.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller');
   const active=e=>{const r=e.getBoundingClientRect(),clip=outer.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>clip.top&&r.top<clip.bottom};
   const styles=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.textContent,size:parseFloat(s.fontSize),weight:s.fontWeight,lineHeight:parseFloat(s.lineHeight),font:s.fontFamily,color:s.color,tracking:s.letterSpacing,style:s.fontStyle,transform:s.textTransform,border:s.borderTopWidth,padding:[s.paddingTop,s.paddingBottom],margin:[s.marginTop,s.marginBottom],box:r.toJSON(),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}};
   const heads=[...root.querySelectorAll(mode==='reading'?'h1,h2,h3,h4,h5,h6':'.HyperMD-header')].filter(active).map(e=>({...styles(e),level:mode==='reading'?+e.tagName.slice(1):+e.className.match(/HyperMD-header-(\d)/)?.[1]}));
   const paras=[...root.querySelectorAll(mode==='reading'?'.el-p > p':'.cm-line:not(.HyperMD-header)')].filter(active).map(styles);
   const props=['overflow-x','overflow-y','position','transform','contain','will-change','mask-image','transition-duration'];
   const structure=[...root.querySelectorAll('.view-content,.markdown-reading-view,.markdown-source-view,.cm-scroller,.markdown-reading-view > .markdown-preview-view')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({class:e.className.split(/\s+/).sort().join(' '),style:Object.fromEntries(props.map(k=>[k,getComputedStyle(e).getPropertyValue(k)]))}));
   const rgba=color=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)};
   const over=(a,b)=>{const alpha=a[3]+b[3]*(1-a[3]);return [0,1,2].map(i=>(a[i]*a[3]+b[i]*b[3]*(1-a[3]))/alpha).concat(alpha)};
   const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const contrast=[...root.querySelectorAll(mode==='reading'?'p,h1,h2,h3,h4,h5,h6,a,th,td,.callout-title-inner':'.cm-line,.cm-hmd-internal-link,.cm-link')].filter(e=>active(e)&&e.textContent.trim()).map(e=>{
    const s=getComputedStyle(e);let bg=[255,255,255,1],anc=[];for(let a=e;a;a=a.parentElement)anc.unshift(a);for(const a of anc)bg=over(rgba(getComputedStyle(a).backgroundColor),bg);const fg=over(rgba(s.color),bg);const l=[lum(fg),lum(bg)].sort((a,b)=>b-a),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.6667&&parseFloat(s.fontWeight)>=700);
    return {tag:e.tagName,text:e.textContent.slice(0,70),foreground:s.color,background:bg,ratio:(l[0]+.05)/(l[1]+.05),threshold:large?3:4.5};});
   const tables=[...root.querySelectorAll('table')].filter(active).map(table=>{let owner=table.parentElement;while(owner&&owner!==outer&&!['auto','scroll'].includes(getComputedStyle(owner).overflowX))owner=owner.parentElement;if(!owner)return null;const before=owner.scrollLeft;owner.scrollLeft=owner.scrollWidth;const last=table.querySelector('tr:last-child > :last-child').getBoundingClientRect(),clip=owner.getBoundingClientRect();const data={text:table.textContent.slice(0,80),owner:owner.className,before,after:owner.scrollLeft,lastRight:last.right,clipRight:clip.right};owner.scrollLeft=0;return data});
   const supporting=[...root.querySelectorAll('table,pre,img,.callout')].filter(active).map(e=>({tag:e.tagName,class:e.className}));
   return {heads,paras,contrast,tables,structure,supporting,outer:{size:parseFloat(getComputedStyle(outer).fontSize),width:outer.clientWidth,scrollHeight:outer.scrollHeight,scrollTop:outer.scrollTop,box:outer.getBoundingClientRect().toJSON()},overflow:document.documentElement.scrollWidth-innerWidth,visible:heads.length+paras.length+supporting.length};
  },mode);return {...data,toneState:observedTone};};
  await p.evaluate(mode=>{const r=app.workspace.activeLeaf.view.containerEl;r.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller').scrollTop=0},mode);await p.waitForTimeout(150);
  const initial=await sample();record.initial=initial;assert.equal(initial.outer.size,size);assert(initial.overflow<=1);if(scenario==='narrow-split')assert(initial.outer.width<440,'Split pane is not narrow');
  const headingSeen=new Map(),paraSeen=new Map(),contrastSeen=new Map(),tableSeen=new Map();
  for(let y=0;y<Math.min(initial.outer.scrollHeight,14000);y+=Math.max(200,height*.6)){
   await p.evaluate(({mode,y})=>app.workspace.activeLeaf.view.containerEl.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller').scrollTop=y,{mode,y});await p.waitForTimeout(100);const data=await sample();
   assert(data.visible>0,'Blank content during accessibility scan');assert(data.overflow<=1);record.scrolls.push({y,actual:data.outer.scrollTop,visible:data.visible});
   data.heads.forEach(h=>headingSeen.set(h.level,h));data.paras.forEach(x=>paraSeen.set(x.text,x));data.contrast.forEach(x=>contrastSeen.set(x.tag+'|'+x.text,x));data.tables.filter(Boolean).forEach(x=>tableSeen.set(x.text,x));
   for(const t of data.tables.filter(Boolean)){assert(t.lastRight<=t.clipRight+2,'Final table column inaccessible');if(t.after>0)assert(!/markdown-preview-view|cm-scroller/.test(t.owner),'Page owns table horizontal scrolling')}
  }
  record.headings=[...headingSeen.values()].sort((a,b)=>a.level-b.level);record.paragraphs=[...paraSeen.values()];record.contrast=[...contrastSeen.values()];record.tables=[...tableSeen.values()];
  assert.equal(record.headings.length,6,'H1–H6 were not all exposed');assert(record.contrast.length>0);
  record.contrastFindings=record.contrast.filter(c=>c.ratio+.02<c.threshold);
  // V3 is an observed comparison control, not a rewritten candidate. Retain
  // its inherited failures; every V4 checkpoint must meet the contrast gate.
  if(stage.name!==qa.baseline.name)for(const c of record.contrastFindings)assert.fail(`Low contrast ${c.tag} ${c.text}: ${c.ratio.toFixed(2)} < ${c.threshold}`);
  if(mode!=='source')assert(record.tables.length>=2,'Both shared tables must be exposed');
  if(stage.name!==qa.baseline.name){const ratios=[1.9,1.45,1.2,1.05,1,1];for(const h of record.headings){assert(Math.abs(h.size-size*ratios[h.level-1])<.06);assert.equal(h.weight,'600');assert.equal(h.transform,'none');assert(h.font.includes('Newsreader'));if(h.level===4)assert.equal(h.style,'italic')}}
  if(mode!=='reading'){
   // LTR fixture positions must map to the exact logical offset, including
   // heading syntax/content boundaries. Nonempty viewport coordinates alone
   // cannot establish that the editor paints or hit-tests the intended caret.
   const fixture=await p.evaluate(()=>{const e=app.workspace.activeLeaf.view.editor,original=e.getValue(),lines=original.split('\n'),points=[];
    const paragraph=lines.findIndex(x=>x.startsWith('Another paragraph'));
    for(const [kind,line,contentStart]of [['paragraph',paragraph,0],['h1',lines.findIndex(x=>x.startsWith('# ')),2],['h2',lines.findIndex(x=>x.startsWith('## ')),3]]){
     if(line<0)throw Error(`Caret fixture missing: ${kind}`);
     const positions=[['line-start',0],...(contentStart?[['content-start',contentStart]]:[]),['interior',contentStart+Math.floor((lines[line].length-contentStart)/2)],['line-end',lines[line].length]];
     for(const [boundary,ch]of positions)points.push({kind,boundary,line,ch,offset:e.posToOffset({line,ch})});
    }return {original,paragraph,points};});
   record.caret={fixtureDirection:'LTR',roundtripContract:'Exact logical offset; no adjacent-position tolerance',cursorContract:'Visible DOM cursor left edge within 1px of coordsAtPos; vertical overlap with that position box, not equal glyph/line-box heights',points:[],restored:false};
   const inspectCaret=async()=>p.evaluate(()=>{const e=app.workspace.activeLeaf.view.editor,cm=e.cm,position=e.posToOffset(e.getCursor()),coords=cm.coordsAtPos(position),clip=cm.scrollDOM.getBoundingClientRect();
    const roundtrip=coords?cm.posAtCoords({x:coords.left,y:(coords.top+coords.bottom)/2}):null;
    const cursors=[...cm.dom.querySelectorAll('.cm-cursorLayer > .cm-cursor')].filter(cursor=>{const box=cursor.getBoundingClientRect();if(!box.height)return false;for(let a=cursor;a&&a!==cm.dom.parentElement;a=a.parentElement){const s=getComputedStyle(a);if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)===0)return false}return true}).map(cursor=>cursor.getBoundingClientRect().toJSON());
    // DOM Range bounds describe an adjacent text run, whereas CodeMirror's
    // position and cursor boxes can include line leading. Retain both without
    // inventing an equal-height requirement or using an adjacent glyph's x.
    let adjacentTextBox=null;const at=cm.domAtPos(position);if(at.node.nodeType===Node.TEXT_NODE&&at.node.length){const r=document.createRange(),start=Math.min(at.offset,at.node.length-1);r.setStart(at.node,start);r.setEnd(at.node,start+1);adjacentTextBox=r.getBoundingClientRect().toJSON()}
    return {position,roundtrip,coords,cursors,adjacentTextBox,viewport:cm.viewport,scroller:clip.toJSON(),focused:cm.hasFocus};});
   const verifyCaret=(sample,label)=>{assert(sample.focused,`${label}: editor lost focus`);assert(sample.coords&&sample.coords.bottom>sample.coords.top,`${label}: caret position has no height`);
    assert.equal(sample.roundtrip,sample.position,`${label}: coordinate roundtrip displaced the logical caret`);
    assert(sample.coords.top>=sample.scroller.top&&sample.coords.bottom<=sample.scroller.bottom,`${label}: caret is outside the editor viewport`);
    if(sample.cursors.length){assert.equal(sample.cursors.length,1,`${label}: unexpected visible cursor count`);const cursor=sample.cursors[0];assert(Math.abs(cursor.left-sample.coords.left)<=1,`${label}: painted cursor is horizontally displaced`);assert(cursor.bottom>sample.coords.top&&cursor.top<sample.coords.bottom,`${label}: painted cursor is on a different visual line`)}
    sample.paintedCursorChecked=sample.cursors.length===1;sample.paintedCursorStatus=sample.paintedCursorChecked?'visible cursor aligned':'cursor not rendered or hidden by blink at sample';};
   try{
    for(const point of fixture.points){await p.evaluate(point=>{const e=app.workspace.activeLeaf.view.editor,pos={line:point.line,ch:point.ch};e.setCursor(pos);e.scrollIntoView({from:pos,to:pos},true);e.focus()},point);await p.waitForTimeout(60);
     const sample=await inspectCaret();assert.equal(sample.position,point.offset,`${point.kind}/${point.boundary}: logical selection moved`);verifyCaret(sample,`${point.kind}/${point.boundary}`);record.caret.points.push({...point,...sample});}
    // Keep the existing native typing/selection check and restore even if an
    // assertion fails, so the shared fixture's authored text always survives.
    await p.evaluate(line=>{const e=app.workspace.activeLeaf.view.editor,pos={line,ch:0};e.setCursor(pos);e.scrollIntoView({from:pos,to:pos},true);e.focus()},fixture.paragraph);await p.waitForTimeout(60);await p.keyboard.insertText('QA caret ');await p.waitForTimeout(60);
    const typed=await inspectCaret();verifyCaret(typed,'typed paragraph');
    const typing=await p.evaluate(line=>{const e=app.workspace.activeLeaf.view.editor;e.setSelection({line,ch:0},{line,ch:9});return {line:e.getLine(line),selection:e.getSelection(),cursor:e.getCursor()}},fixture.paragraph);
    assert(typing.line.startsWith('QA caret '));assert.equal(typing.selection,'QA caret ');record.caret.typing={...typing,...typed};
   }finally{const restored=await p.evaluate(original=>{const e=app.workspace.activeLeaf.view.editor;if(e.getValue()!==original)e.setValue(original);e.setCursor({line:0,ch:0});return e.getValue()===original},fixture.original);record.caret.restored=restored;assert(restored,'Caret test did not restore the fixture text')}
  }
  await p.evaluate(mode=>app.workspace.activeLeaf.view.containerEl.querySelector(mode==='reading'?'.markdown-reading-view > .markdown-preview-view':'.cm-scroller').scrollTop=0,mode);await p.waitForTimeout(160);const returned=await sample();assert(Math.abs(returned.heads.find(h=>h.level===1).box.y-initial.heads.find(h=>h.level===1).box.y)<1,'Heading moved after return');record.returnedTitle=returned.heads.find(h=>h.level===1).box;
  const control=result.cases.find(c=>c.theme===qa.baseline.name&&c.scenario===scenario&&c.tone===tone&&c.mode===mode);if(control)assert.deepEqual(initial.structure,control.initial.structure,'App-owned scroll/container styles changed');
  if(stage.name===qa.final.name){const s1=result.cases.find(c=>c.theme===qa.headings.name&&c.scenario===scenario&&c.tone===tone&&c.mode===mode);if(mode!=='reading')assert.deepEqual(record.headings.map(h=>h.padding),s1.headings.map(h=>h.padding),'Stage2 changed editable heading padding');else if(scenario!=='text-spacing'){const paragraph=record.paragraphs.find(x=>x.text.startsWith('“A comfortable')),before=s1.paragraphs.find(x=>x.text.startsWith('“A comfortable'));assert(paragraph&&before);assert(parseFloat(paragraph.margin[1])>parseFloat(before.margin[1]),'Rendered paragraph gap did not increase')}}
  await qa.screenshot(p,{path:path.join(qa.out,`accessibility-s${stage.stage}-${scenario}-${tone}-${mode}.png`)},tone,stage);
  record.toneAfter=await qa.assertTone(p,tone,stage);
  result.cases.push(record);qa.write('ACCESSIBILITY',result);console.log(JSON.stringify({accessibility:scenario,theme:stage.name,tone,mode,passed:true}));
 }
 await p.evaluate(()=>{document.querySelector('#qa-text-spacing')?.remove();const leaves=app.workspace.getLeavesOfType('markdown');for(const leaf of leaves.slice(1))leaf.detach()});
 delete result.activeCase;qa.finish('ACCESSIBILITY',result);
 }finally{await b.close()}
})().catch(e=>{fs.writeFileSync(path.join(qa.out,'ACCESSIBILITY-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1});
