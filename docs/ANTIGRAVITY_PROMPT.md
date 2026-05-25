# Antigravity design prompt — DataPulse

Copy everything inside the fenced block below into Antigravity when you want it to refine or extend this UI.

---

```
Project: DataPulse — AI-assisted CSV cleaning (hackathon demo)
Stack: Next.js 16, React 19, Tailwind v4, shadcn/ui, Lucide icons only where needed

## Product goal
A three-step flow: Upload → Review AI findings → Export clean file + audit JSON.
The user must feel in control (accept/skip per issue), not handed a magic black box.

## Design direction (anti–“AI slop”)
Do NOT use: purple/indigo gradients, Inter font, glassmorphism cards, floating orbs, 
“revolutionary” copy, 6+ feature cards with identical icons, neon glows, or centered 
hero with giant gradient headline.

DO use:
- Warm paper background: #f8f7f4 (stone-50 warmth)
- Single accent: deep teal #0f5c5c / teal-800 for CTAs and active states
- Typography: IBM Plex Sans (UI), Source Serif 4 (headlines only) — editorial, not startup-generic
- Subtle ambient gradients: two low-opacity radial blobs (teal top-right, warm ochre mid-left), fixed behind content, never full-screen rainbow
- Borders: stone-200 at ~80% opacity; shadows very light (1–2px blur, low alpha)
- Rounded corners: xl–2xl on cards, lg on buttons
- Monospace for filenames and column badges

## Layout & responsiveness
- max-width container: 72rem (max-w-6xl), px-4 sm:px-6 lg:px-8
- Sticky top nav with backdrop-blur and warm bg at 85% opacity
- Home page is ONE scrollable document with anchor sections:
  1) Hero + upload card (2-column from md: 5/7 split)
  2) Features — exactly 3 minimal cards, no icons required
  3) How it works — 4 numbered steps, vertical timeline
  4) Soft footer CTA “Back to upload”
- Issues page: 2-column issue cards on md+, fixed bottom bar for “Apply fixes”
- Export page: stats row (3 cols) + download buttons + sidebar change log
- Mobile: stack columns, full-width buttons, touch-friendly 40px+ tap targets

## Components to preserve
- Step indicator: 3 tabs “1 · Upload | 2 · Review | 3 · Export”, active step gets teal-50 bg + bottom border
- Upload: dashed drop zone, CSV/XLSX pills, loading spinner with rotating status text
- Issue cards: column badge (mono), issue type pill (muted semantic colors), confidence bar, Accept/Skip
- Trust line under hero: “Nothing stored server-side” + “~10s typical run”

## Color tokens (CSS variables / Tailwind)
--background: warm off-white oklch(0.98 0.006 85)
--primary: teal oklch(0.42 0.07 195)
--foreground: stone-900 oklch(0.22 0.02 55)
Issue badge semantics: format=teal, null=stone, type=amber, duplicate=orange, outlier=sky

## Motion
- Prefer CSS transitions (150–200ms) on hover borders/shadows
- Loading: simple border spin, no skeleton shimmer grids
- Optional: subtle ping on logo dot only

## Copy tone
Direct, short sentences. Example headline: “Messy spreadsheets, fixed in one pass”
Avoid: “Powered by cutting-edge AI”, “Transform your data journey”, exclamation marks.

## Deliverables if generating new screens
Match existing pages: / (home), /issues, /export
Keep localStorage keys: dp_issues, dp_filename, dp_audit
API: POST localhost:8000/apply, GET localhost:8000/download/{filename}

## Reference files in repo
- components/layout/site-shell.tsx (nav, footer, ambient bg)
- components/layout/step-indicator.tsx
- app/page.tsx, app/issues/page.tsx, app/export/page.tsx
- app/globals.css (design tokens)
```

---

## Quick usage

1. Open Antigravity with this repo (or paste the prompt above).
2. Ask: *“Polish the DataPulse home page using this design system; keep features to 3 cards and preserve the upload flow.”*
3. For new screens, append: *“Use the same warm paper + teal accent; no purple gradients.”*

## What changed in this implementation

| Area | Choice |
|------|--------|
| Palette | Warm `#f8f7f4` + teal accent (replaced indigo) |
| Type | Source Serif 4 headlines + IBM Plex Sans body |
| Home | Scrollable sections: hero/upload, features×3, how-it-works, CTA |
| Shared | `SiteShell`, `SiteNav`, `StepIndicator`, `getIssueBadgeClasses` |
| Feel | Light borders, corner radials, restrained copy |

Run locally: `npm run dev` → http://localhost:3000
