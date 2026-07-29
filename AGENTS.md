# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> `CLAUDE.md` is a symlink to this file (`AGENTS.md`) — edit one, both update.

## What this is

**Arco** — a single-screen mobile PWA that models a user's daily hormone curves
(cortisol / melatonin / testosterone), runs a supplement-deficiency "diagnosis" from a
lifestyle questionnaire, and lays out a personalised dosing protocol across time-of-day
windows. Pure static front-end, no backend, no API calls.

## The one thing to know: Astro is scaffolding, not the app

The repo looks like an Astro project but **Astro is deliberately bypassed**. `src/` is
empty and `vercel.json` overrides the build to serve `public/` verbatim
(`buildCommand: "echo done"`, `framework: null`). Git history is explicit about this
("bypass astro build", "remove astro index", "serve public folder directly").

**The entire app is `public/index.html`** — ~1730 lines of inline HTML + CSS (`<style>`)
+ JS (`<script>`), all in one file. Essentially every change happens there. Do not
reintroduce an Astro build, add framework components, or move logic into `src/`.

Ignore the generic Astro/`astro dev` advice that framework tooling generates — it does
not describe how this app builds or ships.

## Commands

- **Preview locally:** serve the `public/` folder over HTTP (e.g. `npx serve public` or
  `python3 -m http.server -d public`) and open the root. A service worker + PWA manifest
  are involved, so prefer a real HTTP server over opening the file directly.
- **Deploy:** push to `main`. Vercel auto-deploys, serving `public/` with no build step.
- **`deploy.sh`** is the author's own flow and will overwrite your work:
  it copies `~/Downloads/arco-prototype.html` → `public/index.html`, then commits and
  pushes. If that file is the real source of truth for a session, edits made directly to
  `public/index.html` get clobbered on the next `deploy.sh` run. Confirm which file the
  user is treating as canonical before editing.

## Architecture inside public/index.html

**Screens & navigation.** Three DOM screens — `screen-onboard`, `screen-loading`,
`screen-dash` — toggled by `showScreen(id)` (only one has `.active`). The bottom nav does
*not* switch screens; `switchTab(tab, el)` stays on `screen-dash` and re-renders
`#dash-body`'s innerHTML for each tab (today / protocol / learn / progress / profile).

**Domain logic (the substance of the app):**
- `CURVES` + `getHormones(h, p, mod)` — hormone models over a 24h clock, modulated by
  wake time, sleep quality, stress, age, training/caffeine timing.
- `getPhase`, `arcScore`, `arcLabel` — recovery-state scoring and its label.
- `runDiagnosis(p)` — the deficiency engine. Per-supplement risk scores (vitamin D,
  magnesium, omega-3, creatine, zinc, B12, ashwagandha) accumulated from diet, meds,
  training load, season, stress, etc., each with an evidence badge
  (`HIGH` / `MODERATE` / `CONTRAINDICATED`).
- `getWindows(p)` / `getWindowsSimple` — derive dosing time-windows from the user's
  wake / work / training schedule.
- `drawClock(h)` — canvas radial 24-hour clock rendering phases + supplement dots.
- `buildDash`, `buildSchedule`, `showProtocolTab`, `showProgressTab`, `showProfileTab` —
  the per-tab render functions.
- Onboarding: the `steps[]` array drives `renderStep()` with chip-based inputs.
- Daily check-ins: `DAILY_QUESTIONS`, streak logic (`getStreak`), week row rendering.

**State.** `profile` and `checkins` persist in `localStorage` (`arco-profile`,
`arco-checkins`), all reads/writes wrapped in try/catch. On load the app bootstraps a
demo "Cons" profile: a complete saved profile jumps to the dashboard, otherwise it seeds
the demo profile and shows the diagnosis.

**PWA.** `sw.js` (cache `arco-v2`, network-first for HTML so refreshes get the latest
build, cache-first for assets), `manifest.json`, and `icons/`. Bump the cache name in
`sw.js` when you need to force asset invalidation.

## Conventions

- Keep it one self-contained static file. No framework, no bundler, no build step.
- The JS is written dense (short names, minimal whitespace, inline styles in template
  strings). Match that style rather than reformatting existing code.
- Functional/wellness framing only — no disease/treatment/cure claims. Dose ranges and
  evidence badges are research-associated, not medical promises.
- After a non-trivial change, load `public/index.html` in a browser and confirm it still
  renders before committing.
