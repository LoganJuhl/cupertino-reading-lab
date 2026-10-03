# Maintainer review — Cupertino Reading Lab v4

## Bounded follow-up — 2026-10-02

Current source SHA256: `59198c78404b632629839df0b6ce598fe123f7e576588d8e97902f92ade330da`. Current distributed CSS SHA256: `8b23a22cfe4e34443ed6a9e61c58ff6b3b47f2d6c7a80c9bd52199e7fc867ff9`. The September review below retains its original hashes and line references; adding three declarations shifts subsequent current-source line numbers.

- **Width fallback repaired:** restored the three upstream `width: -webkit-fill-available` declarations immediately before `width: stretch`, covering mobile drawer search controls, the phone drawer selector and banner images. No selector or other production declaration changed.
- **Matched check passed:** [width-fallback regression](../scripts/check-width-fallbacks.cjs), 48 cases / 192 renderings in Chromium 151.0.7922.34 and Playwright WebKit 26.5, both tones, 320/390/932 px, collapsed/expanded drawer and small/large banners. Removing fallbacks left modern geometry unchanged. Removing `stretch` simulated an engine rejecting it: the fallbacks preserved intended available width. In the 390px WebKit light fixture, the search field was 358px with the fallback versus 390px without, the expanded selector 358px versus about 66.7px, and the small banner 374px versus 240px. Auto-sized search rows and large banners need not differ; the negative controls do not assume every element fails.
- **Coverage limit:** these are synthetic fixtures with the locally extracted Obsidian stylesheet. Both installed engines accept `stretch`; neither is an older WebKit or a physical iPhone. [Browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/width.json) supports preserving the prefixed fallback, but no iOS support floor was selected from that data.
- **macOS proposal deferred:** the in-memory `var()` repair activated 160px right padding and moved the synthetic tab 80px left in both engines at 900px. That establishes a computed-layout change, not correct native tab centering. The fixture does not establish the full titlebar/control geometry, so the invalid expression remains unchanged pending the exact native window state. No mechanical fix is presented as a verified improvement.
- **No cleanup expansion:** the 43 overridden declarations and historical comments remain a separately scoped refactor. Known asset/provenance questions remain in [third-party notices](../THIRD_PARTY_NOTICES.md). Copyright, license and font bytes are unchanged.

The source candidate has a new hash. Earlier actual-app, math and publication evidence remains historical, not a fresh pass for these bytes. See [validation](VALIDATION.md) and [readiness](AUTHOR-REVIEW-READINESS.md) for release gates.

## September source review

Reviewed **2026-09-22**, against Reading Lab **0.4.5**. This is a source and maintenance review for the upstream author and future maintainers. It is not an assertion that every supported platform, plugin or rendering state works correctly. No theme CSS was changed for this review.

## Reference and scope

- Cupertino reference: [`080cea8d2c680c66e26b61b58970e56fd6f30ae4`](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4), dated 2026-07-31 and verified as upstream `main` during this review. This is the pinned Cupertino 3.2.12 comparison reference, not an instruction to merge future upstream changes automatically.
- Reference stylesheet SHA256: `b15328a3f3fe2eff18e58e55304fcdd38a17b69d23576c313be3a3e13f0b54b3`.
- Maintained source: [`updates/0.4.5/source/`](../updates/0.4.5/source/), selected by [`CURRENT.json`](../CURRENT.json) and assembled by [`build.py`](../updates/0.4.5/build.py).
- Reviewed `base.css` SHA256: `3d6f1ab18b65b187f59bc2af9114a07c46ce1bc9c476b5890998f36502760376`.
- Distributed `theme.css` SHA256: `3bc4db727324037065871d2922bca5a1b3211ad0cea17d837a01b3ab71bb8e49`.

Line references below belong to these exact sources. Findings are **STATICALLY REVIEWED** unless stated otherwise. Existing runtime evidence and its platform limits are described separately in [VALIDATION.md](VALIDATION.md); it should not be extrapolated to untested states. This review did not inspect personal note content or run a performance profile.

## Inherited and owned behavior

The reference has 1,379 CSS rules. The inherited portion of [`base.css`](../updates/0.4.5/source/base.css), lines 1–7750, has 1,378. After excluding the reference's invalid `::focus-visible` rule and normalizing equivalent selector spelling, all 1,378 selectors match in order. This establishes selector continuity, not byte identity or proof that every declaration is unchanged.

Cupertino continues to supply the app chrome, platform adaptation, navigation, mobile layout, animation system and optional plugin/helper styling. Reading Lab did not originate those systems. Inherited Minimal helpers and Lucide artwork remain credited as described in [UPSTREAM.md](../UPSTREAM.md).

Changes within the inherited portion include formatting and modern CSS notation, shorthand consolidation, removal of redundant declarations/prefixes, a generic fallback for Inter at line 1991, the equivalent modern table wrapping declarations at lines 3292–3296, and a substantive phone Bases width correction at lines 3509–3515. The invalid `select::focus-visible`, `.combobox-button::focus-visible` and `.dropdown::focus-visible` rule was removed; this did not remove a functioning focus selector.

Reading Lab's design layer begins at line 7752. Its principal long-form reading changes are:

| Area | Owned behavior and source |
| --- | --- |
| Reading surface | Paper/ink palette and related tokens, lines 7752–7821 and 7977–8009. |
| Prose | 36.5rem measure, retaining Cupertino's 1.6 leading, lines 7827–7831; rendered paragraph spacing of 1em, lines 8273–8279. |
| Headings | Final six-level editorial hierarchy, lines 8194–8237; authored case and removal of earlier decorative rules, lines 8239–8262; rendered heading margins, lines 8282–8299. |
| Callouts | Quiet borders, hidden decorative icons, retained folding control, normal-ink titles and shared informational blue, lines 7940–7974, 8265–8270 and 8302–8312. |
| Tables | Transparent surfaces and row rules, lines 7888–7926; compact type, column minimums and phone bleed, lines 8115–8155. Native table scrollers remain in use. |
| Links and emphasis | Underlines, browser-owned visited-link color and highlight treatment, lines 8159–8191. |
| Default font | Eight embedded static Newsreader faces assembled by `build.py`, lines 23–38, and selected by [`reader-font.css`](../updates/0.4.5/source/reader-font.css). Explicit Appearance font preferences remain supported. |
| Targeted repairs | [`keyboard-focus.css`](../updates/0.4.5/source/keyboard-focus.css), [`settings-layout.css`](../updates/0.4.5/source/settings-layout.css), and [`wide-content.css`](../updates/0.4.5/source/wide-content.css) restore switch focus visibility, adjust settings controls, correct explicit width helpers, and provide local Mermaid/display-math scrolling. |

The current base has **177 inherited `!important` declarations and two Reading Lab additions**. The additions at lines 8056 and 8061 consume H1/H2 tracking tokens to override Cupertino's important heading tracking reset. All **39 `:has()` occurrences are inherited**; the Reading Lab layer adds none. These counts identify ownership, not defect severity.

## Findings and recommended follow-up

### 1. Invalid tab-padding calculation

**Severity:** MEDIUM. **Classification:** Confirmed source defect; visible impact unverified in the exact affected state. **Confidence:** High in the syntax finding.

`base.css:429` contains:

```css
padding-right: calc(var(--frame-left-space) + --tab-action-width*2);
```

The second custom property lacks `var()`. This expression is inherited from the pinned reference. Its selector applies to macOS desktop, outside fullscreen, with nonfloating, nonstacked tabs occupying both top corners, inside a container at least 560px wide. The intended right padding cannot be computed from this expression.

**Recommendation:** Treat `var(--tab-action-width) * 2` as a targeted future repair. Reproduce that exact window/tab state and compare geometry before changing it. Activating previously invalid padding can move controls; a general reading-view test does not cover this state. The reviewed release retains the existing bytes.

### 2. Historical cascade and comments obscure final behavior

**Severity:** Low. **Classification:** Maintainability issue. **Confidence:** High for identical-selector overrides; broader consolidation requires care.

The Reading Lab tail contains 43 earlier top-level declarations superseded by later declarations of the same property under the exact same selector. Examples are background tokens at 7759/7764, heading tokens at 7832–7851 and 8032–8039, table sizes at 7881–7883, callout title color at 7945, and heading margins at 8068/8073/8077/8082. Final declarations remain later in the file. Several comments describe intermediate stages rather than the shipped behavior; line 7865 also references a `CONTRACTS.md` absent from the maintained public files.

**Recommendation:** Defer to a separate, behavior-preserving refactor: remove only proven losing declarations, retain final declaration order, update comments, and compare representative computed styles and geometry. Do not remove whole historical sections. The 0.7em paragraph token at line 7829 still serves editable heading geometry, while the 1em token at line 8279 intentionally targets rendered content. H1/H3 width caps also remain active.

### 3. Removed WebKit width fallbacks need a declared support boundary

**Severity:** Low pending target-platform evidence. **Classification:** Compatibility risk, not a reproduced regression. **Confidence:** High in the source difference; uncertain user impact.

Upstream supplies `width: -webkit-fill-available` before `width: stretch` for mobile drawer rows, drawer tab options and banner images. The maintained base retains only `stretch` at lines 1697–1699, 1822–1827 and 6451–6460. Modern-engine tests do not establish behavior on an older engine that rejects `stretch`.

**Recommendation:** Decide which iOS/WebKit versions are supported and test those specific surfaces there. If an intended target requires the fallback, restore it as a compatibility change with matched validation. Do not infer a platform guarantee from the minimum Obsidian app version alone.

### 4. Native safe-area and rendering coverage remains bounded

**Severity:** Informational. **Classification:** Verification gap. **Confidence:** High about the coverage limit; no new defect established.

Inherited mobile rules set document margins and a side inset at lines 1567–1581, move the phone header at 1865–1887, and use masks/backdrop blur around floating navigation at 1877–1918. Reading Lab's phone font-size calculation at 8022 uses `100vw`. Desktop mobile emulation cannot establish all effects of a physical notch, safe-area changes, the software keyboard or native momentum scrolling.

**Recommendation:** Keep native device checks tied to the exact CSS and settings. Retain these rules unless a specific state fails. Performance was **not measured**: the presence of masks, blur, transitions or `will-change` is an investigation lead, not evidence of excessive repainting or a compositor defect.

## Deliberately retained and unresolved

No plugin selector was declared dead merely because a local fixture lacks its DOM. Such removal would require an explicit support decision or evidence from the relevant integration. All four project `--crl3-*` variables have consumers, as does `--crl4-full-width`.

The bundled font faces are static, but `font-optical-sizing` and the fixed `opsz` declarations can affect a user-selected variable font. They are not safely classified as unused solely from the default font configuration.

This review supports a small, inspectable follow-up list. It does not replace the runtime matrix, native iPhone acceptance, or investigation of an independently reported regression.
