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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(s: unknown, max = 400) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export const submitSpringEnquiry = createServerFn({ method: "POST" })
  .validator((d: SpringEnquiry) => d)
  .handler(async ({ data }) => {
    if (clean(data.honey)) return { ok: true as const };

    const enquiry = {
      name: clean(data.name, 80),
      email: clean(data.email, 120).toLowerCase(),
      company: clean(data.company, 120),
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

    if (enquiry.name.length < 2) return { ok: false as const, error: "name" };
    if (!EMAIL_RE.test(enquiry.email)) return { ok: false as const, error: "email" };
    if (enquiry.company.length < 2) return { ok: false as const, error: "company" };

    console.info("spring-enquiry", JSON.stringify(enquiry));

    const delivered = await deliver(enquiry);
    if (!delivered) return { ok: false as const, error: "deliver" };
    return { ok: true as const };
  });

async function deliver(enquiry: Record<string, string>) {
  const webhook = process.env.ENQUIRY_WEBHOOK_URL?.trim();
  const portal = process.env.HUBSPOT_PORTAL_ID?.trim();
  const formId = process.env.HUBSPOT_FORM_ID?.trim();
  const mailTo = process.env.ENQUIRY_MAIL_TO?.trim() || "hello@unearthself.xyz";

  const attempts: Promise<boolean>[] = [
    postJson(`https://formsubmit.co/ajax/${encodeURIComponent(mailTo)}`, {
      ...enquiry,
      _subject: `Spring 2027 enquiry — ${enquiry.company}`,
      _template: "table",
      _captcha: "false",
    }),
  ];

  if (webhook) attempts.push(postJson(webhook, enquiry));

  if (portal && formId) {
    attempts.push(
      postJson(`https://api.hsforms.com/submissions/v3/integration/submit/${portal}/${formId}`, {
        fields: [
          { name: "firstname", value: enquiry.name.split(" ")[0] ?? enquiry.name },
          { name: "lastname", value: enquiry.name.split(" ").slice(1).join(" ") || "—" },
          { name: "email", value: enquiry.email },
          { name: "company", value: enquiry.company },
          { name: "jobtitle", value: enquiry.role },
          { name: "message", value: formatNote(enquiry) },
        ],
        context: { pageUri: "https://www.unearthself.xyz/spring", pageName: "Spring 2027" },
      }),
    );
  }

  const results = await Promise.all(attempts);
  return results.some(Boolean);
}

function formatNote(e: Record<string, string>) {
  return [
    `Headcount: ${e.headcount}`,
    `Window: ${e.window}`,
    e.notes ? `Notes: ${e.notes}` : "",
    `Campaign: ${e.campaign}`,
    e.utm_source ? `UTM: ${e.utm_source} / ${e.utm_medium} / ${e.utm_campaign}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

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
