import { jsPDF } from "jspdf";
import { getActivityById } from "@/data/activities";
import {
  BLOCK_META,
  CATEGORY_META,
  TRANSFER_BUFFER_MIN,
  type DayPlan,
  type TimeBlock,
} from "@/lib/types";
import { formatDuration } from "@/lib/time";

const OCHRE: [number, number, number] = [242, 104, 76];
const CHARCOAL: [number, number, number] = [22, 23, 24];
const BONE: [number, number, number] = [248, 240, 237];
const RED: [number, number, number] = [201, 154, 74];

export function generateItineraryPdf(opts: {
  title: string;
  days: DayPlan[];
  groupSize: number;
  seasonLabel: string;
}): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  // Header band
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...OCHRE);
  doc.rect(0, 110, pageW, 4, "F");

  doc.setTextColor(...BONE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("UNEARTHSELF · BADLANDS BOOTCAMP", margin, 40);
  doc.setFontSize(22);
  doc.text("RETREAT ITINERARY", margin, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(opts.title, margin, 90);

  y = 140;
  doc.setTextColor(...CHARCOAL);
  doc.setFontSize(10);
  doc.text(`Group size: ${opts.groupSize}`, margin, y);
  doc.text(`Season focus: ${opts.seasonLabel}`, margin + 140, y);
  doc.text(`Forged in the Badlands`, pageW - margin, y, { align: "right" });
  y += 28;

  const blocks: TimeBlock[] = ["morning", "afternoon", "evening"];

  opts.days.forEach((day, dayIndex) => {
    if (y > 680) {
      doc.addPage();
      y = 56;
    }

    doc.setFillColor(...OCHRE);
    doc.roundedRect(margin, y - 14, pageW - margin * 2, 28, 4, 4, "F");
    doc.setTextColor(...BONE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(day.label.toUpperCase(), margin + 12, y + 4);
    y += 30;

    blocks.forEach((block) => {
      const items = day.blocks[block];
      if (y > 700) {
        doc.addPage();
        y = 56;
      }

      doc.setTextColor(...RED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `${BLOCK_META[block].label.toUpperCase()}  ·  ${BLOCK_META[block].window}`,
        margin,
        y
      );
      y += 16;

      if (items.length === 0) {
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("Open block — room to roam", margin + 8, y);
        y += 18;
        return;
      }

      items.forEach((item, idx) => {
        if (y > 720) {
          doc.addPage();
          y = 56;
        }
        const activity = getActivityById(item.activityId);
        const name = activity?.name ?? item.activityId;
        const cat = activity ? CATEGORY_META[activity.category].label : "";

        doc.setFillColor(...BONE);
        doc.roundedRect(margin, y - 10, pageW - margin * 2, 36, 3, 3, "F");
        doc.setTextColor(...CHARCOAL);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(name, margin + 10, y + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(
          `${formatDuration(item.durationMin)}${cat ? `  ·  ${cat}` : ""}`,
          margin + 10,
          y + 18
        );
        y += 44;

        if (idx < items.length - 1) {
          doc.setTextColor(...OCHRE);
          doc.setFontSize(8);
          doc.text(
            `↳ ${TRANSFER_BUFFER_MIN} min transfer / buffer`,
            margin + 14,
            y - 6
          );
        }
      });
      y += 8;
    });

    if (dayIndex < opts.days.length - 1) y += 12;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      "Badlands Bootcamp · Drumheller, Alberta · Forged in the Badlands",
      margin,
      doc.internal.pageSize.getHeight() - 28
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 28,
      { align: "right" }
    );
  }

  const filename = `${opts.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-itinerary.pdf`;
  doc.save(filename);
}
