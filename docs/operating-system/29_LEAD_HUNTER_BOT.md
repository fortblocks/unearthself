# 29 Lead Hunter bot

**Status:** Spec. Not built.  
**Date:** 18th November 2026  
**Owner:** Christopher  
**Builds on:** `07_WS_SALES_MARKETING.md`, `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`  
**Code this spec describes, and does not change:** `src/lib/leads-scout.ts`, `src/lib/lead-score.ts`, `src/lib/leads-book.ts`, `src/routes/admin.leads.tsx`, `src/routes/admin.bots.tsx`, `src/data/bots.ts`

Hunter's sole job is to feed Chris, on an ongoing basis, companies with a high chance of converting to a team of six to twenty-four for the Unearth Self experience in Drumheller. It finds, researches and files. It never sends.

The job has two phases. Phase one is finding and filing. Phase two is enrichment (section 9). A card is not ready for Coco, the writer, until enrichment is done or the card is explicitly marked no-signal.

## Hard rules

- Human approval before any publish, contact, or spend. The Hunter never emails anyone. Every send still goes through Approve and goes from chris@badlandsbootcamp.com.
- Unearth Self is completely separate from GeoLab and Geolab Studio. No shared data, tools, or copy.
- Never invent a name, title, email, company fact, land, building, programme, pricing, partner, or date fact. A field is kept only when its exact text is on the cited public page.
- Do not buy Apollo. Do not use Clay or any paid data vendor. The partners have not lifted this.
- The access gate in `07` stays, and it controls sending, not filing. A card needs a named person, a published email and Approve before it can send, but any well-fitting company gets filed.
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

A missing public email never stops a company being filed. If no email is published, Hunter still researches and files the company, with its profile signals, the likely team and the role to approach, each with a source URL. The email field stays blank. Hunter never guesses or builds an address.

## 4. Score against the ideal profile

A separate fit score, out of 100, beside the existing one. Draft weights for the partners to set:

| Part | Points | Reads |
|---|---|---|
| Profile match | 50 | how many profile signals are shown, each with a source URL |
| Access | 25 | same rules as the scout: named person, published email, source |
| Timing | 15 | dated public signals, same as the scout |
| Travel likelihood | 10 | Canada and US higher, Europe lower, never zero |

The 25 access points no longer decide whether a company is kept, only how ready it is to contact. A no-email company can still rank high on fit, timing and travel.

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

## 9. Enrichment, phase two

Per Chris, 18th November. Finding and filing stays phase one. Enrichment is phase two, and it belongs to the Hunter. Scout cards are enriched by the Hunter too.

### What it must do

Once a company is filed, the Hunter goes back and gathers the facts that make that company particularly relevant to a team of six to twenty-four in Drumheller:

- **One true thing.** The single citable fact worth mentioning in a first email, such as a public offsite, a new people leader, a growth announcement, a B Corp or sustainability commitment, or an outdoor or adventure link. One fact, or none. Never a guess.
- **Profile signals.** Which ideal-customer signals from section 1 the company shows.
- **Likely team.** The team of six to twenty-four inside the company that fits best.
- **Role to approach.** The person or role who would own the decision, with a name and title only when they are printed on the page.

Every item carries the source URL of the page it came from. Anything not on a cited page stays blank.

### Ready for Coco

A card has one enrichment state:

- **Not enriched.** Filed in phase one only. Not ready for Coco.
- **Enriched.** At least the one true thing or a profile signal is filled, each with a source URL. Ready for Coco.
- **No-signal.** The Hunter looked and found nothing citable. It is marked explicitly, with the date it looked. Ready for Coco, which then writes the honest general version of the `27` letter and does not fake a personal line.

### Enrichment feeds Coco

The enrichment output is the input Coco uses. Coco, the writer, drafts from the `27` template plus the card's enriched facts, so a draft cites a real signal rather than generic copy. Coco may only use facts that are on the card with a source URL. Coco and Nova, the sender, are not built yet. Until they are, a person writes the draft from the enriched card, and every send still needs a named person, a published email, and Approve.

### Guardrails

- Enrichment never contacts anyone and never sends.
- No Apollo, Clay, or paid data vendor.
- Never invent a name, title, email, or company fact. Never guess or build an address.
- A partnership flag found during enrichment goes to the partners as a suggestion, as in section 5.

## 10. Strategy

Per Chris, 18th November. The Hunter follows this strategy and proposes the best way to meet the objective: feed Chris companies with a high chance of converting to a team of six to twenty-four for the Unearth Self experience in Drumheller.

### Starting position

- Signal density should be high. Unearth Self is open to every industry, not one vertical, and the corporate travel and offsite market is large even in Canada alone, before the United States.
- The Hunter taps budgets companies already have. It looks for money already being spent on corporate travel, offsites, leadership development, or team experiences. It does not try to create new spend.

### 1. All industries, weighted by place

- Hunt across all industries. Do not narrow to a short list. Industry is never a filter, only a note on the card.
- Canada and the United States carry the most travel weight. Europe and anywhere else stay in scope when the fit is strong. Geography stays a soft weight, as in section 2.

### 2. Existing budgets first

Look first for companies already spending in this space:

- corporate travel, offsites, or company retreats they talk about in public
- leadership development, management training, or culture programmes
- team experiences, incentive trips, or sales kick-offs held away from the office

A company with visible spend ranks above one that only matches the profile.

### 3. Signals, and where spend shows

Use the profile signals in section 1: B Corp, sustainability or purpose positioning, outdoor or adventure brands, offsite or culture programmes, leadership budgets, recent growth, and new people leaders.

Also look for spend made visible in public:

- **Job postings.** Roles such as events, offsites, travel, employee experience, or learning and development, or postings that mention team retreats as a benefit.
- **Press.** Announcements of offsites, leadership programmes, funding, expansion, awards, or a new people or culture leader.
- **Conference presence.** Companies that sponsor, speak at, or send teams to industry events, which shows a travel budget and a habit of gathering people.
- **Partnerships.** Tie-ups with travel, wellness, outdoor, or experience providers.

Every signal carries its source URL. A signal not on a cited page is not used.

### 4. Ranking and daily sequence

Each day, the highest-converting cards surface first, within the 48 model calls a day:

1. Spend the day's calls where they are most likely to pay off. Enrich the strongest filed cards before searching for new ones, until today's top cards are ready for Coco.
2. Rank ready cards by the section 4 fit score, then by visible existing spend, then by timing. A dated signal from the last ninety days ranks above an older one.
3. Put cards with a named person and a published email above cards that still need a contact. A no-email card stays on the list and keeps its fit rank.
4. Rotate across industries and regions so one sector cannot fill the day.
5. Show Chris a short ranked list each day, best first. Nothing is contacted from the list.

### Learning from results

- The strategy is a living document. The Hunter reviews it once a month against real outcomes: emails sent, replies, and calls booked, by industry, signal, region, and company size.
- From that review the Hunter applies its own dated revision: which signals, industries, and regions to weight up or down, and why, with the numbers behind it. The revision updates this section and `src/data/hunter-profile.ts` and gets a changelog line. It does not wait for sign-off.
- A revision can only change weights, signals, industries, regions, and sequencing. It cannot change the hard rules, the guardrails below, the 48-a-day cap, or the two-phase job of finding and filing, then enrichment.
- Rex, the Chief of Staff, keeps ongoing oversight of the Hunter's performance and strategy outcomes as part of running Unearth Self. Rex reviews the results and each revision and flags anything that needs human attention. The Hunter's monthly self-adjustments do not wait for that review.
- Opens are not an outcome. Only sent, replied, and booked count. With too few sends to read, the Hunter says so and changes nothing.

### Guardrails

- No contact, publish, or spend without human approval. The strategy ranks and files. It never sends.
- No Apollo, Clay, or paid data vendor.
- Never invent a company fact, budget, or spend figure. A budget is only noted when a public page shows it.

## Acceptance criteria

- The Hunter never sends mail, and Send for its cards is blocked by the same gate as every other card.
- Every filled field on a Hunter card shows the URL of the page it came from.
- A company in Europe or the United States is filed and scored, not dropped.
- No call is made to Apollo, Clay, or any paid data vendor.
- The scout's nightly run and score are unchanged.
- A partnership flag carries a reason and a source URL, and creates no contact.
- Pausing the Hunter on `/admin/bots` stops new batches.
- No card reaches Coco until its enrichment state is Enriched or No-signal, and every enriched fact shows its source URL.

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
- 18th November 2026. Brief broadened by Chris: Hunter's sole job is feeding Chris high-conversion companies for a team of six to twenty-four in Drumheller, ongoing. A missing public email no longer stops a company being filed. The access gate controls sending, not filing, and access points measure contact readiness, not whether a company is kept.
- 18th November 2026. Enrichment added as phase two of the Hunter's job (section 9), per Chris. Enrichment output is the input for Coco, the writer. Coco and Nova are not built.
- 18th November 2026. Strategy section added (section 10), per Chris: all industries, existing budgets first, visible spend signals, daily ranking within the 48-call cap, and a monthly review against sent, replied, and booked, with revisions approved by Chris.
- 18th November 2026. Monthly strategy revisions made self-executing, per Chris. Rex keeps oversight and flags anything that needs human attention. All other rules unchanged.

## Build notes

Built 18th November 2026 on main, after Chris asked for it on the call.

- The profile is data in `src/data/hunter-profile.ts`. Signals, regions, travel weights, and partnership terms can change without editing the prompt.
- `src/lib/leads-hunter.ts` searches with xAI, the same model the scout uses. It verifies a name, title, and email with the scout's `contactIfPresent` plus a title check against the fetched page. Anything not on that page is left blank. It files into the same lead book with `source: "hunter"`, a separate fit score, and a partnership flag. A known domain is updated. The scout's nightly run and `lead-score.ts` are unchanged.
- The cron is `/api/cron/leads-hunter`, scheduled every minute in the Nitro config. This Vercel team is on Pro, which allows a one-minute cron. A Hobby plan would only allow a daily cron. The run stops after 48 model calls in an Edmonton day. It ships running. Pause and resume on `/admin/bots` write the paused flag in Upstash. `/admin/leads` can filter by All, Scout, Hunter, or Hand, and shows the Hunter score and the partnership flag.

Left:

- The partners have not ranked the signals. The points in the profile file are the draft weights from this spec.
- There is no monthly spend cap beyond the daily call cap.
- The Morning Brief does not yet count new Hunter cards.
- Enrichment, the rewrite layer, and the humanizer from `26` are not built. A Hunter card stays a research card until a person writes a draft, passes the access gate, and approves.
- Europe mail, lodging for a team that flies in, and who reviews partnership flags are still open in this spec.
