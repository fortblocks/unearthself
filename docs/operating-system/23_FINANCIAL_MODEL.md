# Financial model — working extract

**Code:** FIN  
**Owner:** Norah. Christopher keeps the file in git. A finance bot may update this file and the assumptions tab only.  
**Source:** *Badlands Bootcamp 3yr Financial Forecast (v.2)*  
**Status:** Directional. Dashboard break-even dates in the source file are wrong. Do not send this workbook to an investor until the bugs below are patched.

## Prices the model is using

| Item | CAD | Use |
|---|---|---|
| 3-day Bootcamp | 2,000 / person | Corporate / group headline |
| 1-day | 320 / person | Day product |
| Room assumption in the model | 300 / night | Blended, 2 pax, 2 nights on a 3-day |
| Booking commission | 16% | Makes hotel pass-through 252 / guest |
| Dinner | 35 × 3, 16% commission | 88.20 pass-through / 3-day guest |
| Hoodie | 125 sell / 45 cost | Attach 50% on 3-day, 20% on 1-day |
| Groups | 8 / 16 / 24 | Small / medium / large |
| Event delivery | 1,560 / group / day | Facilitator 100×6 + oversight 60×6 + breathwork 250 + kit 150 + admin 200 |

Contribution the model claims: **1,407 / 3-day guest** and **112 / 1-day guest**.

## How this meets the Haven rate card

The house card in `20` is suite-specific (165–295 night, cleaning $65 or $85). The model’s 300 is a planning blend, not the public BAR.

## Volume conflict

Zero Bootcamp participants in all of 2026. First groups March 2027. That fights house-open November 2026.

Peak funding in the file: ~197k if 2026 stays empty.

## Bugs to patch

1. Dashboard break-even January 2026 is a zero-activity artefact.
2. Finance Manager sign flips in 2028.
3. Spa and leisure Haven missing as revenue.
4. Event cost cloned three times.
5. Tickets never hit 2026–27 volume.

## Finance bot

May update this file. May not publish a price or close D01.
