const prose='An ordinary paragraph keeps its measured line length as the reader moves through the page. Letterforms, spacing and punctuation remain part of the same comparison. Arrows ← → and a box ┌─┐ exercise ordinary font fallback.';
const callout = type=>`<div class="callout" data-callout="${type}"><div class="callout-title"><div class="callout-icon"><svg class="svg-icon" width="18" height="18"><path d="M2 2L16 16" stroke="currentColor"/></svg></div><div class="callout-title-inner">${type} callout</div></div><div class="callout-content"><p>${prose}</p></div></div>`;
const content = `<div class="el-h1"><h1 id="title">A quiet page with a deliberately extended heading</h1></div><div class="el-h2"><h2 id="section">Reading on a phone</h2></div><div class="el-h3"><h3>Headings keep a clear hierarchy</h3></div><div class="el-h4"><h4>An italic fourth heading</h4></div><div class="el-h5"><h5>Fifth heading</h5></div><div class="el-h6"><h6>Sixth heading</h6></div><div class="el-p"><p id="prose">${prose} <a class="internal-link" href="#">Linked note</a> <strong>Strong text</strong> <mark>Highlight</mark> <code id="inline-code">inline code</code></p></div>${['note','info','important','warning','success','quote'].map(callout).join('')}<div class="callout" data-callout="note"><div class="callout-title"><div class="callout-title-inner">Nested</div></div><div class="callout-content">${callout('warning')}</div></div><div class="el-pre"><pre><code id="fenced-code">const steady = 42;\n${'wide_column_'.repeat(16)}</code></pre></div><div class="el-table"><div class="table-wrapper"><table><thead><tr>${['Category','Measurement column','Observation column','Fourth wide column'].map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${[1,2,3].map(n=>`<tr><td>Entry ${n}</td><td>123456.789</td><td>Wide synthetic cell</td><td>Another ordinary cell</td></tr>`).join('')}</tbody></table></div></div><div class="el-ul"><ul><li>List item<ul><li>Nested list item</li></ul></li></ul></div><div class="el-hr" id="hr"><hr></div><div class="el-h2"><h2 id="retained">Retained heading after a rule</h2></div>${Array.from({length:45},(_,i)=>`<div class="el-p"><p>Long note section ${i}. ${prose.repeat(4)}</p></div>`).join('')}`;
function html(mode,tone,size,font,width) {
 const bodyClass=`theme-${tone} mod-macos ${width<1000?'is-mobile is-phone is-ios':''}`;
 const inner=mode==='reading'?`<div class="markdown-reading-view"><div class="markdown-preview-view markdown-rendered is-readable-line-width"><div class="markdown-preview-sizer markdown-preview-section">${content}</div></div></div>`:`<div class="markdown-source-view mod-cm6 cm-s-obsidian is-readable-line-width ${mode==='live'?'is-live-preview':''}"><div class="cm-editor ͼ1 ͼ2"><div class="cm-scroller"><div class="cm-sizer"><div class="cm-contentContainer"><div class="cm-content cm-lineWrapping"><div class="cm-line HyperMD-header HyperMD-header-1" id="title">A quiet page</div><div class="cm-line HyperMD-header HyperMD-header-2" id="section">Reading on a phone</div><div class="cm-line HyperMD-header HyperMD-header-3">Heading 3</div><div class="cm-line HyperMD-header HyperMD-header-4">Heading 4</div><div class="cm-line HyperMD-header HyperMD-header-5">Heading 5</div><div class="cm-line HyperMD-header HyperMD-header-6">Heading 6</div><div class="cm-line" id="prose">${prose}<span class="cm-inline-code" id="inline-code">inline code</span></div><div class="cm-line HyperMD-codeblock" id="fenced-code">const steady = 42;</div></div></div></div></div></div></div>`;
 return `<!doctype html><html style="font-size:${size}px"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="${bodyClass}" style="--font-text-size:${size}px;--font-text-override:${font||"'??'"};--font-monospace-override:${font?'Menlo':"'??'"}"><div class="app-container"><div class="horizontal-main-container"><div class="workspace"><div class="workspace-split mod-vertical mod-root"><div class="workspace-tabs mod-active mod-visible"><div class="workspace-tab-container"><div class="workspace-leaf"><div class="workspace-leaf-content" data-type="markdown" data-mode="${mode==='reading'?'preview':'source'}"><div class="view-header"><div class="view-header-title">Synthetic contract fixture</div></div><div class="view-content">${inner}</div></div></div></div></div></div></div></div></div></body></html>`;
}

const surfaceNote=`# A quiet place for sustained attention

“A comfortable reading surface gives an idea enough room to develop.” This paragraph compares punctuation, wrapping and optical detail at exactly the same viewport, font preference and app size. A larger text setting should remain effective when the theme is changed. The reader can pause, return to a heading, and continue without losing their place.

## Making the hierarchy easy to follow

This is **strong emphasis**, a [reference link](https://example.com/crl4), an [[QA Companion|internal note link]], and ==a highlighted passage that spans enough text to cross a line boundary and show the rounded treatment on each line==. Inline code stays distinct: \`const total = 24;\`.

### The next idea belongs here

Another paragraph keeps the familiar ink and paper colors. A clean surface gives the information priority over its decoration.

#### A smaller distinction

##### Supporting detail

###### A final distinction

> [!important] Controlled callout
> A calm blue line introduces related material without enclosing the entire paragraph in a box.
>
> > [!tip] Nested note
> > Nested content keeps its own semantic color and structure.

> [!tip]- An optional detail
> This sentence becomes visible when the reader expands the callout.

| Item | Description |
| :--- | :--- |
| Width | A long descriptive cell should wrap naturally into several lines without losing words or pushing the entire page sideways. |
| Font | Uses the font that the reader selected in Appearance. |

| Measure | Left | Center | Right | Link | Notes | Final column |
| :--- | :--- | :---: | ---: | :--- | :--- | :--- |
| Values | Alpha | Beta | 12345 | https://example.com/a-deliberately-long-path-that-keeps-the-native-horizontal-table-scroll | A long descriptive cell remains readable after the last column has been reached. | LAST COLUMN REACHABLE |
| Second | 12 | 24 | 48 | Short | More text | END |

After the table, the normal prose measure resumes. Arrow symbols → ← and a box ┌─┐ use the selected font's normal fallback.
`;

module.exports={html,surfaceNote};
if(require.main===module)process.stdout.write(surfaceNote);
