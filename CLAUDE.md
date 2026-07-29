# Project context

Static personal portfolio — plain HTML/CSS/JS, **no build step, no framework**. Edit files directly; the site must keep working when opened via `index.html` in a browser.

## Structure
- **Pages (7):** `index.html` (home), `projects.html` (filterable catalog), `resume.html` (about/resume), and four case studies: `work-omakase.html`, `work-usfws.html`, `work-sdc.html`, `work-transportation.html`.
- **`styles.css`** — ALL styling for every page. Anything visual is edited here; it cascades to all pages.
- **`app.js`** — shared JS loaded on every page: a scroll-reveal IntersectionObserver (`.reveal` elements) and the Projects filter.
- **`assets/`** — WebP images, the animated hero (`hero-r.webp` + `hero-r-poster.png`), `favicon.png`, logos.

## Conventions to follow
- **Typography:** Geist (neutral grotesque) via `--font-display` / `--font-body`. Target look: clean, tight, Helvetica-like editorial landing page. **No serifs.**
- **Color:** use the CSS variables at the top of `styles.css` (`--bg`, `--surface`, `--panel`, `--border`, `--ink`, `--ink-2`, `--muted`, `--faint`). Don't hardcode new greys.
- **Motion:** keep animations **subtle**, and always add a `@media (prefers-reduced-motion: reduce)` rule that disables anything new. Existing patterns: `.reveal` (scroll fade-up), staggered `.case` reveals, `.case-link` hover lift, nav entrance.
- **Responsive:** breakpoints at 860px and 560px collapse the multi-column layouts (splits, meta, stats, grid) and stack the nav. Test narrow widths after layout changes.
- **Line length:** body copy is capped via `--measure` (~68ch) — keep long-form text readable.

## Next ideas (not yet done)
- Nudge the type finer toward the tight neutral-grotesque landing-page reference.
- Build a higher-fidelity "liquid glass" animation for the hero "R" (currently an animated WebP at `assets/hero-r.webp`).
