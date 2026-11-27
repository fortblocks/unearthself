import type { BotId } from "../data/bots.ts";
import type { Lead } from "../data/desk.ts";
import {
  draftLeaksInternal,
  draftMentionsTessAndI,
  letterParagraph,
  renderCocoLetter,
  usableFirstName,
} from "./coco-letter.ts";
import { draftHasPrice } from "./lead-copy.ts";

/** The first quotable line of a desk note. Blank when it cannot go in a letter. */
function conciergeHook(org: string, note: string) {
  const first = note.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  const paragraph = letterParagraph(first);
  if (!paragraph) return "";
  if (draftMentionsTessAndI(paragraph) || draftLeaksInternal(paragraph, org) || draftHasPrice(paragraph)) return "";
  return paragraph;
}

export function draftFor(bot: BotId, lead: Lead): { subject: string; body: string } {
  const name = usableFirstName(lead.contact);

  if (bot === "concierge") {
    const hook = conciergeHook(lead.org, lead.note);
    if (!hook) {
      return {
        subject: `${lead.org} research file`,
        body: `${lead.org}. This is a research file, not a conversation. Do not send until a sourced note exists. The file sits on Christopher's desk.`,
      };
    }
    const greeting = name ? `Hi ${name},` : "Hello,";
    return renderCocoLetter({ org: lead.org, greeting, hookParagraph: hook });
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
