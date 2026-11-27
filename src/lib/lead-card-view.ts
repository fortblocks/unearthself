import { createElement, useState } from "react";
import { isPhaseOneCompany } from "../data/hunter-profile.ts";
import { isClearBuyer, isStoredJudgment } from "./buyer-judgment.ts";
import {
  draftEditWarnings,
  draftRejectionCheck,
  draftRejectionReason,
  emailableLead,
  ensureUnsubscribeLink,
  letterWithoutUnsubscribe,
  OUTREACH_POSTAL_ADDRESS,
  OUTREACH_SITE,
  UNSUBSCRIBE_NOTICE,
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
  "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xs border border-ember bg-ember px-3 text-sm font-semibold text-coal";
const primaryDisabledClass =
  "inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-xs border border-line bg-fossil px-3 text-sm font-semibold text-shale";
const quietClass =
  "inline-flex h-11 items-center justify-center whitespace-nowrap px-3 text-sm font-semibold text-shale underline decoration-shale/40 underline-offset-2";
const kickerClass = "text-xs font-semibold tracking-widest text-[#7A5B2B] uppercase";

const SEND_LINE =
  "Approving queues this email from chris@badlandsbootcamp.com in Coco's chat (nothing on this card sends immediately).";
const APPROVED_LINE =
  "Approved. This email is queued in Coco's chat from chris@badlandsbootcamp.com. Nothing on this card sends it.";

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
  if (coco.stageLabel === "Needs research" || reason === "Needs research") return { stage: "Needs research", status: "", note: "" };
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
      className: primary ? (disabled ? primaryDisabledClass : primaryClass) : buttonClass,
      onClick: disabled ? undefined : onClick,
      disabled,
    },
    label,
  );
}

/** The banner already names this check, so the line under the word count does not repeat it. */
function bannerAlreadyStates(warning: string, notes: string[]) {
  const fact = warning.includes("Tess and I")
    ? "tess and i"
    : warning.includes("em dash")
      ? "em dash"
      : warning.includes("a price")
        ? "price"
        : "";
  if (!fact) return false;
  return notes.some((note) => note.toLowerCase().includes(fact));
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
  const [fitOpen, setFitOpen] = useState(false);
  const warnings = draftEditWarnings(subject, body);
  const voice = humanizerCheck(subject, body, { hookText: coco.letterHook, signalNote: coco.letterSignal });
  const badGreeting = greetingNameCheck(body);
  const letterCheck = draftRejectionCheck(subject, body);
  const editable = coco.stage === "draft-ready" || coco.stage === "wording-approved" || coco.stage === "draft-flagged";
  const awaiting = cocoAwaitingDraft(coco);
  const editorFlag =
    coco.stage === "draft-flagged" ? coco.draftFlag || draftRejectionReason(coco.draftRejected?.check ?? "rejected") : "";
  const waitReason =
    awaiting && (draftWait === "rejected" || Boolean(coco.draftRejected?.check))
      ? draftRejectionReason(coco.draftRejected?.check ?? "rejected")
      : "";
  const wait = waitReason ? null : !awaiting ? null : draftWait === "late" ? "late" : "writing";
  const skip = skipReasonLines(coco);
  const hasDraft = hasDraftCopy(subject, body, coco.subject, coco.body);
  const showEditor = hasDraft || coco.stage === "draft-flagged";
  const link = coco.unsubscribeUrl;
  const letter = link ? letterWithoutUnsubscribe(body, link) : body;
  const rows = Math.min(
    40,
    Math.max(4, letter.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 68)), 0)),
  );
  const words = letter.trim() ? `${wordCount(letter)} words` : "No draft yet.";
  const sources = hasDraft ? (coco.sources ?? []) : [];
  const approveBlocked = !voice.pass || badGreeting || Boolean(letterCheck);
  const shownStage = approveBlocked && coco.stage === "draft-ready" ? "Needs edit" : skip.stage;
  const fitMenu = menusOpen || openMenu === "skip" || openMenu === "stop" || fitOpen;
  function toggleFit() {
    if (menusOpen || openMenu) return;
    setFitOpen((open) => !open);
  }
  const ruleNotes = [
    ...(editorFlag ? [editorFlag] : []),
    ...(badGreeting ? ["The greeting name is initials, one or two letters, or all capitals."] : []),
    ...voice.notes,
  ];
  const shownWarnings = warnings.filter((warning) => !bannerAlreadyStates(warning, ruleNotes));
  const showApprove = showEditor && !coco.canWithdraw;
  const askCoco = !showEditor && coco.canApproveDraft && coco.stage !== "draft-flagged";
  return createElement(
    "div",
    { className: "grid gap-4", "data-stage": coco.stage },
    createElement(
      "div",
      null,
      createElement("p", { className: kickerClass }, "Stage"),
      createElement("p", { className: "mt-1 text-sm text-coal" }, shownStage),
      skip.status ? createElement("p", { className: "mt-1 text-sm text-shale" }, skip.status) : null,
      skip.note ? createElement("p", { className: "mt-1 text-sm text-coal" }, skip.note) : null,
    ),
    waitReason ? flaggedPanel(waitReason) : wait ? draftingPanel(wait) : null,
    coco.blocked.length > 0
      ? createElement(
          "ul",
          { className: "space-y-1" },
          coco.blocked.map((reason) => createElement("li", { key: reason, className: "text-sm text-coal" }, reason)),
        )
      : null,
    showEditor
      ? createElement(
          "div",
          null,
          coco.touch ? createElement("p", { className: "text-sm text-shale" }, `Touch ${coco.touch} of 3.`) : null,
          coco.greetingNote
            ? createElement("p", { className: "mt-2 text-sm text-coal", "data-greeting": "neutral" }, coco.greetingNote)
            : null,
          coco.wordingNote ? createElement("p", { className: "mt-2 text-sm text-coal" }, coco.wordingNote) : null,
          createElement(
            "label",
            { className: "mt-3 block", htmlFor: `${cardId}-subject` },
            createElement("span", { className: `mb-1.5 block ${kickerClass}` }, "Subject"),
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
            createElement("span", { className: `mb-1.5 block ${kickerClass}` }, "Email"),
            approveBlocked && ruleNotes.length > 0
              ? createElement(
                  "div",
                  {
                    className: "mb-2 border border-line bg-fossil p-3",
                    "data-humanizer": voice.pass ? "pass" : "fail",
                    ...(editorFlag ? { "data-draft-flag": "failed" } : {}),
                  },
                  createElement("p", { className: "text-sm font-semibold text-coal" }, editorFlag ? DRAFT_FLAGGED_COPY : "Approve to send is off."),
                  ...ruleNotes.map((note) => createElement("p", { key: note, className: "mt-1 text-sm text-coal" }, note)),
                )
              : null,
            createElement("textarea", {
              id: `${cardId}-body`,
              rows,
              className: "w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal [field-sizing:content]",
              value: letter,
              readOnly: !editable,
              onChange: (event: { target: { value: string } }) => {
                const next = event.target.value;
                onBody?.(link ? ensureUnsubscribeLink(next, link).body : next);
              },
            }),
          ),
          createElement(
            "p",
            { className: "mt-1 text-xs leading-tight text-shale", "data-unsubscribe": "preview" },
            `Email footer (added automatically): ${UNSUBSCRIBE_NOTICE} ${OUTREACH_POSTAL_ADDRESS}. ${OUTREACH_SITE}`,
          ),
          createElement(
            "p",
            { className: "mt-2 text-xs text-shale" },
            words,
            coco.problems[0] ? ` ${coco.problems[0]}` : "",
          ),
          shownWarnings.map((warning) => createElement("p", { key: warning, className: "mt-1 text-sm text-coal" }, warning)),
          createElement(
            "div",
            { className: "sticky bottom-0 z-10 mt-3 grid gap-2 bg-paper py-3 sm:static" },
            showApprove ? actionButton("Approve to send", onApproveWording, true, approveBlocked) : null,
            coco.canWithdraw ? optionButton("Take back send approval", onWithdraw) : null,
            showEditor ? createElement("button", { type: "button", className: quietClass, onClick: onSaveCopy }, "Save draft without sending") : null,
            coco.stage === "draft-flagged"
              ? createElement("button", { type: "button", className: buttonClass, onClick: onApproveDraft }, "Rewrite with Coco")
              : null,
            showApprove
              ? createElement("p", { className: "text-sm text-coal", "data-send-path": "explicit" }, SEND_LINE)
              : null,
            coco.canWithdraw
              ? createElement("p", { className: "text-sm text-coal", "data-send-path": "explicit" }, APPROVED_LINE)
              : null,
          ),
        )
      : askCoco
        ? createElement("div", { className: "grid" }, actionButton("Ask Coco to draft", onApproveDraft, true))
        : null,
    createElement(
      "div",
      { className: "relative", "data-actions": "lead-card" },
      createElement(
        "button",
        {
          type: "button",
          className: fitMenu ? `${buttonClass} border-coal bg-fossil` : buttonClass,
          "aria-expanded": fitMenu,
          onClick: toggleFit,
        },
        "Not a fit ",
        createElement("span", { "aria-hidden": "true" }, fitMenu ? "\u25B4" : "\u25BE"),
      ),
      fitMenu
        ? createElement(
            "div",
            {
              className: "absolute z-20 mt-1 w-full min-w-64 border border-line bg-paper p-2 shadow-sm",
              "data-menu": "skip",
              role: "menu",
            },
            ...SKIP_REASONS.map(([reason, label]) => optionButton(label, () => onSkip?.(reason), reason)),
            createElement("div", { className: "my-2 border-t border-line", role: "separator" }),
            optionButton("Do not contact this person", () => onStop?.("person"), "person"),
            optionButton("Do not contact this company", () => onStop?.("company"), "company"),
          )
        : null,
    ),
    createElement(
      "label",
      { className: "flex items-center gap-3" },
      createElement("span", { className: kickerClass }, "Outcome"),
      createElement(
        "select",
        {
          className: "h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-paper px-3 text-sm text-coal",
          "aria-label": "Outcome",
          defaultValue: "",
          onChange: (event: { target: { value: string } }) => {
            const mark = event.target.value;
            if (mark === "replied" || mark === "booked" || mark === "won" || mark === "lost") onStage?.(mark);
          },
        },
        createElement("option", { value: "" }, "None yet"),
        ...STAGE_MARKS.map(([mark, label]) => createElement("option", { key: mark, value: mark }, label)),
      ),
    ),
    sources.length > 0 ? draftSourceList(sources) : null,
  );
}

function draftSourceList(sources: DraftSource[]) {
  return createElement(
    "div",
    null,
    createElement("p", { className: kickerClass }, "Sources"),
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
