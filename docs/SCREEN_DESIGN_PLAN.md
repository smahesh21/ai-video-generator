# drishvo.co.in — Application screen review set

Date: 19 October 2026
Status: 24 desktop screens and 8 mobile counterparts generated in Stitch for user review. No application implementation or deployment in this task.

Project: https://stitch.withgoogle.com/projects/9707707560622243758
Selected homepage: Night Signal — Obsidian Glass (`cb6d5a3fd08b485cb88f06f27bc7baba`)
Application design system: `assets/8aaa9dc9c7bd4fa0a37aa6ac06b148f5`
Canonical guidelines: [DESIGN.md](../DESIGN.md)

## Mandatory consistency

Every visible button must be exactly 32px high, including dialog, icon, disabled and loading states. Every page header must be 56px total with 12px vertical and 16px horizontal padding, border-box. Use inset dividers to preserve a 32px inner row. The four-step strip sits below the header. These values override provider defaults. Glass framing uses mostly opaque reading panels.

## Desktop review screens

| Screen | Stitch screen ID |
|---|---|
| D01 — Sign in | `63d8135256ec44efb14a6063d42f99e9` |
| D02 — Project library | `bf88cef6df8244e38238f9c66fde5df8` |
| D03 — Empty library | `236b7faf477f438eb8cefbf9e7979d05` |
| D04 — Idea workspace | `f563f8fb18e549619560c41cc01a089f` |
| D05 — Brainstorm conversation | `576b89cc04374a118446e98a12166e40` |
| D06 — Settings and Instagram connection | `3e6104f3888440e98773794d6fb46c55` |
| D07 — Storyboard review | `01b334e480864f65bbdb41c7cbc90b7c` |
| D08 — Storyboard revision review | `3a53b521e0ec416f8f0f1e280c60f0d9` |
| D09 — Generating video | `ed74beed01a54468b488d3c31f4ca4e1` |
| D10 — Video review | `d1ce542f9f7042fab92a9eea2dd8f144` |
| D11 — Caption correction | `f4d4e62081934a1c8e56d31561373f4a` |
| D12 — Video revision and history | `7c7643dbc1804f17b5ca367c1b509903` |
| D13 — Publish connection needed | `6f72854608584e99ae1a6f6bef29cacd` |
| D14 — Publish review | `0f722aaabfe846de9f606f1cda2b6860` |
| D15 — Schedule confirmation | `a26f46dcb7924d068bda2cc428f2a5df` |
| D16 — Scheduled delivery details | `b13bbb8a2730414599ceae1cb26684af` |
| D17 — Published confirmation | `9972edc5693b4fcb9ecb88aa85ec20f2` |
| D18 — Publishing and uncertain outcome | `6c6ac80c7c324cbfb444ed63c9154d48` |
| D19 — Generation failed | `b7e81042d470441a9231fd47dca821ae` |
| D20 — Unsaved draft and conflict | `9415f44a7b6a4030aa6353dc3b53cca6` |
| D21 — Instagram reconnect required | `009b5be1d04c4a4e9bfdd11701a077f9` |
| D22 — Cancel schedule and delete project | `ab5d0e7691694b65a2995eac988da294` |
| D23 — Session expired | `879bf22c5021445d8920a79ccd47f14a` |
| D24 — Project unavailable | `0c1b314b290e4c898732580fe18dd0fd` |

## Mobile review screens

Use these revised mobile IDs; earlier M01–M08 drafts are preserved in Stitch. Mobile layouts target 390 CSS pixels.

| Screen | Latest review screen ID |
|---|---|
| M01 — Mobile sign in | `39d41bf95ae14ce78dce901f3cf14d2e` |
| M02 — Mobile project library | `d03e4533d4314133bc2442510410eedc` |
| M03 — Mobile idea workspace | `9913c307f3ce42a0acbb4f8e5379bf4d` |
| M04 — Mobile storyboard review | `fbcb4f611c04434fbc3a6e4f4875f2b1` |
| M05 — Mobile video review | `86033c39cddb4d2e8b4157cecd176522` |
| M06 — Mobile publish review | `4800585a94a14fd6938560117b7b0d8e` |
| M07 — Mobile schedule confirmation | `89de11d0364e481ca5eaecbd4ce65235` |
| M08 — Mobile settings | `2599f31524d04f7eb0bb11b9f576c2fe` |

## Review and QA notes

- All D01–D24 and M01–M08 screen identities were verified from Stitch results/inventory. A publishing request returned a transport error, but all six publishing screens were subsequently verified present; no duplicate generation was submitted.
- Generated HTML was inspected for desktop controls and mobile/header styles. Targeted geometry corrections were applied to D01, D04, D05, D07, D12, D13, D14, D15 and D19; D22/D24 header and control corrections also completed. Mobile drafts received a copy and geometry cleanup.
- This is a design review set, not a pixel-certified production interface. Browser interaction, focus, touch target spacing, full responsive behavior and contrast need final implementation verification.
- Before coding, replace remaining desktop placeholder narrator names with configured voice labels, simplify technical copy/telemetry, and reconcile any generated examples with the PRD. Mock account names, video results and publishing status are illustrative, not evidence of live integrations.

## Product boundaries

Four steps: Idea → Storyboard → Video → Publish. No separate script approval screen. No billing, public signup, team workspace, analytics suite, provider keys or developer settings. Recovery preserves earlier output; uncertain publication cannot offer blind repost. English educational videos use 9:16 and 60–90 seconds.

## Suggested review order

Start with D02, then D04 → D07 → D10 → D14. Review the supporting dialogs, generation/revision and recovery states next. Finish with M01–M08. Keep the original homepage direction. Coding follows user screen review.


