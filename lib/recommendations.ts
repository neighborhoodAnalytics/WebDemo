import vancouver from "./cities/vancouver.json";

export type Priority = "affordability" | "transit" | "security" | "greenSpace" | "nightlife" | "schools" | "walkability";
export type CategoryScore = Record<Priority, number>;
export interface DestinationPoint { lat: number; lon: number; label?: string; }
export interface CommuteDestination extends DestinationPoint { query: string; resolvedName: string; source: "curated" | "geocoder" | "user_selected"; confidence: "exact" | "likely" | "uncertain"; }
export interface UserProfile { firstName: string; currentCity: string; destination: string; reason: string; housingType: string; budget: string; commuteDestination: string; commuteDestinationCoords: CommuteDestination | null; priorities: Priority[]; }
export interface NearbyPark { name: string; area_hectare: number; classification: string; distanceKm: number; coordinates: [number, number]; facilities: "Y" | "N"; washrooms: "Y" | "N"; specialfeatures: "Y" | "N"; }
export interface TransitStop { name: string; stopId: string; locationType: string; coordinates: [number, number]; routes: string[]; }
export interface TransitAccess { stopCount: number; stationCount: number; routeCount: number; stops: TransitStop[]; }
export interface Neighborhood { id: string; name: string; tagline: string; coordinates: [number, number]; boundary?: GeoJsonPolygon | null; nearbyParks?: NearbyPark[]; accessibleParks?: NearbyPark[]; destinationParks?: NearbyPark[]; transitAccess?: TransitAccess; rentMin: number; rentMax: number; scores: CategoryScore; tradeoff: string; }
export interface GeoJsonPolygon { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][]; }
export interface FactorEvidence { factor: Priority; label: string; score: number; source: string; confidence: "official" | "estimated" | "fallback"; detail: string; }
export interface Recommendation { neighborhood: Neighborhood; match: number; budgetFit: number; categoryScores: CategoryScore; factorEvidence: FactorEvidence[]; overlapScore: number; overlapStrength: "Excellent overlap" | "Good overlap" | "Partial overlap"; topCategories: Priority[]; why: string; consider: string; }
export interface City { id: string; name: string; country: string; currency: string; centre: [number, number]; neighbourhoods: Neighborhood[]; }

export const PRIORITY_OPTIONS: Priority[] = ["affordability", "transit", "security", "greenSpace", "nightlife", "schools", "walkability"];
export const PRIORITY_LABELS: Record<Priority, string> = { affordability: "Affordability", transit: "Transit", security: "Security", greenSpace: "Green space", nightlife: "Nightlife", schools: "Schools", walkability: "Walkability" };
export const FACTOR_SOURCE_LABELS: Record<Priority, string> = {
  affordability: "Curated rent bands",
  transit: "GTFS transit access",
  security: "Curated safety proxy",
  greenSpace: "Official park polygons",
  nightlife: "Curated amenity proxy",
  schools: "Curated school proxy",
  walkability: "Curated walkability proxy",
};
export const REASON_OPTIONS = ["Primary Residence", "Holiday Home", "Visiting Guest", "Transient Guest (en route to another destination)"];
export const HOUSING_OPTIONS = ["Single Family Detached", "Townhouse", "Low Rise Apartment (6 floors and less)", "shared home", "High Rise Apartment (More than 6 floors)", "Hotel"];
export const emptyProfile: UserProfile = { firstName: "", currentCity: "", destination: "Vancouver, BC", reason: "", housingType: "", budget: "", commuteDestination: "", commuteDestinationCoords: null, priorities: [] };

const CITIES: Record<string, City> = {
  vancouver,
};

const CITY_NAME_TO_ID: Record<string, string> = {};
for (const city of Object.values(CITIES)) {
  const keys = [city.name.toLowerCase(), `${city.name}, ${city.country}`.toLowerCase(), city.id];
  for (const k of keys) CITY_NAME_TO_ID[k] = city.id;
}

export function getCity(destination: string): City {
  const id = CITY_NAME_TO_ID[destination.trim().toLowerCase()] ?? "vancouver";
  return CITIES[id];
}

export function getNeighborhoods(profile: UserProfile): Neighborhood[] {
  return getCity(profile.destination).neighbourhoods;
}

export const budgetMax: Record<string, number> = { "Under $2,200": 2200, "$2,200–$2,700": 2700, "$2,700–$3,200": 3200, "$3,200+": 4000 };

export const MIN_PRIORITY_SCORE = 7;

// Curated major Metro Vancouver destinations so common inputs resolve instantly.
// Any text that isn't matched here is geocoded live in the form via Nominatim.
const DESTINATIONS: Record<string, Omit<CommuteDestination, "query">> = Object.fromEntries(
  [
    ["Downtown Vancouver", 49.286, -123.111],
    ["Waterfront Station", 49.286, -123.111],
    ["Canada Place", 49.288, -123.11],
    ["Pacific Centre", 49.282, -123.119],
    ["Gastown", 49.283, -123.108],
    ["Chinatown", 49.279, -123.098],
    ["Yaletown", 49.275, -123.122],
    ["Granville Island", 49.273, -123.134],
    ["Kitsilano Beach", 49.275, -123.146],
    ["UBC", 49.26, -123.246],
    ["BCIT Burnaby", 49.251, -123.001],
    ["Emily Carr University", 49.267, -123.092],
    ["Langara College", 49.224, -123.109],
    ["Kwantlen Polytechnic University Richmond", 49.133, -123.123],
    ["Capilano University", 49.318, -123.019],
    ["Metrotown", 49.226, -123.002],
    ["Brentwood Town Centre", 49.266, -123.006],
    ["SFU Burnaby", 49.279, -122.917],
    ["Lougheed Town Centre", 49.248, -122.897],
    ["Richmond Centre", 49.168, -123.136],
    ["YVR Airport", 49.194, -123.179],
    ["Bridgeport", 49.194, -123.131],
    ["Surrey Central", 49.188, -122.847],
    ["King George", 49.182, -122.844],
    ["Coquitlam Centre", 49.287, -122.791],
    ["Commercial Drive", 49.263, -123.069],
    ["Main Street Science World", 49.273, -123.1],
    ["Olympic Village", 49.266, -123.114],
    ["Queen Elizabeth Park", 49.242, -123.109],
    ["Marine Gateway", 49.209, -123.119],
    ["Vancouver General Hospital", 49.262, -123.124],
    ["BC Place Stadium", 49.277, -123.11],
    ["Joyce-Collingwood", 49.239, -123.032],
    ["Stanley Park", 49.304, -123.141],
  ].map(([label, lat, lon]) => {
    const key = (label as string).toLowerCase().replace(/[^a-z0-9]/g, "");
    return [key, { lat: lat as number, lon: lon as number, label: label as string, resolvedName: label as string, source: "curated", confidence: "exact" }];
  })
);

const ALIASES: Record<string, string> = {
  vancouver: "Downtown Vancouver",
  vancouverbc: "Downtown Vancouver",
  waterfront: "Waterfront Station",
  canadaplace: "Canada Place",
  pacificcenter: "Pacific Centre",
  granville: "Granville Island",
  kits: "Kitsilano Beach",
  ubcvancouver: "UBC",
  "ubc": "UBC",
  metrotownburnaby: "Metrotown",
  burnaby: "Metrotown",
  sfu: "SFU Burnaby",
  lougheed: "Lougheed Town Centre",
  richmond: "Richmond Centre",
  yvr: "YVR Airport",
  airport: "YVR Airport",
  surrey: "Surrey Central",
  commercialbroadway: "Commercial Drive",
  commercialdrive: "Commercial Drive",
  sciencworld: "Main Street Science World",
  mainstreet: "Main Street Science World",
  bcplace: "BC Place Stadium",
  vgh: "Vancouver General Hospital",
};

for (const [alias, label] of Object.entries(ALIASES)) DESTINATIONS[alias] = DESTINATIONS[label.toLowerCase().replace(/[^a-z0-9]/g, "")];

export function findDestination(text: string): CommuteDestination | null {
  const key = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const destination = DESTINATIONS[key];
  if (!destination) return null;
  return {
    lat: destination.lat,
    lon: destination.lon,
    label: destination.label,
    query: text,
    resolvedName: destination.resolvedName,
    source: destination.source,
    confidence: destination.confidence,
  };
}

function factorDetail(priority: Priority, neighborhood: Neighborhood, score: number, budgetFit: number) {
  if (priority === "greenSpace") {
    const parks = neighborhood.nearbyParks?.length ?? 0;
    const access = neighborhood.accessibleParks?.length ?? 0;
    return `${parks} major parks within 500 m${access ? `, plus ${access} within 1 km` : ""}`;
  }
  if (priority === "transit") {
    const transit = neighborhood.transitAccess;
    return transit ? `${transit.stationCount} stations, ${transit.stopCount} stops, ${transit.routeCount} routes nearby` : "Transit access estimated from neighbourhood score";
  }
  if (priority === "affordability") {
    return `Budget fit ${Math.round(budgetFit * 10) / 10}/10 against ${neighborhood.rentMin.toLocaleString()}-${neighborhood.rentMax.toLocaleString()} rent range`;
  }
  return `${PRIORITY_LABELS[priority]} scores ${score}/10 for this neighbourhood`;
}

function confidenceFor(priority: Priority): FactorEvidence["confidence"] {
  if (priority === "greenSpace" || priority === "transit") return "official";
  if (priority === "affordability") return "estimated";
  return "fallback";
}

function createFactorEvidence(priorities: Priority[], neighborhood: Neighborhood, scores: CategoryScore, budgetFit: number) {
  return priorities.map((priority) => ({
    factor: priority,
    label: PRIORITY_LABELS[priority],
    score: scores[priority],
    source: FACTOR_SOURCE_LABELS[priority],
    confidence: confidenceFor(priority),
    detail: factorDetail(priority, neighborhood, scores[priority], budgetFit),
  }));
}

function overlapFromScores(scores: number[]) {
  if (!scores.length) return 0;
  const weakest = Math.min(...scores);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round((weakest * 0.65 + average * 0.35) * 10) / 10;
}

function overlapStrength(score: number): Recommendation["overlapStrength"] {
  if (score >= 8) return "Excellent overlap";
  if (score >= 6.5) return "Good overlap";
  return "Partial overlap";
}

export function createRecommendations(profile: UserProfile): Recommendation[] {
  const selected = new Set(profile.priorities);
  const max = budgetMax[profile.budget] ?? 2700;
  const neighborhoods = getNeighborhoods(profile);
  // A shortlist is always park-first: each suggestion must have a major park
  // within 500 m of the point shown on the map.
  const parkQualified = neighborhoods.filter((n) => (n.nearbyParks?.length ?? 0) > 0);
  const byPriority = parkQualified;

  const qualifying = byPriority;

  return qualifying.map((neighborhood) => {
    const budgetFit = max >= neighborhood.rentMin ? Math.min(10, 7 + (max - neighborhood.rentMin) / 300) : Math.max(1, 7 - (neighborhood.rentMin - max) / 160);
    const scores = { ...neighborhood.scores, affordability: Math.round(((neighborhood.scores.affordability * 0.55) + (budgetFit * 0.45)) * 10) / 10 };
    const selectedScores = (profile.priorities.length ? profile.priorities : PRIORITY_OPTIONS).map((priority) => scores[priority]);
    const overlapScore = overlapFromScores(selectedScores);
    let weighted = 0;
    let weights = 0;
    PRIORITY_OPTIONS.forEach((priority) => { const weight = selected.has(priority) ? 2.5 : 0.5; weighted += scores[priority] * weight; weights += weight; });
    const weightedScore = weighted / weights;
    const match = Math.round(50 + (overlapScore * 3.2) + (weightedScore * 1.15));
    const topCategories = (profile.priorities.length ? [...profile.priorities] : PRIORITY_OPTIONS).sort((a, b) => scores[b] - scores[a]).slice(0, 2);
    const factorEvidence = createFactorEvidence(profile.priorities.length ? profile.priorities : topCategories, neighborhood, scores, budgetFit);
    const weakestFactor = factorEvidence.slice().sort((a, b) => a.score - b.score)[0];
    const why = `${overlapStrength(overlapScore)} across your selected priorities. ${weakestFactor.label} is the tightest constraint at ${weakestFactor.score}/10, so the recommendation is based on the real overlap, not one strong factor alone.`;
    return {
      neighborhood,
      match: Math.min(97, match),
      budgetFit,
      categoryScores: scores,
      factorEvidence,
      overlapScore,
      overlapStrength: overlapStrength(overlapScore),
      topCategories,
      why,
      consider: neighborhood.tradeoff,
    };
  }).sort((a, b) => b.overlapScore - a.overlapScore || b.match - a.match || b.budgetFit - a.budgetFit || a.neighborhood.name.localeCompare(b.neighborhood.name)).slice(0, 3);
}
