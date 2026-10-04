# Cupertino and Reading Lab

Compared 2026-09-22 with [Cupertino 3.2.12](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4).

| Area | Cupertino 3.2.12 | Reading Lab 0.4.5 | Ownership |
| --- | --- | --- | --- |
| Interface | Platform chrome, tabs, sidebars, focus options, mobile controls | Same foundation | Inherited |
| Prose | `700px` width token, 1.6 leading | Centered `36.5rem`, `1em` rendered paragraph spacing, 1.6 leading kept | Modified |
| Reading font | Platform and app choices, local system aliases | Eight embedded static Newsreader faces. User font override still works | Added |
| Headings | Cupertino heading styles | Six levels, authored case, section spacing, italic H4 | Modified |
| Paper and ink | Platform-aware Cupertino surfaces | Warm light paper, black dark surface, document ink and link treatment | Modified |
| Callouts | Cupertino surfaces and decorative icons | Border, hidden decorative icon, folding control kept, normal-ink title | Modified |
| Tables | Cupertino styling and helpers | Compact type, transparent sections, row rules. Native editing and scrollers kept | Modified |
| Phone | Touch chrome, safe areas, drawers | Text-size floor, modest table extension, settings wrapping | Inherited + modified |
| Wide blocks | `wide` / `max` and table, image, Bases helpers (Minimal lineage) | Helpers kept. Edge-to-edge measure adjusted for native scrollbars | Inherited + modified |
| Diagrams and equations | Native rendering | Local Mermaid and display-math scrolling | Added |
| Keyboard focus | Inherited focus styling | Visible outline on settings switches | Added |
| Lists, code, footnotes, embeds, properties | App and Cupertino structure | Mostly retained. Reading type and some tokens change presentation | Mostly inherited |

## Source

[CURRENT.json](../CURRENT.json) selects the source. [base.css](../updates/0.4.5/source/base.css) is the normalized inherited sheet, followed by the Reading Lab layer at the `Cupertino Reading Lab 0.1.0` comment. The inherited prefix keeps 1,378 rule selectors in upstream order after normalization and removal of one invalid focus rule.

- Width, leading, palette, headings, callouts, tables, links, phone sizing: Reading Lab tail of `base.css`.
- Font embedding: [build.py](../updates/0.4.5/build.py), [build-fonts.py](../updates/0.4.5/build-fonts.py), [reader-font.css](../updates/0.4.5/source/reader-font.css).
- Switch focus and settings rows: [keyboard-focus.css](../updates/0.4.5/source/keyboard-focus.css), [settings-layout.css](../updates/0.4.5/source/settings-layout.css).
- Helper measure and local scrolling: [wide-content.css](../updates/0.4.5/source/wide-content.css).

## Simplified

Callout icon decoration and table cell capsules were simplified for reading. An invalid upstream `::focus-visible` rule was removed; it did not match. Earlier Reading Lab uppercase and decorative heading rules are overridden by the v4 hierarchy. Those were private iterations, not Cupertino features.

Cascade duplication: [MAINTENANCE-REVIEW.md](MAINTENANCE-REVIEW.md). Checks and device gaps: [VALIDATION.md](VALIDATION.md).
