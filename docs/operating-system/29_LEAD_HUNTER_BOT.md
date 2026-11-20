# 29 Lead Hunter bot

`30_LEADS_STRATEGY.md` is the governing frame for leads work, and it governs where this file differs.

**Status:** Spec. Live on main as of 19th November 2026.  
**Date:** 18th November 2026  
**Updated:** 19th November 2026, from Christopher's strategy. There is no daily model-call cap. The monthly xAI cap of 60 dollars is the spending guardrail. 48 filed cards and 48 contact-ready cards are ceilings, not targets.  
**Owner:** Christopher  
**Builds on:** `07_WS_SALES_MARKETING.md`, `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`  
**Code this spec describes, and does not change:** `src/lib/leads-scout.ts` (Hunter's nightly run; the file name stays), `src/lib/leads-hunter.ts`, `src/lib/lead-score.ts`, `src/lib/leads-book.ts`, `src/routes/admin.leads.tsx`, `src/routes/admin.bots.tsx`, `src/data/bots.ts`

Hunter's sole job is to feed Chris, on an ongoing basis, companies with a high chance of converting to a team of six to twenty-four for the Unearth Self experience in Drumheller. It finds, researches and files. It never sends.

The job has two phases. Phase one is finding and filing. Phase two is enrichment (section 9). A card is not ready for Coco, the writer, until enrichment is done and a sourced fact is on the card. Coco is planned, not yet built. A no-signal card is not contact-ready.

## Hard rules

- Human approval before any publish, contact, or spend. The Hunter never emails anyone. Every send still goes through Approve and goes from chris@badlandsbootcamp.com.
- Unearth Self is completely separate from GeoLab and Geolab Studio. No shared data, tools, or copy.
- Never invent a name, title, email, company fact, land, building, programme, pricing, partner, or date fact. A field is kept only when its exact text is on the cited public page or comes from a licensed database row, as below.
- Licensed, published directories are allowed as sources for names, titles, and email addresses, per Chris, 18th November. Apollo is the chosen licensed database. The integration is in progress and gated on `APOLLO_API_KEY`. Hunter logs on the card which database each name and address came from. The no-guessing rule still applies to anything not from Apollo or a cited public page: Hunter never builds an address from a pattern or infers one. Unverified or stale database rows are flagged on the card, never silently used. Chris accepts the subscription costs, the staleness risk, and the Canadian anti-spam (CASL) obligations that come with Apollo. Rex keeps oversight of this as part of ongoing performance review. Buying or connecting any other subscription is still spend and needs approval first.
- The access gate in `07` stays, and it controls sending, not filing. A card needs a named person, a published email and Approve before it can send, but any well-fitting company gets filed.
- Partners by first name only. Basecamp is one word. Canadian spelling. No em dashes.

## Hunter's two runs

Hunter is one bot with two runs. There is no separate local bot.

(a) Nightly local sweep, formerly its own bot. The route stays `/api/cron/leads-scout` and the code stays in `leads-scout.ts`. Two UTC hours are scheduled, `0 10 * * *` and `0 11 * * *`, because 4am Edmonton is 10:00 UTC in daylight time and 11:00 UTC in standard time. The route runs only when America/Edmonton local time is 4am, and only once per Edmonton date. It keeps only Calgary, Edmonton, and Red Deer. Headcount and industry are not filters. Any size and any industry can be filed. Size is a score, not a reason to drop a company. The score on the Leads table is the existing one in `lead-score.ts`.

(b) Always-on ideal-customer hunt. Cron every 30 minutes (`*/30 * * * *`). Working hours are gated in code on the America/Edmonton clock, default 7am to 7pm, so a daylight-saving change does not move them. 48 contact-ready cards is a ceiling, not a target. Hunter stops at the ceiling. It does not pad the day with weak cards. A contact-ready card has a name, a title, and an email on file, and its enrichment state is Enriched with a sourced fact (section 9). No-signal is not contact-ready. Both runs count toward the same ceiling. A separate daily file cap, default 48 (`HUNTER_DAILY_FILED_CAP`), counts every card filed that day, research cards included. It works everywhere, by ideal-customer fit, with no headcount filter. The goal is one team of six to twenty-four, including inside a company a team would fly to. A quality floor on the Hunter score, default 20 (`HUNTER_QUALITY_FLOOR`), drops a card that does not clear it.

There is no daily model-call cap. Each always-on run makes 3 model calls. The spending guardrail is the monthly xAI dollar cap, `HUNTER_MONTHLY_DOLLAR_CAP`, default 60 dollars. At that cap Hunter stops calling until the next month. Calls are still counted, and the Bots page shows the count with no daily cap.

Pause on `/admin/bots` stops both runs. The same paused flag is read by the nightly route and by the always-on route. `HUNTER_KILL_SWITCH` stops both as well, including the nightly sweep. Unset means the switch is off.

## 1. Ideal-customer profile first

### What it must do

Before hunting, hold a written profile the partners can read and edit. Working version, from Chris:

- companies that value pushing boundaries
- distributed or high-performing teams, where getting people in one place is the point
- B Corp, sustainability, or purpose positioning they state in public
- outdoor or adventure-adjacent brands
- similar signals: a public offsite or culture programme, a stated leadership-development budget, recent growth, a new leader of people or culture
- affordability signals: a technology company, recent funding, hiring for events or learning and development, and a travel tie-up

Big technology companies are a target. Any company in North America can be filed, in any industry and at any size. There is no headcount filter. Size is a score, not a filter.

There is no master recipient list, no blacklist, and no no-call list. The only standing exclusions are the do-not-contact list, opt-outs, and keeping Geolab Studio out.

Each signal is something a public page can show. The profile is stored as data, not buried in a prompt, so a partner can change it without code. The region weights are a soft priority, reviewed monthly.

### Open questions

- Which signals carry the most weight. Partners to rank.
- Any industries or company types the partners will not work with.

## 2. Geography is a soft weight

The lion's share goes to Canadian companies: Alberta first, then Vancouver. Then California and Washington, then the rest of the United States. Europe and Mexico are low priority and stay searchable. Geography is a soft weight inside the score, reviewed monthly, never a filter. Travel likelihood is never zero.

There is no headcount filter. Group size stays six to twenty-four, so for a large company the target is one team inside it, led by a named person.

## 3. Right people

Same card requirements as the nightly run:

- named contact (two real name tokens, never "HR" or "People team")
- title as printed on the page
- published email, only when the exact address is on the cited page or in a licensed database row
- a source URL, or the licensed database name, for every filled field

Target roles: people and culture leads, leaders of distributed or high-performing teams, offsite or events owners, and founders at smaller fits. Enrichment follows `26` section 1. A card with no named person is still filed as research, and Send stays blocked.

If the named contact has left, find who holds the role now from that same public page. Never guess. If the page does not name a successor, blank the contact and keep the company. This replaces any rule that simply excludes a moved-on contact.

A missing public email never stops a company being filed. If no email is published or licensed, Hunter still researches and files the company, with its profile signals, the likely team and the role to approach, each with a source URL. The email field stays blank. Hunter never guesses or builds an address.

## 4. Score against the ideal profile

The Leads page shows one score. It is the score in `lead-score.ts`, out of 100.

| Part | Points | Reads |
|---|---|---|
| Fit | 60 | city, size, and industry |
| Access | 25 | named person, published email, and a source URL |
| Timing | 15 | dated public signals, and last touch |

The companies table is Company, Place, Size, and Score. There is no second Hunter score on the card.

Hunter still uses the weights below while it searches and checks a candidate. Those weights are not stored on the lead and are not a column. The morning list ranks by the single score above. Contact-ready still depends on a name, a title, an email, and an Enriched mark with a sourced fact. No-signal is not contact-ready.

| Part | Points | Reads |
|---|---|---|
| Profile match | 50 | how many profile signals are shown, each with a source URL |
| Access | 25 | same rules as the nightly run: named person, published email, source |
| Timing | 15 | dated public signals, same as the nightly run |
| Travel likelihood | 10 | Alberta first, then Vancouver, then California and Washington, then the rest of the United States. Europe and Mexico lower. Never zero |

The 25 access points do not decide whether a company is kept. They measure how ready it is to contact. A company with no email can still be filed.

The Leads table still shows the score in `lead-score.ts`. The Hunter score used while searching is the table above.

## 5. Partnership and collaboration flag

Per Christopher, 19th November 2026. There is no partnership lane. Outdoor, gear, travel, media, and events brands are judged as customers like anyone else. Nothing is held back or flagged as a partnership candidate. The Leads page does not store or show a Partner value. Hunter does not write a partnership flag onto the lead. A company that matches the profile is filed as a lead, in the same list as every other card.

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

Hunter's roster entry shows the job (both runs), the trigger, owner Christopher, escalation (a company that cannot be confirmed on a public page), and limits (never sends, never invents, no new paid source without approval, no daily call cap, pause and the kill switch stop both runs). It shows booked calls this month, the last run, whether the heartbeat is late, cards filed today against the 48 ceiling, model calls today with no daily cap, the monthly dollar cap (or "no cap set"), alarms, the latest funnel, a results table by method, and the pause switch.

## 8. Always on

The Hunter runs in short batches, back to back, so it is always working without one long job. Each batch: pick the next profile signal and region, search public pages, verify every field against its page, score, de-duplicate, file. It keeps a queue of where it has looked so it does not repeat itself.

The always-on run is a Vercel cron every 30 minutes, gated to 7am to 7pm Edmonton, with 3 model calls a run. There is no daily model-call cap. The spending guardrail is the monthly xAI dollar cap of 60 dollars.

## 9. Enrichment, phase two

Per Chris, 18th November. Finding and filing stays phase one. Enrichment is phase two, and it belongs to the Hunter. Cards from the nightly run are enriched by the same Hunter.

### What it must do

Once a company is filed, the Hunter goes back and gathers the facts that make that company particularly relevant to a team of six to twenty-four in Drumheller:

- **One true thing.** The single citable fact worth mentioning in a first email, such as a public offsite, a new people leader, a growth announcement, a B Corp or sustainability commitment, or an outdoor or adventure link. One fact, or none. Never a guess. Enrichment also adds deeper company intelligence and, now and then, a light personal hook from a public page.
- **Profile signals.** Which ideal-customer signals from section 1 the company shows.
- **Likely team.** The team of six to twenty-four inside the company that fits best.
- **Right person and verified contact.** The person who would own the decision: a people and culture lead, a leader of a distributed or high-performing team, an offsite or events owner, or a founder at a smaller fit. Each name, title, and email comes from a cited public page or from Apollo, with the source logged on the card. Unverified or stale Apollo rows are flagged. If that person has left, find who holds the role now from the same public page. Never guess. Finding the right person and their contact details is part of enrichment, not a separate step.

Every item carries the source URL of the page it came from, or Apollo when the contact came from Apollo. Anything from neither stays blank.

### Apollo, the licensed contact

Apollo is the chosen licensed database. The integration is in progress and does nothing until `APOLLO_API_KEY` is set. When the key is missing, Hunter makes no Apollo call and writes `Apollo off: no key` on the run log.

When a filed company has no name, title, or email from a public page, Hunter searches Apollo by the company domain, or by the company name when there is no domain, plus the target titles (people and culture lead, head of people, leader of a distributed or high-performing team, offsite or events owner, founder, and similar). Search costs nothing. Hunter then reveals one person. A reveal counts toward `APOLLO_DAILY_CREDIT_CAP`, which defaults to 48. Reveals stop once that ceiling is reached, so a bug cannot keep spending. Phone numbers are never requested. Waterfall enrichment stays off.

An email is used only when Apollo marks it verified. If the status is guessed, extrapolated, unavailable, catch-all, or likely to engage, the email is not put on the card. The card is flagged `Apollo email not verified` and it does not count as contact-ready. Hunter never builds an email from a pattern. A verified Apollo name, title, and email can count as contact-ready. The card is then marked Enriched when a sourced fact is on file, or No-signal when the contact is on file and the look found nothing else citable.

Each Apollo card stores the source (`Apollo` or `Public page`), the Apollo person id, the email status, the date retrieved, and Apollo's last-updated date when Apollo returns one. The card is flagged `Stale` when that date is more than 12 months old, or when the person's listed employer no longer matches the company. The Leads card shows the source and the flags. The table stays Company, Place, Size, and Score.

### Run log

Every always-on run and every 4am nightly run appends one entry to `unearth:hunter:runs:v1`. The list keeps the old one-a-minute window, so the 30 minute cadence still has a long history. Each entry has the timestamp, which run, the outcome (fired, skipped-paused, skipped-killed, skipped-hours, skipped-not-4am, skipped-already-swept, skipped-target-met, capped-budget, capped-spend, skipped-busy, or error), the model id, model calls, candidates returned, cards filed, contact-ready cards, Apollo searches, Apollo reveals, token counts, dollars when the model reports them, alarms, the funnel, and error text. A failed call, an unexpected body, or a deprecation signal is an error, not zero candidates. When a model call fails, the error text includes the xAI HTTP status and message. The Bots page shows the last 20 entries, read only, including alarms. `capped-budget` remains so an older log line still reads. New runs do not stop for a daily call cap. `capped-spend` is the monthly dollar cap.

The goal is that every card presented to Chris has a name, title, and email on file before it reaches the approval queue. A card without all three stays a research card and does not enter the queue.

### Ready for Coco

A card has one enrichment state:

- **Not enriched.** Filed in phase one only. Not ready for Coco.
- **Enriched.** A name, title, and email are on file, and at least the one true thing or a profile signal is filled, each with its source. Ready for Coco.
- **No-signal.** The Hunter looked and found nothing citable about the company, but a name, title, and email are on file. It is marked explicitly, with the date it looked. It is not contact-ready and it does not go to Coco.

### Enrichment feeds Coco

The enrichment output is the input Coco uses. Coco, the Unearth Self writer bot, owns all outbound writing in the website voice and is planned, not yet built. Hunter never drafts an email. Coco drafts from the `27` template plus the card's enriched facts, so a draft cites a real signal rather than generic copy. Coco may only use facts that are on the card with a source URL. Nova, the sender, is not built yet. Until then, a person writes the draft from the enriched card, and every send still needs a named person, a published email, and Approve. Christopher approves every email before it sends.

### Guardrails

- Enrichment never contacts anyone and never sends.
- Licensed databases are allowed for names, titles, and emails, with the database logged on the card and stale or unverified rows flagged. No other paid data source without approval.
- Never invent a name, title, email, or company fact. Never guess, infer, or build an address from a pattern.
- Enrichment does not write a partnership flag onto the lead. There is no partnership lane. See section 5.
- For a Canadian company only, if that company's own page explicitly says it does not want unsolicited email, clear the email and flag the card `No unsolicited email`. Do not spend effort searching for that notice or filtering the hunt on it.

## 10. Strategy

Per Chris, 18th November. The Hunter follows this strategy and proposes the best way to meet the objective: feed Chris companies with a high chance of converting to a team of six to twenty-four for the Unearth Self experience in Drumheller.

### Starting position

- Signal density should be high. Unearth Self is open to every industry, not one vertical, and the corporate travel and offsite market is large even in Canada alone, before the United States.
- The Hunter taps budgets companies already have. It looks for money already being spent on corporate travel, offsites, leadership development, or team experiences. It does not try to create new spend.

### Sources

- Web search, and the public pages it cites.
- Apollo and similar licensed databases for names, titles, and emails. The source is logged on the card. Stale or unverified rows are flagged. Hunter never builds an address from a pattern.
- Public LinkedIn posts and articles are a second source, found by the same web search. A public post, a Pulse article, or a feed-update page only. Never a logged-in scrape, and never a profile or a login page.

### 1. All industries, weighted by place

- Hunt across all industries. Do not narrow to a short list. Industry is never a filter, only a note on the card. Any company in North America can be filed, at any size. Big technology companies are a target.
- The lion's share goes to Canadian companies: Alberta first, then Vancouver. Then California and Washington, then the rest of the United States. Europe and Mexico stay searchable at low priority. Geography stays a soft weight, as in section 2, and the weights are reviewed monthly.

### 2. Existing budgets first

Look first for companies already spending in this space:

- corporate travel, offsites, or company retreats they talk about in public
- leadership development, management training, or culture programmes
- team experiences, incentive trips, or sales kick-offs held away from the office

A company with visible spend ranks above one that only matches the profile.

### 3. Signals, and where spend shows

Use the profile signals in section 1, including pushing boundaries, distributed or high-performing teams, B Corp, sustainability or purpose positioning, outdoor or adventure brands, offsite or culture programmes, leadership budgets, recent growth, new people leaders, and the affordability signals. Big technology companies are a target.

Also look for spend made visible in public:

- **Job postings.** Roles such as events, offsites, travel, employee experience, or learning and development, or postings that mention team retreats as a benefit.
- **Press.** Announcements of offsites, leadership programmes, funding, expansion, awards, or a new people or culture leader.
- **Conference presence.** Companies that sponsor, speak at, or send teams to industry events, which shows a travel budget and a habit of gathering people.
- **Travel tie-ups.** A company that names a travel or experience provider it already uses. This is an affordability signal. It is not a partnership flag, and the company is filed as a customer.

Every signal carries its source URL. A signal not on a cited page is not used.

### 4. Ranking and daily sequence

Each day, the highest-converting cards surface first, up to 48 contact-ready cards. That 48 is a ceiling, not a target. There is no daily model-call cap. The monthly xAI dollar cap of 60 dollars is the spending guardrail.

1. Spend the day's model calls where they are most likely to pay off. Enrich the strongest filed cards before searching for new ones, until today's top cards are ready for Coco.
2. Rank ready cards by the single lead score, then by visible existing spend. A dated signal from the last ninety days ranks above an older one.
3. Put cards with a named person and a published email above cards that still need a contact. A no-email card stays on the list and keeps its fit rank.
4. Rotate across industries and regions so one sector cannot fill the day.
5. Show Chris a short ranked list each day, best first. Nothing is contacted from the list.

### Learning from results

- The strategy is a living document. The Hunter reviews it once a month against real outcomes: cards filed against the 48 ceiling, emails sent, replies, and calls booked, by industry, signal, region, and company size. Region weights are part of that review.
- From that review the Hunter applies its own dated revision: which signals, industries, and regions to weight up or down, and why, with the numbers behind it. The revision updates this section and `src/data/hunter-profile.ts` and gets a changelog line. It does not wait for sign-off.
- A revision can only change weights, signals, industries, regions, and sequencing. It cannot change the hard rules, the guardrails below, the 48 ceilings, the monthly dollar cap, or the two-phase job of finding and filing, then enrichment.
- Rex, the Chief of Staff, keeps ongoing oversight of the Hunter's performance and strategy outcomes as part of running Unearth Self. Rex reviews the results and each revision and flags anything that needs human attention. The Hunter's monthly self-adjustments do not wait for that review.
- Opens are not an outcome. Cards filed against the 48 ceiling, sent, replied, and booked count. With too few sends to read, the Hunter says so and changes nothing.

### Guardrails

- No contact, publish, or spend without human approval. The strategy ranks and files. It never sends.
- Licensed databases only as set out in the hard rules, with the source logged on the card.
- Never invent a company fact, budget, or spend figure. A budget is only noted when a public page shows it.
- There is no daily model-call cap, and Hunter does not record a capacity problem for one. If the monthly xAI dollar cap is reached, Hunter stops calling until the next month. That stop does not change the 48 ceilings.

## Acceptance criteria

- The Hunter never sends mail, and Send for its cards is blocked by the same gate as every other card.
- Every filled field on a Hunter card shows the URL of the page it came from, or the licensed database it came from.
- No card enters the approval queue without a name, title, and email on file, and no email on a card was built from a pattern.
- A company in the United States, Europe, or Mexico is filed and scored, not dropped.
- Stale or unverified database rows are flagged on the card, not used silently.
- Hunter's nightly local sweep keeps Calgary, Edmonton, and Red Deer, with any headcount and any industry. The Leads table score stays the one in `lead-score.ts`.
- The Leads table shows Company, Place, Size, and Score. Score is the `lead-score.ts` total. The lead stores the Hunter score and the card lineage. It does not store a Partner value, and the Partner column stays off the table.
- Pausing Hunter on `/admin/bots` stops new always-on batches and the nightly sweep.
- Both runs stop for the Edmonton day once 48 contact-ready cards are filed. That 48 is a ceiling. Hunter does not fill up to it with cards under the quality floor. A contact-ready card has a name, a title, and an email, and is Enriched with a sourced fact. No-signal is not contact-ready. Every card filed that day, research cards included, also stops at the daily file cap, default 48.
- There is no daily model-call cap. The spending guardrail is `HUNTER_MONTHLY_DOLLAR_CAP`, default 60 dollars. Reaching it stops calling until the next month. This is live on main as of 19th November 2026.
- No card reaches Coco until its enrichment state is Enriched and a sourced fact is on the card. Every fact shows a source URL, the date it was fetched, and a quote. An Apollo email logs Apollo as its CASL basis, with the statement that under Apollo's terms the data comes from public sources, and the date the row was pulled. No source page URL is invented for that email. A public-page email keeps that page. This is live on main as of 19th November 2026.

## Open questions for partners

- Rank the profile signals, and name any companies or industries we will not work with.
- Is Europe worth an email now, before a first season has run?
- How a team flying in is hosted: travel, transfers, and Haven or other lodging. Not in this folder, so the Hunter cannot promise any of it.
- Apollo is the chosen licensed database. The integration is in progress and gated on `APOLLO_API_KEY`. The reveal ceiling defaults to 48 (`APOLLO_DAILY_CREDIT_CAP`). Phone numbers are not requested.

## Phase one hardening, 19th November 2026

Christopher approved a robustness pass. The strategy above is the search. The following is the rest of what the code does now.

- A model or Apollo response is checked before it is treated as "nothing found". HTTP errors, an unexpected body, a 410, a deprecation header, or a warning that the endpoint is deprecated are logged as failures. An empty company list after a real web search is zero results, and it raises a zero-candidate alarm. A failed xAI search, an Apollo failure, a crash in the always-on run or the nightly, and a stop for time each raise their own alarm. A day whose filed cards are under half the trailing 7-day median raises another alarm. No history, or a median of zero, does not alarm. Alarms are stored in Redis and shown on the Bots page. Delivery order is Rex, then Bo, then Derek. `HUNTER_ALARM_WEBHOOK_URL` is Rex and is unset. `HUNTER_ALARM_CC_WEBHOOK_URLS` is Bo and Derek and is unset. The post checks the response status, with an 8 second timeout. A failed post is recorded on the run and does not stop Hunter. A run writes a started marker and removes it when it finishes. If Vercel kills the run, the next run alarms that a run started and never finished. Each run writes one JSON line to the runtime log: run id, start, end, passes, calls, funnel, cards filed, actual and estimated spend, alarms, and outcome. The line has no secrets.
- The heartbeat is the time of the latest run-log line. It is late when that line is older than 45 minutes during working hours, or older than 13 hours outside them.
- The Hunter model id is pinned as `grok-4.20-0309-non-reasoning` and stored on each call and each card. Minutes keep their own model.
- `HUNTER_KILL_SWITCH` stops every run, nightly included. Unset is off. Values that turn it on are `1`, `true`, and `on`. Pause remains a separate flag.
- One run at a time. The lock is an Upstash set-if-absent with a token, a 360 second expiry (longer than the 300 second function limit), and a delete that only the holder can perform. The old lock was a read then a write and expired at 120 seconds, so a slow run could overlap the next one.
- Throughput. Working hours stay 7am to 7pm Edmonton. The cron stays every 30 minutes, which is 24 runs. `HUNTER_CALLS_PER_RUN` defaults to 3, so the day can make 72 always-on model calls, plus the one nightly search. There is no daily model-call cap. The spending guardrail is the monthly dollar cap. Work stops 40 seconds before the 300 second function limit, leaving time to save the book, write the run log, and send alarms. The clock is checked before each xAI attempt and retry, before each page fetch, before each MX lookup, before each Apollo call, and before the alarm post. A call's timeout is clipped to the time left. An early stop saves what it has, logs it, and raises a time alarm. A pass still does not start after 200 seconds. The nightly route uses the same deadline.
- Every new card gets a dedupe key of normalised domain plus contact email, checked before filing.
- Do-not-contact lives at `unearth:hunter:dnc:v1` as a hash, so two adds at once cannot drop one. Each add writes its own hash field. A book reset replaces `unearth:leads:v1` and `unearth:hunter:v1` only. Unsubscribe and don't-contact never expire, and a later one of those replaces a Skip or Lost entry for the same domain or email, including a card with no email. Lost and skipped keep the 90-day cooldown (`HUNTER_DNC_COOLDOWN_DAYS`) only while no permanent reason has been written. The nightly sweep and Apollo enrichment both check the list. The desk writes the list.
- Model calls are counted in Redis and do not stop for a daily cap. Apollo credit counters increment before the reveal and stop at the credit cap. Both reset by the Edmonton date in the key. A retry counts as another call. After the allowed retries the run stops. `HUNTER_MAX_RETRIES` defaults to 2, so three tries, with backoff and jitter.
- Dollars come from xAI `usage.cost_in_usd_ticks` at 10,000,000,000 ticks to one dollar, then `cost_in_usd`, then `cost`. Token counts are always stored. A call with no cost field adds a stand-in of 0.25 US dollars (`HUNTER_ESTIMATED_CALL_DOLLARS` in `hunter-config.ts`). That stand-in is not an xAI price, it is stored apart from actual ticks, and the run log marks it estimated. It still counts toward the monthly cap, so one missing cost cannot leave the cap open. Ticks are stored whole, not rounded to cents. Older cents already stored are still read. Apollo credits are not part of the dollar cap. The nightly sweep's xAI cost counts toward the same cap. `HUNTER_MONTHLY_DOLLAR_CAP` defaults to 60 US dollars. At 80 percent Hunter warns. At 60 dollars Hunter stops calling, raises an alarm, and the next month's counter starts empty so calling resumes.
- A dropped company gets a reason: page empty, fetch failed, blocked, timed out, name missing, domain mismatch, place mismatch, do-not-contact, duplicate, below the quality floor, no MX, or unverified. A failed page fetch is tried once more. If it still fails, the company is held as unverified, logged, and not filed.
- Each run logs a funnel: searched, candidates, verified, contact found, filed, and drops by reason. The Bots page shows the latest one.
- A fact keeps its source URL, the fetch date, and a quoted snippet. An email from a public page keeps a CASL note: the page it was published on, whether the title fits a role, and whether that page shows a notice against unsolicited email. If the notice is there, the email is left off the card. An email from Apollo logs Apollo itself as the basis, the statement that under Apollo's terms its data comes from public sources, and the date the row was pulled. The desk shows that basis and date. No page URL is created for an Apollo email. The email domain is checked for MX records with DNS only. A mailbox is never probed and SMTP is never opened. The date the contact was last seen is stored. This Apollo basis is live on main as of 19th November 2026.
- A filed card keeps its Hunter score, the query, the prompt version `2026-11-19.1`, the model, the score version, the signals, and the source. The lineage uses the experiment fields from spec 26 section 3 (`experimentId`, `axis`, `variants`, `assignments`, `sampleFloor`). No experiment is running. `sampleFloor` on the card is 30 reviewed cards, which is the method-results floor, not the unset experiment-winner proposal in spec 26.
- The desk can approve a card, or skip it with one tap: wrong size, wrong sector, no retreat signal, bad contact, duplicate, or other. Further taps record sent, replied, booked, won, and lost. A card still unreviewed after `HUNTER_REVIEW_DAYS` (default 5) becomes expired unreviewed. That is not a rejection. It is a capacity signal.
- No booking-link service is connected. The desk shows the note that this needs Chris's yes first.
- The Bots headline is booked calls this month. The method table shows filed, approval rate, reply rate, booked, and cost per card, and says "not enough data" until a method has 30 reviewed cards. The paid search method is xAI web search. Public LinkedIn posts are a second source inside that same search. It is on. `HUNTER_TRIAL_SHARE` defaults to 20 percent and is clamped between 20 and 30. That share is unassigned because no trial method exists.
- The quality floor default is 20, and a new card also needs at least one verified fit signal. A named person, an email, and a source alone, a score of 25, do not pass. If a public page shows the named contact has left, and names the person who now holds the role, that successor is kept only when the name and email are on that same page. Otherwise the contact is blanked and the company stays. Never guess. A stale Apollo employer is flagged, not silently used. There is no partnership flag. Total cards filed in a day, research cards included, stop at `HUNTER_DAILY_FILED_CAP`, default 48. Contact-ready cards stop at the same ceiling. The day is not padded up to that number. A failed MX check removes the email and keeps the company. A temporary DNS error is not a failed MX check.
- `npm run hunter:dry` runs the fictional fixture set and prints the funnel. It does not file and does not spend. `--live` may search once and still does not file. The live company list in code is empty.

Settings Chris has not set, with the defaults in code:

| Setting | Default |
| --- | --- |
| `HUNTER_KILL_SWITCH` | unset, off |
| `HUNTER_WORK_START_HOUR` | 7 |
| `HUNTER_WORK_END_HOUR` | 19 |
| `HUNTER_CALLS_PER_RUN` | 3 |
| `HUNTER_MAX_RETRIES` | 2 |
| `HUNTER_DNC_COOLDOWN_DAYS` | 90 |
| `HUNTER_REVIEW_DAYS` | 5 |
| `HUNTER_TRIAL_SHARE` | 0.2 |
| `HUNTER_QUALITY_FLOOR` | 20, plus one verified fit signal |
| `HUNTER_MONTHLY_DOLLAR_CAP` | 60 US dollars of known xAI cost |
| `HUNTER_DAILY_FILED_CAP` | 48, a ceiling, not a target |
| `HUNTER_ALARM_WEBHOOK_URL` | unset. Rex, primary |
| `HUNTER_ALARM_WEBHOOK_KEY` | unset. Authorization for Rex only. A bare key is sent as Bearer. |
| `HUNTER_ALARM_CC_WEBHOOK_URLS` | unset. Bo and Derek are copied by Rex's routine, so this stays unset. |
| `HUNTER_READ_TOKEN` | unset. Bearer token for `GET /api/hunter/read`. |
| `APOLLO_DAILY_CREDIT_CAP` | 48. Separate from the monthly dollar cap |

## Changelog

- 19th November 2026. Phase one hardening, per Chris. 48 is a ceiling. Working hours, the kill switch, the atomic lock, the do-not-contact list, response checks, alarms, the funnel, CASL and MX notes, card lineage, desk outcomes, and the fixture dry run are described above. The Hunter score is stored again. The Partner column stays off. No booking-link service. Monthly strategy stays self-executing, with Rex overseeing. Not deployed. The same day, after review: every fetched page is checked, permanent do-not-contact entries do not expire, the desk saves one card at a time, a run saves after each pass and keeps a pause, xAI ticks are read at the published rate, and alarms from the last 24 hours are kept for Rex. `HUNTER_ALARM_WEBHOOK_URL` is unset.

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
- 19th November 2026. On the Hunter branch only, and not live: call budget 55, three calls a run so that budget can be reached, monthly xAI dollar cap 60, a fit signal required, moved-on contacts excluded from contact-ready, 48 total cards a day, and alarms to Rex then Bo and Derek. Apollo's credit cap stays 48. The same day, an Apollo email logs Apollo as its CASL basis, with the pull date, and no invented source page. A public-page email keeps its page. Not live.
- 19th November 2026. `HUNTER_ALARM_WEBHOOK_KEY` is optional. When set, the primary alarm post to Rex sends it as the Authorization header. Copy URLs do not receive it. The key is not logged.
- 19th November 2026. Review fixes, not merged: failed searches, crashes, Apollo failures, and time stops raise alarms. A killed run is noticed on the next run. The run stops inside the 300 second limit and saves what it has. A permanent do-not-contact replaces a temporary one. Nightly xAI cost counts toward the 60 dollar cap, and a missing cost uses a 0.25 dollar estimate that is labelled estimated. Partner reasons stay on the company's own pages. A move phrase drops a contact only when that person is named with a different employer. `GET /api/hunter/read` returns paused state, today's calls, cards, and spend, the recent run log, and recent cards with status and score. It requires `Authorization: Bearer` and `HUNTER_READ_TOKEN`, which is unset. It does not write.
- 19th November 2026. Tonight's settings merged to main and live on production (0297d04): call budget 55, three calls a run, monthly xAI cap of 60 US dollars, a fit signal required, moved-on contacts excluded from contact-ready, 48 total cards a day, alarms to Rex then Bo and Derek, and an Apollo email logs Apollo as its CASL basis.
- 19th November 2026. Strategy aligned the same day. There is no daily model-call cap. The 60 dollar monthly xAI cap is the spending guardrail. 48 filed cards and 48 contact-ready cards are ceilings. The nightly sweep takes any headcount and any industry in Calgary, Edmonton, and Red Deer. Public LinkedIn posts are a second source. Region priority is soft and reviewed monthly. A moved-on contact is replaced from the same page, or the contact is blanked. There is no partnership lane. Coco owns the writing. The Apollo CASL basis lines above are unchanged.

`GET /api/hunter/read` returns JSON:

```json
{
  "paused": false,
  "today": { "date": "2026-11-19", "calls": 0, "cardsFiled": 0, "spendActual": 0, "spendEstimated": 0, "spendTowardCap": 0 },
  "runs": [],
  "cards": [{ "org": "", "domain": "", "status": "unreviewed", "score": null, "filedOn": "", "pipeline": "" }]
}
```

`runs` entries include the outcome, funnel, alarms, actual dollars, and estimated dollars. Cards do not include email addresses. The response sends `cache-control: no-store`. A missing or wrong token is 401. Any method other than GET is 405.

## Build notes

Built 18th November 2026 on main, after Chris asked for it on the call.

- The profile is data in `src/data/hunter-profile.ts`. Signals, regions, and travel weights can change without editing the prompt. There is no partnership lane in that profile.
- `src/lib/leads-hunter.ts` searches with xAI, the same model the nightly run uses. It verifies a name, title, and email with `contactIfPresent` from `leads-scout.ts` plus a title check against the fetched page. Anything not on that page is left blank. It files into the same lead book with `source: "hunter"`. A known domain is updated. The nightly sweep keeps Calgary, Edmonton, and Red Deer, any headcount and any industry. `lead-score.ts` still supplies the Leads table score. The lead stores the Hunter score and lineage, and no Partner value.
- The always-on cron is `/api/cron/leads-hunter`, scheduled every 30 minutes in the Nitro config, and gated to working hours in America/Edmonton. The run stops at the 48 contact-ready ceiling, or at 48 total cards filed, or when the quality floor drops a weak card, or when the monthly dollar cap is reached. There is no daily model-call cap. The nightly route stays `/api/cron/leads-scout`, scheduled at `0 10 * * *` and `0 11 * * *`, and runs only at 4am Edmonton, once per Edmonton day, for Calgary, Edmonton, and Red Deer, any headcount and any industry. Pause and the kill switch stop both. `/admin/leads` shows Company, Place, Size, and Score, and filters by All, Hunter nightly, Hunter, or Hand. The stored source value for a nightly card stays `scout`. The Hunter score and lineage are stored on the card. The Partner column stays off.

Left:

- The partners have not ranked the signals. The points in the profile file are the draft weights from this spec.
- The monthly xAI cap is 60 dollars and is the spending guardrail. There is no daily model-call cap. The 48 card counts are ceilings, not targets.
- The Morning Brief does not yet count new Hunter cards.
- Apollo enrichment is wired and stays off until `APOLLO_API_KEY` is set. It reveals one contact for a filed company that has no public name, title, or email, and it will not spend past the daily reveal ceiling. The one true thing, the likely team, the rewrite layer, and the humanizer from `26` are not a separate pass. A Hunter card stays a research card until a person writes a draft, passes the access gate, and approves. The run log is `unearth:hunter:runs:v1`, shown on the Hunter card.
- Europe mail, and lodging for a team that flies in, are still open in this spec.
