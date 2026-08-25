import { ACTIVITIES, getActivityById } from "@/data/activities";
import type { DayPlan, TimeBlock } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function findMentionedActivities(text: string) {
  const n = normalize(text);
  return ACTIVITIES.filter((a) => {
    const nameBits = normalize(a.name).split(" ").filter((w) => w.length > 3);
    return (
      n.includes(normalize(a.name)) ||
      a.tags.some((t) => n.includes(t)) ||
      nameBits.some((bit) => n.includes(bit) && bit.length > 4)
    );
  });
}

function summarizePlan(days: DayPlan[]): string {
  const blocks: TimeBlock[] = ["morning", "afternoon", "evening"];
  const lines: string[] = [];
  days.forEach((day) => {
    const names: string[] = [];
    blocks.forEach((b) => {
      day.blocks[b].forEach((p) => {
        const a = getActivityById(p.activityId);
        if (a) names.push(a.name);
      });
    });
    lines.push(
      names.length
        ? `${day.label}: ${names.join(", ")}`
        : `${day.label}: still open — blank canvas energy.`
    );
  });
  return lines.join("\n");
}

function complementaryFor(activityId: string): string[] {
  const map: Record<string, string[]> = {
    snowshoeing: ["nervous-system-reset", "cold-plunge-steam", "infrared-sauna"],
    "horseshoe-canyon": ["cold-plunge-steam", "massage-60", "breathwork-fire"],
    abseiling: ["improv", "red-light-circle", "cold-plunge-steam"],
    "raft-building": ["amphitheatre-sunset", "massage-60"],
    "ice-bath-circuit": ["infrared-sauna", "breathwork-fire"],
    orienteering: ["improv", "cold-plunge-steam"],
    "sunrise-hoodoo": ["infrared-sauna", "red-light-circle"],
    "disc-golf": ["cold-plunge-steam", "movie-block"],
    "eleven-bridges": ["nervous-system-reset", "rosebud-theatre"],
  };
  return map[activityId] ?? ["cold-plunge-steam", "nervous-system-reset"];
}

export function generateBadlanderReply(opts: {
  message: string;
  days: DayPlan[];
  groupSize: number;
  season: string;
}): string {
  const { message, days, groupSize, season } = opts;
  const n = normalize(message);
  const mentioned = findMentionedActivities(message);
  const planSummary = summarizePlan(days);

  // Greetings
  if (/^(hi|hey|hello|yo|sup)\b/.test(n.trim()) || n.includes("who are you")) {
    return `I'm the Badlander — your retreat guide for this builder. Rugged advice, zero fluff. I've got the canyon in my bones and your itinerary in my sights.\n\nAsk me about any activity, what to pair together, weather, fitness, gear, or how to make Day 2 legendary. Your current build:\n${planSummary}`;
  }

  // Weather
  if (n.includes("weather") || n.includes("temperature") || n.includes("cold") && n.includes("outside")) {
    return season === "winter"
      ? `Winter in the Badlands doesn't negotiate. Expect bite — often well below freezing, wind that finds every gap in your jacket, and skies so clear they'll rearrange your priorities. Cold plunge at −20°C? Your face will scream, then your nervous system will thank you. Layer hard. Cotton is a traitor. Bring wool, wind shells, and humility.`
      : `Summer out here runs hot and dry — canyon stone holds heat like a grudge. Mornings are gold for hikes; afternoons can cook you if you're not hydrated. Thunderstorms roll through with drama. Sun protection isn't optional. The hoodoos at sunrise still win every argument.`;
  }

  // What to bring
  if (n.includes("bring") || n.includes("pack") || n.includes("gear") || n.includes("wear")) {
    if (mentioned.length) {
      const a = mentioned[0];
      const gear = a.whatToBring?.length
        ? a.whatToBring.join(", ")
        : "layers, water, and a willingness to show up";
      return `For **${a.name}**, pack: ${gear}.\n\n${a.description}\n\nPro move: whatever the forecast says, bring one more warm layer than you think you need. The Badlands loves surprises.`;
    }
    return `Baseline kit for any Badlands retreat: broken-in trail shoes, moisture-wicking layers, a proper shell, 2L water capacity, sun/cold protection depending on season, swimsuit (cold plunge doesn't care about your dignity), and clothes that can get dusty or wet. Leave the dress shoes at home — this isn't that kind of offsite.`;
  }

  // Fitness / difficulty
  if (n.includes("fitness") || n.includes("difficult") || n.includes("hard") || n.includes("beginner") || n.includes("level")) {
    if (mentioned.length) {
      const a = mentioned[0];
      return `**${a.name}** sits at a **${a.fitnessLevel}** fitness level. ${a.vibe}\n\n${a.description}\n\nWe scale coaching and pacing for corporate and mixed-ability groups — ego stays at the trailhead.`;
    }
    return `Most retreats mix "any" and "moderate" efforts with optional high-output pushes (canyon hikes, abseiling, orienteering). Tell me your group's baseline — desk athletes, weekend warriors, or actual monsters — and I'll steer the build.`;
  }

  // Capacity / group size
  if (n.includes("capacity") || n.includes("group size") || n.includes("how many") || n.includes("max")) {
    if (mentioned.length) {
      const a = mentioned[0];
      const cap = a.maxCapacity
        ? `Max **${a.maxCapacity}** for ${a.name}.`
        : `${a.name} scales flexibly.`;
      return `${cap} You're currently planning for **${groupSize}**. ${
        a.maxCapacity && groupSize > a.maxCapacity
          ? `That's over the line — split into waves or swap for something that can swallow the whole crew.`
          : `You're in good shape on numbers.`
      }`;
    }
    return `Your group size is set to **${groupSize}**. Watch capacity flags on abseiling (18), fossil hunting (16), and ice-bath circuit (16). Bigger crews? We wave activities or lean into amphitheatre / theatre blocks.`;
  }

  // Suggest / pair / complementary
  if (
    n.includes("suggest") ||
    n.includes("pair") ||
    n.includes("recommend") ||
    n.includes("complement") ||
    n.includes("what next") ||
    n.includes("add")
  ) {
    if (mentioned.length) {
      const a = mentioned[0];
      const comps = complementaryFor(a.id)
        .map((id) => getActivityById(id))
        .filter(Boolean);
      return `You've got **${a.name}** in mind — solid. I'd pair it with:\n${comps
        .map((c) => `• **${c!.name}** (${c!.durationMin} min) — ${c!.vibe}`)
        .join("\n")}\n\nDrag them into an open slot. Adventure without recovery is just a hard day. Recovery without adventure is a spa with better marketing.`;
    }
    // Suggest based on plan gaps
    const filled = days.flatMap((d) =>
      (["morning", "afternoon", "evening"] as TimeBlock[]).flatMap((b) =>
        d.blocks[b].map((p) => p.activityId)
      )
    );
    const hasOutdoor = filled.some((id) => {
      const a = getActivityById(id);
      return a?.category === "outdoor" || a?.category === "team";
    });
    const hasRecovery = filled.some((id) => {
      const a = getActivityById(id);
      return a?.category === "recovery" || a?.category === "mind-body";
    });
    if (!hasOutdoor) {
      return `Your build's light on dirt and adrenaline. I'd drop **Sunrise Hoodoo**, **Orienteering**, or **Abseiling** into a morning block — then let recovery catch the afternoon. Here's where you stand:\n${planSummary}`;
    }
    if (!hasRecovery) {
      return `You're stacking effort without the downshift. Add **Cold Plunge + Steam**, **Nervous System Reset**, or **Infrared Sauna** after your biggest outdoor block. Bodies that recover tell better stories.\n\n${planSummary}`;
    }
    return `Looking sharp. To push it further: add an evening cultural closer (Rosebud Theatre or Amphitheatre Sunset) so Day energy has a narrative arc — not just a workout schedule.\n\n${planSummary}`;
  }

  // Emotional sell / outcome
  if (
    n.includes("why") ||
    n.includes("worth") ||
    n.includes("outcome") ||
    n.includes("team") ||
    n.includes("transform") ||
    n.includes("story")
  ) {
    return `By the end of Day 2 your team will have a story they still tell in five years — not because of a trust-fall icebreaker, but because they navigated real terrain together, shared real discomfort, and watched each other show up when it counted.\n\nThe Badlands strips the corporate costume. What's left is better collaboration than any hotel ballroom offsite has ever bought.\n\nYour current arc:\n${planSummary}`;
  }

  // Explain activity
  if (mentioned.length) {
    const a = mentioned[0];
    const cat = CATEGORY_META[a.category];
    const comps = complementaryFor(a.id)
      .map((id) => getActivityById(id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    return `**${a.name}** — ${cat.label}\n${a.durationMin} min · ${a.season} · fitness: ${a.fitnessLevel}${
      a.maxCapacity ? ` · max ${a.maxCapacity}` : ""
    }\n\n${a.description}\n\n*${a.vibe}*\n\nWant it to hit harder? Pair with ${comps.join(" or ")}. Ask me what it feels like, what to bring, or where to slot it.`;
  }

  // Cold plunge specific flavor even without perfect match
  if (n.includes("plunge") || n.includes("ice bath") || n.includes("ice-bath")) {
    return `Here's what the cold plunge actually feels like at −20°C: the air already stole your breath on the walk over. Then the water takes whatever composure you had left. Thirty seconds in, your brain files a formal complaint. Ninety seconds in, something quieter shows up — focus without the noise. Steam after is the handshake that says you survived. Teams leave laughing, buzzing, and oddly bonded. That's the point.`;
  }

  // Default — contextual guide
  return `I'm tracking your retreat. Here's the lay of the land:\n${planSummary}\n\nAsk me to explain an activity, suggest pairings, check capacity for ${groupSize} people, or talk weather/gear for ${season}. Or say something like “pair snowshoeing with recovery” and I'll get specific.\n\nForged in the Badlands — let's build something worth booking.`;
}
