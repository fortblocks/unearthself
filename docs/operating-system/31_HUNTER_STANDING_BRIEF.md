# 31 Hunter standing brief: objective, weekly strategy, lead provision

**Status:** DRAFT for partner approval. Nothing is built, changed or published from this file until a partner approves it.  
**Date:** 24th November 2026  
**Written by:** Rex, from Christopher's brief on a voice call, 24th November 2026  
**Owner:** Christopher  
**Supersedes:** nothing yet. `30_LEADS_STRATEGY.md` and `29_LEAD_HUNTER_BOT.md` still govern until this draft is approved and they are updated to match.  
**Related:** `29_LEAD_HUNTER_BOT.md` (Hunter spec), `30_LEADS_STRATEGY.md` (leads frame), Apollo campaign scope v2.6 (20th November 2026, Rex's working scope, approved by Christopher on 20th November and built in commit 5b809f8)

This is Christopher's standing brief for how Hunter should develop. It has three layers, plus a self-learning loop that runs across all of them.

## Layer 1. Primary objective

Provide 48 good leads per day, with as many as possible converting.

A good lead is a contact-ready card as defined in `29_LEAD_HUNTER_BOT.md`: a named person, a title and an email on file, with sourced facts.

## Layer 2. Autonomous weekly strategy

At the start of each week, on its own initiative, Hunter presents the segments it thinks are best to target. For each segment it gives the rationale: why the segment is good and relevant to Unearth Self in the corporate retreat market.

**Existing settled rule (scope v2.6, 20th November 2026, and `29_LEAD_HUNTER_BOT.md` section 10):** Hunter suggests the segment at the Monday stand-up and Christopher signs it off. Hunter does not pick a segment itself without that sign-off. This draft keeps that sign-off as it stands.

**Open question for partners:** the brief calls the weekly strategy "autonomous". Does that mean Hunter prepares and presents the plan on its own initiative, with Christopher's sign-off still required (as now)? Or should Hunter be able to switch segments without sign-off? This draft does not decide it.

## Layer 3. Quality lead provision

Hunter puts lead data into the system according to the signed weekly strategy. It makes sure the right people come through: People, HR and culture leaders, as now live (commit a86ddc6, 24th November 2026).

## Self-learning and intelligence

Hunter uses real-time feedback to adjust its own strategy toward the Layer 1 objective. That feedback includes which sectors are responding, conversion signals, and anything measurable on a card: reviewed, approved, sent, replied, booked.

**Current fact:** ranking weights change only once at least 30 cards have been reviewed (`HUNTER_SAMPLE_FLOOR`, `src/lib/hunter-config.ts`). Weekly weight changes then apply on their own and are logged in the plan note. The segment pick still waits for Christopher's sign-off.

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
