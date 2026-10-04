# Upstream

Comparison reviewed 2026-09-22. Canonical URL refreshed 2026-10-02.

| Field | Record |
| --- | --- |
| Upstream | Cupertino for Obsidian |
| Author | Alexis C. (`svnaxis`, formerly `aaaaalexis`) |
| Repository | [svnaxis/obsidian-cupertino](https://github.com/svnaxis/obsidian-cupertino) |
| License | MIT. [LICENSE.txt](https://github.com/svnaxis/obsidian-cupertino/blob/080cea8d2c680c66e26b61b58970e56fd6f30ae4/LICENSE.txt) at the comparison commit |
| Copyright | `Copyright (c) 2025 aaaaalexis` |
| Comparison | 3.2.12, [`080cea8d2c680c66e26b61b58970e56fd6f30ae4`](https://github.com/svnaxis/obsidian-cupertino/tree/080cea8d2c680c66e26b61b58970e56fd6f30ae4), 2026-07-31 |
| Relationship | Independent derivative. Substantial Cupertino CSS remains |

The 2026-10-02 link refresh followed a redirect from the old repository URL. It does not mean `080cea8` is still upstream `main`, and it is not a merge target. This repository has no history of the earlier private edits, so the pin identifies the compared tree only.

Most platform, window, navigation, mobile, plugin, and helper styling is inherited. Reading Lab changes document typography, measure, spacing, palette, headings, callouts, and tables. It adds static Newsreader, switch focus, settings-row wrapping, and scrolling for wide content. Ownership: [docs/FEATURE-COMPARISON.md](docs/FEATURE-COMPARISON.md).

Cupertino's copyright and MIT text are in [LICENSE](LICENSE), the installer license, and `theme.css`. The unaltered notice is [licenses/Cupertino-MIT.txt](licenses/Cupertino-MIT.txt). README credit does not replace those notices.

Cupertino credits Minimal and Craft Docs. Known Minimal and Lucide notices are preserved. Font and remaining asset questions: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Upstream funding config, issue bot, release automation, and photography are not copied.

## Status

Updated 2026-10-04. [0.4.5](https://github.com/LoganJuhl/cupertino-reading-lab/releases/tag/0.4.5) is a prerelease for manual install, published 2026-10-03 from [`0717348`](https://github.com/LoganJuhl/cupertino-reading-lab/commit/07173489d1c6f3db7daed9f14d59fd102d362714). The default branch has newer docs. The tag and release assets retain the original snapshot.

The release restores three WebKit width fallbacks. Build and regression checks passed, including [CI on that commit](https://github.com/LoganJuhl/cupertino-reading-lab/actions/runs/37156955844). The full app test matrix and screenshots still cover the preceding CSS. See [test results and limits](docs/VALIDATION.md).

I haven't noticed scrolling or mobile-spacing issues in personal use. I didn't record the device model, OS, or Obsidian version, so this isn't a recorded device test.

The theme hasn't been submitted to the Community directory, and no approval from Alexis is recorded. The name remains **Cupertino Reading Lab v4**. Discuss any proposed rename with him before submission, when the directory name becomes fixed. Requirements: [COMMUNITY-DIRECTORY.md](docs/COMMUNITY-DIRECTORY.md).
