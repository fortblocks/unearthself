import { createElement, useState } from "react";
import { isPhaseOneCompany } from "../data/hunter-profile.ts";
import { isClearBuyer, isStoredJudgment } from "./buyer-judgment.ts";
import {
  draftEditWarnings,
  draftRejectionReason,
  emailableLead,
  ensureUnsubscribeLink,
  letterWithoutUnsubscribe,
  type CocoJoin,
  type DraftSource,
} from "./hunter-outreach.ts";
import { greetingNameCheck } from "./coco-letter.ts";
import { humanizerCheck } from "./humanizer.ts";
import { wordCount } from "./lead-copy.ts";
import type { Company } from "./lead-score.ts";

export const SKIP_REASONS = [
  ["wrong-size", "Wrong size"],
  ["wrong-sector", "Wrong sector"],
  ["no-retreat-signal", "No retreat signal"],
  ["bad-contact", "Bad contact"],
  ["duplicate", "Duplicate"],
  ["other", "Other"],
] as const;

const STAGE_MARKS = [
  ["replied", "Replied"],
  ["booked", "Booked"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;

const buttonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xs border border-line-strong bg-paper px-3 text-sm font-semibold text-coal";
const primaryClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xs border border-ember bg-ember px-3 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40";

/** The named contact's published email. Blank and whitespace count as none. */
export function hasPublishedEmail(company: { email?: string | null }) {
  return typeof company.email === "string" && company.email.trim().length > 0;
}

/** Display only. A card outside Canada and the United States, or with no country, stays stored and stays off the lists. */
export function leadInPhaseOne(company: { place?: string | null; city?: string | null }) {
  return isPhaseOneCompany({ place: company.place, city: company.city });
}

/**
 * A stored judgement hides a card only when it says this contact is not a clear buyer.
 * A card with no stored judgement stays. Nothing here re-judges or rewrites the book.
 */
export function storedJudgmentHides(company: { buyerJudgment?: unknown }) {
  if (!isStoredJudgment(company.buyerJudgment)) return false;
  return !isClearBuyer(company.buyerJudgment);
}

/**
 * A card the desk may list. Canada or the United States, a named person, a verified or published email, and a source URL.
 * Score band is not a gate. A stored buyer judgement of no hides the card.
 * A send block from the outreach join does not remove the card. The card shows the reason instead.
 */
export function leadOnDesk(company: Company, _blocked: readonly string[] = []) {
  return leadInPhaseOne(company) && hasPublishedEmail(company) && emailableLead(company) && !storedJudgmentHides(company);
}

/** Display list only. The stored book is not changed. */
export function companiesOnDesk<T extends Company>(
  companies: readonly T[],
  blockedById?: Readonly<Record<string, readonly string[] | undefined>>,
): T[] {
  return companies.filter((company) => leadOnDesk(company, blockedById?.[company.id] ?? []));
}

/** Stage and status stay free of the reason. The stored skip reason is one plain line. */
export function skipReasonLines(coco: { stage: string; stageLabel: string; status: string; skipNote: string }) {
  const reason = coco.skipNote.trim();
  if (coco.stage !== "draft-skipped" || !reason) return { stage: coco.stageLabel, status: coco.status, note: "" };
  const stage = coco.stageLabel.includes(reason) ? "Draft skipped" : coco.stageLabel;
  const status = coco.status.includes(reason) ? "" : coco.status;
  return { stage, status, note: reason };
}

/** How often an open card asks whether Coco's draft has landed. */
export const COCO_DRAFT_POLL_MS = 12_000;

/** Stop asking after this long and leave the card for Coco's next sweep. */
export const COCO_DRAFT_WAIT_MS = 20 * 60 * 1000;

/** Queued or drafting, with no subject or email for the current touch. A rejected write-back still waits. */
export function cocoAwaitingDraft(coco: Pick<CocoJoin, "stage" | "subject" | "body">) {
  if (coco.stage !== "queued" && coco.stage !== "drafting") return false;
  return coco.subject.trim() === "" && coco.body.trim() === "";
}

/** A Coco draft or Christopher's edited copy. Blank text is not a draft. */
export function hasDraftCopy(...texts: Array<string | null | undefined>) {
  return texts.some((text) => (text ?? "").trim().length > 0);
}

/** The waiting panel. A rejected write-back replaces the blank wait until a draft is accepted. */
export function draftPanelKind(
  coco: Pick<CocoJoin, "stage" | "subject" | "body" | "draftRejected">,
  late = false,
): "writing" | "late" | "rejected" | null {
  if (!cocoAwaitingDraft(coco)) return null;
  if (coco.draftRejected?.at && coco.draftRejected.check) return "rejected";
  return late ? "late" : "writing";
}

export const DRAFT_FLAGGED_COPY = "Draft flagged";

export const UNSUBSCRIBE_ADDED_COPY = "The unsubscribe link was added automatically.";

export type DraftPoll = "poll" | "stop-ready" | "stop-left" | "stop-timeout";

/** Whether the open card should ask again. A failed ask stays on poll and tries later. */
export function draftPollDecision(input: {
  awaiting: boolean;
  elapsedMs: number;
  waitMs?: number;
  closed?: boolean;
}): DraftPoll {
  if (input.closed) return "stop-left";
  if (!input.awaiting) return "stop-ready";
  if (input.elapsedMs >= (input.waitMs ?? COCO_DRAFT_WAIT_MS)) return "stop-timeout";
  return "poll";
}

export type LeadCardActionsProps = {
  cardId: string;
  coco: CocoJoin;
  subject: string;
  body: string;
  menusOpen?: boolean;
  openMenu?: "skip" | "stop" | "stage" | "more" | null;
  onSubject?: (value: string) => void;
  onBody?: (value: string) => void;
  onApproveDraft?: () => void;
  onSkip?: (reason: (typeof SKIP_REASONS)[number][0]) => void;
  onApproveWording?: () => void;
  onSaveCopy?: () => void;
  onStage?: (mark: "replied" | "booked" | "won" | "lost") => void;
  onStop?: (scope: "person" | "company") => void;
  onUnreview?: () => void;
  onWithdraw?: () => void;
  onRefresh?: () => void;
  onHandFile?: () => void;
  /** Set once the wait has run out, or when the last write-back was rejected. */
  draftWait?: "writing" | "late" | "rejected";
};

function actionButton(label: string, onClick: (() => void) | undefined, primary = false, disabled = false) {
  return createElement(
    "button",
    {
      type: "button",
      className: primary ? primaryClass : buttonClass,
      onClick: disabled ? undefined : onClick,
      disabled,
    },
    label,
  );
}

function optionButton(label: string, onClick: (() => void) | undefined, key?: string) {
  return createElement(
    "button",
    { key, type: "button", className: buttonClass, onClick },
    label,
  );
}

export function LeadCardActions({
  cardId,
  coco,
  subject,
  body,
  menusOpen = false,
  openMenu = null,
  onSubject,
  onBody,
  onApproveDraft,
  onSkip,
  onApproveWording,
  onSaveCopy,
  onStage,
  onStop,
  onWithdraw,
  draftWait,
}: LeadCardActionsProps) {
  const [localMenu, setLocalMenu] = useState<"skip" | "stage" | "stop" | null>(null);
  const warnings = draftEditWarnings(subject, body);
  const voice = humanizerCheck(subject, body);
  const badGreeting = greetingNameCheck(body);
  const editable = coco.stage === "draft-ready" || coco.stage === "wording-approved";
  const awaiting = cocoAwaitingDraft(coco);
  const flagReason =
    coco.stage === "draft-flagged"
      ? coco.draftFlag || draftRejectionReason(coco.draftRejected?.check ?? "rejected")
      : awaiting && (draftWait === "rejected" || Boolean(coco.draftRejected?.check))
        ? draftRejectionReason(coco.draftRejected?.check ?? "rejected")
        : "";
  const wait = flagReason || !awaiting ? null : draftWait === "late" ? "late" : "writing";
  const skip = skipReasonLines(coco);
  const hasDraft = !flagReason && hasDraftCopy(subject, body, coco.subject, coco.body);
  const link = coco.unsubscribeUrl;
  const showUnsubscribe = Boolean(hasDraft && link && body.includes(link));
  const letter = showUnsubscribe ? letterWithoutUnsubscribe(body, link) : body;
  const words = letter.trim() ? `${wordCount(letter)} words` : "No draft yet.";
  const sources = hasDraft ? (coco.sources ?? []) : [];
  const approveBlocked = !voice.pass || badGreeting;
  const canSendApproval = hasDraft && (coco.canApproveWording || coco.stage === "draft-ready" || coco.canApproveDraft);
  function menuOpen(id: "skip" | "stage" | "stop") {
    if (menusOpen) return true;
    if (openMenu) return openMenu === id;
    return localMenu === id;
  }
  function toggleMenu(id: "skip" | "stage" | "stop") {
    if (menusOpen || openMenu) return;
    setLocalMenu((current) => (current === id ? null : id));
  }
  return createElement(
    "div",
    { className: "grid gap-4", "data-stage": coco.stage },
    createElement(
      "div",
      null,
      createElement("p", { className: "text-xs tracking-widest text-sandstone uppercase" }, "Stage"),
      createElement("p", { className: "mt-1 text-sm text-coal" }, skip.stage),
      skip.status ? createElement("p", { className: "mt-1 text-sm text-shale" }, skip.status) : null,
      skip.note ? createElement("p", { className: "mt-1 text-sm text-coal" }, skip.note) : null,
    ),
    createElement(
      "div",
      { className: "grid gap-2", "data-actions": "lead-card" },
      createElement(
        "p",
        { className: "text-sm text-coal", "data-send-path": "explicit" },
        "The only send is from chris@badlandsbootcamp.com, in Coco's chat, after Approve to send. Save edit does not send. Nothing else on this card sends.",
      ),
      createElement(
        "div",
        { className: "grid grid-cols-1 gap-2 sm:grid-cols-2" },
        !hasDraft && coco.canApproveDraft ? actionButton("Ask Coco to draft", onApproveDraft, true) : null,
        canSendApproval
          ? actionButton("Approve to send", onApproveWording, true, approveBlocked)
          : null,
        hasDraft ? actionButton("Save edit", onSaveCopy) : null,
      ),
      coco.canWithdraw
        ? createElement("div", { className: "grid grid-cols-1" }, optionButton("Take back send approval", onWithdraw))
        : null,
      approveBlocked && hasDraft
        ? createElement(
            "div",
            { className: "border border-line bg-fossil p-3", "data-humanizer": voice.pass ? "pass" : "fail" },
            createElement("p", { className: "text-sm font-semibold text-coal" }, "Approve to send is off."),
            ...(badGreeting ? [createElement("p", { key: "greeting", className: "mt-1 text-sm text-coal" }, "The greeting name is initials, one or two letters, or all capitals.")] : []),
            ...voice.notes.map((note) => createElement("p", { key: note, className: "mt-1 text-sm text-coal" }, note)),
          )
        : null,
      coco.greetingNote ? createElement("p", { className: "text-sm text-coal", "data-greeting": "neutral" }, coco.greetingNote) : null,
      coco.wordingNote ? createElement("p", { className: "text-sm text-coal" }, coco.wordingNote) : null,
      createElement(
        "div",
        { className: "grid grid-cols-1 gap-2 sm:grid-cols-3" },
        optionButton(menuOpen("skip") ? "Close not a fit" : "Not a fit", () => toggleMenu("skip")),
        optionButton(menuOpen("stop") ? "Close do not contact" : "Do not contact", () => toggleMenu("stop")),
        optionButton(menuOpen("stage") ? "Close after they reply" : "After they reply", () => toggleMenu("stage")),
      ),
      menuOpen("skip")
        ? createElement(
            "div",
            { className: "grid grid-cols-1 gap-2 sm:grid-cols-3", "data-menu": "skip" },
            SKIP_REASONS.map(([reason, label]) => optionButton(label, () => onSkip?.(reason), reason)),
          )
        : null,
      menuOpen("stop")
        ? createElement(
            "div",
            { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", "data-menu": "stop" },
            optionButton("Do not contact this person", () => onStop?.("person")),
            optionButton("Do not contact this company", () => onStop?.("company")),
          )
        : null,
      menuOpen("stage")
        ? createElement(
            "div",
            { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", "data-menu": "stage" },
            STAGE_MARKS.map(([mark, label]) => optionButton(label, () => onStage?.(mark), mark)),
          )
        : null,
    ),
    flagReason ? flaggedPanel(flagReason) : wait ? draftingPanel(wait) : null,
    coco.blocked.length > 0
      ? createElement(
          "ul",
          { className: "space-y-1" },
          coco.blocked.map((reason) => createElement("li", { key: reason, className: "text-sm text-coal" }, reason)),
        )
      : null,
    hasDraft
      ? createElement(
      "div",
      null,
      createElement("p", { className: "text-xs tracking-widest text-sandstone uppercase" }, "Draft"),
      coco.touch ? createElement("p", { className: "mt-2 text-sm text-shale" }, `Touch ${coco.touch} of 3.`) : null,
      createElement("p", { className: "mt-1 text-sm text-shale" }, "The letter goes from chris@badlandsbootcamp.com after Christopher approves it in Coco's chat."),
      coco.unsubscribeAppended
        ? createElement("p", { className: "mt-1 text-sm text-coal" }, UNSUBSCRIBE_ADDED_COPY)
        : null,
      createElement(
        "label",
        { className: "mt-3 block", htmlFor: `${cardId}-subject` },
        createElement("span", { className: "mb-1.5 block text-xs font-semibold tracking-widest text-sandstone uppercase" }, "Subject"),
        createElement("input", {
          id: `${cardId}-subject`,
          className: "h-11 w-full rounded-sm border border-line bg-paper px-3 text-sm text-coal",
          value: subject,
          readOnly: !editable,
          onChange: (event: { target: { value: string } }) => onSubject?.(event.target.value),
        }),
      ),
      createElement(
        "label",
        { className: "mt-3 block", htmlFor: `${cardId}-body` },
        createElement("span", { className: "mb-1.5 block text-xs font-semibold tracking-widest text-sandstone uppercase" }, "Email"),
        createElement("textarea", {
          id: `${cardId}-body`,
          rows: Math.min(
            40,
            Math.max(
              8,
              letter.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 52)), 0) + 1,
            ),
          ),
          className: "w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal",
          value: letter,
          readOnly: !editable,
          onChange: (event: { target: { value: string } }) => {
            const next = event.target.value;
            onBody?.(showUnsubscribe && link ? ensureUnsubscribeLink(next, link).body : next);
          },
        }),
      ),
      showUnsubscribe && link
        ? createElement(
            "p",
            { className: "mt-3 text-sm text-coal" },
            createElement(
              "a",
              {
                href: link,
                className: "font-semibold text-ember hover:underline",
                "data-unsubscribe": "link",
              },
              "unsubscribe",
            ),
          )
        : null,
      createElement(
        "p",
        { className: "mt-2 text-xs text-shale" },
        words,
        coco.problems[0] ? ` ${coco.problems[0]}` : "",
      ),
      warnings.map((warning) => createElement("p", { key: warning, className: "mt-1 text-sm text-coal" }, warning)),
    )
      : null,
    sources.length > 0 ? draftSourceList(sources) : null,
  );
}

function draftSourceList(sources: DraftSource[]) {
  return createElement(
    "div",
    null,
    createElement("p", { className: "text-xs tracking-widest text-sandstone uppercase" }, "Sources"),
    createElement(
      "ul",
      { className: "mt-2 space-y-1" },
      sources.map((source, index) =>
        createElement(
          "li",
          { key: `${source.url}-${index}` },
          createElement(
            "a",
            {
              className: "text-sm font-semibold text-ember hover:underline",
              href: source.url,
              rel: "noopener noreferrer",
            },
            source.url,
          ),
          source.note ? createElement("span", { className: "mt-1 block text-sm text-shale" }, source.note) : null,
        ),
      ),
    ),
  );
}

function flaggedPanel(reason: string) {
  return createElement(
    "div",
    {
      className: "border border-line bg-fossil p-4",
      role: "status",
      "data-draft-flag": "failed",
    },
    createElement("p", { className: "text-sm font-semibold text-coal" }, DRAFT_FLAGGED_COPY),
    createElement("p", { className: "mt-2 text-sm text-coal" }, reason),
  );
}

function draftingPanel(kind: "writing" | "late") {
  const late = kind === "late";
  return createElement(
    "div",
    {
      className: "border border-line bg-fossil p-4",
      role: "status",
      "data-draft-wait": kind,
    },
    createElement(
      "div",
      { className: "flex items-center gap-3" },
      late ? null : spinner(),
      createElement("p", { className: "text-sm font-semibold text-coal" }, "Coco drafting"),
    ),
    createElement(
      "p",
      { className: "mt-2 text-sm text-shale" },
      late
        ? "The draft has not arrived yet. Coco's next sweep will pick it up."
        : "This usually takes a few minutes. You can leave this page.",
    ),
  );
}

function spinner() {
  return createElement(
    "svg",
    {
      className: "size-4 shrink-0 animate-spin text-sandstone",
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
    },
    createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9",
      stroke: "currentColor",
      strokeWidth: "2",
      opacity: "0.25",
    }),
    createElement("path", {
      d: "M12 3a9 9 0 0 1 9 9",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
    }),
  );
}

export function emptyCoco(partial: Partial<CocoJoin> = {}): CocoJoin {
  return {
    stage: "new",
    stageLabel: "Unreviewed",
    status: "",
    touch: null,
    subject: "",
    body: "",
    problems: [],
    blocked: [],
    skipNote: "",
    draftRejected: null,
    draftFlag: "",
    unsubscribeAppended: false,
    sources: [],
    canApproveDraft: true,
    canApproveWording: false,
    canWithdraw: false,
    wordingNote: "",
    unsubscribeUrl: null,
    humanizerPass: false,
    humanizerNotes: [],
    greetingNote: "",
    ...partial,
  };
}
