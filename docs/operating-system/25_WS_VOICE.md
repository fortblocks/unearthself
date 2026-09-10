# Workstream — Voice

**Code:** VOICE  
**Owner:** Christopher (brand). Tess on product language. Lisa on guest-facing house facts.  
**Status:** Live as of 10 September 2026  
**Job:** One way of speaking, so the site, the mail, the journal and the one-pagers do not read like they were written by a model.

Credibility is the point. A retreat that talks about noticing will not survive copy that sounds generated.

## Why this exists

Every page on unearthself.xyz is written with a model in the loop. That is fine for speed. It is fatal if the reader can hear the loop. AI-shaped prose (triads, “not X but Y”, em dashes, “curated”, “journey”) is now a tell that the company is performing depth it has not earned.

This workstream is the brake.

## Canon

1. Voice rules live in `03_BRAND_SYSTEM.md`. Do not fork them here.
2. The working skill is `skills/humanizer/SKILL.md`. Adapted from [blader/humanizer](https://github.com/blader/humanizer) (MIT) and pointed at our bans.
3. Run the skill on every guest-facing draft before it ships. Including this chat.
4. Product words (PACE, Echo Mirror, Notice don’t excavate, rune names) are Tess’s. The skill may not “improve” them.

## How a draft moves

```
write → /humanizer (skills/humanizer/SKILL.md) → Tess if it touches PACE/Echo → ship
```

`/humanizer` means: open the skill, mark tells, rewrite, house pass. Do not paste the draft into a random “make this more human” prompt. Those add new slop.

## What we sound like

People who have been in the canyon and then gone back to the kitchen. Specific objects. Numbers when we have them. Warmth in the facts, not in the adjectives.

We do not sound like:

- a wellness brand that discovered Drumheller on a moodboard
- a consultancy one-pager
- a museum wall text that is trying to be kind

## Scope

In: site copy, campaign landers, outbound email, journal, suite and spa descriptions, one-pagers, `/found`, alt text that is more than a label.

Out: rate tables, waivers, insurance wording, code, open-decision logs, partner legal names.

## Spawn

`VOICE-01` in `16_CHAT_SPAWN_PROMPTS.md`. Point it at a named draft. It returns a rewrite, not a style guide.

## Definition of done (rolling)

- Skill is in the OS and linked from `03`
- New guest-facing pages are run through it before push
- A partner can point at a paragraph and say “this still sounds like a model” and the next pass fixes that paragraph, not the whole site

## Changelog

- 2026-09-10 — Workstream opened. Skill installed from blader/humanizer, pointed at house voice. First pass: Haven suite copy.
