# Sitemap — v1 build against this

**Code:** WEB-MAP  
**Status:** D14 temperature locked in practice: Seam home, Basecamp commerce, Specimen The Work.  
**Rule:** Home sells the land. Everything that costs money lives one click off home. Email never lands on `/`.

## How the house is organised

```
/                         Seam — land, one line, three doors, one Ember CTA
│
├── /bootcamp             programmes
│     ├── /bootcamp/pace
│     ├── /bootcamp/day
│     └── /for/{audience}      email landers
│
├── /haven                four suites + book
│     └── /haven/{slug}
│
├── /basecamp             spa, day guest
│     ├── /basecamp/spa
│     └── /basecamp/hire
│
├── /the-work             PACE + Echo plates
│     ├── /the-work/pace
│     └── /the-work/echo
│
├── /trail                Trail Quest page (PWA later)
├── /visit
├── /journal
├── /about
├── /book/{stay,treatment,retreat}
├── /legal/*
└── /admin                staff
```

## Email landers

`/for/teams` · `/for/calgary` · `/for/nurses` · `/for/stay`

Never land a campaign on home. CTA is `/book/retreat` or `/book/stay`.

## Components

Mark, Rune chip, suite card, treatment row, package slab, Ember button, concierge strip.

## Build order

Chrome → Home Seam → Haven + book stay → Spa + book treatment → PACE + retreat hold → `/for/teams` → The Work plates → legal / visit / trail stub → admin.
