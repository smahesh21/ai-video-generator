# drishvo.co.in — local video pipeline prototype

For the current feature-by-feature development checkpoint, see [status.md](status.md).

A TypeScript + Remotion prototype based on the supplied pipeline technical design. All new work lives in this repository. The local Next.js studio now connects approved storyboards to credential-free render jobs; it is not the production SaaS service.

**No credentials are needed for fixture mode.** It produces real 1080 × 1920 H.264/AAC MP4 files with intentionally silent audio and clearly labeled synthetic timing. These outputs demonstrate rendering, captions, cue compilation, approval/versioning, revisions, and recovery. They do **not** establish live AI quality or Indian English voice quality.

## Start here

Requires Node.js 22+ (tested with Node 24) and npm. Dependencies are installed in this checkout; on a fresh clone run:

~~~powershell
npm ci
npm run typecheck
npm test
npm run pipeline -- preflight
~~~

If npm reports blocked install scripts for esbuild or ffmpeg-static, review those package scripts and allow them using your npm installation's script-approval controls. The local setup has installed their required binaries.

### Create a no-key sample

~~~powershell
npm run pipeline -- fixture --topic water --run my-water --approve-fixture
npm run pipeline -- generate --run my-water
~~~

Choose a fresh run ID each time. Supported fixture topics: `water`, `ram`, and `binary`. The `--approve-fixture` flag records **fixture-test approval**, never a human or live-content approval.

Open `runs/my-water/review.html` or `runs/my-water/output.mp4`. On Windows:

~~~powershell
Start-Process .\runs\my-water\review.html
~~~

For a lightweight local review server, use `npm run review`, then open http://127.0.0.1:4180. It exposes only generated review artifacts from runs, never environment files or provider secrets. Stop it with Ctrl+C.

## Live generation — optional and not yet validated

Copy `.env.example` to an ignored `.env.local` file and configure the Gemini key, ElevenLabs key, and exact Indian male/female voice IDs locally. Do not put keys in chat, CLI arguments, source files, or Git. A commercially suitable ElevenLabs plan is required for intended commercial output use. Check Remotion licensing for the actual team before deployment.

~~~powershell
npm run pipeline -- preflight --live
npm run pipeline -- plan --run live-water --topic-file examples/water-topic.md --notes-file examples/water-notes.md --voice indian-english-female --allow-live
~~~

Read `runs/live-water/plan-review.html`. Review and correct any limitations before approving. The output prints the exact plan hash:

~~~powershell
npm run pipeline -- approve --run live-water --plan-hash HASH_FROM_REVIEW --actor creator
npm run pipeline -- generate --run live-water --allow-live
~~~

The `--allow-live` flag is required for paid-provider operations. Preflight checks configuration presence, not remote account access, and makes no paid or network request. The adapters are covered by mock tests; real provider compatibility, output quality, and selected voices remain pending live validation.

Gemini uses a structured, stateless Interactions request with `store:false`. One schema-repair request is allowed. HTTP/timeout failures are not automatically retried. ElevenLabs uses its speech-with-timestamps endpoint; automatic paid speech retries are intentionally disabled. Explicit resume may repeat a failed speech request and may incur charges if the earlier request succeeded remotely.

## Review and revisions

~~~powershell
npm run pipeline -- revise --run water-demo --to water-larger-labels --scene scene-1 --label-scale 1.1 --approve-fixture
npm run pipeline -- generate --run water-larger-labels
npm run pipeline -- revise --run water-demo --to water-other-voice --voice indian-english-male --approve-fixture
~~~

Visual changes reuse valid speech artifacts. A voice change creates different speech cache keys. In fixture mode both narrator preferences remain silent; this tests dependency invalidation, not voices.

For an AI-interpreted revision of a live plan, use `revise --run SOURCE --to NEW --instruction-file examples/revision.txt --allow-live`. Review its new storyboard hash and `revision.json`, then explicitly approve before generating. Global and scene-specific instructions are proposals: changed scenes are listed for review, not assumed to match intent automatically.

Direct changes to an approved plan are rejected. Existing finished outputs are not silently replaced. Revisions create separate run folders and retain their parent version.

## Recovery and cancellation

~~~powershell
npm run pipeline -- generate --run my-water --fail-after-speech
npm run pipeline -- resume --run my-water
~~~

Use failure injection on a fresh, approved run. It deliberately fails after speech/compilation; resume validates artifact hashes and reuses compatible audio. Already complete outputs are returned unchanged after hash verification. Missing/changed completed output requires a new revision.

Ctrl+C requests cancellation, stops subsequent stages, and signals an active render to stop. An in-flight provider request may finish before cancellation is observed. Only one writer may operate on a run. After a hard crash, inspect `writer.lock` and confirm its recorded process has stopped before manually removing that specific lock. Never remove a lock for a live process.

## Artifacts

Each `runs/<run-id>/` includes:

- `plan.json`, `plan-review.html`, and hash-bound `approval.json`.
- `manifest.json` with state/stage, counts, and failure information.
- `public/audio/`, `alignment/`, and `speech.json`.
- `timeline.json`, `captions.json`, and packaged font.
- Representative `preview-frames/` rendered using the actual composition.
- `output.mp4`, `qa.json`, `review.html`, and a pending human `evaluation.md`.

Runs, generated media, caches, and environment files are ignored by Git. Sample outputs exist locally but are not checked in. Package versions are pinned and the lockfile is included.

## Current limits

- Strict original-text alignment fails closed when the provider text cannot be reconciled. Explicit `spokenText` and optional whole-block `captionText` mappings are supported; automatic many-to-many number/acronym normalization is not yet implemented.
- Caption groups are word-timed, conservatively length-bounded, and rendered within a checked two-line area. A reading-speed/minimum-duration policy still needs evaluation with real narration.
- Supported graphics: title/takeaway, simple process flow, labeled diagrams, comparison, and a bounded sorted-list binary-search component. Charts and general timeline scenes are deferred.
- Storyboard HTML is a text/schematic review. The actual Remotion frame previews are generated after timing compilation.
- The command-line fixture pipeline uses a local owner ID. The studio now has an internal MongoDB-backed account mode, but R2, durable jobs, and Meta are not implemented.
- Fixture timing is synthetic. Indian narrator evaluation, live conversational revision, and full video playback review must happen before declaring the document's P2/P3 quality gates passed.

## Test commands

~~~powershell
npm run typecheck
npm test
npm run test:integration
~~~

Tests use non-sensitive fixtures and mock provider responses. Integration tests exercise real CLI checkpoints and media probes without rendering an entire video or calling paid services. Read `PROTOTYPE_STATUS.md` for measured results and remaining gates.

## Website and application designs

The approved direction is **Night Signal — Obsidian Glass**. The Stitch review set contains **24 desktop screens and 8 mobile counterparts**. See [UI design documentation](docs/UI_DESIGN.md) for the palette, dimensions, screen inventory and review references. These are review drafts. The local project library, Idea page, storyboard review, timed video concept review, real fixture render screen, generation-state simulation, Publish planning preview, and Instagram connection-state preview are implemented as a browser prototype; the production service is not yet connected. The [technology and development roadmap](docs/TECH_STACK_AND_ROADMAP.md) separates the working stack from proposed SaaS services.


## Local studio preview

Run `npm run dev` in this repository, then open http://127.0.0.1:3000/projects. The project library, Idea page, six-scene storyboard review, Video render/player, separate timed storyboard concept, generation-state simulation, Publish planning preview, and Instagram connection-state preview work without API keys. Choose a sample project or create your own idea, select **Create storyboard**, revise a scene if needed, and approve the storyboard. The main **Video** step starts a local MP4 render from the approved copy, then shows a thumbnail, player, download, and **Render this storyboard again** action. The older captions-only concept is available separately from that screen. In local mode, drafts and approvals are saved in ignored `.cache/studio-projects/` files, scoped to a browser cookie; existing browser drafts migrate on first load. In account mode, drafts and approvals are scoped to the signed-in user in MongoDB. Render files and job state still use local `runs/` folders. This is not production storage. The renderer now uses moving diagram cards, flowing connectors, and water-cycle symbols when that topic is detected. It still uses silent synthetic timing and an illustrative storyboard; it is a technical fixture rather than the finished AI motion explainer. AI brainstorming, custom generated visuals, live ElevenLabs voiceover, real Instagram authorization, posting, and scheduling are later milestones. An approved internal account mode is available for local testing.

The local render API accepts requests only through the loopback studio address. It launches a local worker and requires an approved six-scene storyboard. Keep this development server local; the worker and file storage design must be replaced before deployment. If Remotion cannot launch the installed browser, set `BROWSER_EXECUTABLE` to a compatible Chrome executable before starting `npm run dev`.

On Windows, the studio starts its render worker and FFmpeg/FFprobe checks with their console windows hidden. It also reuses one headless Chrome instance across frame previews and MP4 encoding, so rendering should not repeatedly flash Command Prompt windows. Command-line runs launched directly with `npm run pipeline` use the same hidden FFmpeg/FFprobe checks, but the worker preload is specific to the studio.

The UI uses the approved Obsidian Glass direction with a more neutral charcoal canvas. Visible buttons remain 32px high and the app header is 56px high with 12px 16px padding. Run `npm run build:studio` to validate the studio build.






### Internal account mode (local prototype)

The studio uses `apps/studio/.env.local` (ignored by Git) for its MongoDB URI, database name, auth secret, base URL, and approved email list. `apps/studio/.env.example` lists variable names without credentials. `DRISHVO_AUTH_MODE=accounts` enables the private studio. This laptop is configured with the `aivideogenerator` database and one approved account; its generated initial password is stored only in the ignored `apps/studio/.env.first-login` file. Keep both local env files private. Public signup is disabled.

Sign in at `http://127.0.0.1:3000/sign-in`. Projects and their approved storyboard history are stored in MongoDB under the signed-in user. Fixture render jobs and their video/thumbnail URLs require the owning account. Render files and the worker still run on this laptop in `runs/`; this is not durable cloud job or media storage. The renderer still makes silent synthetic-timing videos and does not call ElevenLabs. Browser drafts from the previous local mode are not imported automatically into the account, because a shared browser may contain another person's drafts. A reviewed import flow is still needed before moving those drafts.

For another internal user, add the address to `DRISHVO_APPROVED_EMAILS` and provision that account through an operator-only Better Auth workflow. Do not deploy this local worker or file storage as a multi-user SaaS backend. Durable jobs, private object storage, account recovery/password change, and operational controls remain before production.
