# Validation

## Released CSS — width checks from 2026-10-02

Distributed CSS SHA-256: `8b23a22cfe4e34443ed6a9e61c58ff6b3b47f2d6c7a80c9bd52199e7fc867ff9`.

Production diff is three restored `width: -webkit-fill-available` declarations. Version 0.4.5 and minimum 1.13.4 are unchanged.

| Check | Result |
| --- | --- |
| Offline build and temporary rebuild | Pass. Four installer files match. Root outputs match inputs. |
| Public inventory, links, assets, notices | Pass. |
| Maintenance tests | Pass. Five tests, including stale-capture and notice-removal rejection. |
| Width regression | Pass. 48 cases, 192 renderings. Chromium 151.0.7922.34 and Playwright WebKit 26.5. Both tones. 320/390/932 px. Collapsed and expanded drawer. Small and large banners. |
| Lint | Zero errors. 225 warnings in base and compiled CSS, the same 225 issues. Four refinement modules are clean. Three warnings are `declaration-block-no-duplicate-properties` on the two-value width fallback. |
| Stale publication guard | Pass. Previous captures rejected: “Publication capture used different CSS.” |
| macOS tab padding | Repair changes synthetic geometry. Native layout unverified. Production expression unchanged. |
| Full actual-app matrix, fresh captures, older WebKit, physical devices | Incomplete for this hash. Supplemental macOS checks are recorded below. |
| Hosted CI | [Passed for published commit 0717348](https://github.com/LoganJuhl/cupertino-reading-lab/actions/runs/37156955844): build, static checks, and five maintenance tests. |
| Obsidian 1.13.4 | Not runtime-tested. |

The width suite drops `stretch` in one variant to simulate rejection. Both installed engines accept `stretch`, so that variant is not an older-WebKit result. At 390 px WebKit light, the search field was 358 px with the fallback and 390 px without; the expanded selector 358 px versus about 66.7 px; the small banner 374 px versus 240 px.

## Opening and settled-layout checks — publication follow-up

The [0.4.5 release record](https://github.com/LoganJuhl/cupertino-reading-lab/releases/tag/0.4.5) retains the original animated-opening result: **FAIL, 1.00396728515625 px against the 1 px limit**. Separate supplemental macOS checks measured zero drift across 96 settled frames in eight windows and caught a 2 px control. The settled-frame result does not resolve the opening failure.

Logan reported no scrolling or mobile-spacing issues in personal use. Device model, OS/app versions, and test coverage were not recorded, so physical-device acceptance remains incomplete.

## Preceding CSS — 2026-09-21

SHA-256 `3bc4db727324037065871d2922bca5a1b3211ad0cea17d837a01b3ab71bb8e49`. These results bind that CSS, the scripts, the runtime, the fixtures, and the screenshots. Documentation checks were refreshed on 2026-09-22 without a new device run.

An earlier report of intermittent overflow beside a long equation prompted the math scroller. The user reported no flicker with Default fonts at that time.

| Check | Result |
| --- | --- |
| Public build | Locked install, build, and static checks. Generated files matched. |
| Lint | Zero errors on five source modules and compiled CSS. |
| Core regression | 36 CSS, 36 surface, 54 layout, 12 focus, 4 table-editing, 8 historical font, 54 accessibility. |
| Bundled font | 18 actual-app cases, eight faces, 108 settled scroll observations, three renderer reloads, explicit font override. No network font requests during monitored scrolls. |
| WebKit font | Four standalone cases. |
| Controls | Four desktop focus and caret cases. Four emulated mobile settings cases. |
| Phone settings | 20 emulated actual-app cases at 320, 375, 390, 430, 932 px, both tones, two interface fonts. Eight serialized-DOM WebKit cases. Manage opened in both tones. |
| Pane centering | 216 combinations at 900, 1440, 2560 px. Both tones, three modes, both split directions, all sidebar combinations. |
| Wide content | 178 actual-app cases. 32 serialized-DOM WebKit cases. |
| Display-math lifecycle | 32 actual-app before/after cases, 320 scroll-away/return cycles, 11,860 animation-frame samples. Reading View phone controls: 91/73 px overflow before, zero after. |
| Math in Chromium and WebKit | 32 standalone cases with bundled MathJax. Phone note overflow from 16–50 px to zero. Prose geometry unchanged. |
| Long helper notes | Eight cases, 48 scroll positions, 96 settled samples. |
| Embedded helper notes | Eight desktop and phone-emulated cases. |
| Dataview | 32 declarative-query cases. Plugin disabled afterward. |
| Core interface | Four desktop and phone-emulated cases: palette, switcher, search, explorer, properties, themeable menus, tooltip, hover preview. |
| Normalization | 24 matched captures, 12 comparisons. |
| App restart | Isolated quit and relaunch restored theme, Default text font, note, and bundled glyphs. |

## Boundary

Actual-app runs used Obsidian 1.13.7, Electron 39.8.3, Chromium 142.0.7444.265, macOS, disposable app and vault. Snippets off. Dataview tested separately. The 0.5.70 download declares 0.5.68 in its manifest.

Phone and tablet emulation is the desktop app at a set geometry. Standalone WebKit uses captured DOM and CSS. Neither is a physical iOS compositor. The math regression records every animation frame in its scripted cycles. Other checks sample settled frames.

Not runtime-verified: Obsidian 1.13.4, native Windows and Linux, physical iPhone, iPad and Android, OS menus, native drag and drop, screen readers. Other plugins and personal snippets are outside the matrix.

Source Mode raw tables keep Obsidian's native horizontal scroll; the last column was reachable. At 900 px with two vertical panes and both sidebars open, the document column is narrow by geometry.

## Lint warnings on the preceding build

Compiled output: 222 warnings. 179 `declaration-no-important`, 39 `selector-pseudo-class-disallowed-list` for `:has`, four `plugin/no-unsupported-browser-features`. Base reports the same warnings. Of the 179 important declarations, 177 are inherited and two are Reading Lab heading-tracking overrides. All 39 `:has` uses are inherited. Hanging punctuation is a Reading Lab addition. Browser warnings cover `display: contents`, hanging punctuation, and text decoration. No tested case failed because of them.

The October build adds three duplicate-property warnings for the width fallback, bringing the shared count to 225. Exceptions for app-owned names, WebKit properties, and the inherited cascade are in `stylelint.config.mjs`.

## Packaging

The published prerelease uses separately prepared owner-test packages. The normal candidate and stable package checks have not passed for this CSS: fresh actual-app evidence and captures are still required, and stable packaging also needs physical-device acceptance. Commands are in [DEVELOPMENT.md](DEVELOPMENT.md#package); publication status is in [UPSTREAM.md](../UPSTREAM.md#status).
