#!/usr/bin/env python3
"""Prepare a disposable macOS Obsidian shell, profile and synthetic vault.

Does not launch it, modify the installed app, or read any existing vault/config.
Requires an explicit local Obsidian update ASAR. The renderer is unmodified.
"""
from pathlib import Path
import argparse, hashlib, json, os, plistlib, re, shutil, struct, subprocess, tempfile, uuid

ROOT=Path(__file__).resolve().parents[1]
def unpack(src,dest):
    with src.open('rb') as f:
        fields=struct.unpack('<4I',f.read(16));tree=json.loads(f.read(fields[3]));offset=8+fields[1]
        def walk(tree,folder):
            folder.mkdir(parents=True,exist_ok=True)
            for name,item in tree['files'].items():
                assert '/' not in name and name not in ['.','..']
                p=folder/name
                if 'files' in item: walk(item,p)
                elif item.get('unpacked'): shutil.copyfile(Path(str(src)+'.unpacked')/p.relative_to(dest),p)
                else:
                    f.seek(offset+int(item['offset']));p.write_bytes(f.read(item['size']))
        walk(tree,dest)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--installed-app',type=Path,required=True)
    parser.add_argument('--update-asar',type=Path,required=True)
    parser.add_argument('--work',type=Path,default=Path(os.environ.get('QA_WORK',str(ROOT/'work'))))
    args=parser.parse_args();work=args.work.resolve()
    assert args.update_asar.is_file(), 'Provide an explicit local Obsidian 1.13.7 update ASAR'
    stages=json.loads((ROOT/'stages/BUILD.json').read_text())['stages']
    if (ROOT/'CURRENT.json').exists():
        current=json.loads((ROOT/'CURRENT.json').read_text())
        build=json.loads((ROOT/current['build']).read_text())
        assert build['version']==current['version'] and build['name']==current['name']
        stages[-1]={**stages[-1], 'name':build['name'], 'version':build['version'], 'folder':build['folder'], 'css_sha256':build['cssSha256'], 'css_bytes':build['cssBytes']}
    assert [x['name'] for x in stages]==['Cupertino Reading Lab v3','Cupertino Reading Lab v4 S1 Headings','Cupertino Reading Lab v4']
    for stage in stages:
        assert hashlib.sha256((ROOT/stage['folder']/'theme.css').read_bytes()).hexdigest()==stage['css_sha256']
    run_id=str(uuid.uuid4())
    profile=work/'qa-profile';vault=work/'qa-vault'
    assert not profile.exists() and not vault.exists(), 'Use a new work directory; never overwrite an existing profile or vault.'
    temp=Path(tempfile.mkdtemp(prefix='cupertino-reading-qa-'))
    app=temp/'Obsidian QA.app';res=app/'Contents/Resources'
    subprocess.run(['ditto','--noextattr','--norsrc',str(args.installed_app),str(app)],check=True)
    info_path=app/'Contents/Info.plist'
    info=plistlib.loads(info_path.read_bytes())
    info['CFBundleIdentifier']='local.cupertino.v4.release-qa'
    info['CFBundleDisplayName']='Cupertino Reader Release QA'
    # CFBundleName must stay Obsidian so Electron finds its helper executables.
    info_path.write_bytes(plistlib.dumps(info))
    unpack(res/'app.asar',res/'app');unpack(args.update_asar,res/'runtime')
    (res/'app.asar').rename(res/'app-original.asar')
    mainfile=res/'runtime/main.js';maintext=mainfile.read_text()
    pattern=r'\w+\.join\(!\w+&&process\.env\.XDG_RUNTIME_DIR\|\|\w+\.homedir\(\),"\.obsidian-cli\.sock"\)'
    assert len(re.findall(pattern,maintext))==1, 'Unknown launcher socket implementation: stop and inspect.'
    mainfile.write_text(re.sub(pattern,json.dumps(str(temp/'qa-cli.sock')),maintext))
    profile.mkdir(parents=True);(vault/'.obsidian/themes').mkdir(parents=True)
    (vault/'.qa-vault.json').write_text(json.dumps({'purpose':'Cupertino Reading Lab v4 disposable QA','runId':run_id})+'\n')
    (profile/'obsidian.json').write_text(json.dumps({'vaults':{'c001c001c001c001':{'path':str(vault),'open':True,'ts':0}},'updateDisabled':True,'adblock':[],'adblockFrequency':0}))
    (vault/'.obsidian/app.json').write_text(json.dumps({'showInlineTitle':False,'readableLineLength':True,'defaultViewMode':'preview'}))
    (vault/'.obsidian/core-plugins.json').write_text('[]')
    (res/'app/main.js').write_text("""const path=require('path'),electron=require('electron');
electron.app.setPath('userData',%s);
electron.app.isDefaultProtocolClient=()=>true;
electron.app.setAsDefaultProtocolClient=()=>false;
const remote=require('@electron/remote/main');remote.initialize();electron.remote=remote;
electron.protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,codeCache:true}}]);
require('../runtime/main.js')(path.resolve(__dirname,'../runtime'),new(require('events'))(),false);
"""%json.dumps(str(profile)))
    for theme in [ROOT/stage['folder'] for stage in stages]:
        if theme.is_dir() and (theme/'manifest.json').exists():shutil.copytree(theme,vault/'.obsidian/themes'/theme.name)
    surface=subprocess.run([os.environ.get('QA_NODE','node'),str(ROOT/'scripts/fixture.cjs')],check=True,capture_output=True,text=True).stdout
    (vault/'QA V4 Surface.md').write_text(surface)
    intro=(ROOT/'design/QA-NOTE.md').read_text()
    paragraph='An ordinary paragraph keeps its measured line length as the reader moves through the page. Letterforms, spacing and punctuation remain part of the same comparison. Arrows ← → and a box ┌─┐ exercise ordinary font fallback.'
    for name,count in [('QA Long',70),('QA Second Long',55)]:
        body=intro
        for i in range(count):body+=f'---\n\n# Chapter {i+1}\n\n'+(paragraph+'\n\n')*8+f'## Section {i+1}\n\n'+paragraph+'\n\n'
        (vault/(name+'.md')).write_text(body)
    (vault/'QA Companion.md').write_text('# Companion note\n\nAn embedded paragraph and a [[QA Long]] link.\n\n## Embedded heading\n\nA second paragraph.\n')
    (vault/'QA Image.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180" viewBox="0 0 600 180"><rect width="600" height="180" fill="#dedbd1"/><circle cx="300" cy="90" r="50" fill="#2f6182"/></svg>')
    for fixture in (ROOT/'design/fixtures').glob('*.md'): shutil.copyfile(fixture,vault/fixture.name)
    evidence=work/'app';evidence.mkdir(exist_ok=True)
    shutil.copyfile(res/'runtime/app.css',evidence/'app.css')
    runtime_version=json.loads((res/'runtime/package.json').read_text())['version']
    assert runtime_version=='1.13.7', 'Expected Obsidian runtime 1.13.7'
    electron_info=plistlib.loads((app/'Contents/Frameworks/Electron Framework.framework/Resources/Info.plist').read_bytes())
    electron_version=electron_info['CFBundleVersion']
    assert electron_version=='39.8.3', 'Expected Electron shell 39.8.3'
    identity={'run_id':run_id,'electron_version':electron_version,'stage_hashes':{x['name']:x['css_sha256'] for x in stages},'fixture_sha256':hashlib.sha256(surface.encode()).hexdigest(),'source_asar':str(args.update_asar),'source_sha256':hashlib.sha256(args.update_asar.read_bytes()).hexdigest(),'renderer_app_js_sha256':hashlib.sha256((res/'runtime/app.js').read_bytes()).hexdigest(),'app_css_sha256':hashlib.sha256((res/'runtime/app.css').read_bytes()).hexdigest(),'version':runtime_version,'launcher_changes':['isolated userData','isolated CLI socket','updater omitted'],'vault':str(vault),'profile':str(profile),'temporary_app':str(app)}
    (evidence/'QA-IDENTITY.json').write_text(json.dumps(identity,indent=2)+'\n')
    subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
    subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
    print(json.dumps(identity,indent=2))
    print('Launch only this copied executable: '+str(app/'Contents/MacOS/Obsidian'))
    print('Arguments: --use-mock-keychain --remote-debugging-address=127.0.0.1 --remote-debugging-port=9341')
    print('Use QA_WORK='+str(work)+' and QA_CDP=http://127.0.0.1:9341 for every suite. Never reuse a personal profile.')
if __name__=='__main__':main()
