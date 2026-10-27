# Instagram delivery in internal V1

Drishvo's Instagram delivery code is implemented, but live delivery stays disabled until the Instagram tester account is restored and the Studio has a public HTTPS origin.

## Creator behavior

The Publish step enables delivery only when all four conditions are true:

1. The current storyboard version is approved.
2. The latest caption is saved.
3. A narrated live render for that exact version is Ready in private R2.
4. The creator's Instagram Business or Creator account is connected.

Publish now and Schedule both show a final confirmation. The saved intent freezes the render, caption, destination account, destination epoch, storyboard version, requested UTC time, and creator timezone. Editing the project later does not mutate that intent.

Scheduled intents can be rescheduled or cancelled until a worker claims them. Once Meta interaction starts, cancellation is disabled. A provider response lost after the final publish request becomes **Check Instagram** rather than being retried. The creator must confirm **It published** or **Not published** after checking the connected account; only the latter enables a safe manual retry.

## Private media handoff

R2 remains private. When the publisher claims an intent, it creates a random 256-bit media token, stores only its SHA-256 hash, and gives Meta a URL valid for 30 minutes. The route serves only the pinned MP4 while that intent is active. Terminal states remove the token metadata.

The public origin must be HTTPS and reachable by Meta. `localhost`, `127.0.0.1`, and `::1` are rejected by the worker.

## Required private environment

The publisher uses the same MongoDB, R2, and Instagram encryption settings as the Studio, plus:

```text
DRISHVO_INSTAGRAM_ENABLED=true
META_INSTAGRAM_APP_ID=...
META_INSTAGRAM_APP_SECRET=...
META_INSTAGRAM_REDIRECT_URI=https://<public-studio-origin>/api/instagram/callback
INSTAGRAM_TOKEN_ENCRYPTION_KEY=...
META_INSTAGRAM_GRAPH_URL=https://graph.instagram.com
META_INSTAGRAM_SCOPES=instagram_business_basic,instagram_business_content_publish
DRISHVO_PUBLIC_BASE_URL=https://<public-studio-origin>
```

Keep these values outside Git. The Studio and publisher must use the same token-encryption key. After the public callback is added to the Meta app, start the opt-in service with the `instagram` Compose profile.

## Internal safeguards

Defaults are per approved account and UTC day:

- 20 Gemini storyboard requests
- 5 narrated render requests
- 10 Instagram delivery intents
- one queued or running render at a time

The limits are configurable through the credential-free `.env.example`. Duplicate delivery confirmation keys return the existing intent and do not consume another allowance.

## Live acceptance still required

After Meta restores the tester account and public HTTPS hosting exists:

1. Complete OAuth and confirm the expected username and account type.
2. Publish one reviewed narrated Reel immediately.
3. Schedule another Reel, reschedule it, then cancel it before claim.
4. Schedule a final Reel and verify it survives browser closure and worker restart.
5. Confirm the exact video, caption, destination, and delivery history.
6. Inject a timeout after the final Meta request and verify that Drishvo shows **Check Instagram** without retrying.

Do not enable the publisher for wider use until these checks pass with the authorized Meta test account.
