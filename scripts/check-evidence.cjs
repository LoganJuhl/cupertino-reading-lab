/* Read-only verification of complete expected sets against the current build. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),qa=require('./config.cjs');
const checked=[];
for(const suite of Object.keys(qa.specs)){
 const file=path.join(qa.out,suite+'.json');assert(fs.existsSync(file),`Missing required evidence: ${suite}`);
 const result=JSON.parse(fs.readFileSync(file));assert.equal(result.status,'PASS',`${suite} incomplete`);qa.validate(suite,result);
 checked.push({suite,sha256:qa.hashFile(file),groups:Object.fromEntries(Object.entries(qa.specs[suite]).map(([k,v])=>[k,v.length]))});
}
const runtime=JSON.parse(fs.readFileSync(path.join(qa.work,'app/QA-IDENTITY.json')));
assert.deepEqual(runtime.stage_hashes,Object.fromEntries(qa.stages.map(s=>[s.name,s.css_sha256])),'Prepared themes do not match this build');
// Verify source fixtures still agree with the prepared inputs actually used by
// the app. A fixture-only edit cannot silently validate an earlier capture.
const surface=require('./fixture.cjs').surfaceNote;
assert.equal(qa.sha(surface),runtime.fixture_sha256,'Surface fixture changed: prepare and rerun');
assert.equal(qa.hashFile(path.join(qa.vault,qa.surfaceFile)),runtime.fixture_sha256,'Prepared surface was not restored');
const fixtureChecks=[];
for(const name of fs.readdirSync(path.join(qa.root,'design/fixtures')).filter(n=>n.endsWith('.md'))){
 const digest=qa.hashFile(path.join(qa.root,'design/fixtures',name));
 assert.equal(qa.hashFile(path.join(qa.vault,name)),digest,`Prepared fixture changed: ${name}`);
 fixtureChecks.push({file:name,sha256:digest});
}
const intro=fs.readFileSync(path.join(qa.root,'design/QA-NOTE.md'),'utf8');
for(const name of ['QA Long.md','QA Second Long.md'])assert(fs.readFileSync(path.join(qa.vault,name),'utf8').startsWith(intro),`${name}: introductory fixture changed`);
assert.equal(qa.hashFile(path.join(qa.work,'app/app.css')),runtime.app_css_sha256,'Prepared app CSS changed');
assert.equal(JSON.parse(fs.readFileSync(path.join(qa.out,'CSS-CHECKS.json'))).appCssSha256,runtime.app_css_sha256,'Synthetic app CSS is stale');
const record={status:'PASS',scope:'Current-CSS hash gate and complete expected case sets; physical-device acceptance is separate.',candidate:qa.final.name,cssSha256:qa.final.css_sha256,runtimeIdentitySha256:qa.hashFile(path.join(qa.work,'app/QA-IDENTITY.json')),fixtureChecks,suites:checked};
if(!process.argv.includes('--no-write'))fs.writeFileSync(path.join(qa.out,'EVIDENCE-GATE.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
