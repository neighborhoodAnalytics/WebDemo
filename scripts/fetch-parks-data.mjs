import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "lib", "parks-data.json");
const CATALOG_OUTPUT = join(__dirname, "..", "lib", "parks-catalog.json");
const METRO_PARKS_OUTPUT = join(__dirname, "..", "lib", "metro-vancouver-parks.json");

const API = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets";
const METRO_REGIONAL_PARKS_API = "https://services.arcgis.com/E5vyYQKPMX5X3R3H/ArcGIS/rest/services/RegionalParksBoundaries_OpenData_4384382056109619585/FeatureServer/0/query";

const NEARBY_RADIUS_KM = 0.5;
const ACCESS_RADIUS_KM = 1;
const MAJOR_PARK_MIN_HECTARE = 2;
const DESTINATION_PARK_MIN_HECTARE = 20;

async function fetchAll(dataset, select) {
  const results = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const url = `${API}/${dataset}/records?limit=${limit}&offset=${offset}${select ? `&select=${select}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${dataset}: ${res.status}`);
    const data = await res.json();
    results.push(...data.results);
    if (results.length >= data.total_count) break;
    offset += limit;
  }
  return results;
}

async function fetchMetroRegionalParks() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "parkname,parkshortn,type,Shape__Area",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const res = await fetch(`${METRO_REGIONAL_PARKS_API}?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch Metro Vancouver regional parks: ${res.status}`);
  const data = await res.json();
  return (data.features || [])
    .filter((feature) => feature?.geometry && feature.properties?.parkname)
    .map((feature) => {
      const rings = getRings({ geometry: feature.geometry });
      const [latitude, longitude] = rings.length ? polygonCentroid(rings[0]) : [null, null];
      return {
        name: feature.properties.parkname,
        shortName: feature.properties.parkshortn || feature.properties.parkname,
        type: feature.properties.type || "Regional Park",
        area_hectare: Math.round(((feature.properties.Shape__Area || 0) / 10_000) * 100) / 100,
        coordinates: [latitude, longitude],
        geometry: feature.geometry,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function polygonCentroid(coords) {
  let lat = 0, lon = 0;
  for (const [x, y] of coords) {
    lat += y;
    lon += x;
  }
  return [lat / coords.length, lon / coords.length];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function getRings(geom) {
  if (!geom?.geometry) return [];
  const { type, coordinates } = geom.geometry;
  if (type === "Polygon") return coordinates;
  if (type === "MultiPolygon") return coordinates.flat(1);
  return [];
}

// Vancouver is small enough for a local equirectangular projection.  This lets
// us measure the closest edge-to-edge distance between official polygons,
// rather than using a misleading centroid-to-centroid approximation.
function toMetres([lon, lat], referenceLat) {
  const metresPerDegree = 111_320;
  return [lon * metresPerDegree * Math.cos((referenceLat * Math.PI) / 180), lat * metresPerDegree];
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > point[1]) !== (yj > point[1]) &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function polygonDistanceMetres(firstRing, secondRing, referenceLat) {
  const first = firstRing.map((point) => toMetres(point, referenceLat));
  const second = secondRing.map((point) => toMetres(point, referenceLat));
  if (pointInRing(first[0], second) || pointInRing(second[0], first)) return 0;
  let minimum = Infinity;
  for (let i = 0; i < first.length - 1; i++) {
    for (let j = 0; j < second.length - 1; j++) {
      if (segmentsIntersect(first[i], first[i + 1], second[j], second[j + 1])) return 0;
      minimum = Math.min(
        minimum,
        pointToSegmentDistance(first[i], second[j], second[j + 1]),
        pointToSegmentDistance(second[j], first[i], first[i + 1])
      );
    }
  }
  return minimum;
}

function minimumPolygonDistanceKm(firstGeom, secondGeom, referenceLat) {
  const firstRings = getRings(firstGeom);
  const secondRings = getRings(secondGeom);
  if (!firstRings.length || !secondRings.length) return null;
  let minimum = Infinity;
  for (const first of firstRings) {
    for (const second of secondRings) {
      minimum = Math.min(minimum, polygonDistanceMetres(first, second, referenceLat));
    }
  }
  return minimum / 1000;
}

function computeScore(parks) {
  if (parks.length === 0) return 1;

  const countScore = Math.min(10, parks.length * 1.5);

  const totalHectares = parks.reduce((sum, p) => sum + (p.area_hectare || 0), 0);
  const areaScore = Math.min(10, totalHectares / 10);

  let facilityCount = 0;
  let washroomCount = 0;
  let featureCount = 0;
  for (const p of parks) {
    if (p.facilities === "Y") facilityCount++;
    if (p.washrooms === "Y") washroomCount++;
    if (p.specialfeatures === "Y") featureCount++;
  }
  const facilityRatio = parks.length > 0 ? (facilityCount + washroomCount + featureCount) / (parks.length * 3) : 0;
  const facilityScore = facilityRatio * 10;

  const raw = countScore * 0.35 + areaScore * 0.4 + facilityScore * 0.25;
  return Math.round(Math.max(1, Math.min(10, raw)));
}

async function main() {
  console.log("Fetching Metro Vancouver regional parks...");
  const metroRegionalParks = await fetchMetroRegionalParks();
  console.log(`  Got ${metroRegionalParks.length} Metro Vancouver regional parks`);

  console.log("Fetching neighbourhood boundaries...");
  const boundaries = await fetchAll("local-area-boundary", "name,geom,geo_point_2d");
  console.log(`  Got ${boundaries.length} boundaries`);

  console.log("Fetching parks polygons...");
  const parksPolygons = await fetchAll("parks-polygon-representation", "park_name,local_area,area_hectare,classification,geom");
  console.log(`  Got ${parksPolygons.length} park polygons`);

  console.log("Fetching parks metadata...");
  const parksMeta = await fetchAll("parks", "name,neighbourhoodname,hectare,facilities,washrooms,specialfeatures");
  console.log(`  Got ${parksMeta.length} parks`);

  const metaByName = new Map(parksMeta.map((p) => [p.name, p]));

  // Keep the complete catalogue separate from recommendation matching. This is
  // the park-first source of truth: no park disappears because it is far from
  // a neighbourhood centre (for example, Stanley Park).
  const parkCatalog = parksPolygons
    .map((park) => {
      const rings = getRings(park.geom);
      if (!rings.length) return null;
      const [latitude, longitude] = polygonCentroid(rings[0]);
      const meta = metaByName.get(park.park_name) || {};
      return {
        name: park.park_name,
        area_hectare: park.area_hectare,
        classification: park.classification,
        officialNeighbourhood: meta.neighbourhoodname || null,
        coordinates: [latitude, longitude],
        isMajor: (park.area_hectare || 0) >= MAJOR_PARK_MIN_HECTARE,
        nearbyNeighbourhoods: boundaries
          .filter((boundary) => minimumPolygonDistanceKm(boundary.geom, park.geom, boundary.geo_point_2d?.lat ?? latitude) <= ACCESS_RADIUS_KM)
          .map((boundary) => boundary.name),
      };
    })
    .filter((park) => park?.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const majorParks = parksPolygons.filter((p) => (p.area_hectare || 0) >= MAJOR_PARK_MIN_HECTARE);
  console.log(`  ${majorParks.length} major parks (>= ${MAJOR_PARK_MIN_HECTARE} ha)`);

  const results = {};

  for (const boundary of boundaries) {
    const name = boundary.name;

    const lat = boundary.geo_point_2d?.lat;
    const lon = boundary.geo_point_2d?.lon;
    if (lat == null || lon == null) {
      console.warn(`  No centroid for ${name}, skipping`);
      continue;
    }

    const nearby = majorParks
      .map((park) => {
        const rings = getRings(park.geom);
        if (!rings.length) return null;
        const [pLat, pLon] = polygonCentroid(rings[0]);
        return {
          ...park,
          parkLat: pLat,
          parkLon: pLon,
          distanceKm: minimumPolygonDistanceKm(boundary.geom, park.geom, lat),
          centreDistanceKm: haversineKm(lat, lon, pLat, pLon),
        };
      })
      .filter((p) => p && p.distanceKm != null && p.centreDistanceKm <= ACCESS_RADIUS_KM)
      .sort((a, b) => a.centreDistanceKm - b.centreDistanceKm);

    const enriched = nearby.map((p) => {
      const meta = metaByName.get(p.park_name) || {};
      return {
        name: p.park_name,
        area_hectare: p.area_hectare,
        classification: p.classification,
        // This is the neighbourhood-centre-to-park-centre distance displayed
        // on the map, so qualifying pins visibly sit in a matching radius.
        distanceKm: Math.round(p.centreDistanceKm * 1000) / 1000,
        coordinates: [p.parkLat, p.parkLon],
        facilities: meta.facilities || "N",
        washrooms: meta.washrooms || "N",
        specialfeatures: meta.specialfeatures || "N",
      };
    });

    const nearbyParks = enriched.filter((park) => park.distanceKm <= NEARBY_RADIUS_KM);
    const accessibleParks = enriched.filter((park) => park.distanceKm > NEARBY_RADIUS_KM);
    const destinationParks = enriched.filter((park) => park.area_hectare >= DESTINATION_PARK_MIN_HECTARE);

    results[name] = {
      // The green-space score uses the closer 500 m set so a nearby large park
      // cannot make several neighbouring local areas look equally park-rich.
      rawScore: computeScore(nearbyParks),
      nearbyParkCount: nearbyParks.length,
      accessibleParkCount: accessibleParks.length,
      totalHectares: Math.round(nearbyParks.reduce((s, p) => s + p.area_hectare, 0) * 100) / 100,
      closestDistanceKm: enriched.length ? enriched[0].distanceKm : null,
      parks: nearbyParks,
      accessibleParks,
      destinationParks,
    };

    console.log(`  ${name}: raw=${results[name].rawScore}, nearby=${nearbyParks.length}, access=${accessibleParks.length}, destination=${destinationParks.length}`);
  }

  const rawValues = Object.values(results).map((r) => r.rawScore);
  const maxRaw = Math.max(...rawValues, 1);

  for (const r of Object.values(results)) {
    const scaled = maxRaw > 0 ? (r.rawScore / maxRaw) * 9 : 1;
    r.score = Math.max(1, Math.round(scaled));
    delete r.rawScore;
  }

  writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  writeFileSync(CATALOG_OUTPUT, JSON.stringify(parkCatalog, null, 2));
  writeFileSync(METRO_PARKS_OUTPUT, JSON.stringify(metroRegionalParks, null, 2));
  console.log(`\nNormalized (max raw ${maxRaw} -> 9). Wrote ${OUTPUT}`);
  console.log(`Wrote ${CATALOG_OUTPUT} with ${parkCatalog.length} parks.`);
  console.log(`Wrote ${METRO_PARKS_OUTPUT} with ${metroRegionalParks.length} regional parks.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
