# Source and author-review readiness

Updated **2026-10-02**, unreleased maintenance candidate **0.4.5**. The September review remains historical evidence. This checklist separates GitHub source preparation, later author-permission outreach, technical release validation and Community-directory admission.

## Current code and validation

- PASS — Maintained source is selected by `CURRENT.json`; the root distribution is generated from it. Cupertino's substantial inherited layer remains identified and credited.
- PASS — Three original WebKit width fallbacks restored; 48 matched headless cases / 192 renderings passed. Both installed engines accept `stretch`; rejecting it is simulated, not an older-device test.
- PASS — Fresh build, independent temporary rebuild, public inventory/assets/notices and five offline maintenance tests passed. Lint has zero errors and 225 retained warnings; see [validation](VALIDATION.md).
- DEFERRED — The missing `var()` in macOS tab padding remains unchanged: the proposed repair moved a synthetic tab 80px left, without establishing correct native centering. Exact native titlebar geometry still needs review.
- DEFERRED — The 43 overridden declarations and historical comments remain a separate behavior-preserving cleanup, not a release mandate.
- PENDING — Fresh actual-app evidence and captures for the changed CSS. Older core/math/plugin passes and screenshots remain bound to their original hash; the stale-capture guard correctly rejects them for current packaging.
- PENDING — Physical iPhone acceptance, minimum Obsidian 1.13.4 and untested native platforms. No support floor was changed. Hosted CI has not run.

## Notices, provenance and credit

- PASS — The requested appreciation paragraph remains prominent in README and preserved verbatim in the historical outreach packet.
- PASS — Cupertino's original `Copyright (c) 2025 aaaaalexis`, MIT terms and known Minimal, Lucide/Feather and production Newsreader notices remain intact. Canonical navigation links now use `svnaxis`; historic copyright was not renamed.
- PASS — All 57 inherited SVG uses / 55 unique payloads still match the pinned Cupertino source. This confirms inheritance, not their original authorship or separate underlying rights.
- UNRESOLVED — Historical QA-font acquisition URL/commit/recipe, remaining SVG provenance and derivative font branding. The five QA fonts remain source-only fixtures with their OFL; eight production faces retain pinned provenance and unchanged hashes. No permission or infringement finding is invented. See [notices](../THIRD_PARTY_NOTICES.md).

## Sequence and decisions

1. Finish the GitHub source candidate with its meaningful tests, original-author credit and candid limitations. Review the exact public file inventory; private reports, vaults, app files and old outer archives must remain excluded.
2. Resolve the owner's repository target and proposed public name. **Cupertino Reading Lab v4** remains the working/installed name. “Cupertino Long form Reader” is provisional; discuss naming with Alexis before a rename if requested. No name, repository or approval is assumed.
3. Publish the reviewed source when those owner decisions permit. Then revise the [historical outreach packet](CUPERTINO-AUTHOR-OUTREACH.md) around the verified source URL. No Community-permission message was newly drafted or sent during this maintenance work.
4. Before a technical release, obtain current runtime evidence, authentic captures and physical acceptance. Before Community submission, resolve provenance/support questions, record publicly verifiable written author approval and its scope, retain contributor credit, recheck current policy and verify listing-name uniqueness.

Source hosting does not itself clear a stable release or directory submission. The [directory record](COMMUNITY-DIRECTORY.md) distinguishes those steps. Suggested repository description remains: `A Cupertino-derived Obsidian theme focused on long-form reading and document consumption.` No remote settings have been applied.

## Remaining native checks

- Test the exact nonfullscreen macOS tab arrangement, with both top-corner classes and a container at least 560px wide, before changing padding.
- On the intended oldest iOS/WebKit target, inspect drawer search, collapsed/expanded drawer controls and banners; verify notches/safe areas and software keyboard behavior.
- On physical iPhone, record CSS hash, model, iOS and Obsidian versions, tone and mode; check equations/tables, scroll-away/return, rotation and background/resume with Default Text font.
- Refresh the [actual-app previews](SCREENSHOTS.md) and retained runtime matrix for the current CSS. No old device observation or image should be relabeled as a fresh pass.
