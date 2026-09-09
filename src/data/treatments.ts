export type Treatment = {
  id: string;
  name: string;
  mins: string;
  group: "heat" | "table" | "light" | "with";
  line: string;
};

export const TREATMENTS: Treatment[] = [
  { id: "quad-ir", name: "Quad infrared sauna", mins: "40 min", group: "heat", line: "Shared heat. Up to four." },
  { id: "single-ir", name: "Single infrared sauna", mins: "40 min", group: "heat", line: "One person. Quiet." },
  { id: "steam", name: "Salt stone steam", mins: "30 min", group: "heat", line: "Steam room, Fire and Ice." },
  { id: "plunge", name: "Cold plunge", mins: "15 min", group: "heat", line: "Short, sharp, done." },
  { id: "circuit", name: "Fire and Ice circuit", mins: "A set", group: "heat", line: "Heat, cold, repeat." },
  { id: "mud-bath", name: "Mud bath", mins: "Bath", group: "heat", line: "Fire and Ice." },
  { id: "herbal-bath", name: "Herbal bath", mins: "Bath", group: "heat", line: "Two people at most." },
  { id: "red-light", name: "Red light", mins: "20 min", group: "light", line: "Three panels. Add a panel if you want." },
  { id: "reiki", name: "Reiki", mins: "55 min", group: "table", line: "On the table." },
  { id: "lymph", name: "Lymphatic bodywork", mins: "55 min", group: "table", line: "On the table." },
  { id: "stone", name: "Stone, hot or cool", mins: "55 min", group: "table", line: "On the table." },
  { id: "unearthed", name: "Unearthed Bodyworks", mins: "75 min", group: "table", line: "The signature treatment." },
  { id: "exfoliation", name: "Full body exfoliation", mins: "45 min", group: "table", line: "On the table." },
  { id: "herbal-wrap", name: "Herbal wrap", mins: "90 min", group: "table", line: "Clinician room." },
  { id: "mud-wrap", name: "Mud wrap", mins: "55 min", group: "table", line: "Clinician room." },
  { id: "seaweed", name: "Seaweed wrap", mins: "55 min", group: "table", line: "Clinician room." },
  { id: "mud-red", name: "Mud and red light", mins: "30 min", group: "table", line: "Short combined treatment." },
  { id: "facial", name: "Advanced facial", mins: "55 min", group: "table", line: "On the table." },
  { id: "brow", name: "Brow tint", mins: "20 min", group: "table", line: "Quick add." },
  { id: "rmt", name: "RMT massage", mins: "55 min", group: "with", line: "With a registered therapist. Subject to their book." },
  { id: "sound", name: "Sound bath", mins: "55 min", group: "with", line: "Group session. Dates when we have one." },
];

export const TREATMENT_GROUPS: { id: Treatment["group"]; title: string; line: string }[] = [
  { id: "heat", title: "Heat and cold", line: "Sauna, steam, plunge, baths. The Fire and Ice room." },
  { id: "light", title: "Light", line: "Red light on its own, or added to a table treatment." },
  { id: "table", title: "On the table", line: "Bodywork, wraps, facials. One person, one room." },
  { id: "with", title: "With a practitioner", line: "We hold the room. Their diary is their own." },
];
