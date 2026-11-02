export type Package = { slug: string; title: string; line: string; image: string; alt: string };

export const PACKAGES: Package[] = [
  {
    slug: "womens-wellness",
    title: "Women's Wellness Retreat",
    line: "A women-only few days on the badlands to slow down, move, rest well, and come home steadier than you arrived.",
    image: "/images/packages/womens-wellness.jpg",
    alt: "Women stretching at golden hour on a grassy rise below banded badlands hills",
  },
  {
    slug: "hunting",
    title: "Hunting Retreat",
    line: "A few days in the Drumheller badlands trying different kinds of hunting alongside local outfitters who know this country.",
    image: "/images/packages/hunting.jpg",
    alt: "Four people in blaze-orange vests walking through tall prairie grass into a badlands coulee",
  },
  {
    slug: "photography",
    title: "Photography Retreat",
    line: "Chasing first and last light through Horseshoe Canyon and the hoodoos, with time to slow down and actually see the land.",
    image: "/images/packages/photography.jpg",
    alt: "A photographer at a tripod overlooking sunlit badlands ridges",
  },
  {
    slug: "night-sky",
    title: "Night Sky Immersion",
    line: "Dark badlands skies, long nights outside, and the stars the way most of us never get to see them.",
    image: "/images/packages/night-sky.jpg",
    alt: "A person sitting beneath the Milky Way among rock spires at night",
  },
  {
    slug: "fossils-geology",
    title: "Fossils and Geology",
    line: "Reading seventy million years of rock where Albertosaurus was first found, and learning how the valley got its shape.",
    image: "/images/packages/fossils-geology.jpg",
    alt: "Hands brushing dust from layered sandstone beside a hand lens",
  },
  {
    slug: "writing",
    title: "Writing Retreat",
    line: "Prompts, a steady daily rhythm, and protected time on the land to get the work done.",
    image: "/images/packages/writing.jpg",
    alt: "A person writing in a notebook on a ledge above a badlands coulee",
  },
];

export const getPackage = (slug: string) => PACKAGES.find((p) => p.slug === slug);
