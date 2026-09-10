import type { BotId } from "@/data/bots";
import type { Lead } from "@/data/desk";

function firstName(contact: string) {
  const raw = contact.split("·")[0]?.trim() ?? contact;
  return raw.split(" ")[0] || "there";
}

export function draftFor(bot: BotId, lead: Lead): { subject: string; body: string } {
  const name = firstName(lead.contact);
  const named = /\s/.test(lead.contact) && !lead.contact.toLowerCase().includes("unnamed");

  if (bot === "concierge") {
    return {
      subject: `${lead.org} — Unearth Self, Drumheller`,
      body: named
        ? `${name} — thanks for writing. We take teams of 8–24 for two or three days at Basecamp in Drumheller. Spring 2027 is the first window we are holding.\n\nI am not going to put a price in this mail. Send headcount and a week that works and Tess and I will come back with three dates and what a hold looks like.\n\nChristopher`
        : `${lead.org} — this is a research file, not a conversation. Do not send until a named person exists. File sits on Christopher’s desk.`,
    };
  }

  if (bot === "corporate") {
    return {
      subject: `${lead.org} — dates and a hold`,
      body: `${name} — we still have ${lead.dates || "a spring window"} on the book${lead.headcount ? ` for ${lead.headcount}` : ""}. I will not invent a number here. If the window is live, a twenty-minute call is the next useful thing. If it has moved, say so and we release it.\n\nChristopher`,
    };
  }

  if (bot === "stay") {
    return {
      subject: `${lead.org} — Haven`,
      body: `${name} — Lisa has the room on the book for ${lead.dates || "those nights"}. Reply and we hold it. Deposit follows. Same-day thermal only if the diary is covered.\n\nDesk`,
    };
  }

  if (bot === "followup") {
    const n = lead.nudges + 1;
    if (n >= 3) {
      return {
        subject: `${lead.org} — last note`,
        body: `${name} — third and last note from me. If this is no longer live, I will close the file. If it is, a one-line reply is enough.\n\nChristopher`,
      };
    }
    if (n === 2) {
      return {
        subject: `${lead.org} — still holding`,
        body: `${name} — a week on. The dates are still on our book. If you want them, say so. If not, I will let them go.\n\nChristopher`,
      };
    }
    return {
      subject: `${lead.org} — still here`,
      body: `${name} — a short note. We have not heard back. The file is open. Happy to wait; happier if you tell us the window moved.\n\nChristopher`,
    };
  }

  return {
    subject: `${lead.org}`,
    body: `Internal. ${lead.note || "No guest mail from this bot."}`,
  };
}

export function botForLead(kind: Lead["kind"]): BotId {
  if (kind === "haven" || kind === "basecamp") return "stay";
  return "concierge";
}
