import { createServerFn } from "@tanstack/react-start";

export type SpringEnquiry = {
  name: string;
  email: string;
  company: string;
  role: string;
  headcount: string;
  window: string;
  notes: string;
  honey: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

export const SPRING_MAIL = "hello@unearthself.xyz";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clean(s: unknown, max = 400) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function validEnquiry(data: SpringEnquiry) {
  const name = clean(data.name, 80);
  const email = clean(data.email, 120).toLowerCase();
  const company = clean(data.company, 120);
  if (name.length < 2) return null;
  if (!EMAIL_RE.test(email)) return null;
  if (company.length < 2) return null;
  return {
    name,
    email,
    company,
    role: clean(data.role, 80),
    headcount: clean(data.headcount, 24),
    window: clean(data.window, 40),
    notes: clean(data.notes, 1200),
    source: "/spring",
    campaign: "spring-2027",
    utm_source: clean(data.utmSource, 80),
    utm_medium: clean(data.utmMedium, 80),
    utm_campaign: clean(data.utmCampaign, 80),
    receivedAt: new Date().toISOString(),
  };
}

export const submitSpringEnquiry = createServerFn({ method: "POST" })
  .validator((d: SpringEnquiry) => d)
  .handler(async ({ data }) => {
    if (clean(data.honey)) return { ok: true as const };
    const enquiry = validEnquiry(data);
    if (!enquiry) return { ok: false as const, error: "invalid" };

    console.info("spring-enquiry", JSON.stringify(enquiry));

    const webhook = process.env.ENQUIRY_WEBHOOK_URL?.trim();
    const portal = process.env.HUBSPOT_PORTAL_ID?.trim();
    const formId = process.env.HUBSPOT_FORM_ID?.trim();
    const jobs: Promise<boolean>[] = [];

    if (webhook) jobs.push(postJson(webhook, enquiry));
    if (portal && formId) {
      jobs.push(
        postJson(`https://api.hsforms.com/submissions/v3/integration/submit/${portal}/${formId}`, {
          fields: [
            { name: "firstname", value: enquiry.name.split(" ")[0] ?? enquiry.name },
            { name: "lastname", value: enquiry.name.split(" ").slice(1).join(" ") || "—" },
            { name: "email", value: enquiry.email },
            { name: "company", value: enquiry.company },
            { name: "jobtitle", value: enquiry.role },
            {
              name: "message",
              value: `Headcount: ${enquiry.headcount}\nWindow: ${enquiry.window}\n${enquiry.notes}`.trim(),
            },
          ],
          context: { pageUri: "https://www.unearthself.xyz/spring", pageName: "Spring 2027" },
        }),
      );
    }

    if (jobs.length) await Promise.all(jobs);
    return { ok: true as const };
  });

async function postJson(url: string, body: unknown) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Enquiry email alerts (Resend, server-side) ───────────────────────────
 * Every enquiry form posts to one server function, which sends through the
 * Resend REST API. Env (server-only, set in Vercel):
 *   RESEND_API_KEY  required
 *   ENQUIRY_TO      default hello@unearthself.xyz
 *   ENQUIRY_FROM    default "Unearth Self <enquiries@unearthself.xyz>"
 * Returns ok only on a Resend 2xx. No payments are taken here.
 */
export const ENQUIRY_MAIL = SPRING_MAIL;

/** Plain-anchor fallback href, e.g. <a href={enquiryMailto("Haven stay request")}>. */
export function enquiryMailto(subject: string) {
  return `mailto:${ENQUIRY_MAIL}?subject=${encodeURIComponent(subject)}`;
}

export type AlertResult = { ok: true } | { ok: false; error: string };

type AlertInput = {
  form: string;
  subject?: string;
  replyTo: string;
  fields: Record<string, unknown>;
  honey?: string;
  page?: string;
};

const MAX_FIELDS = 30;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function normaliseAlert(d: AlertInput) {
  const form = clean(d.form, 80);
  const replyTo = clean(d.replyTo, 120).toLowerCase();
  if (form.length < 2 || !EMAIL_RE.test(replyTo)) return null;
  const fields: [string, string][] = [];
  for (const [k, v] of Object.entries(d.fields ?? {}).slice(0, MAX_FIELDS)) {
    if (v === undefined || v === null) continue;
    const val = String(v).replace(/\r\n/g, "\n").trim().slice(0, 4000);
    if (!val) continue;
    fields.push([clean(k, 40).replace(/_/g, " "), val]);
  }
  return {
    form,
    replyTo,
    subject: clean(d.subject || form, 160).replace(/[\r\n]/g, " "),
    page: clean(d.page, 300),
    fields,
  };
}

export const sendEnquiryEmail = createServerFn({ method: "POST" })
  .validator((d: AlertInput) => d)
  .handler(async ({ data }): Promise<AlertResult> => {
    if (clean(data.honey)) return { ok: true };
    const a = normaliseAlert(data);
    if (!a) return { ok: false, error: "Please give a valid email address." };
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      console.error("enquiry-email: RESEND_API_KEY is not set; alert not sent", a.form);
      return { ok: false, error: "Our enquiry email isn't set up yet." };
    }
    const to = process.env.ENQUIRY_TO?.trim() || ENQUIRY_MAIL;
    const from = process.env.ENQUIRY_FROM?.trim() || "Unearth Self <enquiries@unearthself.xyz>";
    const rows: [string, string][] = [["Form", a.form], ["Email", a.replyTo], ...a.fields];
    if (a.page) rows.push(["Page", a.page]);
    rows.push(["Received", new Date().toISOString()]);
    const html =
      `<h2 style="font-family:sans-serif">${esc(a.subject)}</h2>` +
      `<table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
      rows
        .map(
          ([k, v]) =>
            `<tr><th align="left" valign="top" style="border:1px solid #ddd;background:#f6f3ee">${esc(k)}</th>` +
            `<td style="border:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`,
        )
        .join("") +
      `</table>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], reply_to: a.replyTo, subject: a.subject, html, text }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) return { ok: true };
      console.error("enquiry-email: Resend", res.status, (await res.text().catch(() => "")).slice(0, 500));
      return { ok: false, error: "The email service refused the message." };
    } catch (err) {
      console.error("enquiry-email: fetch failed", err);
      return { ok: false, error: "Could not reach the email service." };
    }
  });

/** Client helper used by every form. */
export async function sendEnquiryAlert(opts: AlertInput): Promise<AlertResult> {
  try {
    const page = typeof window !== "undefined" ? window.location.href : "";
    return await sendEnquiryEmail({ data: { ...opts, page } });
  } catch {
    return { ok: false, error: "Could not send." };
  }
}
