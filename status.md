# drishvo.co.in — development status

Last updated: 19 October 2026  
Current stage: Local studio prototype; approved storyboards can now create and play real silent fixture MP4s.

This is the ongoing checkpoint for feature work. Update it when a feature starts, changes scope, or is completed. `PROTOTYPE_STATUS.md` remains the detailed record of the earlier command-line video pipeline validation.

## Status key

- **Complete (local):** implemented and checked in this checkout, within the limits stated below.
- **In progress:** actively being built; do not treat as ready.
- **Planned:** agreed direction, not implemented.
- **Later:** intentionally outside the current development phase.

## Feature tracker

| Area | Feature | Status | Current behavior / completion evidence |
| --- | --- | --- | --- |
| Product design | Obsidian Glass direction and screen inventory | Complete (local) | Approved visual direction documented in `DESIGN.md` and `docs/UI_DESIGN.md`; 24 desktop and 8 mobile Stitch review designs. |
| Studio foundation | Local Next.js app and shared shell | Complete (local) | Studio runs at `http://127.0.0.1:3000`; current routes build successfully with `npm run build:studio`. Header is 56px with 12px 16px padding; visible product buttons are 32px high. |
| Creator flow | Project library and new-project flow | Complete (local) | Browse sample projects, start a project, and return to saved local projects. Data is stored in this browser only. |
| Creator flow | Idea planning | Complete (local) | Enter and edit the video idea and move into storyboard review. The local flow does not call an AI model. |
| Creator flow | Storyboard review | Complete (local) | Review a six-scene illustrative storyboard, select scenes, revise copy, retain local versions, and approve a snapshot. Browser walkthrough and studio build passed. This is a template, not AI-generated content. |
| Creator flow | Video concept review | Complete (local) | Approved storyboards open a 9:16 timed concept preview with play/pause, scrubber, scene selection, narration, and visual direction. Browser interaction and mobile layout checked; studio build passed. This is not a rendered video and has no audio or download. |
| Creator flow | Generation status and recovery preview | Complete (local) | The Video step links to a local simulation of progress, failure, retry, cancellation, and completion. It uses the approved storyboard but starts no job, calls no provider, and produces no file. Studio build and browser walkthrough passed, including reset on reload. |
| Video pipeline | Credential-free command-line fixture pipeline | Complete (local) | Produces real vertical MP4s with synthetic timing and silent audio; approval, captions, animation cues, revisions, and recovery are implemented. See `PROTOTYPE_STATUS.md` for measured checks. |
| Video pipeline | Gemini and ElevenLabs live adapters | Planned validation | Adapters and mocked contract tests exist in the command-line pipeline, but real provider calls, voice quality, and live output have not been validated. They are not connected to the studio. |
| Creator flow | Local fixture video generation and review in the studio | Complete (local) | The main Video step opens the render job and MP4 player; the timed storyboard concept is a separate secondary page. A real frame appears before playback, and the creator can re-render an approved storyboard without replacing the old file. A revised water-cycle sample played successfully; FFprobe measured 72.043 seconds, 1080 × 1920, H.264/AAC. The renderer now uses larger moving diagrams, flowing connectors and caption-safe layout, but still has silent synthetic timing rather than ElevenLabs or generated footage. |
| Creator flow | Publish planning preview | Complete (local) | Approved storyboards can reach a Publish screen with an editable Instagram caption, browser-saved draft, concept post preview, and readiness checklist. Post and schedule controls are disabled until a real video and Instagram connection exist. Studio build and isolated browser save/reload flow passed; desktop layout checked. |
| Creator flow | Instagram connection and reconnect preview | Complete (local) | Publish review links to an account-status screen with connection-needed and reconnect examples, a readiness checklist, and return to the saved draft. OAuth actions are disabled. Studio build and browser walkthrough passed. |
| Creator flow | Instagram publishing and scheduling UI | Planned | Add real account authorization, final confirmation, scheduling, and delivery/recovery states when integrations are available. No live posting exists. |
| Platform | Accounts, durable project storage, and background jobs | Planned | Replace browser-only drafts with authenticated, recoverable server-side projects and job state. |
| Social | Instagram connection, direct publish, and scheduling | Planned | Requires Meta integration and eligibility/error handling; no connection or posting is implemented. |
| Commercial | Subscription and billing | Later | Intentionally deferred by product decision. |

## Next development sequence

1. Review the complete four-step studio flow on desktop and mobile, including render failure/retry and empty/loading/error states.
2. Add accounts, server-side projects and immutable approved versions; move local render jobs to durable workers and private media storage.
3. Validate live Gemini planning and ElevenLabs narration with real credentials, then assess factual quality, timing, pronunciation, caption sync, and video quality before enabling live generation.
4. Implement Instagram authorization, direct publishing, scheduling, and delivery/recovery states after the generation workflow is reliable.
5. Add operations and cost controls; keep subscriptions and billing for the later version.

## Current limitations

- The studio now launches the command-line pipeline in fixture mode through a local worker. Its separate generation-state screen is still a UI simulation; the real job is on the Video render screen. The local worker and filesystem are not production infrastructure.
- Studio projects and storyboard versions are saved in local browser storage, so they are not shared across devices or accounts.
- The studio storyboard and video concept are illustrative. AI brainstorming, AI script/storyboard generation, and live voiceover are not yet available through the UI. The new render output is a silent test MP4 with simplified supported graphics.
- Fixture MP4s have silent synthetic narration timing and topic-matched schematic animation for the supported motifs. They are real files, but they do not yet deliver custom AI-generated visual assets, ElevenLabs voice quality, or voice-to-motion synchronization described in the product goal. Local illustrative storyboards may still contain generic educational copy.
- Publish review can save a caption locally and show account-status examples, but no Instagram authorization, posting, scheduling, authentication, cloud persistence, or billing is live.

## How to maintain this file

For each feature, update its tracker row and the **Last updated** date. When work starts, mark it **In progress**; mark it **Complete (local)** only after the relevant build/check and user flow pass. Record meaningful scope limits and validation in the row or **Current limitations**. Move the next item forward in **Next development sequence**. Keep a short entry below so later work can tell what changed.

## Change log

| Date | Change | Validation |
| --- | --- | --- |
| 19 Oct 2026 | Stopped the local development/render session at the creator's request. The project is ready to restart for the next render review. | Verified no TCP listener on port 3000 and no Node, FFmpeg, or FFprobe process remained. The next full user render is still needed to confirm the reduced console flashing. |
| 19 Oct 2026 | Reduced Windows Command Prompt flashes during local rendering. The studio worker now hides consoles for child processes, FFmpeg/FFprobe checks explicitly request hidden windows, and Remotion reuses one Chrome process across composition, still frames, and encoding. | `npm run typecheck` and `npm run build:studio` passed. With the worker preload, six stills and a 2-second H.264/AAC sample rendered successfully. The next full user render will confirm the desktop behavior. |
| 19 Oct 2026 | Enlarged and animated diagram objects, added continuous flow and progress motion, selected water-cycle symbols for matching user ideas, made captions use the full frame width, and added re-render from the Video screen. Re-rendered the approved water-cycle example without changing its copy. | `npm run typecheck`, `npm test` (32 passing), and `npm run build:studio` passed. A failed caption layout was corrected and retried through the UI; the resulting MP4 plays in the Video step. FFprobe confirmed 72.043 seconds, 1080 × 1920, H.264/AAC. |
| 19 Oct 2026 | Made the main Video step open the render/player instead of the old captions-only storyboard concept. Moved the concept to `/video/concept`, updated flow links, and added a real video-frame poster so the player is visible before playback. | `npm run build:studio` passed; browser check confirmed the main Video route shows the ready MP4 and thumbnail. |
| 19 Oct 2026 | Connected approved storyboard snapshots to a local fixture render worker, real job progress/retry, in-page MP4 playback, and download. Chrome is preferred over Edge for Remotion on this machine after Edge failed to launch. Added `docs/TECH_STACK_AND_ROADMAP.md`. | `npm run typecheck`, `npm test` (31 passing), and `npm run build:studio` passed. Browser-created job completed and played; FFprobe confirmed 72.043-second 1080 × 1920 H.264/AAC output. |
| 19 Oct 2026 | Added Instagram connection-needed and reconnect UI examples from Publish review. No account authorization occurs. | `npm run build:studio` passed; browser checked both states and return to the saved caption draft. |
| 19 Oct 2026 | Added a local generation-state preview for progress, failure, retry, cancellation, and completion. It does not create a job or video. | `npm run build:studio` passed; isolated browser walkthrough verified all states and reset on reload. |
| 19 Oct 2026 | Added Publish planning preview, including editable browser-saved caption, post concept, readiness checklist, and disabled delivery actions. | `npm run build:studio` and `npm run typecheck:studio` passed; isolated browser caption save/reload and blocked publishing controls checked; desktop layout inspected. |
| 19 Oct 2026 | Added the Video concept review screen and linked it from an approved storyboard. Playback, scrubbing, and scene selection use approved storyboard timing. | `npm run build:studio` passed; browser navigation, scene selection, playback, and mobile layout checked. |
| 19 Oct 2026 | Created the shared development tracker from the current repository state. Recorded the local studio through storyboard review and the separate fixture pipeline. | Repository routes, README, and `PROTOTYPE_STATUS.md` reviewed; prior studio build and browser walkthrough passed. |





