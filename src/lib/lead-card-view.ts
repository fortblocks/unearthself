import { createElement, type ReactNode } from "react";
import { draftEditWarnings, type CocoJoin } from "./hunter-outreach.ts";
import { wordCount } from "./lead-copy.ts";

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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xs border border-line-strong px-4 text-sm font-semibold text-coal";
const primaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xs bg-ember px-4 text-sm font-semibold text-paper";

/** How often an open card asks whether Coco's draft has landed. */
export const COCO_DRAFT_POLL_MS = 12_000;

/** Stop asking after this long and leave the card for Coco's next sweep. */
export const COCO_DRAFT_WAIT_MS = 20 * 60 * 1000;

/** Queued or drafting, with no subject or email for the current touch. */
export function cocoAwaitingDraft(coco: Pick<CocoJoin, "stage" | "subject" | "body">) {
  if (coco.stage !== "queued" && coco.stage !== "drafting") return false;
  return coco.subject.trim() === "" && coco.body.trim() === "";
}

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
  /** Set once the wait has run out. The stage still decides whether the panel shows. */
  draftWait?: "writing" | "late";
};

function menu(title: string, open: boolean, children: ReactNode) {
  return createElement(
    "details",
    { className: "relative", open },
    createElement("summary", { className: `${buttonClass} cursor-pointer list-none` }, title),
    createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, children),
  );
}

function actionButton(label: string, onClick: (() => void) | undefined, primary = false, disabled = false) {
  return createElement(
    "button",
    { type: "button", className: primary ? primaryClass : buttonClass, onClick, disabled },
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
  onUnreview,
  onWithdraw,
  onRefresh,
  onHandFile,
  draftWait,
}: LeadCardActionsProps) {
  const warnings = draftEditWarnings(subject, body);
  const editable = coco.stage === "draft-ready" || coco.stage === "wording-approved";
  const words = body.trim() ? `${wordCount(body)} words` : "No draft yet.";
  const awaiting = cocoAwaitingDraft(coco);
  const wait = awaiting ? (draftWait ?? "writing") : null;
  return createElement(
    "div",
    { className: "grid gap-4", "data-stage": coco.stage },
    createElement(
      "div",
      null,
      createElement("p", { className: "text-xs tracking-widest text-sandstone uppercase" }, "Stage"),
      createElement("p", { className: "mt-1 text-sm text-coal" }, coco.stageLabel),
      coco.status ? createElement("p", { className: "mt-1 text-sm text-shale" }, coco.status) : null,
      coco.skipNote && coco.stage === "draft-skipped"
        ? createElement("p", { className: "mt-1 text-sm text-coal" }, coco.skipNote)
        : null,
    ),
    createElement(
      "div",
      { className: "flex flex-wrap gap-2" },
      coco.canApproveDraft ? actionButton("Approve and draft", onApproveDraft, true) : null,
      menu(
        "Skip",
        menusOpen || openMenu === "skip",
        SKIP_REASONS.map(([reason, label]) =>
          createElement("button", { key: reason, type: "button", className: buttonClass, onClick: () => onSkip?.(reason) }, label),
        ),
      ),
      coco.canApproveWording ? actionButton("Approve wording", onApproveWording, true) : null,
      coco.wordingNote ? createElement("p", { className: "w-full text-sm text-coal" }, coco.wordingNote) : null,
      menu(
        "Set stage",
        menusOpen || openMenu === "stage",
        STAGE_MARKS.map(([mark, label]) =>
          createElement("button", { key: mark, type: "button", className: buttonClass, onClick: () => onStage?.(mark) }, label),
        ),
      ),
      menu(
        "Stop contacting",
        menusOpen || openMenu === "stop",
        [
          createElement("button", { key: "person", type: "button", className: buttonClass, onClick: () => onStop?.("person") }, "This person"),
          createElement("button", { key: "company", type: "button", className: buttonClass, onClick: () => onStop?.("company") }, "The whole company"),
        ],
      ),
      menu(
        "More",
        menusOpen || openMenu === "more",
        [
          createElement("button", { key: "back", type: "button", className: buttonClass, onClick: onUnreview }, "Back to unreviewed"),
          coco.canWithdraw
            ? createElement("button", { key: "withdraw", type: "button", className: buttonClass, onClick: onWithdraw }, "Withdraw wording approval")
            : null,
          createElement("button", { key: "file", type: "button", className: buttonClass, onClick: onHandFile }, "Hand file"),
          createElement("button", { key: "refresh", type: "button", className: buttonClass, onClick: onRefresh }, "Refresh"),
        ],
      ),
    ),
    wait === "writing" ? draftingPanel(false) : null,
    wait === "late" ? draftingPanel(true) : null,
    coco.blocked.length > 0
      ? createElement(
          "ul",
          { className: "space-y-1" },
          coco.blocked.map((reason) => createElement("li", { key: reason, className: "text-sm text-coal" }, reason)),
        )
      : null,
    wait
      ? null
      : createElement(
      "div",
      null,
      createElement("p", { className: "text-xs tracking-widest text-sandstone uppercase" }, "Draft"),
      coco.touch ? createElement("p", { className: "mt-2 text-sm text-shale" }, `Touch ${coco.touch} of 3.`) : null,
      createElement("p", { className: "mt-1 text-sm text-shale" }, "The letter goes from chris@badlandsbootcamp.com after Christopher approves it in Coco's chat."),
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
          className: "min-h-48 w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal",
          value: body,
          readOnly: !editable,
          onChange: (event: { target: { value: string } }) => onBody?.(event.target.value),
        }),
      ),
      createElement(
        "p",
        { className: "mt-2 text-xs text-shale" },
        words,
        coco.problems[0] ? ` ${coco.problems[0]}` : "",
      ),
      warnings.map((warning) => createElement("p", { key: warning, className: "mt-1 text-sm text-coal" }, warning)),
      editable ? actionButton("Save copy", onSaveCopy) : null,
    ),
  );
}

function draftingPanel(late: boolean) {
  return createElement(
    "div",
    {
      className: "border border-line bg-fossil p-4",
      role: "status",
      "data-draft-wait": late ? "late" : "writing",
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
    canApproveDraft: true,
    canApproveWording: false,
    canWithdraw: false,
    wordingNote: "",
    unsubscribeUrl: null,
    ...partial,
  };
}
