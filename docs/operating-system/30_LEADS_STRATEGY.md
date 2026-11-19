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

The meeting is booked through Calendly or Google Calendar. The event lands on Chris's real schedule, and the card's status updates automatically, with no manual tap.

Which tool to use, and connecting it, are still open decisions for Chris. Any new service needs his yes.

## Governing rule

Do not build individual tasks without a clear strategy. Execution must follow from strategy.

Every piece of leads work, including files 26 to 29 and the Hunter branch `cursor/hunter-phase-one-hardening-1ff2`, must trace back to the purpose above and to one of the three steps. Where a lower file differs, this frame governs. The difference is logged in `28_LEADS_OPEN_ITEMS.md` for alignment, rather than silently resolved.

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

`29_LEAD_HUNTER_BOT.md` is the Find spec. Hunter files the leads. The count in that file is 48 contact-ready cards in an Edmonton day. A contact-ready card has a name, a title, and an email.

Section 9 of `29` makes enrichment phase two of Hunter's own job, including the one true thing, the profile signals, and the right person. This frame keeps that research as its own step. Section 9 names Coco as the writer and Nova as the sender. This frame has Coco writing and sending. Both differences are logged in `28`.

Section 10 of `29` is Hunter's search strategy for the Find step. It sits under this frame.

### Hunter branch

`cursor/hunter-phase-one-hardening-1ff2` is in progress on the Find step. That branch hardens phase one and does not change the search. On that branch, 48 is a ceiling, a quality floor drops a weak card, and the day is not padded to reach 48.

The same branch records booked, replied, sent, won, and lost with a tap on the desk. It does not connect a booking-link service. The booking direction in step 3 governs. The tool and the connection stay open for Chris, as logged in `28`.

## Changelog

- 19th November 2026. Frame opened from Chris's call. Purpose, three steps, and the governing rule recorded. Files 26 to 29 and the Hunter branch mapped to the steps. Differences logged in `28`, not resolved.
