import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/found")({
  component: FoundPage,
  head: () => ({
    meta: [
      { title: "A door" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "If you found yourself here, you did not arrive by accident.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,650;1,9..144,500;1,9..144,650&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap",
      },
    ],
  }),
});

const marks = [
  {
    slug: "play",
    name: "Play",
    line: "The valley’s first joke is scale. Permission to be unexpert. Climb because the hoodoo is there.",
  },
  {
    slug: "adaptability",
    name: "Adaptability",
    line: "What looked simple from the rim is a different animal underfoot. Weather, hill, the self that will not stay still.",
  },
  {
    slug: "connection",
    name: "Connection",
    line: "The fire. The other bodies. The companion you have been walking beside without speaking to.",
  },
  {
    slug: "experience",
    name: "Experience",
    line: "What you cannot unread. The fossil under the hand. The name of the house: unearth.",
  },
];

function FoundPage() {
  return (
    <main className="found-page">
      <a href="#story" className="sr-only">
        Skip to the story
      </a>

      <p className="found-home">
        <Link to="/">The house</Link>
      </p>

      <section className="found-hero">
        <img src="/images/found/walk.jpg" alt="" />
        <div className="found-hero-veil" />
        <div className="found-hero-copy">
          <p className="found-kicker">A door · the Badlands</p>
          <h1>Welcome, curious soul.</h1>
          <p className="found-lede">
            If you found yourself here you did not discover it by accident.
          </p>
        </div>
      </section>

      <article id="story" className="found-story">
        <p className="found-drop">
          The marks travel the bottom of every page. Most eyes slide past. Yours
          did not. That is the first evidence. Not luck. Attention.
        </p>
        <p>
          Your journey of unearthing self starts here. In the land of dinosaurs.
          Seventy million years of river and bone, then a town, then a house,
          then a path with four names. You are not the first to come looking for
          something you cannot quite say. You are not the last.
        </p>

        <h2>Deep time keeps a valley.</h2>
        <p>
          Drumheller is small. The landscape is not. Hoodoos stacked like
          unfinished sentences. Coulees cut as if a giant had practised
          handwriting and left the drafts. The Red Deer River still argues with
          the same rock the Albertosaurus walked when an inland sea still
          breathed here. The bones are not a theme. They are the fact of the
          place.
        </p>
      </article>

      <Plate
        src="/images/found/rim.jpg"
        alt="A traveller at the rim of a coulee, a dinosaur walking the riverbed below"
        caption="Look down. The first step is a kind of falling, chosen."
        tall
      />

      <article className="found-story">
        <h2>Not a backdrop. A partner.</h2>
        <p>
          Unearth Self is a practice that needed a landscape that would not
          flatter you. Banff will hold your photograph. This canyon will hold
          your nerve. We did not bring a method and hunt for scenery. We came
          because the land was already doing the work — stripping, revealing,
          asking what remains when the performance is tired.
        </p>
        <p>
          Four partners. No chief. A house for heat and cold. Four suites for
          sleep. An expedition for the ones who want the land to have them for a
          few days and send them back altered. Year one is this town and this
          cut in the earth. The long game is a language people keep using after
          they leave.
        </p>
      </article>

      <Plate
        src="/images/found/river.jpg"
        alt="Travellers watching a herd of hadrosaurs at a Badlands river"
        caption="The river still cuts the same argument. You may join it."
      />

      <article className="found-story">
        <h2>They walked here first.</h2>
        <p>
          Imagine, for a moment, that the valley remembers its old tenants not
          as monsters but as neighbours of a slower clock. Edmontosaurus at the
          water. Ankylosaur like a hill that learned to breathe. Albertosaurus
          on the switchback, matching your pace because the trail is narrow and
          courtesy is older than us.
        </p>
        <p>
          This is not a children’s book and it is not a theme park. It is a way
          of saying: you are late to a very long story, and that is the honour.
          The dinosaurs did not come here to become metaphors. They came because
          the river was here. So did we. So did you.
        </p>
      </article>

      <Plate
        src="/images/found/trail.jpg"
        alt="Two travellers walking a canyon trail beside a pachyrhinosaurus"
        caption="Play is how the valley first meets you. Keep walking."
      />

      <article className="found-story">
        <h2>Four marks. One sequence.</h2>
        <p>
          The runes you followed are PACE. Play. Adaptability. Connection.
          Experience. They are not slogans hung on a wall for the photograph.
          They are four ways of moving through the Badlands — practised on the
          land, then carried when the boots come off.
        </p>
      </article>

      <section className="found-pace">
        {marks.map((m) => (
          <article key={m.slug} className="found-pace-item">
            <img src={`/runes/${m.slug}.svg`} alt="" />
            <h3>{m.name}</h3>
            <p>{m.line}</p>
          </article>
        ))}
      </section>

      <Plate
        src="/images/found/camp.jpg"
        alt="A night camp in a coulee, humans by a fire, a great ankylosaur resting nearby"
        caption="Connection keeps a fire. Deep time sits down with you."
      />

      <article className="found-story">
        <h2>Unearth is a verb.</h2>
        <p>
          Take off what you put on to survive the city. Meet what is left — on
          this land, with these people, in this weather. The work has a language
          (Echo, the Human Adaptation Model, Super Self-Awareness practised
          rather than posted). The expedition has dates. The house has a door
          that is not hidden. This page is none of those. This page is the
          start of an adventure you already began when you stopped on a moving
          mark.
        </p>
      </article>

      <Plate
        src="/images/found/fossil.jpg"
        alt="A hand resting on a fossil in striped Badlands rock"
        caption="Experience is the fossil under the hand. You cannot unread it."
      />

      <article className="found-story found-end">
        <h2>If you are still reading.</h2>
        <p>
          Stay curious. That is the first rule, and you have already kept it.
          The second is older: walk. The valley will not do the becoming for
          you. It will only refuse to lie.
        </p>
        <p className="found-sign">— the house, Drumheller</p>
        <nav className="found-doors" aria-label="Ways onward">
          <Link to="/the-work">The work</Link>
          <Link to="/bootcamp">The expedition</Link>
          <Link to="/">Back to the house</Link>
        </nav>
        <p className="found-aside">The marks keep moving. You know where they live.</p>
      </article>
    </main>
  );
}

function Plate({
  src,
  alt,
  caption,
  tall,
}: {
  src: string;
  alt: string;
  caption: string;
  tall?: boolean;
}) {
  return (
    <figure className={tall ? "found-plate found-plate-tall" : "found-plate"}>
      <img src={src} alt={alt} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
