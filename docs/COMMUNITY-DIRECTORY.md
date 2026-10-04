# Community directory

Policy checked 2026-10-04. Recheck before submission. Project status: [UPSTREAM.md](../UPSTREAM.md#status).

## Derivative rule

Obsidian's [developer policies](https://docs.obsidian.md/community-directory/developer-policies) require explicit, publicly verifiable written approval for the normal fork route, with the original author credited as a contributor. The alternative requires proof the author is unreachable and at least six months without updates, followed by contact and a 30-day opportunity to respond publicly. The pinned Cupertino revision is dated 2026-07-31, so that six-month condition is not met as of this check.

MIT licensing and directory admission are separate.

## Packaging

The [submission guide](https://docs.obsidian.md/themes/app-themes/submit-theme) wants a root README, license, screenshot, and manifest; a GitHub repository; and a release whose plain `x.y.z` tag matches the manifest. Attach `theme.css` and `manifest.json` individually. A ZIP alone is not enough. The directory reads the default-branch manifest.

[Manifest requirements](https://docs.obsidian.md/Reference/Manifest): name, author, version, minimum app version. The current name uses permitted characters. Uniqueness still needs a check. Theme names are fixed after submission.

`versions.json` holds compatibility history. Publication details are in the [status record](../UPSTREAM.md#status).

The guide recommends a 512×288 thumbnail. The 1280×720 previews are for review. [Listing management](https://docs.obsidian.md/community-directory/manage-entry) covers gallery sizes and **Add contributor**, which credits someone without transferring ownership.

## Before submission

1. Published source, with attribution and the known test limits.
2. A public URL to Alexis's written approval, and contributor credit kept.
3. Provenance questions, physical iPhone acceptance, and support boundaries closed. Current screenshots. Release tag and assets match.
4. Recheck the docs, then use the current [set-up and claim flow](https://docs.obsidian.md/community-directory/set-up-and-claim).

The documented route is the Community directory portal, not a registry pull request.
