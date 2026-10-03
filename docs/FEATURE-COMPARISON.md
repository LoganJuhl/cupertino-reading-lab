# Cupertino and Reading Lab

Reviewed 2026-09-22 against [Cupertino 3.2.12](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4). This comparison explains specialization, not a ranking.

| Area | Cupertino reference | Reading Lab 0.4.5 | Ownership |
| --- | --- | --- | --- |
| Interface/navigation | Platform interface, tabs, sidebars, focus options and mobile controls | Retains that foundation; no new progress or sticky navigation system | Inherited |
| Prose | `700px` width token and 1.6 leading | Centered `36.5rem` measure and `1em` rendered paragraph spacing; retains 1.6 leading | Modified + inherited |
| Default reading font | Platform/app font choices and local system aliases | Eight embedded static Newsreader faces; explicit user font override remains | Added |
| Headings | Cupertino heading styling | Six-level hierarchy, authored case, section spacing and italic H4 | Modified |
| Paper/ink | Platform-aware Cupertino surfaces | Warm light paper, black dark surface and document-specific ink/link treatment | Modified |
| Callouts | Cupertino surfaces and decorative icons | Restrained border, hidden decorative icon, retained folding control, normal-ink title | Modified/simplified |
| Tables | Cupertino styling and inherited helpers | Compact type, transparent sections and horizontal row rules; native editing/scrollers retained | Modified |
| Phone reading | Touch interface, safe areas, drawers and navigation | Adds text-size floor, modest table extension and settings wrapping | Inherited + modified |
| Wide blocks | `wide`/`max` and table/image/Bases helpers, with Minimal lineage | Preserves helpers; adjusts edge-to-edge measurement for native scrollbars | Inherited + modified |
| Diagrams/equations | Native rendering; no equivalent Reading View math correction | Local Mermaid and display-math scrolling contains wide content | Added |
| Keyboard focus | Inherited focus styling/reset | Visible keyboard outline on settings switches | Added repair |
| Lists, code, footnotes, embeds, metadata/properties | App/Cupertino structure and controls | Mostly retained; reading typography and some code/callout tokens affect presentation | Primarily inherited |

## Source map

[CURRENT.json](../CURRENT.json) selects the maintained source. [base.css](../updates/0.4.5/source/base.css) contains the normalized inherited stylesheet followed by Reading Lab refinements beginning at `Reading Lab v1`. Its inherited prefix retains 1,378 rule selectors in upstream order after normalization and removal of one invalid focus rule.

- Width, leading, palette, headings, callouts, tables, links and phone sizing: Reading Lab tail of `base.css`.
- Font embedding/instancing: [build.py](../updates/0.4.5/build.py), [build-fonts.py](../updates/0.4.5/build-fonts.py), [reader-font.css](../updates/0.4.5/source/reader-font.css).
- Switch focus/settings: [keyboard-focus.css](../updates/0.4.5/source/keyboard-focus.css), [settings-layout.css](../updates/0.4.5/source/settings-layout.css).
- Helper measurement/local scrolling: [wide-content.css](../updates/0.4.5/source/wide-content.css).

## Removed or simplified

Ordinary callout icon decoration and table cell capsules were simplified for document reading. An invalid upstream `::focus-visible` rule was removed; it did not provide working focus behavior. Earlier Reading Lab uppercase transformations and decorative heading rules are overridden by v4's hierarchy; those were private iteration changes, not features removed from Cupertino.

No broad removal of Cupertino navigation, plugin integrations, safe-area behavior or helpers is claimed. Missing plugin DOM in a test vault does not prove unused CSS. Historical cascade duplication remains; see the [maintenance review](MAINTENANCE-REVIEW.md).

Phone sizing and viewport calculations are implemented behavior, not proof of ideal fit on every device. Inherited animations, masks and blur remain. Their static presence does not establish compositor cost. [Validation](VALIDATION.md) records actual checks and physical-device gaps.
