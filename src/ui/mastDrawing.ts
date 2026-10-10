import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { isControlId } from '../model/controls';
import {
  tailSpecs,
  type GearboxSwitch,
  type RealisticAction,
  type RealisticState,
} from '../model/realistic';
import { el } from './dom';
import {
  crankTracker,
  createHandlePocket,
  createSocketHandle,
  createStrainBar,
} from './handleDrawing';
import { t, type StringKey } from './i18n';
import { ropeColorKey, ROPE_DASH } from './ropeLegend';
import { SCENE } from '../render3d/sceneConfig';
import { noticeText } from './stationDrawing';
import { setText } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The Mast station of Realistic mode (PHASE1_SPEC 7.2.2, M4c), drawn from above with forward
 * up: the mast, the in-mast furling gearbox on its aft face with the IN/OUT switch and the
 * socket for the winch handle, and the furling line leaving aft. Below it, which clutches must
 * be open for the main to roll the way the switch says.
 *
 * Gestures (each also has a button under the drawing):
 * - the IN / OUT switch, a toggle (IN to the left, OUT to the right, owner): tap it to flip
 *   it, or slide it left or right;
 * - the handle, lying here or carried: drag it onto the socket (a tap picks it up);
 * - the handle in the socket: circle its grip to crank.
 */
const M = {
  width: 360,
  height: 252,
  mast: { x: 145, y: 8, width: 70, height: 38 },
  body: { x: 120, y: 56, width: 120, height: 120 },
  socket: { radius: 10, drop: 60 },
  arm: 52,
  /** The toggle: a track with IN on one half and OUT on the other, the knob on the chosen one. */
  toggle: { x: 10, y: 98, width: 100, height: 44, inset: 3, slide: 12 },
  strain: { x: 262, top: 83, height: 66 },
  lines: { bottom: 230, gap: 10 },
  pocket: { x: 54, y: 204 },
  tapMove: 10,
} as const;

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

/** Sets an attribute only when it changes (the drawing refreshes every frame). */
function attr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** The furling ends of the gearbox's control: those that pay out when rolling in, or out. */
function mustRunFree(rollIn: boolean) {
  const controlId = boat.realisticMode.mastGearbox.controlId;
  return tailSpecs().filter(
    (spec) => spec.controlId === controlId && (rollIn ? spec.payOutSign < 0 : spec.payOutSign > 0),
  );
}

/** Is this end free to run: clutch open, not on a winch, not in a hand? */
function runsFree(real: RealisticState, key: string): boolean {
  const onWinch = Object.values(real.winches).some((w) => w.tail === key);
  return real.open[key] === true && !onWinch && real.pull !== key && !((real.ease[key] ?? 0) > 0);
}

export interface MastDrawing {
  element: HTMLElement;
  refresh(state: AppState): void;
}

export function createMastDrawing(store: Store): MastDrawing {
  const gearbox = boat.realisticMode.mastGearbox;
  const cx = M.body.x + M.body.width / 2;
  const cy = M.body.y + M.body.height / 2;
  const root = svg('svg', {
    viewBox: `0 0 ${M.width} ${M.height}`,
    class: 'station-drawing mast-drawing',
    role: 'group',
    'aria-label': t('real.drawing.mast'),
    'data-testid': 'station-drawing-mast',
  });
  const notice = el('p', { class: 'station-notice', 'aria-live': 'polite', hidden: '' });
  const mainOut = el('p', { class: 'mast-main-out' });
  const runTitle = el('p', { class: 'mast-run-title' });
  const runList = el('ul', { class: 'mast-run-list' });
  const element = el('div', { class: 'station-wrap', 'data-station': 'mast' }, [
    root,
    notice,
    el('div', { class: 'mast-status', 'data-testid': 'mast-status' }, [mainOut, runTitle, runList]),
  ]);

  // The mast and the gearbox on its aft face.
  const lineSpec = tailSpecs().find((spec) => spec.controlId === gearbox.controlId);
  const lineColor = lineSpec ? SCENE.ropes.colors[ropeColorKey(lineSpec.ropeId)] : '#888888';
  const lineDash = lineSpec ? ROPE_DASH[ropeColorKey(lineSpec.ropeId)] : '';
  root.append(
    svg('rect', { ...M.mast, rx: 12, class: 'real-mast' }),
    svg(
      'text',
      {
        x: M.mast.x + M.mast.width / 2,
        y: M.mast.y + M.mast.height / 2,
        class: 'real-mast-text',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      },
      [t('real.gearbox.mast')],
    ),
    ...[-1, 1].map((side) =>
      svg('line', {
        x1: cx + (side * M.lines.gap) / 2,
        y1: M.body.y + M.body.height - 4,
        x2: cx + (side * M.lines.gap) / 2,
        y2: M.lines.bottom,
        stroke: lineColor,
        'stroke-width': 5,
        'stroke-dasharray': lineDash,
        class: 'real-tail',
      }),
    ),
    svg('text', { x: cx + 14, y: M.lines.bottom - 4, class: 'real-caption' }, [
      t('real.gearbox.lines'),
    ]),
    svg('rect', {
      ...M.body,
      rx: 16,
      class: 'real-gearbox',
      'data-part-id': gearbox.partId,
    }),
    svg('text', { x: cx + 14, y: M.body.y + M.body.height + 16, class: 'real-gearbox-text' }, [
      t('real.gearbox.caption'),
    ]),
    svg('circle', { cx, cy, r: M.socket.radius, class: 'real-socket' }),
    svg(
      'text',
      {
        x: cx,
        y: cy + M.socket.radius + 14,
        class: 'real-gearbox-text',
        'text-anchor': 'middle',
      },
      [t('real.gearbox.socket')],
    ),
  );

  // The IN / OUT switch: a toggle, IN on the left and OUT on the right (switchPositions).
  const tg = M.toggle;
  const positions = gearbox.switchPositions as Record<GearboxSwitch, string>;
  const half = tg.width / 2;
  const sideX = (dir: GearboxSwitch) => (positions[dir] === 'left' ? tg.x : tg.x + half);
  const toggle = svg('g', {
    class: 'real-switch',
    role: 'button',
    tabindex: '0',
    'data-drag': 'switch',
    'data-testid': 'gearbox-switch',
  });
  const knob = svg('rect', {
    x: sideX('out') + tg.inset,
    y: tg.y + tg.inset,
    width: half - 2 * tg.inset,
    height: tg.height - 2 * tg.inset,
    rx: 6,
    class: 'real-switch-knob',
  });
  const labels = (['in', 'out'] as const).map((dir) =>
    svg(
      'text',
      {
        x: sideX(dir) + half / 2,
        y: tg.y + tg.height / 2,
        class: 'real-switch-text',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'data-switch': dir,
      },
      [t(dir === 'in' ? 'real.gearbox.in' : 'real.gearbox.out')],
    ),
  );
  toggle.append(
    svg('rect', {
      x: tg.x,
      y: tg.y,
      width: tg.width,
      height: tg.height,
      rx: 9,
      class: 'real-switch-box',
    }),
    knob,
    ...labels,
  );
  root.append(
    svg('text', { x: tg.x + half, y: tg.y - 8, class: 'real-caption', 'text-anchor': 'middle' }, [
      t('real.gearbox.switch'),
    ]),
    toggle,
  );
  const flip = () => {
    const now = store.getState().realistic.gearbox;
    dispatch({ type: 'gearbox', to: now === 'in' ? 'out' : 'in' });
  };
  /** The switch position a slide towards this side sets. */
  const towards = (side: 'left' | 'right'): GearboxSwitch => (positions.in === side ? 'in' : 'out');

  const strainBar = createStrainBar(M.strain.x, M.strain.top, M.strain.height);
  const pocket = createHandlePocket(M.pocket.x, M.pocket.y);
  const socketHandle = createSocketHandle(cx, cy, M.arm);
  const ghost = svg('line', { class: 'real-ghost', 'stroke-width': 5, visibility: 'hidden' });
  root.append(strainBar.group, pocket.group, socketHandle.group, ghost);

  // --- gestures ---
  const dispatch = (action: RealisticAction) => store.dispatch({ type: 'realistic', action });
  const crank = crankTracker(
    () => ({ x: cx, y: cy }),
    (turnsPerS) => dispatch({ type: 'crank', turnsPerS }),
    M.arm,
  );
  /** A tap on the handle icon takes the handle, or lays it down here when it is carried. */
  const tapHandle = () =>
    dispatch({
      type: 'handle',
      to: store.getState().realistic.handle.place === 'carried' ? 'stow' : 'carry',
    });
  const point = (event: PointerEvent) => {
    const matrix = root.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  let drag: { kind: string; start: { x: number; y: number }; moved: number } | null = null;

  // A finger on a part must not scroll the panel (see stationDrawing.ts).
  root.addEventListener(
    'touchstart',
    (event) => {
      if ((event.target as Element).closest('[data-drag]')) event.preventDefault();
    },
    { passive: false },
  );
  root.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    const kind = (event.target as Element).closest('[data-drag]')?.getAttribute('data-drag');
    if (!kind) return;
    event.preventDefault();
    root.setPointerCapture(event.pointerId);
    const p = point(event);
    drag = { kind, start: p, moved: 0 };
    if (kind === 'crank') crank.start(p.x, p.y, event.timeStamp);
  });
  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = point(event);
    drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.start.x, p.y - drag.start.y));
    if (drag.kind === 'crank' && crank.move(p.x, p.y, event.timeStamp)) {
      // The grip was pulled out of the socket: the handle is carried; where it is dropped
      // decides (on its icon: laid down here).
      dispatch({ type: 'handle', to: 'carry' });
      drag.kind = 'pulled';
    }
    if (drag.kind === 'handle' || drag.kind === 'pulled') {
      ghost.setAttribute('x1', String(drag.kind === 'pulled' ? cx : drag.start.x));
      ghost.setAttribute('y1', String(drag.kind === 'pulled' ? cy : drag.start.y));
      ghost.setAttribute('x2', String(p.x));
      ghost.setAttribute('y2', String(p.y));
      ghost.setAttribute('visibility', 'visible');
    }
  });
  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    ghost.setAttribute('visibility', 'hidden');
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    const p = point(event);
    if (current.kind === 'crank') {
      crank.end();
      return;
    }
    if (cancelled) return;
    if (current.kind === 'pulled') {
      // Dropped on the handle icon: laid down here; anywhere else it stays in the hand.
      if (pocket.contains(p.x, p.y)) dispatch({ type: 'handle', to: 'stow' });
      return;
    }
    if (current.kind === 'handle') {
      const overSocket = Math.hypot(p.x - cx, p.y - cy) < M.socket.drop;
      if (overSocket && current.moved >= M.tapMove) dispatch({ type: 'handle', to: 'socket' });
      else if (current.moved < M.tapMove) tapHandle();
      return;
    }
    if (current.kind === 'switch') {
      // A slide sets the side it went to; a tap flips the switch.
      const dx = p.x - current.start.x;
      if (Math.abs(dx) >= tg.slide)
        dispatch({ type: 'gearbox', to: towards(dx < 0 ? 'left' : 'right') });
      else if (current.moved < M.tapMove) flip();
    }
  };
  root.addEventListener('pointerup', (event) => finish(event, false));
  root.addEventListener('pointercancel', (event) => finish(event, true));
  root.addEventListener('keydown', (event) => {
    const kind = (event.target as Element).closest('[data-drag]')?.getAttribute('data-drag') ?? '';
    if (kind === 'switch' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      dispatch({ type: 'gearbox', to: towards(event.key === 'ArrowLeft' ? 'left' : 'right') });
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (kind === 'switch') {
      event.preventDefault();
      flip();
    } else if (kind === 'handle') {
      event.preventDefault();
      tapHandle();
    }
  });

  // --- refresh ---
  const runNodes: HTMLElement[] = [];
  const refresh = (state: AppState) => {
    const real = state.realistic;
    const handle = real.handle;
    attr(knob, 'x', String(sideX(real.gearbox) + tg.inset));
    for (const label of labels) {
      label.classList.toggle('is-on', label.getAttribute('data-switch') === real.gearbox);
    }
    attr(
      toggle,
      'aria-label',
      t('real.gearbox.switchAria', {
        dir: t(real.gearbox === 'in' ? 'real.gearbox.in' : 'real.gearbox.out'),
      }),
    );
    pocket.update(
      handle.place === 'carried' || (handle.place === 'stowed' && handle.station === 'mast'),
      handle.place === 'carried',
    );
    const inSocket = handle.place === 'socket' && handle.station === 'mast';
    socketHandle.update(inSocket, handle.angle, handle.crank !== 0);
    const report = real.handleReport;
    strainBar.update(inSocket && report?.at === 'gearbox' ? report.forceN / report.stallN : null);

    const value = isControlId(gearbox.controlId) ? state.controls[gearbox.controlId] : 0;
    setText(mainOut, t('real.gearbox.mainOut', { pct: String(Math.round(value)) }));
    const rollIn = real.gearbox === 'in';
    setText(runTitle, t(rollIn ? 'real.gearbox.mustRunIn' : 'real.gearbox.mustRunOut'));
    const specs = mustRunFree(rollIn);
    specs.forEach((spec, index) => {
      let node = runNodes[index];
      if (!node) {
        node = el('li', {});
        runNodes.push(node);
        runList.append(node);
      }
      node.hidden = false;
      const free = runsFree(real, spec.key);
      node.classList.toggle('is-held', !free);
      const station = t(`real.station.${spec.station}` as StringKey);
      const tag = spec.tail ? ` (${t(`real.tag.${spec.tail}` as StringKey)})` : '';
      setText(
        node,
        t(free ? 'real.gearbox.free' : 'real.gearbox.held', {
          label: `${spec.label}${tag}`,
          station,
        }),
      );
    });
    runNodes.slice(specs.length).forEach((node) => (node.hidden = true));

    const text = real.notice ? noticeText(real.notice) : '';
    setText(notice, text);
    notice.hidden = text === '';
  };

  return { element, refresh };
}
