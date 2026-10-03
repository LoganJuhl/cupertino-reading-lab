/* Entirely synthetic content for native block/helper integration checks. */
const base='filters:\n  and:\n    - file.inFolder("QA Release Data")\nviews:\n  - type: table\n    name: Research\n    order:\n      - file.name\n      - note.topic\n      - note.status\n';
const blocks={
 prose:'Prose measure stays centered in its own pane. A calm column gives each sentence enough room to unfold without stretching across a large display.\n\nA second paragraph confirms that the document width remains consistent.',
 table:'| '+Array.from({length:8},(_,i)=>`Column ${i+1}`).join(' | ')+' |\n| '+Array(8).fill('---').join(' | ')+' |\n'+Array.from({length:3},(_,r)=>'| '+Array.from({length:8},(_,c)=>`Record_${r+1}_value_${c+1}`).join(' | ')+' |').join('\n'),
 image:'![[QA Release Image.svg]]',
 bases:'```base\n'+base+'```',
 code:'```javascript\nconst reading = "'+Array(15).fill('a clear sentence').join(' ')+'";\nconsole.log(reading);\n```',
 mermaid:'```mermaid\nflowchart LR\n  Read[Read the source] --> Consider[Consider the evidence]\n  Consider --> Write[Write a clear note]\n  Write --> Review[Review the result]\n```',
 math:'$$\n\\sum_{i=1}^{n} x_i^2 = \\frac{n(n+1)(2n+1)}{6}\n$$',
 note:'![[QA Release Companion]]',
 canvas:'![[QA Release Canvas.canvas]]',
 dataview:'```dataview\nTABLE topic, status FROM "QA Release Data"\nSORT file.name\n```',
};
const helpers={prose:['','wide','max'],table:['','table-wide','table-max','table-100'],image:['','img-wide','img-max','img-100'],bases:['','bases-wide','bases-max','bases-100'],code:[''],mermaid:[''],math:[''],note:[''],canvas:['']};
const cases=Object.entries(helpers).flatMap(([kind,classes])=>classes.map(helper=>({kind,helper,file:`QA Release ${kind} ${helper||'default'}.md`})));
function note({kind,helper}){return `---\ncssclasses: [${helper}]\n---\n\nProse measure before the block stays readable.\n\n${blocks[kind]}\n\nProse measure after the block stays readable.\n`;}
const files={
 'QA Release Image.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="280" viewBox="0 0 1600 280"><rect width="1600" height="280" fill="#b0bfc1"/><path d="M0 230L400 60L800 230L1200 60L1600 230" fill="none" stroke="#354e50" stroke-width="12"/><circle cx="800" cy="80" r="32" fill="#f7f5ef"/></svg>',
 'QA Release Companion.md':'## A connected idea\n\nThis synthetic embedded note checks the document boundary. **Emphasis** and an [external reference](https://obsidian.md) remain legible.\n',
 'QA Release Canvas.canvas':JSON.stringify({nodes:[{id:'aaaaaaaaaaaaaaaa',type:'text',text:'Read the evidence',x:0,y:0,width:250,height:120},{id:'bbbbbbbbbbbbbbbb',type:'text',text:'Write a clear note',x:350,y:0,width:250,height:120}],edges:[{id:'cccccccccccccccc',fromNode:'aaaaaaaaaaaaaaaa',fromSide:'right',toNode:'bbbbbbbbbbbbbbbb',toSide:'left'}]}),
 'QA Release Base.base':base,
 ...Object.fromEntries(['Alpha','Beta','Gamma'].map((name,i)=>[`QA Release Data/${name}.md`,`---\ntopic: Research ${i+1}\nstatus: Reviewed\n---\n\nSynthetic research record ${name}.\n`])),
 ...Object.fromEntries(cases.map(c=>[c.file,note(c)])),
};
module.exports={cases,files,note};
