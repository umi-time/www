// latlon-grid.js
// Umi‑Time: Latitude and Longitude Grid Layers for Mercator SVG Maps

// -------------------------------------------------------------
// 1. Mercator forward projection helpers
// -------------------------------------------------------------

const MERCATOR_SPAN_DEGREES = 188 + 191; // 188°W → 191°E

export function mercatorX(lonDeg, svgRoot) {
  const width = svgRoot.viewBox.baseVal.width;
  return ((lonDeg + 188) / MERCATOR_SPAN_DEGREES) * width;
}

export function mercatorY(latDeg, svgRoot, Y_top, Y_bottom) {
  const height = svgRoot.viewBox.baseVal.height;

  // Clamp to avoid extreme Mercator distortion near the poles
  const clampedLat = Math.max(-89.999, Math.min(89.999, latDeg));
  const latRad = (clampedLat * Math.PI) / 180;

  const Y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const v = (Y_top - Y) / (Y_top - Y_bottom);

  return v * height;
}

// -------------------------------------------------------------
// 2. Build latitude lines
// -------------------------------------------------------------
export function addLatitudeGrid(svgDoc, svgRoot, Y_top, Y_bottom, options = {}) {
  const {
    latStep = 10,
    stroke = "#888",
    strokeWidth = 0.4,
    id = "lat-grid",
  } = options;

  const width = svgRoot.viewBox.baseVal.width;

  // Remove existing grid with same ID to avoid duplicates
  const existing = svgRoot.querySelector(`#${id}`);
  if (existing) existing.remove();

  // Create overlay group
  const latGroup = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
  latGroup.setAttribute("id", id);
  latGroup.setAttribute("stroke", stroke);
  latGroup.setAttribute("stroke-width", strokeWidth);
  latGroup.setAttribute("fill", "none");
  latGroup.setAttribute("pointer-events", "none");

  // Latitude lines
  for (let lat = -80; lat <= 80; lat += latStep) {
    const y = mercatorY(lat, svgRoot, Y_top, Y_bottom);

    const line = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 0);
    line.setAttribute("x2", width);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("vector-effect", "non-scaling-stroke");

    latGroup.appendChild(line);
  }

  svgRoot.appendChild(latGroup);
  return latGroup;
}

// -------------------------------------------------------------
// 3. Build longitude lines
// -------------------------------------------------------------
export function addLongitudeGrid(svgDoc, svgRoot, Y_top, Y_bottom, options = {}) {
  const {
    lonStep = 15,
    stroke = "#888",
    strokeWidth = 0.4,
    id = "lon-grid",
  } = options;

  const height = svgRoot.viewBox.baseVal.height;

  // Remove existing grid with same ID to avoid duplicates
  const existing = svgRoot.querySelector(`#${id}`);
  if (existing) existing.remove();

  // Create overlay group
  const lonGroup = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
  lonGroup.setAttribute("id", id);
  lonGroup.setAttribute("stroke", stroke);
  lonGroup.setAttribute("stroke-width", strokeWidth);
  lonGroup.setAttribute("fill", "none");
  lonGroup.setAttribute("pointer-events", "none");

  // Longitude lines
  for (let lon = -180; lon <= 180; lon += lonStep) {
    const x = mercatorX(lon, svgRoot);

    const line = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("y1", 0);
    line.setAttribute("y2", height);
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("vector-effect", "non-scaling-stroke");

    lonGroup.appendChild(line);
  }

  svgRoot.appendChild(lonGroup);
  return lonGroup;
}
