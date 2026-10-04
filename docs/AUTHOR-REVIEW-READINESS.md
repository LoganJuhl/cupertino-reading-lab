# Release checklist

Remaining work after the 0.4.5 prerelease. Publication and approval status: [UPSTREAM.md](../UPSTREAM.md#status).

## Done

- Root distribution is generated from the source selected by `CURRENT.json`.
- Three WebKit width fallbacks restored. 48 headless cases / 192 renderings passed. Both test engines accept `stretch`; rejection is simulated.
- Fresh build, temporary rebuild, public inventory, notices, and five maintenance tests passed. Lint: zero errors, 225 warnings. See [VALIDATION.md](VALIDATION.md).
- Cupertino copyright `2025 aaaaalexis`, MIT text, and Minimal, Lucide/Feather, and Newsreader notices are intact. Public links use `svnaxis`.
- 57 inherited SVG uses / 55 payloads still match the pinned Cupertino sheet.

## Open

- Invalid macOS tab padding. Repair moved a synthetic tab 80 px left. Needs a real nonfullscreen titlebar, both top-corner classes, container at least 560 px, before any edit.
- 43 overridden declarations and stale comments in the Reading Lab tail. Behavior-preserving cleanup, not a release blocker.
- Fresh actual-app evidence and captures for CSS `8b23a22c…`. Older passes stay on `3bc4db72…`.
- Physical iPhone: record CSS hash, model, iOS, Obsidian version, tone, and mode. Check equations, tables, scroll-away/return, rotation, and background/resume with Default text font.
- Obsidian 1.13.4, Windows, and Linux.
- QA-font acquisition URL, remaining SVG provenance, and the `Cupertino Newsreader` family name. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Listing-name uniqueness before Community submission. Any proposed rename needs a discussion with Alexis.

## Next steps

For a stable release, complete the runtime checks, refresh the screenshots, record physical-device acceptance, and pass the [package checks](DEVELOPMENT.md#package).

Before Community submission, review the [draft to Alexis](CUPERTINO-AUTHOR-OUTREACH.md), obtain his publicly verifiable written approval, keep his contributor credit, resolve the provenance questions, and check the listing name. See [COMMUNITY-DIRECTORY.md](COMMUNITY-DIRECTORY.md).
