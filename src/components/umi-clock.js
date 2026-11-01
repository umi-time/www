// ============================================================================
// <umi-clock> Web Component — Full Working Implementation
// ============================================================================

import { UmiTime } from "umi-time";

class UmiClock extends HTMLElement {
  static get observedAttributes() {
    return ["latitude", "longitude", "size", "dark", "update-interval"];
  }

  constructor() {
    super();

    // Shadow DOM
    this.attachShadow({ mode: "open" });

    // Internal state
    this.latitude = 0;
    this.longitude = 0;
    this.size = "900px";
    this.darkMode = false;
    this.updateInterval = 100;

    // Cache solar geometry for the current minute
    this._lastSolarMinute = null;
    this._lastSolarData = null;

    this._timer = null;

    // Root container
    this.root = document.createElement("div");
    this.root.className = "umi-clock-root";
    this.root.style.width = this.size;
    this.root.style.height = this.size;
    this.root.style.position = "relative";

    // Fixed solar ring bezel
    this.solarRing = document.createElement("div");
    this.solarRing.className = "solar-ring";
    this.solarRing.id = "solarRing";
    this.solarRing.style.position = "absolute";
    this.solarRing.style.left = "0";
    this.solarRing.style.top = "0";
    this.solarRing.style.transform = "none";
    this.solarRing.style.borderRadius = "50%";
    this.root.appendChild(this.solarRing);

    // SVG container
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("id", "clockSvg");
    this.svg.setAttribute("viewBox", "0 0 72 72");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");

    this.root.appendChild(this.svg);
    this.shadowRoot.appendChild(this.root);

    // Create initial SVG elements
    this.createSVGElements();

    // Bind update
    this.update = this.update.bind(this);
  }

  get outerRadius() {
    return 27.5;
  }

  get dialBackground() {
    return this.darkMode ? "#080808" : "#f7f7f7";
  }

  get foregroundColor() {
    return this.darkMode ? "#fff" : "#000";
  }

  // Utility: create SVG group
  _makeGroup(id) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    return g;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  connectedCallback() {
    this.resizeSolarRing();
    this.start();
  }

  disconnectedCallback() {
    this.stop();
  }

  // ---------------------------------------------------------------------------
  // Attribute changes
  // ---------------------------------------------------------------------------
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "latitude":
        this.clampLatitude(parseFloat(newValue));
        break;
      case "longitude":
        this.clampLongitude(parseFloat(newValue));
        break;
      case "size":
        this.size = newValue;
        this.root.style.width = this.size;
        this.root.style.height = this.size;
        this.resizeSolarRing();
        break;
      case "dark":
        this.darkMode = newValue === "true";
        this.updateDarkMode();
        break;
      case "update-interval":
        this.updateInterval = parseInt(newValue, 10);
        this.restart();
        break;
    }

    this.refresh();
  }

  resizeSolarRing() {
    if (this.solarRing) {
      this.solarRing.style.width = this.size;
      this.solarRing.style.height = this.size;

      // The mask for the solar ring must be recalculated whenever the size changes
      const sizeValue = parseInt(this.size, 10);

      const minRadius = (sizeValue / 2) * (this.outerRadius / 36);
      const maxRadius = (sizeValue / 2) * (30 / 36);

      this.solarRing.style.mask = `radial-gradient(circle, transparent 0, transparent ${minRadius}px, black ${minRadius}px, black ${maxRadius}px, transparent ${maxRadius}px, transparent 100%)`;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  refresh() {
    this.update();
  }

  setLocation(lat, lon) {
    this.clampLatitude(lat);
    this.clampLongitude(lon);
    this.setAttribute("latitude", lat);
    this.setAttribute("longitude", lon);
    this._lastSolarMinute = null;
    this.refresh();
  }

  setSize(size) {
    this.size = size;
    this.setAttribute("size", size);
  }

  // ---------------------------------------------------------------------------
  clampLatitude(lat) {
    if (isNaN(lat)) return;
    if (lat > 90) lat = 90;
    if (lat < -90) lat = -90;
    this.latitude = lat
    this._lastSolarMinute = null;
  }

  clampLongitude(lon) {
    if (isNaN(lon)) return;
    if (lon > 180) lon = 180;
    if (lon < -180) lon = -180;
    this.longitude = lon;
    this._lastSolarMinute = null;
  }

  // ---------------------------------------------------------------------------
  // Update loop control
  // ---------------------------------------------------------------------------
  start() {
    this.stop();
    const tick = () => {
      this.update();
      this._timer = requestAnimationFrame(tick);
    };
    this._timer = requestAnimationFrame(tick);
  }

  stop() {
    if (this._timer) cancelAnimationFrame(this._timer);
    this._timer = null;
  }

  restart() {
    this.start();
  }

  // ---------------------------------------------------------------------------
  // SVG Elements
  // ---------------------------------------------------------------------------
  createSVGElements() {
    // Clear SVG
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    this.svg.appendChild(this.createSVGStyles());
    this.svg.appendChild(this.createSVGDefs());
    this.svg.appendChild(this.createDial());
    this.svg.appendChild(this.createDigitalDisplay());
    this.svg.appendChild(this.createSunIndicatorGroup());
    this.svg.appendChild(this.createBezel());
  }

  createSVGStyles() {
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = `
    .outer-background-shading { fill: #808080; opacity: 0.24; stroke: none; }
    .inner-background-shading { fill: #808080; opacity: 0.62; stroke: none; }
    .compass-ring { fill: none; stroke: #444444; stroke-width: 0.4; }
    .cardinal-point { fill: #888888; stroke: #444444; stroke-width: 0.2; }
    .ordinal-point { fill: #666666; stroke: #444444; stroke-width: 0.2; }
    .tick-line { stroke: #555555; stroke-width: 0.3; stroke-linecap: round; }
    #bezelGroup.dark-mode .tick-line { stroke: #bbbbbb; }
    #dial { transition: transform 1.5s ease-in-out; }
    `;
    return style;
  }

  createSVGDefs() {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    defs.appendChild(this.createDialMask());
    defs.appendChild(this.createDialDropShadow());
    defs.appendChild(this.createHandDropShadow());
    defs.appendChild(this.createBevelLeftGradient());
    defs.appendChild(this.createBevelRightGradient());
    defs.appendChild(this.createCardinalPoint());
    defs.appendChild(this.createOrdinalPoint());
    defs.appendChild(this.createHandMask());

    return defs;
  }

  createDialMask() {
    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.setAttribute("id", "solarBezelMask");

    // Full rect (mask area)
    const maskRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    maskRect.setAttribute("x", "0");
    maskRect.setAttribute("y", "0");
    maskRect.setAttribute("width", "72");
    maskRect.setAttribute("height", "72");
    maskRect.setAttribute("fill", "black");
    mask.appendChild(maskRect);

    // Inner transparent circle (hole)
    const inner = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    inner.setAttribute("cx", "36");
    inner.setAttribute("cy", "36");
    inner.setAttribute("r", "26"); // inner radius
    inner.setAttribute("fill", "white");
    mask.appendChild(inner);

    // Outer transparent circle (outside)
    const outer = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    outer.setAttribute("cx", "36");
    outer.setAttribute("cy", "36");
    outer.setAttribute("r", "30"); // outer radius
    outer.setAttribute("fill", "white");
    mask.appendChild(outer);

    return mask;
  }

  createDialDropShadow() {
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter",
    );
    filter.setAttribute("id", "dropShadow");

    const feDropShadow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feDropShadow",
    );
    feDropShadow.setAttribute("dx", "0");
    feDropShadow.setAttribute("dy", "0");
    feDropShadow.setAttribute("stdDeviation", "2");
    feDropShadow.setAttribute("flood-color", "#000");
    feDropShadow.setAttribute("flood-opacity", "0.35");
    filter.appendChild(feDropShadow);

    return filter;
  }

  createHandDropShadow() {
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter",
    );
    filter.setAttribute("id", "hand-shadow");
    filter.setAttribute("x", "-30%");
    filter.setAttribute("y", "-30%");
    filter.setAttribute("width", "160%");
    filter.setAttribute("height", "160%");

    const feDropShadow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feDropShadow",
    );
    feDropShadow.setAttribute("dx", "0");
    feDropShadow.setAttribute("dy", "0");
    feDropShadow.setAttribute("stdDeviation", "0.4");
    feDropShadow.setAttribute("flood-color", "#000000");
    feDropShadow.setAttribute("flood-opacity", "0.4");
    filter.appendChild(feDropShadow);

    return filter;
  }

  createBevelLeftGradient() {
    const bevelLeft = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient",
    );
    bevelLeft.setAttribute("id", "bevel-left");
    bevelLeft.setAttribute("x1", "0%");
    bevelLeft.setAttribute("y1", "0%");
    bevelLeft.setAttribute("x2", "100%");
    bevelLeft.setAttribute("y2", "0%");

    const stop1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#4a4a4a");
    bevelLeft.appendChild(stop1);

    const stop2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop2.setAttribute("offset", "60%");
    stop2.setAttribute("stop-color", "#656565");
    bevelLeft.appendChild(stop2);

    const stop3 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop3.setAttribute("offset", "100%");
    stop3.setAttribute("stop-color", "#808080");
    bevelLeft.appendChild(stop3);

    return bevelLeft;
  }

  createBevelRightGradient() {
    const bevelRight = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient",
    );
    bevelRight.setAttribute("id", "bevel-right");
    bevelRight.setAttribute("x1", "0%");
    bevelRight.setAttribute("y1", "0%");
    bevelRight.setAttribute("x2", "100%");
    bevelRight.setAttribute("y2", "0%");

    const stop4 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop4.setAttribute("offset", "0%");
    stop4.setAttribute("stop-color", "#202020");
    bevelRight.appendChild(stop4);

    const stop5 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop5.setAttribute("offset", "40%");
    stop5.setAttribute("stop-color", "#303030");
    bevelRight.appendChild(stop5);

    const stop6 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop6.setAttribute("offset", "100%");
    stop6.setAttribute("stop-color", "#454545");
    bevelRight.appendChild(stop6);

    return bevelRight;
  }

  createCardinalPoint() {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "cardinal-3d");

    const leftBevel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    leftBevel.setAttribute("points", "0,-30 -2,-30 0,-35");
    leftBevel.setAttribute("fill", "url(#bevel-left)");
    g.appendChild(leftBevel);

    const rightBevel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    rightBevel.setAttribute("points", "0,-30 2,-30 0,-35");
    rightBevel.setAttribute("fill", "url(#bevel-right)");
    g.appendChild(rightBevel);

    const outline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    outline.setAttribute("points", "0,-30 -2,-30 0,-35 2,-30");
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "#333333");
    outline.setAttribute("stroke-width", "0.2");
    g.appendChild(outline);

    return g;
  }

  createOrdinalPoint() {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "ordinal-3d");

    const leftBevel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    leftBevel.setAttribute("points", "0,-30 -1.2,-30 0,-34");
    leftBevel.setAttribute("fill", "url(#bevel-left)");
    g.appendChild(leftBevel);

    const rightBevel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    rightBevel.setAttribute("points", "0,-30 1.2,-30 0,-34");
    rightBevel.setAttribute("fill", "url(#bevel-right)");
    g.appendChild(rightBevel);

    const outline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    outline.setAttribute("points", "0,-30 -1.2,-30 0,-34 1.2,-30");
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "#333333");
    outline.setAttribute("stroke-width", "0.2");
    g.appendChild(outline);

    return g;
  }

  createHandMask() {
    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.setAttribute("id", "hand-mask");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "-36");
    rect.setAttribute("y", "-36");
    rect.setAttribute("width", "72");
    rect.setAttribute("height", "72");
    rect.setAttribute("fill", "#ffffff");
    mask.appendChild(rect);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M -0.85,-0.85 A 1.2 1.2 0 1 0 0.85,-0.85 L 1.56,-1.56 A 2.2 2.2 0 1 1 -1.56,-1.56 Z",
    );
    path.setAttribute("fill", "#000000");
    mask.appendChild(path);

    return mask;
  }

  createDial() {
    this.dial = this._makeGroup("dial");

    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    background.setAttribute("cx", "0");
    background.setAttribute("cy", "0");
    background.setAttribute("r", this.outerRadius);
    background.setAttribute("fill", this.dialBackground);
    this.dial.appendChild(background);
    this._dialBackgroundCircle = background;

    this.dial.appendChild(this.createThinTicks());
    this.dial.appendChild(this.createLargeTicks());
    this.dial.appendChild(this.createLabels());
    this.dial.appendChild(this.createLargeHand());
    this.dial.appendChild(this.createSmallHand());

    return this.dial;
  }

  createThinTicks() {
    if (this._cachedThinTicks) return this._cachedThinTicks;

    const group = this._makeGroup("thinTicks");

    for (let deg = 0; deg < 360; deg += 3) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `rotate(${deg})`);

      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", -0.15);
      r.setAttribute("y", -this.outerRadius);
      r.setAttribute("width", 0.25);
      r.setAttribute("height", 2);
      r.setAttribute("fill", "#777");

      g.appendChild(r);
      group.appendChild(g);
    }

    this._cachedThinTicks = group;
    return group;
  }

  createLargeTicks() {
    if (this._cachedLargeTicks) return this._cachedLargeTicks;

    const group = this._makeGroup("largeTicks");

    for (let deg = 0; deg < 360; deg += 15) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `rotate(${deg})`);

      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", -0.375);
      r.setAttribute("y", -this.outerRadius);
      r.setAttribute("width", deg % 30 === 0 ? 0.75 : 0.5);
      r.setAttribute("height", deg % 30 === 0 ? 3.5 : 3);
      r.setAttribute("fill", "#777");

      g.appendChild(r);
      group.appendChild(g);
    }

    this._cachedLargeTicks = group;
    return group;
  }

  createLabels() {
    if (this._cachedLabels) return this._cachedLabels;

    const labels = this._makeGroup("labels");

    const umiSymbolPath = "M 153.7 39.4 A 76 76 0 1 1 46.3 39.4";

    [30, 90, 150, 210, 270, 330].forEach((umi) => {
      const radius = this.outerRadius - 5.75;
      const rad = ((umi - 90) * Math.PI) / 180;
      const x = radius * Math.cos(rad);
      const y = radius * Math.sin(rad);

      // Measure width once
      const temp = document.createElementNS("http://www.w3.org/2000/svg", "text");
      temp.setAttribute("x", 0);
      temp.setAttribute("y", 0);
      temp.setAttribute("font-size", "3");
      temp.textContent = umi;
      this.svg.appendChild(temp);
      const bbox = temp.getBBox();
      const numberWidth = bbox.width;
      temp.remove();

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `rotate(${umi} ${x} ${y})`);
      labels.appendChild(g);

      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x);
      t.setAttribute("y", y);
      t.setAttribute("font-size", "3");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("fill", this.foregroundColor);
      t.textContent = umi;
      g.appendChild(t);

      const symbol = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const symbolX = x + numberWidth / 2 + 0.25;
      const symbolY = y - 1.5;

      symbol.setAttribute("x", symbolX);
      symbol.setAttribute("y", symbolY);
      symbol.setAttribute("width", "1.2");
      symbol.setAttribute("height", "1.2");
      symbol.setAttribute("viewBox", "0 0 200 200");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", umiSymbolPath);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", this.foregroundColor);
      path.setAttribute("stroke-width", "45.6");
      path.setAttribute("stroke-linecap", "butt");

      symbol.appendChild(path);
      g.appendChild(symbol);
    });

    this._cachedLabels = labels;
    this.labels = labels; // keep your existing reference

    return labels;
  }

  createLargeHand() {
    this.largeHandGroup = this._makeGroup("largeHandGroup");
    this.largeHandGroup.setAttribute("filter", "url(#hand-shadow)");
    this.largeHandGroup.setAttribute("mask", "url(#hand-mask)");

    const pathLeft = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathLeft.setAttribute("d", "M -3,0 A 3 3 0 0 0 0,3 L 0,-20 Z");
    pathLeft.setAttribute("fill", "url(#bevel-left)");
    this.largeHandGroup.appendChild(pathLeft);

    const pathRight = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathRight.setAttribute("d", "M 3,0 A 3 3 0 0 1 0,3 L 0,-20 Z");
    pathRight.setAttribute("fill", "url(#bevel-right)");
    this.largeHandGroup.appendChild(pathRight);

    const pathBorder = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathBorder.setAttribute("d", "M -3,0 A 3 3 0 1 0 3,0 L 0,-20 Z");
    pathBorder.setAttribute("fill", "none");
    pathBorder.setAttribute("stroke", "#808080");
    pathBorder.setAttribute("stroke-width", "0.25");
    this.largeHandGroup.appendChild(pathBorder);

    return this.largeHandGroup;
  }

  createSmallHand() {
    this.smallHandGroup = this._makeGroup("smallHandGroup");
    const centerCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    centerCircle.setAttribute("cx", "0");
    centerCircle.setAttribute("cy", "0");
    centerCircle.setAttribute("r", "1");
    centerCircle.setAttribute("fill", "#aaa");
    centerCircle.setAttribute("stroke", "#999");
    centerCircle.setAttribute("stroke-width", "0.25");
    this.smallHandGroup.appendChild(centerCircle);

    const secondHand = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    secondHand.setAttribute("x1", "0");
    secondHand.setAttribute("y1", "0");
    secondHand.setAttribute("x2", "0");
    secondHand.setAttribute("y2", "-24");
    secondHand.setAttribute("stroke", "#aaa");
    secondHand.setAttribute("stroke-width", "0.6");
    secondHand.setAttribute("stroke-linecap", "round");
    this.smallHandGroup.appendChild(secondHand);

    return this.smallHandGroup;
  }

  createDigitalDisplay() {
    this.digital = this._makeGroup("digitalTime");

    // Tiny rotation to eliminate baseline jitter
    this.digital.setAttribute("transform", "translate(36, 36) rotate(0.1)");

    return this.digital;
  }

  createSunIndicatorGroup() {
    this.sunIndicatorGroup = this._makeGroup("sunIndicatorGroup");
    this.sunIndicatorGroup.setAttribute("transform", "translate(36, 36)");
    return this.sunIndicatorGroup;
  }

  createBezel() {
    this.bezel = this._makeGroup("bezelGroup");
    this.bezel.setAttribute("transform", `translate(36,36)`);

    const innerBackground = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    innerBackground.setAttribute("class", "inner-background-shading");
    innerBackground.setAttribute("fill-rule", "evenodd");
    innerBackground.setAttribute(
      "d",
      "M 0,-32.4 A 32.4,32.4 0 1,1 -0.01,-32.4 Z M 0,-30 A 30,30 0 1,0 0.01,-30 Z",
    );
    this.bezel.appendChild(innerBackground);

    const outerBackground = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    outerBackground.setAttribute("class", "outer-background-shading");
    outerBackground.setAttribute("fill-rule", "evenodd");
    outerBackground.setAttribute(
      "d",
      "M 0,-35 A 35,35 0 1,1 -0.01,-35 Z M 0,-32.4 A 32.4,32.4 0 1,0 0.01,-32.4 Z",
    );
    this.bezel.appendChild(outerBackground);

    const baseRing = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    baseRing.setAttribute("class", "compass-ring");
    baseRing.setAttribute("r", "30");
    baseRing.setAttribute("cx", "0");
    baseRing.setAttribute("cy", "0");
    this.bezel.appendChild(baseRing);

    const northPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    northPoint.setAttribute("href", "#cardinal-3d");
    this.bezel.appendChild(northPoint);

    const eastPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    eastPoint.setAttribute("href", "#cardinal-3d");
    eastPoint.setAttribute("transform", "rotate(90)");
    this.bezel.appendChild(eastPoint);

    const southPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    southPoint.setAttribute("href", "#cardinal-3d");
    southPoint.setAttribute("transform", "rotate(180)");
    this.bezel.appendChild(southPoint);

    const westPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    westPoint.setAttribute("href", "#cardinal-3d");
    westPoint.setAttribute("transform", "rotate(270)");
    this.bezel.appendChild(westPoint);

    const northEastPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    northEastPoint.setAttribute("href", "#ordinal-3d");
    northEastPoint.setAttribute("transform", "rotate(45)");
    this.bezel.appendChild(northEastPoint);

    const southEastPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    southEastPoint.setAttribute("href", "#ordinal-3d");
    southEastPoint.setAttribute("transform", "rotate(135)");
    this.bezel.appendChild(southEastPoint);

    const southWestPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    southWestPoint.setAttribute("href", "#ordinal-3d");
    southWestPoint.setAttribute("transform", "rotate(225)");
    this.bezel.appendChild(southWestPoint);

    const northWestPoint = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    northWestPoint.setAttribute("href", "#ordinal-3d");
    northWestPoint.setAttribute("transform", "rotate(315)");
    this.bezel.appendChild(northWestPoint);

    const intermediateTicks = [
      15, 30, 60, 75, 105, 120, 150, 165, 195, 210, 240, 255, 285, 300, 330,
      345,
    ];
    intermediateTicks.forEach((angle) => {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", "0");
      line.setAttribute("y1", "-30");
      line.setAttribute("x2", "0");
      line.setAttribute("y2", "-32.4");
      line.setAttribute("class", "tick-line");
      line.setAttribute("transform", `rotate(${angle})`);
      this.bezel.appendChild(line);
    });

    return this.bezel;
  }

  updateDarkMode() {
    // First reset the background attribute of the circle based on the dark mode
    const background = this.dial.querySelector("circle");
    if (background) {
      background.setAttribute("fill", this.dialBackground);
    }

    // Next, update the color of the labels and hands based on the dark mode
    const labelTexts = this.labels.querySelectorAll("text");
    labelTexts.forEach((text) => {
      text.setAttribute("fill", this.foregroundColor);
    });

    // Also, update the umi symbol color based on the dark mode
    // Note that there will be multiple path elements if there are multiple umi symbols
    const umiSymbols = this.labels.querySelectorAll("path");
    umiSymbols.forEach((umiSymbol) => {
      umiSymbol.setAttribute("stroke", this.foregroundColor);
    });

    const hands = [this.largeHandGroup, this.smallHandGroup];
    hands.forEach((hand) => {
      const lines = hand.querySelectorAll("line");
      lines.forEach((line) => {
        line.setAttribute("stroke", this.foregroundColor);
      });
    });

    if (this.darkMode) {
      this.bezel.classList.add("dark-mode");
    } else {
      this.bezel.classList.remove("dark-mode");
    }
  }

  // ---------------------------------------------------------------------------
  // Main update loop (your logic)
  // ---------------------------------------------------------------------------
  update() {
    const now = new Date();

    // Compute umi
    const umiObj = new UmiTime(now,
      { value: this.latitude, uncertainty: 0 },
      { value: this.longitude, uncertainty: 0 }
    );

    const umi = umiObj.umi;
    const umiSec = umiObj.second + umiObj.millisecond / 1000;
    const A = 180 + this.longitude;

    // Only recompute dial rotation if longitude changed
    if (this._lastLongitude !== this.longitude) {
      this.dial.setAttribute("transform", `translate(36,36) rotate(${A})`);
      this._lastLongitude = this.longitude;
    }
 
    // Hand rotations
    this.largeHandGroup.setAttribute("transform", `rotate(${umi})`);
    this.smallHandGroup.setAttribute("transform", `rotate(${umiSec * 1.5})`);

    // Solar geometry (cached per minute)
    const { gradient, sunriseDial, sunsetDial } =
      this.computeSunAngles(this.latitude, this.longitude, now);

    this.solarRing.style.background = gradient;
    this.drawSunIndicators(sunriseDial, sunsetDial);

    this.updateDigitalDisplay(A, umi, umiSec, now);
  }

  // ---------------------------------------------------------------------------
  // Sunrise/sunset indicators
  // ---------------------------------------------------------------------------
  drawSunIndicators(sunriseDial, sunsetDial) {
    const group = this.sunIndicatorGroup;

    while (group.firstChild) group.removeChild(group.firstChild);

    if (sunriseDial != null) {
      group.appendChild(this._makeIndicator(sunriseDial));
    }
    if (sunsetDial != null) {
      group.appendChild(this._makeIndicator(sunsetDial));
    }
  }

  _makeIndicator(angle) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `rotate(${angle})`);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 0);
    line.setAttribute("y1", -(this.outerRadius + 2));
    line.setAttribute("x2", 0);
    line.setAttribute("y2", -(this.outerRadius - 2));
    line.setAttribute("stroke", this.foregroundColor);
    line.setAttribute("stroke-width", "0.8");

    g.appendChild(line);
    return g;
  }

  // ---------------------------------------------------------------------------
  // Solar gradient + sunrise/sunset angles
  // ---------------------------------------------------------------------------
  computeSunAngles(lat, lon, date) {
    const minute = date.getUTCMinutes();
    if (minute === this._lastSolarMinute) {
      return this._lastSolarData;
    }

    this._lastSolarMinute = minute;

    const umi = new UmiTime(
      date,
      { value: lat, uncertainty: 0 },
      { value: lon, uncertainty: 0 },
    );

    const decl = umi.solarDeclination;

    const sunriseDial = umi.sunrise !== null ? umi.sunrise + lon + 180 : null;
    const sunsetDial = umi.sunset !== null ? umi.sunset + lon + 180 : null;
    const eotDeg = umi.equationOfTime / 4;

    const D2R = Math.PI / 180;
    const sinL = Math.sin(lat * D2R);
    const cosL = Math.cos(lat * D2R);
    const sinDec = Math.sin(decl * D2R);
    const cosDec = Math.cos(decl * D2R);

    function elevAtHourAngle(haDeg) {
      return (
        Math.asin(sinL * sinDec + cosL * cosDec * Math.cos(haDeg * D2R)) / D2R
      );
    }

    const stops = [];
    for (let deg = 0; deg < 360; deg += 6) {
      const correctedHourAngle = deg + eotDeg;
      const alt = elevAtHourAngle(correctedHourAngle);
      stops.push([deg, this.elevToColor(alt)]);
    }

    const gradient =
      "conic-gradient(" +
      stops.map(([a, c]) => `${c} ${a}deg`).join(", ") +
      ")";

      const result = {
      gradient,
      sunriseDial,
      sunsetDial
    };

    this._lastSolarData = result;
    return result;
  }

  // ---------------------------------------------------------------------------
  // Solar elevation → color
  // ---------------------------------------------------------------------------
  elevToColor(elev) {
    if (elev >= 6) return "#7EC8FF";
    if (elev >= 0) return this.lerpColor("#B9E3FF", "#FFB347", (6 - elev) / 6);
    if (elev >= -6) return this.lerpColor("#FFB347", "#D62828", -elev / 6);
    if (elev >= -18)
      return this.lerpColor("#D62828", "#2A3B55", (-6 - elev) / 12);
    return "#001F3F";
  }

  lerpColor(c1, c2, t) {
    const p = (c) => [
      parseInt(c.slice(1, 3), 16),
      parseInt(c.slice(3, 5), 16),
      parseInt(c.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = p(c1);
    const [r2, g2, b2] = p(c2);
    return (
      "#" +
      [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  // ---------------------------------------------------------------------------
  // Digital display
  // ---------------------------------------------------------------------------
  updateDigitalDisplay(A, umi, umiSec, now) {
    const digital = this.digital;
    digital.innerHTML = "";

    const radius = (this.outerRadius - 6) / 2;

    // Normalize hand angle
    const handAngle = (((A + umi) % 360) + 360) % 360;

    // Determine whether the hand points upward or downward
    const pointingUp = handAngle < 90 || handAngle > 270;

    // Two fixed positions
    const posUpper = { x: 0, y: -radius };
    const posLower = { x: 0, y: radius };

    // Choose position
    const pos = pointingUp ? posLower : posUpper;

    // Umi number
    const t1a = document.createElementNS("http://www.w3.org/2000/svg", "g");
    t1a.setAttribute("transform", `translate(${pos.x}, ${pos.y - 1})`);
    digital.appendChild(t1a);

    const degText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    degText.setAttribute("x", 0);
    degText.setAttribute("y", 0);
    degText.setAttribute("font-size", "4.5");
    degText.setAttribute("text-anchor", "end");
    degText.setAttribute("fill", this.foregroundColor);
    degText.textContent = umi;
    t1a.appendChild(degText);

    // Umi symbol
    const umiSymbol = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    umiSymbol.setAttribute("x", 0);
    umiSymbol.setAttribute("y", -3.5);
    umiSymbol.setAttribute("width", "1.5");
    umiSymbol.setAttribute("height", "1.5");
    umiSymbol.setAttribute("viewBox", "0 0 200 200");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 153.7 39.4 A 76 76 0 1 1 46.3 39.4");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", this.foregroundColor);
    path.setAttribute("stroke-width", "45.6");
    path.setAttribute("stroke-linecap", "butt");

    umiSymbol.appendChild(path);
    t1a.appendChild(umiSymbol);

    // Umi seconds
    const t1b = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t1b.setAttribute("x", pos.x + 1.5);
    t1b.setAttribute("y", pos.y - 1);
    t1b.setAttribute("font-size", "3");
    t1b.setAttribute("text-anchor", "start");
    t1b.setAttribute("fill", this.foregroundColor);
    t1b.textContent = `${Math.floor(umiSec)}s`;
    digital.appendChild(t1b);

    // Civil time
    const civil = this.civilTime(now);
    const t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t2.setAttribute("x", pos.x);
    t2.setAttribute("y", pos.y + 3);
    t2.setAttribute("font-size", "3.25");
    t2.setAttribute("text-anchor", "middle");
    t2.setAttribute("fill", "gray");
    t2.textContent = civil;
    digital.appendChild(t2);
  }

  civilTime(date) {
    let hh = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    const ampm = hh < 12 ? "AM" : "PM";
    hh = hh % 12;
    hh = hh === 0 ? 12 : hh;
    return `${hh}:${mm}:${ss} ${ampm}`;
  }
}

customElements.define("umi-clock", UmiClock);
