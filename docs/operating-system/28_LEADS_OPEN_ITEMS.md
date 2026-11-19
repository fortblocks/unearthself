# 28 Leads: open items and discrepancies

As of 17th November 2026. A running log of discrepancies and items to align before the lead system sends real email. Add items as and when they become pertinent, and mark them closed with the date and who closed them. Companion to `26_LEADS_PRODUCT_EVOLUTION.md` and `27_LEADS_SAMPLE_EMAILS.md`.

## Open

1. **Website copy Google Doc.** Under review. Site copy updates are in progress. Come back to it.
2. **Signature, Chris or Christopher.** The sample email in `27` signs off as Chris, and `26` says Christopher. Chris is not bothered, since both names are used for him. Deprioritized.
3. **Travel time and distance.** "About ninety minutes from Calgary" is still unconfirmed in the SoT. The site conflicts with itself: `/drumheller` says about 110 km, and `/find-us` says about 138 km.
4. **Spring 2027.** Backed by `23_FINANCIAL_MODEL.md` ("First groups March 2027") but not yet written into the sales file, `07`.
5. **"Not another hotel ballroom" wording.** Awaiting partner sign-off.
6. **Rune names in first emails.** Tess to confirm whether first-touch emails leave out Rune names.
7. **A/B threshold.** Real number unset. Default is 20 sends per version until Chris sets it.
8. **Prices.** Stay out of every email until Norah closes D01.
9. **Enrichment.** Not built. Name, title, and people or HR lead fields are empty on all lead cards.
10. **Customization, A/B testing, humanizer.** Specs in `26`, sections 4 to 6. Not built.
11. **Replies.** Logged by hand on the card until a mailbox is connected.
12. **Analytics.** Vercel Web Analytics is live on the site but does not track email opens or replies.
13. **Recipients and Bootcamp details.** An approved recipient list and approved Bootcamp details are still needed.
14. **Send rule.** Every send needs Chris's approval and goes from chris@badlandsbootcamp.com. Standing rule, kept here as a reminder.
15. **Hunter phase-one defaults, 19th November 2026.** Confirm with Chris before production: working hours 7am to 7pm Edmonton, 2 model calls per 30 minute run, quality floor 20 on the Hunter score plus one verified profile signal, daily file cap 48 including research cards (`HUNTER_DAILY_FILED_CAP`), do-not-contact cooldown 90 days for skip and lost only (unsubscribe and don't-contact do not expire), unreviewed expiry 5 days after the first run of this code, trial share 20 percent used inside xAI web search for under-tried searches, method results hidden until 30 reviewed cards, heartbeat 45 minutes in hours and 13 hours overnight, lock expiry 360 seconds, and retries 2. `HUNTER_MONTHLY_DOLLAR_CAP` is unset on purpose. `HUNTER_KILL_SWITCH` is unset, which means off. `HUNTER_ALARM_WEBHOOK_URL` is unset, which means alarms stay in Redis for Rex and are not posted. No booking-link service until Chris says yes. The live dry-run company list is empty. The CASL basis for an Apollo email, alarm recipients besides Rex, a second finding method, and the monthly dollar amount stay open.

## Closed

- **Group size.** Settled at six to twenty-four, on the site and in `07` (18th November, Chris approved).
