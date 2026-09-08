# Workstream — Consumer Website

**Code:** WEB  
**Live today:** https://www.unearthself.xyz (test / philosophy site)  
**Job:** Become the place people book, then the place they belong

## What the test site already got right

- Correct parent brand: Unearth Self, not only Badlands Bootcamp
- Three doors: Basecamp, Bootcamp, Haven
- Tone is grounded rather than shouty
- A Retreat Builder instinct

## What it fails

- No real-time booking, no prices, no contact, no footer of record
- Philosophy before commerce
- Retreat Builder is a concept, not an inventory system
- No spa menu
- No merch, no alumni, no editorial engine
- Visual system is not yet the Chandwani identity + updated Ember

## Information architecture (v1 — November)

```
/                     Home — land, three doors, primary book CTA
/bootcamp             Packages + outcomes + sample itinerary + enquire/book
/basecamp             Spa menu + day guest + private hire
/haven                Four suites + book
/the-work             Echo / HAM / principles (honestly marked as living work)
/builder              Guided package builder → CRM (not a toy)
/visit                Getting here, seasons, what to pack
/journal              Editorial (can launch thin)
/account              Guest login (phase 1.1)
/legal                Privacy, waiver pointer, terms
```

Later, without breaking URLs: `/community`, `/course`, `/shop`, `/badlanders`.

## Commercial objects on every relevant page

- Book a room
- Book a treatment
- Enquire / hold a retreat
- Click-to-call or WhatsApp for the next 90 days while volume is low

## Design routes to explore (do this before locking build)

Three routes, same tokens, different spatial attitude. All use Coal / Fossil / Ember, Morganite + Aktiv Grotesk, rune marks, cinematic photography.

**Route A — Seam**  
Full-bleed geological photography, Coal overlays, Ember as a single hot pin. Feels like opening a field notebook on a canyon rim. Highest conversion potential if the photography is real.

**Route B — Specimen**  
Fossil paper ground, Sandstone rules, Runes as catalogue plates, short ragged margins. Feels like a contemporary museum identity. Best for The Work and Journal. Risk: too quiet to sell a stag weekend.

**Route C — Basecamp**  
Modular cards, visible inventory, timetable energy, rune as status chip. Feels operational and honest. Best for booking UX. Risk: looks like a product company, not a place.

**Recommendation:** A for home and Bootcamp. C for Haven, spa and checkout. B for The Work. One design system, three temperatures.

Next design chat should produce low-fidelity frames for Home, Haven suite, Spa menu, Bootcamp package, Builder — not a new philosophy.

## Technical notes

- Rebuild on a stack we can evolve for 5 years (see `10`)
- CMS for Journal and package copy
- Booking via a real engine or a well-behaved middleware, not a mailto:
- Accessible, fast on Calgary hotel Wi-Fi and a canyon LTE blip
- Domain: keep `unearthself.xyz` if it is clean; add a `.com` / `.ca` as soon as commercially sensible. Do not fragment brand across two unfinished sites.

## Definition of done for November v1

- Mobile-first, branded, fast
- Haven request or book works
- Spa treatments bookable
- Bootcamp enquiry creates a CRM record and a bot thread
- Legal pages live
- Analytics live
- Partners can change copy without an engineer

## Changelog

- 2026-09-08 — Three design routes named. Booking declared v1 job.
