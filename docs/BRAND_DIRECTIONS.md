# drishvo.co.in — Brand directions
Date: 19 October 2026
Status: Historical exploration. Night Signal — Obsidian Glass was selected on 19 October 2026. See ../DESIGN.md for the active baseline; the recommendations below describe the earlier exploration.
Scope: Historical brand and interface exploration. The current application review set is documented in [UI_DESIGN.md](UI_DESIGN.md).

## Brand foundation
A thoughtful video studio that makes complex ideas clear. Personality: capable, creative, precise and approachable. Futuristic character comes from purposeful motion, frame-based compositions and crisp typography rather than neon effects.

Use the exact lowercase name **drishvo.co.in**. The domain suffix may be visually quieter but must remain legible. Use a typographic wordmark for the first study; a custom mark remains exploratory, not finalized. Candidate mark: a simple open frame with a distinctive cut, suggesting a scene. Avoid generic play-triangle, sparkle and robot symbols.

Brand promise: “Turn what you know into a video worth watching.” This is draft messaging, not a claim of validated output quality. Show actual reviewed product examples when available; label conceptual studies and silent demonstrations accurately.

## Direction A — Mineral Studio (recommended)
A bright, calm creative workspace with a deep teal accent. Best balance of professional polish, comfortable editing and creative identity. Use asymmetric composition and storyboard details to avoid a generic enterprise look.

| Role | Color |
|---|---|
| Main canvas | #F4F6F5 |
| Raised surface | #FFFFFF |
| Main text | #202725 |
| Supporting text | #596560 |
| Decorative divider | #D8E0DC |
| Accent / primary button | #16766A |
| Accent hover | #115E55 |
| On-accent text | #FFFFFF |
| Subtle selection fill | #E4F0EC |

Typography: Geist 500/600 for headlines; Geist 400/500 for interface and body. Controlled negative tracking on large headings. One family keeps the experience coherent.
Shape: 10px button/input corners; 16px preview surfaces. Flat buttons, quiet borders, minimal elevation.
Motif: a sequence of simple scene frames with one teal focal frame. Offset content without overlapping it.
Motion: short, purposeful frame reveals and a subtle change of emphasis as narration progresses. No idle floating cards.
Risk: excessive pill shapes or green-tinted surfaces could make it feel like generic productivity software. Keep most surfaces neutral and let real visual explanations provide personality.

## Direction B — Night Signal
A charcoal creative studio with a muted lime accent. Most futuristic option. Intended as a fixed dark study, not an automatic dark version of Direction A.

| Role | Color |
|---|---|
| Main canvas | #171C19 |
| Raised surface | #232B26 |
| Main text | #F2F5EE |
| Supporting text | #B4BFB6 |
| Decorative divider | #49564D |
| Accent / primary button | #C0D975 |
| Accent hover | #D0E69A |
| On-accent text | #171C19 |
| Subtle selection fill | #303B29 |

Typography: Space Grotesk 500/600 for display; Geist 400/500 for interface. Use tabular figures for duration and scene numbers; monospace is optional for compact timing labels only.
Shape: 6px button/input corners; 10px panels. Clear divisions and strong alignment, without a dense cockpit.
Motif: framed scenes, indexing and deliberate contrast. Lime appears on the main action and selected moments, never on every border.
Motion: transform/opacity-based scene reveals; precise progress feedback during active work. No neon glow or scanning overlays.
Risk: can feel like a developer tool or game interface. Keep technical information out of creator flows and give content generous space.

## Direction C — Paper Ember
A warm editorial direction with a restrained burnt-orange accent. Most approachable and distinctive for educators and independent creators; less overtly futuristic.

| Role | Color |
|---|---|
| Main canvas | #F7F4EE |
| Raised surface | #FFFCF7 |
| Main text | #302722 |
| Supporting text | #6D5F56 |
| Decorative divider | #E1D8CD |
| Accent / primary button | #B94F34 |
| Accent hover | #963E29 |
| On-accent text | #FFFFFF |
| Subtle selection fill | #F4E7DE |

Typography: Outfit 500/600 for headings and wordmark; Geist 400/500 for body and interface. Keep the software UI sans-serif.
Shape: 8px button/input corners; 12px preview surfaces. Prefer editorial rules and whitespace over enclosing everything in cards.
Motif: large but controlled typography, scene strips and restrained diagram illustrations. No paper texture is necessary.
Motion: brief scene-to-scene transitions and tactile button feedback.
Risk: can feel like an editorial publication rather than a creative tool. Future homepage should clearly demonstrate the video workflow.

## Shared visual rules
### Color
- Choose one direction as a complete system. Do not combine all three accent colors.
- Approximate composition: 85–90% neutral surfaces, 5–10% text/structure, up to 5% strong accent; content imagery can carry its own colors.
- Accent is for primary action, selection and limited emphasis. Do not make entire dashboard regions saturated.
- Error, warning and success colors are functional exceptions, not secondary decorative accents. Pair state color with a label/icon. Define and contrast-test these for the selected theme.
- Avoid gradient headlines, purple/blue neon glows, pure-black canvases and multiple competing accent buttons.
- Divider colors are decorative, not guaranteed sufficient for identifying an input boundary. Inputs and focus indicators need separate contrast checks.

### Typography
- Marketing display: responsive 36–64px, 1.05–1.12 line height, about -0.025em tracking.
- Application page title: 28–32px, 1.2 line height.
- Section title: 20–24px, 1.3 line height.
- Body and editable inputs: 16px, 1.5–1.6 line height.
- Controls/labels: 14px, medium weight; metadata: 12–13px where nonessential.
- Keep prose around 55–65 characters per line. Use sentence case and brief labels.
- Limit weights to 400, 500 and 600 in production unless a concrete need justifies another.
- The comparison studies load fonts remotely; the chosen production fonts should be packaged locally, with license files retained and actual fallback/layout behavior verified.

### Layout
- Shared spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 and 96px.
- Marketing content width around 1200px; app workspace can expand around a central readable editor and preview.
- Use a clear grid and consistent alignment. One dominant focal area per section.
- Asymmetric, left-led homepage composition; steady predictable navigation and editing layout inside the app.
- Avoid a centered oversized slogan above three identical feature cards.
- Use cards for genuine objects such as projects and scene previews; use dividers/whitespace for ordinary content.
- Below 768px, multi-column studies collapse to one column. No horizontal overflow or text/image collisions.

### Components and states
- Primary button: solid accent, exactly 32px visible height, 14–16px medium text. Touch hit areas may extend invisibly with sufficient spacing; this later user requirement overrides the original exploratory sizing. One primary next action per workflow step.
- Secondary actions: quiet outline or text treatment with clear focus state.
- Inputs: label above, helper text below, inline error near the relevant field; no placeholder-only labels.
- Focus: visible 2px ring with offset; test contrast against the adjacent surfaces.
- Disabled state: visibly unavailable and accompanied by a prerequisite explanation when useful.
- Project/scene cards: meaningful preview, concise title and explicit state; no decorative card pile.
- Loading: skeleton only while content is genuinely unknown; real stage names and measured rendering progress once known.
- Empty state: one specific starting suggestion and the action needed to create the first video.
- Error: explain what happened, preserve work and offer the correct next action.
- No fake customer logos, reviews, metrics, credits, billing prompts or working integrations.

### Motion
- Micro-interactions: 120–180ms; panel/scene transitions: 220–320ms.
- Animate transform and opacity; avoid layout-changing animation.
- If springs are used, start around stiffness 100 / damping 20 and tune gently.
- At most one relevant ambient demonstration at a time, with pause control for longer automatic motion.
- Keep idle dashboard elements still. Loop only where active progress or an explicitly playable demonstration needs it.
- Respect reduced-motion preferences and keep navigation understandable without animation.
- No scroll hijacking, custom cursors, particle backgrounds or animation on every component.

### Iconography and imagery
- Use one consistent outline icon family, around 1.5–2px stroke at 20–24px.
- Icons supplement labels, especially for publishing and destructive actions.
- Main visuals should communicate the actual product: narration blocks, storyboard frames, simple diagrams and a vertical video preview.
- Avoid unrelated stock photography, generic 3D chrome spheres and fake dashboard screenshots.
- Use a vertical 9:16 frame for video content, not a landscape mockup that misrepresents the export.

### Voice and copy
- Use concise, direct language: “Create storyboard”, “Approve & generate”, “Review video”, “Schedule”.
- Explain generation waits and failures honestly. Never imply a video was published until confirmed.
- Avoid “Unleash”, “Revolutionize”, “Next-gen” and unmeasured time-saving claims.
- Keep the four-step workflow: Idea → Storyboard → Video → Publish.
- The public homepage is a design study at this stage. It does not change the internal-only release or introduce public signup.

## Accessibility checks
Calculated solid-color contrast ratios:
- Mineral Studio: white on teal ≈ 5.48:1; supporting text on canvas ≈ 5.60:1.
- Night Signal: dark text on lime ≈ 11.03:1; supporting text on canvas ≈ 9.10:1.
- Paper Ember: white on ember ≈ 4.96:1; supporting text on canvas ≈ 5.59:1.
These cover listed pairs, not the entire future interface. Verify text, inputs, focus, hover and semantic states in implementation. Use at least 4.5:1 for ordinary text and 3:1 for meaningful UI boundaries and large text. Never use color alone.

## Selection and delivery stages
1. Compare the three directions and choose one; adjust its accent intensity and typography if needed.
2. Promote the selected tokens into DESIGN.md with approved states and responsive rules.
3. Explore the homepage only, showing a realistic product demonstration and restrained motion.
4. Review the homepage at desktop and phone widths.
5. Extend approved primitives to dashboard, idea, storyboard, generation, review and publishing screens.
No final logo, production homepage, application theme change or full-screen generation is implied by this exploratory document.

