# drishvo.co.in — technology and development order

Updated 20 October 2026. This document separates the working local prototype from the proposed SaaS architecture. See [`status.md`](../status.md) for the feature-by-feature checkpoint.

## Product flow

The creator-facing flow remains four steps: **Idea → Storyboard → Video → Publish**. In the current local prototype, a creator can plan an idea, review/edit/approve a six-scene illustrative storyboard, explore timing, render a silent MP4 from the approved copy, and draft an Instagram caption. A real voiceover and posting are not yet connected. Billing is deferred.

## Stack in this repository today

| Part | Current technology | What it does |
| --- | --- | --- |
| Studio | Next.js 16, React 19, TypeScript, CSS | Four-step browser application and local API routes. |
| Project state | Better Auth + MongoDB in account mode; local Next.js API + `.cache/studio-projects/` files in local mode | Account projects and approval history are owner-scoped. The earlier local browser workspace intentionally remains separate. |
| Render jobs | Node.js child process and local `runs/` files | Runs the existing pipeline after checking the saved approved storyboard. Account-mode job and media routes verify the owner. Creators can cancel queued/running fixture jobs; the worker cleans incomplete output. Heartbeats identify stopped workers and offer a fresh render from the approved storyboard. This is for localhost development, not a production queue or durable media store. |
| Video engine | Remotion, FFmpeg/FFprobe, TypeScript, Zod | Builds 1080 × 1920 MP4s, captions, motion cues, and review artifacts; validates inputs and output. |
| Fixture mode | Synthetic narration timing and silent audio | Tests end-to-end rendering without API keys or provider charges. It cannot establish real voice-to-motion quality. |
| Live adapter code | Gemini planner and ElevenLabs speech-with-timestamps adapters | Implemented in the command-line pipeline with mocked tests; real calls and studio integration remain unvalidated. |

The local render preserves approved scene titles and narration. It retains visual directions as reference text and translates them into the pipeline's limited schematic graphics. It therefore requires human review before publication. Each render is tied to a specific storyboard version; edits require fresh approval and a new render.

## Proposed production services

These are design choices recorded in the project documentation, not deployed integrations. Validate their account, pricing, licensing, and API requirements before committing to them.

| Need | Proposed choice | Decision to validate |
| --- | --- | --- |
| Sign-in and creator ownership | Better Auth | Internal account mode is implemented locally; signed-in password change is available; email recovery, production session policy, and multi-user operations remain. |
| Projects, versions, approvals, jobs, publish records | MongoDB Atlas | Project snapshots are stored in MongoDB locally; durable job/publish records, transactions, retention, and backups remain. |
| Original and rendered media | Cloudflare R2 | Private storage, signed access, upload limits, lifecycle, and costs. |
| Durable background orchestration | Inngest or an equivalent durable job service | Long renders, retries, cancellation, progress, and worker hosting. Do not execute long video jobs inside a short request handler. |
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

The main production design decisions still open are the worker host and queue, the exact media retention policy, and the live provider quality/cost thresholds. Those should be resolved against a measured render workload and the PRD's acceptance criteria.
