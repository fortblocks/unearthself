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

export async function mailSpringEnquiry(data: SpringEnquiry) {
  if (clean(data.honey)) return true;
  const enquiry = validEnquiry(data);
  if (!enquiry) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${SPRING_MAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: enquiry.name,
        email: enquiry.email,
        company: enquiry.company,
        role: enquiry.role,
        headcount: enquiry.headcount,
        window: enquiry.window,
        notes: enquiry.notes,
        source: enquiry.source,
        campaign: enquiry.campaign,
        utm_source: enquiry.utm_source,
        utm_medium: enquiry.utm_medium,
        utm_campaign: enquiry.utm_campaign,
        _subject: `Spring 2027 enquiry — ${enquiry.company}`,
        _template: "table",
        _captcha: "false",
        _replyto: enquiry.email,
      }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean | string };
    const ok = json.success === true || json.success === "true" || res.ok;
    return ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
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
