// mercator-utils.js
// Shared Mercator forward projection helpers for Umi‑Time map layers

// -------------------------------------------------------------
// 1. Cached constants for custom Mercator span
// -------------------------------------------------------------
const MERCATOR_SPAN_DEGREES = 188 + 191; // 188°W → 191°E

// -------------------------------------------------------------
// 2. Mercator forward projection (X)
// -------------------------------------------------------------
export function mercatorX(lonDeg, svgRoot) {
  const width = svgRoot.viewBox.baseVal.width;
  return ((lonDeg + 188) / MERCATOR_SPAN_DEGREES) * width;
}

// -------------------------------------------------------------
// 3. Mercator forward projection (Y)
// -------------------------------------------------------------
export function mercatorY(latDeg, svgRoot, Y_top, Y_bottom) {
  const height = svgRoot.viewBox.baseVal.height;

  // Clamp latitude to avoid extreme Mercator distortion near ±90°
  const clampedLat = Math.max(-89.999, Math.min(89.999, latDeg));
  const latRad = (clampedLat * Math.PI) / 180;

  const Y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const v = (Y_top - Y) / (Y_top - Y_bottom);

  // Clamp v to [0, 1] to avoid rendering outside the canvas
  const clampedV = Math.min(Math.max(v, 0), 1);

  return clampedV * height;
}
