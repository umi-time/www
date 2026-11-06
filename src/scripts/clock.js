const LOCATIONS = {
  pismo: {
    name: "Pismo Beach",
    latitude: 35.14,
    longitude: -120.64,
    timeZone: "America/Los_Angeles",
  },

  honolulu: {
    name: "Honolulu",
    latitude: 21.31,
    longitude: -157.86,
    timeZone: "Pacific/Honolulu",
  },

  newyork: {
    name: "New York",
    latitude: 40.71,
    longitude: -74.01,
    timeZone: "America/New_York",
  },

  london: {
    name: "London",
    latitude: 51.51,
    longitude: -0.13,
    timeZone: "Europe/London",
  },

  cairo: {
    name: "Cairo",
    latitude: 30.04,
    longitude: 31.24,
    timeZone: "Africa/Cairo",
  },

  mumbai: {
    name: "Mumbai",
    latitude: 19.08,
    longitude: 72.88,
    timeZone: "Asia/Kolkata",
  },

  singapore: {
    name: "Singapore",
    latitude: 1.35,
    longitude: 103.82,
    timeZone: "Asia/Singapore",
  },

  tokyo: {
    name: "Tokyo",
    latitude: 35.68,
    longitude: 139.69,
    timeZone: "Asia/Tokyo",
  },

  sydney: {
    name: "Sydney",
    latitude: -33.87,
    longitude: 151.21,
    timeZone: "Australia/Sydney",
  },

  fairbanks: {
    name: "Fairbanks",
    latitude: 64.84,
    longitude: -147.72,
    timeZone: "America/Anchorage",
  }
};

const TIPS = [
  {
    focus: "Umi‑Time",
    explanation: "It shows UTC in a locally meaningful way.",
  },

  {
    focus: "Notice the larger number.",
    explanation: "It is the current Umi‑Time.",
  },

  {
    focus: "Notice the umi symbol.",
    explanation: "Umi are units of time.",
  },

  {
    focus: "Notice the smaller number.",
    explanation: "It shows the current umi-second.",
  },

  {
    focus: "Notice the values around the dial.",
    explanation: "They are umi values.",
  },

  {
    focus: "Notice the large hand.",
    explanation: "It points to the current umi.",
  },

  {
    focus: "Notice the thin hand.",
    explanation: "It shows the seconds within the current umi.",
  },

  {
    focus: "Notice the dial.",
    explanation: "It rotates with longitude.",
  },

  {
    focus: "Notice the top of the dial.",
    explanation: "It always represents local solar noon.",
  },

  {
    focus: "Notice the bottom of the dial.",
    explanation: "It always represents local solar midnight.",
  },

  {
    focus: "Notice the colored ring.",
    explanation: "It shows daylight, twilight, and night.",
  },

  {
    focus: "Notice the lit bezel segment.",
    explanation: "It shows the current local hour.",
  },

  {
    focus: "Notice that the bezel is fixed.",
    explanation: "It provides a reference for your local solar day.",
  },

  {
    focus: "Notice the city selector.",
    explanation: "Try viewing the clock from another location.",
  },

  {
    focus: "Try another city.",
    explanation: "The Umi‑Time stays the same everywhere on Earth.",
  },

  {
    focus: "Notice what changed.",
    explanation: "The dial rotates, but the Umi‑Time does not change.",
  },

  {
    focus: "Notice what stayed the same.",
    explanation: "Everyone on Earth shares the same Umi‑Time.",
  },

  {
    focus: "Notice the conceptual layers.",
    explanation: "1. UTC 2. Umi‑Time 3. local day 4. solar events.",
  },

  {
    focus: "Notice the clock as a whole.",
    explanation: "It shows universal time personalized for your location.",
  },

  {
    focus: "Notice the relationship to UTC.",
    explanation: "0<sup>u</sup> occurs at UTC midnight.",
  },

  {
    focus: "Notice the size of a day.",
    explanation: "A day contains 360 umi.",
  },

  {
    focus: "Notice the size of an umi.",
    explanation: "Each umi contains exactly 240 seconds.",
  },

  {
    focus: "Notice the simplicity.",
    explanation: "Umi‑Time uses the same seconds as UTC.",
  },

  {
    focus: "Notice the advantage.",
    explanation: "One global time. Many local experiences.",
  },
];

// ---------------------------------------------------------
// DOM references
// ---------------------------------------------------------

const configurationBtn = document.getElementById("configurationToggle");
const fullscreenBtn = document.getElementById("fullscreenToggle");
const clockWrapper = document.getElementById("clockWrapper");
const clockContainer = document.getElementById("umi-clock");

const configurationRegion = document.getElementById("configurationRegion");
const controlPanel = document.getElementById("controlPanel");
const select = document.getElementById("locationSelect");
const showTipsCheckbox = document.getElementById("showTips");

const tipsPanel = document.getElementById("tipsPanel");
const tipText = document.getElementById("tipText");
const tipFocus = tipText.querySelector(".tip-focus");
const tipExplanation = tipText.querySelector(".tip-explanation");

let currentTipIndex = 0;
let tipTimer = null;
let detailTimer = null;
let myLocation = null;

const tipDelay = 2000;
const detailDelay = 3000; // 3 seconds before showing detail
const tipInterval = 12000; // 12 seconds between tips

Object.entries(LOCATIONS).forEach(([key, location]) => {
  const option = document.createElement("option");

  option.value = key;
  option.textContent = location.name;

  select.appendChild(option);
});

// ---------------------------------------------------------
// Configuration toggle
// ---------------------------------------------------------

configurationBtn.addEventListener("click", () => {
  const isVisible = controlPanel.style.display === "flex";

  updatePanelVisibility(!isVisible);

  localStorage.setItem("umiClockConfigurationVisible", isVisible ? "0" : "1");

  updateClockBounds();
});

function updatePanelVisibility(showControlPanel) {
  const tipsEnabled = showTipsCheckbox.checked;

  controlPanel.style.display = showControlPanel ? "flex" : "none";

  if (!showControlPanel && tipsEnabled) {
    tipsPanel.style.display = "flex";
    startTipCycle();
  } else {
    tipsPanel.style.display = "none";
    stopTipCycle();
  }
}

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
    updatePanelVisibility(true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const umiClock = document.getElementById("umi-clock");

      addMyLocationOption(lat, lon);
      select.value = "__my_location__";

      updateLocationForClock();
    },
    () => {
      select.value = "pismo";
      updateLocationForClock();
      updatePanelVisibility(true);
    },
  );
}

function addMyLocationOption(lat, lon) {
  const option = document.createElement("option");

  option.value = "__my_location__";
  option.textContent = "My Location";

  select.insertBefore(option, select.firstChild);

  myLocation = {
    latitude: lat,
    longitude: lon,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function updateLocationForClock() {
  const umiClock = document.getElementById("umi-clock");

  if (select.value === "__my_location__" && myLocation) {
    umiClock.setAttribute("latitude", myLocation.latitude);
    umiClock.setAttribute("longitude", myLocation.longitude);
    umiClock.setAttribute("timezone", myLocation.timeZone);

    return;
  }

  const location = LOCATIONS[select.value];

  if (location) {
    umiClock.setAttribute("latitude", location.latitude);
    umiClock.setAttribute("longitude", location.longitude);
    umiClock.setAttribute("timezone", location.timeZone);
  }
}

select.addEventListener("change", () => {
  updateLocationForClock();
});

// ---------------------------------------------------------
// Tips display management
// ---------------------------------------------------------

function showTip(index) {
  if (!tipFocus || !tipExplanation) return;

  const tip = TIPS[index];

  clearTimeout(detailTimer);

  tipFocus.classList.remove("tip-visible");
  tipExplanation.classList.remove("tip-visible");

  setTimeout(() => {
    // Stage 1: focus text only
    tipFocus.innerHTML = tip.focus;
    tipExplanation.innerHTML = "&nbsp;";

    tipFocus.classList.add("tip-visible");

    // Stage 2: add explanation after a few seconds
    detailTimer = setTimeout(() => {
      tipExplanation.innerHTML = tip.explanation;
      tipExplanation.classList.add("tip-visible");
    }, detailDelay);
  }, tipDelay);
}

function startTipCycle() {
  stopTipCycle();

  showTip(currentTipIndex);

  tipTimer = setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % TIPS.length;

    showTip(currentTipIndex);
  }, tipInterval);
}

function stopTipCycle() {
  if (tipTimer) {
    clearInterval(tipTimer);
    tipTimer = null;
  }
}

showTipsCheckbox.addEventListener("change", () => {
  const enabled = showTipsCheckbox.checked;

  localStorage.setItem("umiClockShowTips", enabled ? "1" : "0");

  updatePanelVisibility(controlPanel.style.display === "flex");
});

// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

// Hide clock immediately so no movement from (0,0) is visible
clockContainer.classList.add("clock-hidden");

// Restore configuration mode
const isControlPanelVisible =
  localStorage.getItem("umiClockConfigurationVisible") === "1";

updatePanelVisibility(isControlPanelVisible);

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
  const MAX_CLOCK_SIZE_RATIO = 0.8;
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
