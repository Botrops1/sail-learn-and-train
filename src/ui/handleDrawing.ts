import { boat } from '../model/boat';
import { t } from './i18n';

/**
 * Drawing parts shared by the station drawings (M4c): the strain bar beside a winch or the
 * gearbox, the winch handle lying in its pocket, the handle in a socket (an arm with a grip to
 * circle), and a tracker that turns a finger circling the grip into a cranking speed.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  children: (SVGElement | string)[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  node.append(...children);
  return node;
}

function attr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** Sizes in drawing units (the station drawings are 360 units wide, about 1 CSS px on a phone). */
const H = {
  strain: { width: 12, labelGap: 13 },
  pocket: { width: 64, height: 46, bar: 34, knob: 7 },
  /** A handle in its socket is pulled out by dragging its grip this many times its arm away. */
  pullOutArms: 1.7,
  grip: { radius: 14, hub: 5, arm: 5 },
} as const;

export interface StrainBar {
  group: SVGGElement;
  /** Load as a fraction of the limit, or null to hide the bar (the winch is not working). */
  update(fraction: number | null): void;
}

/** A vertical bar filling from the bottom: orange near the limit, red at it. */
export function createStrainBar(x: number, top: number, height: number): StrainBar {
  const warn = boat.realisticMode.strain.warnFraction;
  const group = svg('g', { class: 'real-strain', visibility: 'hidden', 'aria-hidden': 'true' });
  const fill = svg('rect', { x, y: top + height, width: H.strain.width, height: 0, rx: 2 });
  fill.classList.add('real-strain-fill');
  group.append(
    svg('rect', { x, y: top, width: H.strain.width, height, rx: 3, class: 'real-strain-track' }),
    fill,
    svg('line', {
      x1: x - 3,
      x2: x + H.strain.width + 3,
      y1: top + height * (1 - warn),
      y2: top + height * (1 - warn),
      class: 'real-strain-warn',
    }),
    svg(
      'text',
      {
        x: x + H.strain.width / 2,
        y: top + height + H.strain.labelGap,
        class: 'real-strain-text',
        'text-anchor': 'middle',
      },
      [t('real.strain.label')],
    ),
  );
  return {
    group,
    update(fraction) {
      attr(group, 'visibility', fraction === null ? 'hidden' : 'visible');
      if (fraction === null) return;
      const shown = Math.max(0, Math.min(1, fraction));
      attr(fill, 'y', (top + height * (1 - shown)).toFixed(1));
      attr(fill, 'height', (height * shown).toFixed(1));
      fill.classList.toggle('is-warn', fraction >= warn && fraction < 1);
      fill.classList.toggle('is-limit', fraction >= 1);
    },
  };
}

export interface HandlePocket {
  group: SVGGElement;
  /** Shown when the handle lies here or the user carries it. */
  update(shown: boolean, carried: boolean): void;
  /** Is the point (drawing units) over the pocket (where a dropped handle is laid down)? */
  contains(x: number, y: number): boolean;
}

/** The handle lying at this station (or carried): drag it onto the socket to put it in. */
export function createHandlePocket(cx: number, cy: number): HandlePocket {
  const p = H.pocket;
  const group = svg('g', {
    class: 'real-pocket',
    role: 'button',
    tabindex: '0',
    'aria-label': t('real.handle.pocketAria'),
    'data-drag': 'handle',
    'data-part-id': boat.realisticMode.winchHandle.partId,
  });
  const label = svg(
    'text',
    { x: cx, y: cy + p.height / 2 + 12, class: 'real-hand-text', 'text-anchor': 'middle' },
    [''],
  );
  group.append(
    svg('rect', {
      x: cx - p.width / 2,
      y: cy - p.height / 2,
      width: p.width,
      height: p.height,
      rx: 8,
      class: 'real-pocket-box',
    }),
    svg('line', {
      x1: cx - p.bar / 2,
      y1: cy,
      x2: cx + p.bar / 2,
      y2: cy,
      class: 'real-handle-arm',
    }),
    svg('circle', { cx: cx + p.bar / 2, cy, r: p.knob, class: 'real-handle-grip' }),
    svg('circle', { cx: cx - p.bar / 2, cy, r: p.knob - 2, class: 'real-handle-hub' }),
    label,
  );
  return {
    group,
    update(shown, carried) {
      attr(group, 'visibility', shown ? 'visible' : 'hidden');
      group.classList.toggle('is-carried', carried);
      label.textContent = t(carried ? 'real.handle.pocketCarried' : 'real.handle.pocket');
    },
    contains: (x, y) => Math.abs(x - cx) <= p.width / 2 + 4 && Math.abs(y - cy) <= p.height / 2 + 4,
  };
}

export interface SocketHandle {
  group: SVGGElement;
  grip: SVGCircleElement;
  /** Angle in degrees clockwise from straight up; hidden when the handle is not in. */
  update(inSocket: boolean, angleDeg: number, cranking: boolean): void;
}

/** The handle in a socket at (cx, cy): an arm to a grip that the user circles to crank. */
export function createSocketHandle(cx: number, cy: number, arm: number): SocketHandle {
  const group = svg('g', { class: 'real-socket-handle', visibility: 'hidden' });
  const line = svg('line', { x1: cx, y1: cy, x2: cx, y2: cy - arm, class: 'real-handle-arm' });
  const grip = svg('circle', {
    cx,
    cy: cy - arm,
    r: H.grip.radius,
    class: 'real-handle-grip real-crank',
    'data-drag': 'crank',
    'data-part-id': boat.realisticMode.winchHandle.partId,
  });
  group.append(line, svg('circle', { cx, cy, r: H.grip.hub, class: 'real-handle-hub' }), grip);
  return {
    group,
    grip,
    update(inSocket, angleDeg, cranking) {
      attr(group, 'visibility', inSocket ? 'visible' : 'hidden');
      const a = (angleDeg * Math.PI) / 180;
      const x = (cx + arm * Math.sin(a)).toFixed(1);
      const y = (cy - arm * Math.cos(a)).toFixed(1);
      attr(line, 'x2', x);
      attr(line, 'y2', y);
      attr(grip, 'cx', x);
      attr(grip, 'cy', y);
      grip.classList.toggle('is-cranking', cranking);
    },
  };
}

/** A finger circling still for this long (ms) stops the crank. */
const CRANK_IDLE_MS = 200;
/** Weight of the newest finger speed in the smoothed cranking speed. */
const CRANK_SMOOTHING = 0.4;
/** Cranking speed is sent in steps of this many turns per second. */
const CRANK_STEP = 0.1;

export interface CrankTracker {
  start(x: number, y: number, timeMs: number): void;
  /** Returns true once the grip was pulled out of the socket (the crank has stopped). */
  move(x: number, y: number, timeMs: number): boolean;
  end(): void;
}

/**
 * Turns a finger circling the centre (cx, cy) into a cranking speed in turns per second
 * (+ clockwise on screen, which is clockwise seen from above). Sends 0 when the finger stops.
 * A finger that leaves the circle (further than `pullOutArms` handle arms from the centre) is
 * pulling the handle out of its socket: the crank stops and `move` says so.
 */
export function crankTracker(
  centre: () => { x: number; y: number },
  send: (turnsPerS: number) => void,
  arm: number,
): CrankTracker {
  let last: { angle: number; time: number } | null = null;
  let rate = 0;
  let sent = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const angleOf = (x: number, y: number) => {
    const c = centre();
    return Math.atan2(y - c.y, x - c.x);
  };
  const stop = () => {
    rate = 0;
    if (sent !== 0) {
      sent = 0;
      send(0);
    }
  };
  return {
    start(x, y, timeMs) {
      last = { angle: angleOf(x, y), time: timeMs };
      rate = 0;
    },
    move(x, y, timeMs) {
      if (!last) return false;
      const c = centre();
      if (Math.hypot(x - c.x, y - c.y) > arm * H.pullOutArms) {
        clearTimeout(timer);
        last = null;
        stop();
        return true;
      }
      const angle = angleOf(x, y);
      let delta = angle - last.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      const dt = Math.max(1, timeMs - last.time) / 1000;
      last = { angle, time: timeMs };
      rate = rate * (1 - CRANK_SMOOTHING) + (delta / (2 * Math.PI) / dt) * CRANK_SMOOTHING;
      const stepped = Math.round(rate / CRANK_STEP) * CRANK_STEP;
      if (stepped !== sent) {
        sent = stepped;
        send(stepped);
      }
      clearTimeout(timer);
      timer = setTimeout(stop, CRANK_IDLE_MS);
      return false;
    },
    end() {
      clearTimeout(timer);
      last = null;
      stop();
    },
  };
}
