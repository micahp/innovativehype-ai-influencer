# AI Influencer Studio

A self-hosted studio for versioned fictional creator identities, source-linked research, editorial planning, media generation, human approvals, scheduling, and measured performance.

The full product brief is in [the implementation prompt](docs/ai-influencer-studio-implementation-prompt.md). Current implementation evidence and blockers are in the [implementation log](docs/implementation-log.md).

## Local deployment

Requirements: Node.js 22+, PostgreSQL 16+, Redis 7+.

### Lightweight preview

To view the dashboard concept without configuring PostgreSQL, Redis, social accounts, or Fine Photo Gen, run `npm run dev` and open [http://localhost:3000/demo](http://localhost:3000/demo). This read-only preview uses illustrative sample data; no metrics are real and no content is generated or published. The authenticated workspace at `/` still needs the services and configuration listed below.

1. Copy `.env.example` to `.env` and set a strong `STUDIO_ADMIN_PASSWORD`, a random `SESSION_SECRET` of at least 32 characters, a base64 AES key for `SOCIAL_TOKEN_ENCRYPTION_KEY`, and a separate base64 AES key for `IDENTITY_ASSET_ENCRYPTION_KEY` (`openssl rand -base64 32`). Keep both encryption keys outside source control and back them up securely; losing the identity key makes uploaded character references unreadable.
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

The Compose deployment starts PostgreSQL, Redis, the dashboard, and the independent worker. Copy `.env.example` to `.env`, set `POSTGRES_PASSWORD`, `STUDIO_ADMIN_PASSWORD`, `SESSION_SECRET`, and both encryption keys, then run `docker compose up --build`.

Social accounts are configured per creator in **System settings**. Tokens are stored encrypted with `SOCIAL_TOKEN_ENCRYPTION_KEY`, never returned to the browser, and need to be re-entered to rotate. Character face/body references are uploaded in **Direction review**, encrypted at rest with `IDENTITY_ASSET_ENCRYPTION_KEY`, and served only to the authenticated admin. The Docker deployment persists encrypted files in `./storage`; protect and back up this volume and its key together.

All six curated creative assignments begin in `pending_owner_review`. Review an assignment before making a brief. New briefs require that exact assignment ID. Generation additionally requires owner-approved face and body references for the brief's persona version, a selected approved reference image, Fine Photo Gen configuration, and per-request spend authorization. No content briefs are automatically created by the seed. Publishing remains paused and `LIVE_PUBLISHING_ENABLED=false` by default. Read [platform publishing activation](docs/platform-publishing.md) before enabling it. Serve the dashboard over HTTPS before entering production credentials.

Fine Photo Gen remains an external provider. Its discovered integration, request/response shape, limitations, and activation requirements are in [fine-photo-gen-integration.md](docs/fine-photo-gen-integration.md). Do not set `MEDIA_PROVIDER=mock` outside workflow verification; mock candidates are labeled and are not images.

## Current operating limits

- The image and text publishing adapters are implemented, but no live post has been sent. Publishing requires credentials, account permissions, approval, a due schedule, an unpaused control, and the explicit server flag. Adapter contracts have mocked tests.
- Research ingestion remains manual. New creator/profile/post/trend submissions are proposals; they are not automatically linked to a brief. The curated assignment review page keeps direct video URLs separate from index-only post descriptions and carries no reference engagement metrics.
- Annual themes are seeded, but production briefs are created only after an owner approves a direction. The direction queue starts with six proposals and no approved assignments.
- No canonical identity images are included. Upload original/authorized face and body references, review them, and then explicitly authorize each Fine Photo Gen request. The curated SVG boards are composition illustrations, not avatar references.
