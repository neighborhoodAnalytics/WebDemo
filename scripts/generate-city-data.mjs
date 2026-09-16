import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "lib", "cities", "vancouver.json");
const BOUNDARY_API =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/local-area-boundary/records?limit=22&select=name,geo_point_2d,geom";

const parksData = JSON.parse(
  readFileSync(join(__dirname, "..", "lib", "parks-data.json"), "utf8")
);

const DEFAULT_SCORES = {
  affordability: 6,
  transit: 7,
  security: 8,
  nightlife: 5,
  schools: 7,
  walkability: 7,
};

const DEFAULT_RENT = { rentMin: 2200, rentMax: 2900 };

const CURATED = {
  downtown: { tagline: "Urban core with waterfront parks and skyline views.", rentMin: 2300, rentMax: 3400, tradeoff: "High density means noise and premium rents in newer buildings.", scores: { affordability: 5, transit: 10, security: 7, nightlife: 10, schools: 5, walkability: 10 } },
  "west-end": { tagline: "Leafy streets steps from English Bay.", rentMin: 2100, rentMax: 2900, tradeoff: "Older buildings with limited amenities, and parking is scarce.", scores: { affordability: 6, transit: 9, security: 8, nightlife: 7, schools: 6, walkability: 10 } },
  kitsilano: { tagline: "Beachside calm with an active, walkable rhythm.", rentMin: 2800, rentMax: 3600, tradeoff: "Higher rents and a longer transit trip to eastern destinations.", scores: { affordability: 4, transit: 7, security: 9, nightlife: 6, schools: 9, walkability: 8 } },
  fairview: { tagline: "False Creek frontage with Vanier Park at your doorstep.", rentMin: 2400, rentMax: 3200, tradeoff: "Main street corridors can be busy; some blocks lack character.", scores: { affordability: 5, transit: 8, security: 8, nightlife: 5, schools: 7, walkability: 9 } },
  "mount-pleasant": { tagline: "Creative energy with everyday convenience.", rentMin: 2450, rentMax: 3100, tradeoff: "Popular blocks can feel busy, and newer rentals command a premium.", scores: { affordability: 6, transit: 9, security: 8, nightlife: 8, schools: 8, walkability: 9 } },
  "riley-park": { tagline: "Queen Elizabeth Park's backyard with mountain views.", rentMin: 2300, rentMax: 3000, tradeoff: "Hillier terrain and fewer nightlife options on main strips.", scores: { affordability: 6, transit: 7, security: 8, nightlife: 4, schools: 8, walkability: 7 } },
  "grandview-woodland": { tagline: "Community character, culture and strong connections.", rentMin: 2200, rentMax: 2850, tradeoff: "Nightlife and major corridors can add noise on some blocks.", scores: { affordability: 8, transit: 9, security: 7, nightlife: 8, schools: 7, walkability: 9 } },
  "kensington-cedar-cottage": { tagline: "Trout Lake access with a multicultural food scene.", rentMin: 2100, rentMax: 2700, tradeoff: "Some areas feel quieter at night with fewer transit options.", scores: { affordability: 8, transit: 8, security: 7, nightlife: 5, schools: 7, walkability: 8 } },
  strathcona: { tagline: "Heritage character near the heart of the city.", rentMin: 2000, rentMax: 2600, tradeoff: "Industrial edges and variable block-by-block character.", scores: { affordability: 8, transit: 8, security: 6, nightlife: 5, schools: 6, walkability: 8 } },
  "dunbar-southlands": { tagline: "Quiet residential streets with large parklands.", rentMin: 2600, rentMax: 3500, tradeoff: "Fewer transit routes and limited commercial activity nearby.", scores: { affordability: 4, transit: 5, security: 9, nightlife: 2, schools: 9, walkability: 6 } },
  kerrisdale: { tagline: "Village charm with tree-lined avenues.", rentMin: 2500, rentMax: 3300, tradeoff: "Quieter nights and premium prices for detached homes.", scores: { affordability: 5, transit: 7, security: 9, nightlife: 3, schools: 9, walkability: 7 } },
  killarney: { tagline: "Suburban calm with massive parkland access.", rentMin: 2200, rentMax: 2900, tradeoff: "Further from downtown with limited rapid transit.", scores: { affordability: 7, transit: 6, security: 8, nightlife: 3, schools: 8, walkability: 6 } },
  sunset: { tagline: "Diverse community with wide green corridors.", rentMin: 2000, rentMax: 2600, tradeoff: "Fewer destination restaurants and nightlife venues.", scores: { affordability: 8, transit: 7, security: 7, nightlife: 3, schools: 7, walkability: 7 } },
  marpole: { tagline: "Riverside living with a small-town feel.", rentMin: 2100, rentMax: 2700, tradeoff: "Limited nightlife and a quieter commercial strip.", scores: { affordability: 7, transit: 7, security: 8, nightlife: 3, schools: 7, walkability: 7 } },
  "victoria-fraserview": { tagline: "Hillside views with riverside park access.", rentMin: 2100, rentMax: 2700, tradeoff: "Steeper streets and fewer quick transit connections.", scores: { affordability: 7, transit: 6, security: 8, nightlife: 3, schools: 7, walkability: 6 } },
  "arbutus-ridge": { tagline: "Quiet west-side living with valley parkland.", rentMin: 2500, rentMax: 3400, tradeoff: "Limited commercial activity and fewer transit frequencies.", scores: { affordability: 5, transit: 6, security: 9, nightlife: 2, schools: 9, walkability: 6 } },
  "hastings-sunrise": { tagline: "Sunny east-side slopes with big skyline views.", rentMin: 2000, rentMax: 2600, tradeoff: "Limited rapid transit and daytime main-street traffic.", scores: { affordability: 8, transit: 7, security: 7, nightlife: 5, schools: 7, walkability: 7 } },
  oakridge: { tagline: "Central hub with a growing transit-oriented core.", rentMin: 2400, rentMax: 3200, tradeoff: "Major redevelopment underway; some blocks are still transitional.", scores: { affordability: 6, transit: 9, security: 8, nightlife: 4, schools: 8, walkability: 7 } },
  "renfrew-collingwood": { tagline: "Lively high streets and quiet residential lanes.", rentMin: 2100, rentMax: 2700, tradeoff: "Fewer destination parks and limited nightlife.", scores: { affordability: 8, transit: 8, security: 7, nightlife: 4, schools: 7, walkability: 7 } },
  shaughnessy: { tagline: "Grand heritage homes on tree-canopied streets.", rentMin: 3200, rentMax: 4500, tradeoff: "Among the city's highest rents and few shops within walking distance.", scores: { affordability: 2, transit: 6, security: 10, nightlife: 2, schools: 9, walkability: 5 } },
  "south-cambie": { tagline: "Compact apartments near Oakridge and Queen Elizabeth Park.", rentMin: 2200, rentMax: 2900, tradeoff: "Limited local shopping and a quieter social scene.", scores: { affordability: 6, transit: 8, security: 8, nightlife: 3, schools: 8, walkability: 7 } },
  "west-point-grey": { tagline: "Beachfront calm with a strong academic community.", rentMin: 2800, rentMax: 3700, tradeoff: "Fewer transit options and premium west-side rents.", scores: { affordability: 4, transit: 6, security: 9, nightlife: 2, schools: 9, walkability: 6 } },
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchBoundaries() {
  const res = await fetch(BOUNDARY_API);
  if (!res.ok) throw new Error(`Failed to fetch boundaries: ${res.status}`);
  const data = await res.json();
  return data.results.map((r) => ({
    name: r.name,
    latitude: r.geo_point_2d?.lat,
    longitude: r.geo_point_2d?.lon,
    boundary: r.geom?.geometry ?? null,
  }));
}

async function buildCity() {
  console.log("Fetching official local-area boundaries...");
  const boundaries = await fetchBoundaries();
  console.log(`  Got ${boundaries.length} official local areas`);

  const city = {
    id: "vancouver",
    name: "Vancouver, BC",
    country: "Canada",
    currency: "CAD",
    centre: [49.265, -123.112],
    source: "City of Vancouver Open Data - local-area-boundary",
    neighbourhoods: [],
  };

  for (const b of boundaries) {
    const id = slugify(b.name);
    const curated = CURATED[id] ?? {};
    const greenSpace = parksData[b.name]?.score ?? 5;
    city.neighbourhoods.push({
      id,
      name: b.name,
      tagline: curated.tagline ?? undefined,
      coordinates: [b.latitude, b.longitude],
      boundary: b.boundary,
      nearbyParks: parksData[b.name]?.parks ?? [],
      accessibleParks: parksData[b.name]?.accessibleParks ?? [],
      destinationParks: parksData[b.name]?.destinationParks ?? [],
      rentMin: curated.rentMin ?? DEFAULT_RENT.rentMin,
      rentMax: curated.rentMax ?? DEFAULT_RENT.rentMax,
      tradeoff: curated.tradeoff ?? undefined,
      scores: {
        affordability: curated.scores?.affordability ?? DEFAULT_SCORES.affordability,
        transit: curated.scores?.transit ?? DEFAULT_SCORES.transit,
        security: curated.scores?.security ?? DEFAULT_SCORES.security,
        greenSpace,
        nightlife: curated.scores?.nightlife ?? DEFAULT_SCORES.nightlife,
        schools: curated.scores?.schools ?? DEFAULT_SCORES.schools,
        walkability: curated.scores?.walkability ?? DEFAULT_SCORES.walkability,
      },
    });
  }

  writeFileSync(OUTPUT, JSON.stringify(city, null, 2));
  console.log(`Wrote ${OUTPUT} with ${city.neighbourhoods.length} official local areas`);
}

buildCity().catch((err) => {
  console.error(err);
  process.exit(1);
});