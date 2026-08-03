// -----------------------------------------------------------------------------
// value-prop.js
//
// Scroll-linked "reading reveal" for the homepage value-proposition
// statement (between the hero and the case-study grid): each word starts
// dimmed and brightens to full opacity in reading order as the section
// scrolls through the viewport, tied directly to scroll position via GSAP
// ScrollTrigger — already loaded on this page for the hero logo's scroll
// nod, see hero-logo.js, so this adds no new dependency.
//
// Progressive enhancement only: the paragraph is plain, fully-readable text
// in the DOM. This just wraps it into per-word spans and animates their
// opacity; no JS (or prefers-reduced-motion) leaves the plain paragraph at
// full opacity, same as hero-logo.js's fallback philosophy.
// -----------------------------------------------------------------------------

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DIM_OPACITY = 0.25; // unread-word opacity — dim but still legible, not invisible

function init() {
  const section = document.querySelector('.value-prop');
  const textEl = document.getElementById('valuePropText');
  if (!section || !textEl) return; // no-op on pages without this section

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const words = textEl.textContent.trim().split(/\s+/);
  textEl.innerHTML = words.map((word) => `<span class="vp-word">${word}</span>`).join(' ');
  const wordEls = textEl.querySelectorAll('.vp-word');
  const total = wordEls.length;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: section,
    start: 'top 80%',
    end: 'bottom 45%',
    scrub: 0.4, // light smoothing lag — snappier than the hero logo's scrub:1 since text should feel directly tied to scroll
    onUpdate(self) {
      // Each word gets an equal 1/total slice of the scroll range to
      // transition across, in reading order, so brightening reads as a
      // wave sweeping left-to-right/top-to-bottom rather than a hard cutoff.
      const progress = self.progress * total;
      wordEls.forEach((el, i) => {
        const wordProgress = Math.min(Math.max(progress - i, 0), 1);
        el.style.opacity = DIM_OPACITY + wordProgress * (1 - DIM_OPACITY);
      });
    },
  });
}

init();
