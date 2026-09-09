# Workstream — Back Office

**Code:** OPSYS  
**Job:** Four partners operate like a company with a full ops desk  
**Surface:** `/admin` — staff only. Guests never see this.

## What “back office” means here

The internal system of record for:
- Pipeline and CRM
- Holds, deposits, balances
- Room and treatment calendars
- Retreat run-of-show and staffing roster
- Supplier and partner contacts
- Waivers and incident log
- Weekly P&L snapshot
- Guest comms history (including bot threads)

Guests never see this. Staff live in it.

## Live desk

House book at `/admin`. Gate is a plain login: mark, email, password. Shared staff account for the partnership while we take feedback.

Looking-as is a view label, not a login. Switch partner and **Today** rewrites the briefing. Real per-partner accounts wait on D03/D04.

| Route | View | Primary human | Playable now |
|---|---|---|---|
| `/admin` | **Today** — briefing, keys, diary, next programme, open risk | Lisa / FOH | Partner briefing + Apex run-of-show |
| `/admin/pipeline` | **Pipeline** — every enquiry, owner, next action, value | Christopher + Tess | File an enquiry, change status, filter mine/kind |
| `/admin/inventory` | **Inventory** — Haven nights, treatment slots, Canalta overflow | Lisa (rooms) + Norah (treatments) | Hold a suite, add a slot |
| `/admin/money` | **Money** — deposits due, invoices sent, refunds | Norah | Mark paid, file a line |
| `/admin/risk` | **Risk** — unsigned waivers, weather flags, under-staffed days | Lisa (Tess on programme days) | Close / reopen / flag |
| `/admin/friday` | **Friday pack** — occupancy, hours, pipeline, cash, issues | Norah | One page + reset demo |

Rule stands: if a fact exists only in a WhatsApp thread, it does not exist.

Seed is Wednesday 9 September 2026. Demo mutations live in memory for the session.

## November minimum viable ops desk

The five views above. HubSpot/Attio still acceptable as the *sales* CRM until D04 closes. The house book is the place Lisa and Norah look first.

## Reporting pack (Friday)

- Occupancy (Haven)
- Treatment hours sold
- Retreat pipeline (count, weighted CAD)
- Cash in / cash promised
- Issues

Keep it to one page. The roadmap workbook holds the longer view.

## Still later

- Wire public Book panel into this book (same records)
- PMS + Stripe (D03)
- CRM (D04)
- One account per partner, not a shared desk login
- Bot threads as a comms log
- Door codes never in git

## Changelog

- 2026-09-09 — `/admin` gated with email/password. Shared staff account for team walkthroughs. Live on unearthself.xyz/admin.
- 2026-09-09 — `/admin` house book shipped: Today, Pipeline, Inventory, Money, Risk, Friday. Looking-as rewrites Today.
- 2026-09-08 — MVP ops desk defined as views, not as a software brand.
