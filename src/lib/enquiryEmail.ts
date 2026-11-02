/* Branded enquiry alert email (HTML + plain text). Pure TS, no deps.
 * Table-based, inline-styled for email clients. Every value is HTML-escaped.
 * Links:
 *   Roombox  https://www.roombox.app            (src/components/haven/StayRequest.tsx ROOMBOX)
 *   Admin    https://www.unearthself.xyz/admin/* (routes in src/routes/admin.*.tsx;
 *            surfaces per docs/operating-system/11_WS_BACK_OFFICE.md)
 */

export const SITE_URL = "https://www.unearthself.xyz";
export const ROOMBOX_URL = "https://www.roombox.app";

const COAL = "#161718";
const FOSSIL = "#F5F0E6";
const EMBER = "#F2684C";
const RULE = "#E2DACB";
const MUTED = "#6B665E";
const DISPLAY = "'Morganite','Oswald','Arial Narrow',Arial,Helvetica,sans-serif";
const SANS = "'Aktiv Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "'Fraunces','Iowan Old Style',Georgia,'Times New Roman',serif";

type Link = { label: string; href: string };
type Kind = { label: string; intro: string; links: Link[] };

const pipeline: Link = { label: "Open pipeline", href: `${SITE_URL}/admin/pipeline` };
const inventory: Link = { label: "Open inventory", href: `${SITE_URL}/admin/inventory` };
const roombox: Link = { label: "Open Roombox", href: ROOMBOX_URL };

/** Maps the `form` string each site form sends to its label and action links. */
export function formKind(form: string): Kind {
  const f = form.toLowerCase();
  if (f.includes("spring"))
    return { label: "Spring 2027 enquiry", intro: "A team asked about Spring 2027 on /spring.", links: [pipeline] };
  if (f.includes("haven"))
    return { label: "Haven stay request", intro: "A guest asked to stay at Haven.", links: [roombox, inventory] };
  if (f.includes("treatment"))
    return { label: "Treatment request", intro: "A guest asked for a treatment on /book/treatment.", links: [inventory] };
  if (f.includes("basecamp"))
    return { label: "Basecamp request", intro: "A guest asked for Basecamp from the Book panel.", links: [inventory] };
  if (f.includes("builder"))
    return { label: "Package builder quote", intro: "A group asked for a quote from the package builder.", links: [pipeline] };
  if (f.includes("retreat")) {
    const where = f.includes("panel") ? "the Book panel" : "/book/retreat";
    return { label: "Retreat hold", intro: `A group asked to hold retreat dates from ${where}.`, links: [pipeline] };
  }
  return { label: form, intro: "A new enquiry came in from the site.", links: [pipeline] };
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function enquirySubject(form: string, guestName: string) {
  return `${formKind(form).label} — ${guestName}`.replace(/[\r\n]+/g, " ").slice(0, 160);
}

export type EmailInput = {
  form: string;
  guestName: string;
  replyTo: string;
  fields: [string, string][];
  page?: string;
  receivedAt: Date;
};

function stamp(d: Date) {
  return (
    d.toLocaleString("en-CA", { timeZone: "America/Edmonton", dateStyle: "medium", timeStyle: "short" }) +
    " Mountain"
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function renderEnquiryEmail(i: EmailInput) {
  const kind = formKind(i.form);
  const subject = enquirySubject(i.form, i.guestName);
  const when = stamp(i.receivedAt);
  const mailto = `mailto:${i.replyTo}?subject=${encodeURIComponent(`Re: ${subject}`)}`;
  const links: Link[] = [{ label: "Reply", href: mailto }, ...kind.links];

  const rows = i.fields
    .map(
      ([k, v]) =>
        `<tr><td valign="top" width="34%" style="padding:12px 12px 12px 0;border-top:1px solid ${RULE};font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED}">${esc(cap(k))}</td>` +
        `<td valign="top" style="padding:12px 0;border-top:1px solid ${RULE};font-family:${SANS};font-size:15px;line-height:22px;color:${COAL};white-space:pre-wrap;word-break:break-word">${esc(v)}</td></tr>`,
    )
    .join("");

  const buttons = links
    .map((l, n) => {
      const primary = n === 0;
      return (
        `<td style="padding:0 8px 8px 0"><a href="${esc(l.href)}" style="display:inline-block;white-space:nowrap;padding:12px 18px;font-family:${SANS};font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;` +
        (primary
          ? `background:${EMBER};color:${COAL};border:1px solid ${EMBER}`
          : `background:${FOSSIL};color:${COAL};border:1px solid ${COAL}`) +
        `">${esc(l.label)}</a></td>`
      );
    })
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${FOSSIL}">
<div style="display:none;max-height:0;overflow:hidden">${esc(`${kind.label} from ${i.guestName}, ${when}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FOSSIL}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${RULE}">
<tr><td style="background:${COAL};padding:22px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${DISPLAY};font-size:26px;line-height:28px;letter-spacing:3px;text-transform:uppercase;color:${FOSSIL}"><a href="${SITE_URL}" style="color:${FOSSIL};text-decoration:none">Unearth&nbsp;Self</a></td>
<td align="right" style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${EMBER}">New enquiry</td></tr></table></td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${EMBER}">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 8px">
<div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${EMBER}">${esc(kind.label)}</div>
<h1 style="margin:10px 0 8px;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:36px;color:${COAL}">${esc(i.guestName)}</h1>
<p style="margin:0 0 4px;font-family:${SANS};font-size:15px;line-height:22px;color:${COAL}">${esc(kind.intro)}</p>
<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED}">${esc(when)} · <a href="${esc(mailto)}" style="color:${COAL}">${esc(i.replyTo)}</a></p>
</td></tr>
<tr><td style="padding:20px 32px 8px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttons}</tr></table></td></tr>
<tr><td style="padding:16px 32px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
<tr><td style="padding:18px 32px;background:${FOSSIL};border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:18px;color:${MUTED}">Hit reply to answer ${esc(i.guestName)} directly.${i.page ? ` Sent from <a href="${esc(i.page)}" style="color:${MUTED}">${esc(i.page)}</a>.` : ""}<br>Unearth Self · Drumheller, Alberta</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `UNEARTH SELF — ${kind.label.toUpperCase()}`,
    "",
    i.guestName,
    kind.intro,
    `${when} · ${i.replyTo}`,
    "",
    ...i.fields.map(([k, v]) => `${cap(k)}: ${v}`),
    "",
    ...kind.links.map((l) => `${l.label}: ${l.href}`),
    i.page ? `Sent from: ${i.page}` : "",
    "",
    `Reply to this email to answer ${i.guestName} directly.`,
  ]
    .filter((l, n, a) => !(l === "" && a[n - 1] === ""))
    .join("\n");

  return { subject, html, text };
}
