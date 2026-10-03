/* Parse asset-bearing declarations; license/comment URLs are not network assets. */
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),postcss=require('postcss');
const css=fs.readFileSync('theme.css','utf8'),ast=postcss.parse(css);
let dataUrls=0,faces=0,localAliases=0;
ast.walkAtRules(rule=>{
  assert.notEqual(rule.name.toLowerCase(),'import','Theme must not import stylesheets');
  if(rule.name!=='font-face')return;
  const declarations=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
  if(declarations['font-family']==='"Cupertino Newsreader"'){
    assert(declarations.src.startsWith('url("data:font/woff2;base64,'));faces++;
  }else{
    assert.equal(declarations['font-family'],'"Google Sans System"');
    assert(/^local\([^)]+\),\s*local\([^)]+\)$/.test(declarations.src),'Unexpected inherited font asset');localAliases++;
  }
});
ast.walkDecls(decl=>{for(const match of decl.value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gs)){assert(/^(?:data:|#)/.test(match[2]),`External CSS asset in ${decl.prop}`);dataUrls++;}});
assert.equal(faces,8,'Expected eight embedded font faces');
for(const name of ['aaaaalexis','Logan Juhl','Ango','Lucide','Newsreader','SIL OPEN FONT LICENSE'])assert(css.includes(name),`Missing installed notice: ${name}`);
console.log(JSON.stringify({status:'PASS',fontFaces:faces,inheritedLocalAliases:localAliases,embeddedAssets:dataUrls,cssSha256:crypto.createHash('sha256').update(css).digest('hex')}));
