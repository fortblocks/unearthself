# 29 Lead Hunter bot

`30_LEADS_STRATEGY.md` is the governing frame for leads work, and it governs where this file differs.

**Status:** Spec. Not built.  
**Date:** 18th November 2026  
**Owner:** Christopher  
**Builds on:** `07_WS_SALES_MARKETING.md`, `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`  
**Code this spec describes, and does not change:** `src/lib/leads-scout.ts` (Hunter's nightly run; the file name stays), `src/lib/leads-hunter.ts`, `src/lib/lead-score.ts`, `src/lib/leads-book.ts`, `src/routes/admin.leads.tsx`, `src/routes/admin.bots.tsx`, `src/data/bots.ts`

Hunter's sole job is to feed Chris, on an ongoing basis, companies with a high chance of converting to a team of six to twenty-four for the Unearth Self experience in Drumheller. It finds, researches and files. It never sends.

The job has two phases. Phase one is finding and filing. Phase two is enrichment (section 9). A card is not ready for Coco, the writer, until enrichment is done or the card is explicitly marked no-signal.

## Hard rules

- Human approval before any publish, contact, or spend. The Hunter never emails anyone. Every send still goes through Approve and goes from chris@badlandsbootcamp.com.
- Unearth Self is completely separate from GeoLab and Geolab Studio. No shared data, tools, or copy.
- Never invent a name, title, email, company fact, land, building, programme, pricing, partner, or date fact. A field is kept only when its exact text is on the cited public page or comes from a licensed database row, as below.
- Licensed, published directories are allowed as sources for names, titles, and email addresses, per Chris, 18th November. Apollo is the chosen licensed database. The integration is in progress and gated on `APOLLO_API_KEY`. Hunter logs on the card which database each name and address came from. The no-guessing rule still applies to anything not from Apollo or a cited public page: Hunter never builds an address from a pattern or infers one. Unverified or stale database rows are flagged on the card, never silently used. Chris accepts the subscription costs, the staleness risk, and the Canadian anti-spam (CASL) obligations that come with Apollo. Rex keeps oversight of this as part of ongoing performance review. Buying or connecting any other subscription is still spend and needs approval first.
- The access gate in `07` stays, and it controls sending, not filing. A card needs a named person, a published email and Approve before it can send, but any well-fitting company gets filed.
- Partners by first name only. Basecamp is one word. Canadian spelling. No em dashes.

## Hunter's two runs

Hunter is one bot with two runs. There is no separate local bot.

(a) Nightly local sweep, formerly its own bot. Cron `0 11 * * *`, which is 4am Mountain. It keeps only Calgary, Edmonton, and Red Deer, headcount 80 to 800, and the first-wave industries in `lead-score.ts`, and drops every other row before scoring. The score is the existing one in `lead-score.ts`. The route stays `/api/cron/leads-scout` and the code stays in `leads-scout.ts`, so the schedule is not registered twice. Behaviour of the sweep is unchanged.

(b) Always-on ideal-customer hunt. Cron every minute. It keeps searching, evaluating, and enriching until it has filed 48 contact-ready cards in an Edmonton day, then stops. A contact-ready card has a name, a title, and an email on file, and its enrichment state is Enriched or No-signal (section 9). Both runs count toward the same 48. It works everywhere, by ideal-customer fit, with no headcount filter. The goal is one team of six to twenty-four, including inside a company a team would fly to.

Model calls are a separate daily budget, an internal resource aimed at that 48. The budget is an adjustable setting, currently 48 calls, until Chris sets a new number. Raising it is spend and needs Chris's approval. The setting name is `HUNTER_DAILY_CALL_BUDGET`. If the budget runs out before 48 contact-ready cards are filed, that is a capacity problem, not a normal day. Hunter records the date, the cards filed, and the calls used. Rex is notified on the Bots page and in the stored Hunter state.

Pause on `/admin/bots` stops both runs. The same paused flag is read by the nightly route and by the every-minute route.

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

Same card requirements as the nightly run:

- named contact (two real name tokens, never "HR" or "People team")
- title as printed on the page
- published email, only when the exact address is on the cited page or in a licensed database row
- a source URL, or the licensed database name, for every filled field

Target roles: people and culture leads, leaders of distributed or high-performing teams, offsite or events owners, founders at smaller fits. Enrichment follows `26` section 1. A card with no named person is still filed as research, and Send stays blocked.

A missing public email never stops a company being filed. If no email is published or licensed, Hunter still researches and files the company, with its profile signals, the likely team and the role to approach, each with a source URL. The email field stays blank. Hunter never guesses or builds an address.

## 4. Score against the ideal profile

The Leads page shows one score. It is the score in `lead-score.ts`, out of 100.

| Part | Points | Reads |
|---|---|---|
| Fit | 60 | city, size, and industry |
| Access | 25 | named person, published email, and a source URL |
| Timing | 15 | dated public signals, and last touch |

The companies table is Company, Place, Size, and Score. There is no second Hunter score on the card.

Hunter still uses the weights below while it searches and checks a candidate. Those weights are not stored on the lead and are not a column. The morning list ranks by the single score above. Contact-ready still depends on a name, a title, an email, and an Enriched or No-signal mark.

| Part | Points | Reads |
|---|---|---|
| Profile match | 50 | how many profile signals are shown, each with a source URL |
| Access | 25 | same rules as the nightly run: named person, published email, source |
| Timing | 15 | dated public signals, same as the nightly run |
| Travel likelihood | 10 | Canada and US higher, Europe lower, never zero |

The 25 access points do not decide whether a company is kept. They measure how ready it is to contact. A company with no email can still be filed.

The scorer in `lead-score.ts` is unchanged.

## 5. Partnership and collaboration flag

Per Chris, 18 November 2026. A partnership note describes a company that already has clients in place, so it is not a lead-gen metric. The Leads page does not store or show a Partner value. Hunter does not write a partnership flag onto the lead. A company that matches the profile is filed as a lead, in the same list as every other card.

## 6. Same pipeline, sharper upstream

Both runs file into the same lead book (`leads-book.ts`). The always-on hunt writes `source: "hunter"`. The nightly sweep keeps the stored value `source: "scout"` so the desk can tell the runs apart. The desk shows that value as Hunter nightly. From there everything is shared: enrichment, scoring display, the rewrite layer, customization from `27`, the humanizer, A/B testing, Approve, and send. No second pipeline.

De-duplication: a company already on the book by domain is updated, not filed twice. A company the nightly run already holds keeps its card, and the always-on run adds signals to it.

## 7. Dashboard and bot section

### How results surface

- `/admin/leads` shows Company, Place, Size, and Score. It filters by All, Hunter nightly, Hunter, and Hand. That filter is where the card came from, and Hand stays its own filter. Stored source values are not rewritten. The page does not show a Hunter score or a Partner column.
- New Hunter cards land as research cards. Nothing moves to a sendable state without a named person, a published email, and Approve.
- A short daily count of new Hunter cards can join the Morning Brief once it is live.

### The bot section today

`/admin/bots` lists Hunter, then seven draft-desk bots in `src/data/bots.ts`. Hunter is the one that runs on its own, on the two schedules above. The other seven are a roster and a draft desk:

- **Concierge.** Qualifies a new enquiry: audience, package, dates, headcount. No invented price.
- **Corporate AE.** Named team enquiries: one-pager, three dates, a call.
- **Stay & Spa.** Haven nights and treatments, hold a suite.
- **Follow-up.** Forty-eight hours, then seven days, then stop. Never a fourth nudge.
- **Morning Brief.** Planned 7am Mountain ops snapshot to partners.
- **Friday Digest.** Planned Friday commercial snapshot for Norah.
- **Scribe.** Proposes a patch to these files after a partner meeting. A person merges.

In the code, the first four write drafts from fixed templates in `bot-copy.ts` when a person clicks, and Send writes the thread and opens a mail draft, because Gmail is not connected. Morning Brief, Friday Digest, and Scribe have no scheduled job behind them. The page state for those seven is saved in the browser. Hunter's pause, last run, and daily counts are in Upstash. The live company list is `/admin/leads`. There is no separate tab for the nightly run.

### Hunter on the roster

Hunter's roster entry shows the job (both runs), the trigger, owner Christopher, escalation (a partnership flag, or any company outside the profile's limits), and limits (never sends, never invents, no paid data, pause stops both runs). It shows the last always-on run, cards filed today against the 48 target, model calls used against the daily budget, a capacity warning when the budget runs out first, and the pause switch.

## 8. Always on

The Hunter runs in short batches, back to back, so it is always working without one long job. Each batch: pick the next profile signal and region, search public pages, verify every field against its page, score, de-duplicate, file. It keeps a queue of where it has looked so it does not repeat itself.

The run method is a build decision for later: a frequent Vercel cron, or a durable workflow or queue. Either way, every model call costs money, so the run rate and a monthly cap need approval before it is switched on. The daily model-call budget is the current spend control. It is 48 calls until Chris sets a new number, and raising it needs his approval.

## 9. Enrichment, phase two

Per Chris, 18th November. Finding and filing stays phase one. Enrichment is phase two, and it belongs to the Hunter. Cards from the nightly run are enriched by the same Hunter.

### What it must do

Once a company is filed, the Hunter goes back and gathers the facts that make that company particularly relevant to a team of six to twenty-four in Drumheller:

- **One true thing.** The single citable fact worth mentioning in a first email, such as a public offsite, a new people leader, a growth announcement, a B Corp or sustainability commitment, or an outdoor or adventure link. One fact, or none. Never a guess.
- **Profile signals.** Which ideal-customer signals from section 1 the company shows.
- **Likely team.** The team of six to twenty-four inside the company that fits best.
- **Right person and verified contact.** The person who would own the decision, such as a marketing director, sales director, HR director, or people and culture lead, with their name, title, and email. Each comes from a cited public page or from Apollo, with the source logged on the card. Unverified or stale Apollo rows are flagged. Finding the right person and their contact details is part of enrichment, not a separate step.

Every item carries the source URL of the page it came from, or Apollo when the contact came from Apollo. Anything from neither stays blank.

### Apollo, the licensed contact

Apollo is the chosen licensed database. The integration is in progress and does nothing until `APOLLO_API_KEY` is set. When the key is missing, Hunter makes no Apollo call and writes `Apollo off: no key` on the run log.

When a filed company has no name, title, or email from a public page, Hunter searches Apollo by the company domain, or by the company name when there is no domain, plus the target titles (marketing director, sales director, HR or people director, people and culture lead, head of people, office or operations manager, executive assistant to the CEO, and similar). Search costs nothing. Hunter then reveals one person. A reveal counts toward `APOLLO_DAILY_CREDIT_CAP`, which defaults to 48. Reveals stop once that ceiling is reached, so a bug cannot keep spending. Phone numbers are never requested. Waterfall enrichment stays off.

An email is used only when Apollo marks it verified. If the status is guessed, extrapolated, unavailable, catch-all, or likely to engage, the email is not put on the card. The card is flagged `Apollo email not verified` and it does not count as contact-ready. Hunter never builds an email from a pattern. A verified Apollo name, title, and email can count as contact-ready. The card is then marked Enriched when a sourced fact is on file, or No-signal when the contact is on file and the look found nothing else citable.

Each Apollo card stores the source (`Apollo` or `Public page`), the Apollo person id, the email status, the date retrieved, and Apollo's last-updated date when Apollo returns one. The card is flagged `Stale` when that date is more than 12 months old, or when the person's listed employer no longer matches the company. The Leads card shows the source and the flags. The table stays Company, Place, Size, and Score.

### Run log

Every always-on run and every 4am nightly run appends one entry to `unearth:hunter:runs:v1`. The list keeps about 90 days. Each entry has the timestamp, which run, the outcome (fired, skipped-paused, skipped-target-met, capped-budget, or error), model calls, candidates returned, cards filed, contact-ready cards, Apollo searches, Apollo reveals, and error text. When a model call fails, the error text includes the xAI HTTP status and message. The Bots page shows the last 20 entries, read only.

The goal is that every card presented to Chris has a name, title, and email on file before it reaches the approval queue. A card without all three stays a research card and does not enter the queue.

### Ready for Coco

A card has one enrichment state:

- **Not enriched.** Filed in phase one only. Not ready for Coco.
- **Enriched.** A name, title, and email are on file, and at least the one true thing or a profile signal is filled, each with its source. Ready for Coco.
- **No-signal.** The Hunter looked and found nothing citable about the company, but a name, title, and email are on file. It is marked explicitly, with the date it looked. Ready for Coco, which then writes the honest general version of the `27` letter and does not fake a personal line.

### Enrichment feeds Coco

The enrichment output is the input Coco uses. Coco, the writer, drafts from the `27` template plus the card's enriched facts, so a draft cites a real signal rather than generic copy. Coco may only use facts that are on the card with a source URL. Coco and Nova, the sender, are not built yet. Until they are, a person writes the draft from the enriched card, and every send still needs a named person, a published email, and Approve.

### Guardrails

- Enrichment never contacts anyone and never sends.
- Licensed databases are allowed for names, titles, and emails, with the database logged on the card and stale or unverified rows flagged. No other paid data source without approval.
- Never invent a name, title, email, or company fact. Never guess, infer, or build an address from a pattern.
- Enrichment does not write a partnership flag onto the lead. See section 5.

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

Each day, the highest-converting cards surface first, until 48 contact-ready cards are filed. Model calls are spent against a separate budget, currently 48, and are not themselves the cap:

1. Spend the day's model calls where they are most likely to pay off. Enrich the strongest filed cards before searching for new ones, until today's top cards are ready for Coco.
2. Rank ready cards by the single lead score, then by visible existing spend. A dated signal from the last ninety days ranks above an older one.
3. Put cards with a named person and a published email above cards that still need a contact. A no-email card stays on the list and keeps its fit rank.
4. Rotate across industries and regions so one sector cannot fill the day.
5. Show Chris a short ranked list each day, best first. Nothing is contacted from the list.

### Learning from results

- The strategy is a living document. The Hunter reviews it once a month against real outcomes: cards filed against the 48 target, emails sent, replies, and calls booked, by industry, signal, region, and company size.
- From that review the Hunter applies its own dated revision: which signals, industries, and regions to weight up or down, and why, with the numbers behind it. The revision updates this section and `src/data/hunter-profile.ts` and gets a changelog line. It does not wait for sign-off.
- A revision can only change weights, signals, industries, regions, and sequencing. It cannot change the hard rules, the guardrails below, the 48 contact-ready card target, the model-call budget, or the two-phase job of finding and filing, then enrichment.
- Rex, the Chief of Staff, keeps ongoing oversight of the Hunter's performance and strategy outcomes as part of running Unearth Self. Rex reviews the results and each revision and flags anything that needs human attention. The Hunter's monthly self-adjustments do not wait for that review.
- Opens are not an outcome. Cards filed against the 48 target, sent, replied, and booked count. With too few sends to read, the Hunter says so and changes nothing.

### Guardrails

- No contact, publish, or spend without human approval. The strategy ranks and files. It never sends.
- Licensed databases only as set out in the hard rules, with the source logged on the card.
- Never invent a company fact, budget, or spend figure. A budget is only noted when a public page shows it.
- If the model-call budget runs out before 48 contact-ready cards are filed, Hunter stops for that Edmonton day and records a capacity problem (the date, the cards filed, and the calls used) for Rex. That record does not change the 48 target or the budget.

## Acceptance criteria

- The Hunter never sends mail, and Send for its cards is blocked by the same gate as every other card.
- Every filled field on a Hunter card shows the URL of the page it came from, or the licensed database it came from.
- No card enters the approval queue without a name, title, and email on file, and no email on a card was built from a pattern.
- A company in Europe or the United States is filed and scored, not dropped.
- Stale or unverified database rows are flagged on the card, not used silently.
- Hunter's nightly local sweep and the score in `lead-score.ts` are unchanged.
- The Leads table shows Company, Place, Size, and Score. Score is the `lead-score.ts` total. The lead does not store a separate Hunter score or a Partner value.
- Pausing Hunter on `/admin/bots` stops new always-on batches and the nightly sweep.
- Both runs stop for the Edmonton day once 48 contact-ready cards are filed. A contact-ready card has a name, a title, and an email, and is Enriched or No-signal.
- If the model-call budget runs out first, Hunter stops and records the date, cards filed, and calls used for Rex. The budget defaults to 48. The setting is `HUNTER_DAILY_CALL_BUDGET`. Raising it is spend and needs Chris's approval.
- No card reaches Coco until its enrichment state is Enriched or No-signal, and every enriched fact shows its source URL.

## Open questions for partners

- Rank the profile signals, and name any companies or industries we will not work with.
- Is Europe worth an email now, before a first season has run?
- The monthly spend cap for an always-on run.
- How a team flying in is hosted: travel, transfers, and Haven or other lodging. Not in this folder, so the Hunter cannot promise any of it.
- Whether the nightly run's 80 to 800 headcount band stays for the local list.
- Apollo is the chosen licensed database. The integration is in progress and gated on `APOLLO_API_KEY`. The reveal ceiling defaults to 48 (`APOLLO_DAILY_CREDIT_CAP`). Phone numbers are not requested.

## Changelog

- 18th November 2026. Spec opened from Chris's call. Not built.
- 18th November 2026. Brief broadened by Chris: Hunter's sole job is feeding Chris high-conversion companies for a team of six to twenty-four in Drumheller, ongoing. A missing public email no longer stops a company being filed. The access gate controls sending, not filing, and access points measure contact readiness, not whether a company is kept.
- 18th November 2026. Enrichment added as phase two of the Hunter's job (section 9), per Chris. Enrichment output is the input for Coco, the writer. Coco and Nova are not built.
- 18th November 2026. Strategy section added (section 10), per Chris: all industries, existing budgets first, visible spend signals, daily ranking within the 48-call cap, and a monthly review against sent, replied, and booked, with revisions approved by Chris.
- 18th November 2026. Monthly strategy revisions made self-executing, per Chris. Rex keeps oversight and flags anything that needs human attention. All other rules unchanged.
- 18th November 2026. Scout folded into Hunter per Chris. Hunter owns the nightly local sweep and the always-on hunt. Scout is not a separate bot.
- 18th November 2026. Licensed databases (Apollo, ZoomInfo, and similar) allowed for names, titles, and emails, per Chris, with the source logged on the card and stale rows flagged. No guessed or pattern-built addresses. Chris accepts the costs, staleness risk, and CASL obligations; Rex keeps oversight. Finding the right person and verified contact details is now part of enrichment, and every card needs a name, title, and email before the approval queue.
- 18th November 2026. The daily cap is 48 contact-ready cards filed per Edmonton day, per Chris, counted across both runs. A contact-ready card has a name, a title, and an email, and is Enriched or No-signal. The model-call budget is a separate setting, currently 48, and raising it is spend that needs Chris's approval. If that budget runs out first, Hunter records a capacity problem for Rex. Monthly review counts cards filed against the 48 target, beside sent, replied, and booked. A revision still cannot change the card target or the budget.
- 18 November 2026. The Leads table shows Company, Place, Size, and Score, per Chris. A separate Hunter score and a Partner value are not stored on a lead and are not shown. Score is the single lead score: Fit, Access, and Timing. The source filter stays.
- 18 November 2026. Apollo is the chosen licensed database, per Chris. The integration is in progress and gated on `APOLLO_API_KEY`. Only a verified Apollo email can be used. Guessed, extrapolated, unavailable, catch-all, and likely-to-engage emails are flagged `Apollo email not verified` and left out of the contact-ready count. Reveals stop at `APOLLO_DAILY_CREDIT_CAP`, default 48. Cards store the source, Apollo person id, email status, date retrieved, and Apollo's last-updated date. A `Stale` flag shows when that date is more than 12 months old or the employer does not match. Both runs append to the run log, and the Bots page shows the last 20 entries.
- 19th November 2026. File 30 named as the governing frame for leads work. Where this file differs, file 30 governs.

## Build notes

Built 18th November 2026 on main, after Chris asked for it on the call.

- The profile is data in `src/data/hunter-profile.ts`. Signals, regions, travel weights, and partnership terms can change without editing the prompt.
- `src/lib/leads-hunter.ts` searches with xAI, the same model the nightly run uses. It verifies a name, title, and email with `contactIfPresent` from `leads-scout.ts` plus a title check against the fetched page. Anything not on that page is left blank. It files into the same lead book with `source: "hunter"`. A known domain is updated. The nightly sweep and `lead-score.ts` are unchanged. The lead stores no separate Hunter score and no Partner value.
- The always-on cron is `/api/cron/leads-hunter`, scheduled every minute in the Nitro config. This Vercel team is on Pro, which allows a one-minute cron. A Hobby plan would only allow a daily cron. The run stops after 48 contact-ready cards in an Edmonton day, or sooner when the model-call budget runs out. That budget defaults to 48 and is `HUNTER_DAILY_CALL_BUDGET`. A budget stop is stored as a capacity problem for Rex and shown on the Hunter card. It ships running. The nightly cron stays `/api/cron/leads-scout` at `0 11 * * *`. Pause and resume on `/admin/bots` write one paused flag in Upstash, and both routes read it. Both runs also stop when the card target or the call budget is spent. `/admin/leads` shows Company, Place, Size, and Score, and filters by All, Hunter nightly, Hunter, or Hand. The stored source value for a nightly card stays `scout`.

Left:

- The partners have not ranked the signals. The points in the profile file are the draft weights from this spec.
- There is no monthly spend cap. The daily model-call budget defaults to 48 and is the spend control until Chris raises it. The 48 card target is separate.
- The Morning Brief does not yet count new Hunter cards.
- Apollo enrichment is wired and stays off until `APOLLO_API_KEY` is set. It reveals one contact for a filed company that has no public name, title, or email, and it will not spend past the daily reveal ceiling. The one true thing, the likely team, the rewrite layer, and the humanizer from `26` are not a separate pass. A Hunter card stays a research card until a person writes a draft, passes the access gate, and approves. The run log is `unearth:hunter:runs:v1`, shown on the Hunter card.
- Europe mail, and lodging for a team that flies in, are still open in this spec.
