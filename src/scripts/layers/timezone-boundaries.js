// timezone-boundaries.js
// Umi‑Time: Time Zone Boundary Layer for Mercator SVG Maps

import { mercatorX, mercatorY } from "./mercator-utils.js";

export async function addTimeZoneBoundaries(svgDoc, svgRoot, Y_top, Y_bottom, options = {}) {
  const {
    url = "/data/timezones.json",   // GeoJSON file
    stroke = "#c33",
    strokeWidth = 0.6,
    fill = "none",
    id = "timezone-boundaries",
  } = options;

  // Remove existing layer with same ID to avoid duplicates
  const existing = svgRoot.querySelector(`#${id}`);
  if (existing) existing.remove();

  let geo;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to load time zone GeoJSON: ${response.status} ${response.statusText}`);
      return null;
    }
    geo = await response.json();
  } catch (err) {
    console.error("Error fetching time zone GeoJSON:", err);
    return null;
  }

  if (!geo || !Array.isArray(geo.features)) {
    console.error("Invalid GeoJSON structure for time zone boundaries.");
    return null;
  }

  // Create overlay group
  const group = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("id", id);
  group.setAttribute("stroke", stroke);
  group.setAttribute("stroke-width", strokeWidth);
  group.setAttribute("fill", fill);
  group.setAttribute("pointer-events", "none");
  group.setAttribute("vector-effect", "non-scaling-stroke");

  // Convert each feature
  for (const feature of geo.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === "Polygon") {
      const path = polygonToPath(svgDoc, svgRoot, geom.coordinates, Y_top, Y_bottom);
      if (path) group.appendChild(path);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        const path = polygonToPath(svgDoc, svgRoot, poly, Y_top, Y_bottom);
        if (path) group.appendChild(path);
      }
    }
  }

  svgRoot.appendChild(group);
  return group;
}

function polygonToPath(svgDoc, svgRoot, rings, Y_top, Y_bottom) {
  if (!Array.isArray(rings) || rings.length === 0) return null;

  const path = svgDoc.createElementNS("http://www.w3.org/2000/svg", "path");
  const segments = [];

  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length === 0) continue;

    for (let i = 0; i < ring.length; i++) {
      let [lon, lat] = ring[i];

      // Clamp longitude to safe range
      lon = Math.max(-180, Math.min(180, lon));

      const x = mercatorX(lon, svgRoot);
      const y = mercatorY(lat, svgRoot, Y_top, Y_bottom);

      segments.push(i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
    }
    segments.push("Z ");
  }

  if (segments.length === 0) return null;

  path.setAttribute("d", segments.join(""));
  return path;
}
