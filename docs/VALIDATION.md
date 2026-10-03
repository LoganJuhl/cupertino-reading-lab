# Validation

## Current maintenance candidate — 2026-10-02

CSS SHA-256: `8b23a22cfe4e34443ed6a9e61c58ff6b3b47f2d6c7a80c9bd52199e7fc867ff9`. The only production changes are three restored upstream width fallbacks. Version 0.4.5 and the declared minimum 1.13.4 are unchanged; no public release was made. The locally installed vault theme was verified against the preceding CSS before editing and has not been updated by this maintenance task.

| Check | Current result |
| --- | --- |
| Offline build and independent temporary rebuild | PASS; all four installer files match; root outputs match their owning inputs. |
| Public inventory, local links, embedded assets and full notices | PASS; includes the new regression script and excludes local reports, vaults, app files and archives. |
| Existing offline maintenance tests | PASS; five tests, including stale-capture and notice-removal rejection. |
| Width compatibility regression | PASS; 48 cases / 192 renderings in headless Chromium 151.0.7922.34 and Playwright WebKit 26.5. Both tones; 320/390/932 px; collapsed/expanded drawers; small/large banners. |
| Current official lint | Zero errors; 225 warnings in base and compiled CSS, representing the same 225 issues. Four refinement modules have zero warnings. The three additional warnings are `declaration-block-no-duplicate-properties` for the deliberate two-value width fallback. |
| Stale publication guard | PASS: the previous captures are rejected with “Publication capture used different CSS.” |
| macOS tab-padding investigation | Mechanical repair changes synthetic geometry; correct native layout remains unverified, so production expression is unchanged. |
| Full actual-app matrix, fresh captures, older WebKit and physical devices | NOT RUN for current CSS. Earlier passes below are preserved at their original hash. |
| Hosted CI, minimum-app native acceptance | NOT RUN; no platform floor changed. |

The width suite removes `stretch` declarations in one paired variant to simulate rejection. This demonstrates fallback geometry and modern equivalence, not behavior on an actual older engine. The initial sandboxed browser launch failed before testing; the permitted headless retry passed. Earlier failures and evidence remain retained locally. Optional QA-font metadata decoding was not rerun because FontTools was unavailable; production font hashes and embedded notices were checked by the normal build/public gate.

## Historical rendering record — preceding CSS

Automated validation for **0.4.5** passed on 2026-09-21, with the retained lint warnings described below. Physical iPhone acceptance of that historical build was incomplete and is not acceptance of the current maintenance CSS. Before this patch, the user reported no flicker with Default fonts but encountered intermittent note overflow near a long equation. That report prompted this repair; it is not acceptance of the changed CSS.

The tested CSS SHA-256 is `3bc4db727324037065871d2922bca5a1b3211ad0cea17d837a01b3ab71bb8e49`. Those historical results bind their CSS, test scripts, runtime identity, fixtures, and screenshots. Historical control comparisons intentionally use their recorded baseline hashes.

Documentation and release-tooling checks were refreshed on **2026-09-22** for author review. CSS, fonts, fixtures and runtime harnesses are unchanged, so the recorded rendering matrix is reused after hash verification rather than described as a new device run.

## Historical executed checks

| Check | Result |
| --- | --- |
| Clean public build | Offline locked install, build, and CI-equivalent static checks passed; generated files matched byte for byte. |
| Official Obsidian lint | Zero errors across all five source modules and compiled CSS. Four refinement modules have zero warnings. |
| Core regression | 36 CSS, 36 rendered-surface, 54 layout, 12 focus, 4 native table-editing, 8 historical font, and 54 accessibility cases passed, with the supplementary comparison/font/scroll records. |
| Bundled font | 18 actual-app cases; all eight real custom faces; natural startup; 108 settled scroll observations; three renderer reloads; explicit font override. No network font requests or repeated font/style writes during the monitored settled scrolls. |
| WebKit font | Four standalone WebKit cases passed. |
| Controls | Four desktop cases verified focus indicators and a painted native caret, plus four mobile-emulated settings cases. |
| Phone settings | 20 actual-app emulated cases at 320, 375, 390, 430, and 932 px, both tones and two interface fonts; eight serialized-DOM WebKit cases; Manage opened in both tones. |
| Pane centering | 216 combinations at 900, 1440, and 2560 px, both tones, three document modes, both split directions, and all sidebar combinations. |
| Wide content | 178 actual-app cases for tables, images, Bases, code, Mermaid, math, Canvas and note embeds, plus 32 serialized-DOM WebKit cases. |
| Display-math lifecycle | 32 actual-app before/after cases, 320 observed scroll-away/return cycles and remounts, and 11,860 animation-frame samples. Reading View phone controls showed 91/73 px overflow before and zero after; Live Preview and fitting desktop equations remained contained. |
| Math in Chromium/WebKit | 32 standalone cases using the real bundled MathJax and local glyph assets. Phone note overflow fell from 16–50 px to zero. Formula size and prose geometry stayed unchanged; both math ends and table columns remained reachable. |
| Long helper notes | Eight cases, 48 scroll positions and 96 settled samples using 100-section notes with edge-to-edge helpers. |
| Embedded helper notes | Eight additional desktop/phone-emulated cases kept a helper-class child note within its parent. |
| Dataview | 32 declarative-query cases for ordinary, wide, max, and card tables; test plugin disabled afterward. |
| Core interface | Four desktop/phone-emulated cases: palette, switcher, search, file explorer, properties, and themeable menus; desktop tooltip and hover preview. |
| Normalization | 24 matched captures and 12 comparisons, with long-word table checks in Chromium and WebKit. |
| App restart | Full isolated-app quit and relaunch restored the saved theme, Default text font, reading note, and real bundled glyphs without reselecting the theme. |
| Publication files | Metadata, local links, embedded assets, notices, and public inventory passed. README images are captures of synthetic notes with that historical CSS. |

## Runtime boundary

Actual-app testing used **Obsidian 1.13.7**, **Electron 39.8.3**, and **Chromium 142.0.7444.265** on macOS in a disposable app/profile/vault. Snippets were absent; the optional Dataview integration was tested separately. The official 0.5.70 Dataview download declares 0.5.68 in its manifest; the pinned evidence preserves both values.

Phone/tablet emulation runs the desktop application at the stated geometry. Standalone WebKit uses captured app DOM and CSS. Neither is a physical iOS compositor test. The focused math regression records every animation frame during its scripted scroll cycles; other automated checks sample settled frames. These checks establish the observed behavior; they do not certify the absence of every possible transient flicker.

Declared minimum app support remains 1.13.4. That minimum, native Windows/Linux, physical iPad/Android, operating-system menus, native drag/drop, and screen-reader behavior were not runtime verified. These checks are scoped regression evidence, not a whole-app accessibility certification. Other plugins and personal CSS snippets are outside the matrix.

Raw Markdown tables in Source Mode retain Obsidian's native horizontal scrolling; the final column was reachable. At 900 px with two vertical panes and both sidebars open, the remaining document area is necessarily very narrow. The columns remain centered; closing a sidebar provides more reading room.

## Retained warnings

The compiled output has **222 warnings**: 179 `declaration-no-important`, 39 `selector-pseudo-class-disallowed-list` (`:has`), and four `plugin/no-unsupported-browser-features` diagnostics. The base reports the same warnings; they are not 444 distinct issues. Of the 179 important declarations, 177 are inherited and two are Reading Lab heading-tracking overrides. All 39 `:has` occurrences are inherited. Hanging punctuation is a Reading Lab addition; browser-feature warnings are not all upstream-owned. Browser warnings concern `display: contents`, hanging punctuation, and text decoration. No runtime defect was established from those warnings in the tested cases. A separate source review identified an inherited invalid macOS tab-padding calculation and deferred cascade cleanup; see [maintenance findings](MAINTENANCE-REVIEW.md). These are not concealed by the zero-lint-error result.

Scoped exceptions preserve app/plugin-owned names (including MathJax’s custom element), required WebKit properties, and the inherited cascade. They are documented in `stylelint.config.mjs`; the official rules remain part of the resolved configuration. No warnings were silently promoted to a clean-lint claim.

## Historical installation and current release status

The preceding 0.4.5 private candidate is installed in the synced test vault for physical iPhone review, with 0.4.4 retained for rollback. The original note and saved preferences were not changed. Stable packaging remains gated on acceptance of this exact CSS, with device and app/OS versions recorded. See [development](DEVELOPMENT.md) for reproducible commands and the distinction between a private candidate and a release package.

Current maintenance packaging is blocked on fresh actual-app evidence and captures for the new hash; physical iPhone acceptance also remains incomplete. The older acceptance record and screenshots have not been rewritten. A package gate is technical evidence only, separate from the owner’s repository/name decisions and public author approval for Community submission.
