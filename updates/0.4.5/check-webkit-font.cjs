/* Decode and exercise all eight installed CSS faces in desktop WebKit.
 * This is an independent browser check, not physical iOS acceptance. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {webkit}=require('playwright'),qa=require('../../scripts/config.cjs');
const {html}=require('../../scripts/fixture.cjs');
const build=JSON.parse(fs.readFileSync(path.join(__dirname,'BUILD.json')));
const out=path.join(__dirname,'evidence/webkit-font');fs.mkdirSync(out,{recursive:true});
const result={status:'INCOMPLETE',scope:'Standalone desktop WebKit; exact final CSS, app CSS and eight embedded faces. Not an Obsidian/iPhone runtime.',startedAt:new Date().toISOString(),cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),appCssSha256:qa.hashFile(path.join(qa.work,'app/app.css')),cases:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');save();
(async()=>{const browser=await webkit.launch({headless:true});try{
 result.engine=browser.version();
 for(const [geometry,width,height]of [['portrait',390,844],['landscape',844,390]])for(const tone of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height}});const errors=[],remote=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.resourceType()==='font'&&/^https?:/.test(r.url()))remote.push(r.url())});
  await page.setContent(html('reading',tone,23,'Cupertino Newsreader',width));
  await page.addStyleTag({content:fs.readFileSync(path.join(qa.work,'app/app.css'),'utf8')});
  await page.addStyleTag({content:fs.readFileSync(path.join(qa.root,qa.final.folder,'theme.css'),'utf8')});
  const observation=await page.evaluate(async faces=>{
   const loaded=[];for(const f of faces){const list=await document.fonts.load(`${f.style} ${f.weight} 23px "Cupertino Newsreader"`);loaded.push({weight:f.weight,style:f.style,count:list.length,loaded:list.every(x=>x.status==='loaded')})}await document.fonts.ready;
   const p=document.querySelector('p'),s=getComputedStyle(p),r=p.getBoundingClientRect();
   return{loaded,font:s.fontFamily,status:document.fonts.status,textWidth:r.width,textHeight:r.height};
  },build.fontFaces);
  assert.equal(observation.loaded.length,8);assert(observation.loaded.every(f=>f.count===1&&f.loaded));assert(observation.font.includes('Cupertino Newsreader'));assert.equal(observation.status,'loaded');assert(observation.textWidth>0&&observation.textHeight>0);assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  const screenshot=`${geometry}-${tone}.png`;await page.screenshot({path:path.join(out,screenshot)});
  result.cases.push({geometry,tone,width,height,...observation,errors,remoteFontRequests:remote,screenshot,screenshotSha256:qa.hashFile(path.join(out,screenshot))});save();await page.close();
 }
 result.status='PASS';result.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:result.status,cases:result.cases.length}));
}finally{await browser.close()}})().catch(error=>{result.status='FAIL';result.errors.push(String(error.stack));save();console.error(error);process.exitCode=1});
