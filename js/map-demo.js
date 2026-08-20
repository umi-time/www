const mapObject = document.getElementById("map-object");
const watch = document.getElementById("watch-face");
const canvas = document.getElementById("umiCanvas");
const ctx = canvas.getContext("2d");

let lastMinute = null;
let lastDayOffset = null;

const shadowCanvas = document.getElementById("shadow-canvas");
const shadowCtx = shadowCanvas.getContext("2d");

const MAX_LAT = 83.64; // degrees
const MIN_LAT = -74.78; // degrees

const latTop = (MAX_LAT * Math.PI) / 180;
const latBottom = (MIN_LAT * Math.PI) / 180;

const Y_top = Math.log(Math.tan(Math.PI / 4 + latTop / 2));
const Y_bottom = Math.log(Math.tan(Math.PI / 4 + latBottom / 2));

function drawTerminatorShadow(dayOffset) {
  const canvas = document.getElementById("shadow-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const width = canvas.width; // 1652.4702
  const height = canvas.height; // 1220.6385
  ctx.clearRect(0, 0, width, height);

  const totalYSpan = Y_top - Y_bottom;

  // 2. Combine Slider Day with Active System Time
  const now = new Date();

  // N tracks the day of the year (enforcing a safe 1-365 range for the sin formula)
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const N = day + dayOffset;

  // Calculate Solar Declination based on your slider's day
  const deltaDeg = 23.45 * Math.sin((360 / 365) * (284 + N) * (Math.PI / 180));
  const delta = deltaDeg * (Math.PI / 180);

  // Calculate Solar Longitude using the active system UTC hours/minutes/seconds
  const utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const lambdaS = -15 * (utcHours - 12) * (Math.PI / 180);

  // 3. Build the Line Point Set
  const points = [];
  for (let lngDeg = -180; lngDeg <= 180; lngDeg += 1) {
    const lambda = lngDeg * (Math.PI / 180);

    let phi;
    if (Math.abs(delta) < 1e-6) {
      phi = 0;
    } else {
      phi = Math.atan(-Math.cos(lambda - lambdaS) / Math.tan(delta));
    }

    let clampedPhi = Math.max(latBottom, Math.min(latTop, phi));

    const x = ((lambda + Math.PI) / (2 * Math.PI)) * width;
    const currentMercY = Math.log(Math.tan(Math.PI / 4 + clampedPhi / 2));
    const yPercent = (Y_top - currentMercY) / totalYSpan;
    const y = yPercent * height;

    points.push({ x, y });
  }

  // 4. Construct and Draw the Polygon Mask
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  // Check solar declination to find which pole is in a seasonal dark phase
  if (delta > 0) {
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
  } else {
    ctx.lineTo(width, 0);
    ctx.lineTo(0, 0);
  }
  ctx.closePath();

  // 5. Render Canvas Layer
  ctx.fillStyle = "rgba(10, 15, 30, 0.45)";
  ctx.fill();
}

mapObject.addEventListener("load", () => {
  const svgDoc = mapObject.contentDocument;
  const svgRoot = svgDoc.documentElement;

  const resetButton = document.getElementById("resetDate");

  const viewBox = svgRoot.getAttribute("viewBox");
  // e.g. "0 0 2400 1200"

  const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);

  const mapWidth = vbWidth;
  const mapHeight = vbHeight;

  shadowCanvas.width = mapWidth;
  shadowCanvas.height = mapHeight;

  svgRoot.addEventListener("mousemove", (e) => {
    // Convert mouse to SVG viewBox coordinates
    const pt = svgRoot.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgRoot.getScreenCTM().inverse());

    const x = svgPt.x;
    const y = svgPt.y;

    // Mercator inverse
    const { lat, lon } = mercatorInverse(
      x,
      y,
      svgRoot.viewBox.baseVal.width,
      svgRoot.viewBox.baseVal.height,
    );

    watch.style.display = "block";
    watch.style.left = `${e.clientX}px`;
    watch.style.top = `${e.clientY}px`;

    drawUmiWatch(ctx, lat, lon);
  });

  resetButton.addEventListener("click", (e) => {
    lastDayOffset = null;
    seasonSlider.value = 0;
    updateSelectedDate();
  });

  seasonSlider.addEventListener("input", (e) => {
    updateSelectedDate();
  });

  updateSelectedDate();

  setInterval(() => {
    const now = new Date();
    const minute = now.getUTCMinutes();
    const dayOffset = parseInt(seasonSlider.value, 10);

    if (minute !== lastMinute || dayOffset != lastDayOffset) {
      let adjustedDate = getLocalizedDateFromOffset(dayOffset);
      selectedDate.innerHTML = adjustedDate;
      drawTerminatorShadow(dayOffset);
      lastMinute = minute;
      lastDayOffset = dayOffset;
    }
  }, 1000); // check once per second, update only when minute changes
});

function updateSelectedDate() {
  const dayOffset = parseInt(seasonSlider.value, 10);
  let adjustedDate = getLocalizedDateFromOffset(dayOffset);
  selectedDate.innerHTML = adjustedDate;
}

/**
 * Computes a date relative to the current time using a day offset and formats it to the user's locale.
 * @param {number} dateOffset - The number of days to shift forward (+) or backward (-) from today.
 * @returns {string} The formatted date string tailored to the user's regional settings.
 */
function getLocalizedDateFromOffset(dateOffset) {
  const targetDate = new Date();

  // Explicitly update the day component (JavaScript safely handles month/year roll-overs automatically)
  targetDate.setDate(targetDate.getDate() + dateOffset);

  // Format options: Adjust these properties to match your UI needs (e.g., 'numeric', '2-digit', 'short', 'long')
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  // Passing 'undefined' as the first parameter forces the browser to look up the active system locale
  return new Intl.DateTimeFormat(undefined, options).format(targetDate);
}

function drawUmiWatch(ctx, lat, lon) {
  const { gradientStops, sunriseDial, sunsetDial } = computeSunAngles(lat);

  const handAngle = umiDialAngle(lat, lon);
  drawUmiDial(ctx, handAngle);

  const dialAngle = 180 + lon;
  drawDialTicks(ctx, 90, 90, 85, dialAngle);
  drawDialLabels(ctx, 90, 90, 85, dialAngle);

  drawConicGradient(ctx, 90, 90, 87, gradientStops);

  drawSunIndicatorsCanvas(ctx, sunriseDial, sunsetDial);
}

function mercatorInverse(x, y, width, height) {
  // Your map's actual lat bounds
  const latTop = (MAX_LAT * Math.PI) / 180;
  const latBottom = (MIN_LAT * Math.PI) / 180;

  // Convert to Mercator Y
  const Y_top = Math.log(Math.tan(Math.PI / 4 + latTop / 2));
  const Y_bottom = Math.log(Math.tan(Math.PI / 4 + latBottom / 2));

  // Normalize y to [0,1]
  const v = y / height;

  // Interpolate Mercator Y
  const Y = Y_top - v * (Y_top - Y_bottom);

  // Inverse Mercator
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(Y));

  // Longitude is linear
  // left edge at 172 E (-188 W), right edge at -169 W (191 E)
  const scaledX = x / width;
  const spanDegrees = 188 + 191;
  const scaledCenter = 188 / spanDegrees;
  const rawLon = scaledX * spanDegrees - 188;
  const lon = wrapLon(rawLon);

  return { lat, lon };
}

function wrapLon(lon) {
  if (lon > 180) return wrapLon(lon - 360);
  if (lon < -180) return wrapLon(lon + 360);
  return lon;
}

function umiDialAngle(lat, lon, date = new Date()) {
  // 1. UTC time in hours
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // 2. Equation of Time (minutes)
  // NOAA simplified formula
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / 86400000,
  );
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // 3. Local solar time (hours)
  const solarTimeHours = utcHours + lon / 15 + EoT / 60;

  // 4. Convert to angle
  let angle = (solarTimeHours / 24) * 360;

  // 5. Rotate so midnight is at bottom
  angle += 180;

  // Normalize
  angle = angle % 360;
  if (angle < 0) angle += 360;

  return angle;
}

function drawUmiDial(ctx, angle) {
  const R = 85; // radius
  const cx = 90; // center x
  const cy = 90; // center y

  ctx.clearRect(0, 0, 180, 180);

  // Outer circle
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Hour hand
  const rad = (angle * Math.PI) / 180;
  const hx = cx + Math.sin(rad) * (R - 10);
  const hy = cy - Math.cos(rad) * (R - 10);

  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
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
    const x2 = cx + Math.cos(rad) * (R + 2);
    const y2 = cy + Math.sin(rad) * (R + 2);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
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

// Maps solar elevation (degrees) to the corresponding ring color
function elevToColor(elev) {
  if (elev >= 6) return "#7EC8FF";
  if (elev >= 0) return lerpColor("#B9E3FF", "#FFB347", (6 - elev) / 6);
  if (elev >= -6) return lerpColor("#FFB347", "#D62828", -elev / 6);
  if (elev >= -18) return lerpColor("#D62828", "#2A3B55", (-6 - elev) / 12);
  return "#001F3F";
}

// Builds the conic gradient string and returns sunrise/sunset indicator angles
function computeSunAngles(lat) {
  const now = new Date();
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const dayOffset = parseInt(seasonSlider.value, 10);

  // Solar declination (your demo formula)
  const decl =
    23.44 * Math.sin(((360 / 365) * (day + dayOffset - 81) * Math.PI) / 180);

  const D2R = Math.PI / 180;
  const sinL = Math.sin(lat * D2R),
    cosL = Math.cos(lat * D2R);
  const sinDec = Math.sin(decl * D2R),
    cosDec = Math.cos(decl * D2R);

  // Hour angle where sun reaches a given elevation
  function hAngle(elevDeg) {
    const denom = cosL * cosDec;
    if (Math.abs(denom) < 1e-10) return null;
    const cosH = (Math.sin(elevDeg * D2R) - sinL * sinDec) / denom;
    if (Math.abs(cosH) >= 1) return null;
    return Math.acos(cosH) / D2R; // degrees
  }

  // Solar elevation at hour angle
  function elev(haDeg) {
    return (
      Math.asin(sinL * sinDec + cosL * cosDec * Math.cos(haDeg * D2R)) / D2R
    );
  }

  // Twilight boundaries
  const hGolden = hAngle(6);
  const hHorizon = hAngle(0);
  const hBlue = hAngle(-6);
  const hTwilight = hAngle(-18);

  // Build sunset-side stops (0° = noon, 180° = midnight)
  const sSet = [[0, elevToColor(elev(0))]];

  if (hGolden !== null) sSet.push([hGolden, "#B9E3FF"]);
  if (hHorizon !== null) {
    sSet.push([(hGolden + hHorizon) / 2, "#FFE27A"]);
    sSet.push([hHorizon, "#FFB347"]);
  }
  if (hBlue !== null) sSet.push([hBlue, "#D62828"]);
  if (hTwilight !== null) sSet.push([hTwilight, "#2A3B55"]);

  sSet.push([180, elevToColor(elev(180))]);

  // Mirror for sunrise side (180°→360°)
  const stops = [...sSet];
  for (let i = sSet.length - 2; i >= 0; i--) {
    stops.push([360 - sSet[i][0], sSet[i][1]]);
  }

  // Convert to structured objects
  const gradientStops = stops.map(([angle, color]) => ({ angle, color }));

  return {
    gradientStops,
    sunriseDial: hHorizon !== null ? -hHorizon : null,
    sunsetDial: hHorizon !== null ? hHorizon : null,
  };
}

function drawConicGradient(ctx, cx, cy, R, stops) {
  const offset = (-90 * Math.PI) / 180; // CSS 0deg → top

  for (let i = 0; i < stops.length - 1; i++) {
    const a0 = stops[i].angle;
    const a1 = stops[i + 1].angle;

    const c0 = stops[i].color;
    const c1 = stops[i + 1].color;

    const steps = Math.max(1, Math.floor((a1 - a0) * 2)); // 2px per degree

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const angle = ((a0 + (a1 - a0) * t) * Math.PI) / 180 + offset;
      const nextAngle =
        ((a0 + (a1 - a0) * (t + 1 / steps)) * Math.PI) / 180 + offset;

      ctx.strokeStyle = lerpColor(c0, c1, t);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, angle, nextAngle);
      ctx.stroke();
    }
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
  const labelDegs = [0, 60, 120, 180, 240, 300];

  ctx.fillStyle = "#000";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const deg of labelDegs) {
    // Dial-relative angle
    const dialDeg = deg + dialRotationDeg;

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
    ctx.fillText(`${deg}°`, 0, 0);
    ctx.restore();
  }
}
