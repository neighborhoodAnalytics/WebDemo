"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { DestinationPoint, NearbyPark, Recommendation, TransitStop } from "../lib/recommendations";
import metroVancouverParks from "../lib/metro-vancouver-parks.json";

interface MetroVancouverPark {
  name: string;
  shortName: string;
  type: string;
  area_hectare: number;
  coordinates: [number, number];
  geometry: GeoJSON.Geometry;
}

const regionalParks = metroVancouverParks as MetroVancouverPark[];

export default function NeighborhoodMap({ recommendations, selectedIndex, onSelect, destination }: { recommendations: Recommendation[]; selectedIndex: number; onSelect: (index: number) => void; destination?: DestinationPoint | null }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const regionalParkLayers = useRef<L.Layer[]>([]);
  const nearbyLayers = useRef<L.Layer[]>([]);
  const destinationLayer = useRef<L.CircleMarker | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!container.current || map.current) return;
    map.current = L.map(container.current, { zoomControl: true, scrollWheelZoom: false }).setView([49.265, -123.112], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
    const bounds = L.latLngBounds([]);
    regionalParks.forEach((park) => {
      const boundary = L.geoJSON(park.geometry, {
        style: { color: "#bf6a25", weight: 1.4, fillColor: "#f2a65a", fillOpacity: 0.22 },
        interactive: false,
      }).addTo(map.current!);
      const marker = L.circleMarker(park.coordinates, { radius: 4, color: "#8a3d10", weight: 2, fillColor: "#fff1df", fillOpacity: 1 })
        .bindPopup(`<b>${park.name}</b><br>${park.type}<br>${park.area_hectare.toLocaleString()} ha`)
        .addTo(map.current!);
      boundary.eachLayer((layer) => {
        if ("getBounds" in layer) bounds.extend((layer as L.Polygon).getBounds());
      });
      regionalParkLayers.current.push(boundary, marker);
    });
    recommendations.forEach((item, index) => {
      const icon = L.divIcon({ className: "na-marker-wrap", html: `<span class="na-marker"><b>${index + 1}</b></span>`, iconSize: [42, 42], iconAnchor: [21, 42] });
      const marker = L.marker(item.neighborhood.coordinates, { icon, keyboard: true, title: item.neighborhood.name }).addTo(map.current!).on("click", () => selectRef.current(index));
      markers.current.push(marker);
      bounds.extend(item.neighborhood.coordinates);
    });
    if (destination) {
      destinationLayer.current = L.circleMarker([destination.lat, destination.lon], { radius: 7, color: "#1d3557", weight: 2, fillColor: "#a8dadc", fillOpacity: 1, interactive: true })
        .bindPopup(`<b>Commute destination</b><br>${destination.label ?? ""}`)
        .addTo(map.current!);
      bounds.extend([destination.lat, destination.lon]);
    }
    if (bounds.isValid()) map.current.fitBounds(bounds.pad(0.08), { maxZoom: 11 });
    return () => { map.current?.remove(); map.current = null; markers.current = []; regionalParkLayers.current = []; nearbyLayers.current = []; destinationLayer.current = null; };
  }, [recommendations, destination]);

  useEffect(() => {
    document.querySelectorAll(".na-marker").forEach((item) => item.classList.remove("active"));
    markers.current[selectedIndex]?.getElement()?.querySelector(".na-marker")?.classList.add("active");
    map.current?.panTo(recommendations[selectedIndex].neighborhood.coordinates, { animate: true });
    nearbyLayers.current.forEach((layer) => layer.remove());
    nearbyLayers.current = [];
    const parks = recommendations.flatMap((recommendation) => recommendation.neighborhood.nearbyParks ?? []);
    parks.forEach((park: NearbyPark) => {
      const circle = L.circle(park.coordinates, { radius: 500, color: "#2e7d5b", weight: 1, fillColor: "#5fbf8a", fillOpacity: 0.08, interactive: false }).addTo(map.current!);
      const marker = L.circleMarker(park.coordinates, { radius: 6, color: "#17573e", weight: 2, fillColor: "#dff5e7", fillOpacity: 1 })
        .bindPopup(`<b>${park.name}</b><br>${park.distanceKm === 0 ? "Touches this neighbourhood" : `${park.distanceKm} km from its boundary`}`)
        .addTo(map.current!);
      nearbyLayers.current.push(circle, marker);
    });
    const stops = recommendations[selectedIndex]?.neighborhood.transitAccess?.stops ?? [];
    stops.filter((stop: TransitStop) => stop.locationType === "1").slice(0, 12).forEach((stop: TransitStop) => {
      const marker = L.circleMarker(stop.coordinates, { radius: 5, color: "#245b95", weight: 2, fillColor: "#dbeeff", fillOpacity: 1 })
        .bindPopup(`<b>${stop.name}</b><br>Transit station`)
        .addTo(map.current!);
      nearbyLayers.current.push(marker);
    });
  }, [selectedIndex, recommendations]);

  const selected = recommendations[selectedIndex]?.neighborhood;
  return <div className="map-shell"><div ref={container} className="map" aria-label="Map of recommended Vancouver neighborhoods" /><span className="map-label">Metro Vancouver, BC</span>{selected && <div className="map-park-key"><b>{selected.name} selected</b><span><i className="regional-park-key-dot" />Orange shapes: {regionalParks.length} regional major parks</span><span>Green circles: parks qualifying all suggestions</span>{destination && <span><i className="destination-key-dot" />Blue dot: your commute destination</span>}</div>}</div>;
}
