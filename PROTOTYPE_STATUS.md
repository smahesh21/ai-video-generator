# drishvo.co.in prototype status
Updated: 18 October 2026.

## What is complete
The credential-free local pipeline is implemented in this repository. It creates approved, versioned storyboards, synthetic speech/alignment fixtures, deterministic caption and animation timelines, real vertical MP4s and review artifacts. Live Gemini and ElevenLabs adapters exist behind explicit opt-in commands, with mocked contract tests.

**No live provider calls, actual voiceovers, Indian English listening tests or Instagram publishing have been performed in this checkout.** Silent fixture outputs cannot satisfy the supplied design's live-quality exit gate.

## Measured validation
| Check | Evidence |
|---|---|
| TypeScript | `npm run typecheck` passed |
| Core tests | 29/29 passed: schemas, approval hashes, alignment, cues, captions, duration, cache keys, binary search, locking and mock adapters |
| CLI integration | 1/1 passed, covering preflight, intentional failure, resume, visual revision, narrator cache separation and stale approval |
| Browser playback | Water MP4 played in installed Edge, 1080×1920, duration 72.042667 seconds, playback advanced, no page errors |
| Seeking / access | MP4 byte-range request returned HTTP 206 and 1,024 bytes; private environment path returned 404 |
| Visual revision | `water-larger-labels` changed only scene-1; six speech clips reused; zero created; six updated preview frames rendered |
| Human evaluation | Pending; each run has an unscored `evaluation.md` |

## Local outputs
- `runs/water-demo/output.mp4`: completed, 2,160 frames, 72.043 seconds, H.264/AAC, 1080×1920 at 30 fps; machine checks and full decode passed.
- `runs/ram-demo/output.mp4`: completed, 2,160 frames, 72.043 seconds, H.264/AAC, 1080×1920 at 30 fps; machine checks and full decode passed.
- `runs/binary-demo/output.mp4`: completed, 2,160 frames, 72.043 seconds, H.264/AAC, 1080×1920 at 30 fps; machine checks and full decode passed.
- `runs/water-larger-labels/preview-frames/`: completed still-only revision, not a revised MP4.

Water's original MP4 predates the added frame-by-frame text-overflow guard. Its revised preview frames and the later RAM/binary renders use that guard. Selected water, RAM and binary preview frames were visually inspected; that is not a full human review of all videos.

Open the local review at http://127.0.0.1:4180 while `npm run review` is running. Generated outputs and test-run artifacts are ignored by Git and remain on this laptop.

## Source design and actual scope
The unchanged uploaded design is retained in `docs/reference/PIPELINE_TECHNICAL_DESIGN.original.md`. Its statements about previous live outputs are not evidence for this checkout. The implemented behavior is described in [docs/PIPELINE_IMPLEMENTATION.md](docs/PIPELINE_IMPLEMENTATION.md).

The full dashboard, account system, cloud persistence, Instagram connection/scheduling and billing are deferred. This is a local pipeline prototype.

## Before live acceptance
Configure actual provider access and both voice IDs locally; run all three topics with real speech; listen to both narrator presets; check synchronization and pronunciation; complete a live conversational revision and narrator change; score the full videos. Resolve factual, visual, caption-speed or normalization problems before approving live quality.

## Reproducing checks
Run `npm run typecheck`, `npm test` and `npm run test:integration`. The optional browser check is `node scripts/check-review.cjs` while the review server and water-demo output exist. It needs an installed Playwright module (or `PLAYWRIGHT_MODULE` pointing to one) and Microsoft Edge, or `BROWSER_EXECUTABLE` for another compatible browser. Playwright was supplied by the local Codex runtime for this verification, not added as a required application dependency.
