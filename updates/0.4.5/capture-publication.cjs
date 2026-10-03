/* Capture a real app preview using the shipped reading font and synthetic text. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),qa=require('../../scripts/config.cjs');
const out=path.join(__dirname,'publication');fs.mkdirSync(out,{recursive:true});
const note='# A quiet place to read\n\nGood reading begins with a little room. A sentence finds its rhythm; an idea has time to unfold. The page stays calm while the story moves forward.\n\n## Make room for the thought\n\nSome passages ask us to slow down. We return to a word, follow a reference, or leave a small note for later. **Clear headings** and *gentle emphasis* help us find our place again.\n\n==Keep the words that matter close.== Let the rest of the page breathe.\n\n> A good note leaves a trail for the next reading.\n\n## Follow the thread\n\nA link to [[QA Companion|another idea]] can open a new direction without interrupting the thought in front of us. Small details—café, naïve, “curly quotes”—keep their familiar shape.\n\nThere is room for a little code, too: `const next = chapter + 1;`\n';
(async()=>{const browser=await chromium.connectOverCDP(qa.endpoint);try{
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));const record={scope:'Real isolated macOS Obsidian preview; synthetic note; current embedded font',cssSha256:qa.final.css_sha256,scriptSha256:qa.hashFile(__filename),screenshots:[]};await qa.guard(page,record);
 if(await page.evaluate(()=>app.isMobile)){await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>app.emulateMobile(false))]);await page.waitForFunction(()=>typeof app!=='undefined'&&app.workspace?.layoutReady)}
 await page.setViewportSize({width:1280,height:720});fs.writeFileSync(path.join(qa.vault,'Reader.md'),note);await page.waitForTimeout(300);
 await page.evaluate(async()=>{app.setting.close();document.querySelector('#qa-text-spacing')?.remove();app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();for(const l of app.workspace.getLeavesOfType('markdown').slice(1))l.detach();await app.workspace.getLeaf().setViewState({type:'markdown',state:{file:'Reader.md',mode:'preview'}})});
 for(const tone of ['dark','light']){
  await qa.selectTheme(page,qa.final);const toneState=await qa.stabilizeTone(page,tone,qa.final,{textFontFamily:'',interfaceFontFamily:'',monospaceFontFamily:'Menlo',baseFontSize:18,showInlineTitle:false,readableLineLength:true,autoFullScreen:false,floatingNavigation:false});await page.evaluate(async()=>document.fonts.ready);await page.waitForTimeout(500);
  const font=await page.evaluate(()=>getComputedStyle(document.querySelector('.markdown-reading-view p')).fontFamily);assert(font.includes('Cupertino Newsreader'));
  const file=tone==='light'?'screenshot.png':'screenshot-dark.png';await qa.screenshot(page,{path:path.join(out,file),scale:'css'},tone,qa.final);record.screenshots.push({file,tone,toneState,font,sha256:qa.hashFile(path.join(out,file))});
 }
 record.status='PASS';record.at=new Date().toISOString();fs.writeFileSync(path.join(out,'CAPTURE.json'),JSON.stringify(record,null,2)+'\n');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
