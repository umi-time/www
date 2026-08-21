# Umi‑Time Technical Specification
### Version 1.0 — Planetary Time Standard

---

## 1. Overview

Umi‑time is a planetary time system that expresses the day as a uniform 0°–360° cycle mapped directly from UTC.  
The dial orientation is solar‑based, but the degree progression is universal and constant.

Civil time works well for local scheduling, but becomes fragmented and error‑prone across multiple time zones.  
Umi‑time provides a universal timestamp that is the same everywhere on Earth, making global coordination simple and unambiguous.

This specification defines:

- the Umi‑time degree system  
- the solar geometry inputs  
- the computational model  
- the dial orientation rules  
- the Umi‑seconds fractional system  
- the display conventions  
- the reference implementation structure  

Umi‑time is an open standard. Anyone may implement it.

---

## 2. Definitions

### 2.1 Solar Day

The solar day is the interval between two successive solar noons at a given longitude.  
Its length varies slightly throughout the year due to orbital eccentricity and axial tilt.

Umi‑time does not adjust its degree progression based on the varying length of the solar day.  
Solar‑day variation affects **dial orientation** (placement of solar noon, midnight, sunrise, and sunset),  
but **not** the rate at which Umi‑time degrees advance.

### 2.2 Umi‑Time Degrees

Umi‑time degrees are a continuous measure of daily progress mapped directly from UTC time.  
They range from 0° to 360°, advancing uniformly over the 24‑hour civil day.

Umi‑time degrees do **not** represent true solar rotational speed and do **not** vary with the length of the solar day.  
They provide a universal, constant measure of the day, while the dial orientation maps those degrees to the local sky.

### 2.3 Solar Noon
The moment when the Sun reaches its highest altitude above the horizon at a given location.

### 2.4 Solar Midnight
The moment when the Sun reaches its lowest altitude below the horizon at a given location.

### 2.5 Sunrise / Sunset
The moments when the Sun’s upper limb crosses the horizon, corrected for atmospheric refraction.

### 2.6 Longitude Anchor
Umi‑time degrees are anchored to the observer’s longitude.  
Longitude determines the alignment of solar noon, solar midnight, and the rotation of the Umi‑time dial.

---

## 3. Core Concept

Umi‑time represents the day as a full 360° rotational cycle mapped uniformly across the 24‑hour civil day.  
Each degree corresponds to:

```
1/360 of a 24‑hour civil day
```

This uniform mapping ensures that Umi‑time degrees advance at a constant rate, remain intuitive, and pair cleanly with civil time.

Solar geometry determines the **orientation** of the dial — solar noon at the top, solar midnight at the bottom,  
and sunrise/sunset placed according to their true positions — but does not affect the degree progression.

Umi‑time degrees are universal; the dial orientation is local.

---

## 4. Solar Geometry Inputs

Umi‑time requires the following astronomical inputs:

- **Latitude (φ)**  
- **Longitude (λ)**  
- **Solar declination (δ)**  
- **Equation of time (EoT)**  
- **Solar hour angle (H)**  
- **Solar altitude (α)**  
- **Solar azimuth (A)**  
- **Julian date (JD)**  

These values may be obtained from standard solar position algorithms such as:

- NOAA Solar Calculator  
- NREL SPA (Solar Position Algorithm)  
- Meeus Astronomical Algorithms  

---

## 5. Computing Umi‑Time Degrees

Umi‑time uses a direct, uniform mapping from UTC time to a 0°–360° rotational cycle.  
This ensures that Umi‑time advances at a constant rate, remains intuitive, and pairs cleanly with civil time.

### 5.1 Direct UTC Mapping

Umi‑time degrees (UT°) are computed as:

```
UT° = 360° × (UTC_seconds_of_day / 86400)
```


Where:

- `UTC_seconds_of_day` is the number of elapsed SI seconds since 00:00:00 UTC.
- 86400 is the fixed number of SI seconds in a civil day.

This mapping ensures:

- Umi‑time degrees advance uniformly.
- Umi‑seconds match SI seconds.
- The slow hand rotates once every 24 hours at a constant speed.
- Umi‑time remains simple, predictable, and universally understandable.

### 5.2 Continuous Fractional Degrees

Fractional degrees are preserved:

```
UT° = UT° mod 360
```

This ensures a continuous, unbroken rotational measure.

### 5.3 Solar Geometry for Dial Orientation (Not Degree Rate)

Solar geometry (solar noon, midnight, sunrise, sunset) determines **dial orientation**,  
but **does not affect the rate** at which Umi‑time degrees advance.

This hybrid model provides:

- solar‑accurate dial alignment  
- sunrise/sunset positioning  
- intuitive civil‑time pairing  
- constant rotational speed  

---

## 6. Umi‑Seconds

Umi‑seconds are defined directly from SI seconds.

### 6.1 Definition

One Umi‑second is exactly one SI second.

This ensures:

- uniform progression  
- compatibility with civil time  
- intuitive mental mapping  
- stable animation and dial behavior  

### 6.2 Fractional Umi‑Seconds

Fractional Umi‑seconds are computed as:

```
UmiSecond = UTC_seconds_of_day mod 86400
```

They must be displayed as a continuously increasing value, not a ticking integer.

---

## 7. Dial Orientation

The Umi‑time dial is solar‑aligned but time‑rate‑independent.  
Solar geometry determines the dial’s orientation (noon at top, midnight at bottom, sunrise/sunset positions),  
while Umi‑time degrees advance uniformly based on UTC.

### 7.1 Fixed Reference Points

The Umi‑time dial uses two fixed visual anchors:

- **Top of dial** → solar noon  
- **Bottom of dial** → solar midnight  

These positions do not change.

### 7.2 Variable Sunrise / Sunset Positions

Sunrise and sunset positions vary with:

- latitude  
- season  
- atmospheric refraction  
- equation of time  
- terrain (optional correction)

They must be computed dynamically and placed on the dial according to their Umi‑time degree values.

### 7.3 Dial Rotation

The dial rotates to align with the observer’s longitude.  
The degree values remain universal; the dial orientation changes.

---

## 8. Display Conventions

### 8.1 Dual‑System Display

Umi‑time is displayed above civil time:

```
Umi‑time (degrees + fractional)
Civil time (HH:MM:SS)
```

### 8.2 Hands

- **Slow hand**: completes one rotation per civil day  
- **Fast hand**: optional; completes one rotation every 240 seconds  
- **Fractional indicator**: continuous Umi‑seconds  

### 8.3 Sunrise / Sunset Arcs

Arcs may be drawn to indicate:

- daylight duration  
- nighttime duration  
- twilight zones (optional)

### 8.4 Solar Position Indicator

A marker may show the Sun’s current azimuth relative to the horizon.

---

## 9. Reference Implementation Structure

A reference implementation should include:

- `/core/umi_time.js` — degree and Umi‑second computation  
- `/core/solar_geometry.js` — solar position algorithms  
- `/display/dial.js` — dial orientation and rendering  
- `/display/hands.js` — slow/fast hand logic  
- `/display/arcs.js` — sunrise/sunset visualization  
- `/config/location.js` — latitude/longitude input  
- `/config/time.js` — civil time integration  

---

## 10. Accuracy Requirements

### 10.1 Solar Position Accuracy

Solar position accuracy affects dial orientation only, not Umi‑time degree progression.

Implementations should achieve:

- ±0.01° solar azimuth accuracy  
- ±0.01° solar altitude accuracy  
- ±1 second sunrise/sunset accuracy  

These values ensure correct placement of solar noon, midnight, sunrise, and sunset on the dial.

### 10.2 Time Synchronization

Civil time input should be synchronized to:

- NTP  
- GPS  
- OS system clock  

### 10.3 Drift Correction

Umi‑time must correct for:

- equation of time  
- longitude offset  
- solar day length variation  

---

## 11. Licensing

Umi‑time is an open standard.  
Implementations may use any open license.  

---

## 12. Future Extensions

Planned additions include:

- twilight modeling  
- terrain‑aware sunrise/sunset correction  
- atmospheric refraction refinement  
- high‑latitude seasonal mode  
- UTC‑integrated Umi‑time hybrid format  
- watch face reference designs  
- mobile widget implementations  

---

## 13. Summary

Umi‑time provides a universal, continuous, planetary measure of Earth’s rotation relative to the Sun. It restores the physical meaning of the day, complements civil time, and offers a foundation for a future global time standard.


