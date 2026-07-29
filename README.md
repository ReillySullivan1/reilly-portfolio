# Reilly Sullivan — Portfolio

A hand-built static portfolio. No build step, no framework — just HTML, CSS, and a little JavaScript. Open it, edit it, host it anywhere.

## Pages
- `index.html` — Home (animated "R" hero + featured work)
- `projects.html` — Projects catalog (filterable by discipline)
- `resume.html` — About / Resume
- `work-omakase.html` — Case study: Omakase Art Collective
- `work-usfws.html` — Case study: U.S. Fish & Wildlife Service
- `work-sdc.html` — Case study: Street Dog Coalition
- `work-transportation.html` — Case study: Transportation Website

## Shared files
- `styles.css` — all styling, layout, color, typography, and animations (edit once, updates every page)
- `app.js` — scroll-reveal animations + the Projects filter (loaded on every page)
- `assets/` — all images (WebP), the animated hero, favicon, and logos

## Preview it
Double-click `index.html` to open it in your browser. Every page links to the others, so you can click through the whole site. Refresh the page after edits to see changes.

_(For live auto-reload while editing, the "Live Server" extension for VS Code is handy — optional.)_

## Design system (quick reference)
- **Type:** Geist (neutral grotesque), with Helvetica Neue as the fallback. Controlled by `--font-body` / `--font-display` at the top of `styles.css`.
- **Color:** one neutral grey ramp — page `#fbfbfb` → surface `#efefef` → panel `#e9e9e9` → border `#e2e2e2`, with ink tones `#141414` / `#3a3a3a` / `#5f5f5f` / `#a6a6a6`. All defined as CSS variables at the top of `styles.css`.
- **Motion:** deliberately subtle — scroll-reveal fade-ups, staggered cards, hover lifts, a nav entrance. Everything is wrapped in `prefers-reduced-motion` so it disables for visitors who prefer less motion.

## Host it
Drag the whole folder onto [Netlify Drop](https://app.netlify.com/drop), or push it to GitHub and turn on GitHub Pages. Keep every file together (the pages rely on `styles.css`, `app.js`, and the `assets/` folder sitting alongside them).
