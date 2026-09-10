# Workstream — Automation & Grok Bots

**Code:** AUTO  
**Principle:** Automate the company. Do not automate the canyon.

## Where AI belongs

| Allowed | Forbidden |
|---|---|
| First-touch sales and FAQ | Guest-facing “AI coach” during a quest |
| Follow-up sequences | Generating a person’s Echo as a diagnosis |
| Drafting proposals and one-pagers | Inventing prices or availability |
| CRM hygiene and meeting notes | Sending more than three unanswered nudges |
| Weekly reporting digest | Publishing unreviewed philosophy as canon |
| Internal documentation updates (with human merge) | Changing source-of-truth files without a named workstream |
| Research on accounts and routes | Contacting someone who asked to stop |

## Bot roster (phase 1)

1. **Concierge** — web form and info@
2. **Corporate AE** — qualified team enquiries
3. **Stay & Spa** — Haven and treatment
4. **Follow-up** — 48h / 7d / stop
5. **Morning Brief** — 07:00 MT ops snapshot
6. **Friday Digest** — commercial snapshot
7. **Scribe** — after partner meetings, propose doc patches

Each bot has: trigger, allowed tools, tone card, hard limits, escalation human.

## Tone card (all external bots)

UK/Canadian English, calm, specific, short. Sounds like a competent Basecamp host, not a growth hacker. Uses guest name. Never says “as an AI”. Offers a human the moment the question is about safety, accessibility, money above a threshold, or emotional distress.

## Escalation

Escalate immediately if the message includes: injury, mental-health crisis, under-18 guest, legal threat, press request, or a booking over a set CAD threshold (open decision — propose CAD 5,000).

## Implementation path

Week 1: Concierge + CRM write.  
Week 2: Follow-up + Friday Digest.  
Week 3: Stay & Spa once inventory exists.  
Week 4: Corporate AE with the one-pager attached.

House book `/admin/bots` is the working roster as of 10 Sep 2026. Send is queued on the thread and opened as mailto until Gmail is connected. Scout files research cards without named people — Concierge will not send those. Hard cap: three unanswered nudges.

Grok Automations (Christopher’s account): Evening Digest 17:00 America/Edmonton; Social Scout weekday 09:00. They notify him. They do not write the house book until a webhook exists.

## Changelog

- 2026-09-08 — Roster named. Guest-facing AI during quests banned.
- 2026-09-10 — Roster playable on `/admin/bots`. Threads on pipeline files. Scout list. Gmail still the missing send pipe. Social desk is `/admin/socials`.
