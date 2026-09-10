# Brand System

**Version:** 1.1 — 8 September 2026  
**Source design:** Ravi Chandwani, *Badlands Bootcamp Brand Development*  
**Amendment:** Ember hex updated from the Adobe palette addendum

## Positioning

Premium but approachable. Rugged authenticity with considered modern execution. Grounded mysticism without costume-shop spirituality. The land did the design work; we are translating it.

## Colour — CANONICAL

Coal Seam and Fossil are the two primary colours. Ember is the only primary accent. Sandstone and Shale support; they do not compete.

| Token | Hex | RGB | Use |
|---|---|---|---|
| Coal Seam | `#161718` | 22, 23, 24 | Fields, type on Fossil, logo on light, app chrome |
| Fossil | `#F8F0ED` | 248, 240, 237 | Page grounds, type on Coal, paper, UI surfaces |
| Ember | `#F2684C` | 242, 104, 76 | CTAs, live links, one pulse per composition |
| Shale | `#423530` | 66, 53, 48 | Secondary type, cards, photography mats |
| Sandstone | `#C99A4A` | 201, 154, 74 | Fine lines, coordinates, merch foil, rune inlines |

**Do not use** `#FC7D6D` (old Ember in the PDF).

Usage rules:

- A screen is Coal-on-Fossil or Fossil-on-Coal. Ember appears once.
- Never set Ember as a full-page ground.
- Sandstone is jewellery, not a fill.
- Photography carries the ochres; the UI stays quieter than the landscape.

## Typography

- Headlines: **Morganite** (Black / Medium). Tall, condensed, geological.
- Body / UI / legal: **Aktiv Grotesk** (Regular / Bold).
- Digital fallback stack if licences are not yet loaded: `Aktiv Grotesk, "Neue Haas Grotesk", Inter, Helvetica Neue, sans-serif` for body; a licensed condensed grotesque for display. Do not substitute a novelty display face.

## Logo and Runes

- Wordmark and pictogram from the brand PDF remain in force.
- Rune builder: artsu.com (4×4 grid, radiusRatio 0.37). Seed path JSON lives in `Badlands Bootcamp - Seeds.pdf`.
- The Bootcamp logo-mark seed is the parent glyph. PACE Runes are a family, not four random icons.
- Digital products must use Runes as orientation devices: section marks, quest states, completion tokens. Not as wallpaper.
- Echo Mirror is a different visual category from Runes. It is a field / glass / reflection motif, never a fifth Rune.

## Photography

Cinematic, place-first, people second. Drone and ground. Real weather. Faces in motion, not stock “wellness smile”. Mix wide geological frames with tight texture (sediment, coal, bone, rope, skin after cold water). Staff and guests in the landscape beat studio portraits.

Avoid: neon gym lighting, influencer bathroom mirrors, generic mountain stock from another province.

## Voice

Confident, precise, slightly dry. Warm without being soft. We speak like people who have actually been outside.

Use: unearth, orient, notice, choose, carry, forge, imprint, pace.  
Avoid: unleash your best self, trauma, triggered, activated, dysregulated, guru, shamanic (unless a specific partner programme uses that word with consent), grindset.

Public promise (working):  
*Through immersive challenge, play and reflection, teams learn to recognise their patterns, connect beyond workplace roles and make wiser choices together when conditions change.*

Working line, not locked: *Find your PACE in the Badlands.*

Guest-facing drafts go through `skills/humanizer/SKILL.md` before they ship. See `25_WS_VOICE.md`. The skill may not rewrite PACE names, the safety line, or Echo Mirror.

## Website and product UI principles

- Simple, not sparse-to-the-point-of-precious.
- Originally designed, not gimmicky.
- Content-rich pages that still feel edited.
- Booking is a first-class object, not a footer afterthought.
- Rune marks appear at decision points (start a quest, complete a Rune, book a package), not on every heading.

## Changelog

- 2026-09-08 — Ember locked to `#F2684C`. Coal + Fossil declared primary pair.
- 2026-09-10 — Voice skill linked. Guest-facing copy runs through `skills/humanizer`.
