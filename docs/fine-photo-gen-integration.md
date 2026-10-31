# Fine Photo Gen integration audit

## Repository inspected

- Repository: [`micahp/finetuned-photo-gen`](https://github.com/micahp/finetuned-photo-gen)
- Inspected revision: `ca1eaf714c90a238a5d4e262ed3426a63503f803`
- The studio does not access Fine Photo Gen's database. It calls its Next.js HTTP routes.

## Verified capabilities in the inspected source

### Text-to-image and custom character models

Fine Photo Gen's `src/app/api/generate/route.ts` accepts a prompt (maximum 2,000 characters), optional `modelId`, optional `userModelId`, seed, steps, style, and aspect ratio from `1:1`, `16:9`, `9:16`, `3:4`, or `4:3`.

The route requires a valid Fine Photo Gen user session. It looks up a supplied `userModelId` under that authenticated user and requires the model to be ready with a Replicate inference model ID. It prepends the model's trigger word when configured, calls the existing Together AI/Replicate service layer, stores the generated output in Fine Photo Gen storage/database, and returns `{ success: true, image: { id, url, prompt, aspectRatio, width, height, generationDuration, userModel } }`.

The studio adapter maps to this actual contract at `POST {FINE_PHOTO_GEN_BASE_URL}/api/generate`. It sends the configured cookie header and never assumes a separate status route. The studio's own job/asset records preserve its prompt, seed, persona version, provider, model, output URL, and review decision.

### Image editing

Fine Photo Gen's `src/app/api/edit/route.ts` accepts `prompt`, `imageUrl`, and optional `seed`. It requires a signed-in user, enough credits, and a premium subscription. The current implementation uses Replicate's `google/nano-banana` edit service and returns a saved URL.

The studio adapter maps a rights-confirmed reference image edit to `POST {FINE_PHOTO_GEN_BASE_URL}/api/edit`. This is an image edit path; it is not the same as a multi-reference character generation API.

### Character consistency and known gaps

- Fine Photo Gen supports custom trained user models (`userModelId`) for image generation, so the studio can configure a separate user model per persona after each model is trained and ready.
- The external route accepts only the Fine Photo Gen database ID for that account's model; the ID is not interchangeable with a Replicate model path.
- The route does not accept the studio's negative prompt, image reference list, or per-request cost cap. Negative prompts are stored in studio provenance but are not sent to Fine Photo Gen.
- The edit route accepts one image URL, requires a premium plan, and does not promise stable character identity.
- Batch generation exists in Fine Photo Gen, but it does not accept the custom `userModelId` field in the inspected route. The studio therefore issues individual requests to preserve character-model selection.
- The response is synchronous from the studio adapter's perspective; no separate generation status endpoint was found in the inspected source.
- No documented service-to-service token or service account route was found. Both existing routes call the app's session auth helper and apply end-user subscription/credit rules.

## Studio configuration

Set these server-side environment variables; never put the cookie in browser code or commit it:

```dotenv
FINE_PHOTO_GEN_BASE_URL=https://your-fine-photo-gen-host
FINE_PHOTO_GEN_SESSION_COOKIE=the-complete-cookie-header-from-a-dedicated-studio-account
FINE_PHOTO_GEN_MODEL_ID=black-forest-labs/FLUX.1-schnell-Free
FINE_PHOTO_GEN_GAMER_USER_MODEL_ID=the-ready-model-id-owned-by-that-account
FINE_PHOTO_GEN_FITNESS_USER_MODEL_ID=the-ready-model-id-owned-by-that-account
```

`FINE_PHOTO_GEN_GAMER_MODEL_ID` and `FINE_PHOTO_GEN_FITNESS_MODEL_ID` can override the base model separately. If a custom model ID is provided, it must exist under the account represented by the session cookie and be ready for inference. The Free model may use Fine Photo Gen's daily free-generation allowance; other models spend that account's credits according to Fine Photo Gen's own price rules.

The cookie bridge can expire or be revoked and has broad user-account authority. Use a dedicated Fine Photo Gen account with limited credits. For unattended production, add a narrow service-auth endpoint to Fine Photo Gen with a dedicated service principal, per-persona model allowlist, idempotency key, explicit budget limits, and a documented response/job contract. The current adapter should then switch from cookie auth to that service token.

## Integration acceptance boundary

- Adapter code and mocked HTTP contract tests can be verified without external credentials.
- A live generation is **not** verified until the server URL, active session, account credits/plan, and per-persona model IDs are configured and an actual result is reviewed.
- Mock provider outputs use `mock://` URLs and are visibly labeled; they are not generated images and must not be published.
- No Fine Photo Gen account credentials were present during this audit.
