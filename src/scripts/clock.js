//
// Umi‑Time Clock — JS Controller (Optimized)
//

import { UmiTime } from "umi-time";

// ---------------------------------------------------------
// DOM references
// ---------------------------------------------------------

const configurationBtn = document.getElementById("configurationToggle");
const fullscreenBtn = document.getElementById("fullscreenToggle");
const clockWrapper = document.getElementById("clockWrapper");
const clockContainer = document.getElementById("umi-clock");

const configurationRegion = document.getElementById("configurationRegion");

const manualLocation = document.querySelector(".manual-location");
const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");

// ---------------------------------------------------------
// Configuration toggle
// ---------------------------------------------------------

configurationBtn.addEventListener("click", () => {
  const isVisible = configurationRegion.style.display === "block";
  configurationRegion.style.display = isVisible ? "none" : "block";
  localStorage.setItem("umiClockConfigurationVisible", isVisible ? "0" : "1");

  updateClockBounds();
});

// ---------------------------------------------------------
// Fullscreen toggle
// ---------------------------------------------------------

fullscreenBtn.addEventListener("click", () => {
  const isFullscreen = document.body.classList.toggle("clock-fullscreen");
  localStorage.setItem("umiClockFullscreen", isFullscreen ? "1" : "0");

  updateClockBounds();
});

// ---------------------------------------------------------
// Bouncing movement
// ---------------------------------------------------------

let x = 0;
let y = 0;
let vx = 0.18;
let vy = 0.14;
let clockScale = 1;

// Cached bounding boxes (updated on resize)
let cw = clockWrapper.getBoundingClientRect();
let cc = clockContainer.getBoundingClientRect();

function randomVelocityAdjustment(current) {
  // Smooth delta instead of triangular distribution
  const delta = (Math.random() - 0.5) * 0.1;
  let updated = current + delta;

  const minMag = 0.1;
  const maxMag = 0.5;

  if (Math.abs(updated) < minMag) {
    updated = minMag * (updated < 0 ? -1 : 1);
  } else if (Math.abs(updated) > maxMag) {
    updated = maxMag * (updated < 0 ? -1 : 1);
  }

  return updated;
}

function bounce() {
  const nearLeft = x < 40;
  const nearRight = x + cc.width > cw.width - 40;
  const nearTop = y < 40;
  const nearBottom = y + cc.height > cw.height - 40;

  const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);

  if (inCorner) {
    // Stronger deterministic push toward center
    const centerX = cw.width / 2;
    const centerY = cw.height / 2;

    const dx = centerX - (x + cc.width / 2);
    const dy = centerY - (y + cc.height / 2);

    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;

    vx = nx * 0.35 + (Math.random() - 0.5) * 0.12;
    vy = ny * 0.35 + (Math.random() - 0.5) * 0.12;
  } else if (x < 0) {
    vx = randomVelocityAdjustment(Math.abs(vx));
    vy = randomVelocityAdjustment(vy);
  } else if (x + cc.width > cw.width) {
    vx = randomVelocityAdjustment(-Math.abs(vx));
    vy = randomVelocityAdjustment(vy);
  } else if (y < 0) {
    vx = randomVelocityAdjustment(vx);
    vy = randomVelocityAdjustment(Math.abs(vy));
  } else if (y + cc.height > cw.height) {
    vx = randomVelocityAdjustment(vx);
    vy = randomVelocityAdjustment(-Math.abs(vy));
  }
}

function animateClock() {
  x += vx;
  y += vy;

  if (x <= 0 || x + cc.width >= cw.width) bounce();
  if (y <= 0 || y + cc.height >= cw.height) bounce();

  constrainClockPosition(x, y);

  requestAnimationFrame(animateClock);
}

// ---------------------------------------------------------
// Geolocation fallback
// ---------------------------------------------------------

function initLocation() {
  if (!navigator.geolocation) {
    manualLocation.style.display = "block";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      latInput.value = lat;
      lonInput.value = lon;

      const umiClock = document.getElementById("umi-clock");
      umiClock.setAttribute("latitude", lat);
      umiClock.setAttribute("longitude", lon);
    },
    () => {
      manualLocation.style.display = "block";
    }
  );
}

latInput.addEventListener("input", () => {
  const umiClock = document.getElementById("umi-clock");
  umiClock.setAttribute("latitude", latInput.value);
});

lonInput.addEventListener("input", () => {
  const umiClock = document.getElementById("umi-clock");
  umiClock.setAttribute("longitude", lonInput.value);
});

// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

// Hide clock immediately so no movement from (0,0) is visible
clockContainer.classList.add("clock-hidden");

// Restore configuration mode
if (localStorage.getItem("umiClockConfigurationVisible") === "1") {
  configurationRegion.style.display = "block";
}

// Restore fullscreen mode
if (localStorage.getItem("umiClockFullscreen") === "1") {
  document.body.classList.add("clock-fullscreen");
}

initLocation();

// Randomize starting position BEFORE animation begins
updateClockBounds(true);

// Fade in after position is set
setTimeout(() => {
  clockContainer.classList.remove("clock-hidden");
  clockContainer.classList.add("clock-fade-in");
}, 500);

requestAnimationFrame(animateClock);

// Keep clock inside bounds on resize
window.addEventListener("resize", () => updateClockBounds());

function updateClockBounds(init = false) {
  cw = clockWrapper.getBoundingClientRect();

  // Apply scaling first
  const scale = applyClockScale();

  if (init) {
    x = Math.random() * (cw.width - cc.width);
    y = Math.random() * (cw.height - cc.height);
  }

  constrainClockPosition(x, y);
}

function constrainClockPosition(clockX, clockY) {
  clockX = Math.min(clockX, cw.width - cc.width);
  clockY = Math.min(clockY, cw.height - cc.height);

  clockX = Math.max(0, clockX);
  clockY = Math.max(0, clockY);

  x = clockX;
  y = clockY;

  const scaledX = clockX / clockScale;
  const scaledY = clockY / clockScale;

  clockContainer.style.transform = `translate(${scaledX}px, ${scaledY}px)`;
}

function applyClockScale() {
  const MAX_CLOCK_SIZE_RATIO = 0.80;
  const TARGET_CLOCK_SIZE_RATIO = 0.75;

  const availableW = cw.width;
  const availableH = cw.height;
  const clockW = cc.width / clockScale;
  const clockH = cc.height / clockScale;

  const ratioW = clockW / availableW;
  const ratioH = clockH / availableH;

  // Choose the larger ratio factor
  let ratio = Math.max(ratioW, ratioH);

  let scale = 1;
  if (ratio > MAX_CLOCK_SIZE_RATIO) {
    scale = TARGET_CLOCK_SIZE_RATIO / ratio;
  }

  // Due to rounding errors, scale values may not be exact, so we check if the scale has actually changed before applying it.
  if (Math.abs(scale - clockScale) > 0.001) {
    // Apply scale
    clockContainer.style.scale = scale;
    clockScale = scale;

    // Recompute clock bounding box after scaling
    cc = clockContainer.getBoundingClientRect();

    let logInfo = `Scale ${scale}, ClockWidth ${cc.width}, ClockHeight ${cc.height}, AvailableW ${cw.width}, AvailableH ${cw.height}, ratio ${ratio}`;
    console.log(logInfo);

    // Recompute bounding box after scaling
    updateClockBounds();
  }
  
  return scale;
}
