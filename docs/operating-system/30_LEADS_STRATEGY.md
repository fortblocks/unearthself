# 30 Leads: strategy

**Status:** Governing frame for all leads work  
**Date:** 19th November 2026  
**Owner:** Christopher  
**Governs:** `26_LEADS_PRODUCT_EVOLUTION.md`, `27_LEADS_SAMPLE_EMAILS.md`, `28_LEADS_OPEN_ITEMS.md`, `29_LEAD_HUNTER_BOT.md`, and the Hunter branch `cursor/hunter-phase-one-hardening-1ff2`

Chris set this on 19th November 2026. Every leads task follows from this file.

## Purpose

The whole leads system exists for one thing: retreat bookings. That means people booking retreats with Unearth Self.

## The three steps

### 1. Find

Hunter finds the leads. The aim is 48 great leads a day, with good contacts, maximizing each one's chance of converting.

### 2. Enrich and write

A research step builds information around each prospective client: why they are a good fit, and personalization signals. Chris described this as "the role Revenue Swarm calls one of its specialist bosses."

The output of that step feeds Coco. Coco writes and sends the emails, in first person as Chris.

The existing approval rule still stands. Every send needs Chris's approval, a named person, and a published or verified email.

### 3. Book

Meetings go through Calendly or Google Calendar. The event lands on Chris's real schedule, and the card updates automatically when a meeting is booked, with no manual tap.

The choice of tool is still open. The new service needs Chris's yes before it is connected.

## Governing rule

Do not build individual tasks without a clear strategy. Execution must follow from strategy.

Every piece of leads work, including files 26 to 29 and the Hunter branch `cursor/hunter-phase-one-hardening-1ff2`, must trace back to the purpose above and to one of the three steps. Where a lower file differs, this frame governs. The difference is logged in `28_LEADS_OPEN_ITEMS.md` for alignment, rather than silently resolved.

## Decisions, 19th November 2026

Chris stated these on the call.

1. **Booking.** Meetings go through Calendly or Google Calendar. The choice is still open, and the new service needs Chris's yes before it is connected. The card updates automatically when a meeting is booked.
2. **Second finding method.** Skip X for now. When a second method is added, the preferred one is LinkedIn public posts found through web search. The existing rule against logged-in LinkedIn scraping still stands.
3. **Monthly dollar cap.** $60.
4. **Fixed test set.** There is no seed list. The set builds from outcomes: companies that replied or booked become known-goods, and unsubscribes become known-bads.
5. **CASL basis for Apollo emails.** Log Apollo itself as the basis (data from public sources, per Apollo's terms) plus the date the data was pulled. Never invent a source page.
6. **Alarms.** Rex receives them first, with Bo and Derek copied.
7. **Call budget.** Raised from 48 to 55.
8. **Quality floor.** A card needs at least one verified fit signal. A named person, an email and a source alone (a score of 25) are not enough. Exclude contacts who have moved on, and cap the total cards per day.

Execution follows strategy. No task is built without a clear strategy, and the purpose is retreat bookings.

## How the leads files map to the steps

### 26, product evolution

`26_LEADS_PRODUCT_EVOLUTION.md` is the write spec.

- Section 1 fills empty contact fields from public pages before scoring.
- Sections 2, 4, and 5 write the letter: the rewrite, the humanizer, and customization from the `27` template. The letter is first person.
- Sections 3 and 6 test that letter, one axis at a time, after approval.

This file covers the enrich and write step. It does not run the hunt, and it does not choose the booking tool.

### 27, sample email

`27_LEADS_SAMPLE_EMAILS.md` is the template the letter starts from. It sits in the enrich and write step. The close asks the reader to get in touch so a call can be arranged.

### 28, open items

`28_LEADS_OPEN_ITEMS.md` is the log. It is not one of the three steps. Differences between this frame and files 26 to 29, or the Hunter branch, are recorded there and left open until they are aligned.

### 29, Hunter

`29_LEAD_HUNTER_BOT.md` is the Find spec. Hunter files the leads. The count in that file is 48 contact-ready cards in an Edmonton day. A contact-ready card has a name, a title, and an email. The call budget written in that file is 48. Decision 7 sets the call budget at 55.

Section 9 of `29` makes enrichment phase two of Hunter's own job, including the one true thing, the profile signals, and the right person. This frame keeps that research as its own step. Section 9 names Coco as the writer and Nova as the sender. This frame has Coco writing and sending. Both differences are logged in `28`.

Section 10 of `29` is Hunter's search strategy for the Find step. It sits under this frame.

### Hunter branch

`cursor/hunter-phase-one-hardening-1ff2` is in progress on the Find step. That branch hardens phase one and does not change the search. On that branch, 48 contact-ready cards is a ceiling, and the day is not padded to reach 48. The branch does not connect a booking-link service. Booked is still a desk tap. The tool choice and the connection stay open, as logged in `28`.

Applied on main and live on production as of 19th November 2026:

- The call budget default is 55. Three calls a run make 72 calls available in the working day, and 55 is the hard stop. The cron is unchanged.
- `HUNTER_MONTHLY_DOLLAR_CAP` defaults to 60. It counts known xAI cost for the calendar month. Apollo credits are separate. At 60 dollars Hunter stops calling until the next month.
- A new card needs a verified fit signal. A score of 25 with no fit signal is rejected. A stale Apollo row, or a public page that shows a new employer, is not contact-ready. Total cards filed in a day stop at 48.
- Alarms are stored in Redis. Delivery order is Rex, then Bo, then Derek, through `HUNTER_ALARM_WEBHOOK_URL` and `HUNTER_ALARM_CC_WEBHOOK_URLS`. Both are unset.
- An Apollo email logs Apollo as the CASL basis, with the statement that under Apollo's terms the data comes from public sources, and the date the row was pulled. The desk shows that basis and date. No source page is invented. A public-page email keeps that page.

Not applied. Still open:

- A booked meeting is still a desk tap. No booking service is connected.
- There is no second finding method, and no live known-good or known-bad company list.
- Items (a), (b), and (d) in `28` stay open.

## Changelog

- 19th November 2026. Frame opened from Chris's call. Purpose, three steps, and the governing rule recorded. Files 26 to 29 and the Hunter branch mapped to the steps. Differences logged in `28`, not resolved.
- 19th November 2026. Eight decisions recorded from Chris's call.
- 19th November 2026. On the Hunter branch only, and not live: decision 5, the Apollo CASL basis, is applied in code. Decisions 1, 2, and 4 are not.
- 19th November 2026. The settings listed under the Hunter branch heading are on main and live on production (0297d04): call budget 55, three calls a run with the cron unchanged, monthly xAI cap of 60 US dollars, a verified fit signal, moved-on contacts not contact-ready, 48 cards a day, alarms to Rex then Bo and Derek, and the Apollo email CASL basis.
