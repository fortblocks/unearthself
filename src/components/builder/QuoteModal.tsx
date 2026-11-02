import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { useBuilderStore } from "@/lib/store";
import { getActivityById } from "@/data/activities";
import { ENQUIRY_MAIL, enquiryMailto, sendEnquiryAlert } from "@/lib/enquiry";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuoteModal({ open, onClose }: Props) {
  const days = useBuilderStore((s) => s.days);
  const title = useBuilderStore((s) => s.title);
  const groupSize = useBuilderStore((s) => s.groupSize);
  const season = useBuilderStore((s) => s.season);
  const intensityPreset = useBuilderStore((s) => s.intensityPreset);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [notes, setNotes] = useState("");
  const [size, setSize] = useState(groupSize);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [honey, setHoney] = useState("");

  if (!open) return null;

  function summarise() {
    const lines = [`${title} — ${days.length} day${days.length === 1 ? "" : "s"}, ${size} people, season: ${season}, intensity: ${intensityPreset}`];
    days.forEach((day) => {
      const parts = Object.entries(day.blocks).flatMap(([block, acts]) =>
        acts.map((a) => `${block}: ${getActivityById(a.activityId)?.name ?? a.activityId} (${a.durationMin} min)`),
      );
      lines.push(`${day.label}: ${parts.length ? parts.join("; ") : "(nothing placed)"}`);
    });
    return lines.join("\n");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const enquiry = {
        id: `enq_${Date.now()}`,
        receivedAt: new Date().toISOString(),
        name,
        email,
        phone,
        company,
        groupSize: size,
        preferredDates,
        notes,
        itinerary: {
          title,
          days,
          season,
          intensityPreset,
          groupSize: size,
          dayCount: days.length,
        },
      };
      try {
        const existing = JSON.parse(localStorage.getItem("unearthself-enquiries") || "[]") as unknown[];
        localStorage.setItem("unearthself-enquiries", JSON.stringify([enquiry, ...existing].slice(0, 50)));
      } catch {
        /* keep going */
      }
      const res = await sendEnquiryAlert({
        form: "Package builder quote",
        subject: `Package builder quote — ${company || name}`,
        replyTo: email,
        honey,
        fields: {
          name,
          phone,
          company,
          group_size: size,
          preferred_dates: preferredDates,
          notes,
          itinerary: summarise(),
        },
      });
      if (res.ok) setStatus("done");
      else {
        setStatus("error");
        setError(res.error);
      }
    } catch {
      setStatus("error");
      setError("Could not send enquiry.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Request quote"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="modal-eyebrow">Sales pipeline</p>
            <h2>Request a Quote</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {status === "done" ? (
          <div className="modal-success">
            <h3>Request forged.</h3>
            <p>
              Your itinerary is in our pipeline. A Badlands coordinator will follow up with
              pricing and availability.
            </p>
            <button type="button" className="btn-primary" onClick={onClose}>
              Back to builder
            </button>
          </div>
        ) : (
          <form className="quote-form" onSubmit={onSubmit}>
            <label>
              <span>Name *</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Email *</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              <span>Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span>Company / Group</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label>
              <span>Group size *</span>
              <input
                required
                type="number"
                min={1}
                value={size}
                onChange={(e) => setSize(Number(e.target.value) || 1)}
              />
            </label>
            <label>
              <span>Preferred dates *</span>
              <input
                required
                placeholder="e.g. Mar 12–14 or flexible spring"
                value={preferredDates}
                onChange={(e) => setPreferredDates(e.target.value)}
              />
            </label>
            <label className="full">
              <span>Notes</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Goals, dietary needs, accessibility…"
              />
            </label>
            <p className="quote-note">
              Your current <strong>{title}</strong> ({days.length} days) will be attached automatically.
            </p>
            <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: "none" }} value={honey} onChange={(e) => setHoney(e.target.value)} />
            {error && (
              <p className="form-error">
                {error} That didn’t send. Please email us at{" "}
                <a href={enquiryMailto("Package builder quote")}>{ENQUIRY_MAIL}</a>.
              </p>
            )}
            <button type="submit" className="btn-primary full-btn" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
