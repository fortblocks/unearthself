export type Sight = {
  slug: string;
  name: string;
  area: string;
  line: string;
  paragraphs: string[];
  website: string;
  websiteLabel: string;
  image?: string;
  imageAlt?: string;
};

export const SIGHTS: Sight[] = [
  {
    slug: "royal-tyrrell-museum",
    name: "Royal Tyrrell Museum",
    area: "Midland Provincial Park",
    line: "Canada's museum of ancient life, northwest of Drumheller.",
    paragraphs: [
      "The Royal Tyrrell Museum of Palaeontology sits in Midland Provincial Park, northwest of Drumheller. It is Canada's only museum dedicated entirely to the study of ancient life, and the Government of Alberta runs it.",
      "The galleries hold one of the world's largest displays of dinosaurs, and a wider look at ancient life around them. The museum also offers programs that take that story further than the cases.",
      "Hours, admission and what is on are on the museum's own site.",
    ],
    website: "https://www.tyrrellmuseum.com/",
    websiteLabel: "Royal Tyrrell Museum",
  },
  {
    slug: "worlds-largest-dinosaur",
    name: "World's Largest Dinosaur",
    area: "Drumheller",
    line: "Tyra, the dinosaur you can climb, in town.",
    paragraphs: [
      "The World's Largest Dinosaur stands in Drumheller. The people who keep her call her Tyra. Inside, 106 stairs climb to a viewing place in her mouth, looking out over the valley.",
      "At the base there is a gift shop, and the visitor information centre for the Drumheller valley.",
      "Whether the climb is open, and what it costs, is on the dinosaur's own site.",
    ],
    website: "https://worldslargestdinosaur.com/",
    websiteLabel: "World's Largest Dinosaur",
  },
  {
    slug: "homestead-antique-museum",
    name: "Homestead Antique Museum",
    area: "Drumheller",
    line: "A museum of pioneer tools and household things, on the North Dinosaur Trail.",
    paragraphs: [
      "The Homestead Antique Museum is in Drumheller, on the North Dinosaur Trail. In November 1962 a local group incorporated as the Big Country Antique Museum, to collect and show the tools and household things of earlier prairie life. The museum opened on 28 May 1965.",
      "The rooms hold homestead implements, vintage cars, tractors and trucks, clothing and handwork, a medical display, and wartime memorabilia.",
      "The season and admission are on the museum's own site.",
    ],
    website: "https://www.homesteadantiquemuseum.com/",
    websiteLabel: "Homestead Antique Museum",
  },
  {
    slug: "little-church",
    name: "The Little Church",
    area: "Drumheller",
    line: "A very small church on the North Dinosaur Trail, kept by the chamber of commerce.",
    paragraphs: [
      "The Little Church stands on the North Dinosaur Trail in Drumheller, between the Royal Tyrrell Museum and Dinosaur Trail Golf and Country Club. The Drumheller and District Chamber of Commerce owns it and looks after it.",
      "Local contractor Trygve Seland put it up in 1958, with the Ministerial Association. It was reconstructed in 1991 by inmates of the Drumheller Institution. The chamber describes it as a place for worship and quiet, as well as a stop for people passing through.",
      "A ceremony is booked through the chamber.",
    ],
    website: "https://www.drumhellerchamber.com/your-chamber/what-we-do",
    websiteLabel: "Drumheller and District Chamber of Commerce",
  },
  {
    slug: "dinosaur-trail-golf",
    name: "Dinosaur Trail Golf & Country Club",
    area: "Drumheller",
    line: "Eighteen holes on the North Dinosaur Trail, from the river up onto the hoodoos.",
    paragraphs: [
      "Dinosaur Trail Golf and Country Club is an eighteen-hole course in Drumheller, on the North Dinosaur Trail. The club dates the course to 1965, and the back nine to 1996.",
      "The front nine runs beside the Red Deer River, among trees. The back nine is laid out up on the hoodoos, with long views over the valley.",
      "Tee times and the day's conditions are on the club's own site.",
    ],
    website: "https://dinosaurtrailgolf.com/",
    websiteLabel: "Dinosaur Trail Golf and Country Club",
  },
  {
    slug: "horsethief-canyon",
    name: "Horsethief Canyon",
    area: "Dinosaur Trail",
    line: "A viewpoint north of town. The canyon floor is private, and not a hike.",
    paragraphs: [
      "Horsethief Canyon is a viewpoint on the Dinosaur Trail, north of Drumheller. Travel Drumheller is plain about the visit: there is a place to look, and walking down into the canyon is not permitted, because that ground is private.",
      "It is a stop for the view across the valley, not a trail to follow down.",
      "The current note is on the Travel Drumheller questions page.",
    ],
    website: "https://traveldrumheller.com/plan-your-trip/faq/",
    websiteLabel: "Travel Drumheller",
  },
  {
    slug: "bleriot-ferry",
    name: "Bleriot Ferry",
    area: "Red Deer River",
    line: "Alberta's cable ferry on Highway 838, the river crossing of the Dinosaur Trail.",
    paragraphs: [
      "The Bleriot Ferry is a cable ferry on Highway 838, crossing the Red Deer River. The Province of Alberta runs it as part of the highway network, and it is the river crossing on the Dinosaur Trail.",
      "It is a short ride from one bank to the other, and it does not run all year.",
      "The season and the day's status are on the Alberta ferry page.",
    ],
    website: "https://www.alberta.ca/alberta-ferry-schedules",
    websiteLabel: "Alberta ferry schedules",
  },
  {
    slug: "horseshoe-canyon",
    name: "Horseshoe Canyon",
    area: "Kneehill County",
    line: "A canyon and its trails along Highway 9.",
    paragraphs: [
      "Horseshoe Canyon is in Kneehill County, along the Highway 9 corridor. From the rim you look down into the coulees, and there are hiking trails if you want to go further in.",
      "Travel Drumheller lists it for the trails, the views, and a place to stop.",
      "How to find the trailhead is on that listing.",
    ],
    website: "https://traveldrumheller.com/activities/horseshoe-canyon/",
    websiteLabel: "Travel Drumheller",
    image: "/images/work/horseshoe.jpg",
    imageAlt: "A small group walking the floor of Horseshoe Canyon",
  },
  {
    slug: "hoodoos",
    name: "Willow Creek Hoodoos",
    area: "Highway 10, toward East Coulee",
    line: "The capped pillars east of town, on the way to East Coulee.",
    paragraphs: [
      "The Willow Creek hoodoos stand east of Drumheller on Highway 10, on the way toward East Coulee. The Royal Tyrrell Museum describes them as among Alberta's best-known geological formations.",
      "They are a Provincial Historic Resource. The museum asks visitors to stay on the paths, read the signs, and leave the rock as they found it.",
      "The museum's own note is the place to read the current guidance.",
    ],
    website: "https://www.tyrrellmuseum.com/whats_on/off_site_Experiences/hoodoos",
    websiteLabel: "Royal Tyrrell Museum",
    image: "/images/exp-hoodoos.jpg",
    imageAlt: "Hoodoos in the Drumheller valley",
  },
  {
    slug: "star-mine-suspension-bridge",
    name: "Star Mine Suspension Bridge",
    area: "Rosedale",
    line: "The old miners' bridge across the river at Rosedale.",
    paragraphs: [
      "The Star Mine Suspension Bridge crosses the river at Rosedale. Travel Drumheller also calls it the Rosedale Suspension Bridge. Miners once used it to get to work.",
      "Today it is a public walk, used by people fishing and by anyone crossing to the badlands on the far side.",
      "The listing, including whether it is open, is on the Travel Drumheller page.",
    ],
    website: "https://traveldrumheller.com/activities/suspension-bridge-3/",
    websiteLabel: "Travel Drumheller",
  },
  {
    slug: "bridges-to-wayne",
    name: "Eleven Bridges to Wayne",
    area: "Rosedale to Wayne",
    line: "Eleven one-lane bridges on the road from Rosedale out to Wayne.",
    paragraphs: [
      "The road from Rosedale to Wayne crosses eleven one-lane bridges. They carry traffic over the Rosebud River, and over the railway that once moved coal out of these towns.",
      "Wayne is at the end of that drive. The Last Chance Saloon sits along the same road.",
      "Travel Drumheller keeps the note on the bridges.",
    ],
    website: "https://traveldrumheller.com/activities/11-bridges-to-wayne/",
    websiteLabel: "Travel Drumheller",
  },
  {
    slug: "last-chance-saloon",
    name: "Last Chance Saloon",
    area: "Wayne",
    line: "The saloon in Wayne, opened in the coal years beside the Rosedeer Hotel.",
    paragraphs: [
      "The Last Chance Saloon is in Wayne. The Rosedeer Hotel was built in 1913, in the coal years, by the Rosedeer Coal Mining Company. As the town grew, the company opened the saloon for the people who worked the mines.",
      "It is still a saloon, with rooms in the hotel. The drive out from Rosedale is the one that crosses the eleven bridges.",
      "The menu, the music and the hours are on the saloon's own site.",
    ],
    website: "https://visitlastchancesaloon.com/",
    websiteLabel: "Last Chance Saloon",
  },
  {
    slug: "east-coulee-school-museum",
    name: "East Coulee School Museum",
    area: "East Coulee",
    line: "The old school in East Coulee, open again as a museum of the coal town.",
    paragraphs: [
      "The East Coulee School Museum is in the hamlet of East Coulee. The school opened in October 1930, with four classrooms, and four more were added in 1934, for a town that had grown up around the coal mines.",
      "When the mines closed, the town thinned and the school closed with it. In 1985 the building opened again as a museum, keeping the story of the people who built East Coulee.",
      "What is open, and when, is on the museum's own site.",
    ],
    website: "https://ecsmuseum.ca/",
    websiteLabel: "East Coulee School Museum",
  },
  {
    slug: "atlas-coal-mine",
    name: "Atlas Coal Mine",
    area: "East Coulee",
    line: "The last of the valley's coal mines, kept as a national historic site.",
    paragraphs: [
      "The Atlas Coal Mine National Historic Site is in East Coulee. The Atlas Coal Mine Historical Society runs it, and describes it as the last of the Drumheller Valley's 139 coal mines.",
      "The Atlas No. 3 and No. 4 mines were active from 1936 to 1984, and the site reopened for visitors in 1987. What remains includes the underground and surface works, and the last wooden coal tipple in Canada.",
      "Tours and admission are booked on the mine's own site.",
    ],
    website: "https://atlascoalmine.ab.ca/",
    websiteLabel: "Atlas Coal Mine",
  },
  {
    slug: "badlands-amphitheatre",
    name: "Badlands Amphitheatre",
    area: "Drumheller",
    line: "The outdoor theatre in Drumheller, home of the Badlands Passion Play.",
    paragraphs: [
      "The Badlands Amphitheatre is an outdoor theatre in Drumheller. Its best-known production is the Badlands Passion Play, performed on the outdoor stage.",
      "The same place also holds other arts and music through the year. What is on changes with the season, and the amphitheatre publishes that itself.",
      "Tickets and the calendar are on the amphitheatre's own site.",
    ],
    website: "https://badlandsamp.com/",
    websiteLabel: "Badlands Amphitheatre",
  },
];

export function sightBySlug(slug: string) {
  return SIGHTS.find((sight) => sight.slug === slug);
}
