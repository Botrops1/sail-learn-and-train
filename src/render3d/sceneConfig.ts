/**
 * Look of the 3D scene: colours, sizes and camera framing.
 * These are presentation choices, not boat geometry (boat numbers live in hanse508.json).
 */
export const SCENE = {
  /** PHASE1_SPEC 10: cap the device pixel ratio at 2. */
  maxPixelRatio: 2,
  skyColor: '#cfe5f3',
  /** Fog fades the grid into the horizon so the edge of the water plane is not visible. */
  fogNear: 60,
  fogFar: 220,
  water: {
    color: '#2f7fb0',
    opacity: 0.55,
    /** Side length of the square water plane, metres. */
    size: 600,
  },
  grid: {
    /** Grid cell size, metres: helps judge scale. */
    cellSize: 2,
    /** Grid extent, metres. */
    size: 200,
    color: '#ffffff',
    opacity: 0.18,
  },
  /** Colours of the boat model. Neutral, so the teaching colours of the ropes (M2+) stand out. */
  boat: {
    hull: '#f3f4f1',
    deck: '#dfe3e6',
    teak: '#b98a5a',
    coachroof: '#eceff1',
    dark: '#2e353b',
    appendage: '#55606a',
    spar: '#a7b1ba',
    wire: '#3d4852',
    fitting: '#4b545c',
    block: '#5c6670',
    fabric: '#3f474e',
    sail: '#fbfbf6',
    sailOpacity: 0.9,
  },
  /** Tint of the part shown in the info card. */
  highlight: { color: '#ff9f1c', intensity: 0.55 },
  camera: {
    verticalFovDeg: 40,
    near: 0.1,
    far: 1000,
    /** Extra room around the framed boat in the presets. */
    framingMargin: 1.12,
    /** Preset transition, seconds (PHASE1_SPEC 6.2). */
    transitionS: 0.5,
    /** Elevation of the side presets above the horizontal, degrees. */
    sideElevationDeg: 6,
    /** Elevation of the bow preset, degrees. */
    bowElevationDeg: 10,
    /** The top preset looks almost straight down (exactly 90° has no defined "up"). */
    topElevationDeg: 89.5,
    /** The top camera is at least this many times the masthead height above the orbit centre. */
    topAboveMastFactor: 1.6,
    /** Helm preset: standing eye height above the cockpit sole, distance behind the wheel (m). */
    helmEyeHeight: 1.65,
    helmBehindWheel: 1.0,
    /** Helm preset looks down and a little to port, so wheel, winch and clutch bank show. */
    helmLookDownDeg: 20,
    helmYawToPortDeg: 12,
    /** Distance of the helm view's orbit centre in front of the eye, metres. */
    helmTargetDistance: 5,
    /** Wider lens for the helm view, so the cockpit fits on a portrait phone. */
    helmVerticalFovDeg: 64,
    /** Orbit limits, metres. */
    minDistance: 3,
    maxDistance: 140,
    /** The camera never goes lower than this above the water, metres. */
    minHeightAboveWater: 0.3,
    /** If the camera ends up inside the hull, it is lifted to this height above the deck. */
    clearanceAboveDeck: 0.4,
    /** How far the orbit centre may be panned away from the boat, metres. */
    maxTargetOffset: 25,
    dampingFactor: 0.12,
  },
  /** Tap-to-identify: what counts as a tap, and how close to a thin part a tap may land. */
  picking: {
    tapMaxMovePx: 8,
    tapMaxDurationMs: 700,
    tolerancePx: 22,
    /** A thin part counts as visible if it is at most this far behind the surface hit, metres. */
    depthSlack: 1.0,
  },
  light: {
    skyColor: '#ffffff',
    groundColor: '#4d6b80',
    hemisphereIntensity: 2.2,
    sunIntensity: 1.6,
    /** Direction towards the sun (no shadows in Phase 1). */
    sunDirection: [0.4, 1, -0.6] as const,
    /** A weaker light from the other side, so the starboard side and sails are not grey. */
    fillIntensity: 0.9,
    fillDirection: [-0.3, 0.6, 0.8] as const,
  },
} as const;
