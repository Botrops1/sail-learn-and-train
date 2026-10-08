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
  placeholder: {
    color: '#f4f4f0',
    edgeColor: '#5b6b78',
  },
  camera: {
    verticalFovDeg: 40,
    near: 0.1,
    far: 1000,
    /**
     * M0 has a fixed camera (orbit and presets are M1): from the port side, a little forward
     * of the beam, looking slightly down. Azimuth is measured from the bow, towards port.
     */
    azimuthFromBowDeg: 70,
    elevationDeg: 18,
    /** Extra room around the framed object. */
    framingMargin: 1.25,
  },
  light: {
    skyColor: '#ffffff',
    groundColor: '#4d6b80',
    hemisphereIntensity: 2.2,
    sunIntensity: 1.6,
    /** Direction towards the sun (no shadows in Phase 1). */
    sunDirection: [0.4, 1, -0.6] as const,
  },
} as const;
