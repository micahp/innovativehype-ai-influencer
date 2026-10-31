# Prototype v2 review

Reviewed the pushed `main` baseline at `700c8fea849b9fc88a631659a9d095887a1445b3`. The repository's `research/curated-influencer-references-2026-10-31` branch was then merged locally and integrated as a review queue.

## Findings and fixes

| Finding in the pushed baseline | Change in v2 |
| --- | --- |
| The seed created 40 content briefs without an owner-selected direction ID. | Seeding now creates no production briefs. The annual themes remain; six explicit assignment proposals must be reviewed first. |
| The generation endpoint accepted any brief and an arbitrary reference URL with a client-supplied rights flag. | Generation now requires a current owner-approved assignment, an owner-approved face and body reference for the same persona version, one explicitly selected reference, and an explicit per-request spend confirmation. The worker repeats the checks immediately before provider use. |
| Manual post and trend submissions could flow directly into new briefs without an assignment review. | These submissions remain proposals. New briefs can use only the exact source IDs and evidence snapshot locked to an approved assignment. |
| The identity profile had no upload, review, or version-specific provenance path. | The Direction review page supports private face/body uploads, rights notes, SHA-256 provenance, separate reviewer decisions, and encrypted file storage. |
| Publication paths did not check a creative assignment. | Approval, scheduling, export, manual publishing, and automatic dispatch now require the assignment to remain approved and source-integrity checks to pass. |

## Review surface

- The six original SVG boards are served only to an authenticated admin and are labeled as composition illustrations, never face/body references.
- Creator profiles, direct video examples, index-only post descriptions, and external photo source pages are displayed with their source quality. Index pages are not presented as individual posts or performance evidence. No engagement metrics are seeded.
- The external photo files are link-only; none of their image bytes are stored or used as character canon. I spot-checked the linked Commons CC0 claims for [Setup image.jpg](https://commons.wikimedia.org/wiki/File:Setup_image.jpg), [Gaming pc.jpg](https://commons.wikimedia.org/wiki/File:Gaming_pc.jpg), and [Strength training (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Strength_training_(Unsplash).jpg). The last page identifies its CC0 claim as a pre-June 2017 Unsplash image. This is a spot check, not blanket approval of every source in the pack.
- I confirmed the supplied direct YouTube pages for the Whitney Simmons workout, Natacha Océane weekly workout, and NikkieTutorials makeup example resolve to the named videos. The Instagram examples marked `index_only` remain directory/index references, not direct post URLs.

## Remaining limits

- All six creative assignments start pending. No assignment was selected or approved during implementation.
- No original face or body reference images were supplied. No image generation was run, and no provider spend occurred.
- Identity image bytes are encrypted with AES-256-GCM at rest in the local storage volume. Back up the volume and `IDENTITY_ASSET_ENCRYPTION_KEY` together; losing the key makes the stored files unrecoverable.
- Fine Photo Gen's existing session-cookie integration still lacks a scoped service API and provider-side spending limit. Every generation request requires an admin confirmation, but operational budget enforcement is not implemented.
- The operational research database still contains no newly imported creator/post records from this pack. The v2 page is an assignment review surface; it does not claim the original 50-post-per-creator target is met.
- No PostgreSQL/Redis-backed deployment, Docker runtime, Fine Photo Gen request, or live social publishing was available to exercise in this workspace.

## Validation

See the v2 entry in [implementation-log.md](implementation-log.md) for the validation commands and results.
