# Hosted render capacity benchmark

Measured on 23 October 2026 against the existing development worker. This is a fixture-pipeline measurement, not a promise for live Gemini or ElevenLabs generation.

## Test shape

- Google Cloud `e2-medium` in `asia-south1-c`: 2 vCPU, one queue worker
- Six scenes, 72 seconds total, 1080 × 1920 H.264/AAC output
- Remotion concurrency: 2
- MongoDB queue and private Cloudflare R2 media
- Provisional internal turnaround target: 360 seconds from worker claim to Ready

## Result

| Measure | Result |
| --- | ---: |
| Queue wait | 0.5 seconds |
| Worker processing | 919.4 seconds (15m 19s) |
| End to end | 919.9 seconds |
| Main render stage | 898.0 seconds |
| Validation | 14.8 seconds |
| Finalization and R2 completion | about 2.4 seconds |
| Real-time factor | 12.77× video duration |
| Serial capacity | 3.92 videos/hour |
| MP4 | 5,736,771 bytes |
| Poster | 163,943 bytes |
| Five-minute target | Not met; processing was 2.55× the target |

The disposable output reached Ready in private R2 and the benchmark removed its R2 objects and MongoDB record afterward. The worker stayed healthy and retained its lease for the full run.

## Decision

Keep the current `e2-medium` for functional development because it is stable and inexpensive, but do not treat it as MVP production capacity. Encoding accounts for about 97.7% of processing time, so queue or storage changes will not materially improve turnaround.

Before selecting a production worker, compare at least one 4-vCPU and one 8-vCPU configuration using the same benchmark. Set `RENDER_CONCURRENCY` at or below the machine's available vCPUs and retain the five-minute target. Do not resize the existing development VM until the expected trial-credit impact and brief worker outage are approved. If 1080 × 1920 still misses the target on the selected machine, benchmark a 720 × 1280 preview tier separately rather than silently reducing final export quality.

Run the repeatable check with `npm run worker:benchmark-hosted`. It creates one disposable job, reports stage timings and throughput, then removes the test database record and private media.
