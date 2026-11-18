# Design system

Direction: **Paper threshing floor, printed in daylight.**

Winnow shares a visual language with [Lifeline](https://github.com/Prashant-thakur77/LifeLine) (MIT): warm uncoated paper,
riso-print ink overprinting slightly out of register, cut-paper depth with soft shadows, 2 px ink borders, offset ink
shadows on what you can click, and big condensed poster type. The *concept* and every graphic are Winnow's own.
Lifeline's sea becomes a threshing floor: the app separates **grain** (a roast users like) from **chaff** (one they
don't).

## The idea in one picture

A paper winnowing basket tosses grain and chaff. Three baskets sit on the floor, one per prompt variant. Votes decide
which pile of grain is tallest. Shipping the winner is pouring that basket into everyone's bag.

## Taste

- IS: **bright** (warm paper, wheat gold, signal orange, sea blue, mint), **crafted** (riso print, cut paper, kinetic
  type, all drawn for Winnow), **candid** (real numbers, simulated data always labelled), **minimal** (every graphic
  has a job).
- NEVER: childish, casino, template, cluttered. No emoji, no mascots, no stock icons, no purple gradients, no
  glassmorphism, no identical icon-card grids, no fade-up on every block.
- Motion: paper moves like paper (700–1100 ms, ease-out, no bounce). Type reveals are readable within half a second.

## Tokens (CSS variables, Tailwind 4 `@theme` if Tailwind is used, otherwise plain CSS)

| Token | Value | Use |
|---|---|---|
| `paper` / `paper-2` / `card` / `shade` | #fff7ea / #fbeedb / #fffcf5 / #f2e6d1 | Page, alternate fills, cards and inputs, skeletons |
| `ink` / `ink-2` / `body` / `muted` | #0b1533 / #24305a / #3b4568 / #5e6684 | Headlines, strong text, body, secondary |
| `line` / `line-strong` | ink at 13% / 32% | Hairlines |
| `grain` | #ffc93c | Wheat gold: the winning pile, the stats band, selection |
| `rescue` | #ff5a1f | Primary button, the one pen line, the "savage" basket |
| `sea` / `sea-deep` | #1d4bff / #0e2fb3 | The "control" basket, links, focus rings, footer |
| `mint` | #19c79a | The "actionable" basket and the grain vote |
| `chaff` | #9a8f7a | The discarded vote and chaff particles |
| `sim` | #7b5cff | Simulated data and nothing else |
| Type | Archivo (OFL, `wdth` 62–125), Martian Mono (OFL), IBM Plex Mono (OFL) | Headlines at `wdth` 70 weight 800 uppercase; body Archivo; numbers Martian Mono; roast output Plex Mono |
| Radii | 4 / 6 / 8 / 12 px | Paper corners |

Text contrast must pass WCAG AA. Orange and gold text only at large sizes or on ink.

Variant colours: `control` = sea, `savage` = rescue, `actionable` = mint. The UI never shows which variant a visitor
got; colours appear only on the results view.

## Language changes from "thumbs" to "grain / chaff"

The Flagsmith event names stay `thumbs_up` and `thumbs_down` so the metric is easy to read in the dashboard. The UI
labels are **Grain** (keep it) and **Chaff** (toss it), drawn as printed stamps, not emoji.

## Screens

1. **Hero.** Headline "Paste your README. Get roasted." in condensed uppercase, lines rising out of masks. A printed
   winnowing basket with a few paper kernels drifting in the wind. One paragraph, one primary button.
2. **Tool.** Input card (textarea, URL toggle, counter). On submit, the basket shakes: chaff (light, tan) falls away,
   grain (gold) stays, while the roast is generated. The roast appears on a paper ticket in Plex Mono.
3. **Vote.** Two stamps under the ticket: **GRAIN** and **CHAFF**. After a vote the chosen stamp presses down with its
   offset shadow, the other fades, and a line says "Thanks. Your vote helps pick the winning prompt."
4. **Gold band.** Candid stats strip (visitors, votes) read from the saved results snapshot, labelled with its date.
5. **How it works.** Three paper scenes (flag assigns a basket, you vote, the Bayesian engine picks a winner). Desktop
   may use a pinned horizontal slide; phones and reduced motion get a plain stack.
6. **Results (stretch).** Three piles of grain, each with its win probability. The tallest is the winner. Simulated data
   is always labelled with `sim`.
7. **Footer.** Paper-wave strip into deep sea, big wordmark, links to the repo, the Flagsmith project and the hackathon.

## Graphics (all made for Winnow)

- Basket, kernels, chaff, stamps, paper sheets and the sun: hand-built inline SVG with fine grain, halftone and a
  slight misregistration pass drawn **inside the SVG once**.
- The wordmark: a condensed "WINNOW" where the O is a printed sieve ring.
- Favicon: the sieve ring.

## Motion

| Name | Value | Where |
|---|---|---|
| kin-rise | 760 ms, cubic-bezier(.2,.8,.2,1), lines staggered 90 ms | Headline lines out of masks |
| shake | 900 ms ease-in-out, repeats while loading | The basket and falling chaff |
| stamp | 220 ms ease-out, then 500 ms settle | A vote pressing down |
| drift | 36–58 s linear, alternate directions | Paper sheets in the background |
| page-in | 520 ms, transform only | Route changes |

Reduced motion: every animation is cut to its end state, no pinned slide, no auto-replay.

## Smoothness rules

- Looping motion moves an HTML element holding a pre-drawn SVG, by `transform` or `opacity` only. Never animate an SVG
  child, a filter or a blend mode inside a painted layer.
- Shadows, grain and the second ink pass live inside the SVG, drawn once. No CSS `filter` or `mix-blend-mode` on anything
  that moves, and none on a full-screen grain layer.
- Native scrolling only. No scroll-jacking library, no custom cursor.
- Layout that depends on screen width is done in CSS, not a JS media query, so server rendering has the right shape.
- A loading placeholder takes the space of what replaces it.
- Check each page scrolling with the CPU throttled (2x desktop, 4x phone) before committing.

## Components

- Header: sieve-ring mark and condensed wordmark, one primary action.
- Cards: 2 px ink border on card paper. Static cards have no shadow.
- Buttons: 2 px ink border with a `3px 3px 0 ink` offset shadow that the button presses into.
- Badges: printed tags with an ink edge. Notices: tinted paper with an ink edge.

## Credit

The design language is adapted from Lifeline by Prashant Thakur (MIT). Fonts are open source (OFL). All Winnow artwork is
original.
