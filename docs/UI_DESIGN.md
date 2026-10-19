# UI design documentation — drishvo.co.in

The application design set is ready for review in [Google Stitch](https://stitch.withgoogle.com/projects/9707707560622243758). It contains 24 desktop screens and 8 mobile counterparts, in addition to the earlier homepage explorations.

## Approved direction

**Night Signal — Obsidian Glass** remains the approved baseline. Mineral Studio and Paper Ember are historical alternatives, not replacement themes. The brand comparison preview includes Mineral Studio as an exploratory selection; it does not supersede the explicit Obsidian Glass approval.

- Canvas: `#171C19`; surfaces: `#232B26`.
- Main text: `#F2F5EE`; supporting text: `#B4BFB6`.
- Borders: `#49564D`; primary accent: `#C0D975` with `#171C19` text.
- Headings: Space Grotesk 500/600. Body and controls: Geist 400/500.
- Smoked glass on navigation and preview framing; mostly opaque reading surfaces.
- Every visible button: **32px** high, including icon and dialog controls.
- Every page header: **56px** total, with **12px 16px** padding and border-box sizing. Workflow indicators sit below it.

## Design documents

| Document | Purpose |
|---|---|
| [Canonical design system](../DESIGN.md) | Approved palette, typography, layout, components and dimensions |
| [Screen inventory and review notes](SCREEN_DESIGN_PLAN.md) | D01–D24 desktop and latest M01–M08 mobile IDs, QA limits and review order |
| [Stitch design history](STITCH_DESIGNS.md) | Project reference, homepage alternatives and application generation record |
| [Night Signal studies](NIGHT_SIGNAL_DESIGN.md) | Dark glass explorations and selected direction |
| [Brand directions](BRAND_DIRECTIONS.md) | Historical comparison of Mineral Studio, Night Signal and Paper Ember |

## Screen coverage

The main flow is **Idea → Storyboard → Video → Publish**, without a separate script-approval step. Supporting screens cover sign-in, project library and empty state, brainstorming, settings, storyboard revisions, generation progress, caption corrections, version history, Instagram connection, scheduling, published confirmation and safe error recovery.

Mobile counterparts cover sign-in, library, idea, storyboard, video review, publish review, schedule confirmation and settings. Earlier mobile drafts remain in Stitch; use the latest IDs in the inventory.

## Review status and implementation boundary

The Stitch screens were approved as a build reference. The local library, Idea page, storyboard review, fixture render job/player, separate timed storyboard concept, generation-state simulation, Publish planning preview, and Instagram connection-state preview have been implemented. The main Video step opens the real local MP4 render/player; the captions-only storyboard concept is a clearly labeled secondary screen. The MP4 contains schematic motion graphics with silent synthetic timing. Mock account identities and publication results still illustrate states rather than working integrations. Billing remains deferred.

Review D02 first, then D04 → D07 → D10 → D14, followed by supporting states and mobile screens. Reconcile generated placeholder copy with the PRD and verify responsive layout, accessibility and exact dimensions as each screen is implemented. The local storyboard preview records revisions and approval in browser storage. Live voiceover, production rendering infrastructure, and hosted persistence are still future milestones.



