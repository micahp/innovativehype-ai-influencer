# AI Influencer Studio

A self-hosted studio for versioned fictional creator identities, source-linked research, editorial planning, media generation, human approvals, scheduling, and measured performance.

The full product brief is in [the implementation prompt](docs/ai-influencer-studio-implementation-prompt.md). Current implementation evidence and blockers are in the [implementation log](docs/implementation-log.md).

## Local deployment

Requirements: Node.js 22+, PostgreSQL 16+, Redis 7+.

1. Copy `.env.example` to `.env` and set a strong `STUDIO_ADMIN_PASSWORD`, a random `SESSION_SECRET` of at least 32 characters, and a base64 AES key for `SOCIAL_TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
2. Set `DATABASE_URL` and `REDIS_URL` for PostgreSQL and Redis.
3. Install and generate the Prisma client:

   ```sh
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. Start the dashboard and worker in separate terminals:

   ```sh
   npm run dev
   npm run worker
   ```

5. Open `http://localhost:3000` and sign in with the configured admin password.

The Compose deployment starts PostgreSQL, Redis, the dashboard, and the independent worker. Copy `.env.example` to `.env`, set `POSTGRES_PASSWORD`, `STUDIO_ADMIN_PASSWORD`, and `SESSION_SECRET`, then run `docker compose up --build`.

Social accounts are configured per creator in **System settings**. Tokens are stored encrypted with `SOCIAL_TOKEN_ENCRYPTION_KEY`, never returned to the browser, and need to be re-entered to rotate. Publishing remains paused and `LIVE_PUBLISHING_ENABLED=false` by default. Read [platform publishing activation](docs/platform-publishing.md) before enabling it. Serve the dashboard over HTTPS before entering production credentials.

Fine Photo Gen remains an external provider. Its discovered integration, request/response shape, limitations, and activation requirements are in [fine-photo-gen-integration.md](docs/fine-photo-gen-integration.md). Do not set `MEDIA_PROVIDER=mock` outside workflow verification; mock candidates are labeled and are not images.

## Current operating limits

- The image and text publishing adapters are implemented, but no live post has been sent. Publishing requires credentials, account permissions, approval, a due schedule, an unpaused control, and the explicit server flag. Adapter contracts have mocked tests.
- Research ingestion is manual; creator profiles, individual posts, and trend opportunities retain source URLs and provenance. Trend evidence is kept separate from the original content proposal and human confidence estimate. The research page supports text, platform, and creator filters. The app does not scrape creator sites or invent public metrics.
- The seeded calendar is an evergreen editorial plan. It contains no asserted trend findings or performance outcomes.
- AI identity packs have no approved canonical image references yet.
