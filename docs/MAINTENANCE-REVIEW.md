# Maintenance review

October follow-up against the September review, covering published 0.4.5. Reviewed `base.css` SHA-256 `59198c78404b632629839df0b6ce598fe123f7e576588d8e97902f92ade330da`. Distributed CSS `8b23a22cfe4e34443ed6a9e61c58ff6b3b47f2d6c7a80c9bd52199e7fc867ff9`. The later unreleased highlight correction is recorded in [validation](VALIDATION.md#unreleased-highlight-compatibility--2026-10-08).

September review hashes: Cupertino reference `b15328a3f3fe2eff18e58e55304fcdd38a17b69d23576c313be3a3e13f0b54b3`, reviewed `base.css` `3d6f1ab18b65b187f59bc2af9114a07c46ce1bc9c476b5890998f36502760376`, distributed CSS `3bc4db727324037065871d2922bca5a1b3211ad0cea17d837a01b3ab71bb8e49`.

## Inherited layer

Cupertino 3.2.12 has 1,379 CSS rules. The inherited prefix of [base.css](../updates/0.4.5/source/base.css) has 1,378. After dropping the reference's invalid `::focus-visible` rule and normalizing selector spelling, those 1,378 selectors match in order. That is selector continuity, not byte identity.

Inside that prefix: formatting, modern notation, shorthand, dropped redundant prefixes, a generic Inter fallback, equivalent table-wrapping declarations, and a phone Bases width correction. The invalid `select` / `.combobox-button` / `.dropdown` `::focus-visible` rule was removed.

Reading Lab's layer starts at the `Cupertino Reading Lab 0.1.0` comment. Owned behavior is in [FEATURE-COMPARISON.md](FEATURE-COMPARISON.md). Counts from the September source: 177 inherited `!important` declarations, two Reading Lab additions (H1/H2 tracking), 39 inherited `:has()` uses, none added.

## Findings

### 1. Invalid macOS tab padding

`base.css` still has:

```css
padding-right: calc(var(--frame-left-space) + --tab-action-width*2);
```

The second custom property is missing `var()`. Inherited from the pin. Selector is macOS, not fullscreen, nonfloating, nonstacked tabs, both top corners, container at least 560 px wide.

An in-memory `var()` repair applied 160 px of right padding and moved the synthetic tab 80 px left at 900 px in both engines. That is a computed change, not verified titlebar geometry. Leave the expression until that window state is measured.

### 2. Dead declarations in the Reading Lab tail

The September review found 43 earlier declarations overridden later by the same property on the same selector. Examples include the light/dark background tokens, `--h1-size` and `--h2-size`, `--table-text-size`, `--callout-title-color`, and rendered heading margins in the Reading Lab tail of `base.css`. The heading-spacing comment cites `CONTRACTS.md`, which is not in the public tree.

Cleanup is a separate refactor: delete only proven losing declarations, keep final order, recheck computed style. The 0.7em paragraph token still serves editable heading geometry. The 1em token targets rendered content. H1/H3 width caps are still active.

### 3. WebKit width fallbacks

Upstream sets `width: -webkit-fill-available` before `width: stretch` on mobile drawer rows, the drawer tab option, and banner images. September's base had only `stretch`. October restored the three fallbacks. Headless Chromium and Playwright WebKit both accept `stretch`, so the regression simulates rejection. It is not an older WebKit and not an iPhone. No iOS support floor was chosen. See [VALIDATION.md](VALIDATION.md).

### 4. Physical phone coverage

Inherited rules set document margins and a side inset, move the phone header, and use masks and backdrop blur on floating navigation. Reading Lab's phone font-size math uses `100vw`. Desktop emulation does not cover a notch, safe-area changes, the software keyboard, or native momentum scrolling. Masks, blur, and `will-change` were not profiled.

## Left alone

No plugin selector was marked dead because a fixture lacked its DOM. All four `--crl3-*` variables have consumers, as does `--crl4-full-width`. `font-optical-sizing` and the fixed `opsz` declarations can affect a user-selected variable font, so they are not unused just because the default face is static.
