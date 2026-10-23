# drishvo.co.in — technology and development order

Updated 22 October 2026. This document separates the working local prototype from the proposed SaaS architecture. See [`status.md`](../status.md) for the feature-by-feature checkpoint.

## Product flow

The creator-facing flow remains four steps: **Idea → Storyboard → Video → Publish**. In the current local prototype, a creator can plan an idea, review/edit/approve a six-scene illustrative storyboard, explore timing, render a silent MP4 from the approved copy, and draft an Instagram caption. A real voiceover and posting are not yet connected. Billing is deferred.

## Stack in this repository today

| Part | Current technology | What it does |
| --- | --- | --- |
| Studio | Next.js 16, React 19, TypeScript, CSS | Four-step browser application and local API routes. |
| Project state | Better Auth + MongoDB in account mode; local Next.js API + `.cache/studio-projects/` files in local mode | Account projects and approval history are owner-scoped. The earlier local browser workspace intentionally remains separate. |
| Render jobs | MongoDB queue for account jobs, separate local Node.js worker, Cloudflare R2 media; local child process for credential-free mode | The web request saves an approved account job. A dedicated worker claims it atomically, renews a lease, reports progress, handles cancellation/retry, and uploads completed MP4/poster files to private R2. Completed jobs play without local files. After worker loss, the fixture queue can start one fresh attempt with a distinct ID. The worker publishes an availability heartbeat, and the Video screen explains queued wait states. The worker still runs on this machine; hosted execution and partial-render resumption remain pending. |
| Video engine | Remotion, FFmpeg/FFprobe, TypeScript, Zod | Builds 1080 × 1920 MP4s, captions, motion cues, and review artifacts; validates inputs and output. |
| Fixture mode | Synthetic narration timing and silent audio | Tests end-to-end rendering without API keys or provider charges. It cannot establish real voice-to-motion quality. |
| Live adapter code | Gemini planner and ElevenLabs speech-with-timestamps adapters | Implemented in the command-line pipeline with mocked tests; real calls and studio integration remain unvalidated. |

The local render preserves approved scene titles and narration. It retains visual directions as reference text and translates them into the pipeline's limited schematic graphics. It therefore requires human review before publication. Each render is tied to a specific storyboard version; edits require fresh approval and a new render.

Account renders require `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` in the ignored `apps/studio/.env.local` using a private bucket and a bucket-scoped object read/write token. Start the separate local worker with `npm run worker:account` while running account mode. A queued job waits safely in MongoDB if the worker is offline. The worker processes one job at a time, renews a lease, reports its idle/busy state, and writes completed MP4/poster files under `drishvo/renders/`; signed-in owner-checked routes serve them. `/api/render-worker` reports online/busy availability and the last heartbeat time to approved signed-in users, without worker IDs or job IDs; the Video screen uses it while a job is queued. Local mode and older account jobs retain their earlier local paths. If the worker lease expires, the fixture queue creates one fresh attempt with a new render ID and follows it from the Video screen. A second loss remains Interrupted, and cancelled jobs are never restarted. This repeats rendering from the approved snapshot; it does not resume a partial MP4. Local development uses the private `drishvo-develop` bucket and a token restricted to it. A disposable queued render completed and uploaded a 5.46 MB MP4, then its test data was removed. Set up a separate Drishvo production bucket and token before deployment.

### Render worker hosting preparation

`Dockerfile.worker` packages the existing one-at-a-time queue worker with Chromium, Debian FFmpeg, and the repository's Node dependencies. Using `/usr/bin/ffmpeg` avoids a separate GitHub binary download during dependency installation; locked npm installs have extended fetch timeouts for the large native Remotion and media packages. It is a host-neutral container recipe, not a deployed service. Set `DRISHVO_AUTH_MODE=accounts` and pass `MONGODB_URI`, `MONGODB_DB_NAME`, and the four `R2_*` values as host secrets at runtime; the worker does not need web sign-in secrets. `.dockerignore` excludes local env files, caches, render output, and Git history from the image. Use a separate production database and private R2 bucket/token before connecting a production web app. Keep one worker replica initially while measuring render CPU, memory, duration, and storage use; the queue can safely claim from more than one replica later.

With `WORKER_HEALTH_PORT=8080`, `GET /health` returns 503 until MongoDB queue operations succeed, 200 while the worker is making progress, and 503 after 25 seconds without a successful queue operation or during shutdown. The response contains only `{ "ready": boolean }`. A host should restart an unhealthy process and alert an operator if the worker remains unavailable or queued jobs age beyond the agreed threshold. The endpoint is only a readiness signal; its HTTP port should be used for host checks rather than exposed as a public product API. The web app's signed-in `/api/render-worker` continues to give creators queue availability. The Linux image and ordinary Compose build pass locally, and the dedicated Google Cloud test VM completed a full private-R2 render plus running cancellation. Ready and cancelled run directories are removed after their terminal MongoDB state is safely stored; failed directories remain for diagnosis. Test containers, media, and databases are removed. The alert runner is deployed on the test VM. Its one-minute systemd timer is active and uses a dedicated Google Cloud service identity with only Logs Writer access; a keyless validation event reached the private `drishvo-worker-operations` log. For repeatable local verification, run `./node_modules/.bin/tsx scripts/verify-worker-container.ts` with the ignored development env file after building `drishvo-worker:local`; use `--restart-only` when only the container lifecycle needs checking.

On this Windows laptop, starting Docker Desktop directly from the Codex shell produced a Windows AF_UNIX socket access error, while launching Docker Desktop through Windows Explorer brought up the Linux engine. This matches the [reported Codex Desktop AppData virtualization issue](https://github.com/openai/codex/issues/52698). Do not reset Docker data to address this local launch path; start Docker Desktop from the Windows Start menu or Explorer, then verify `docker info` before building.

### Host operation recipe

`compose.worker.yaml` is a single-replica Linux host recipe with a three-gigabyte memory ceiling, two CPU limit, automatic restart, and a readiness port bound only to the host loopback address. Set `DRISHVO_WORKER_ENV_FILE` to an **absolute path outside the repository** containing the production worker's MongoDB and private R2 credentials, then use `docker compose -f compose.worker.yaml up -d --build`. Do not reuse `drishvo-develop` or the laptop's `aivideogenerator` database for production. The host needs free disk for temporary MP4 output and image layers. The worker now removes Ready and Cancelled run directories after durable terminal state, while retaining Failed directories for diagnosis; separately prune old failed runs and unused Docker images under an operator-defined retention policy. Stopping the host during a render can interrupt that attempt; after lease expiry, the fixture queue makes one fresh attempt.

Run `npm run worker:check` for an aggregate operator check. It returns 0 when a worker is online with no queue older than ten minutes and fewer than three failed renders in the last day; 2 means an operational alert and 3 means the check failed. JSON output includes availability and counts, never account, project, or job identifiers.

For delivery, configure at least one destination in `/etc/drishvo/worker.env`. `WORKER_ALERT_GOOGLE_CLOUD_LOG_ID` writes aggregate problem, reminder, and recovery events to Google Cloud Logging through the VM service identity without a stored key. `WORKER_ALERT_WEBHOOK_URL` can deliver the same transitions to an HTTPS webhook, and `WORKER_HEARTBEAT_URL` can ping an external dead-man monitor after each healthy check. `npm run worker:alert` stores only aggregate deduplication state in MongoDB. Copy `deploy/systemd/drishvo-worker-alert.service` and `.timer` to `/etc/systemd/system`, adjust `WorkingDirectory` if the checkout is not `/opt/drishvo/app`, then enable the timer. The hosted test worker uses `drishvo-worker-operations` and runs every minute; webhook and dead-man destinations remain optional extensions.

Google Cloud Monitoring has an enabled Critical log-based policy, `Drishvo worker VM failure`, connected to the `Drishvo operations email` channel. It covers Error-or-higher GCE logs in `asia-south1-c`, VM stop/delete requests, and Error-or-higher entries written by the application runner to `drishvo-worker-operations`. It is rate-limited to one email per hour with one-hour incident autoclose. Recovery events are retained as Notice logs for diagnosis and do not open incidents.

Docker Compose restarts the worker when its process exits. An unhealthy Docker health status alone does not restart it; the host still needs a supervisor or alert response for that condition.

## Proposed production services

These are design choices recorded in the project documentation, not deployed integrations. Validate their account, pricing, licensing, and API requirements before committing to them.

| Need | Proposed choice | Decision to validate |
| --- | --- | --- |
| Sign-in and creator ownership | Better Auth | Internal account mode is implemented locally; signed-in password change is available; email recovery, production session policy, and multi-user operations remain. |
| Projects, versions, approvals, jobs, publish records | MongoDB Atlas | Project snapshots are stored in MongoDB locally; durable job/publish records, transactions, retention, and backups remain. |
| Original and rendered media | Cloudflare R2 | Private generated-video storage is wired for account-owned renders; live upload validation, original-asset storage, retention, lifecycle, and costs remain. |
| Durable background orchestration | MongoDB job queue implemented locally; hosted worker to select | The web request no longer runs account renders. Deploy the worker on a suitable long-running host, set capacity limits and monitoring, and decide whether to keep MongoDB queue coordination or adopt a managed workflow service. |
| Idea and storyboard generation | Gemini | Factual review, structured output, cost controls, and safety gates. |
| Narration | ElevenLabs | Voice IDs, timestamp alignment, pronunciation, commercial terms, and cost controls. |
| Publishing | Meta Instagram integration | Account eligibility, OAuth, media requirements, direct publish, scheduling, webhooks/polling, and uncertain-outcome recovery. |

No subscription or billing service is needed in this phase.

## Recommended build sequence

1. **Finish the local render bridge.** Verify a browser-created MP4 plays and downloads, failure/retry states reflect real jobs, and the UI states clearly that fixture audio is silent. This proves the workflow and renderer are connected before introducing external services.
2. **Complete account operations.** Owner-scoped projects and approvals are implemented locally. Keep prior local drafts separate; add email-based account recovery and production session/backup policy.
3. **Move rendering to durable workers and private storage.** Keep the same approval-to-job contract, but replace local child processes and files with a queue/workflow, worker capacity limits, media storage, and recoverable progress. Add cancellation and idempotency.
4. **Connect live AI creation.** Generate storyboard proposals from ideas with Gemini, require creator approval, then use ElevenLabs timestamps to align captions and motion. Run quality checks for factual accuracy, pronunciation, readability, timing, and rendering. Preserve the no-key fixture path for testing.
5. **Complete publish and schedule.** Connect an eligible Instagram account, confirm the final video/caption, submit media, track delivery or uncertainty, and support scheduled publishing and reconnect handling.
6. **Prepare SaaS operations.** Add observability, quotas, abuse/cost controls, retention, support tooling, and a release process. Introduce subscription and billing only in the later version already agreed in the PRD.

The main production design decisions still open are the worker host and restart policy, the exact media retention policy, and the live provider quality/cost thresholds. Those should be resolved against a measured render workload and the PRD's acceptance criteria.
