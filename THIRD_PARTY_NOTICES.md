# Third-party notices

Reviewed 2026-09-22. This map accompanies [LICENSE](LICENSE). It does not replace the license texts.

| Component | Source | License |
| --- | --- | --- |
| Cupertino, Alexis C. / svnaxis (formerly aaaaalexis) | [3.2.12 reference](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4). Interface, platform, and helper CSS | MIT. [Original notice](licenses/Cupertino-MIT.txt), generated LICENSE, installed CSS |
| Reading Lab, Logan Juhl | Project CSS, build, and review notes | MIT. [Project notice](licenses/Reading-Lab-MIT.txt). Retains Cupertino's copyright |
| Minimal, Steph Ango / kepano | [kepano/obsidian-minimal](https://github.com/kepano/obsidian-minimal). Inherited cards, image filters, table helpers | MIT. [Notice](licenses/Minimal-MIT.txt) |
| Lucide, with Feather attribution | [lucide-icons/lucide](https://github.com/lucide-icons/lucide). Identified `rows-2` SVG in the cards helper | ISC plus upstream Feather MIT notice. [Notice](licenses/Lucide-LICENSE.txt) |
| Newsreader Project Authors / Production Type | [Pinned tree](https://github.com/productiontype/Newsreader/tree/1ece6a8bfe5db1a2b90c76cc1fe5d3b2eed5dcf3). Eight static WOFF2 derivatives built here | SIL OFL 1.1. [OFL](updates/0.4.5/fonts/upstream/OFL.txt), font metadata, LICENSE, installed CSS |

Notices are embedded in `theme.css` because an install may contain only `theme.css` and `manifest.json`. MIT and ISC texts stay intact. Font software stays OFL.

## Newsreader

[Production provenance](updates/0.4.5/fonts/PROVENANCE.json) records output and source hashes. [Upstream provenance](updates/0.4.5/fonts/upstream/PROVENANCE.json) records the URL and commit. [build-fonts.py](updates/0.4.5/build-fonts.py) freezes optical size 24 and weights 400/500/600/700, with italics. No glyph subsetting.

The pinned OFL includes embedding and modification conditions and declares no Reserved Font Name; the complete terms are in [OFL.txt](updates/0.4.5/fonts/upstream/OFL.txt). Upstream's [trademark note](https://github.com/productiontype/Newsreader/blob/1ece6a8bfe5db1a2b90c76cc1fe5d3b2eed5dcf3/trademarks.md) names Production Systems SAS as the Newsreader trademark owner. Use of the `Cupertino Newsreader` derivative family name remains an open naming question.

Five [QA fonts](resources/qa-fonts/PROVENANCE.json) are in source and excluded from the installer. Metadata identifies Newsreader 24pt v1.003, Production Type / Hugues Gentile, 2020 copyright, OFL. [Their OFL](resources/qa-fonts/OFL.txt) is kept. Acquisition URL, source commit, and conversion recipe are unknown.

## Inherited artwork and system fonts

All 57 SVG data-URI uses (55 unique payloads) match the pinned Cupertino stylesheet. `rows-2` is identified as Lucide. The original sources and any additional notices for the other control, checkbox, callout, and navigation masks still need to be identified. Obsidian's [brand rules](https://obsidian.md/brand) apply to the Obsidian mark separately.

`SF Pro`, `Inter`, and `Google Sans` are named as installed system fonts. Two inherited `Google Sans System` faces use `local(...)`. No Apple or Google font binaries are shipped. The only embedded faces are the eight Newsreader files.

## Tooling and previews

npm dependencies are development tools and are not in the installer. FontTools and Brotli are optional regeneration tools. Dataview and Obsidian app files are used only in ignored local QA and are not redistributed.

Previews use project-authored synthetic notes. Cupertino's Craft Docs credit is kept. The credited Yushan photograph is not included.

SVG payloads were compared again on 2026-10-02 and still match the pin.
