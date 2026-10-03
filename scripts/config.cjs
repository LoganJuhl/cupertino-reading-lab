/* Shared V4 runtime and evidence contract. Never connect to a personal vault. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const work=path.resolve(process.env.QA_WORK||path.join(root,'work'));
const out=path.resolve(process.env.QA_EVIDENCE||path.join(root,'evidence'));
const vault=path.join(work,'qa-vault');
const endpoint=process.env.QA_CDP||'http://127.0.0.1:9341';
const url=new URL(endpoint);assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'CDP must stay on localhost');
for(const key of ['QA_RESUME','QA_FOCUS_RESUME','QA_GEOMETRY','QA_FINAL_ONLY'])assert(!process.env[key],`${key} is unsupported: run a fresh complete suite`);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashFile=file=>sha(fs.readFileSync(file));
const stages=JSON.parse(fs.readFileSync(path.join(root,'stages/BUILD.json'))).stages;
// Historical controls stay immutable; the candidate resolves through the release pointer.
const currentFile=path.join(root,'CURRENT.json');
if(fs.existsSync(currentFile)){const current=JSON.parse(fs.readFileSync(currentFile));const build=JSON.parse(fs.readFileSync(path.join(root,current.build)));assert.equal(build.version,current.version);assert.equal(build.name,current.name);stages[stages.length-1]={...stages.at(-1),name:build.name,version:build.version,folder:build.folder,css_sha256:build.cssSha256,css_bytes:build.cssBytes};}
const names=['Cupertino Reading Lab v3','Cupertino Reading Lab v4 S1 Headings','Cupertino Reading Lab v4'];
assert.deepEqual(stages.map(x=>x.name),names,'Wrong V4 stage names/order');
for(const stage of stages)assert.equal(hashFile(path.join(root,stage.folder,'theme.css')),stage.css_sha256,`Changed build: ${stage.name}`);
const [baseline,headings,final]=stages;
const tones=['light','dark'],modes=['reading','live','source'];
const geometries=[['portrait',430,932,true],['landscape',932,430,true],['desktop',1280,900,false]];
const surfaceFile='QA V4 Surface.md';
const product=(...xs)=>xs.reduce((rows,vs)=>rows.flatMap(row=>vs.map(v=>[...row,v])),[[]]);
const key=(...xs)=>xs.join('|');
const specs={
 'CSS-CHECKS':{cases:product(['webkit','chromium'],names,tones,modes).map(x=>key(...x))},
 LAYOUT:{cases:product(names,geometries.map(x=>x[0]),tones,modes).map(x=>key(...x))},
 SURFACES:{cases:product(names,geometries.map(x=>x[0]),tones,['reading','live']).map(x=>key(...x)),fonts:product([390,932,1280],modes,[[15,'Newsreader'],[23,'Newsreader'],[28,'Georgia']]).map(([w,m,[s,f]])=>key(final.name,w,m,s,f))},
 FOCUS:{cases:product(geometries.map(x=>x[0]),tones,['reading','live']).map(x=>key(final.name,...x)),comparisons:product([baseline.name,final.name],tones).map(x=>key(...x))},
 INTERACTIONS:{cases:product(['narrow-desktop','desktop'],tones).map(x=>key(final.name,...x))},
 NEWSREADER:{cases:product([baseline.name,final.name],['portrait','landscape'],tones).map(x=>key(...x)),scrolls:product([baseline.name,final.name],[.2,.85,.1,.95,.4,0]).map(x=>key(...x))},
 ACCESSIBILITY:{cases:product(names,['narrow-split','enlarged','text-spacing'],tones,modes).map(x=>key(...x))}
};
const scriptFor=suite=>'check-'+({ 'CSS-CHECKS':'css',NEWSREADER:'newsreader'}[suite]||suite.toLowerCase())+'.cjs';
function harnessHashes(suite){return Object.fromEntries([scriptFor(suite),'config.cjs','fixture.cjs'].map(f=>[f,hashFile(path.join(__dirname,f))]));}
function begin(suite,result){fs.mkdirSync(out,{recursive:true});Object.assign(result,{suite,status:'INCOMPLETE',startedAt:new Date().toISOString(),buildHashes:Object.fromEntries(stages.map(x=>[x.name,x.css_sha256])),harnessHashes:harnessHashes(suite),fontAssets:fontFaces().map(({url,...meta})=>meta),expectedCaseKeys:specs[suite]});write(suite,result);}
function write(suite,result){fs.writeFileSync(path.join(out,suite+'.json'),JSON.stringify(result,null,2)+'\n');}
function decorate(suite,field,c){
 c.theme ||= c.stage!==undefined?stages.find(s=>s.stage===c.stage)?.name:final.name;
 c.cssSha256 ||= stages.find(s=>s.name===c.theme)?.css_sha256;
 if(suite==='CSS-CHECKS')c.caseKey=key(c.engine,c.theme,c.tone,c.mode);
 else if(suite==='SURFACES'&&field==='fonts')c.caseKey=key(c.theme,c.width,c.mode,c.input.size,c.input.font);
 else if(field==='comparisons')c.caseKey=key(c.theme,c.tone);
 else if(suite==='NEWSREADER')c.caseKey=field==='scrolls'?key(c.theme,c.fraction):key(c.theme,c.geometry,c.tone);
 else if(suite==='INTERACTIONS')c.caseKey=key(c.theme,c.geometry,c.tone);
 else if(suite==='ACCESSIBILITY')c.caseKey=key(c.theme,c.scenario,c.tone,c.mode);
 else c.caseKey=key(c.theme,c.geometry,c.tone,c.mode);
}
function validate(suite,result){
 assert.equal(result.suite,suite);assert.deepEqual(result.expectedCaseKeys,specs[suite]);
 assert.deepEqual(result.buildHashes,Object.fromEntries(stages.map(x=>[x.name,x.css_sha256])));
 assert.deepEqual(result.harnessHashes,harnessHashes(suite),'Harness changed: rerun the affected suite');
 assert.deepEqual(result.fontAssets,fontFaces().map(({url,...meta})=>meta),'QA font assets changed');
 for(const [field,expected]of Object.entries(specs[suite])){
  const records=result[field]||[],actual=records.map(c=>c.caseKey);
  assert.equal(new Set(actual).size,actual.length,`${suite}/${field}: duplicate keys`);
  assert.deepEqual([...actual].sort(),[...expected].sort(),`${suite}/${field}: incomplete/unexpected case keys`);
  for(const c of records){assert.equal(c.cssSha256,stages.find(s=>s.name===c.theme)?.css_sha256,`${suite}: stale CSS`);if(suite!=='CSS-CHECKS'){assertToneState(c.toneState,c.tone,c.theme);assertToneState(c.toneAfter,c.tone,c.theme);if(suite==='SURFACES'){const requested={baseFontSize:field==='fonts'?c.input.size:23,textFontFamily:field==='fonts'?c.input.font:'Newsreader',monospaceFontFamily:'Menlo',showInlineTitle:false,readableLineLength:true,theme:c.tone==='light'?'moonstone':'obsidian'};assertPreferencesState(c.preferences,requested,c.theme);assertPreferencesState(c.preferencesAfter,requested,c.theme);if(field==='fonts'){assert.equal(c.computed.configuredSize,c.input.size);assert.equal(c.computed.configuredFont,c.input.font);assert(c.computed.size>=c.input.size,'Recorded rendered font size fell below requested size');if(!c.mobile||c.input.size>=23)assert.equal(c.computed.size,c.input.size);assert(c.computed.family.includes(c.input.font),'Recorded rendered font family differs')}else{assert.equal(parseFloat(c.top.textSize),23);assert(c.top.family.includes('Newsreader'),'Recorded main surface family differs')}}}}
 }
 assert.equal((result.errors||[]).length,0);
 if(suite!=='CSS-CHECKS'){
  assert.equal(result.runtime?.electron,'39.8.3');assert.equal(result.runtime?.appVersion,'1.13.7');
  assert.equal(result.runtimeIdentitySha256,hashFile(path.join(work,'app/QA-IDENTITY.json')),'Runtime identity changed');
 }
}
function finish(suite,result){for(const field of Object.keys(specs[suite]))for(const c of result[field]||[])decorate(suite,field,c);validate(suite,result);result.status='PASS';result.finishedAt=new Date().toISOString();write(suite,result);const failure=path.join(out,suite+'-failure.json');if(fs.existsSync(failure))fs.unlinkSync(failure);}
async function guard(p,result){
 assert(p,'No Obsidian renderer found');
 const identityFile=path.join(work,'app/QA-IDENTITY.json'),identity=JSON.parse(fs.readFileSync(identityFile));
 assert.equal(path.resolve(identity.vault),vault);assert.equal(path.resolve(identity.profile),path.join(work,'qa-profile'));
 const marker=JSON.parse(fs.readFileSync(path.join(vault,'.qa-vault.json')));assert.equal(marker.purpose,'Cupertino Reading Lab v4 disposable QA');
 assert.equal(marker.runId,identity.run_id);assert.equal(await p.evaluate(()=>app.vault.adapter.basePath),vault,'Refuse non-QA vault');
 const runtime=await p.evaluate(()=>({electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform,appVersion:require('electron').ipcRenderer.sendSync('version')}));
 assert.equal(runtime.electron,'39.8.3');assert.equal(runtime.appVersion,'1.13.7');
 result.runtime=runtime;result.runtimeIdentitySha256=hashFile(identityFile);result.runId=identity.run_id;
 await p.evaluate(async expected=>{const files=app.vault.getFiles().map(f=>f.path);if(!files.includes(expected))throw Error('Run prepare-qa.py: shared surface fixture missing')},surfaceFile);
}
async function selectTheme(p,stage){await p.evaluate(name=>app.customCss.setTheme(name),stage.name);await p.waitForFunction(expected=>app.customCss.theme===expected.name&&app.customCss.styleEl&&require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex')===expected.css_sha256,stage);}
// Tone is a runtime prerequisite, independent of the custom theme name.
// Reapply through Obsidian after queued Appearance work; never patch body CSS.
const tonePalette={light:{paper:[247,245,239,255],ink:[26,25,22,255]},dark:{paper:[0,0,0,255],ink:[231,231,231,255]}};
function toneInPage(){
 const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
 const selector='.workspace-leaf-content[data-type="markdown"] > .view-content';
 const active=app.workspace.activeLeaf?.view?.containerEl;
 const content=(active&&[...active.querySelectorAll(selector+',:scope > .view-content')].find(visible))||[...document.querySelectorAll(selector)].find(visible);
 if(!content)throw Error('Tone verification requires a visible Markdown surface');
 const scroller=[...content.querySelectorAll('.markdown-reading-view > .markdown-preview-view,.markdown-source-view > .cm-editor > .cm-scroller')].find(visible);
 if(!scroller)throw Error('Tone verification requires the app-owned Markdown scroller');
 const style=getComputedStyle(content),rendered=getComputedStyle(scroller),body=getComputedStyle(document.body);
 const rgba=color=>{if(!CSS.supports('color',color))throw Error('Unresolved palette color: '+color);const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
 const classes=['light','dark'].filter(t=>document.body.classList.contains('theme-'+t));
 const paper=style.getPropertyValue('--background-primary').trim(),ink=style.getPropertyValue('--text-normal').trim();
 return {actualTone:classes.length===1?classes[0]:null,themeClasses:classes.map(t=>'theme-'+t),configuredTone:app.vault.getConfig('theme'),actualTheme:app.customCss.theme,cssSha256:require('crypto').createHash('sha256').update(app.customCss.styleEl.textContent).digest('hex'),palette:{paper,ink,paperRgba:rgba(paper),inkRgba:rgba(ink),renderedInk:rendered.color,renderedInkRgba:rgba(rendered.color),scrollerBackground:rendered.backgroundColor,bodyBackground:body.backgroundColor},surface:scroller.className};
}
function assertToneState(state,tone,theme){
 assert(tones.includes(tone),'Unknown requested tone');
 const stage=typeof theme==='string'?stages.find(s=>s.name===theme):theme;
 assert(stage,'Unknown theme for tone binding');assert(state,'Missing actual tone evidence');
 assert.equal(state.requestedTone,tone,'Tone evidence belongs to a different request');
 assert.equal(state.actualTone,tone,'Actual light/dark class differs from the case label');
 assert.deepEqual(state.themeClasses,['theme-'+tone],'Conflicting/missing body theme classes');
 assert.equal(state.configuredTone,tone==='light'?'moonstone':'obsidian','Appearance setting differs from requested tone');
 assert.equal(state.actualTheme,stage.name,'Tone change restored the wrong custom theme');
 assert.equal(state.cssSha256,stage.css_sha256,'Tone change restored different CSS');
 assert.deepEqual(state.palette.paperRgba,tonePalette[tone].paper,'Actual note paper differs from requested palette');
 assert.deepEqual(state.palette.inkRgba,tonePalette[tone].ink,'Actual note ink differs from requested palette');
 assert.deepEqual(state.palette.renderedInkRgba,tonePalette[tone].ink,'Rendered scroller ink differs from requested palette');
 return state;
}
async function assertTone(p,tone,theme){const state={requestedTone:tone,...await p.evaluate(toneInPage)};return assertToneState(state,tone,theme);}
function assertPreferencesState(state,requested,theme){
 const stage=typeof theme==='string'?stages.find(s=>s.name===theme):theme;
 assert(stage,'Unknown theme for preference binding');assert(state,'Missing configured preference evidence');
 assert.deepEqual(state.requested,requested,'Preference evidence belongs to another request');
 for(const [key,value]of Object.entries(requested)){
  assert.deepEqual(state.configured[key],value,`Configured ${key} differs from requested value`);
  assert.deepEqual(state.persisted[key],value,`Persisted ${key} differs from requested value`);
 }
 assert.equal(state.configuredCssTheme,stage.name,'Preference reload restored the wrong custom theme');
 assert.equal(state.persistedCssTheme,stage.name,'Saved Appearance file names a different custom theme');
 return state;
}
async function readPreferences(p,requested,theme){
 const state=await p.evaluate(async requested=>{
  const appConfig=await app.vault.readConfigJson('app'),appearance=await app.vault.readConfigJson('appearance');
  // Match Obsidian 1.13.7's reload merge order exactly: app overrides appearance.
  const persisted=Object.assign({},appearance,appConfig),keys=Object.keys(requested);
  return {requested,configured:Object.fromEntries(keys.map(k=>[k,app.vault.getConfig(k)])),persisted:Object.fromEntries(keys.map(k=>[k,persisted[k]])),configuredCssTheme:app.vault.getConfig('cssTheme'),persistedCssTheme:persisted.cssTheme,configTs:app.vault.configTs};
 },requested);
 return assertPreferencesState(state,requested,theme);
}
async function syncPreferences(p,requested,theme){
 await p.evaluate(async({requested,expectedVault})=>{
  if(app.vault.adapter.basePath!==expectedVault)throw Error('Refuse preference writes outside the disposable QA vault');
  const vault=app.vault;
  if(typeof vault.requestSaveConfig?.run!=='function'||typeof vault.reloadConfig?.run!=='function')throw Error('Unsupported Obsidian preference queue API');
  // run() returns the debounced callback's promise in the inspected 1.13.7
  // runtime. Await old writes/reloads before applying the complete case input.
  await vault.requestSaveConfig.run();await vault.reloadConfig.run();
  for(const [key,value]of Object.entries(requested))vault.setConfig(key,value);
  const pending=vault.requestSaveConfig.run();
  if(pending)await pending;else await vault.saveConfig();
  // saveConfig awaits both JSON writes and then updates configTs. Flush the
  // pending watcher after those writes so it cannot replay an older half-save.
  await vault.reloadConfig.run();
  app.updateFontSize();app.updateFontFamily();app.updateTheme();
 },{requested,expectedVault:vault});
 const first=await readPreferences(p,requested,theme);
 // Drain any later watcher callback at its native debounce boundary and verify
 // again. A mismatch fails; the harness never substitutes an observed request.
 await p.waitForTimeout(550);
 await p.evaluate(async()=>{await app.vault.requestSaveConfig.run();await app.vault.reloadConfig.run()});
 const settled=await readPreferences(p,requested,theme);
 return {...settled,saveAwaited:true,reloadFlushed:true,initialConfigTs:first.configTs,settledMs:550};
}
async function stabilizeTone(p,tone,theme,preferences={}){
 assert(tones.includes(tone),'Unknown requested tone');
 // Persist the whole requested case before verifying the rendered palette.
 const requested={...preferences,theme:tone==='light'?'moonstone':'obsidian'};
 const preferenceState=await syncPreferences(p,requested,theme);
 await p.waitForFunction(tone=>app.vault.getConfig('theme')===(tone==='light'?'moonstone':'obsidian')&&document.body.classList.contains('theme-'+tone)&&!document.body.classList.contains('theme-'+(tone==='light'?'dark':'light')),tone);
 let state=await assertTone(p,tone,theme);
 for(let sample=0;sample<3;sample++){await p.waitForTimeout(150);state=await assertTone(p,tone,theme)}
 return {...state,preferences:preferenceState,stabilizationMs:450};
}
async function screenshot(p,options,tone,theme){
 const before=await assertTone(p,tone,theme);await p.screenshot(options);const after=await assertTone(p,tone,theme);
 return {file:path.basename(options.path),before,after};
}
function fontFaces(){
 const dir=path.resolve(process.env.QA_NEWSREADER_FONTS||path.join(root,'resources/qa-fonts'));
 const files=process.env.QA_NEWSREADER_FONT?[path.resolve(process.env.QA_NEWSREADER_FONT)]:fs.readdirSync(dir).filter(x=>/\.woff2$/i.test(x)).map(x=>path.join(dir,x));
 assert(files.length,'Provide licensed local Newsreader WOFF2 QA assets');
 return files.map(file=>{const name=path.basename(file),italic=/italic/i.test(name),match=name.match(/(?:^|[-_])(400|500|600|700)(?:[-_.]|$)/);return {name,style:italic?'italic':'normal',weight:match?match[1]:/semibold/i.test(name)?'600':/bold/i.test(name)?'700':/medium/i.test(name)?'500':'400',sha256:hashFile(file),url:'data:font/woff2;base64,'+fs.readFileSync(file).toString('base64')};});
}
async function loadFonts(p){const faces=fontFaces();await p.evaluate(async faces=>{window.__crl4QaFontHashes||=[];for(const face of faces){if(window.__crl4QaFontHashes.includes(face.sha256))continue;const f=new FontFace('Newsreader',`url("${face.url}")`,{style:face.style,weight:face.weight});await f.load();document.fonts.add(f);window.__crl4QaFontHashes.push(face.sha256)}await document.fonts.ready},faces);return faces.map(({url,...rest})=>rest);}
module.exports={root,work,out,vault,endpoint,stages,baseline,headings,final,tones,modes,geometries,surfaceFile,sha,hashFile,specs,begin,finish,write,validate,guard,selectTheme,assertToneState,assertTone,assertPreferencesState,readPreferences,syncPreferences,stabilizeTone,screenshot,fontFaces,loadFonts};
