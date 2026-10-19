# Design System: drishvo.co.in — Obsidian Glass
Date: 19 October 2026
Status: Selected design baseline, approved by the user on 19 October 2026.
Stitch project: https://stitch.withgoogle.com/projects/9707707560622243758
The existing Mineral Studio designs remain separate alternatives.

## 1. Visual Theme & Atmosphere
Dark creative studio: composed, precise, futuristic and professional. Glass expresses depth without making content difficult to read. Use Obsidian Glass: a restrained asymmetric split hero, narrow frosted navigation, and a vertical video preview with a separate storyboard excerpt.

## 2. Color Palette & Roles
Canvas #171C19; surface #232B26; text #F2F5EE; supporting text #B4BFB6; structural borders #49564D; single decorative accent #C0D975. Primary buttons use lime with #171C19 text. Frosted panels use rgba(35,43,38,0.78–0.90), fine translucent white edges, soft shadows and subtle ambient lime illumination behind them. No teal, purple, rainbow or neon accents. Reading surfaces remain mostly opaque; supply solid surface fallback. Semantic status colors must have text labels and separate contrast validation.

## 3. Typography Rules
Space Grotesk 500/600 display; Geist 400/500 body and controls. Display 36–64px responsive, tight controlled tracking; body 16px with 1.5–1.6 leading; labels 14px. Keep text lines below roughly 65 characters. Tabular figures for durations. No Inter or serif dashboard typography.

## 4. Component Stylings
Glass nav and product-preview frames, not every element. Blur 16–24px, restrained edges, no outer glow. Controls have 6–10px corners. Buttons have an exact 32px visible height; touch hit areas can extend invisibly without changing that height. Preview surfaces use 14px corners. Inputs have visible labels and focus states. One primary action per section. Loading/error/empty states preserve readable content and use honest progress.

## 5. Layout Principles
1200px content grid; spacing 4/8/12/16/24/32/48/64/96px. Left-led asymmetry, clear separate zones, no overlap. No generic three-equal-card feature row. Below768px collapse multi-column sections to one column without overflow. Product motif is a storyboard and a vertical9:16 educational-video concept, not unrelated stock imagery.

## 6. Motion & Interaction
120–180ms control feedback; 220–320ms transitions. Animate transform and opacity, not layout or large blur layers. Active progress may animate; idle decorative panels remain still. Honor reduced motion and preserve clear focus. Glass has an opaque fallback for unsupported or constrained environments.

## 7. Anti-Patterns & Product Boundaries
No neon, pure black, gradient headlines, glass-text effects, chrome spheres, sparkle/robot imagery, tiny low-contrast copy or floating card piles. No fabricated metrics, endorsements, pricing, public signup or technical implementation jargon. Keep drishvo.co.in branding and Open studio CTA. Concept previews are labeled. The creator workflow remains Idea → Storyboard → Video → Publish. Visual revisions require regeneration; do not claim instant changes to already-rendered video. These are design concepts, not deployed application features.
## Approved reference and next scope
Stitch screen: projects/9707707560622243758/screens/cb6d5a3fd08b485cb88f06f27bc7baba
Title: Night Signal — Obsidian Glass
This selection supersedes Mineral Studio as the application design direction. Earlier studies are retained as references. Apply this visual system to subsequent homepage refinement and application screens while retaining the PRD workflow. The generated-video visual style is a separate system and is not changed by this application-theme selection. Design approval does not establish that depicted integrations are implemented.

## Required control and header dimensions
User requirement, 19 October 2026. These dimensions take precedence over earlier exploration defaults and must be included in future Stitch prompts and implementation reviews.

- All buttons have a consistent visible height of exactly 32px, including primary, secondary, ghost, destructive, icon-only and loading/disabled buttons, on every screen and viewport. Do not introduce taller hero or mobile button variants.
- Use border-box sizing: height, min-height and max-height 32px. Borders and padding are included in this height. Center content with inline-flex; keep labels to one line. Default horizontal padding 12px; icon-only buttons are 32px by 32px. Loading states preserve dimensions.
- Every page/app header has a total height of exactly 56px and padding 12px 16px (vertical horizontal), with border-box sizing. This leaves a 32px content row. Vertically center the logo, navigation and buttons; keep navigation to one row and collapse it into a menu on narrow screens.
- Use an inset shadow or separate non-layout divider for a header edge so a border does not reduce the 32px inner row. An open mobile menu is a separate region, not an increase to header height.
- On touch interfaces, an invisible hit area may extend beyond the 32px visible button, with enough spacing to prevent overlapping targets. Do not enlarge the visible button or header to accomplish this.
- Verify these dimensions for all button states and across homepage, dashboard, idea, storyboard, generation, video review, publishing and settings screens before accepting a design.

```css
:root {
  --button-height: 32px;
  --header-height: 56px;
  --header-padding-y: 12px;
  --header-padding-x: 16px;
}
```