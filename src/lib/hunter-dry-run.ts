/**
 * Dry run. The default uses fictional fixtures and files nothing.
 * `--live` may spend one model call when XAI_API_KEY is set. It never files and never sends.
 */

import { hunterQualityFloor } from "./hunter-config.ts";
import { HUNTER_LIVE_LIST, dryRunFixtures } from "./hunter-phase.ts";

const live = process.argv.includes("--live");

if (!live) {
  const funnel = dryRunFixtures(hunterQualityFloor());
  console.log(JSON.stringify({ mode: "fixtures", liveList: HUNTER_LIVE_LIST.length, filed: false, funnel }, null, 2));
} else if (!process.env.XAI_API_KEY?.trim()) {
  console.log(JSON.stringify({ mode: "live", filed: false, searched: false, note: "XAI_API_KEY is not set. No search was made." }));
} else {
  const { callXaiWebSearch } = await import("./xai-search.ts");
  const { hunterPrompt, slotAt } = await import("./leads-hunter.ts");
  const { slot } = slotAt(0);
  const result = await callXaiWebSearch(
    "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
    hunterPrompt(slot, []),
    90_000,
  );
  const companies = "error" in result ? 0 : Array.isArray(result.companies) ? result.companies.length : 0;
  console.log(
    JSON.stringify(
      {
        mode: "live",
        filed: false,
        searched: !("error" in result),
        companies,
        error: "error" in result ? result.error : "",
      },
      null,
      2,
    ),
  );
}
