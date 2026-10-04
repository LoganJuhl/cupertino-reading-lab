# Release checklist

Work left after the 0.4.5 prerelease. Status: [UPSTREAM.md](../UPSTREAM.md#status).

## Done

- Prerelease published for manual install, with root files generated from the source selected by `CURRENT.json`.
- Build, width regression, public inventory, notices, and five maintenance tests passed. Lint: zero errors, 225 warnings. Details and [CI results](https://github.com/LoganJuhl/cupertino-reading-lab/actions/runs/37156955844) are recorded in [VALIDATION.md](VALIDATION.md).
- Cupertino copyright `2025 aaaaalexis`, MIT text, and Minimal, Lucide/Feather, and Newsreader notices are intact. Public links use `svnaxis`.
- 57 inherited SVG uses / 55 payloads still match the pinned Cupertino sheet.

## Open

- Invalid macOS tab padding. A proposed repair moved a synthetic tab 80 px left. Measure a real nonfullscreen titlebar, both top-corner classes, container at least 560 px, before editing.
- 43 overridden declarations and stale comments in the Reading Lab tail, including a reference to the missing `CONTRACTS.md` file. Cleanup is separate from release testing; see [maintenance findings](MAINTENANCE-REVIEW.md).
- Resolve the [opening-drift failure](VALIDATION.md#opening-drift--publication-follow-up), run the full app tests on the released CSS, and capture new screenshots.
- Physical iPhone: record CSS hash, model, iOS, Obsidian version, tone, and mode. Check equations, tables, scroll-away/return, rotation, and background/resume with Default text font.
- Obsidian 1.13.4, Windows, and Linux.
- QA-font acquisition URL, remaining SVG provenance, and the `Cupertino Newsreader` family name. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Listing-name uniqueness before Community submission. Any proposed rename needs a discussion with Alexis.

## Next

For a stable release, finish the app tests, refresh the screenshots, record physical-device acceptance, and pass the [package checks](DEVELOPMENT.md#package).

Before Community submission, review the [draft to Alexis](CUPERTINO-AUTHOR-OUTREACH.md) and complete the [directory checklist](COMMUNITY-DIRECTORY.md#before-submission).
