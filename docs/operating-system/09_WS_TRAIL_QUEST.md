# Workstream — Trail Quest App

**Code:** APP  
**Status:** Specified from *Unearth Self MVP.pdf* (118 pp, 10 Sep 2026). Not built. Tweaks expected in the field.  
**Rule:** The app preserves immersion. If it fights the canyon, paper wins. If an instruction conflicts with safety, conditions or a physical limit, the app instruction does not take priority.

Guest-facing chrome may say **Unearth Self**. The product name in this OS is **Trail Quest**.

---

## Purpose

Trail Quest is the expedition system, not a wellness dashboard. It is a quest companion. Most of the retreat happens away from the screen. The facilitator says when to open it.

It must:

- Join a retreat instance at check-in and download the day’s pack
- Reveal Rune glyphs and principles **after** the encounter, not before (concealment)
- Deliver sequenced and, where tested, geofenced quest content
- Run a short Echo Mirror: Notice → Orient → Choose, one question at a time
- Record private observations on-device
- Show the accumulating PACE set (physical Rune first, digital after)
- Rotate a **Field Recorder** so only one phone is watched on the trail
- Work with poor or no signal (pre-downloaded packs)
- Support a 30-day integration check after the retreat

It must not:

- Gamify people into looking at a phone on a hoodoo
- Require accounts mid-quest if onboarding failed
- Diagnose Echoes, assign a personality, or invent a fifth Rune
- Leak private notes to the team, the facilitator, or a social feed
- Talk over the land (no guest-facing AI coach, no Tessellate character)
- Collect real fossils, rocks or plants — every specimen is digital
- Tell people which Rune they are meeting until receive → reveal → activate is complete

---

## How a guest moves through it

Check-in (Day 1, 16:00). Join code. Download pack. Confirm location, haptics, battery. Then the phone goes away until they are asked.

The loop on every Rune:

1. **Experience first.** Language comes after.
2. **Friction.** Incomplete information, time pressure, a route that stops confirming.
3. **Echo Mirror.** Private. Not a test. Reflects a response in a moment, not an identity.
4. **Replay / experiment.** They try one other response. Sharing is optional.
5. **Receive** the unnamed artifact → **Reveal** the name and principle → **Activate** (wear it, then the app adds it to the Field Record).

If they receive and wear the Rune immediately, it looks earned before awareness. Keep the three beats.

Phones stay away during the physical ritual. Digital activation is often on the shuttle, five minutes, locally stored.

### Field Recorder (Adaptability morning — the pattern other outdoor quests copy)

The team travels without a facilitator in the canyon. Trail Quest guides.

- The app picks the first Field Recorder at random.
- That person carries one active device, reads discoveries aloud, warns when a station is coming. They do not lead the team or decide for it.
- Everyone else keeps a phone accessible but in a pocket.
- About every 20 minutes the app asks the team to pick a new Recorder.
- At a challenge station, everyone opens their own device.
- On the marked trail, stay on the loop unless Trail Quest opens an approved recovery area. Inside it, stay inside the drawn boundary.
- No one travels alone. Do not run on uneven ground. Failure Bow is in play for mistakes, not for injuries.

### Digital specimens

An incomplete skeleton. Missing bones along the route. Some collect in transit (haptic + sound + full-screen). Some need investigation. The phone does **not** give a direction arrow or a distance. GPS must be stable before a capture counts.

Replay (Station 3): each device is calibrated to find someone else’s fragment; someone else finds yours. Authentication is two people standing in the same geofence, each confirming on their own phone. No data passes between phones. No live internet.

They receive the Rune whether or not every specimen was recovered.

### Echo Mirror in the field

Two minutes in the body, eyes open, feet on the ground. Then a short sequence of **choose-up-to-two** prompts, then a template that echoes their own words back. No AI. No diagnosis. Optional free text. They pick one **field experiment** for the replay and keep it private until they choose to share.

Shuttle prompt after Adaptability (pattern for later Runes):

- One moment they recognised an automatic response
- What happened when they tried another (multiple choice)
- Complete: *When I notice ____, I want to remember ____.*

### Thirty days later

A light check: did they use the chosen response at work. Not a course. Not a community feed.

---

## How an admin / facilitator runs it

Two consoles. Guest phones never see the admin one.

### Before the retreat (overnight)

1. Create a **retreat instance** (dates, product: PACE Expedition / Trail Quest day / etc.).
2. Enter the **roster**: name or expedition identifier, team assignment. Identities must exist before leaving Basecamp.
3. Generate join codes. One per guest. Reprintable on paper.
4. Attach a **content pack** (JSON): quests, copy, timers, geofences, rune ids, concealment flags, Mirror prompts, Field Recorder interval, cross-calibrated detection chain for Adaptability Station 3.
5. For every team, preload:
   - complete roster
   - approved offline search boundary
   - fragment geofences
   - who detects whom (closed chain: nobody detects their own; everyone depends on someone else)
   - ten-minute timer
   - challenge instructions and result screens
   - local slots for detection, authentication, replay, experiment
6. Print the **paper pack**. It is the source of truth if two phones die.

### Morning of an outdoor quest

Device check **before the descent**, not at Station 1 unless a phone actually fails:

- pack downloaded and the right expedition is active
- participant identity and team are correct
- location + precise location
- notification, sound, haptic
- offline map and boundary load
- battery for the day
- clock is accurate
- Trail Quest can stay open during a challenge

Site and geofence are **field-tested**, not desktop-drawn. Boundary: stable, visible from the trail, no cliffs, large enough to search, small enough to hear each other, finishable in ten minutes. Capture zones large enough for offline GPS drift; two people can stand in them. Radius set on site.

### During the day

Facilitator can:

- Start / pause a quest
- Unlock the next beat (Mirror, replay, rune reveal)
- Broadcast a condition change (“the route has changed”) without saying why
- Force a Field Recorder rotation
- Mark a team late; late-team and field-safety **outrank** the full-group ritual
- See quest progress (station reached, specimen count, Mirror completed) **not** private note text
- Hand a dead phone the paper pack and keep the day moving

Facilitator cannot:

- Read Echo notes
- Diagnose
- Remotely “complete” a guest’s inner work
- Override a guest’s pass on sharing

Physical ritual (Adaptability as the worked example): two facilitators, up to 20 guests, spare artifacts, phones away, Play visible. Target 12:15, latest 12:20. If a team is missing, begin anyway.

Digital Rune activation is a facilitator prompt on the shuttle, not an automatic ping in the circle.

### After

- Optional encrypted sync of **non-private** progress when the guest is back on Basecamp Wi-Fi (D10 still open for notes)
- 30-day check scheduled from the instance end date
- After-action: what the pack got wrong, written into this file, not into a second spec

---

## Screens (pilot)

### Guest

| Screen | Job |
|---|---|
| Join | Code + first name. No mid-quest login wall. |
| Today | Sequence for this instance. What is open, what is locked. |
| Offline banner | Always honest. Pack is local. |
| Active quest | Field transmission, “Simply:” plain-language line, no spoiler of the Rune. |
| Map / boundary | Approved area only. No pin on the prize. Optional; paper map is valid. |
| Specimen alert | Haptic + sound + full screen. Stable GPS before confirm. |
| Authenticate | Two people, same geofence, each on their own phone. |
| Field Recorder | Who holds the watch; rotate prompt. |
| Echo Mirror | One prompt at a time. Multi-choice + optional note. Template echo-back. |
| Experiment | One choice, carried privately into the replay. |
| My Runes | Empty until activated. Then glyph + principle + carried-forward set. |
| Shuttle / evening note | Short. Then lock the phone. |
| 30-day | One screen, one question. |

### Facilitator / admin

| Screen | Job |
|---|---|
| Instances | Create, clone yesterday’s pack, archive. |
| Roster | Names, teams, join codes, paper reprint. |
| Pack editor | JSON with a human form in front of it. Concealment flags. |
| Live | Teams on course. Station, timer, dead-phone flag. No note text. |
| Broadcast | Condition change, Recorder rotation, unlock reveal. |
| Safety | Emergency copy, late-team procedure, “app loses to the land”. |
| After | Export non-private completion. Schedule 30-day. |

---

## Content pack (shape)

One pack per retreat instance. Versioned. Pre-downloaded.

```json
{
  "instanceId": "pace-2026-11-xx",
  "product": "pace-expedition",
  "days": [
    {
      "id": "day-1-play",
      "runeId": "play",
      "concealUntil": "reveal",
      "beats": ["welcome", "mirror-1", "impossible-expedition", "mirror-2", "replay", "receive", "reveal", "activate"],
      "mirror": { "prompts": [] },
      "geofences": []
    },
    {
      "id": "day-2-adaptability",
      "runeId": "adaptability",
      "fieldRecorderMinutes": 20,
      "stations": ["transit-specimens", "station-1", "station-2", "mirror", "station-3-replay", "silent-walk", "reveal"],
      "detectionChain": [["alex", "brianna"], ["brianna", "carlos"]],
      "geofences": [],
      "timers": { "station3": 600 }
    }
  ],
  "runes": [
    { "id": "play", "principle": "…", "carriedInto": ["adaptability"] }
  ]
}
```

Copy in the pack uses two registers, as the PDF does: **field voice** and **Simply:** (the plain sentence someone can read aloud). APP-01 does not invent a third voice. D18 (Tessellate) stays closed as guest-facing.

GPS where it has been walked. Facilitator unlock where GPS is a liar. Timed beats as backup.

Local-first. Sync of progress — not notes — on Basecamp Wi-Fi. D10 decides whether notes ever leave the device.

---

## Safety and privacy (in the product)

- Notice, don’t excavate.
- Pass is always available. A pass counts as a turn.
- No forced dancing, running, disclosure, alcohol, purchase, or approaching an unbriefed stranger.
- Personal Echo observations stay private unless the person shares.
- Town partners are collaborators, not props.
- App vs land: land wins.
- Under-18 is D19 — adult default until partners say otherwise.

---

## What waits

| Item | Why |
|---|---|
| Native iOS / Android | PWA + paper is the November path (C05) |
| Full Echo taxonomy | Forged in rooms, not in the pack |
| Guest-facing AI | C04 |
| Tessellate as a character | D18 |
| Social / team feed of notes | Privacy |
| Connection town geofences | Partners and D08 not closed; pack can stub |
| Existence day route | D07 |
| Public Rune name if D02 flips | Existence is current in the PDF and `04`; `00_README` still says Experience. Do not print a fourth-Rune word until D02 is closed. |

---

## Definition of done for pilot 1

- One retreat instance loads overnight
- Four Rune reveals + Mirror prompts run **offline**
- Field Recorder rotation works; phones-in-pockets is the default on the trail
- Digital specimens and the cross-calibrated replay work on a **walked** geofence, or facilitator unlock stands in
- Facilitator can finish the day if two phones are dead
- Privacy sheet signed; notes not in the live console
- Paper pack matches the digital beats

Build will tweak timings, copy and geofence radii. It should not tweak the loop: experience → friction → Mirror → experiment → receive / reveal / activate.

## Changelog

- 2026-09-08 — PWA + paper fallback chosen over native-first.
- 2026-09-10 — Ingested *Unearth Self MVP.pdf*. Guest and facilitator views written. Field Recorder, concealment, digital specimens, local Mirror. APP-01 may spec screens and JSON; it may not close D02, D06, D07, D08, D10, D18.
