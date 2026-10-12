import type { AppState, Store } from '../app/store';
import { DEG, compassDeg, wrap180 } from '../model/angles';
import { boat } from '../model/boat';
import { jibClew } from '../model/jib';
import { mapToBoat } from '../model/mapFrame';
import { pointOfSail } from '../model/pointsOfSail';
import { requirePartId } from '../model/registry';
import type { TrackPoint } from '../model/track';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText } from './stepper';

/**
 * The bird's-eye map (PHASE2_SPEC 7.4): `cam=map` shows it instead of the 3D scene. Flat open
 * water, the boat in the middle, her track, the no-go zone, the points of sail round her, the
 * true wind and the apparent wind. A canvas drawn from the store at most 30 times a second.
 * The maths (`mapToScreen`, `scaleBar`, `mapLayout`, `pickMap`) is pure and exported for tests.
 */

/**
 * Zoom levels, metres per CSS pixel. The map opens on the closest one (0.1 m/px: the boat is
 * about 155 px long); decided in the M7 PR, the spec had 0.5 … 8 and a default of 1.
 */
export const ZOOM_LEVELS = [0.1, 0.2, 0.5, 1, 2, 4, 8] as const;
export const DEFAULT_ZOOM_INDEX = 0;

/** Presentation sizes (CSS px unless noted): they belong to this UI, not to the boat file. */
const MAP = {
  maxFps: 30,
  maxDpr: 2,
  minBoatPx: 24,
  /** The boat sits this far below the middle: the strip and the wind box cover the top. */
  centreDownPx: 24,
  noGoRadiusPx: 90,
  noGoLabelRadiusPx: 64,
  noGoLabelInnerRadiusPx: 40,
  /** The wedge's label sits this far off its middle line, on the side away from the arrow. */
  noGoLabelOffsetDeg: 24,
  labelRadiusPx: 120,
  /** The wedge reaches at least this far beyond the hull, and the labels this far beyond it. */
  wedgeBeyondHullPx: 45,
  labelsBeyondWedgePx: 30,
  /** Labels stay this far from the sides, and between these distances from the top and bottom. */
  labelEdgePx: 4,
  labelTopPx: 120,
  /** The ring stays this far from the sides of the canvas (room for the words). */
  labelSidePx: 40,
  /** The apparent wind arrow's head stops this far off the hull. */
  apparentHullGapPx: 4,
  /** Labels that would overlap are pushed outwards in steps of this size, up to this often. */
  labelPushPx: 16,
  labelPushMax: 4,
  labelFontPx: 12,
  labelHeightPx: 14,
  /** A tap counts as hitting a label or the arrow within this distance. */
  hitPx: 22,
  apparentBasePx: 20,
  apparentPerKnPx: 3,
  apparentHeadGapPx: 10,
  headingLineM: 200,
  gridFineM: 10,
  gridMinorM: 50,
  gridMajorM: 250,
  /** Grid lines closer together than this are left out. */
  gridMinPx: 8,
  scaleBarTargetPx: 80,
  scaleBarMetres: [5, 10, 20, 50, 100, 200, 500, 1000],
  windFieldColumns: 3,
  windFieldRows: 3,
  windFieldDriftPxPerKnS: 2,
  windFieldTravelPx: 80,
  windFieldArrowPx: 22,
  trackWidthPx: 2.5,
  trackChunks: 6,
} as const;

/**
 * Where the labels of the points of sail sit: the angle between the bow and the true wind that
 * a boat on that point of sail has. On both sides of the wind, except the run.
 */
export const LABEL_ANGLES_DEG: Readonly<Record<string, number>> = {
  close_hauled: 45,
  close_reach: 67,
  beam_reach: 90,
  broad_reach: 125,
  run: 180,
};

const COLOURS = {
  water: '#d9ebf6',
  gridFine: 'rgb(60 110 150 / 0.09)',
  gridMinor: 'rgb(60 110 150 / 0.14)',
  gridMajor: 'rgb(60 110 150 / 0.3)',
  track: [70, 80, 92],
  hullFill: '#ffffff',
  hullLine: '#1d2a36',
  sail: '#ffffff',
  sailLine: '#1d2a36',
  heading: 'rgb(29 42 54 / 0.7)',
  noGoFill: 'rgb(214 40 40 / 0.2)',
  noGoLine: 'rgb(190 30 30 / 0.7)',
  noGoText: '#8c1c1c',
  apparent: '#1565c0',
  windField: [40, 90, 130],
  text: '#1d2a36',
  halo: 'rgb(255 255 255 / 0.9)',
  select: '#ff9f1c',
} as const;

/** The map as drawn: which map point is in the middle, what points up, and the canvas size. */
export interface MapViewport {
  /** Map position (metres) at the centre of the canvas: the boat. */
  centreEastM: number;
  centreNorthM: number;
  /** The compass bearing that points up the screen: 0 = north up, the heading = boat up. */
  upDeg: number;
  metresPerPx: number;
  widthPx: number;
  heightPx: number;
  /** Where the boat is on the canvas (CSS px): a little below the middle, see MAP.centreDownPx. */
  centreXPx: number;
  centreYPx: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** The unit vector on screen (x right, y down) of a compass bearing. */
export function bearingToScreen(bearingDeg: number, view: MapViewport): ScreenPoint {
  const a = (bearingDeg - view.upDeg) * DEG;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/**
 * Where a map position (metres east and north of the start) is on the canvas. North up: east is
 * right, north is up. Boat up: the heading points up, so a point 100 m ahead of the boat is
 * straight above the centre.
 */
export function mapToScreen(eastM: number, northM: number, view: MapViewport): ScreenPoint {
  // Forward = towards `upDeg`, right = 90° clockwise from it (same maths as the boat frame).
  const [forward, right] = mapToBoat(
    eastM - view.centreEastM,
    northM - view.centreNorthM,
    view.upDeg,
  );
  return {
    x: view.centreXPx + right / view.metresPerPx,
    y: view.centreYPx - forward / view.metresPerPx,
  };
}

/** The scale bar: the length in metres (of 50/100/200/500/1000) nearest to 80 px, and its px. */
export function scaleBar(metresPerPx: number): { metres: number; px: number } {
  let best: number = MAP.scaleBarMetres[0];
  for (const metres of MAP.scaleBarMetres) {
    if (
      Math.abs(metres / metresPerPx - MAP.scaleBarTargetPx) <
      Math.abs(best / metresPerPx - MAP.scaleBarTargetPx)
    ) {
      best = metres;
    }
  }
  return { metres: best, px: best / metresPerPx };
}

/** Pixels per metre of the boat drawing, and whether it had to be enlarged to stay visible. */
export function boatScale(metresPerPx: number): { pxPerM: number; enlarged: boolean } {
  const natural = 1 / metresPerPx;
  const minimum = MAP.minBoatPx / boat.dimensions.loa;
  return natural >= minimum
    ? { pxPerM: natural, enlarged: false }
    : { pxPerM: minimum, enlarged: true };
}

/**
 * The radius of the no-go wedge and of the ring of point-of-sail labels, in px: 90 and 120, but
 * further out when the boat is drawn so large that they would sit on her hull. `room` is how
 * far the ring may reach on this canvas (see `ringRoom`); the wedge keeps 28 px inside it.
 */
export function ringRadii(
  pxPerM: number,
  room: number = Infinity,
): { wedge: number; labels: number } {
  const halfLength = (boat.dimensions.loa * pxPerM) / 2;
  const wanted = Math.max(MAP.noGoRadiusPx, halfLength + MAP.wedgeBeyondHullPx);
  const labels = Math.max(MAP.labelRadiusPx, Math.min(wanted + MAP.labelsBeyondWedgePx, room));
  const wedge = Math.min(wanted, labels - MAP.labelsBeyondWedgePx + 2);
  return { wedge, labels };
}

/**
 * How far the label ring may reach: up to the strip and the wind box at the top (the boat's
 * bow points up) and to the sides of the canvas.
 */
export function ringRoom(view: MapViewport): number {
  return Math.min(view.centreYPx - MAP.labelTopPx, view.centreXPx - MAP.labelSidePx);
}

/** How far the hull's outline is from the boat's middle along a screen direction, in px. */
function hullRadiusPx(
  direction: ScreenPoint,
  forward: ScreenPoint,
  starboard: ScreenPoint,
  pxPerM: number,
): number {
  const a = (boat.dimensions.loa * pxPerM) / 2;
  const b = (boat.dimensions.beam * pxPerM) / 2;
  const along = direction.x * forward.x + direction.y * forward.y;
  const across = direction.x * starboard.x + direction.y * starboard.y;
  return (a * b) / Math.sqrt((b * along) ** 2 + (a * across) ** 2);
}

/** A label placed on the map. */
export interface MapLabel {
  id: string;
  termId: string;
  text: string;
  x: number;
  y: number;
  bold: boolean;
}

/** Text widths in px, by label text and bold; the canvas measures them, tests give a stand-in. */
export type TextWidth = (text: string, bold: boolean) => number;

function overlaps(a: MapLabel, aw: number, b: MapLabel, bw: number): boolean {
  return Math.abs(a.x - b.x) < (aw + bw) / 2 + 4 && Math.abs(a.y - b.y) < MAP.labelHeightPx + 2;
}

/**
 * Labels of the points of sail round the boat (PHASE2_SPEC 7.4): at radius 120 px, in the
 * direction a boat on that point of sail would head, on both sides of the true wind. The
 * current one is bold and placed first; a label that would cover one already placed moves
 * outwards a step at a time.
 */
export function pointLabels(
  trueWindFromDeg: number,
  twaDeg: number,
  view: MapViewport,
  width: TextWidth,
): MapLabel[] {
  const current = pointOfSail(twaDeg).id;
  const wanted: { id: string; termId: string; bearing: number }[] = [];
  for (const band of boat.physics.display.pointsOfSail) {
    const angle = LABEL_ANGLES_DEG[band.id];
    if (angle === undefined) continue;
    wanted.push({ id: band.id, termId: band.termId, bearing: trueWindFromDeg + angle });
    if (angle !== 180) {
      wanted.push({ id: band.id, termId: band.termId, bearing: trueWindFromDeg - angle });
    }
  }
  // The current point of sail first, so it keeps its place; the rest in the data's order.
  wanted.sort((a, b) => Number(b.id === current) - Number(a.id === current));
  const placed: { label: MapLabel; w: number }[] = [];
  const labelRadius = ringRadii(boatScale(view.metresPerPx).pxPerM, ringRoom(view)).labels;
  for (const item of wanted) {
    const text = t(`pos.${item.id}` as StringKey);
    const bold = item.id === current;
    const w = width(text, bold);
    const direction = bearingToScreen(item.bearing, view);
    const cx = view.centreXPx;
    const cy = view.centreYPx;
    let label: MapLabel | undefined;
    for (let push = 0; push <= MAP.labelPushMax; push += 1) {
      const radius = labelRadius + push * MAP.labelPushPx;
      const margin = w / 2 + MAP.labelEdgePx;
      const candidate: MapLabel = {
        id: item.id,
        termId: item.termId,
        text,
        // Kept inside the canvas sides.
        x: Math.max(margin, Math.min(view.widthPx - margin, cx + direction.x * radius)),
        y: cy + direction.y * radius,
        bold,
      };
      label = candidate;
      if (!placed.some((other) => overlaps(candidate, w, other.label, other.w))) break;
    }
    if (label) placed.push({ label, w });
  }
  return placed.map((entry) => entry.label);
}

/** Everything the map draws that is tapped, in pixels: for drawing and for `pickMap`. */
export interface MapLayout {
  centre: ScreenPoint;
  /** Boat drawing scale and the direction (screen unit vectors) of her bow and starboard. */
  pxPerM: number;
  enlarged: boolean;
  forward: ScreenPoint;
  starboard: ScreenPoint;
  /** Screen bearing (clockwise from up, degrees) the true wind comes from. */
  windFromScreenDeg: number;
  /** Radius of the no-go wedge, px (see ringRadii). */
  wedgeRadiusPx: number;
  /** The head of the apparent wind arrow (at the boat) and its tail (towards the wind). */
  apparentHead: ScreenPoint;
  apparentTail: ScreenPoint;
  /** The words "Apparent 17 kn" and "No-go zone": placed so that they do not cover each other. */
  apparentLabel: PlacedText;
  noGoLabel: PlacedText;
  labels: MapLabel[];
}

/** Text centred at a point (the words are measured by `TextWidth`). */
export interface PlacedText {
  text: string;
  x: number;
  y: number;
  bold: boolean;
}

/** Places the boat, the apparent wind arrow and the point-of-sail labels for a state. */
export function mapLayout(state: AppState, view: MapViewport, width: TextWidth): MapLayout {
  const centre = { x: view.centreXPx, y: view.centreYPx };
  const { pxPerM, enlarged } = boatScale(view.metresPerPx);
  const heading = state.boat.headingDeg;
  const forward = bearingToScreen(heading, view);
  const starboard = bearingToScreen(heading + 90, view);
  const wind = state.rig.wind;
  const trueFrom = compassDeg(state.wind.dirDeg);
  const towards = bearingToScreen(heading + wind.awaDeg, view);
  const tailLength = MAP.apparentBasePx + MAP.apparentPerKnPx * wind.awsKn;
  // The arrow's head stops at the hull (or 10 px from the middle for a small boat).
  const gap = Math.max(
    MAP.apparentHeadGapPx,
    hullRadiusPx(towards, forward, starboard, pxPerM) + MAP.apparentHullGapPx,
  );
  const apparentHead = {
    x: centre.x + towards.x * gap,
    y: centre.y + towards.y * gap,
  };
  const apparentTail = {
    x: centre.x + towards.x * (gap + tailLength),
    y: centre.y + towards.y * (gap + tailLength),
  };
  const wedgeRadiusPx = ringRadii(pxPerM, ringRoom(view)).wedge;

  // "Apparent 17 kn" just beyond the tail of the blue arrow, along the arrow.
  const apparentText = t('map.apparent', { speed: Math.round(wind.awsKn) });
  const apparentWidth = width(apparentText, true);
  const reach = Math.abs(towards.x) * (apparentWidth / 2) + Math.abs(towards.y) * MAP.labelHeightPx;
  const apparentMargin = apparentWidth / 2 + MAP.labelEdgePx;
  const apparentLabel: PlacedText = {
    text: apparentText,
    // Kept inside the canvas sides, like the point-of-sail labels.
    x: Math.max(
      apparentMargin,
      Math.min(view.widthPx - apparentMargin, apparentTail.x + towards.x * (reach + 4)),
    ),
    y: apparentTail.y + towards.y * (reach + 4),
    bold: true,
  };

  // "No-go zone" inside the wedge, off the middle line on the side away from the arrow; if that
  // spot is taken (a run: the arrow lies along the middle line), try the other places.
  const inside = pointOfSail(wind.twaDeg).id === 'no_go';
  const noGoText = t(inside ? 'pos.no_go' : 'map.noGo');
  const noGoWidth = width(noGoText, inside);
  const side = wrap180(trueFrom - (heading + wind.awaDeg)) >= 0 ? 1 : -1;
  const scale = wedgeRadiusPx / MAP.noGoRadiusPx;
  const near = MAP.noGoLabelRadiusPx * scale;
  const far = wedgeRadiusPx - 12;
  const inner = MAP.noGoLabelInnerRadiusPx * scale;
  const spots: [number, number][] = [
    [side * MAP.noGoLabelOffsetDeg, near],
    [side * MAP.noGoLabelOffsetDeg, far],
    [-side * MAP.noGoLabelOffsetDeg, near],
    [-side * MAP.noGoLabelOffsetDeg, far],
    [side * MAP.noGoLabelOffsetDeg, inner],
    [-side * MAP.noGoLabelOffsetDeg, inner],
    [0, inner],
  ];
  let noGoLabel: PlacedText | undefined;
  for (const [offsetDeg, radius] of spots) {
    const direction = bearingToScreen(trueFrom + offsetDeg, view);
    const candidate: PlacedText = {
      text: noGoText,
      x: centre.x + direction.x * radius,
      y: centre.y + direction.y * radius,
      bold: inside,
    };
    noGoLabel = candidate;
    const clash =
      Math.abs(candidate.x - apparentLabel.x) < (noGoWidth + apparentWidth) / 2 + 4 &&
      Math.abs(candidate.y - apparentLabel.y) < MAP.labelHeightPx + 2;
    if (!clash) break;
  }
  return {
    centre,
    pxPerM,
    enlarged,
    forward,
    starboard,
    windFromScreenDeg: trueFrom - view.upDeg,
    wedgeRadiusPx,
    apparentHead,
    apparentTail,
    apparentLabel,
    noGoLabel: noGoLabel ?? { text: noGoText, x: centre.x, y: centre.y, bold: inside },
    labels: pointLabels(trueFrom, wind.twaDeg, view, width),
  };
}

function distanceToSegment(p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const k =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
}

/**
 * What a tap at a canvas position hits (PHASE2_SPEC 7.4): the boat, the apparent wind arrow, a
 * point-of-sail label or the no-go wedge, in that order; null for open water. Returns the
 * registry id the info card shows. The boat comes first because the arrow starts at her side
 * and a fingertip on the boat must not land on the arrow's root.
 */
export function pickMap(
  state: AppState,
  view: MapViewport,
  width: TextWidth,
  x: number,
  y: number,
): string | null {
  const layout = mapLayout(state, view, width);
  const p = { x, y };
  // The boat: an ellipse as long as she is drawn and as wide as her beam (at least a fingertip
  // each way), so the root of the blue arrow, which starts at her hull, stays tappable.
  const halfLength = Math.max((boat.dimensions.loa * layout.pxPerM) / 2, MAP.hitPx);
  const halfBeam = Math.max((boat.dimensions.beam * layout.pxPerM) / 2, MAP.hitPx);
  const dx = x - layout.centre.x;
  const dy = y - layout.centre.y;
  const along = dx * layout.forward.x + dy * layout.forward.y;
  const across = dx * layout.starboard.x + dy * layout.starboard.y;
  if ((along / halfLength) ** 2 + (across / halfBeam) ** 2 <= 1) {
    return requirePartId('part_hull');
  }
  if (distanceToSegment(p, layout.apparentHead, layout.apparentTail) <= MAP.hitPx / 2) {
    return requirePartId('term_apparent_wind');
  }
  for (const label of layout.labels) {
    const w = width(label.text, label.bold);
    if (Math.abs(x - label.x) <= Math.max(w / 2, MAP.hitPx) && Math.abs(y - label.y) <= MAP.hitPx) {
      return requirePartId(label.termId);
    }
  }
  const distance = Math.hypot(dx, dy);
  if (distance <= layout.wedgeRadiusPx) {
    const direction = (((Math.atan2(dx, -dy) / DEG - layout.windFromScreenDeg) % 360) + 360) % 360;
    if (Math.abs(wrap180(direction)) <= boat.physics.display.noGoHalfAngleDeg) {
      return requirePartId('term_no_go_zone');
    }
  }
  return null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** "045": a compass bearing with three digits. */
function bearing3(deg: number): string {
  return String(Math.round(compassDeg(deg)) % 360).padStart(3, '0');
}

export interface MapView {
  /** Redraws when the map shows and the last draw is old enough (call every frame). */
  update(nowMs: number): void;
  /** True while the map is what the view shows (`cam=map`). */
  shown(): boolean;
}

/**
 * Builds the map over the 3D view: a canvas and its buttons (zoom, scale bar, north up / boat
 * up, the true-wind box). It sets `data-map` on the host while the map shows; the stylesheet
 * hides the 3D canvas and the labels then, and the app stops drawing the 3D scene.
 */
export function createMapView(host: HTMLElement, store: Store): MapView {
  const canvas = el('canvas', {
    class: 'map-canvas',
    'data-testid': 'map-canvas',
    role: 'img',
    'aria-label': t('map.label'),
  });
  const context = canvas.getContext('2d');

  // Buttons and boxes over the map (hidden with it by the stylesheet).
  let zoomIndex = DEFAULT_ZOOM_INDEX;
  let boatUp = false;
  const zoomIn = el(
    'button',
    {
      type: 'button',
      class: 'map-zoom',
      'aria-label': t('map.zoomIn'),
      'data-testid': 'map-zoom-in',
    },
    ['+'],
  );
  const zoomOut = el(
    'button',
    {
      type: 'button',
      class: 'map-zoom',
      'aria-label': t('map.zoomOut'),
      'data-testid': 'map-zoom-out',
    },
    ['−'],
  );
  const scaleText = el('span', { class: 'map-scale-text', 'data-testid': 'map-scale' });
  const scaleLine = el('span', { class: 'map-scale-line' });
  const enlargedNote = el('span', { class: 'map-enlarged', 'data-testid': 'map-enlarged' }, [
    t('map.enlarged'),
  ]);
  const scale = el('div', { class: 'map-scale' }, [scaleText, scaleLine, enlargedNote]);
  const hint = el('p', { class: 'map-hint', 'data-testid': 'map-hint' }, [t('map.hint')]);
  const northUp = el(
    'button',
    { type: 'button', class: 'map-orient', 'data-testid': 'map-north-up' },
    [t('map.northUp')],
  );
  const boatUpButton = el(
    'button',
    { type: 'button', class: 'map-orient', 'data-testid': 'map-boat-up' },
    [t('map.boatUp')],
  );
  const orient = el(
    'div',
    { class: 'map-orient-group', role: 'group', 'aria-label': t('map.orient') },
    [northUp, boatUpButton],
  );

  // The true-wind box: a ring with north, and a big arrow to where the wind blows.
  const northMark = svg('g', { class: 'map-north' });
  northMark.append(
    svg('path', { d: 'M0,-23 L-4,-15 L4,-15 Z', class: 'map-north-head' }),
    (() => {
      const label = svg('text', { x: 0, y: -26, class: 'map-north-label' });
      label.textContent = t('wind.dial.north');
      return label;
    })(),
  );
  const windArrow = svg('g', { class: 'map-wind-arrow' });
  windArrow.append(
    svg('line', { x1: 0, y1: 14, x2: 0, y2: -8 }),
    svg('path', { d: 'M0,-18 L-7,-6 L7,-6 Z' }),
  );
  const windIcon = svg('svg', {
    viewBox: '-30 -32 60 62',
    class: 'map-wind-icon',
    'aria-hidden': 'true',
  });
  windIcon.append(svg('circle', { r: 22, class: 'map-wind-ring' }), northMark, windArrow);
  const windText = el('span', { class: 'map-wind-text', 'data-testid': 'map-wind-text' });
  const windBox = el(
    'button',
    {
      type: 'button',
      class: 'map-wind-box',
      'data-testid': 'map-wind-box',
      'data-part-id': requirePartId('env_wind'),
    },
    [windIcon, windText],
  );
  host.append(canvas, windBox, orient, scale, hint, zoomIn, zoomOut);

  const viewport = (state: AppState): MapViewport => ({
    centreEastM: state.boat.eastM,
    centreNorthM: state.boat.northM,
    upDeg: boatUp ? state.boat.headingDeg : 0,
    metresPerPx: ZOOM_LEVELS[zoomIndex] ?? 1,
    widthPx: canvas.clientWidth,
    heightPx: canvas.clientHeight,
    centreXPx: canvas.clientWidth / 2,
    centreYPx: canvas.clientHeight / 2 + MAP.centreDownPx,
  });

  // Text widths for label placement and tapping, measured once per text.
  const widths = new Map<string, number>();
  const textWidth: TextWidth = (text, bold) => {
    const key = `${bold ? 'b' : 'n'}${text}`;
    let width = widths.get(key);
    if (width === undefined) {
      if (context) {
        context.font = `${bold ? 700 : 500} ${MAP.labelFontPx}px system-ui, sans-serif`;
        width = context.measureText(text).width;
      } else width = text.length * MAP.labelFontPx * 0.55;
      widths.set(key, width);
    }
    return width;
  };

  const syncButtons = () => {
    zoomIn.disabled = zoomIndex === 0;
    zoomOut.disabled = zoomIndex === ZOOM_LEVELS.length - 1;
    northUp.setAttribute('aria-pressed', String(!boatUp));
    boatUpButton.setAttribute('aria-pressed', String(boatUp));
    const bar = scaleBar(ZOOM_LEVELS[zoomIndex] ?? 1);
    scaleLine.style.width = `${Math.round(bar.px)}px`;
    setText(scaleText, `${bar.metres} m`);
  };
  zoomIn.addEventListener('click', () => {
    zoomIndex = Math.max(0, zoomIndex - 1);
    syncButtons();
    drawNow();
  });
  zoomOut.addEventListener('click', () => {
    zoomIndex = Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1);
    syncButtons();
    drawNow();
  });
  northUp.addEventListener('click', () => {
    boatUp = false;
    syncButtons();
    drawNow();
  });
  boatUpButton.addEventListener('click', () => {
    boatUp = true;
    syncButtons();
    drawNow();
  });
  windBox.addEventListener('click', () =>
    store.dispatch({ type: 'select', partId: requirePartId('env_wind') }),
  );
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const state = store.getState();
    store.dispatch({
      type: 'select',
      partId: pickMap(
        state,
        viewport(state),
        textWidth,
        event.clientX - rect.left,
        event.clientY - rect.top,
      ),
    });
  });

  // Canvas size follows the view (device pixel ratio capped at 2).
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAP.maxDpr);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    drawNow();
  };
  new ResizeObserver(resize).observe(canvas);

  const shown = () => store.getState().camera.preset === 'map';
  const sync = () => {
    host.toggleAttribute('data-map', shown());
    if (shown()) drawNow();
  };
  store.subscribe((state, previous) => {
    if (state.camera.preset !== previous.camera.preset) sync();
  });
  syncButtons();

  let lastDrawMs = -Infinity;
  const drawNow = () => {
    if (!shown() || !context || canvas.clientWidth === 0) return;
    const state = store.getState();
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMap(context, state, viewport(state), textWidth, state.rig.timeS);
    refreshWindBox(state, viewport(state));
  };

  let shownWind = '';
  let shownRotation = '';
  const refreshWindBox = (state: AppState, view: MapViewport) => {
    const kn = Math.round(state.rig.wind.twsKn);
    const from = bearing3(state.wind.dirDeg);
    const text = t('map.trueWind', { speed: kn, compass: from });
    if (text !== shownWind) {
      shownWind = text;
      setText(windText, text);
    }
    const rotation = `${Math.round(-view.upDeg)}|${Math.round(compassDeg(state.wind.dirDeg) + 180 - view.upDeg)}`;
    if (rotation !== shownRotation) {
      shownRotation = rotation;
      northMark.setAttribute('transform', `rotate(${Math.round(-view.upDeg)})`);
      windArrow.setAttribute(
        'transform',
        `rotate(${Math.round(compassDeg(state.wind.dirDeg) + 180 - view.upDeg)})`,
      );
    }
    enlargedNote.hidden = !boatScale(view.metresPerPx).enlarged;
  };

  // Debug only (`?debug=1`): lets the screenshot script read what the canvas shows.
  if (store.getState().settings.debug) {
    Object.assign(window, {
      __sailMap: {
        trackPoints: () => store.getState().track.length,
        /** The middle of the blue arrow on the canvas, CSS px. */
        apparentMid: () => {
          const state = store.getState();
          const layout = mapLayout(state, viewport(state), textWidth);
          return {
            x: (layout.apparentHead.x + layout.apparentTail.x) / 2,
            y: (layout.apparentHead.y + layout.apparentTail.y) / 2,
          };
        },
        /** Where the boat is on the canvas, CSS px. */
        centre: () => {
          const state = store.getState();
          const view = viewport(state);
          return { x: view.centreXPx, y: view.centreYPx };
        },
        currentPointOfSail: () => pointOfSail(store.getState().rig.wind.twaDeg).id,
      },
    });
  }
  sync();
  return {
    shown,
    update(nowMs) {
      if (!shown() || nowMs - lastDrawMs < 1000 / MAP.maxFps) return;
      lastDrawMs = nowMs;
      drawNow();
    },
  };
}

function rgba(colour: readonly number[], alpha: number): string {
  return `rgb(${colour[0]} ${colour[1]} ${colour[2]} / ${alpha})`;
}

/** Draws the whole map for a state. */
function drawMap(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  view: MapViewport,
  width: TextWidth,
  timeS: number,
): void {
  const { widthPx: w, heightPx: h } = view;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLOURS.water;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, view);
  drawWindField(ctx, state, view, timeS);
  drawTrack(ctx, state.track, state, view);
  const layout = mapLayout(state, view, width);
  drawNoGo(ctx, state, layout);
  drawLabels(ctx, layout, state.selection);
  drawBoat(ctx, state, view, layout);
  drawApparent(ctx, state, layout);
}

function drawGrid(ctx: CanvasRenderingContext2D, view: MapViewport): void {
  // Lines of the grid in map space, long enough to cover the canvas in any orientation.
  const reach = (Math.hypot(view.widthPx, view.heightPx) / 2) * view.metresPerPx;
  // Each level skips the lines of the next coarser one, which draws them stronger.
  const line = (spacingM: number, coarserM: number | null, colour: string) => {
    if (spacingM / view.metresPerPx < MAP.gridMinPx) return;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const first = (centre: number) => Math.floor((centre - reach) / spacingM) * spacingM;
    const skip = (value: number) => coarserM !== null && value % coarserM === 0;
    for (let e = first(view.centreEastM); e <= view.centreEastM + reach; e += spacingM) {
      if (skip(e)) continue;
      const a = mapToScreen(e, view.centreNorthM - reach, view);
      const b = mapToScreen(e, view.centreNorthM + reach, view);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    for (let n = first(view.centreNorthM); n <= view.centreNorthM + reach; n += spacingM) {
      if (skip(n)) continue;
      const a = mapToScreen(view.centreEastM - reach, n, view);
      const b = mapToScreen(view.centreEastM + reach, n, view);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  };
  line(MAP.gridFineM, MAP.gridMinorM, COLOURS.gridFine);
  line(MAP.gridMinorM, MAP.gridMajorM, COLOURS.gridMinor);
  line(MAP.gridMajorM, null, COLOURS.gridMajor);
}

/** A small arrow on screen at (x, y) pointing along `dir`. */
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: ScreenPoint,
  length: number,
  head: number,
): void {
  const tipX = x + dir.x * length;
  const tipY = y + dir.y * length;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - dir.x * head - dir.y * head * 0.5, tipY - dir.y * head + dir.x * head * 0.5);
  ctx.lineTo(tipX - dir.x * head + dir.y * head * 0.5, tipY - dir.y * head - dir.x * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** A 3 × 3 field of faint arrows that drift downwind, faster in stronger wind. */
function drawWindField(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  view: MapViewport,
  timeS: number,
): void {
  const towards = bearingToScreen(compassDeg(state.wind.dirDeg) + 180, view);
  const travel = MAP.windFieldTravelPx;
  const speed = MAP.windFieldDriftPxPerKnS * state.rig.wind.twsKn;
  ctx.lineWidth = 1.5;
  for (let column = 0; column < MAP.windFieldColumns; column += 1) {
    for (let row = 0; row < MAP.windFieldRows; row += 1) {
      const baseX = (view.widthPx * (column + 0.5)) / MAP.windFieldColumns;
      const baseY = (view.heightPx * (row + 0.5)) / MAP.windFieldRows;
      // Each arrow starts at its own phase so the field does not pulse together.
      const phase = ((((timeS * speed) / travel + (column * 3 + row) / 9) % 1) + 1) % 1;
      const alpha = Math.sin(phase * Math.PI) * 0.35;
      ctx.strokeStyle = rgba(COLOURS.windField, alpha);
      ctx.fillStyle = rgba(COLOURS.windField, alpha);
      const shift = (phase - 0.5) * travel;
      arrow(
        ctx,
        baseX + towards.x * (shift - MAP.windFieldArrowPx / 2),
        baseY + towards.y * (shift - MAP.windFieldArrowPx / 2),
        towards,
        MAP.windFieldArrowPx,
        6,
      );
    }
  }
}

/** The track as a grey polyline that fades with age; the newest piece joins the boat. */
function drawTrack(
  ctx: CanvasRenderingContext2D,
  track: readonly TrackPoint[],
  state: AppState,
  view: MapViewport,
): void {
  const points = [...track.map((p) => ({ eastM: p.eastM, northM: p.northM })), state.boat];
  if (points.length < 2) return;
  const chunks = Math.min(MAP.trackChunks, points.length - 1);
  const perChunk = Math.ceil((points.length - 1) / chunks);
  ctx.lineWidth = MAP.trackWidthPx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let chunk = 0; chunk < chunks; chunk += 1) {
    const from = chunk * perChunk;
    const to = Math.min(points.length - 1, from + perChunk);
    ctx.strokeStyle = rgba(COLOURS.track, 0.25 + (0.65 * (chunk + 1)) / chunks);
    ctx.beginPath();
    for (let i = from; i <= to; i += 1) {
      const p = points[i];
      if (!p) continue;
      const s = mapToScreen(p.eastM, p.northM, view);
      if (i === from) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }
}

function haloText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { bold?: boolean; colour?: string; size?: number } = {},
): void {
  ctx.font = `${options.bold ? 700 : 500} ${options.size ?? MAP.labelFontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOURS.halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = options.colour ?? COLOURS.text;
  ctx.fillText(text, x, y);
}

function drawNoGo(ctx: CanvasRenderingContext2D, state: AppState, layout: MapLayout): void {
  const half = boat.physics.display.noGoHalfAngleDeg;
  // Screen bearing θ (clockwise from up) is canvas angle θ − 90°.
  const from = (layout.windFromScreenDeg - half - 90) * DEG;
  const to = (layout.windFromScreenDeg + half - 90) * DEG;
  const selected = state.selection === 'term_no_go_zone';
  ctx.beginPath();
  ctx.moveTo(layout.centre.x, layout.centre.y);
  ctx.arc(layout.centre.x, layout.centre.y, layout.wedgeRadiusPx, from, to);
  ctx.closePath();
  ctx.fillStyle = COLOURS.noGoFill;
  ctx.fill();
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.strokeStyle = selected ? COLOURS.select : COLOURS.noGoLine;
  ctx.stroke();
  const label = layout.noGoLabel;
  haloText(ctx, label.text, label.x, label.y, { bold: label.bold, colour: COLOURS.noGoText });
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  layout: MapLayout,
  selection: string | null,
): void {
  for (const label of layout.labels) {
    haloText(ctx, label.text, label.x, label.y, {
      bold: label.bold,
      colour: label.termId === selection ? '#b85c00' : COLOURS.text,
    });
  }
}

function drawBoat(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  view: MapViewport,
  layout: MapLayout,
): void {
  const { centre, forward, starboard, pxPerM } = layout;
  // Boat frame (x forward, z starboard, metres) to the canvas.
  const at = (x: number, z: number): ScreenPoint => ({
    x: centre.x + (forward.x * x + starboard.x * z) * pxPerM,
    y: centre.y + (forward.y * x + starboard.y * z) * pxPerM,
  });
  // Dashed heading line, 200 m ahead of the bow.
  const bow = at(boat.hull.stemX, 0);
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = COLOURS.heading;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bow.x, bow.y);
  ctx.lineTo(
    bow.x + forward.x * (MAP.headingLineM / view.metresPerPx),
    bow.y + forward.y * (MAP.headingLineM / view.metresPerPx),
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // Hull outline from the deck plan, both sides.
  const edge = boat.hull.deckEdgeHalfBeam.points;
  ctx.beginPath();
  edge.forEach(([x = 0, half = 0], i) => {
    const p = at(x, half);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  for (let i = edge.length - 1; i >= 0; i -= 1) {
    const [x = 0, half = 0] = edge[i] ?? [];
    const p = at(x, -half);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = COLOURS.hullFill;
  ctx.fill();
  const selected = state.selection === 'part_hull';
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.strokeStyle = selected ? COLOURS.select : COLOURS.hullLine;
  ctx.stroke();

  // The boom from the gooseneck at the drawn swing, and the jib's chord from the tack.
  const [gx = 0] = boat.rig.boom.gooseneck;
  const theta = state.rig.theta.value * DEG;
  const psi = state.rig.psi.value * DEG;
  const reach = boat.rig.boom.length * Math.cos(psi);
  const boomEnd = at(gx - reach * Math.cos(theta), reach * Math.sin(theta));
  const jibClewPoint = jibClew(state.rig.jibPhi.value, state.rig.jibSolution.unfurled);
  const [tackX = 0, , tackZ = 0] = boat.sails.jib.tack;
  const [clewX = 0, , clewZ = 0] = jibClewPoint;
  const jibTack = at(tackX, tackZ);
  const jibEnd = at(clewX, clewZ);
  const boomStart = at(gx, 0);
  for (const [a, b] of [
    [boomStart, boomEnd],
    [jibTack, jibEnd],
  ] as const) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLOURS.sailLine;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = COLOURS.sail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawApparent(ctx: CanvasRenderingContext2D, state: AppState, layout: MapLayout): void {
  const { apparentHead: head, apparentTail: tail } = layout;
  const length = Math.hypot(head.x - tail.x, head.y - tail.y);
  // From the tail (where the wind comes from) to the head, at the boat.
  const dir =
    length === 0
      ? { x: 0, y: 1 }
      : { x: (head.x - tail.x) / length, y: (head.y - tail.y) / length };
  const selected = state.selection === 'term_apparent_wind';
  ctx.strokeStyle = selected ? COLOURS.select : COLOURS.apparent;
  ctx.fillStyle = selected ? COLOURS.select : COLOURS.apparent;
  ctx.lineWidth = 3;
  ctx.lineCap = 'butt';
  arrow(ctx, tail.x, tail.y, dir, Math.max(0, length - 8), 10);
  const label = layout.apparentLabel;
  haloText(ctx, label.text, label.x, label.y, { bold: true, colour: COLOURS.apparent });
}
