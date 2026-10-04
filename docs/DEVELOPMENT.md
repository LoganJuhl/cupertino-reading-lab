# Build and test

`CURRENT.json` selects the maintained source. The build reads five CSS modules, checks the static font hashes, embeds font data and notices, and writes an installer folder. `npm run build` also copies CSS, manifest, `versions.json`, and `LICENSE` to the repo root.

`updates/0.4.5/` holds the current source. `baseline/`, `stages/`, and `updates/0.4.1/` are historical regression inputs.

## Build

Python 3.11+ and Node 22+. CI uses Python 3.12 and Node 24.

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

`check:build` rebuilds in a temporary directory and compares the four installer files. Lint covers every current CSS module and the compiled file. `check:public` checks root outputs, metadata, local links, embedded assets, notices, and the Git-visible inventory. Lint must have zero errors; warnings stay visible. `test:maintenance` covers compatibility history, stale screenshot evidence, public-gate rejection, custom evidence paths, and notice removal.

Project MIT text lives in `licenses/Reading-Lab-MIT.txt`. Root `LICENSE` is a generated composite.

The four small modules keep strict stylelint rules. Exceptions for the inherited cascade, app-owned selectors, animation names, and WebKit properties are in `stylelint.config.mjs`. The browser target is the tested Electron 39 shell, not a native iOS floor. Git keeps trailing spaces only in identified inherited CSS, control fixtures, and license text.

## Obsidian runtime

The macOS harness expects Obsidian 1.13.7 and Electron 39.8.3. It copies a local app install and creates a synthetic vault. App files and captures stay in ignored directories.

```sh
python3 scripts/prepare-qa.py --installed-app "$OBSIDIAN_APP" --update-asar "$OBSIDIAN_ASAR" --work work/qa
```

Launch only the copied executable the script prints, with its localhost debugging arguments. Set `QA_WORK` to the printed work directory and `QA_CDP` to its endpoint. The guards reject personal vaults, missing markers, a mismatched theme, and an unexpected app version.

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

Run app suites one at a time. They share the disposable renderer. `QA_EVIDENCE` selects the core evidence directory; packaging reads that same location. Actual-app, standalone-browser, emulated-device, and physical-device results are separate. Changed CSS needs fresh evidence. Historical controls use separate QA font faces. The shipped-font suite loads only the embedded faces.

The math suite records animation frames while opening a long synthetic note and scrolling past its equation ten times. It compares current CSS with the same CSS minus the repair rule. Both formula ends must stay reachable. The Chromium/WebKit companion serves bundled MathJax from the local ASAR, with no network.

The expanded suite enables navigation, Bases, and Canvas only in the synthetic vault, and accepts the Mermaid trust prompt only for those fixtures. The UI suite selects themeable app menus, then restores the native-menu setting. OS menus are out of scope. The WebKit helper suite uses serialized app DOM. It is not a phone run.

Dataview is optional in day-to-day work and required by the current packaging gate. Download `main.js`, `manifest.json`, and `styles.css` from [Dataview 0.5.70](https://github.com/blacksmithgu/obsidian-dataview/releases/tag/0.5.70) into an ignored directory, set `QA_DATAVIEW`, and run `node updates/0.4.5/check-dataview.cjs`. The script checks the three pinned hashes, runs declarative DQL only, and disables the plugin. The 0.5.70 asset declares 0.5.68 in its manifest; evidence records both.

## Fonts

Normal builds need no font tools. To regenerate: `fonttools[woff]==4.60.2`, `brotli==1.2.0`, then `python3 updates/0.4.5/build-fonts.py`. Checked-in originals, licenses, provenance, and eight output hashes are the reproduction set. No subsetting. No runtime variation axes.

## Package

`npm run package:candidate` writes a private device-test installer after checking the build, app-test results, and screenshots. `npm run package:release` also requires a passing physical-device test record for this CSS, with device, app, and OS versions.

The release tag must match the manifest version, with no `v` prefix. Attach generated `theme.css`, `manifest.json`, `LICENSE`, the installer ZIP, and checksums.

Packaging checks both root previews against the CSS, capture script, and runtime identity in the local publication record. Static CI can run from a clean checkout. Packaging needs local runtime evidence.

The published 0.4.5 ZIPs were prepared outside these two scripts. The missing test results and captures are listed in [validation](VALIDATION.md#packaging).

## Width-fallback regression

Synthetic drawer and banner DOM, plus the locally extracted Obsidian stylesheet. Headless Chromium and WebKit, network blocked, both tones, 320/390/932 px. One variant drops the three fallbacks. One drops `stretch` to simulate rejection. The rejection variant is not an older engine and not a device.

```sh
QA_APP_CSS=work/qa/app/app.css node scripts/check-width-fallbacks.cjs
```

The local stylesheet and browser runtimes are not in the repo, so this check is outside static CI. If `python3` is an Xcode stub, call the documented scripts with a real Python 3.11+ binary.
