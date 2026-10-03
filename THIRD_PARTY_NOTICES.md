# Third-party notices and provenance

Reviewed **2026-09-22**. This map accompanies the complete [LICENSE](LICENSE); it does not replace the texts or claim independent authorship of inherited assets.

| Component | Source and relationship | License and retained notice |
| --- | --- | --- |
| Cupertino, Alexis C. / svnaxis (formerly aaaaalexis) | [3.2.12 reference](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4); substantial interface/platform/helper CSS | MIT; [original notice](licenses/Cupertino-MIT.txt), generated LICENSE and installed CSS |
| Reading Lab, Logan Juhl | Project-specific CSS, build and review material | MIT; [maintained project notice](licenses/Reading-Lab-MIT.txt), generated LICENSE and installed CSS; retains Cupertino's copyright |
| Minimal, Steph Ango / kepano | [Upstream](https://github.com/kepano/obsidian-minimal); inherited cards, image filters and table helpers; cards source also credits Stephan Ango | MIT; [notice](licenses/Minimal-MIT.txt), generated LICENSE and installed CSS |
| Lucide, with Feather attribution | [Upstream](https://github.com/lucide-icons/lucide); identified `rows-2` SVG in the inherited cards helper | ISC plus upstream Feather MIT notice; [complete notice](licenses/Lucide-LICENSE.txt), generated LICENSE and installed CSS |
| Newsreader Project Authors / Production Type | [Pinned upstream](https://github.com/productiontype/Newsreader/tree/1ece6a8bfe5db1a2b90c76cc1fe5d3b2eed5dcf3); eight project-created static WOFF2 derivatives | SIL OFL 1.1; [OFL](updates/0.4.5/fonts/upstream/OFL.txt), font metadata, generated LICENSE and installed CSS |

The build embeds full notices because an Obsidian installation may contain only `theme.css` and `manifest.json`. README credit alone is not the notice-preservation mechanism. MIT/ISC copyright, permission and disclaimer text remains; font software retains OFL rather than being relicensed as MIT.

## Newsreader

[Production provenance](updates/0.4.5/fonts/PROVENANCE.json) records output and original font hashes. [Upstream provenance](updates/0.4.5/fonts/upstream/PROVENANCE.json) records URLs and commit. The [recipe](updates/0.4.5/build-fonts.py) freezes optical size 24 and weights 400/500/600/700 with matching italics, without glyph subsetting.

The pinned OFL permits embedding/modification subject to its conditions, including carrying copyright/license, retaining OFL for derivatives and not selling fonts alone. It declares no Reserved Font Name. Upstream's separate [trademark notice](https://github.com/productiontype/Newsreader/blob/1ece6a8bfe5db1a2b90c76cc1fe5d3b2eed5dcf3/trademarks.md) identifies Production Systems SAS as the Newsreader trademark owner. `Cupertino Newsreader` is a project-created derivative family identifier, not an endorsement. This audit does not determine trademark clearance or establish infringement; public font branding remains a question before broad release.

Five historical [QA fonts](resources/qa-fonts/PROVENANCE.json) are included in source but excluded from the installer. Their metadata identifies Newsreader 24pt v1.003, Production Type/Hugues Gentile, the 2020 project copyright and OFL; [their OFL](resources/qa-fonts/OFL.txt) is retained. Their acquisition URL, source commit and conversion recipe are unestablished. A verified hash does not close that provenance gap.

## Inherited artwork and system fonts

All 57 SVG data-URI uses (55 unique payloads) match canonical Cupertino. `rows-2` has separately identified Lucide provenance. Original authorship of the other platform-control, checkbox, callout and navigation masks is not independently established. Their presence in Cupertino and its MIT notice is recorded; separate underlying rights are not assumed. Ask Alexis about sources and additional notices. Resemblance does not establish an Apple/SF Symbols origin. Obsidian's [brand rules](https://obsidian.md/brand) are separately relevant to its mark.

SF Pro, Inter and Google Sans names refer to available system fonts. Two inherited `Google Sans System` faces use `local(...)`; no Apple/Google font binaries are shipped. Embedded font payloads are the eight Newsreader faces.

## Tooling and previews

All locked npm dependencies are development tools, excluded from the installer; their licenses remain with the packages. FontTools/Brotli are optional regeneration tools. Dataview and Obsidian application files are used only in ignored local QA environments and are not redistributed here. Preserve notices if tooling is later vendored.

Previews use synthetic project-authored notes and no private content or upstream photograph. Cupertino's Craft Docs inspiration credit is retained; its credited Yushan photography is not included.

These are source and notice findings, not a legal opinion or a claim of approval by Alexis or other rights holders.

## Maintenance follow-up — 2026-10-02

The 57 inherited SVG uses (55 unique data-URI payloads) were compared again with the pinned Cupertino stylesheet and still match exactly. This confirms inheritance, not original artwork authorship. No SVG, QA font, production font or license bytes changed. The QA acquisition history and derivative-font naming questions above remain unresolved; font metadata was not freshly decoded because FontTools was unavailable in the selected Python environment. Existing provenance records and production hashes remain inspectable.

The working theme name remains Cupertino Reading Lab v4. A more descriptive public name is provisional and subject to the owner’s decision and discussion with Alexis. Neither existing copyright permission nor prominent credit establishes author endorsement or approval of a proposed name.
