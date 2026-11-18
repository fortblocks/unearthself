# 29 Lead Hunter bot

**Status:** Spec. Not built.  
**Date:** 18th November 2026  
**Owner:** Christopher  
**Builds on:** `07_WS_SALES_MARKETING.md`, `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`  
**Code this spec describes, and does not change:** `src/lib/leads-scout.ts`, `src/lib/lead-score.ts`, `src/lib/leads-book.ts`, `src/routes/admin.leads.tsx`, `src/routes/admin.bots.tsx`, `src/data/bots.ts`

Per Chris, 18th November: one bot whose only job is finding ideal customers for Unearth Self and Badlands Bootcamp, around the clock. It finds and files. It never sends.

## Hard rules

- Human approval before any publish, contact, or spend. The Hunter never emails anyone. Every send still goes through Approve and goes from chris@badlandsbootcamp.com.
- Unearth Self is completely separate from GeoLab and Geolab Studio. No shared data, tools, or copy.
- Never invent a name, title, email, company fact, land, building, programme, pricing, partner, or date fact. A field is kept only when its exact text is on the cited public page.
- Do not buy Apollo. Do not use Clay or any paid data vendor. The partners have not lifted this.
- The access gate in `07` stays: named person, published email, source URL.
- Partners by first name only. Basecamp is one word. Canadian spelling. No em dashes.

## Why a second bot

The existing scout (`leads-scout.ts`, nightly cron at 4am Mountain) is deliberately local. It keeps only Calgary, Edmonton, and Red Deer, headcount 80 to 800, and the first-wave industries in `lead-score.ts`, and drops every other row before scoring. That is right for a drive-in first wave and wrong for the bigger idea: Badlands Bootcamp could be an iconic experience that a company will fly a team to.

The Hunter is the complement, not the replacement. The scout keeps doing local, nightly, by industry. The Hunter works everywhere, continuously, by ideal-customer fit.

## 1. Ideal-customer profile first

### What it must do

Before hunting, hold a written profile the partners can read and edit. Working version, from Chris:

- companies that value pushing boundaries
- distributed or high-performing teams, where getting people in one place is the point
- B Corp, sustainability, or purpose positioning they state in public
- outdoor or adventure-adjacent brands
- similar signals: a public offsite or culture programme, a stated leadership-development budget, recent growth, a new leader of people or culture

Each signal is something a public page can show. The profile is stored as data, not buried in a prompt, so a partner can change it without code.

### Open questions

- Which signals carry the most weight. Partners to rank.
- Any industries or company types the partners will not work with.

## 2. No geographic constraint

Canada and the United States are higher probability. Europe is in scope. Anywhere is in scope if the fit is strong. The goal is the biggest and best companies in the world.

The local headcount band of 80 to 800 does not apply. Group size stays six to twenty-four, so for a large company the target is one team inside it, led by a named person.

Geography becomes a soft weight inside the score (a travel-likelihood factor), never a filter.

## 3. Right people

Same card requirements as the scout:

- named contact (two real name tokens, never "HR" or "People team")
- title as printed on the page
- published email, only when the exact address is on the cited page
- a source URL for every filled field

Target roles: people and culture leads, leaders of distributed or high-performing teams, offsite or events owners, founders at smaller fits. Enrichment follows `26` section 1. A card with no named person is still filed as research, and Send stays blocked.

## 4. Score against the ideal profile

A separate fit score, out of 100, beside the existing one. Draft weights for the partners to set:

| Part | Points | Reads |
|---|---|---|
| Profile match | 50 | how many profile signals are shown, each with a source URL |
| Access | 25 | same rules as the scout: named person, published email, source |
| Timing | 15 | dated public signals, same as the scout |
| Travel likelihood | 10 | Canada and US higher, Europe lower, never zero |

The existing scorer in `lead-score.ts` is not changed. Hunter cards carry their own score and a label saying which score they use.

## 5. Partnership and collaboration flag

Alongside outbound fit, flag when a company looks like a partner, not only a buyer: an outdoor or adventure brand, a sustainability-led company, a gear or apparel maker, a travel or retreat operator in another region, a media or events brand. The flag is a note with its source URL and a short reason. A partnership is never contacted from the Hunter. It goes to the partners as a suggestion.

## 6. Same pipeline, sharper upstream

Hunter cards go into the same lead book as the scout's (`leads-book.ts`), with `source: "hunter"`. From there everything is shared: enrichment, scoring display, the rewrite layer, customization from `27`, the humanizer, A/B testing, Approve, and send. No second pipeline.

De-duplication: a company already on the book by domain is updated, not filed twice. A company the scout already holds keeps its card, and the Hunter adds signals to it.

## 7. Dashboard and bot section

### How results surface

- `/admin/leads` gets a source filter (Scout, Hunter, Hand) and a column for the Hunter fit score and the partnership flag.
- New Hunter cards land as research cards. Nothing moves to a sendable state without a named person, a published email, and Approve.
- A short daily count of new Hunter cards can join the Morning Brief once it is live.

### The bot section today

`/admin/bots` lists seven bots in `src/data/bots.ts`. Today they are a roster and a draft desk. Only the scout runs on its own:

- **Concierge.** Qualifies a new enquiry: audience, package, dates, headcount. No invented price.
- **Corporate AE.** Named team enquiries: one-pager, three dates, a call.
- **Stay & Spa.** Haven nights and treatments, hold a suite.
- **Follow-up.** Forty-eight hours, then seven days, then stop. Never a fourth nudge.
- **Morning Brief.** Planned 7am Mountain ops snapshot to partners.
- **Friday Digest.** Planned Friday commercial snapshot for Norah.
- **Scribe.** Proposes a patch to these files after a partner meeting. A person merges.

In the code, the first four write drafts from fixed templates in `bot-copy.ts` when a person clicks, and Send writes the thread and opens a mail draft, because Gmail is not connected. Morning Brief, Friday Digest, and Scribe have no scheduled job behind them. The page state is saved in the browser. The Scout tab shows six seeded example sectors, not the live nightly scout, which lives on `/admin/leads`.

### Adding the Hunter

Add a "Lead Hunter" entry to the roster: job, trigger (always on), owner Christopher, escalation (a partnership flag, or any company outside the profile's limits), and limits (never sends, never invents, no paid data). Show its last run, cards filed today, and a pause switch.

## 8. Always on

The Hunter runs in short batches, back to back, so it is always working without one long job. Each batch: pick the next profile signal and region, search public pages, verify every field against its page, score, de-duplicate, file. It keeps a queue of where it has looked so it does not repeat itself.

The run method is a build decision for later: a frequent Vercel cron, or a durable workflow or queue. Either way, every model call costs money, so the run rate and a monthly cap need approval before it is switched on.

## Acceptance criteria

- The Hunter never sends mail, and Send for its cards is blocked by the same gate as every other card.
- Every filled field on a Hunter card shows the URL of the page it came from.
- A company in Europe or the United States is filed and scored, not dropped.
- No call is made to Apollo, Clay, or any paid data vendor.
- The scout's nightly run and score are unchanged.
- A partnership flag carries a reason and a source URL, and creates no contact.
- Pausing the Hunter on `/admin/bots` stops new batches.

## Open questions for partners

- Rank the profile signals, and name any companies or industries we will not work with.
- Is Europe worth an email now, before a first season has run?
- The monthly spend cap for an always-on run.
- How a team flying in is hosted: travel, transfers, and Haven or other lodging. Not in this folder, so the Hunter cannot promise any of it.
- Who reviews partnership flags, and how often.
- Whether the scout's 80 to 800 headcount band stays for the local list.
- Whether paid data is ever on the table. Today the answer is no.

## Changelog

- 18th November 2026. Spec opened from Chris's call. Not built.
