# drishvo.co.in — implemented local pipeline
Updated 18 October 2026.

## Relationship to the supplied design
The unchanged supplied document is in [reference/PIPELINE_TECHNICAL_DESIGN.original.md](reference/PIPELINE_TECHNICAL_DESIGN.original.md). It defines the intended live-generation quality gates. Its historical statements about prior live runs do not describe this checkout. [../PROTOTYPE_STATUS.md](../PROTOTYPE_STATUS.md) records evidence for this implementation.

This milestone implements the local pipeline first. The eventual creator flow stays: **Idea → storyboard approval → generate/review → publish**. Subscription and billing remain deferred. Instagram, accounts and dashboard are not part of this pipeline milestone.

## Boundaries
- CLI: local topic/reference files, fixture creation, approval, generation, revision, resume and evaluation.
- Planner: Gemini adapter produces a validated structured plan. Source identity is assigned by the application. Generated code is never executed.
- Approval: SHA-256 binds approval to the exact canonical plan. Editing an approved plan invalidates approval.
- Speech: one ElevenLabs request per scene with returned character alignment. Two configurable voice presets. Fixture adapter writes valid silent WAVs and synthetic alignment.
- Compiler: resolves phrase occurrences against narration blocks, maps character alignment to words, caption groups and animation frames, then validates a 60–90-second timeline.
- Renderer: approved React/Remotion components only; local packaged Inter font; 1080×1920 at 30 fps. Outputs use H.264 and AAC.
- Validation: schema, references, cue resolution, alignment, duration, font loading, text overflow, horizontal bounds, media probe and full FFmpeg decode.
- Review: local HTML storyboard, MP4, machine report and unscored human evaluation sheet. Loopback-only review server.

## Data and state
Each run has an immutable version identifier and optional parent. Plan, approval, manifest, speech artifacts, alignments, timeline, captions, preview frames and output are separate files. Atomic replacement protects individual JSON writes. A per-run exclusive lock rejects concurrent writers; this is local orchestration, not a distributed job system.

Normal states are awaiting-approval → approved → running → ready-for-review. Failures record stage and error; compilation errors request input. Cancellation is observed at stage boundaries and forwarded to rendering. An in-flight provider request can complete before cancellation is observed.

The speech cache is partitioned by local owner and project. Keys include spoken text, model, voice, settings and adapter version. Cache content and alignment hashes are checked before reuse. Visual-only revisions reuse compatible speech; voice or narration changes invalidate affected entries. Finished output hashes are verified on resume, and corrupt or missing completed output requires a new version.

## Timing and visuals
Timing comes from the speech alignment in live mode, never from language-model duration estimates. Fixture timing is deliberately synthetic: six scenes of 11.8 seconds plus 0.2-second holds produce a 72-second timeline. It is unsuitable for judging natural speech pace.

Captions support explicit spoken/display text mappings. Unreconciled normalized text is rejected rather than silently shifted. Caption groups have bounded lengths and a checked two-line area; live reading-speed policy remains unvalidated.

Supported scene families are title, takeaway, process flow, labeled diagram, comparison and bounded binary search. Binary search computes the midpoint and range in trusted code from sorted distinct integers. Generic illustration icons are schematic, not scientifically precise imagery. More sophisticated scene transitions, charts and timeline graphics are deferred.

## Revision flow
A visual edit or narrator change creates a child version, writes a change summary and requires new approval. Fixture-only auto-approval is labeled as test approval and cannot approve live plans. Live conversational revisions require an explicit provider-enabled command; review the changed scenes before approving. The model's edit is a proposal, not evidence that the requested edit was faithfully applied.

## Recovery and limits
Failures after speech retain reusable audio. Retrying an incomplete provider call can incur another charge; paid retries are not automatic. Lock cleanup after a hard crash is manual and must only happen after confirming the recorded process is no longer running.

This implementation has no authentication, tenant isolation service, database, cloud storage, durable scheduler, publishing, billing or production monitoring. Local owner identity is fixed. Provider credentials stay in ignored local environment files. The review server exposes an artifact allowlist and binds to 127.0.0.1.

## Remaining live acceptance
1. Configure and verify actual Gemini access and selected ElevenLabs voices.
2. Generate and listen to all three topics with real alignment.
3. Evaluate both narrator presets for pronunciation, continuity and Indian English suitability.
4. Exercise a live conversational scene revision and narrator change.
5. Review factual accuracy, visual relevance, caption reading speed and synchronization across complete videos.
6. Record human scores and output evidence before declaring the source document's live-quality gate passed.
