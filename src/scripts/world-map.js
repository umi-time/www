// --- Imports from Umi‑Time libraries ---
import {
  UmiTime,
  toDeg,
  toRad,
  utUmiFromDate,
  getHourAngle,
  solarAltitude,
} from "umi-time";
import { initLayerMenu } from "./ui/layer-menu.js";
import { addLatitudeGrid, addLongitudeGrid } from "./layers/latlon-grid.js";
import { addTimeZoneBoundaries } from "./layers/timezone-boundaries.js";

// --- DOM elements ---
const mapObject = document.getElementById("map-object");
const watch = document.getElementById("watch-face");
const canvas = document.getElementById("umiCanvas");
const ctx = canvas.getContext("2d");

const shadowCanvas = document.getElementById("shadow-canvas");
const shadowCtx = shadowCanvas.getContext("2d");
const tips = document.querySelectorAll(".tip");

let lastMinute = null;
let lastDayOffset = null;
let currentTipIndex = 0;
let tipTimer = null;
let detailTimer = null;

const tipDelay = 2000;
const detailDelay = 3000; // 3 seconds before showing detail
const tipInterval = 12000; // 12 seconds between tips

// --- Mercator bounds (same as before) ---
const MAX_LAT = 83.64;
const MIN_LAT = -74.78;

const latTop = (MAX_LAT * Math.PI) / 180;
const latBottom = (MIN_LAT * Math.PI) / 180;

const Y_top = Math.log(Math.tan(Math.PI / 4 + latTop / 2));
const Y_bottom = Math.log(Math.tan(Math.PI / 4 + latBottom / 2));

const DEFAULT_LOCATION = { lat: 0, lon: 0 };
let clockLat = DEFAULT_LOCATION.lat;
let clockLon = DEFAULT_LOCATION.lon;

function adjustedDate(dayOffset) {
  let targetDate = new Date();

  targetDate.setDate(targetDate.getDate() + dayOffset);

  return targetDate;
}

// -------------------------------------------------------------
// 1. TERMINATOR SHADOW
// -------------------------------------------------------------
function drawTerminatorShadow(dayOffset) {
  const width = shadowCanvas.width;
  const height = shadowCanvas.height;

  shadowCtx.clearRect(0, 0, width, height);

  const totalYSpan = Y_top - Y_bottom;

  const syntheticDate = adjustedDate(dayOffset);
  const umi = new UmiTime(
    syntheticDate,
    { value: 0, uncertainty: 0 },
    { value: 0, uncertainty: 0 },
  );

  const delta = toRad(umi.solarDeclination);
  const eot = umi.equationOfTime;
  const utDeg = utUmiFromDate(syntheticDate);

  const hourAngleDeg = getHourAngle(utDeg, 0, eot);
  const lambdaS = toRad(-hourAngleDeg);

  const points = [];

  const EQUINOX_EPSILON = toRad(0.05);

  for (let lngDeg = -180; lngDeg <= 180; lngDeg++) {
    const lambda = toRad(lngDeg);

    let phi;
    if (Math.abs(delta) < EQUINOX_EPSILON) {
      phi = 0;
    } else {
      phi = Math.atan(-Math.cos(lambda - lambdaS) / Math.tan(delta));
    }

    const clampedPhi = Math.max(latBottom, Math.min(latTop, phi));

    const x = ((lambda + Math.PI) / (2 * Math.PI)) * width;
    const mercY = Math.log(Math.tan(Math.PI / 4 + clampedPhi / 2));
    const yPercent = (Y_top - mercY) / totalYSpan;
    const y = yPercent * height;

    points.push({ x, y });
  }

  // Draw polygon
  shadowCtx.beginPath();
  shadowCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shadowCtx.lineTo(points[i].x, points[i].y);
  }

  // ROBUST FILL LOGIC:
  // Treat the equinox window cleanly by checking against your epsilon threshold
  if (Math.abs(delta) < EQUINOX_EPSILON) {
    // Exactly on the equinox: shade exactly half the canvas cleanly
    shadowCtx.lineTo(width, height);
    shadowCtx.lineTo(0, height);
  } else if (delta > 0) {
    // Northern hemisphere summer (shading the southern hemisphere/bottom)
    shadowCtx.lineTo(width, height);
    shadowCtx.lineTo(0, height);
  } else {
    // Northern hemisphere winter (shading the northern hemisphere/top)
    shadowCtx.lineTo(width, 0);
    shadowCtx.lineTo(0, 0);
  }

  shadowCtx.closePath();

  shadowCtx.strokeStyle = "blue";
  shadowCtx.lineWidth = 4;
  shadowCtx.stroke();

  shadowCtx.fillStyle = "rgba(10, 15, 30, 0.45)";

document.getElementById("debug").textContent = [
  `date=${syntheticDate.toISOString().slice(0,10)}`,
  `canvas=${shadowCanvas.width}x${shadowCanvas.height}`,
  `css=${shadowCanvas.clientWidth}x${shadowCanvas.clientHeight}`,
  `decl=${umi.solarDeclination.toFixed(2)}`,
  `points=${points.length}`
].join("\n");

  shadowCtx.fill();
}

// -------------------------------------------------------------
// 2. MERCATOR INVERSE
// -------------------------------------------------------------
// Near your Mercator bounds, add:
const MERCATOR_SPAN_DEGREES = 188 + 191; // 188°W → 191°E

function mercatorInverse(x, y, width, height) {
  const v = y / height;
  const Y = Y_top - v * (Y_top - Y_bottom);

  const lat = toDeg(Math.atan(Math.sinh(Y)));

  const scaledX = x / width;
  const rawLon = scaledX * MERCATOR_SPAN_DEGREES - 188;

  // Fast modulo wrap instead of recursion
  const lon = ((((rawLon + 180) % 360) + 360) % 360) - 180;

  return { lat, lon };
}

function mercatorForward(lat, lon, width, height) {
  // Latitude -> Y
  const Y = Math.log(
    Math.tan(Math.PI / 4 + toRad(lat) / 2)
  );

  const v = (Y_top - Y) / (Y_top - Y_bottom);
  const y = v * height;

  // Longitude -> X
  const scaledX = (lon + 188) / MERCATOR_SPAN_DEGREES;
  const x = scaledX * width;

  return { x, y };
}

function wrapLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

// -------------------------------------------------------------
// 3. UMI‑TIME WATCH
// -------------------------------------------------------------
function drawUmiWatch(ctx, lat, lon) {
  const dayOffset = parseInt(seasonSlider.value, 10);
  const targetDate = adjustedDate(dayOffset);

  const umi = new UmiTime(
    targetDate,
    { value: lat, uncertainty: 0 },
    { value: lon, uncertainty: 0 },
  );
  //
  // --- Core solar geometry ---
  //
  const decl = umi.solarDeclination; // degrees
  const eot = umi.equationOfTime; // minutes
  const utDeg = utUmiFromDate(targetDate);

  //
  // --- Umi‑Time dial angle ---
  //
  const handAngle = computeUmiDialAngle(lat, lon, targetDate);

  //
  // --- Draw dial base ---
  //
  ctx.clearRect(0, 0, 180, 180);

  //
  // --- Draw Umi‑Time hand ---
  //
  drawUmiDial(ctx, handAngle);

  // Conic gradient ring
  drawConicGradient(ctx, 90, 90, 87, lat, decl, eot);

  // Dial ticks + labels
  const dialAngle = 180 + lon; // your original mapping
  drawDialTicks(ctx, 90, 90, 85, dialAngle);
  drawDialLabels(ctx, 90, 90, 85, dialAngle);

  //
  // --- Sunrise / Sunset indicators ---
  //
  // hHorizon is symmetric: -H0 = sunrise, +H0 = sunset
  const sunriseDial = umi.sunrise !== null ? umi.sunrise + lon + 180 : null;
  const sunsetDial = umi.sunset !== null ? umi.sunset + lon + 180 : null;

  drawSunIndicatorsCanvas(ctx, sunriseDial, sunsetDial);
}

// -------------------------------------------------------------
// 4. Umi‑Time dial angle
// -------------------------------------------------------------
function computeUmiDialAngle(lat, lon, date) {
  // UTC time in hours
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  const umi = new UmiTime(
    date,
    { value: lat, uncertainty: 0 },
    { value: lon, uncertainty: 0 },
  );

  // Equation of Time (minutes)
  const eot = umi.equationOfTime;

  // Local solar time (hours)
  const solarTimeHours = utcHours + lon / 15 + eot / 60;

  // Convert to angle
  let angle = (solarTimeHours / 24) * 360 + 180;

  angle %= 360;
  if (angle < 0) angle += 360;

  return angle;
}

// -------------------------------------------------------------
// 5. UI Rendering
// -------------------------------------------------------------
function drawUmiDial(ctx, angle) {
  const cx = 90;
  const cy = 90;
  const R = 85;

  //
  // Background ring
  //
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = R;
  ctx.beginPath();
  ctx.arc(cx, cy, R / 2, 0, Math.PI * 2);
  ctx.stroke();

  const TRI_HEIGHT = 62;
  const TRI_HALF_WIDTH = 9;

  const HUB_RADIUS = 8;

  const rad = (angle * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  //
  // Hand starts from circular hub
  //
  ctx.beginPath();
  ctx.moveTo(-TRI_HALF_WIDTH, -HUB_RADIUS * 0.3);
  ctx.lineTo(TRI_HALF_WIDTH, -HUB_RADIUS * 0.3);
  ctx.lineTo(0, -TRI_HEIGHT);
  ctx.closePath();

  const grad = ctx.createLinearGradient(
    -TRI_HALF_WIDTH,
    0,
    TRI_HALF_WIDTH,
    -TRI_HEIGHT,
  );

  grad.addColorStop(0, "#888");
  grad.addColorStop(0.4, "#333");
  grad.addColorStop(1, "#000");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 0.75;

  ctx.fill();
  ctx.stroke();

  //
  // Hub
  //
  ctx.beginPath();
  ctx.arc(0, 0, HUB_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#444";
  ctx.fill();

  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.stroke();

  //
  // Pivot
  //
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ddd";
  ctx.fill();

  ctx.restore();
}

function drawSunIndicatorsCanvas(ctx, sunriseDial, sunsetDial) {
  const cx = 90,
    cy = 90,
    R = 85;
  const toRad = (a) => ((a - 90) * Math.PI) / 180;

  [sunriseDial, sunsetDial].forEach((angle) => {
    if (angle === null) return;

    const rad = toRad(angle);
    const x1 = cx + Math.cos(rad) * (R - 2);
    const y1 = cy + Math.sin(rad) * (R - 2);
    const x2 = cx + Math.cos(rad) * (R + 4);
    const y2 = cy + Math.sin(rad) * (R + 4);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

// -------------------------------------------------------------
// 6. Event wiring
// -------------------------------------------------------------
function initWhenReady() {
  function isReady() {
    if (!mapObject.contentDocument) return false;

    const svgRoot = mapObject.contentDocument.documentElement;
    if (!svgRoot) return false;

    const vb = svgRoot.getAttribute("viewBox");
    if (!vb) return false;

    return true;
  }

  function tryInit() {
    if (isReady()) {
      initMapDemo(mapObject.contentDocument);
      return;
    }
    setTimeout(tryInit, 20);
  }

  tryInit();
}

document.addEventListener("DOMContentLoaded", initWhenReady);

async function initMapDemo(svgDoc) {
  const svgRoot = svgDoc.documentElement;

  // Your existing Mercator constants
  const latTop = (MAX_LAT * Math.PI) / 180;
  const latBottom = (MIN_LAT * Math.PI) / 180;

  const Y_top = Math.log(Math.tan(Math.PI / 4 + latTop / 2));
  const Y_bottom = Math.log(Math.tan(Math.PI / 4 + latBottom / 2));

  // Build the grid
  const latGroup = addLatitudeGrid(svgDoc, svgRoot, Y_top, Y_bottom);
  const lonGroup = addLongitudeGrid(svgDoc, svgRoot, Y_top, Y_bottom);

  const timeZoneGroup = await addTimeZoneBoundaries(
    svgDoc,
    svgRoot,
    Y_top,
    Y_bottom,
  );

  // Initialize layer menu
  const layerMenu = initLayerMenu();
  const { button, menu } = layerMenu.elements;

  function closeMenuIfOpen(e) {
    // If menu is not visible, do nothing
    if (menu.style.display !== "flex") return;

    // If click is inside menu or button, do nothing
    if (menu.contains(e.target) || button.contains(e.target)) return;

    // Otherwise close using the module's state setter
    layerMenu.closeMenu();
  }

  // Listen on main document
  document.addEventListener("click", closeMenuIfOpen);

  // Listen inside the SVG document
  svgDoc.addEventListener("click", closeMenuIfOpen);

  // Register layer toggles
  layerMenu.registerLayer("toggleLatitude", (checked) => {
    latGroup.style.display = checked ? "block" : "none";
  });

  layerMenu.registerLayer("toggleLongitude", (checked) => {
    lonGroup.style.display = checked ? "block" : "none";
  });

  layerMenu.registerLayer("toggleTimeZones", (checked) => {
    if (timeZoneGroup) {
      timeZoneGroup.style.display = checked ? "block" : "none";
    }
  });

  layerMenu.registerLayer("layerTerminator", (checked) => {
    const terminatorLayer = document.getElementById("shadow-canvas");
    if (terminatorLayer) {
      terminatorLayer.style.display = checked ? "block" : "none";
    }
  });

  layerMenu.registerLayer("toggleTips", (checked) => {
    const tipsPanel = document.getElementById("tipsPanel");

    if (tipsPanel) {
      tipsPanel.style.display = checked ? "flex" : "none";
    }

    if (checked) {
      startTipCycle();
    } else {
      stopTipCycle();
    }
  });

  const tipsEnabled = document.getElementById("toggleTips")?.checked ?? true;

  if (tipsEnabled) {
    startTipCycle();
  }

  const resetButton = document.getElementById("resetDate");
  const [vbX, vbY, vbWidth, vbHeight] = svgRoot
    .getAttribute("viewBox")
    .split(/\s+/)
    .map(Number);

  shadowCanvas.width = vbWidth;
  shadowCanvas.height = vbHeight;

  let lastMove = 0;

  svgRoot.addEventListener("mousemove", (e) => {
    const now = performance.now();
    if (now - lastMove < 16) return; // ~60fps throttle
    lastMove = now;

    const pt = svgRoot.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgRoot.getScreenCTM().inverse());

    const { lat, lon } = mercatorInverse(
      svgPt.x,
      svgPt.y,
      svgRoot.viewBox.baseVal.width,
      svgRoot.viewBox.baseVal.height,
    );

    watch.style.left = `${e.clientX}px`;
    watch.style.top = `${e.clientY}px`;

    clockLat = lat;
    clockLon = lon;

    drawUmiWatch(ctx, lat, lon);
  });

  // Event listener for when the SVG map changes size or viewBox
  window.addEventListener("resize", () => {
    const { x, y } = mercatorForward(clockLat, clockLon, svgRoot.viewBox.baseVal.width, svgRoot.viewBox.baseVal.height);
    const screenPt = svgRoot.createSVGPoint();
    screenPt.x = x;
    screenPt.y = y;
    const screenCoords = screenPt.matrixTransform(svgRoot.getScreenCTM());
    watch.style.left = `${screenCoords.x}px`;
    watch.style.top = `${screenCoords.y}px`;
  });

  resetButton.addEventListener("click", () => {
    lastDayOffset = null;
    seasonSlider.value = 0;
    updateSelectedDate();
  });

  seasonSlider.addEventListener("input", updateSelectedDate);

  updateSelectedDate();

  // Convert the default location lat/lon to screen coordinates and draw the watch at that location
  const { x, y } = mercatorForward(clockLat, clockLon, svgRoot.viewBox.baseVal.width, svgRoot.viewBox.baseVal.height);

  // transform the SVG coordinates to screen coordinates
  const screenPt = svgRoot.createSVGPoint();
  screenPt.x = x;
  screenPt.y = y;
  const screenCoords = screenPt.matrixTransform(svgRoot.getScreenCTM());

  const screenX = screenCoords.x;
  const screenY = screenCoords.y;

  watch.style.left = `${screenX}px`;
  watch.style.top = `${screenY}px`;

  drawUmiWatch(ctx, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);

  setInterval(() => {
    const now = new Date();
    const minute = now.getUTCMinutes();
    const dayOffset = parseInt(seasonSlider.value, 10);

    if (minute !== lastMinute || dayOffset !== lastDayOffset) {
      selectedDate.innerHTML = getLocalizedDateFromOffset(dayOffset);
      drawTerminatorShadow(dayOffset);
      lastMinute = minute;
      lastDayOffset = dayOffset;
    }
  }, 1000);
}

function updateSelectedDate() {
  const dayOffset = parseInt(seasonSlider.value, 10);
  selectedDate.innerHTML = getLocalizedDateFromOffset(dayOffset);
}

function getLocalizedDateFromOffset(dateOffset) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(targetDate);
}

function lerpColor(c1, c2, t) {
  const p = (c) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = p(c1),
    [r2, g2, b2] = p(c2);

  return (
    "#" +
    [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function elevToColor(elev) {
  if (elev >= 6) return "#7EC8FF"; // bright day
  if (elev >= 0) return lerpColor("#B9E3FF", "#FFB347", (6 - elev) / 6);
  if (elev >= -6) return lerpColor("#FFB347", "#D62828", -elev / 6);
  if (elev >= -18) return lerpColor("#D62828", "#2A3B55", (-6 - elev) / 12);

  // Below astronomical twilight → fade to deep night
  const t = Math.min(1, Math.max(0, (-18 - elev) / 72)); // -18 → -90
  return lerpColor("#2A3B55", "#001F3F", t);
}

function drawConicGradient(ctx, cx, cy, R, lat, decl, eot) {
  const step = 0.5; // degrees

  for (let angle = 0; angle < 360; angle += step) {
    // Noon at top, midnight at bottom
    const haDeg = angle + eot / 4;

    // Solar elevation at this hour angle
    const elev = solarAltitude(lat, decl, haDeg);

    // Map elevation → color
    const color = elevToColor(elev);

    // Draw arc segment
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.arc(cx, cy, R, toRad(angle - 90), toRad(angle - 90 + step));
    ctx.stroke();
  }
}

function drawDialTicks(ctx, cx, cy, R, dialRotationDeg) {
  const toRad = (deg) => ((deg + dialRotationDeg - 90) * Math.PI) / 180;

  // Thin ticks every 6°
  for (let deg = 0; deg < 360; deg += 6) {
    const rad = toRad(deg);
    const r1 = R - 3;
    const r2 = R - 1;

    const x1 = cx + Math.cos(rad) * r1;
    const y1 = cy + Math.sin(rad) * r1;
    const x2 = cx + Math.cos(rad) * r2;
    const y2 = cy + Math.sin(rad) * r2;

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Major ticks every 30°
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = toRad(deg);
    const r1 = R - 5;
    const r2 = R - 1;

    const x1 = cx + Math.cos(rad) * r1;
    const y1 = cy + Math.sin(rad) * r1;
    const x2 = cx + Math.cos(rad) * r2;
    const y2 = cy + Math.sin(rad) * r2;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawDialLabels(ctx, cx, cy, R, dialRotationDeg) {
  const labelUmis = [0, 60, 120, 180, 240, 300];

  ctx.fillStyle = "#000";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const umi of labelUmis) {
    // Dial-relative angle
    const dialDeg = umi + dialRotationDeg;

    // Convert to canvas radians (0° at top)
    const rad = ((dialDeg - 90) * Math.PI) / 180;

    // Position of label
    const r = R - 12;
    const x = cx + Math.cos(rad) * r;
    const y = cy + Math.sin(rad) * r;

    // Rotate text so it faces outward
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad + Math.PI / 2); // face outward
    ctx.fillText(`${umi}ᵘ`, 0, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------
// Tips display management
// ---------------------------------------------------------

function showTip(index) {
  if (!tips.length) return;

  clearTimeout(detailTimer);

  tips.forEach((tip) => {
    tip.classList.remove("active");

    const focus = tip.querySelector(".tip-focus");
    const explanation = tip.querySelector(".tip-explanation");

    focus?.classList.remove("tip-visible");
    explanation?.classList.remove("tip-visible");
  });

  const tip = tips[index];
  const focus = tip.querySelector(".tip-focus");
  const explanation = tip.querySelector(".tip-explanation");

  setTimeout(() => {
    tip.classList.add("active");

    focus?.classList.add("tip-visible");

    detailTimer = setTimeout(() => {
      explanation?.classList.add("tip-visible");
    }, detailDelay);
  }, tipDelay);
}

function startTipCycle() {
  stopTipCycle();

  showTip(currentTipIndex);

  tipTimer = setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % tips.length;

    showTip(currentTipIndex);
  }, tipInterval);
}

function stopTipCycle() {
  if (tipTimer) {
    clearInterval(tipTimer);
    tipTimer = null;
  }

  if (detailTimer) {
    clearTimeout(detailTimer);
    detailTimer = null;
  }
}
