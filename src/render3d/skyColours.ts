import * as THREE from 'three';
import { SCENE } from './sceneConfig';

/**
 * The colours of the sky for a sun height (PHASE3_SPEC 10.3): day blue, the orange of sunrise
 * and sunset, twilight and night. Read from `SCENE.skyByElevation`.
 */
export interface SkyColours {
  zenith: THREE.Color;
  horizon: THREE.Color;
  glow: THREE.Color;
  cloud: THREE.Color;
  glowStrength: number;
  haloStrength: number;
  stars: number;
}

type Row = (typeof SCENE.skyByElevation)[number];

interface ColourRow {
  elevDeg: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  glow: THREE.Color;
  cloud: THREE.Color;
  glowStrength: number;
  haloStrength: number;
  stars: number;
}

const toColourRow = (row: Row): ColourRow => ({
  ...row,
  zenith: new THREE.Color(row.zenith),
  horizon: new THREE.Color(row.horizon),
  glow: new THREE.Color(row.glow),
  cloud: new THREE.Color(row.cloud),
});

const rows: ColourRow[] = SCENE.skyByElevation.map(toColourRow);

// It runs every frame: the same object is refilled every call.
const result: SkyColours = {
  zenith: new THREE.Color(),
  horizon: new THREE.Color(),
  glow: new THREE.Color(),
  cloud: new THREE.Color(),
  glowStrength: 0,
  haloStrength: 0,
  stars: 0,
};

const fill = (from: ColourRow, to: ColourRow, t: number): SkyColours => {
  result.zenith.copy(from.zenith).lerp(to.zenith, t);
  result.horizon.copy(from.horizon).lerp(to.horizon, t);
  result.glow.copy(from.glow).lerp(to.glow, t);
  result.cloud.copy(from.cloud).lerp(to.cloud, t);
  result.glowStrength = from.glowStrength + (to.glowStrength - from.glowStrength) * t;
  result.haloStrength = from.haloStrength + (to.haloStrength - from.haloStrength) * t;
  result.stars = from.stars + (to.stars - from.stars) * t;
  return result;
};

/** The sky for a sun elevation. Returns the same object every call. */
export function skyColours(elevationDeg: number): SkyColours {
  const first = rows[0] as ColourRow;
  const last = rows[rows.length - 1] as ColourRow;
  if (elevationDeg <= first.elevDeg) return fill(first, first, 0);
  if (elevationDeg >= last.elevDeg) return fill(last, last, 0);
  let i = 0;
  while (i < rows.length - 2 && elevationDeg > (rows[i + 1] as ColourRow).elevDeg) i += 1;
  const from = rows[i] as ColourRow;
  const to = rows[i + 1] as ColourRow;
  return fill(from, to, (elevationDeg - from.elevDeg) / (to.elevDeg - from.elevDeg));
}
