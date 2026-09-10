export type UnlockMode = "facilitator" | "geofence" | "timer" | "sequence";

export type QuestScreen =
  | "today"
  | "quest"
  | "boundary"
  | "specimen"
  | "recover"
  | "recorder"
  | "mirror"
  | "experiment"
  | "runes"
  | "shuttle"
  | "thirty";

export type Beat = {
  id: string;
  dayId: string;
  screen: QuestScreen;
  title: string;
  field: string;
  simply: string;
  unlock: UnlockMode;
  concealRune: boolean;
  runeId?: string;
  paperToken: string;
  phase?: "receive" | "reveal" | "activate";
};

export type Day = {
  id: string;
  label: string;
  setting: string;
  runeId?: string;
  stub?: boolean;
};

export type MirrorPrompt = {
  id: string;
  beatId: string;
  stage: "somatic" | "notice" | "orient" | "choose" | "echo";
  text: string;
  chooseUpTo?: number;
  options?: { id: string; label: string }[];
  freeText?: boolean;
};

export type Experiment = { id: string; label: string };

export type Geofence = {
  id: string;
  kind: "boundary" | "specimen" | "fragment" | "station";
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  requiredForRune: false;
  label: string;
  beatId?: string;
  active?: boolean;
  forParticipantId?: string;
};

export type Participant = {
  id: string;
  name: string;
  expeditionId: string;
  joinCode: string;
  teamId: string;
  detects: string;
};

export type RuneDef = {
  id: string;
  name: string;
  principle: string;
  glyph: string;
  carriedInto: string[];
};

export type InstancePack = {
  packVersion: "0.1";
  instanceId: string;
  product: string;
  host: string;
  title: string;
  days: Day[];
  beats: Beat[];
  runes: RuneDef[];
  mirrors: MirrorPrompt[];
  experiments: Experiment[];
  geofences: Geofence[];
  roster: Participant[];
  teams: { id: string; name: string }[];
  facilitatorCode: string;
  fieldRecorderMinutes: number;
  station3Seconds: number;
};
