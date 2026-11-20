# 30 Leads: strategy

**Status:** Governing frame for all leads work  
**Date:** 19th November 2026  
**Owner:** Christopher  
**Governs:** `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`, `29_LEAD_HUNTER_BOT.md`, and the Hunter branch `cursor/hunter-phase-one-hardening-1ff2`  
**Updated:** 19th November 2026. Christopher's strategy the same day replaces the daily model-call cap. Decision 5 is unchanged.

Christopher set this on 19th November 2026. Every leads task follows from this file.

## Purpose

The whole leads system exists for one thing: retreat bookings. That means people booking retreats with Unearth Self.

## The three steps

### 1. Find

Hunter finds the leads. The aim is 48 contact-ready cards a day. The day still stops at 48 filed cards and at 48 contact-ready cards, so it does not go past the target. The monthly xAI cap of 60 dollars is unchanged, pending a budget decision. Changed 20th November 2026 on Christopher's approval.

### 2. Enrich and write

A research step enriches each lead with deeper company intelligence and, now and then, a light personal hook from a public page.

The output of that step feeds Coco. Coco, the Unearth Self writer bot, owns all outbound writing in the website voice. Coco is planned, not yet built. Hunter never drafts emails.

The existing approval rule still stands. Christopher approves every email before it sends. Every send needs his approval, a named person, and a published or verified email.

### 3. Book

Meetings go through Calendly or Google Calendar. The event lands on Chris's real schedule, and the card updates automatically when a meeting is booked, with no manual tap.

The choice of tool is still open. The new service needs Chris's yes before it is connected.

## Governing rule

Do not build individual tasks without a clear strategy. Execution must follow from strategy.

Every piece of leads work, including files 26 to 29 and the Hunter branch `cursor/hunter-phase-one-hardening-1ff2`, must trace back to the purpose above and to one of the three steps. Where a lower file differs, this frame governs. The difference is logged in `28_LEADS_OPEN_ITEMS.md` for alignment, rather than silently resolved.

## Decisions, 19th November 2026

Chris stated these on the call.

1. **Booking.** Meetings go through Calendly or Google Calendar. The choice is still open, and the new service needs Chris's yes before it is connected. The card updates automatically when a meeting is booked.
2. **Second finding method.** Skip X. The second source is public LinkedIn posts found through web search: a public post, a Pulse article, or a feed-update page. Logged-in LinkedIn scraping stays out.
3. **Monthly dollar cap.** $60.
4. **Fixed test set.** There is no seed list. The set builds from outcomes: companies that replied or booked become known-goods, and unsubscribes become known-bads.
5. **CASL basis for Apollo emails.** Log Apollo itself as the basis (data from public sources, per Apollo's terms) plus the date the data was pulled. Never invent a source page.
6. **Alarms.** Rex receives them first, with Bo and Derek copied.
7. **No daily call cap.** There is no daily model-call cap. The spending guardrail is the monthly xAI dollar cap in decision 3.
8. **Quality floor.** A card needs at least one verified fit signal. A named person, an email and a source alone (a score of 25) are not enough. If the named contact has moved on, find who holds the role now from the same public page. Never guess. The aim is 48 contact-ready cards a day. The cards filed in a day still stop at 48, and the contact-ready cards stop at 48. The monthly cost cap is unchanged, pending a budget decision.

Execution follows strategy. No task is built without a clear strategy, and the purpose is retreat bookings.

## How the leads files map to the steps

### 26, product evolution

`26_LEADS_PRODUCT_EVOLUTION.md` is the write spec.

- Section 1 fills empty contact fields from public pages before scoring.
- Sections 2, 4, and 5 write the letter: the rewrite, the humanizer, and customization from the `27` template. Coco owns that writing, in the website voice.
- Sections 3 and 6 test that letter, one axis at a time, after approval.

This file covers the enrich and write step. It does not run the hunt, and it does not choose the booking tool.

### 27, sample email

`27_LEADS_SAMPLE_EMAILS.md` is the template the letter starts from. It sits in the enrich and write step. The close asks the reader to get in touch so a call can be arranged.

### 28, open items

`28_LEADS_OPEN_ITEMS.md` is the log. It is not one of the three steps. Differences between this frame and files 26 to 29, or the Hunter branch, are recorded there and left open until they are aligned.

### 29, Hunter

`29_LEAD_HUNTER_BOT.md` is the Find spec. Hunter files the leads. The count in that file is 48 cards filed and 48 contact-ready cards in an Edmonton day. A contact-ready card has a name, a title, and an email. 48 contact-ready cards is the target, and both counts remain the daily stop. There is no daily model-call cap. The monthly xAI dollar cap of 60 dollars is unchanged, pending a budget decision.

Section 9 of `29` makes enrichment phase two of Hunter's own job, including the one true thing, the profile signals, and the right person. This frame keeps that research as its own step. Section 9 names Coco as the writer and Nova as the sender. Coco owns the writing. Nova remains the named sender in section 9. The enrichment difference stays logged in `28`.

Section 10 of `29` is Hunter's search strategy for the Find step. It sits under this frame.

### Hunter branch

The Find step is on main. 48 contact-ready cards is the target, and the day still stops at 48. The monthly cost cap is unchanged, pending a budget decision. No booking-link service is connected. Booked is still a desk tap. The tool choice and the connection stay open, as logged in `28`.

Applied on main and live on production as of 19th November 2026:

- There is no daily model-call cap. The always-on run is every 30 minutes from 7am to 7pm Edmonton, with 3 model calls a run, plus one nightly sweep at 4am Edmonton, searching Calgary, Edmonton, and Red Deer first and filing a company in Canada, with any headcount and any industry. Calgary, Edmonton, and Red Deer are weighted highest in the score. The always-on search is Canada and the United States only, 70 percent Canada and 30 percent the United States, Canada first. A company outside those two countries is not filed. The cron is unchanged.
- `HUNTER_MONTHLY_DOLLAR_CAP` defaults to 60. It counts known xAI cost for the calendar month. Apollo credits are separate. At 60 dollars Hunter stops calling until the next month. That monthly cap is the spending guardrail.
- A new card needs a verified fit signal. A score of 25 with no fit signal is rejected. A stale or unverified database row is flagged, not used silently. If the named contact has left, Hunter looks on that same public page for who holds the role now, and never guesses. The aim is 48 contact-ready cards. Total cards filed in a day still stop at 48, and contact-ready cards stop at 48. The monthly cost cap is unchanged, pending a budget decision.
- Alarms are stored in Redis. Delivery order is Rex, then Bo, then Derek, through `HUNTER_ALARM_WEBHOOK_URL` and `HUNTER_ALARM_CC_WEBHOOK_URLS`. Both are unset.
- An Apollo email logs Apollo as the CASL basis, with the statement that under Apollo's terms the data comes from public sources, and the date the row was pulled. The desk shows that basis and date. No source page is invented. A public-page email keeps that page.

Not applied. Still open:

- A booked meeting is still a desk tap. No booking service is connected.
- There is no live known-good or known-bad company list.
- Items (a), (b), and (d) in `28` stay open.

## Changelog

- 19th November 2026. Frame opened from Chris's call. Purpose, three steps, and the governing rule recorded. Files 26 to 29 and the Hunter branch mapped to the steps. Differences logged in `28`, not resolved.
- 19th November 2026. Eight decisions recorded from Chris's call.
- 19th November 2026. On the Hunter branch only, and not live: decision 5, the Apollo CASL basis, is applied in code. Decisions 1, 2, and 4 are not.
- 19th November 2026. The settings listed under the Hunter branch heading are on main and live on production (0297d04): call budget 55, three calls a run with the cron unchanged, monthly xAI cap of 60 US dollars, a verified fit signal, moved-on contacts not contact-ready, 48 cards a day, alarms to Rex then Bo and Derek, and the Apollo email CASL basis.
- 19th November 2026. Strategy aligned the same day. There is no daily model-call cap. 48 filed cards and 48 contact-ready cards are ceilings. The 60 dollar monthly xAI cap is the spending guardrail. The nightly sweep searches Calgary, Edmonton, and Red Deer first, and keeps and files companies from anywhere, with any headcount and any industry. Calgary, Edmonton, and Red Deer are weighted highest in the score, and no company is dropped for location. Public LinkedIn posts are a second source. A moved-on contact is replaced from the same page, or left blank. There is no partnership lane. Coco owns the writing. Decision 5 is unchanged.
- 20th November 2026. Christopher approved the nightly sweep wording. The sweep searches Calgary, Edmonton, and Red Deer first, keeps and files companies from anywhere, with any headcount and any industry, and weights Calgary, Edmonton, and Red Deer highest in the score. No company is dropped for location.
- 20th November 2026. Christopher approved the desk rule and the daily aim. 48 contact-ready cards is the target. The day still stops at 48. The monthly xAI cap of 60 dollars is unchanged, pending a budget decision. The desk lists a card with a named person, a verified or published email, a source URL, and no block flag. It hides a card with no email. It sorts by the Hunter fit score. Score bands are not a gate.
- 20th November 2026. Christopher approved phase one geography. Hunter searches and files Canada and the United States only. Canada is 70 percent of the search slots and those slots run first. The United States is 30 percent. A company outside those two countries, or with no country after the headquarters text is checked, is not filed and is counted as outOfRegion. Cards already stored outside Canada and the United States stay in storage and are hidden from the desk and the lists. Changed 20th November 2026 on Christopher's approval.
