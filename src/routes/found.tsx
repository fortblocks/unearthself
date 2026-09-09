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
    line: "Found in the hoodoo’s shadow, by the one who laughed first. The valley is larger than the plan. Climb anyway.",
  },
  {
    slug: "adaptability",
    name: "Adaptability",
    line: "Found where the trail lied. What was simple from the rim is a different animal underfoot. The stone was not there at dawn.",
  },
  {
    slug: "connection",
    name: "Connection",
    line: "Found in the ring of the fire, still warm. A place already set. The companion who has been walking beside you without speaking.",
  },
  {
    slug: "experience",
    name: "Experience",
    line: "Found under the hand, in the striped rock. Once you have touched it you cannot unread the valley. You carry it out.",
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
          There are walkers in this valley. They are not from here, not at
          first. Something in them would not sit still, so the land took them
          in. The town at the canyon’s mouth calls them visitors. The old ones
          in the rock have another word. Badlanders.
        </p>
        <p>
          A Badlander does not arrive with a map that works. They arrive with a
          restlessness they cannot name, and a willingness to be made smaller
          by the hoodoos. The marks they find along the way are not issued.
          They are unearthed — in a shadow, in a lie the trail tells, in the
          warmth of a fire someone else has already lit.
        </p>

        <h2>The valley keeps a slower clock.</h2>
        <p>
          Hoodoos stacked like unfinished sentences. Coulees cut as if a giant
          had practised handwriting and left the drafts. A river that has been
          arguing with the same rock since an inland sea still breathed here.
          The Albertosaurus walked this cut when the days were longer. The
          bones remember. So does the dust.
        </p>
        <p>
          If you have the eyes, the old tenants are not gone. They drink at the
          water. They take the switchback with you because the trail is narrow
          and courtesy is older than speech. They are not monsters. They are
          the valley, moving.
        </p>
      </article>

      <Plate
        src="/images/found/rim.jpg"
        alt="A traveller at the rim of a coulee, a dinosaur walking the riverbed below"
        caption="Look down. The first step is a kind of falling, chosen."
        tall
      />

      <article className="found-story">
        <h2>At the rim, someone laughs.</h2>
        <p>
          It is always the rim that starts it. A Badlander stands in the wind
          with the whole cut below them and feels, for a moment, ridiculous —
          the pack, the plan, the self they brought from the city, all of it
          the size of a pebble. Some turn back. The ones who stay make a sound
          that surprises them. Not a strategy. A laugh.
        </p>
        <p>
          In the hoodoo’s shadow they find a mark cut so simply it could be a
          child’s. The valley’s first joke is scale. Permission to be unexpert.
          Climb because the stone is there. They pocket it without knowing they
          have begun.
        </p>
      </article>

      <Plate
        src="/images/found/river.jpg"
        alt="Travellers watching a herd of hadrosaurs at a Badlands river"
        caption="The river still cuts the same argument. You may join it."
      />

      <article className="found-story">
        <h2>The water does not hurry.</h2>
        <p>
          By the second day the river has them. Edmontosaurus at the mud,
          unbothered. Two walkers on the near bank, smaller than they meant to
          be. The old herd does not startle. Neither, after a while, do the
          Badlanders. There is a long courtesy in standing still together.
        </p>
        <p>
          You are late to a very long story. That is the honour, not the
          problem. The dinosaurs did not come here to become a lesson. They
          came because the river was here. So did the walkers. So did you.
        </p>
      </article>

      <Plate
        src="/images/found/trail.jpg"
        alt="Two travellers walking a canyon trail beside a pachyrhinosaurus"
        caption="The trail will lie. Walk it anyway."
      />

      <article className="found-story">
        <h2>The trail lies, and that is the gift.</h2>
        <p>
          What looked simple from the rim is a different animal underfoot.
          Switchbacks that vanish. Weather that was not in the morning sky. A
          pachyrhinosaurus on the path, matching pace because there is only
          room for courtesy. The Badlander who does not change, breaks. The
          one who does, finds a second mark in a stone that was not there at
          dawn.
        </p>
        <p>
          They do not set out with a list. The valley offers the marks in the
          order it chooses. Most who stay long enough find four. The stone
          never came labelled. The names came later, given by those who made it
          out and could not stop turning the shapes in their hands.
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
        caption="A place already set. Deep time sits down with you."
      />

      <article className="found-story">
        <h2>Night in the coulee.</h2>
        <p>
          Someone has lit a fire on pale stone. Three sit. Nearby, a hill of
          armour is breathing — an ankylosaur, or a ridge that learned how.
          Sparks go up. The Milky Way does the rest. In the ring of the fire
          the third mark is still warm. A place already set. The companion you
          have been walking beside without speaking to, which may be another
          person, or the old one, or the self you came here to meet.
        </p>
        <p>
          This is the unearthing. Not a souvenir. Not a photograph of the
          canyon. Taking off what you put on to survive the far-away rooms, and
          sitting down with what is left. The valley will not do the becoming
          for you. It will only refuse to lie.
        </p>
      </article>

      <Plate
        src="/images/found/fossil.jpg"
        alt="A hand resting on a fossil in striped Badlands rock"
        caption="Once you have touched it, you cannot unread the valley."
      />

      <article className="found-story found-end">
        <h2>The last mark is a hand on the bone.</h2>
        <p>
          Striped rock. Warm sidelight. A Badlander kneels without meaning to.
          Under the palm, the fourth mark — the one you carry out under the
          skin. Experience is a poor word for it. It is more like this: you
          cannot unread the valley. You go back to the far-away rooms changed,
          and the mark goes with you, and some nights you can still smell the
          dust.
        </p>
        <p>
          If you are still reading, you already know the first rule. Stay
          curious. The second is older. Walk. The marks keep moving. They
          always have. Yours was not luck. It was attention.
        </p>
        <p className="found-sign">— a Badlander, still walking</p>
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
