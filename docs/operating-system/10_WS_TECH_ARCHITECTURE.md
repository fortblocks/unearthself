# Workstream — Technical Landscape

**Code:** TECH  
**Status:** Architecture decision record, v1  
**Steward:** CEO thread

## Design principles

1. Small team, large company surface area
2. Buy commodity, build only what is ownable (Runes, quests, Echo Mirror, brand)
3. Guest-facing surfaces stay calm; operations surfaces can be dense
4. AI is a worker, not a product feature guests have to look at
5. Every customer event writes to one CRM record
6. Documentation in `docs/operating-system` is part of the stack

## Target landscape (12 months)

```
                    +--------------+
                    |  Guest web   |  unearthself.xyz
                    |  + booking   |
                    +------+-------+
                           |
              +------------+------------+
              v            v            v
        +---------+  +----------+  +----------+
        | Haven & |  | Retreat  |  |  Spa     |
        |  rooms  |  | packages |  |  menu    |
        +----+----+  +----+-----+  +----+-----+
             +------------+-------------+
                          v
                    +----------+
                    |   CRM    |<---- Grok Bots
                    | payments |
                    +----+-----+
                         |
          +--------------+--------------+
          v              v              v
   Trail Quest PWA   Finance        Staff ops
```

## Recommended build-vs-buy (November)

| Need | Buy (preferred) | Build |
|---|---|---|
| Marketing site + CMS | Next.js / Astro on Vercel + a headless CMS, or a mature Webflow **only if** booking embeds cleanly | Custom page templates, Rune components |
| Room booking | Dedicated hospitality tool (Lodgify, Cloudbeds, OwnerRez, or similar) embedded on Haven | Do not write a PMS |
| Spa booking | Vagaro / Boulevard / Acuity / Jane — pick one Alberta-friendly | Menu content only |
| Retreat / group bookings | CRM + proposal + deposit invoice (HubSpot or Attio + Stripe) | Package logic, rune-branded proposals |
| Payments | Stripe + the booking tools’ native payments | — |
| CRM | HubSpot (speed) or Attio (taste). One system. | Custom fields for PACE / package |
| Email / SMS | Customer.io, Loops, or HubSpot | Copy only |
| Accounting | QuickBooks / Xero | — |
| Files | Shared Drive with this Source of Truth copied in | — |
| Trail Quest | — | Yes, as a PWA |
| Rune renderer | Port artsu seed JSON into a small component | Yes |
| Automation | Grok Bots + a thin webhook layer | Prompt library, not a new platform |
| Identity | Clerk / Auth.js later | Not for v1 guest book flows |
| Analytics | Plausible or GA4 + one dashboard | — |

Final vendor names are an open decision (`17`) but the *shape* is not: do not invent a monolith that books rooms, massages and quests in one untested app.

## Data objects

- Person
- Organisation (corporate buyer)
- Stay
- Treatment
- Retreat instance
- Booking / hold / deposit
- Quest pack
- Echo note (private, encrypted at rest if we store it)
- Rune state
- Partner venue
- Invoice

Echo notes are not marketing data. Default: stay on device; if synced, they are locked to the person and excluded from bots.

## Environments

- `unearthself.xyz` production
- staging on a Vercel preview
- Trail Quest can live at `quest.unearthself.xyz`

GitHub + Vercel are already in the operator’s toolkit. Use them.

## Security and compliance

- Standard Canadian privacy posture (PIPA / PIPEDA thinking)
- Waivers stored against the retreat instance
- No selling of guest lists
- Bot transcripts stored as operational records
- Card data never touches our servers

## Decision log

- 2026-09-08 — Composable stack chosen over a custom all-in-one. Trail Quest is the only greenfield product app.
