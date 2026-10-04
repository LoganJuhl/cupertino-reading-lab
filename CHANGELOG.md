# Changelog

## Documentation — 2026-10-04

- Shorten the README and supporting docs; put project status in [UPSTREAM.md](UPSTREAM.md).
- Link installation to the published prerelease and correct the note `cssclasses` instructions.
- Update publication and CI records while keeping the earlier rendering results tied to their CSS hashes.

## 0.4.5 prerelease — 2026-10-03

First public prerelease. Includes the width fixes below and the earlier 0.4.5 equation scroller. [Release and downloads](https://github.com/LoganJuhl/cupertino-reading-lab/releases/tag/0.4.5).

## Width compatibility — 2026-10-02

- Restore three Cupertino `width: -webkit-fill-available` declarations before `width: stretch` on mobile drawer search, the phone drawer selector, and banners.
- Add a headless width regression: modern equivalence, and a simulated `stretch` rejection.
- Leave the invalid macOS tab-padding expression unchanged. The mechanical repair moves the synthetic tab and is not verified against a real titlebar.
- Point canonical links at `svnaxis/obsidian-cupertino`. Older captures stay bound to CSS `3bc4db72…`.

Working name, version, minimum app version, font bytes, and license texts are unchanged.

## 2026-09-22

- Put Cupertino attribution in the README.
- Add the comparison, notice map, and outreach draft.
- Tighten public-file, notice, and screenshot packaging checks.

CSS, fonts, manifest, and installer bytes were not changed.

## 0.4.5 development — Reading View equations

- Keep long display equations in a local horizontal scroller.
- Exercise rendered math in long notes, including scroll-away and return.
- Font bytes, prose layout, and table scrolling unchanged.

## 0.4.4 — Release preparation

- Embed Minimal and Lucide notices in the installed CSS and license.
- Reproducible public build, pinned tools, CI.
- Measure explicit edge-to-edge helpers inside the note scroller so a native scrollbar does not clip them.
- Correct the inherited phone Bases width rule. Large Mermaid diagrams scroll locally.

Font bytes, prose measure, heading hierarchy, palette, and the phone settings repair are unchanged from 0.4.3.

## 0.4.3 — Phone settings

- Keep native phone dropdown sizing and wrap adjacent actions. Fixes an off-screen Manage button.

## 0.4.2 — Newsreader

- Bundle eight static Newsreader faces, with italics.
- Keyboard focus on settings switches. Desktop dropdown sizing.
- Normalize owned CSS. Native table behavior kept.

Earlier private snapshots are local archives, not releases.
