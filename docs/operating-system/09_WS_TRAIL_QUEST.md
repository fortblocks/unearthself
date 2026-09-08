# Workstream — Trail Quest App

**Code:** APP  
**Status:** Specified in principle, not built  
**Rule:** The app preserves immersion. If it fights the canyon, paper wins.

## Purpose

Trail Quest is the expedition system, not a wellness dashboard.

It must:

- Reveal Rune glyphs and principles
- Deliver geofenced or sequenced quest content
- Offer short Echo Mirror prompts
- Record private observations
- Show the accumulating PACE set
- Work with poor or no signal (pre-downloaded packs)
- Support a 30-day integration check after the retreat

It must not:

- Gamify people into looking at a phone on a hoodoo
- Require accounts mid-quest if onboarding failed
- Diagnose Echoes
- Leak private notes to the team feed

## MVP scope for first pilots

A realistic November pilot can run on:

1. Pre-downloaded web app (PWA) on guest phones, plus
2. Facilitator printed pack as the source of truth if the phone dies

Native iOS/Android is Phase 2 unless a partner engineer is already in motion.

### Minimum screens

- Join code / retreat instance
- Today’s sequence
- Active quest card (map optional)
- Mirror prompt (one question at a time)
- My Runes
- Offline banner

Facilitator control: start quest, unlock next Rune, broadcast a condition change (“the route has changed”).

## Technical sketch

- Content packs as JSON (quest, geofence, copy, rune id)
- GPS where useful; timed / facilitator unlock where GPS is unreliable
- Local-first storage, sync when the guest returns to Basecamp Wi-Fi
- No public social layer in v1

## Tessellate

Earlier writings name Tessellate as a guide/companion voice. That is not part of the November MVP unless Tess wants a named facilitator persona in the copy. Do not build a character AI that talks over the land.

## Definition of done for pilot 1

- One retreat instance can be loaded overnight
- Four Rune reveals + four Mirror prompts work offline
- Facilitator can run the day if two phones are dead
- Privacy sheet signed

## Changelog

- 2026-09-08 — PWA + paper fallback chosen over native-first.
