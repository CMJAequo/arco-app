# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> `CLAUDE.md` is a symlink to this file (`AGENTS.md`) — edit one, both update.

## What this is

**Arco** — a single-screen mobile PWA about **sleep**. It asks a short questionnaire, then
each day surfaces **one** evidence-graded "lever": a behavioural or supplement factor that
plausibly affects this user's sleep, with its effect size, mechanism, citation and fixes.

It is aimed at evidence-literate UK professionals aged roughly 24–40. Credibility is the
entire product — one overclaim a user can disprove costs more than a dozen boring true
statements.

**It deliberately has no sleep score, no grade, no streak, no tracking and no diagnosis.**
That is a product decision (orthosomnia is documented and real) and a regulatory one.

> **This file was rewritten on 2026-08-02.** An earlier version described hormone curves, a
> supplement-deficiency `runDiagnosis`, a dosing protocol and "no backend, no API calls".
> All of that has been removed from the app. If you are reading a description of Arco that
> mentions cortisol curves or supplement protocols, it is out of date.

## The one thing to know: Astro is scaffolding, not the app

The repo looks like an Astro project but **Astro is deliberately bypassed**. `src/` is
effectively empty and `vercel.json` overrides the build to serve `public/` verbatim
(`buildCommand: "echo done"`, `framework: null`).

**The entire app is `public/index.html`** — ~3,000 lines of inline HTML + CSS (`<style>`) +
JS (`<script>`). Essentially every change happens there. Do not reintroduce an Astro build,
add framework components, or move logic into `src/`. Ignore generic `astro dev` advice.

## Commands

- **Preview locally:** serve `public/` over HTTP (`python3 -m http.server -d public 8642`).
  A service worker and PWA manifest are involved, so use a real server, not `file://`.
- **Deploy:** push to `main`. Vercel auto-deploys, no build step. That push *is* the deploy.
- **Live:** https://arco-app-tau.vercel.app
- **`deploy.sh` will overwrite your work.** It copies `~/Downloads/arco-prototype.html` over
  `public/index.html`, then commits and pushes. Confirm which file is canonical before editing.

## Architecture inside public/index.html

**Screens.** `screen-onboard`, `screen-login`, `screen-dash`, toggled by `showScreen(id)`
(only one carries `.active`). `screen-loading` still exists in the markup but is unreachable.
The bottom nav does *not* switch screens: `switchTab(tab, el)` stays on `screen-dash` and
re-renders `#dash-body` for **today / learn / progress / profile**.

**The lever engine — the substance of the app.**
- `RULES[]` — **22 levers**. Each has `id, domain, tier, requires[], fires(p), effect,
  contradiction` (the headline), `mechanism, evidence, citation, fixes[], surprise`, and
  optionally `values(p)` for `{token}` interpolation.
- `requires[]` is load-bearing: a lever whose required fields are unanswered **skips itself**.
  Never guess a missing value — deferring a question costs coverage, never correctness.
- `runContradictions(engineProfile)` → `{fired, skipped}`; `rank()` orders by tier then
  surprise × evidence weight; `selectDaily()` picks the one shown today;
  `interpolateRule()` fills `{tokens}` in contradiction, mechanism and fixes.
- `toContradictionProfile(profile)` maps the stored profile onto the engine's schema. **A new
  field must be added to its pass-through list or no lever will ever see it.**

**Onboarding.** `steps[]` drives `renderStep()`. **Only the first `OB_CORE` (6) steps run on
day one**; the last three move to a follow-up card (`followUpCard()` → `startFollowUp()`),
because objective panel data puts median 30-day retention for this app category at ~3.3% with
most loss inside 10 days. The split is chosen so day one still collects every field the
STRONG levers need. `stepRange()` is the single source of truth for which steps are active —
`renderStep`, `nextStep` and `prevStep` all read it. A redo (`startRedo`) walks all nine.

**Other live pieces.** `drawClock()` (canvas 24h dial: two-tone awake/asleep ring, sunrise and
sunset markers, and an inner track showing body-clock vs actual sleep), `computeChronotype()`
(MCTQ / MSFsc), `sleepStateCard()`, `wakeRegularityCard()`, `dailyContradictionCard()`,
`threeAmArticle()`, `loadWeather()`, `signpostText()` / `needsSignposting()` / `isUK()`.

**External services** (the app is *not* offline-only):
- Supabase — email-OTP auth and `daily_logs`
- Open-Meteo — geocoding, forecast, and air-quality endpoints, cached per day per lat/lon

**State.** `localStorage`: `arco-profile`, `arco-checkins`, `arco-contradiction-today`,
`arco-contradictions-shown`, `arco-ob-progress`. All access wrapped in try/catch. There is
**no demo seed** — a fresh visitor starts empty and goes through onboarding.

**PWA.** `sw.js` (cache `arco-v3`, network-first for HTML, cache-first for assets) and
`manifest.json`. Bump the cache name to force asset invalidation.

## Hard product rules — do not violate without an explicit instruction

1. **No score, grade, percentage or streak.** Not for sleep quality, not for insomnia
   severity, not for apnoea risk. Do not leave scoring machinery in the file "ready to be
   re-wired" — an unused `arcScore` and an unused `getInsight` were both deleted for this.
2. **Never name a condition as applying to the user.** No "you may have X". No risk scores.
3. **MHRA boundary.** The MHRA treats symptom-to-condition matching, likelihood/severity
   filtering and red-flag output as *medical device* functions. General reference information
   and signposting ("this is a common reason people see a GP") are explicitly **not**. The
   `sdb-signpost` lever sits exactly on the safe side: it fires on one explicit answer, states
   a general fact, and computes nothing. Never combine `snoringReported` with another field.
4. **Hedging must match the evidence grade.** A MODERATE or WEAK lever must not read as flat
   fact. Where a confidence interval touches 1.00, say so in the citation.
5. **Never assert something about the user the app did not ask.** No "you tend to…". Lead with
   the scientific finding, then their own figure: *"Drinking later in the evening tends to
   disturb the second half of the night."*
6. **No emoji.** Functional framing only — no disease/treatment/cure claims.

## The recurring bug in this codebase: midnight wraparound

`hoursUntil(from, to)` returns a **duration** and wraps: `hoursUntil(23, 7)` is 8. That is
correct for spans meant to cross midnight (time asleep) and **wrong for a gap to a deadline**
(caffeine or training before bed) — when the earlier time falls after the deadline, the wrap
returns ~23h instead of a negative number and the comparison silently passes.

**Four bugs of this exact shape have been fixed.** For anything compared against bedtime, put
both times on the linear day with `bedLinear()` / `dayH()` and subtract. The guard comment
lives at the `hoursUntil` definition — read it before touching any time comparison.

## Conventions

- One self-contained static file. No framework, no bundler, no build step.
- The JS is dense (short names, inline styles in template strings). Match it; do not reformat.
- Design tokens in `:root` are **locked**: `--bg #EDE9E1`, `--card #E4DED5`, `--ink #1A1612`,
  `--orange #E8520A` (single accent, used sparingly), `--radius 20px`, Switzer throughout.
  There is no monospace stack — do not invent `var(--mono)`.
- One objective per commit. Commit and push when done; that ships it.
- Verify by running the app, not by reading the code. Drive it in a browser, check the
  rendered output, and confirm a lever actually fires rather than assuming it does.

## Known dead code (safe to remove)

`ANYTIME_SUPS`, `SET_ASIDE_REASONS`, `SHORT_NAME`, `updateMagForm`, `updateAntihist`,
`buildWeekRow`, `morningLightLine`, `chronotypeDescriptor`, `sleepTimingVariation` — each has
exactly one reference (its own definition). `#screen-loading` is an unreachable DOM element.
`profile.sunlight` and `profile.sex` are mapped into the engine profile but read by no lever.
