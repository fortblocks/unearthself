import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/drumheller")({
  head: () => ({
    meta: [
      { title: "Drumheller — Unearth Self" },
      {
        name: "description",
        content:
          "A long read on Drumheller, Alberta: the Red Deer River valley, Joseph Burr Tyrrell's 1884 find, the coal years, the Horseshoe Canyon Formation and the badlands as they are today.",
      },
    ],
  }),
  component: DrumhellerPage,
});

function Section({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">{label}</p>
        <h2 className="font-display mb-6 text-4xl uppercase">{title}</h2>
        <div className="flex flex-col gap-4 text-lg leading-relaxed text-fossil/80">{children}</div>
      </div>
    </section>
  );
}

function Plate({ src }: { src: string }) {
  return (
    <figure aria-hidden="true" className="px-6 py-6">
      <div className="mx-auto aspect-[21/9] max-w-6xl overflow-hidden rounded-[4px] border border-fossil/10">
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    </figure>
  );
}

function HistoryPlate({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="px-6 py-6">
      <div className="mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-[4px] border border-fossil/10">
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
    </figure>
  );
}

const Divider = () => <div aria-hidden="true" className="mx-auto h-px w-1/2 bg-fossil/15" />;

const SOURCES: { label: string; href: string }[] = [
  { label: "Royal Tyrrell Museum — Museum History", href: "https://www.tyrrellmuseum.com/about/museum_history" },
  { label: "Royal Tyrrell Museum — About", href: "https://www.tyrrellmuseum.com/about" },
  { label: "Royal Tyrrell Museum — Willow Creek Hoodoos", href: "https://www.tyrrellmuseum.com/whats_on/off_site_Experiences/hoodoos" },
  { label: "Travel Drumheller — Town History", href: "https://traveldrumheller.com/plan-your-trip/town-history/" },
  { label: "Travel Drumheller — World's Largest Dinosaur", href: "https://traveldrumheller.com/attractions/worlds-largest-dinosaur/" },
  { label: "World's Largest Dinosaur", href: "https://worldslargestdinosaur.com/" },
  { label: "Atlas Coal Mine National Historic Site — About", href: "https://atlascoalmine.ab.ca/about/" },
  { label: "Alberta Register of Historic Places — The Hoodoos", href: "https://hermis.alberta.ca/ARHP/Details.aspx?DeptID=1&ObjectID=4665-0062" },
  { label: "Travel Alberta — Hoodoos and Hoodoo Trail", href: "https://www.travelalberta.com/listings/hoodoos-and-hoodoo-trail-4517" },
  { label: "Last Chance Saloon — About", href: "https://visitlastchancesaloon.com/about-us.html" },
  { label: "CBC News — 11 bridges lead visitors on tour of Alberta's coal mining past", href: "https://www.cbc.ca/news/canada/calgary/wayne-alberta-1.5303744" },
  { label: "Badlands Amphitheatre — Badlands Passion Play", href: "https://badlandsamp.com/badlands-passion-play/" },
  { label: "Wikipedia — Drumheller", href: "https://en.wikipedia.org/wiki/Drumheller" },
  { label: "Wikipedia — Albertosaurus", href: "https://en.wikipedia.org/wiki/Albertosaurus" },
  { label: "Wikipedia — Horseshoe Canyon Formation", href: "https://en.wikipedia.org/wiki/Horseshoe_Canyon_Formation" },
  { label: "Wikipedia — Horseshoe Canyon (Alberta)", href: "https://en.wikipedia.org/wiki/Horseshoe_Canyon_(Alberta)" },
  { label: "Wikipedia — Royal Tyrrell Museum of Palaeontology", href: "https://en.wikipedia.org/wiki/Royal_Tyrrell_Museum_of_Palaeontology" },
  { label: "Wikipedia — Star Mine Suspension Bridge", href: "https://en.wikipedia.org/wiki/Star_Mine_Suspension_Bridge" },
  { label: "Wikipedia — Wayne, Alberta", href: "https://en.wikipedia.org/wiki/Wayne,_Alberta" },
  { label: "Wikipedia — Midland Provincial Park", href: "https://en.wikipedia.org/wiki/Midland_Provincial_Park" },
  { label: "Wikipedia — Badlands Amphitheatre", href: "https://en.wikipedia.org/wiki/Badlands_Amphitheatre" },
];

function DrumhellerPage() {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      {/* Editorial hero */}
      <section className="relative min-h-[100dvh] px-6 pt-32 pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)",
          }}
        >
          <img src="/topo.png" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-12">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-1 w-12 rounded-full bg-ember" />
            <p className="text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">The long read · Alberta badlands</p>
          </div>
          <h1 className="font-display text-[clamp(3.5rem,14vw,13rem)] leading-[0.82] tracking-tight uppercase">
            Drumheller<span className="text-ember">.</span>
          </h1>
          <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
            <p className="max-w-[34ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">
              A river, a canyon cut into the prairie, and seventy million years laid out in stripes. The story of
              a valley.
            </p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] border border-fossil/10">
              <img src="/images/hero-badlands-dusk.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal/60 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <Section label="Arrival" title="The valley below the prairie">
        <p>
          Drive northeast from Calgary for about 110 kilometres and the land seems to run on forever: wheat, sky,
          the odd grain elevator. Then the road tips over an edge and the prairie simply falls away. Below lies the
          Red Deer River, winding through a trench of banded grey, ochre and rust. This is Drumheller, a town on
          the river in the badlands of east-central Alberta.
        </p>
        <p>
          The stretch of valley around the town is often called Dinosaur Valley. It is roughly two kilometres
          wide and some twenty-eight kilometres long, a narrow world of coulees and cutbanks that the river has
          been carving through soft Cretaceous rock. Up top, it's farm country. Down here, the walls read like
          an open book of deep time.
        </p>
      </Section>

      <Plate src="/images/found/river.jpg" />

      <Section label="The land" title="Before the town">
        <p>
          Long before there was a townsite, this was, and remains, Indigenous land. Drumheller lies within Treaty
          7 territory. The Royal Tyrrell Museum acknowledges the ancestral and traditional territories of the
          Blackfoot Confederacy (Siksika, Kainai and Piikani), the Tsuut'ina First Nation and the Stoney Nakoda
          First Nation, as well as the Métis Nation homeland. The Atlas Coal Mine Historical Society likewise
          names its site as part of the Rocky View Métis District. It describes settler presence here as recent
          on land with histories stretching back to time immemorial.
        </p>
      </Section>

      <Divider />

      <Section label="1884" title="A skull in the cutbank">
        <p>
          On 12 August 1884, a young geologist with the Geological Survey of Canada was working near the present
          site of Drumheller. His name was Joseph Burr Tyrrell, pronounced <em>TEER-uhl</em>. He came upon the
          skull of a carnivorous dinosaur, around seventy million years old. Two decades later, in 1905, the
          American palaeontologist Henry Fairfield Osborn named it <em>Albertosaurus sarcophagus</em>, the
          "flesh-eating lizard from Alberta".
        </p>
        <p>
          It was the first discovery of what has become one of the best-understood tyrannosaurs. Since 1884,
          fossils of more than thirty individuals have been found. <em>Albertosaurus</em> was a two-legged
          predator with short arms, two-fingered hands and a massive head full of sharp teeth. It grew to around
          eight or nine metres long, smaller than its famous relative <em>Tyrannosaurus</em> but likely the top
          predator of its world. Tyrrell's find mattered so much that, a century later, the province named its
          new museum of palaeontology after him.
        </p>
      </Section>

      <Divider />

      <Section label="1911 onward" title="Samuel Drumheller's town">
        <p>
          The town takes its name from Samuel Drumheller. He bought the homestead of Thomas Patrick Greentree,
          had it surveyed into the original townsite and put the lots on the market in 1911. That same year he
          began mining coal nearby. A railway station followed in 1912, and the young settlement grew fast. It
          became a village on 15 May 1913, a town on 2 March 1916 and a city on 3 April 1930.
        </p>
        <p>
          The numbers tell the story of a boom: 312 people in 1916, and 2,987 by 1931. The valley filled with
          camps and hamlets strung along the river and its side valleys. Many later became part of the town
          itself. When the City of Drumheller amalgamated with the Municipal District of Badlands No. 7 on 1
          January 1998, it took in Cambria, East Coulee, Lehigh, Nacmine, Rosedale and Wayne. It chose town
          status over city status, and the result was Alberta's largest town by land area.
        </p>
      </Section>

      <HistoryPlate src="/images/drumheller/townsite-1912.jpg" alt="Sepia view of early Drumheller in the 1910s: a few wooden buildings on the valley floor beneath grassy badlands hills." />
      <HistoryPlate src="/images/drumheller/main-street-1915.jpg" alt="Sepia view of a dirt main street in Drumheller around 1915, with horse-drawn buggies, early cars and brick storefronts, badlands hills beyond." />
      <Plate src="/images/work/horseshoe.jpg" />

      <Section label="Coal" title="Black seams, bright lights">
        <p>
          The same layered rock that holds the dinosaurs also holds coal. Dark bands run through the canyon
          walls: the remains of ancient coastal swamps, pressed into seams. For the first half of the twentieth
          century, that coal made Drumheller. The Atlas Coal Mine Historical Society counts 139 mines in the
          Drumheller Valley over the years. Drumheller boomed until the end of the Second World War, when coal
          lost most of its value.
        </p>
        <p>
          The last of those 139 is the Atlas, at East Coulee, about twenty minutes southeast of town along
          Highway 10. Its Atlas No. 3 and No. 4 mines were active from 1936 to 1984, and it reopened as a
          historic site in 1987. Today it is a National Historic Site, provincially and nationally recognised as
          a near-complete example of the kind of mine once common across Western Canada. Its centrepiece is the
          last wooden tipple in Canada, the coal-sorting structure that once stood at thousands of mines across
          the country. The society that runs it is local and visitor-supported. Guided tours take people into
          the parts of the site you can't wander alone, and seasonal opening dates are listed on its website.
        </p>
        <p>
          Down the road, the coal era left a different kind of landmark. At Rosedale, the Star Mine Suspension
          Bridge crosses the Red Deer River on a 117-metre pedestrian span. It was built in 1931 for the workers
          of the Star Mine, then rebuilt in 1958 by the Alberta government to commemorate the valley's mining
          history. After nearly four years closed for repairs, it reopened in January 2024.
        </p>
      </Section>

      <Divider />

      <HistoryPlate src="/images/drumheller/coal-mine-tipple-1920.jpg" alt="Sepia view of a timber coal tipple and mine buildings with smokestacks at the foot of the badlands, coal cars lined up on the siding." />
      <HistoryPlate src="/images/drumheller/pick-mining-1915.jpg" alt="Sepia view of coal miners in cloth caps with headlamps working a low seam with picks beside a loaded mine car." />
      <HistoryPlate src="/images/drumheller/mine-railway-1925.jpg" alt="Sepia view of a steam locomotive hauling loaded coal cars past a mine shed beneath badlands bluffs." />
      <Section label="Wayne" title="Eleven bridges to the Last Chance">
        <p>
          From Rosedale, Highway 10X turns south into the Rosebud River valley. It threads a deep badlands
          canyon and crosses the winding river again and again: eleven bridges in all, on the way to Wayne. Wayne
          was a coal town, and its mines closed in the 1950s. Census figures trace the fade, from 601 people in
          1941 to a few dozen by the 1970s.
        </p>
        <p>
          What remains is the Rosedeer Hotel, which opened in 1913, built by the Rosedeer Coal company in the boom
          years. Beside it stands the Last Chance Saloon, opened by the company so its miners could buy a meal
          or a beer. The saloon is still pouring, its walls hung with photographs and relics of the camp in its
          heyday. It sits between the ninth and tenth bridges, so the drive out is half the visit.
        </p>
      </Section>

      <HistoryPlate src="/images/drumheller/railway-badlands-1930.jpg" alt="Sepia view of a railway line and road running beside the Red Deer River below a banded badlands butte." />
      <Plate src="/images/exp-hoodoos.jpg" />

      <Section label="Deep time" title="Reading the canyon walls">
        <p>
          The rock exposed around Drumheller is mostly the Horseshoe Canyon Formation. It is a stack of
          sandstone, mudstone, shale and coal laid down in the Late Cretaceous, roughly 73 to 68 million years
          ago. At its type section in the Red Deer River valley here, it is about 250 metres thick. Its stripes
          record a shifting coastal world of rivers, swamps and floodplains at the edge of an inland sea, the
          same world where <em>Albertosaurus</em> hunted. The formation takes its name from Horseshoe Canyon
          itself.
        </p>
        <p>
          Badlands form when soft, nearly bare rock meets water, wind and frost. Rain cuts gullies; the river
          undercuts the slopes; nothing much grows to hold the ground together. The landscape changes visibly in
          a human lifetime, and erosion keeps exposing new fossils.
        </p>
        <p>
          The hoodoos are the most famous result. East of town on Highway 10, between Drumheller and East
          Coulee, the Willow Creek hoodoos stand as pillars with flat stone caps. Their soft bases are dark brown
          marine shale of the Bearpaw Formation. The paler columns and caprocks come from the Horseshoe Canyon
          Formation, the caprock cemented with as much as 30 to 40 per cent calcite. That hard cap shields the
          softer rock beneath, giving each hoodoo its mushroom shape. In geological terms they are fleeting: the
          provincial register notes they can erode by as much as a centimetre a year. They are a Provincial
          Historic Resource, protected by law. Stay on the paths and never climb them.
        </p>
      </Section>

      <Divider />

      <HistoryPlate src="/images/drumheller/hoodoos-1939.jpg" alt="Sepia view of a man in a 1930s suit and fedora standing among capped sandstone hoodoos." />
      <Section label="Horseshoe Canyon" title="The prairie, split open">
        <p>
          About seventeen kilometres west of Drumheller on Highway 9, the farmland opens without warning into
          Horseshoe Canyon. Its shape comes from two coulees that run down to Kneehill Creek, a tributary of
          the Red Deer River. Each arm is roughly five kilometres long, reaching from the highway down to the
          sites of two former mining communities, Dunphy and Gatine. Standing at the rim, you see the whole
          layered history of the region at once. The canyon is still giving up fossils: in 2020, a boy named
          Nathan Hrushkin found a dinosaur fossil there dating back some sixty-nine million years.
        </p>
      </Section>

      <HistoryPlate src="/images/drumheller/horseshoe-canyon-1929.jpg" alt="Sepia view across Horseshoe Canyon: layered badlands slopes and coulees under a flat prairie horizon." />
      <Plate src="/images/found/fossil.jpg" />

      <Section label="The museum" title="The Royal Tyrrell">
        <p>
          Six kilometres northwest of town, on Highway 838 in Midland Provincial Park, stands the Royal Tyrrell
          Museum of Palaeontology. It is Canada's only museum dedicated exclusively to the study of ancient life.
          It opened to the public on 25 September 1985 as the Tyrrell Museum of Palaeontology, named for the
          geologist whose 1884 find started it all. The "royal" title was added in 1990.
        </p>
        <p>
          It was first planned mainly as a scientific facility, but the plans soon grew to include a large public
          gallery. Today it displays one of the world's largest collections of dinosaurs, and the museum reports
          more than 430,000 visitors a year. It is also a working research institution, with programs that
          document and analyse Alberta's geological and palaeontological history. The building has been expanded
          twice this century, in 2003 and 2019. The museum is operated by the Government of Alberta.
        </p>
        <p>
          What sets it apart is that the fossils on display come largely from the ground around it. Walk the
          galleries and you are, in a sense, still in the valley. The skeletons were dug from formations like
          the ones you drove past to get there. Beyond the galleries, the museum runs programs and seasonal
          events and it points visitors to off-site experiences such as the hoodoos. Check its website for
          hours, which change between summer and the rest of the year.
        </p>
      </Section>

      <Divider />

      <Section label="Midland" title="Midland Provincial Park & the Red Deer River">
        <p>
          The museum's setting is itself a piece of the story. Midland Provincial Park was once the site of the
          Midland Coal Mine. It was designated a provincial park on 5 June 1979, and today the fossil beds and an
          old mine site share the ground with the museum. Trails lead through willows and cottonwoods along the
          Red Deer River, and the river invites canoeing, kayaking, fishing and wildlife watching.
        </p>
        <p>
          The river is the thread through all of it. It carved the valley and exposed the bones and the coal. It
          set the line of every road, bridge and hamlet along its banks. Follow it in any direction and the
          badlands go with you.
        </p>
      </Section>

      <Plate src="/images/exp-canyon.jpg" />

      <Section label="In town" title="Tyra, and the amphitheatre in the hills">
        <p>
          Downtown, it is hard to miss Tyra, the World's Largest Dinosaur. The Drumheller and District Chamber of
          Commerce voted to build her in June 1999. The sod was turned on 2 October 1999, and she opened on 13
          October 2000. She stands 86 feet (about 25 metres) tall. Visitors climb 106 stairs inside to look out
          over the valley from her open jaw. A visitor information centre sits at her feet.
        </p>
        <p>
          Out in the hills is a natural bowl: the Badlands Amphitheatre, widely described as
          Canada's largest outdoor stage. It is a non-profit arts, culture and tourism venue. Its grounds span
          some 400 acres, and the original open-air amphitheatre seats 2,500. Each summer it stages the Badlands
          Passion Play, performed across more than six acres of hillside. The venue also hosts concerts, smaller
          theatre and seasonal events.
        </p>
      </Section>

      <Divider />

      <Section label="Coda" title="Why the valley stays with you">
        <p>
          Drumheller is a small town with a very large past. In a single day you can stand in the valley where Tyrrell found
          his skull and walk under a wooden coal tipple. You can cross a swaying miners' bridge, drink in a saloon
          the coal company built, and watch the sun turn the canyon walls from grey to gold. Few places show
          their history so plainly. Here, the story isn't behind glass; it's in the ground under your boots.
        </p>
      </Section>

      {/* Closing tie-in */}
      <section className="bg-ember px-6 py-24 text-coal">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-[0.72rem] tracking-[0.28em] uppercase">Unearth Self in the valley</p>
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.9] uppercase">Come and see it</h2>
            <p className="mt-5 max-w-[46ch] text-lg">Rest at Haven, or join a Bootcamp in the badlands.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-4">
            <Link
              to="/haven"
              className="inline-flex rounded-[2px] bg-coal px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] text-fossil uppercase"
            >
              Haven
            </Link>
            <Link
              to="/bootcamp"
              className="inline-flex rounded-[2px] border border-coal px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] uppercase"
            >
              Bootcamp
            </Link>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Sources</p>
          <ul className="flex flex-col gap-2 text-lg text-fossil/70">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-ember hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
