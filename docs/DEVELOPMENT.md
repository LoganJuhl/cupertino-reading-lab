# Build and test

`CURRENT.json` selects the maintained source. The release build reads five authored CSS modules, verifies the checked-in static font hashes, embeds their data and notices, and produces an installer folder. `npm run build` also exports the current CSS, manifest, compatibility map, and license to the repository root.

The versioned source directory identifies the current review candidate. The root distribution is generated from it; no public release has been made. Earlier controls under `baseline`, `stages`, and `updates/0.4.1` are synthetic regression inputs. They are not active theme variants or alternative source locations.

## Reproducible build

Use Python 3.11 or later and Node 22 or later. CI uses Python 3.12 and Node 24.

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

`check:build` rebuilds in a temporary directory and compares all four installer files. Official Obsidian lint covers every current CSS module and compiled output. `check:public` verifies root outputs, metadata, JSON, local links, embedded assets, required notices, and the Git-visible inventory. Warnings remain visible; the lint gate requires zero errors. Five offline maintenance regressions check compatibility history, stale screenshot evidence, public-gate rejection, custom evidence paths and notice/attribution removal. Complete upstream/font notice text and the required attribution paragraph are checked, not just license keywords.

The maintained project MIT notice is `licenses/Reading-Lab-MIT.txt`; the current build no longer takes its license from a historical test fixture. Root LICENSE remains a generated composite of project and third-party notices.

The four small refinement modules retain strict rules. Scoped exceptions for inherited cascade, externally owned selectors, animation names, and WebKit properties are documented in the configuration. The browser target matches the tested Electron 39 shell; this does not establish native iOS compatibility. Git preserves trailing spaces only in the identified inherited CSS, control fixtures, and license text; new modules and documentation retain ordinary whitespace checks.

## Actual Obsidian runtime

The macOS harness expects Obsidian 1.13.7 and Electron 39.8.3. It makes a disposable copy of a locally installed app and a new synthetic vault. Proprietary app files and runtime captures stay in ignored directories; they are never published. Supply the app and update-ASAR locations explicitly through the two shell variables below.

```sh
python3 scripts/prepare-qa.py --installed-app "$OBSIDIAN_APP" --update-asar "$OBSIDIAN_ASAR" --work work/qa
```

Launch only the copied executable printed by the script, with its printed localhost debugging arguments. Then set `QA_WORK` to the printed work directory and `QA_CDP` to its localhost endpoint. The guards reject personal vaults, missing markers, mismatched themes, and unexpected app versions. Do not use a personal app's debugging endpoint.

```sh
npx playwright install chromium webkit
node scripts/capture-runtime-css.cjs
python3 scripts/run-suite.py css surfaces layout focus interactions newsreader accessibility evidence
node updates/0.4.5/check-normalization.cjs
node updates/0.4.5/check-font.cjs
node updates/0.4.5/check-webkit-font.cjs
node updates/0.4.5/check-controls.cjs
node updates/0.4.5/check-settings.cjs
node updates/0.4.5/check-panes.cjs
node updates/0.4.5/check-wide.cjs
node updates/0.4.5/check-wide-webkit.cjs
node updates/0.4.5/check-wide-scroll.cjs
node updates/0.4.5/check-math-scroll.cjs
node updates/0.4.5/check-math-webkit.cjs
node updates/0.4.5/check-ui.cjs
```

Run app suites sequentially: they share the disposable renderer. Raw evidence, screenshots, commands, and failures stay local. `QA_EVIDENCE` selects the core evidence and runner-log directory; packaging uses that same core location. Actual-app, standalone-browser, emulated-device, and physical-device observations are distinct. Changed CSS or harness inputs require fresh relevant evidence. Historical controls intentionally use separate QA font faces; the shipped-font suite loads only the embedded production faces.

The math suite records every animation frame while opening a long synthetic note and scrolling away from and back to its equation ten times. It compares the current CSS with the same CSS minus only the repair rule. Math readiness requires glyphs, applied layout styles, and loaded fonts; both formula ends must remain reachable. The companion Chromium/WebKit suite uses bundled MathJax assets served from the explicit local ASAR without network access.

The expanded suite enables built-in navigation, Bases, and Canvas only inside the synthetic vault. The Mermaid trust prompt is accepted only for these generated fixtures. The UI suite temporarily selects themeable app menus, then restores the native-menu setting; operating-system menus are outside CSS testing. The WebKit helper suite uses serialized synthetic app DOM and does not represent a physical phone run.

Dataview testing runs separately. It is optional during ordinary development but required by the current candidate/release packaging gate. Download `main.js`, `manifest.json`, and `styles.css` from the official [0.5.70 release](https://github.com/blacksmithgu/obsidian-dataview/releases/tag/0.5.70) into an ignored directory, then set `QA_DATAVIEW` to it and run `node updates/0.4.5/check-dataview.cjs`. The script verifies all three pinned hashes, tests only declarative DQL, and disables the plugin afterward. Upstream's 0.5.70 asset declares version 0.5.68 in its manifest; the evidence records both values without altering the plugin.

## Fonts

Normal builds need no font tooling. Optional regeneration uses `fonttools[woff]==4.60.2` and `brotli==1.2.0`, then `python3 updates/0.4.5/build-fonts.py`. The checked-in original files, licenses, provenance, and eight output hashes allow exact reproduction. No glyph subsetting or runtime variation axes are used.

## Package and release

`npm run package:candidate` creates a private device-test installer after the automated evidence gates. `npm run package:release` additionally requires a current physical acceptance record, including the device and app/OS versions. Do not relabel an old device observation as a fresh test of changed rendering CSS.

The current sequence prepares GitHub source first, resolves repository/name decisions, publishes when those decisions permit, and then revises Community-permission outreach. A naming discussion with Alexis may precede a rename. The [author-review checklist](AUTHOR-REVIEW-READINESS.md) and [directory policy record](COMMUNITY-DIRECTORY.md) separate outreach, source hosting and eventual submission. Publishing needs owner approval; directory submission additionally needs the public author approval described there.

Publish only after reviewing the actual Git file list and final tests. The release tag must exactly match the manifest version, with no `v` prefix. Attach the generated `theme.css`, `manifest.json`, installer ZIP, and checksums. Publishing to GitHub does not submit the theme to the Community Theme directory.

Packaging also runs the public-file gate and validates both root previews against the CSS, capture script and runtime identity in the local publication record. A clean source checkout can run static CI checks; packaging intentionally requires separately generated local runtime evidence.

A successful package gate reports a private candidate or a technical release package. It is technical evidence, not author permission, trademark clearance or Community-directory approval. Resolve the separate checklist items before broader distribution.

## Focused width-fallback regression

The maintenance check uses synthetic drawer/banner DOM and the locally extracted Obsidian stylesheet. It launches headless Chromium and WebKit, blocks network requests, tests both tones at 320/390/932 px, compares modern rendering with and without the three fallbacks, and removes `stretch` declarations to simulate rejection. That last variant is not an older-engine or physical-device test. Raw results include input hashes and must use a new output folder so prior attempts remain intact.

```sh
QA_APP_CSS=work/qa/app/app.css node scripts/check-width-fallbacks.cjs
```

This check is separate from static CI because the local Obsidian stylesheet and browser runtimes are not distributed. On hosts where `python3` is a system developer-tools stub, invoke the documented Python scripts with the installed Python 3.11+ executable; accepting an Xcode license is not part of theme validation.
