/**
 * Look of the 3D scene: colours, sizes and camera framing.
 * These are presentation choices, not boat geometry (boat numbers live in hanse508.json).
 */
export const SCENE = {
  /** PHASE1_SPEC 10: cap the device pixel ratio at 2. */
  maxPixelRatio: 2,
  skyColor: '#cfe5f3',
  /** Fog fades the water into the horizon so the edge of the water plane is not visible. */
  fogNear: 150,
  fogFar: 900,
  /**
   * Procedural sky (M3b): a gradient from the zenith to a hazy horizon with soft clouds, used
   * as the background and, blurred, for the reflections on metal, gelcoat and water.
   */
  sky: {
    zenith: '#5f97c8',
    horizon: '#d6e7f2',
    /** What shows through the see-through water: deep water, not sky. */
    belowHorizon: '#14495a',
    cloud: '#ffffff',
    cloudCount: 70,
    cloudOpacity: 0.55,
    width: 1024,
    height: 512,
    /** Only the model-vs-sketch comparison (`scripts/compare`) still lights from here. */
    glowDirection: [0.4, 1, -0.6] as const,
  },
  /** The sun's light through the day and night (M17, PHASE3_SPEC 9.6). */
  daylight: {
    /** `sun` rises from 0 to 1 between these sun heights, degrees. */
    sunFromDeg: -1,
    sunToDeg: 8,
    /** The sky light never goes below this share; it rises to 1 between the two heights. */
    skyFloor: 0.25,
    skyFromDeg: -12,
    skyToDeg: 10,
    /** The sun's light turns warm below `warmToDeg` and is fully warm at `warmFromDeg`. */
    warmFromDeg: 2,
    warmToDeg: 25,
    /** Night: fully on below `nightFromDeg`, off above `nightToDeg`. */
    nightFromDeg: -12,
    nightToDeg: 0,
    warmSun: '#ffb46b',
    moonColour: '#9fb3ff',
    nightWater: '#0b2230',
    nightWhitecapDim: 0.7,
    backgroundFloor: 0.15,
    backgroundFromDeg: -12,
    backgroundToDeg: 6,
    /**
     * The drawn sun until M18's sky dome (decided in the M17 PR): a soft disc on a sprite
     * `distanceM` away along the sun's real direction, `sizeDeg` across; it fades out between
     * `fadeFromDeg` and `fadeToDeg` of sun height (it sets behind the horizon).
     */
    sunDisc: { distanceM: 800, sizeDeg: 14, fadeFromDeg: -1.5, fadeToDeg: 1, coreShare: 0.12 },
    /** The light and the shadow camera never come from below this height, degrees. */
    minLightElevationDeg: 2,
    /** The sun casts a shadow only while `sun` is above this. */
    shadowMinSun: 0.05,
  },
  water: {
    color: '#1f7a8c',
    /** Low detail (no reflections): a lighter, flat colour. */
    lowColor: '#3f8fae',
    opacity: 0.78,
    lowOpacity: 0.6,
    roughness: 0.12,
    /** Ripples: a tiling normal map, `rippleTileM` metres, drifting slowly. */
    rippleTileM: 9,
    rippleStrength: 0.35,
    /** The ripples scale with the true wind now: × (wind / this), kept between the two limits (M10). */
    rippleReferenceKn: 12,
    rippleScaleMin: 0.3,
    rippleScaleMax: 2,
    rippleDriftMPerS: 0.25,
    /** Side length of the square outer water, metres (M16: out to the fogged horizon). */
    size: 2000,
    /**
     * The water group steps by this many metres along the map as the boat sails, so every vertex
     * of both meshes sits on a fixed map point (M14); a multiple of both cell sizes.
     */
    stepM: 20,
    /** Cell of the flat outer water (the part beyond the wave mesh), metres. */
    outerCellM: 20,
    /**
     * The wave mesh (M14): a square of vertices around the boat, `cellM` apart (`cellLowM` at Low
     * detail). The waves fade to flat between `fadeStartM` and `halfSizeM` from the boat.
     */
    waves: { cellM: 2, cellLowM: 4, halfSizeM: 100, fadeStartM: 70 },
    /**
     * Wind on the water (M16, PHASE3_SPEC 8.4): the water darkens between `windDarkFromKn` and
     * `windDarkToKn` of true wind, a gust darkens the patch it will arrive in, a lull lightens
     * it, and the crests of the waves go white.
     */
    windyColor: '#16586a',
    windDarkFromKn: 4,
    windDarkToKn: 24,
    windDarkAmount: 0.5,
    gustColor: '#0b3442',
    gustAmount: 0.45,
    lullColor: '#5aa7bd',
    lullAmount: 0.3,
    whitecapColor: '#f2f6f7',
    /** Foam never covers the water completely: the most a vertex turns white (owner, M16 PR). */
    whitecapMax: 0.85,
  },
  /** The practice buoys (M16, PHASE3_SPEC 8.4). */
  marks: {
    color: '#f5c400',
    roughness: 0.5,
    sphereRadiusM: 0.6,
    poleRadiusM: 0.04,
    poleBottomY: 0.5,
    poleTopY: 1.9,
    topmarkLengthM: 0.5,
    topmarkThicknessM: 0.08,
    floatY: 0.2,
    /** Beyond this distance from the boat a buoy is not drawn or tappable, metres. */
    maxDrawM: 1000,
  },
  /** The scale grid is the wave mesh's lines, 2 m apart (4 m at Low detail). */
  grid: {
    color: '#ffffff',
    opacity: 0.18,
    /** High detail: fainter, the ripples show the water surface. */
    opacityHigh: 0.07,
  },
  /**
   * Colours of the boat (M3b: from the reference photos). Neutral, so the teaching colours of
   * the ropes stand out.
   */
  boat: {
    hull: '#f3f4f1',
    deck: '#e6e9e8',
    gelcoat: '#f1f2ef',
    channelCover: '#bfc6cb',
    clearcoatRoughness: 0.12,
    dark: '#26292d',
    appendage: '#3b4148',
    spar: '#c9ced3',
    spreader: '#41464c',
    wire: '#b9bec3',
    fitting: '#d8dce0',
    chrome: '#eef0f2',
    block: '#25282c',
    fabric: '#3d4248',
    glass: '#1c2a33',
    glassOpacity: 0.55,
    sail: '#f8f6ef',
    sailOpacity: 0.93,
    /** Anti-fouling below the waterline and a thin boot stripe above it (heights in metres). */
    waterline: {
      antifouling: '#2c3137',
      antifoulingTopY: 0.03,
      stripe: '#47525e',
      stripeTopY: 0.1,
    },
  },
  /** Procedural textures (M3b), see boat/textures.ts. */
  textures: {
    teak: {
      color: '#a8733e',
      caulkColor: '#231d19',
      planksPerTile: 8,
      plankWidthM: 0.065,
      tileLengthM: 2.4,
      caulkTexels: 2,
      plankShadeVariation: 0.22,
      grainStrength: 0.08,
    },
    nonSlip: { tileM: 0.12, dotsPerTile: 8 },
    sail: { seamShade: 0.86 },
  },
  /**
   * Teaching colours of the ropes (PHASE1_SPEC 7.3), one per function, from the Okabe–Ito
   * palette (distinguishable with the common kinds of colour blindness). A rope whose controls
   * fight each other turns red; the panel says "fighting" too, so colour is not the only signal.
   */
  /**
   * Telltales and the tear mark on a torn sail (M9, PHASE2_SPEC 9.3): presentation sizes and the
   * ribbons' movement (angle in degrees in the sail's plane, measured from the chord, + = up).
   */
  telltales: {
    lengthM: 0.35,
    widthM: 0.06,
    /** Distance aft of the luff along the chord, metres. */
    mainFromLuffM: 0.6,
    jibFromLuffM: 0.8,
    offFaceM: 0.03,
    /** Port face red, starboard face green. */
    portColor: '#d32f2f',
    starboardColor: '#2e9d4a',
    streaming: { baseDeg: 0, wiggleDeg: 5, frequencyHz: 3 },
    lifting: { baseDeg: 60, wiggleDeg: 25, frequencyHz: 8 },
    stalled: { baseDeg: -70, wiggleDeg: 15, frequencyHz: 2 },
    /** How fast a ribbon moves to a new state (time constant, seconds). */
    changeTimeS: 0.15,
    tear: { color: '#2a2a2a', widthM: 0.06, liftM: 0.015, heightFraction: 0.5, zigzagRows: 0.5 },
  },
  ropes: {
    colors: {
      mainsheet: '#e69f00',
      jibsheet: '#009e73',
      control: '#cc79a7',
      furling: '#0072b2',
      halyard: '#4b545c',
    },
    fighting: '#e8112d',
    /** A rope running out (Realistic mode, PHASE1_SPEC 7.2.2) flashes between its colour and this. */
    running: '#fff36b',
    runningFlashHz: 4,
    /**
     * Ropes are never drawn thinner than this on screen (CSS px), so sag and colour show on a
     * phone at whole-boat zoom. Close up, the 3D radius from the data (visual.ropeRenderRadius)
     * is used.
     */
    minScreenWidthPx: 2.5,
    radialSegments: 6,
    /** Length of one stripe pattern along the rope, metres; it slides as the rope moves. */
    stripePeriodM: 0.3,
    stripeTexels: 8,
    stripeDarkTexels: 3,
    stripeDarkness: 0.55,
  },
  /** Wind streaks (PHASE1_SPEC 6.1): light lines drifting with the test wind. */
  wind: {
    streakCount: 90,
    /** Streaks fill a square of this size around the boat, metres, from low to high. */
    areaSize: 70,
    minHeight: 0.6,
    maxHeight: 24,
    /** Drift speed on screen per knot of wind, metres per second (slower than real). */
    metresPerSecondPerKnot: 0.35,
    /** Streak length: base plus per knot, metres. */
    streakBaseLength: 0.8,
    streakLengthPerKnot: 0.12,
    color: '#ffffff',
    opacity: 0.55,
  },
  /** The wake (PHASE2_SPEC 6.6): a ribbon behind the transom. Presentation only. */
  wake: {
    /** Positions kept: one every `sampleS` of simulation time, so 48 × 0.25 s = 12 s. */
    maxPoints: 48,
    sampleS: 0.25,
    lifeS: 12,
    y: 0.02,
    baseHalfWidthM: 0.6,
    /** The ribbon widens by this much per side per second of age, metres. */
    widthPerS: 0.075,
    opacity: 0.6,
    /** Full strength at this speed; nothing is drawn below `minKn`. */
    fullOpacityKn: 8,
    minKn: 0.3,
    /** A jump larger than this (Reset, a link) starts a new wake, metres. */
    restartDistanceM: 10,
  },
  /** The boom's danger zone (PHASE2_SPEC 11.3). Presentation only. */
  dangerZone: {
    color: '#ff2d20',
    /** Fill while the boom crosses, and the faint outline while it is by the lee. */
    fillOpacity: 0.45,
    outlineOpacity: 0.55,
    /** The faint fill under the outline while the boom is by the lee (a 1 px line is hard to see on a phone). */
    riskFillOpacity: 0.14,
    /** Straight edges of the fan: one per this many degrees. */
    segmentDeg: 3,
    /** Height above the gooseneck, metres (so the fill does not flicker against the boom). */
    liftM: -0.05,
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
    /**
     * Radius of the invisible hit area around each small fitting, CSS px: 48 px across, a
     * fingertip (touch targets ≥ 44 px, PHASE1_SPEC 5.1).
     */
    smallPartRadiusPx: 24,
    /** A thin part counts as visible if it is at most this far behind the surface hit, metres. */
    depthSlack: 1.0,
  },
  light: {
    skyColor: '#ffffff',
    groundColor: '#4d6b80',
    hemisphereIntensity: 2.2,
    /** High detail: the sky's reflections light the boat too, so the sky light is weaker. */
    hemisphereIntensityHigh: 0.6,
    environmentIntensity: 0.9,
    sunIntensity: 1.6,
    sunIntensityHigh: 2.6,
    /** A weaker light from the other side, so the starboard side and sails are not grey. */
    fillIntensity: 0.9,
    fillIntensityHigh: 0.35,
    fillDirection: [-0.3, 0.6, 0.8] as const,
    toneMappingExposure: 1.0,
  },
  /** Centre of the sun's shadow box: the middle of the boat, a third of the way up the mast. */
  shadowCentre: [-1, 6, 0] as const,
  /** Soft sun shadows, high detail only (M3b, owner request). */
  shadows: {
    mapSize: 2048,
    /** Half-size of the square the shadow covers around the boat, metres (boat and mast). */
    halfExtent: 15,
    /** Softness: PCF filter radius in shadow-map texels. */
    radius: 3,
    bias: -0.0004,
    normalBias: 0.03,
    /** Distance of the shadow camera from the boat along the sun direction, metres. */
    distance: 45,
  },
  /** Low detail: largest device pixel ratio used (high detail: maxPixelRatio). */
  maxPixelRatioLow: 1.5,
} as const;
