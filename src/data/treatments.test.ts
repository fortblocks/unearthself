import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HERO_KICKER, HERO_SENTENCE, MENU_NOTE, WHAT_IT_IS, WHAT_IT_IS_PARAGRAPHS } from "./basecampCopy.ts";
import { TREATMENT_GROUPS, TREATMENTS, treatmentById } from "./treatments.ts";

const PLACEHOLDER = /lorem ipsum|coming soon|add what you want|book opens the same panel|\bTODO\b/i;

const MENU = [
  ["quad-ir", "Quad infrared sauna", "40 min", 55],
  ["single-ir", "Single infrared sauna", "40 min", 55],
  ["steam", "Salt stone steam", "30 min", 55],
  ["plunge", "Cold plunge", "15 min", 40],
  ["circuit", "Fire and Ice circuit", "A set", 100],
  ["mud-bath", "Mud bath", "Bath", 65],
  ["herbal-bath", "Herbal bath", "Bath", 75],
  ["red-light", "Red light", "20 min", 20],
  ["reiki", "Reiki", "55 min", 80],
  ["lymph", "Lymphatic bodywork", "55 min", 80],
  ["stone", "Stone, hot or cool", "55 min", 90],
  ["unearthed", "Unearthed Bodyworks", "75 min", 115],
  ["exfoliation", "Full body exfoliation", "45 min", 85],
  ["herbal-wrap", "Herbal wrap", "90 min", 199],
  ["mud-wrap", "Mud wrap", "55 min", 110],
  ["seaweed", "Seaweed wrap", "55 min", 110],
  ["mud-red", "Mud and red light", "30 min", 75],
  ["facial", "Advanced facial", "55 min", 160],
  ["brow", "Brow tint", "20 min", 25],
  ["rmt", "RMT massage", "55 min", 140],
  ["sound", "Sound bath", "55 min", 250],
] as const;

test("launch menu names, times and prices stay as published", () => {
  assert.deepEqual(
    TREATMENTS.map((t) => [t.id, t.name, t.mins, t.price]),
    MENU.map((row) => [...row]),
  );
});

const LINES: Record<string, string> = {
  "quad-ir": "Forty minutes of shared infrared heat, for up to four people.",
  "single-ir": "Forty minutes of infrared heat, for one person.",
  steam: "Thirty minutes in the steam room.",
  plunge: "Fifteen minutes in cold water.",
  circuit: "A set that moves you between heat and cold.",
  "mud-bath": "A warm mud bath in Fire and Ice.",
  "herbal-bath": "A warm herbal bath, for two people at most.",
  "red-light": "Twenty minutes with three panels. An extra panel is five dollars.",
  reiki: "Fifty-five minutes on the treatment table.",
  lymph: "Fifty-five minutes on the treatment table.",
  stone: "Fifty-five minutes of hot or cool stone therapy.",
  unearthed: "Seventy-five minutes. Our longer signature treatment.",
  exfoliation: "Forty-five minutes on the treatment table.",
  "herbal-wrap": "An hour and a half in a clinician room.",
  "mud-wrap": "Fifty-five minutes in a clinician room.",
  seaweed: "Fifty-five minutes in a clinician room.",
  "mud-red": "Thirty minutes combining mud and red light.",
  facial: "Fifty-five minutes on the treatment table.",
  brow: "A twenty-minute add-on.",
  rmt: "Fifty-five minutes with a registered massage therapist.",
  sound: "A fifty-five-minute group session, on dates when we have one.",
};

const DESCRIPTIONS: Record<string, string> = {
  "quad-ir":
    "You have forty minutes in our shared infrared sauna, in the Fire and Ice room. It is set up for up to four people, so you can come on your own or sit in the heat with others.",
  "single-ir":
    "Forty minutes in a private infrared sauna, just for you. This one is in a clinician room rather than the shared Fire and Ice space, so it stays quiet and you have the heat to yourself.",
  steam:
    "Thirty minutes in the salt stone steam room, in Fire and Ice. The room fills with warm steam so you can sit and breathe while the heat builds around you. This is booked for one session at a time.",
  plunge:
    "A fifteen-minute session in the cold plunge, in the Fire and Ice room. You step into cold water, stay as long as you want within that time, and get out. It is meant to be brisk, not a long soak.",
  circuit:
    "This visit takes you through heat and cold in the Fire and Ice room: the steam, the cold plunge, and the infrared sauna, so you can move between them in one booking. It is priced as a set rather than booking each part on its own.",
  "mud-bath":
    "A warm bath drawn with mud, in the Fire and Ice room. You settle into the water and stay with the mud and the heat for the length of the booking.",
  "herbal-bath":
    "A warm bath prepared with flowers, potpourri, and essential oils, in the Fire and Ice room. It is held for two people at most, so you can come on your own or share it with someone else.",
  "red-light":
    "Twenty minutes with our red light panels. The session includes three panels, and you can add another for five dollars if you want more coverage. You can book this on its own or add it to a table treatment.",
  reiki:
    "Fifty-five minutes of Reiki on the treatment table. It is a quiet session with a light touch, giving you time to rest while the practitioner works.",
  lymph:
    "Fifty-five minutes on the treatment table. This pairs gentle energy work with a light, soft lymphatic massage, and a touch of magnesium is blended into the oil. The pace is quiet, and easy to rest with.",
  stone:
    "Fifty-five minutes of stone therapy on the treatment table, using stones that are warmed or cooled, depending on what you need that day. You get both the pressure of the hands and the temperature of the stones.",
  unearthed:
    "Seventy-five minutes on the table. The session starts with massage work on the head, face, and neck, so you can settle and rest. Then comes a dry body brushing to gently exfoliate, and the body is worked with a blend of massage and essential oils. It finishes with stones that are warmed or cooled, applied where they are needed.",
  exfoliation:
    "Forty-five minutes on the treatment table. This is a brisk massage that exfoliates the whole body, lifting away dry and rough skin. It is a good treatment on its own, and it works well before a body wrap.",
  "herbal-wrap":
    "An hour and a half in a clinician room for a full body herbal wrap. You are wrapped and left to rest for the session. A shorter facial can be booked alongside if you want one.",
  "mud-wrap":
    "Fifty-five minutes in a clinician room for a full body mud wrap. The session includes a dry brush exfoliation, then the mud is applied and you rest while wrapped. A shorter facial can be booked alongside if you want one.",
  seaweed:
    "Fifty-five minutes in a clinician room for a seaweed wrap. The seaweed is applied and you rest while wrapped, then it is rinsed away. You can add infrared time, a shorter facial, or an exfoliation to the same visit if you like.",
  "mud-red":
    "A shorter thirty-minute session that pairs mud with red light. You apply the mud yourself and spend the time with the red light panels, then wash it off. It is a simple combined treatment if you do not want a full wrap.",
  facial:
    "Fifty-five minutes on the treatment table for an advanced facial. It is cleansing and hydrating, and it includes glycolic acid, so it goes further than a quick refresh.",
  brow: "A twenty-minute brow tint to deepen the colour of your brows. It is a short add-on you can book on its own or beside another treatment.",
  rmt: "Fifty-five minutes of massage with a registered massage therapist, a regulated health professional. The work is clinical, focused on the soft tissues and joints. We provide the room; their diary is their own, so this session depends on their availability.",
  sound:
    "A fifty-five-minute group sound bath. You lie back on a mat, with a blanket and pillow, and sometimes an eye mask, while a practitioner plays instruments such as crystal singing bowls, gongs, and chimes. These run on dates when we have a session booked, rather than every day, so we will let you know what is coming up if you want to join.",
};

test("treatment copy is the approved guest sentences", () => {
  assert.deepEqual(
    TREATMENT_GROUPS.map((group) => [group.id, group.line]),
    [
      ["heat", "These are the heat and cold sessions in our Fire and Ice room: sauna, steam, plunge, and baths."],
      ["light", "You can book red light on its own, or add it to a table treatment."],
      ["table", "These are the one-to-one treatments. Each booking is one person, in one room."],
      ["with", "For these sessions we provide the room, and the practitioner keeps their own diary."],
    ],
  );
  for (const treatment of TREATMENTS) {
    assert.equal(treatmentById(treatment.id), treatment);
    assert.equal(treatment.line, LINES[treatment.id]);
    assert.equal(treatment.description, DESCRIPTIONS[treatment.id]);
    assert.doesNotMatch(treatment.name, PLACEHOLDER);
    assert.doesNotMatch(treatment.line, PLACEHOLDER);
    assert.doesNotMatch(treatment.description ?? "", PLACEHOLDER);
    assert.doesNotMatch(`${treatment.line} ${treatment.description}`, /foot paddling|darkening the brows|Darcie|Barb/i);
  }
  assert.equal(treatmentById("missing"), undefined);
});

test("Basecamp hero matches the Bootcamp structure and drops the hotel wording", () => {
  assert.equal(HERO_KICKER, "Drumheller — the wellness centre");
  assert.equal(HERO_SENTENCE, "Basecamp is our wellness centre, in the heart of Drumheller.");
  assert.equal(WHAT_IT_IS, "Come in for the heat, the cold, and time on the table.");
  assert.deepEqual(WHAT_IT_IS_PARAGRAPHS, [
    "You arrive and put the day down for a while. Then you step into the heat, the cold, or a treatment on the table.",
    "The Fire and Ice room has the shared infrared sauna, the steam, the cold plunge, and the baths. You can book one of those on its own, or move through the circuit from heat to cold. Treatments on the table happen in their own rooms, one person at a time.",
    "If you are staying at Haven, you can book a session here during your visit. You can also come in if you live in town, or if you are only in Drumheller for the day.",
  ]);
  assert.doesNotMatch(WHAT_IT_IS_PARAGRAPHS.join("\n"), /—|–/);
  assert.equal(
    MENU_NOTE,
    "Prices in CAD. Select from massage therapy to healing work, weight loss and nervous system quieting.",
  );
  const opening = [HERO_KICKER, HERO_SENTENCE, WHAT_IT_IS, ...WHAT_IT_IS_PARAGRAPHS, MENU_NOTE].join("\n");
  assert.doesNotMatch(opening, PLACEHOLDER);
  assert.doesNotMatch(opening, /boutique hotel|under one roof|Base Camp|the house|Not a gym floor|Check in\. Exhale/i);

  const book = readFileSync(new URL("../components/basecamp/TreatmentBook.tsx", import.meta.url), "utf8");
  assert.match(book, /min-h-\[70vh\]/);
  assert.match(book, /max-w-5xl px-6 pb-16 pt-28/);
  assert.match(book, /mb-5 text-\[clamp\(2\.6rem,7vw,5\.2rem\)\]/);
  assert.doesNotMatch(book, /max-w-\[16ch\]/);
  assert.match(book, /Badlands/);
  assert.match(book, /Make a booking/);
  assert.doesNotMatch(book, /Request a conversation/);
  assert.match(book, /setOpen\(true\)/);
  assert.doesNotMatch(book, /\/book\/retreat/);
  assert.match(book, /What it is/);
  assert.match(book, /\{WHAT_IT_IS\}/);
  assert.match(book, /whitespace-nowrap/);
  assert.doesNotMatch(book, /md:whitespace-nowrap/);
  assert.match(book, /text-\[clamp\(0\.9rem,3\.4vw,2\.05rem\)\]/);
  assert.match(book, /mb-4 text-lg text-fossil\/80/);
  assert.match(book, /text-lg text-fossil\/80/);
  assert.match(book, /WHAT_IT_IS_PARAGRAPHS/);
  const whatItIs = book.indexOf("What it is");
  const menu = book.indexOf("The menu");
  assert.ok(whatItIs > 0 && menu > whatItIs);
  assert.match(book, /Add \$\{treatment\.name\}/);
  assert.doesNotMatch(book, />\s*Book\s*</);
  assert.doesNotMatch(book, /Not a gym floor with a candle/);
  assert.doesNotMatch(book, /the house/i);
  assert.doesNotMatch(book, /Come in from/);
  assert.doesNotMatch(book, /Check in\. Exhale/);
  assert.doesNotMatch(book, /boutique hotel|under one roof|The Haven|The place/i);
  assert.doesNotMatch(book, /Book opens the same panel/);
  assert.doesNotMatch(book, /\/basecamp\/\$slug/);
  assert.match(book, /What we do here/);
  assert.match(book, /aria-expanded/);
  assert.doesNotMatch(book, PLACEHOLDER);
});
