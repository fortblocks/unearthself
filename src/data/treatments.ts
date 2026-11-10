export type Treatment = {
  id: string;
  name: string;
  mins: string;
  price: number;
  group: "heat" | "table" | "light" | "with";
  line: string;
  /** Guest-facing paragraph for the open menu row. Omit only when there is no approved copy. */
  description?: string;
};

export const TREATMENTS: Treatment[] = [
  {
    id: "quad-ir",
    name: "Quad infrared sauna",
    mins: "40 min",
    price: 55,
    group: "heat",
    line: "Forty minutes of shared infrared heat, for up to four people.",
    description:
      "You have forty minutes in our shared infrared sauna, in the Fire and Ice room. It is set up for up to four people, so you can come on your own or sit in the heat with others.",
  },
  {
    id: "single-ir",
    name: "Single infrared sauna",
    mins: "40 min",
    price: 55,
    group: "heat",
    line: "Forty minutes of infrared heat, for one person.",
    description:
      "Forty minutes in a private infrared sauna, just for you. This one is in a clinician room rather than the shared Fire and Ice space, so it stays quiet and you have the heat to yourself.",
  },
  {
    id: "steam",
    name: "Salt stone steam",
    mins: "30 min",
    price: 55,
    group: "heat",
    line: "Thirty minutes in the steam room.",
    description:
      "Thirty minutes in the salt stone steam room, in Fire and Ice. The room fills with warm steam so you can sit and breathe while the heat builds around you. This is booked for one session at a time.",
  },
  {
    id: "plunge",
    name: "Cold plunge",
    mins: "15 min",
    price: 40,
    group: "heat",
    line: "Fifteen minutes in cold water.",
    description:
      "A fifteen-minute session in the cold plunge, in the Fire and Ice room. You step into cold water, stay as long as you want within that time, and get out. It is meant to be brisk, not a long soak.",
  },
  {
    id: "circuit",
    name: "Fire and Ice circuit",
    mins: "A set",
    price: 100,
    group: "heat",
    line: "A set that moves you between heat and cold.",
    description:
      "This visit takes you through heat and cold in the Fire and Ice room: the steam, the cold plunge, and the infrared sauna, so you can move between them in one booking. It is priced as a set rather than booking each part on its own.",
  },
  {
    id: "mud-bath",
    name: "Mud bath",
    mins: "Bath",
    price: 65,
    group: "heat",
    line: "A warm mud bath in Fire and Ice.",
    description:
      "A warm bath drawn with mud, in the Fire and Ice room. You settle into the water and stay with the mud and the heat for the length of the booking.",
  },
  {
    id: "herbal-bath",
    name: "Herbal bath",
    mins: "Bath",
    price: 75,
    group: "heat",
    line: "A warm herbal bath, for two people at most.",
    description:
      "A warm bath prepared with flowers, potpourri, and essential oils, in the Fire and Ice room. It is held for two people at most, so you can come on your own or share it with someone else.",
  },
  {
    id: "red-light",
    name: "Red light",
    mins: "20 min",
    price: 20,
    group: "light",
    line: "Twenty minutes with three panels. An extra panel is five dollars.",
    description:
      "Twenty minutes with our red light panels. The session includes three panels, and you can add another for five dollars if you want more coverage. You can book this on its own or add it to a table treatment.",
  },
  {
    id: "reiki",
    name: "Reiki",
    mins: "55 min",
    price: 80,
    group: "table",
    line: "Fifty-five minutes on the treatment table.",
    description:
      "Fifty-five minutes of Reiki on the treatment table. It is a quiet session with a light touch, giving you time to rest while the practitioner works.",
  },
  {
    id: "lymph",
    name: "Lymphatic bodywork",
    mins: "55 min",
    price: 80,
    group: "table",
    line: "Fifty-five minutes on the treatment table.",
    description:
      "Fifty-five minutes on the treatment table. This pairs gentle energy work with a light, soft lymphatic massage, and a touch of magnesium is blended into the oil. The pace is quiet, and easy to rest with.",
  },
  {
    id: "stone",
    name: "Stone, hot or cool",
    mins: "55 min",
    price: 90,
    group: "table",
    line: "Fifty-five minutes of hot or cool stone therapy.",
    description:
      "Fifty-five minutes of stone therapy on the treatment table, using stones that are warmed or cooled, depending on what you need that day. You get both the pressure of the hands and the temperature of the stones.",
  },
  {
    id: "unearthed",
    name: "Unearthed Bodyworks",
    mins: "75 min",
    price: 115,
    group: "table",
    line: "Seventy-five minutes. Our longer signature treatment.",
    description:
      "Seventy-five minutes on the table. The session starts with massage work on the head, face, and neck, so you can settle and rest. Then comes a dry body brushing to gently exfoliate, and the body is worked with a blend of massage and essential oils. It finishes with stones that are warmed or cooled, applied where they are needed.",
  },
  {
    id: "exfoliation",
    name: "Full body exfoliation",
    mins: "45 min",
    price: 85,
    group: "table",
    line: "Forty-five minutes on the treatment table.",
    description:
      "Forty-five minutes on the treatment table. This is a brisk massage that exfoliates the whole body, lifting away dry and rough skin. It is a good treatment on its own, and it works well before a body wrap.",
  },
  {
    id: "herbal-wrap",
    name: "Herbal wrap",
    mins: "90 min",
    price: 199,
    group: "table",
    line: "An hour and a half in a clinician room.",
    description:
      "An hour and a half in a clinician room for a full body herbal wrap. You are wrapped and left to rest for the session. A shorter facial can be booked alongside if you want one.",
  },
  {
    id: "mud-wrap",
    name: "Mud wrap",
    mins: "55 min",
    price: 110,
    group: "table",
    line: "Fifty-five minutes in a clinician room.",
    description:
      "Fifty-five minutes in a clinician room for a full body mud wrap. The session includes a dry brush exfoliation, then the mud is applied and you rest while wrapped. A shorter facial can be booked alongside if you want one.",
  },
  {
    id: "seaweed",
    name: "Seaweed wrap",
    mins: "55 min",
    price: 110,
    group: "table",
    line: "Fifty-five minutes in a clinician room.",
    description:
      "Fifty-five minutes in a clinician room for a seaweed wrap. The seaweed is applied and you rest while wrapped, then it is rinsed away. You can add infrared time, a shorter facial, or an exfoliation to the same visit if you like.",
  },
  {
    id: "mud-red",
    name: "Mud and red light",
    mins: "30 min",
    price: 75,
    group: "table",
    line: "Thirty minutes combining mud and red light.",
    description:
      "A shorter thirty-minute session that pairs mud with red light. You apply the mud yourself and spend the time with the red light panels, then wash it off. It is a simple combined treatment if you do not want a full wrap.",
  },
  {
    id: "facial",
    name: "Advanced facial",
    mins: "55 min",
    price: 160,
    group: "table",
    line: "Fifty-five minutes on the treatment table.",
    description:
      "Fifty-five minutes on the treatment table for an advanced facial. It is cleansing and hydrating, and it includes glycolic acid, so it goes further than a quick refresh.",
  },
  {
    id: "brow",
    name: "Brow tint",
    mins: "20 min",
    price: 25,
    group: "table",
    line: "A twenty-minute add-on.",
    description:
      "A twenty-minute brow tint to deepen the colour of your brows. It is a short add-on you can book on its own or beside another treatment.",
  },
  {
    id: "rmt",
    name: "RMT massage",
    mins: "55 min",
    price: 140,
    group: "with",
    line: "Fifty-five minutes with a registered massage therapist.",
    description:
      "Fifty-five minutes of massage with a registered massage therapist, a regulated health professional. The work is clinical, focused on the soft tissues and joints. We provide the room; their diary is their own, so this session depends on their availability.",
  },
  {
    id: "sound",
    name: "Sound bath",
    mins: "55 min",
    price: 250,
    group: "with",
    line: "A fifty-five-minute group session, on dates when we have one.",
    description:
      "A fifty-five-minute group sound bath. You lie back on a mat, with a blanket and pillow, and sometimes an eye mask, while a practitioner plays instruments such as crystal singing bowls, gongs, and chimes. These run on dates when we have a session booked, rather than every day, so we will let you know what is coming up if you want to join.",
  },
];

export const TREATMENT_GROUPS: { id: Treatment["group"]; title: string; line: string }[] = [
  {
    id: "heat",
    title: "Heat and cold",
    line: "These are the heat and cold sessions in our Fire and Ice room: sauna, steam, plunge, and baths.",
  },
  {
    id: "light",
    title: "Light",
    line: "You can book red light on its own, or add it to a table treatment.",
  },
  {
    id: "table",
    title: "On the table",
    line: "These are the one-to-one treatments. Each booking is one person, in one room.",
  },
  {
    id: "with",
    title: "With a practitioner",
    line: "For these sessions we provide the room, and the practitioner keeps their own diary.",
  },
];

export function treatmentById(id: string) {
  return TREATMENTS.find((t) => t.id === id);
}

export function cad(n: number) {
  return `$${n}`;
}
