# Leads: product evolution spec

`30_LEADS_STRATEGY.md` is the governing frame for leads work, and it governs where this file differs.

**Status:** Spec. Not built.  
**Date:** 18 November 2026  
**Owner:** Christopher  
**Builds on:** `07_WS_SALES_MARKETING.md`, the live research list at `/admin/leads`, and `25_WS_VOICE.md`  
**Code this spec describes, and does not change:** `src/lib/lead-score.ts`, `src/lib/leads-scout.ts`, `src/lib/leads-book.ts`, `src/lib/lead-copy.ts`, `src/routes/admin.leads.tsx`

This file is the next sales spec. `07` remains the workstream. Do not treat this file as permission to send, buy data, or rewrite the scorer.

## Hard rules

- Human approval before any publish, contact, or spend. Nothing sends without Approve. The desk already blocks Send until a person approves the draft. Keep that.
- Unearth Self is completely separate from GeoLab and Geolab Studio. No shared data, tools, or copy.
- Never invent land, building, programme, pricing, partner, or date facts. If a line is not in this folder, it does not go in an email.
- Partners by first name only: Lisa, Tess, Norah, Christopher.
- Basecamp is one word.
- Canadian spelling.
- No em dashes anywhere in this doc, and none in a lead email.
- Do not propose Clay or any other paid data vendor as the way to build this. A paid source may appear only as an open question for the partners.
- The access gate in `07` stays: named person, plus a published email, plus the source URL. Otherwise the draft may exist and Send stays blocked.
- Sends go from chris@badlandsbootcamp.com. Gmail is not wired into the site. Approve, then the person sends.

## What already exists

`/admin/leads` is the research list, not the pipeline. The companies table shows Company, Place, Size, and Score. Changed 20th November 2026 on Christopher's approval. The desk lists a card with a named person, a verified or published email, a source URL, and no block flag. It hides a card with no email, and it hides a stopped card. It sorts by the Hunter fit score stored at filing, then the lead-score fit, then the lead-score total. Score bands are not a sending or desk gate, and the card does not show a hold-band label. There is no Partner column.

Fit today is geo plus size plus industry. Access is 12 for a named person (two real name tokens, not "hr", "people", or "team"), 10 for an email that is valid and has an http(s) source, and 3 for an http(s) company source. Timing is computed from dated signals with source URLs and a last-touch adjustment. It is not typed in.

Hunter's nightly run looks only at Calgary, Edmonton, and Red Deer, headcount 80 to 800, and the first-wave industries in `lead-score.ts`: energy, construction, professional, healthcare, engineering, logistics, education, civic. A name or email is kept only when that exact text is on the page at `emailSource`. Otherwise the field stays blank.

The draft generator in `lead-copy.ts` does not do that kind of care. It wraps one house paragraph around the company name and the stored "why" text. That paragraph is the failure this spec exists to replace. Section 4, the humanizer, is the most important part of the replacement. Enrichment, rewrite, and experiments exist so that a human-sounding letter has something true to stand on.

## 1. Lead enrichment

### Problem

Cards arrive with an empty name, an empty title, or no people lead. Scoring then marks Access incomplete, which is correct, but the desk never goes looking. A later email either greets "People team" or waits forever. Guessing a name, or guessing `first.last@domain`, would break the access gate.

### What it must do

Before `scoreCompany` runs, try to fill only these empty fields from public pages:

- contact name
- contact title
- people lead or HR lead, when a public page names a person in that role

Sources, in this order: the company site (team, about, leadership, contact), a press release, then public information that is visible at a LinkedIn URL we can store. Every filled field stores the URL of the page the text came from. If the page does not contain the text, the field stays empty.

Then score. A new name without a published email raises the named-person points and still leaves Send blocked. A published email, found on that same page, can complete Access. The human still Approves before anything is sent.

### Data fields and flow

Keep the current buyer fields: `buyerName`, `buyerTitle`, `email`, `emailSource`.

Add, only when a public page supports them:

| Field | Meaning | Required with it |
|---|---|---|
| `peopleLeadName` | Named person who leads people, HR, or culture | `peopleLeadSource` URL |
| `peopleLeadTitle` | Title as printed on that page | same URL |
| `fieldSources` | Map of field name to URL, for name, title, and email as well | one URL per filled field |

Flow:

1. Hunter's nightly run, the always-on hunt, a seed, or a hand entry writes the card. Blanks stay blank.
2. Enrichment reads public URLs already on the card, then the company domain's obvious public pages. It does not crawl a login wall.
3. A filler accepts a string only when `contactIfPresent` (or the same test) finds that string on the fetched page.
4. The card stores the string and the URL. Unfilled fields are empty strings, not "Unknown" and not a department name standing in for a person.
5. `scoreCompany` runs on the enriched card.
6. The panel shows each filled field beside its source link, as it already does for the published email.

`buyerName` of "HR" or "People team" does not count as a named person. That rule already exists. Enrichment must not write those strings back to look busy. Hunter judges buyer fit by reasoning about the company and the person's role for a Drumheller hotel spa team retreat; no fixed title list. Changed 20th November 2026 on Christopher's approval.

### Acceptance criteria

- A card with no public name is unchanged after enrichment, and the panel still says there is no named contact.
- A name taken from a team page shows that page's URL on the card.
- An email is stored only when the exact address is on the cited page. A pattern such as first.last@ is never written.
- Send remains blocked when any of the three gate parts is missing: named person, published email, source URL.
- Scoring runs after enrichment, not before, so Access reflects what was actually found.
- No request is made to Apollo, Clay, or another paid vendor.

### Guardrails

- Do not invent emails. `07` is explicit.
- Do not treat a LinkedIn URL as proof if the text is behind a login. Leave the field empty.
- One source URL per field. A homepage that does not contain the name is not a source for the name.
- Enrichment never sends mail and never spends money.
- Unearth Self data stays in the Unearth Self book. Nothing is written to a GeoLab store.

### Open questions

- Paid sources are a partner question only. `07` says "Do not buy Apollo." The partners have not lifted it. Clay is not approved either. Do not design the job around either of them. If a partner later names a paid source, it needs its own decision in `17` before any call is made.
- Whether a press-release wire page is an acceptable source when the company site is silent. Working rule until a partner says otherwise: yes, if the URL is public and the text is on that page.

## 2. Email rewrite layer

### Problem

The current draft is a template. `draftForCompany` puts the same paragraph on every card. The sentence that gives it away is:

> Unearth Self is a two or three day expedition for teams of 8 to 24, ninety minutes from Calgary, at Basecamp in Drumheller.

"Teams of 8 to 24" is the enquiry band in `07` ("teams of 8 to 24, 2 to 3 days") wearing a sentence. The same failure shows up as any data field dropped into prose: a headcount band, a score, a city list, "teams of 12 to 20 off-site." The stored `why` is then pasted in whole, so the second paragraph is research notes, not a letter. The greeting falls back to "People team" when there is no first name. The subject joins the company name to "Unearth Self, Drumheller" with an em dash. The body also states "Spring 2027" and "ninety minutes from Calgary," which are not in this folder (see the note under section 4).

### What it must do

Generate each email from two things we actually hold:

- the recipient's role (title on the card, with its source URL)
- the company's dated signals (kind, date, note, source URL)

Data fields may decide what the letter is about. They must not appear as filler phrases. Do not write "teams of 8 to 24." Do not write the score. Do not write "headcount 80 to 800." If the role is empty, do not invent one, and do not greet a department as if it were a person.

The generator proposes a subject, an opener, and a body. Section 4 then rewrites that proposal into Christopher's voice. Section 3 may hold more than one proposal for the same card. A human Approves one. Send uses the approved text only.

### Data fields and flow

Inputs already on the card: `buyerName`, `buyerTitle`, `peopleLeadTitle` once it exists, `signals[]` (`kind`, `date`, `sourceUrl`, `note`), `org`, `why`, `whySources`.

New output, stored on the draft, not only in the textarea:

| Field | Meaning |
|---|---|
| `draftSubject` | Already exists. One sentence, no em dash. |
| `draftBody` | Already exists. The letter after the humanizer. |
| `draftRole` | The title the letter used, copied from the card, or empty |
| `draftSignalIds` | Ids of the signals the letter actually cites |
| `draftFacts` | Short list of SoT fact ids the letter relied on, so a reviewer can see the warrant |

Flow: enriched card, then generator, then humanizer, then the existing draft editor, then Approve, then Send. `draftProblems` stays in force: 120 to 180 words, no price, no canyon product while D13 (adventure cover) is open.

### Acceptance criteria

- Two companies with different titles and different signals do not get the same opener.
- A card with no signals and no title still gets a letter, and that letter does not pretend a role or a news event.
- Searching a finished draft for "8 to 24", "12 to 20", "80 to 800", and the numeric score finds nothing.
- Every factual claim about the product traces to a line in this folder, or the draft is rejected.
- The "why" blob is not pasted as a paragraph. A single clause may point at one sourced signal.

### Guardrails

- No prices. D01: Bootcamp package prices are still unpublished. Norah signs them.
- No canyon day, abseil, or rappel. D13 is open.
- No "Spring 2027" and no travel-time claim until a partner confirms them. They are in the current template and nowhere in this folder.
- No health, medical, weight-loss, or clinical outcome claims. `07` already forbids a Rune outcome sold as a medical result.
- The access gate is unchanged. A beautiful draft does not unlock Send.

### Open questions

- How many signals may one letter cite? Working rule: one, the most recent that still scores, so the letter stays specific.
- Whether `why` remains a research note for the panel only, and never enters the model prompt. Working rule: the model may see `whySources`, not the prose `why`, so it cannot launder an unsourced sentence.

## 3. Experiments module

### Problem

Every card gets one subject and one body. We cannot tell whether a reply came from the offer, the opener, or the subject. Nothing is logged as a test, so a lucky sentence becomes the next template by memory.

### What it must do

- Split sends into variants on three axes only: subject, opener, angle. One axis per experiment, so a win has a cause.
- Track open rate and reply rate per variant.
- Refuse to name a winner before a minimum sample.
- Feed the winning text into the generator as an example.
- Retire the losing text so the generator cannot pick it again.
- Log every experiment, including the ones that never reach a winner.

Reply rate is the primary metric. Open rate is recorded and not trusted. Apple and other privacy proxies prefetch images and mark mail as opened, so an open is not a person. Do not build a prize around opens.

### Data fields and flow

| Field | Meaning |
|---|---|
| `experimentId` | Stable id |
| `axis` | `subject`, `opener`, or `angle` |
| `variants` | Two or more. Each has id, text, status (`live`, `winner`, `retired`) |
| `assignments` | Card id, variant id, approved at, sent at, from address |
| `replyAt` | Set only when a human logs a real reply, or when a later inbox connection records one |
| `openAt` | Optional, marked untrusted |
| `sampleFloor` | Integer. No winner under this many sent per variant |
| `promotedExample` | The winner's text, plus the card facts it was allowed to use |

Flow: generator writes variants, humanizer passes each one, a person Approves the assignment (still one send at a time, still from chris@badlandsbootcamp.com), the log records the variant, a reply updates `replyAt`, a job compares rates only after `sampleFloor`, the winner is copied into the example set, the loser is `retired`.

No variant sends itself. Approve is still per recipient.

### Acceptance criteria

- An experiment with fewer than `sampleFloor` sends on either side cannot be marked won.
- A retired variant does not appear in a new draft.
- The log shows who approved each send, which variant, and whether the reply field was set by a person.
- Open rate is visible and labelled untrusted. The winner rule reads reply rate only.
- A card in a stopped or do-not-email band cannot be assigned.

### Guardrails

- Do not run an experiment that changes the offer, the price, or a fact. Axes are subject, opener, and angle. The land and the product stay inside the SoT lines.
- Do not email a list in bulk to "get to sample size." Each row still needs Access and Approve.
- Do not use open pixels as a condition of Send. If a pixel is added later, it is measurement only, and the privacy-proxy limit stays written on the screen.
- Nothing about GeoLab.

### Open questions

- The number for `sampleFloor` is not in the SoT. Do not invent a statistical law. Until the partners set it, the module must refuse to mark a winner at all. A working proposal to put in front of them: 20 sent per variant, judged on replies, not opens. That number is a proposal, not a fact.
- Who logs the reply until a mailbox is connected? Working rule: Christopher, on the card, in the same Approve path. No silent scrape of a personal inbox.

## 4. Humanizer

**This is the most important element in the spec.** Enrichment, rewrite, and experiments are worthless if the letter still sounds like a model. Every email must read as written by Christopher, personally.

### Problem

`25_WS_VOICE.md` already names the failure: AI-shaped prose is a tell. The current lead draft is that tell. It uses an em dash, a triad ("Land, sequence, recovery."), a "not a hotel ballroom" contrast, a headcount band as a sentence, and a date the SoT does not hold. A reader can tell the paragraph was stamped, not written.

Voice for `25` is people who have been on the land and then gone back to the kitchen. Specific objects. Numbers only when we have them. Warmth in the facts, not in the adjectives.

### What it must do

Every outbound lead email, including each experiment variant, must pass a humanizer pass before it can be Approved.

The letter is:

- first person, from Christopher
- prose, not bullets, not a one-pager
- short sentences
- direct address, by first name when Access has a named person, and never "People team"
- one specific reference to that recipient's company or role, drawn from a field that has a source URL, or from one dated signal
- humble and confident in the same note: we know what the expedition is, and we do not pretend it is the only way they could spend a week
- from chris@badlandsbootcamp.com, said in the desk UI as it is today

Lead with the land's offer, using only what this folder supports:

- Badlands Bootcamp is a 2 to 5 day expedition in Drumheller (`00`, `01`, `04`). Adaptation Lab is the 2 to 3 day corporate form. PACE Expedition is the 2 to 5 day flagship. Getaway Day is a half or a full day.
- Corporate teams come first (`01`).
- The buyer's job, in `07`, is a team offsite that is not another hotel ballroom.
- The group begins at Basecamp (`04`, Day 1). Basecamp is the HQ in Drumheller (`01`). Haven is the four suites, separate from the expedition.

**Pending partner confirmation, do not state these as fact:**

- "About 90 minutes from Calgary," and the template's "ninety minutes from Calgary," are now confirmed and recorded in `20` (Christopher, 19th November 2026): about 128 kilometres from Calgary airport, about 135 kilometres from downtown Calgary, roughly an hour and a half.
- "Cannot be replicated in a boardroom or resort." `07` says "not another hotel ballroom." It does not say boardroom, and it does not say resort. Use the ballroom line only if the sentence can live without a "not X" trick. Otherwise wait.
- "Spring 2027" as the first window. It is in `lead-copy.ts` and not in this folder.

Until a partner writes those lines into the SoT, the humanizer rejects them.

### Data fields and flow

The humanizer is a gate on `draftBody` and `draftSubject`, same family as `draftProblems`.

It records:

| Field | Meaning |
|---|---|
| `humanizerPass` | true only when the reject list is clear and the voice checks passed |
| `humanizerNotes` | which check failed, in plain language |
| `voiceFactIds` | which SoT lines the letter used |

Approve is disabled while `humanizerPass` is false. A person may edit the text and run the check again. A person may not override the check to force a send. If the letter cannot be made true, it does not go.

### Acceptance criteria

- A draft that contains any reject-list item cannot be Approved.
- A draft with no specific company or role reference cannot be Approved.
- A draft that says "90 minutes," "ninety minutes," "boardroom," "resort," or "Spring 2027" cannot be Approved, until the SoT records that fact.
- The signed name is Christopher, and the desk still shows the from-address chris@badlandsbootcamp.com.
- The letter is first person and within the existing 120 to 180 word band.
- Three short before-and-after pairs, below, are the regression examples. The afters use only SoT facts.

### Guardrails

Reject list. If any of these appear, the draft fails:

- em dashes
- synergy, leverage, circle back, touch base, bandwidth, unpack, deep dive, move the needle, value-add, best-in-class, world-class, cutting-edge, seamless, curated, journey, unlock, elevate, transformative, holistic
- health and clinical language: detox, weight-loss, healing, therapy, triggered, dysregulated, reactive, activated, trauma, diagnosis
- "not X, but Y" and "not X. Not Y." contrasts, including the current "Not a hotel ballroom with a hike attached."
- abstract triads used as a slogan ("Land, sequence, recovery.")
- a data field spoken as a sentence: "teams of 8 to 24," "teams of 12 to 20 off-site," "headcount 80 to 800," any score number
- a price, a canyon product, an invented partner, an invented date
- GeoLab, Geolab Studio, Apollo, Clay
- greeting a department ("People team", "Hi HR")

Also keep the `25` bans in force for this mail: no museum-wall kindness, no consultancy one-pager, no wellness brand that discovered the town on a moodboard.

### Before and after

These are spec examples, not sendable mail. Brackets are empty slots, not facts. Do not fill them with a company the SoT does not name.

**1. The stamped offer**

Before:

> Unearth Self is a two or three day expedition for teams of 8 to 24, ninety minutes from Calgary, at Basecamp in Drumheller. Not a hotel ballroom with a hike attached. Land, sequence, recovery.

After:

> I write from Drumheller. Badlands Bootcamp is a two to five day expedition on this land, and corporate teams are the people we are hosting first. You would start at Basecamp. I will not put a price in this letter. If a month is open for your team, tell me which one.

Warrant: `00` and `01` and `04` for the two to five day expedition; `01` for corporate teams first; `04` for the first evening at Basecamp; `07` and D01 for leaving the price out. The travel-time clause and the "8 to 24" clause are gone on purpose.

**2. Role and one signal**

Before:

> I am writing because [the whole stored why paragraph]. Banff is the default offsite from the corridor. We are the other option.

After:

> You are [title] at [org]. I read [one signal note] on [signal date], on the page we have saved. That is the reason for this letter, not a round of outreach. A Bootcamp here is two to five days. If that week is useful for the people you are responsible for, reply. If it is not, say so and I will leave the file quiet.

Warrant: the title, the org, and the signal must already be on the card with URLs. "Two to five days" is `01` and `04`. "Banff is the default offsite" is not a line in this folder. `01` says Drumheller is not a larger version of Banff. That is a different claim, and this letter does not need it.

**3. Subject**

Before: the company name, an em dash, then "Unearth Self, Drumheller."

After: "A week in Drumheller for your team"

Warrant: the expedition is multi-day in the SoT, so "a week" is fair for the two to five day flagship and too strong for a Getaway Day. Use the after only when the angle is PACE Expedition or Adaptation Lab. For a one-day product, the subject has to say the day, not the week.

### Open questions

- Tess reviews product language when a letter names PACE, a Rune, or the Echo Mirror (`25`). Most first-touch letters should not need those words. If one does, her pass is required before Approve. Confirm with Tess whether first-touch mail should avoid Rune names entirely.
- The 90-minute line is now confirmed and recorded in `20` (Christopher, 19th November 2026). The boardroom or resort line, and any "first season" date, stay pending partner confirmation. Do not write them into `07` from this spec. A partner has to put them there.

## 5. Per-email customization

### Problem

`27_LEADS_SAMPLE_EMAILS.md` holds one combined sample email that Chris approved as the starting template. Sent as is, it would be the same letter on every card, which is the failure section 2 exists to remove.

### What it must do

Start every draft from the `27` template, then customize it for the one person it is going to:

- greet the recipient by first name, from `buyerName` or `peopleLeadName`
- name their title and company, from `buyerTitle` or `peopleLeadTitle` and `org`
- fit the opener to their industry, from the card's first-wave industry
- use one other enriched field when it has a source URL, such as one dated signal

Keep the template's storytelling prose and its order: who they are, what the days and evenings are like, the land, where it sits, the close. The humanizer (section 4) still runs on every customized letter. It must read as Christopher writing to this one person, humble and confident, in short sentences, never bullet points.

### Data fields and flow

| Field | Meaning |
|---|---|
| `templateId` | The `27` template version the draft started from |
| `customFields` | Card fields the letter used, each with its source URL |
| `customNotes` | Template slots left as written because the field was empty |

Flow: enriched card (section 1), then the `27` template filled from that card's sourced fields, then the rewrite layer (section 2), then the humanizer (section 4), then Approve, then the person sends from chris@badlandsbootcamp.com.

### Acceptance criteria

- No two drafts for different recipients share the same greeting and opener.
- Every filled slot shows its field and source URL beside the draft.
- An empty name, title, or people lead is never guessed. The slot falls back to plain wording, never a department greeting.
- The template's product facts are not changed by customization. Only the recipient slots change.

### Guardrails

- No field without a source URL goes into a letter.
- Customization never changes a land, building, programme, pricing, partner, or date fact.
- Approve and the access gate are unchanged.

### Open questions

- `27` as written today trips the section 4 checks: it states six to twenty-four, ninety minutes from Calgary and Spring 2027, and it signs off as Chris. Whether the partners update the template or the reject list.

## 6. A/B testing

### Problem

Section 3 sets out the experiments module. Chris asked on 18 November for A/B testing to be named as its own working layer on top of the customized `27` letter, with a default threshold so it can run.

### What it must do

- Split approved sends between two versions of the customized letter, one axis at a time (subject, opener, or angle, as section 3 sets).
- Track open rate and reply rate per version. Reply rate decides. Open rate is shown and marked untrusted.
- Once each version has the threshold number of sends, mark the better reply rate as the winner.
- Feed the winner back into the generator as an example for the next drafts.
- Discard the loser so it is never drafted again.

### Data fields and flow

Uses the section 3 fields (`experimentId`, `axis`, `variants`, `assignments`, `replyAt`, `openAt`, `sampleFloor`, `promotedExample`). Adds:

| Field | Meaning |
|---|---|
| `sampleFloorSource` | Who set the threshold and when |

Default `sampleFloor` is 20 sends per version (Chris, 18 November call). It is still pending Chris setting the real number. For this layer it replaces the section 3 working rule that no winner may be named until the partners set a number.

Flow: customized letter (section 5), then two versions on one axis, then humanizer on each, then Approve per recipient, then send, then reply logged on the card, then the compare job at the threshold, then the winner promoted and the loser retired.

### Acceptance criteria

- No winner before 20 sends per version, or the number Chris later sets.
- A retired version never appears in a new draft.
- The winner's text shows up as a generator example with the card facts it was allowed to use.
- Every send in a test still passed the access gate, the humanizer, and Approve.

### Guardrails

- Do not send in bulk to reach the threshold. Each send is still one approved recipient.
- Versions never differ on a fact, a price, or the offer.
- Nothing about GeoLab or Geolab Studio.

### Open questions

- The real threshold. Pending Chris.
- Who logs replies until a mailbox is connected. Section 3 working rule stands: Christopher, on the card.

## Geography, left open on purpose

Leads are not only Calgary, Edmonton, and Red Deer. The Drumheller product has demand further afield in Canada and the United States. Phase one, changed 20th November 2026 on Christopher's approval, searches and files Canada and the United States only, with Canada as the majority. The Fit geo score still weights Alberta higher than the rest of Canada, and Canada higher than the United States.

What the code does today, quoted from `src/lib/lead-score.ts`:

```ts
export function geoPoints(city: LeadCity): number {
  if (city === "Calgary") return 22;
  if (city === "Edmonton") return 20;
  if (city === "Red Deer") return 16;
  return 6;
}
```

`LeadCity` is Calgary, Edmonton, Red Deer, or Alberta. Anywhere else falls through `coerceCity` into Alberta and scores 6, out of 22 available geo points, inside a Fit score of 60. Hunter's nightly prompt is narrower still: "Cities: Calgary, Edmonton, Red Deer." `selectScoutRows` drops any other city before scoring. Headcount must be 80 to 800 or the row is dropped. First-wave industry is required or the row is dropped.

`07` describes the same local motion: "Build a Calgary / Edmonton corporate pipeline" and a research list of "Calgary / Edmonton / Red Deer, headcount 80 to 800."

Do not quietly change the weights. A wider map needs a partner decision: which cities or countries enter the nightly run, what they score, and whether 80 to 800 still fits a US buyer. Until that decision, the nightly run stays on the three cities, and this spec does not pretend a Toronto or Houston card is in the morning batch.

## What this spec does not do

- It does not change code, the scorer, the cron, or the access gate.
- It does not close D01, D04, or D13.
- It does not authorise a data purchase.
- It does not connect Gmail. The from-address is a fact of the send the human makes, from chris@badlandsbootcamp.com.

## Changelog

- 18 November 2026. Spec opened from the live leads desk. Humanizer marked as the most important element. 90 minutes from Calgary, and a boardroom or resort claim, left as pending partner confirmation.
- 18 November 2026. The companies table is Company, Place, Size, and Score. A separate Hunter score and a Partner value are not stored on a lead. Chris asked for this.
- 18 November 2026. Added section 5, per-email customization from the `27` template, and section 6, A/B testing with a default threshold of 20 sends per version, pending Chris setting the real number.
- 19th November 2026. File 30 named as the governing frame for leads work. Where this file differs, file 30 governs.
- 19th November 2026. Calgary distance confirmed by Christopher and recorded in `20`: about 128 kilometres from Calgary airport, about 135 kilometres from downtown Calgary, roughly an hour and a half. The 90-minute line in this file now points there. Boardroom, resort, and Spring 2027 stay pending.
