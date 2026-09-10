import { cad } from "@/lib/format";
import { HAVEN_RATES, SEASONS } from "@/data/havenRates";
import { ROOMS, type RoomSlug } from "@/data/rooms";

function Band({ night, weekend, month }: { night: number; weekend: number; month: number }) {
  return (
    <div className="leading-snug">
      <p className="tabular-nums">{cad(night)}</p>
      <p className="tabular-nums text-shale">
        {cad(weekend)} <span className="text-shale/60">wkd</span>
      </p>
      <p className="tabular-nums text-shale">
        {cad(month)} <span className="text-shale/60">/mo</span>
      </p>
    </div>
  );
}

export function RateTable({ slug }: { slug?: RoomSlug }) {
  if (slug) {
    const rates = HAVEN_RATES[slug];
    return (
      <div className="overflow-x-auto border border-coal/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-coal/10 bg-white text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">
              <th className="px-4 py-3 font-semibold">Season</th>
              <th className="px-4 py-3 font-semibold">Night</th>
              <th className="px-4 py-3 font-semibold">Weekend</th>
              <th className="px-4 py-3 font-semibold">Month</th>
            </tr>
          </thead>
          <tbody>
            {SEASONS.map((s) => {
              const band = rates[s.id];
              return (
                <tr key={s.id} className="border-t border-coal/10">
                  <th className="px-4 py-3 font-medium">{s.label}</th>
                  <td className="px-4 py-3 tabular-nums">{cad(band.night)}</td>
                  <td className="px-4 py-3 tabular-nums">{cad(band.weekend)}</td>
                  <td className="px-4 py-3 tabular-nums">{cad(band.month)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-coal/10 px-4 py-3 text-sm text-shale">
          Cleaning {cad(rates.clean)} per stay. Weekend is Friday and Saturday night. CAD.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-coal/10">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-coal/10 bg-white text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">
            <th className="px-4 py-3 font-semibold">Suite</th>
            {SEASONS.map((s) => (
              <th key={s.id} className="px-4 py-3 font-semibold">
                {s.short}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold">Clean</th>
          </tr>
        </thead>
        <tbody>
          {ROOMS.map((room) => {
            const rates = HAVEN_RATES[room.slug];
            return (
              <tr key={room.slug} className="border-t border-coal/10 align-top">
                <th className="px-4 py-4 font-medium">
                  {room.name}
                  <span className="mt-0.5 block text-[0.7rem] font-normal tracking-normal text-shale">
                    Sleeps {room.sleeps}
                  </span>
                </th>
                {SEASONS.map((s) => (
                  <td key={s.id} className="px-4 py-4">
                    <Band {...rates[s.id]} />
                  </td>
                ))}
                <td className="px-4 py-4 tabular-nums">{cad(rates.clean)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
