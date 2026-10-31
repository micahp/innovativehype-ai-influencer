# Social publishing adapters

The studio has isolated Instagram Graph API and X API v2 adapters. They run from the authenticated publish action or the independent worker's due-post scheduler; the dashboard starts with live publishing disabled and the emergency pause engaged.

## Supported in this build

| Platform | Supported post | API flow | Current boundary |
| --- | --- | --- | --- |
| Instagram | Single feed image with caption | Create a media container, then publish it | Professional accounts only; no carousel, Story, or Reels support in this adapter |
| X | Text post or one image with text | Verify `/2/users/me`, optionally upload media, then create a post | No threads or video uploads in this adapter |

Each influencer has separate credentials. The X request sets `made_with_ai: true`. Both personas also disclose their virtual identity in their profile bio. X API v2 supports `POST /2/tweets`, user-context auth, and the `made_with_ai` disclosure field. Its media flow uses v2 initialize, append, and finalize endpoints. [Manage Posts](https://docs.x.com/x-api/posts/manage-tweets/introduction), [Create Post](https://docs.x.com/x-api/posts/create-post), [X media upload](https://docs.x.com/x-api/media/initialize-media-upload)

## Platform prerequisites

### Instagram

Use an Instagram **Professional** Business or Creator account connected to a Facebook Page when using the Facebook Login flow. Meta's current collection documents publishing for Professional accounts and requires the relevant Meta app permissions, including `instagram_content_publish`; regular consumer accounts are not accessible through that flow. [Instagram API setup and permissions](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)

The account credential needs a page access token and Instagram professional account ID. Set a Meta Graph API version supported by the app in `INSTAGRAM_GRAPH_VERSION`, or specify it in the account form. The image URL must be HTTPS and publicly retrievable by Meta. A successful live feed post has not yet been verified with a real app/account.

### X

Use a user-context OAuth 2.0 bearer access token with permissions for reading the authenticated user and creating posts. For image posts, the image's HTTPS hostname must be included in comma-separated `PUBLISH_MEDIA_ALLOWED_HOSTS`; redirects are rejected, supported image types are JPEG, PNG, WebP, or GIF, and the image must not exceed 5 MB. The adapter verifies that the token belongs to the configured X user ID before uploading or posting.

Current API plan access and post/media permissions are controlled by X. Confirm those permissions and costs in the account's developer console before activation. The adapter uses the documented v2 endpoints at `https://api.x.com/2` by default. A successful post has not yet been verified against a live X app/account.

## Configure and activate

1. Use TLS for the studio dashboard. Generate `SOCIAL_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32` and keep that key backed up separately from the database. Losing it makes saved platform tokens unreadable.
2. In **System settings → Social account connections**, save an account ID, public handle, and platform-issued access token for each creator/platform pair. Instagram also needs a supported Graph API version unless configured server-side.
3. Leave the emergency pause on while checking credentials, IDs, media visibility, and platform permissions.
4. Test the scheduled workflow with **Run explicit dry-run**. This creates a studio dry-run record only; it does not call a platform.
5. For a controlled live trial, set `LIVE_PUBLISHING_ENABLED=true`, turn off the emergency pause, and leave the mode at `human_approval`. A live request still requires a scheduled post whose time is due and whose latest approval decision is approved.

The worker can publish approved due posts automatically in `automatic_preapproved` mode. `conditional_autopublish` is restricted to text-only X posts with no attached media. Both modes still require human approval before scheduling, configured credentials, and an unpaused account. Keep the default `human_approval` mode for initial use.

Do not enable live mode until each account has been authorized and the first post has been reviewed in the destination platform. A timeout or server-side error after a publish request is recorded as `reconciliation_required`; the studio blocks retries to avoid duplicate posts. Check the social account manually before resolving such a record.

## Failure and recovery behavior

- The unique scheduled-post relation and database status claim prevent two workers or requests from publishing the same scheduled item concurrently.
- Definite platform rejection removes the pending external-publication record and makes the scheduled item available for a corrected retry.
- Uncertain provider responses are locked for reconciliation. The studio does not automatically retry a potentially successful external publish.
- Dry-run records and unresolved external attempts are excluded from performance analytics.
- Manual JSON export remains available when credentials, permissions, or platform support are unavailable.
