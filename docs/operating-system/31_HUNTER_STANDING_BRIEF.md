# 31 Hunter standing brief: objective, weekly strategy, lead provision

**Status:** DRAFT for partner approval. Nothing is built, changed or published from this file until a partner approves it.  
**Date:** 24th November 2026  
**Written by:** Rex, from Christopher's brief on a voice call, 24th November 2026  
**Revised:** 24th November 2026, from Christopher's voice brief. The weekly segment choice is now Hunter's own, without sign-off.  
**Owner:** Christopher  
**Supersedes:** nothing yet (see "Effect on existing rules"). `30_LEADS_STRATEGY.md` and `29_LEAD_HUNTER_BOT.md` still govern until this draft is approved and they are updated to match.  
**Related:** `29_LEAD_HUNTER_BOT.md` (Hunter spec), `30_LEADS_STRATEGY.md` (leads frame), Apollo campaign scope v2.6 (20th November 2026, Rex's working scope, approved by Christopher on 20th November and built in commit 5b809f8)

This is Christopher's standing brief for how Hunter should develop. It has three layers, plus a self-learning loop that runs across all of them.

## Layer 1. Primary objective

Provide 48 good leads per day, with as many as possible converting.

A good lead is a contact-ready card as defined in `29_LEAD_HUNTER_BOT.md`: a named person, a title and an email on file, with sourced facts.

Noted 25th November 2026, from the approved pipeline fix. The leads list now keeps no-contact rows in a separate research group, and contact-ready cards show first. The same morning, Christopher corrected the search: a headcount range is optional per campaign and off by default, there is no size cap, and large companies stay in when the contact leads people, HR, learning and development, culture, events, office, or workplace. Staffing, recruiting, job boards, and outsourcing or BPO stay out. This note does not approve the rest of this draft.

## Layer 2. Autonomous weekly strategy

Hunter picks and switches segments itself, without sign-off. In Christopher's words, it is a moving feast.

- At the start of each week, on its own initiative, Hunter presents the segments it has chosen and the rationale: why each is good and relevant to Unearth Self in the corporate retreat market. This is for visibility, not for sign-off.
- Hunter can change course mid-week if the evidence says so, and records the change and the reason.

**Change from the current rule:** see "Effect on existing rules" below.

## Layer 3. Quality lead provision

Hunter puts lead data into the system according to the signed weekly strategy. It makes sure the right people come through: People, HR and culture leaders, as now live (commit a86ddc6, 24th November 2026).

## Self-learning and intelligence

Conversion is the yardstick. Hunter judges its own performance on how its leads convert: reviewed, approved, sent, replied, booked, and which sectors respond. It keeps optimizing toward leads that convert, not toward a volume of random companies.

**Current fact:** ranking weights change only once at least 30 cards have been reviewed (`HUNTER_SAMPLE_FLOOR`, `src/lib/hunter-config.ts`). Weekly weight changes then apply on their own and are logged in the plan note.

## Effect on existing rules

Once partners approve this draft, it supersedes the 20th November 2026 rule in scope v2.6 and `29_LEAD_HUNTER_BOT.md` that the weekly segment needs Christopher's sign-off. `29_LEAD_HUNTER_BOT.md`, `30_LEADS_STRATEGY.md` and scope v2.6 would then need matching edits. They are not edited now.

## Current gap, as of 24th November 2026

- **Monday planning lives only in the website engine.** `withMondaySuggestion` and `suggestSegment` in `src/lib/hunter-campaign.ts` run inside the 30-minute cron. Their only output is one line on the Bots page: "Monday suggestion, not yet signed". It gives no list size and no numbers from last week, and nothing is pushed to chat or the stand-up.
- **The fallback is alphabetical.** With fewer than 30 reviewed cards, the suggestion falls back to alphabetical order of the segments. It is not a reasoned pick.
- **Hunter's bot profile has no Monday planning.** It has no Monday routine. Its only routine is a weekly self-check on Thursdays.
- **Hunter has no read token** for engine data (`/api/hunter/read`), so it cannot see runs, cards or the campaign state for itself.
- **Volume:** two to three contact-ready cards a day against 48. Recent fixes: a86ddc6 (People and HR titles first, buyer check gets company context) and 9d4984b (buyer check on the free people search before an Apollo email lookup), both 24th November 2026.

## What approval would unlock

These are proposals only. None is approved or built. The order is a light ranking, not a decision.

1. **Hunter profile and Monday routine.** Add Layer 2 to Hunter's profile. Add a Monday routine that presents the week's segments and rationale in chat, ahead of the stand-up.
2. **Engine weekly plan output.** The engine writes a dated weekly plan: suggested segments, list size, the reason, and last week's numbers (filed, contact-ready, reviewed, approved, sent, replied, booked). It replaces the alphabetical fallback with a reasoned one.
3. **Read token for Hunter.** Christopher sets the token himself, so Hunter can read engine data without asking Rex.
4. **Feedback loop.** Card outcomes by segment and by ranking input feed back into Hunter's weekly plan and its weights, within the existing 30-review floor.
5. **Pending quick wins.**
   - Tilt the Canada and United States split toward Canada for the current segment. Hunter may already change the split per segment, with a logged reason (`29_LEAD_HUNTER_BOT.md`).
   - Give the Edmonton, Calgary and Red Deer draws their own page counter and queue, so those searches actually run.
   - Work more companies per run.

No target in this draft is set beyond 48 a day. Any new target needs a partner decision.
