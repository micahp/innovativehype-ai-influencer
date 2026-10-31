# Implementation log

Updated: 2026-10-31

## Repository and feasibility audit

- The studio began as a documentation-only repository. No app code or local `AGENTS.md` instructions were present.
- Fine Photo Gen was found through the connected GitHub account as `micahp/finetuned-photo-gen`, public, inspected at commit `ca1eaf714c90a238a5d4e262ed3426a63503f803`.
- Fine Photo Gen is a Next.js app with PostgreSQL/Prisma storage. Its `/api/generate` and `/api/edit` routes are user-session endpoints, not service-to-service APIs.
- `/api/generate` accepts a text prompt, model ID, seed, supported aspect ratios, and an account-owned `userModelId`. `/api/edit` accepts one image URL/data URL and a prompt; it requires a premium Fine Photo Gen account.
- Fine Photo Gen does not accept a negative prompt or expose a separate durable job-status endpoint in the inspected source. The studio calls the existing routes and does not access its database.
- This workspace has no Docker executable or local PostgreSQL service. Docker/Compose and live database checks cannot run here.
- Current official API documentation was checked for Meta Instagram publishing and X post/media publishing. Source links and access limits are documented in `platform-publishing.md`.

## Implemented in this worktree

- Next.js/TypeScript dashboard, Prisma/PostgreSQL schema and initial migration, Redis/BullMQ worker, Compose deployment, and environment templates.
- Two versioned fictional adult creator profiles with different voices, visual descriptions, content pillars, AI disclosure, and pending canonical image references.
- Twelve-month annual strategies and 20 evergreen calendar briefs per creator. These are editorial concepts, not trend research or generated media.
- Signed HTTP-only admin sessions and AES-256-GCM encrypted per-creator social credentials. Credential entry and publishing controls are in the dashboard; the platform token is validated against the supplied account ID before it is stored.
- Manual reference-post ingestion with original URL, platform, provenance, optional observed metrics, and duplicate protection. Missing metrics remain null.
- Manual reference-creator profile records with platform-specific URL validation, normalized duplicate checks, optional observed follower/post metrics and timestamps, relevance notes, source provenance, and a searchable research dashboard filtered by text, platform, and studio persona.
- Manual, source-linked trend signal intake with observation timestamp, evidence notes, target audience, human confidence, expiry and recommended window, production effort, and a separate original content proposal. Trend-informed briefs retain the source signal relation and audit provenance.
- Deterministic original-brief creation with source traceability and explicit non-reuse of source images, captions, and real-person likenesses.
- Fine Photo Gen adapter for the inspected `/api/generate` and `/api/edit` contracts, a BullMQ generation worker, durable generation records, and clearly labeled mock outputs.
- Approval records, scheduled posts, idempotent request claims, dry-run and JSON export, emergency pause, failure states, and metrics import restricted to confirmed live posts.
- Instagram Graph adapter for single-image feed posts; X API v2 adapter for text and single-image posts. X requests verify the authenticated user ID and set `made_with_ai: true`.
- Independent worker polling for due posts in `automatic_preapproved` mode and a restricted `conditional_autopublish` mode (X text-only). Human approval is still required; default mode is human approval, live publishing is disabled by environment, and the emergency pause starts on.
- Uncertain external publish responses are locked for reconciliation and excluded from analytics to avoid duplicate posts or fabricated outcomes.
- Docker runner installs production dependencies only. Prisma and `tsx` remain runtime dependencies for the separate migration, seed, and worker services.

## Validation run

- `npm run test`: 30 tests passed across 9 files, including profile URL validation/canonicalization, public HTTPS source checks, persona separation, metrics, auth, encrypted tokens, provider contracts, and publishing guards/adapters.
- `npm run typecheck`: passed after trend intake, linked briefs, research profile, and library filter changes.
- `DATABASE_URL=... npx prisma validate`: passed with reference profile and trend-to-brief relations.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities reported.
- `npm run build`: production Next.js build passed for the dashboard, profile and post research, trend intake, and linked brief API routes.
- No database-backed integration, Docker build, live Fine Photo Gen generation, or live social publication was possible here.

## Not yet complete or externally blocked

- The two canonical image packs still need Fine Photo Gen credentials/model IDs, generated candidates, and human approval. Visual identity QA does not yet have a production vision-model evaluator.
- Fine Photo Gen currently uses a session-cookie bridge and user credits. A scoped service-token endpoint in Fine Photo Gen is needed for robust unattended operation.
- The research library starts empty. There are no verified reference records or permitted API/license credentials in this environment; no views, likes, trends, or performance rankings have been fabricated. Profile, post, and trend submission now work, but acceptance's target of 50 posts per creator remains unmet.
- Automated trend connectors, broad influencer discovery, visual reference analysis, object storage, cost/budget enforcement, notifications, automatic backup execution, and weekly evidence-based strategy reports remain unfinished.
- Social token entry is credential provisioning rather than OAuth handshakes or refresh-token rotation. No Meta or X app/account credentials were available to activate or verify live publishing.
- Instagram support currently covers single-image feed posts. X support covers text and one image. Instagram carousel/Reels/Stories and X threads/video remain unsupported by these adapters.
- Authorized metrics are currently imported manually. Automatic Meta/X insights collection has not been activated.
- Worker scheduler code, migration, and Compose configuration have not been run against PostgreSQL/Redis or Docker in this workspace.

## Acceptance snapshot

| Requirement area | State | Evidence / remaining work |
| --- | --- | --- |
| Two persistent, distinct personas and annual plans | Implemented in source; DB seed/runtime not exercised | Versioned JSON, Prisma schema, seed, and calendar builder |
| Verifiable research library and 50 posts per persona | Not met | No authorized/labeled data source or user-submitted URLs are available |
| Research-to-brief-to-generation-to-approval workflow | Implemented with mock/provider adapter | Fine Photo Gen live credentials and reviewed canonical image packs required |
| Scheduling, dry-run, exports, guarded platform adapters | Implemented; mocked contracts pass | Live platform credentials, permissions, and account trial required |
| Continuous analytics from platform metrics | Partial | Manual observed metric import works; automatic API ingestion/reports remain |
| Independent deployment and scheduler | Configured; runtime unverified | PostgreSQL, Redis, and Docker unavailable in this workspace |
| Cost budgets, trend acquisition, vision QA, backups | Not met | Requires additional providers and implementation |

## Next implementation sequence

1. Run Compose with PostgreSQL and Redis in an environment with Docker, then exercise seed, manual profile/post/trend research, linked briefs, mock generation, review, schedule, and dry-run end to end.
2. Add permitted research connectors and collect source-linked examples; keep inaccessible fields explicitly missing.
3. Provision dedicated platform apps/accounts, validate access scopes, and conduct one controlled live post per platform while the emergency pause and human approval controls are understood.
4. Add scheduled platform insights collection, visual QA, cost budgets, notifications, backups, and evidence-linked weekly reports.
