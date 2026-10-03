# Cupertino Reading Lab v4

A Cupertino-derived Obsidian theme focused on long-form reading and document consumption.

## Built on Cupertino

This theme is based on the outstanding Cupertino theme created by Alexis C. Cupertino provides much of the visual foundation and native-feeling interface that made this project possible. This project extends that foundation with a different focus: long-form reading and document consumption in Obsidian.

[Cupertino](https://github.com/svnaxis/obsidian-cupertino) is created by [Alexis C.](https://github.com/svnaxis). Much of its interface, mobile behavior, navigation and helper styling remains here. This derivative is maintained by Logan Juhl; it is not an official Cupertino release or an endorsed project. See [UPSTREAM.md](UPSTREAM.md) for the lineage and preserved notices.

**Status:** version **0.4.5** is an unreleased source candidate for manual installation. It has not been submitted to the Obsidian Community directory, and no approval from Alexis is recorded. The current maintenance candidate restores three inherited WebKit width fallbacks. Focused headless checks pass; fresh actual-app captures and physical iPhone acceptance remain pending. The full earlier runtime matrix applies to the preceding CSS hash, as explained in [validation](docs/VALIDATION.md).

![Light Reading View with headings, emphasis and a blockquote](screenshot.png)

## Why this theme exists

The focus is staying with a long document: a consistent prose measure, generous leading, clear section hierarchy and restrained supporting content. It keeps Cupertino's familiar interface while adapting the document surface for sustained reading. Writing remains available through Obsidian's normal editor.

Outline navigation, tabs, mobile controls, focus options and sidebars largely come from Obsidian and Cupertino. No new reading-progress or sticky navigation system is claimed. The [feature comparison](docs/FEATURE-COMPARISON.md) separates inherited behavior from actual changes.

## Long-form reading features

- **Document measure and rhythm:** a centered `36.5rem` prose-width token and rendered paragraph spacing of `1em`, retaining Cupertino's 1.6 leading.
- **Reading typography:** eight bundled static Newsreader faces, including matching italics. An explicit Appearance font selection takes precedence.
- **Heading hierarchy:** a six-level heading hierarchy, authored capitalization and section spacing. Live Preview retains native editable-line geometry.
- **Supporting content:** restrained callout borders, normal-ink callout titles, compact tables, underlined links and warm light/dark document palettes.
- **Phone adaptations:** text sizing respects the user's selected size as a floor; table spacing and settings-row wrapping account for narrow screens.
- **Wide material:** tables retain native local scrolling; large Mermaid diagrams and Reading View display equations have their own horizontal scroll area.

Cupertino's existing `wide`, `max`, table/image/Bases helpers, cards, embeds and image filters remain available. Use `table-wide` or `img-max` in a note's `cssclasses` property to widen a block, or `wide` to widen the whole note. These helper conventions are inherited.

## Screenshots

![Dark Reading View of the same synthetic document](screenshot-dark.png)

Both previews are actual macOS Obsidian captures of synthetic notes using the preceding 0.4.5 CSS and the unchanged embedded font. They predate the width-fallback maintenance change. See the [capture record and remaining screenshot checklist](docs/SCREENSHOTS.md).

## Installation

### Manual installation

1. Obtain this repository's source archive or checkout. A public release download is not yet available.
2. Create `.obsidian/themes/Cupertino Reading Lab v4/` inside a test vault.
3. Copy the root `theme.css` and `manifest.json` into that folder. Include `LICENSE` when sharing a copy; the installed CSS also carries the required notices.
4. Select **Cupertino Reading Lab v4** under **Settings → Appearance**.
5. Leave **Text font → Default** for bundled Newsreader. Keep a monospace font for code.

The CSS includes the font data; no font installation, plugin, account or remote font request is needed. Back up an existing theme folder before replacing it. Restore that folder or select Cupertino to roll back.

## Compatibility

The manifest declares Obsidian **1.13.4 or later**. Runtime testing used **1.13.7**, Electron **39.8.3**, both tones and Reading View, Live Preview and Source Mode. The minimum application release and every installer/platform combination have not been verified. Desktop phone emulation and standalone WebKit checks do not establish physical iPhone behavior.

See [validation results and limits](docs/VALIDATION.md), [maintenance findings](docs/MAINTENANCE-REVIEW.md) and the [author-review checklist](docs/AUTHOR-REVIEW-READINESS.md).

## Development

`CURRENT.json` selects the maintained CSS source and build. The root `theme.css`, `manifest.json` and `LICENSE` are generated distribution files; edit their owning inputs first.

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

Use Python 3.11+ and Node 22+. The normal build is offline and uses checked-in font files. The theme has no runtime JavaScript or package dependencies. [Development](docs/DEVELOPMENT.md) explains source ownership, regression fixtures, font regeneration and runtime QA. [CHANGELOG.md](CHANGELOG.md) records development versions, not published-release claims.

For a proposed change, describe the affected document/view/platform, use a synthetic reproduction and run the relevant checks. Preserve notices and explain visual changes. The [readiness checklist](docs/AUTHOR-REVIEW-READINESS.md) records source-hosting, naming and later author-permission steps. The [historical outreach packet](docs/CUPERTINO-AUTHOR-OUTREACH.md) is retained for later revision.

## Credits and license

- **Alexis C. / svnaxis (formerly aaaaalexis) — Cupertino:** visual foundation, interface architecture and substantial retained styling; MIT.
- **Steph Ango / kepano — Minimal:** inherited cards, image filters and helper conventions carried through Cupertino; MIT.
- **Lucide contributors:** the identified inherited `rows-2` icon; ISC, with its upstream Feather notice retained.
- **Production Type and the Newsreader Project Authors:** font software under SIL OFL 1.1. The bundled static derivatives are not an endorsement by the font authors.
- **Craft Docs:** interface inspiration credited by Cupertino.

Theme code is MIT-licensed; third-party components retain their own licenses. [LICENSE](LICENSE) contains the complete distribution notices. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) maps sources and records remaining provenance/naming questions. This repository does not claim independent authorship of Cupertino's work.
