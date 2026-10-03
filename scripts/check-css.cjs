const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const postcss=require(process.env.QA_POSTCSS_MODULE||'postcss');
const {webkit,chromium}=require('playwright'),{html}=require('./fixture.cjs'),qa=require('./config.cjs');
const {root,out,stages}=qa;
const baseline=fs.readFileSync(path.join(root,qa.baseline.folder,'theme.css'));
const result={scope:'Authored CSS architecture and synthetic WebKit/Chromium checks using actual Obsidian CSS. Actual-app and physical-device evidence are separate; no flicker claim.',architecture:[],cases:[]};
qa.begin('CSS-CHECKS',result);
const forbidden=/^(?:animation(?:-|$)|transition(?:-|$)|transform(?:-|$)|translate$|scale$|rotate$|contain$|container(?:-|$)|content-visibility$|will-change$|filter$|backdrop-filter$|mask(?:-|$)|-webkit-mask(?:-|$)|position$|overflow(?:-|$)|overscroll(?:-|$)|scroll(?:-|$)|font-family$|font-display$)$/;
(async()=>{
for(const file of fs.readdirSync(path.join(root,'source')).filter(x=>x.endsWith('.css'))){
 const ast=postcss.parse(fs.readFileSync(path.join(root,'source',file),'utf8'));let count=0;
 ast.walkAtRules(r=>assert(!['font-face','import','keyframes','property'].includes(r.name)));
 ast.walkRules(r=>assert(!r.selector.includes(':has(')));
 ast.walkDecls(d=>{count++;assert(!forbidden.test(d.prop),`Rendering/scrolling or font-loading patch: ${file}/${d.prop}`);
  assert(!d.important,'V4 must not add !important declarations');
  if(d.prop.startsWith('margin'))assert(d.parent.selector.includes('.markdown-rendered')&&!d.parent.selector.includes('HyperMD'),'Margins may only alter rendered Markdown');
  if(d.prop==='--p-spacing')assert(d.parent.selector.includes('.markdown-rendered')&&!d.parent.selector.includes('.view-content'),'Paragraph rhythm must not change editable heading padding');
  assert(!/url\(/.test(d.value));});
 result.architecture.push({file,declarations:count,passed:true});
}
const appCss=fs.readFileSync(path.join(qa.work,'app/app.css'),'utf8')+'\n'+fs.readFileSync(path.join(qa.work,'app/codemirror.css'),'utf8');
result.appCssSha256=qa.hashFile(path.join(qa.work,'app/app.css'));
for(const [engine,launcher]of Object.entries({webkit,chromium})){
 const b=await launcher.launch({headless:true});try{
 for(const stage of stages)for(const tone of qa.tones)for(const mode of qa.modes){
  const css=fs.readFileSync(path.join(root,stage.folder,'theme.css'));if(stage.name!==qa.final.name)assert(css.subarray(0,baseline.length).equals(baseline));else assert.equal(qa.sha(css),qa.final.css_sha256,'Use the exact current release CSS; normalization is verified separately');
  const p=await b.newPage({viewport:{width:430,height:932}});await p.route('**/*',r=>r.abort());
  await p.setContent(html(mode,tone,23,'Georgia',430));await p.addStyleTag({content:appCss});await p.addStyleTag({content:css.toString()});
  const data=await p.evaluate(async mode=>{
   await document.fonts.ready;const outer=document.querySelector(mode==='reading'?'.markdown-preview-view':'.cm-scroller'),prose=document.querySelector('#prose'),s=getComputedStyle(prose),os=getComputedStyle(outer);
   const headings=[1,2,3,4,5,6].map(level=>{const e=outer.querySelector(mode==='reading'?'h'+level:'.HyperMD-header-'+level);if(!e)return null;const c=getComputedStyle(e);return {level,size:parseFloat(c.fontSize),lineHeight:parseFloat(c.lineHeight),weight:c.fontWeight,font:c.fontFamily,style:c.fontStyle,color:c.color,tracking:c.letterSpacing,transform:c.textTransform,border:c.borderTopWidth,padding:[c.paddingTop,c.paddingBottom],marginEnd:c.marginBlockEnd,optical:c.fontVariationSettings};});
   return {headings,prose:{size:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),font:s.fontFamily,spacing:s.getPropertyValue('--p-spacing').trim(),marginStart:s.marginBlockStart,marginEnd:s.marginBlockEnd},outer:{spacing:os.getPropertyValue('--p-spacing').trim(),lineWidth:os.getPropertyValue('--file-line-width').trim(),headingSpacing:os.getPropertyValue('--heading-spacing').trim()}};
  },mode);
  assert.equal(data.prose.size,23);assert(data.prose.font.includes('Georgia'));assert(data.headings.every(Boolean),'Missing heading fixture');
  if(stage.name!==qa.baseline.name){
   const sizes=[1.9,1.45,1.2,1.05,1,1],leading=[1.2,1.25,1.3,1.4,1.4,1.4];
   data.headings.forEach((h,i)=>{assert(Math.abs(h.size-23*sizes[i])<.05,`${mode} H${i+1} size`);assert(Math.abs(h.lineHeight/h.size-leading[i])<.005,`${mode} H${i+1} leading`);assert.equal(h.weight,'600');assert(h.font.includes('Georgia'));assert.equal(h.transform,'none');assert(['normal','0px'].includes(h.tracking));if(i<2){assert.equal(h.border,'0px');if(mode==='reading')assert.equal(h.padding[0],'0px')}if(i===3)assert.equal(h.style,'italic');});
   const control=result.cases.find(c=>c.engine===engine&&c.tone===tone&&c.mode===mode&&c.theme===qa.baseline.name);
   assert.deepEqual(data.headings.map(h=>h.optical),control.headings.map(h=>h.optical),'V3 optical-axis settings changed');
   if(mode==='reading'&&stage.name===qa.final.name)data.headings.slice(0,4).forEach((h,i)=>assert(Math.abs(parseFloat(h.marginEnd)/h.size-[.65,.6,.5,.4][i])<.005,'Rendered heading end spacing'));
  }
  if(stage.name===qa.final.name){
   const control=result.cases.find(c=>c.engine===engine&&c.tone===tone&&c.mode===mode&&c.theme===qa.headings.name);
   if(mode==='reading'){assert.equal(data.prose.spacing,'1em');assert(parseFloat(data.prose.marginEnd)>parseFloat(control.prose.marginEnd),'Rendered paragraph spacing did not increase')}
   else {assert.equal(data.outer.spacing,control.outer.spacing,'Editable p-spacing changed');assert.deepEqual(data.headings.map(h=>h.padding),control.headings.map(h=>h.padding),'Editable heading padding changed')}
   assert.equal(data.outer.lineWidth,'36.5rem');
  }
  result.cases.push({engine,version:b.version(),stage:stage.stage,theme:stage.name,mode,tone,cssSha256:stage.css_sha256,...data});await p.close();
 }
 }finally{await b.close()}
}
qa.finish('CSS-CHECKS',result);console.log(JSON.stringify({architecture:result.architecture.length,cases:result.cases.length,passed:true}));
})().catch(e=>{fs.writeFileSync(path.join(out,'CSS-CHECKS-failure.json'),JSON.stringify({error:String(e.stack),partial:result},null,2));console.error(e);process.exitCode=1});
