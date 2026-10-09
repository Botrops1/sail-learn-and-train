import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import {
  stationWinch,
  tailSpecs,
  type RealisticAction,
  type StationId,
  type TailSpec,
} from '../model/realistic';
import { partInfo } from '../model/registry';
import { SCENE } from '../render3d/sceneConfig';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { ropeColorKey, ROPE_DASH } from './ropeLegend';
import { setText } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * One station of Realistic mode drawn from above (PHASE1_SPEC 7.2.2): that side's clutches,
 * large enough to touch (about 60 px wide on a phone), the winch as a circle with its
 * self-tailer jaw on top, the electric button beside it, and the rope tails. Forward is up.
 *
 * Gestures (each also has a button in the strip below, for accessibility and tests):
 * - a clutch: drag its lever up to open, down to close; tap it to select it, tap the selected
 *   one again to open or close it;
 * - a rope's tail: drag it onto the winch;
 * - the drum: circle a finger around it, clockwise adds a turn, anticlockwise takes one off;
 * - the tail in the hand: drag it into the jaw (self-tailer), or away from the winch to ease;
 * - the tail in the jaw: drag it out;
 * - the tail in the hand, dragged back up to its clutch: off the winch, but only with 0 turns
 *   on the drum (otherwise it says to take the turns off first);
 * - the button: hold it to winch in.
 */
const D = {
  width: 360,
  margin: 8,
  gap: 8,
  roll: { top: 6, height: 30, width: 128 },
  ropeIn: 14,
  clutchHeight: 124,
  lever: { inset: 7, height: 15, closedDrop: 26 },
  /** White label sticker under the lever; the label in up to two lines across it. */
  sticker: { inset: 5, top: 54, height: 50, lineGap: 1.15, tagFont: 9 },
  /** The word "open" / "closed" sits in the clutch body under the sticker. */
  stateInset: 8,
  knobGap: 22,
  knobRadius: 11,
  winch: { drop: 64, radius: 33, jaw: 12, ringStep: 4, hit: 26 },
  button: { fromRight: 50, radius: 23 },
  hand: { dx: -92, dy: 34 },
  bottomPad: 30,
  ropeWidth: 5,
  font: { label: 11.5, minLabel: 8 },
  glyphEm: { upper: 0.68, lower: 0.54 },
  /** A drag shorter than this (drawing units) is a tap. */
  tapMove: 10,
  /** Lever drag that opens or closes (drawing units). */
  leverMove: 12,
  /** One drawing unit of tail pulled away from the winch lets out this much rope (m). */
  easePerUnitM: 0.012,
  /** Circling this far (radians) counts as one turn on the drum. */
  turnRad: 2 * Math.PI * 0.9,
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

function fitFont(text: string, length: number): number {
  const upper = [...text].filter((c) => c >= 'A' && c <= 'Z').length;
  const em = upper * D.glyphEm.upper + (text.length - upper) * D.glyphEm.lower;
  return Math.max(D.font.minLabel, Math.min(D.font.label, length / em));
}

/** A label in at most two lines, split at the space nearest the middle ("Main / furling"). */
function labelLines(label: string): string[] {
  const words = label.split(' ');
  if (words.length < 2) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** Sets an attribute only when it changes (the drawing refreshes every frame). */
function attr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function ropeColor(ropeId: string): string {
  return SCENE.ropes.colors[ropeColorKey(ropeId)];
}

interface ClutchNode {
  spec: TailSpec;
  mid: number;
  group: SVGGElement;
  lever: SVGRectElement;
  state: SVGTextElement;
  tail: SVGLineElement;
  knob: SVGCircleElement;
  leverTop: { open: number; closed: number };
  bottom: number;
}

export interface StationDrawing {
  element: HTMLElement;
  refresh(state: AppState, selected: string | null): void;
}

export interface StationDrawingOptions {
  /** A clutch or its tail was chosen. */
  onSelect(key: string): void;
}

/** Text of a clutch for screen readers: label, our name, open or closed. */
export function clutchAriaLabel(spec: TailSpec, open: boolean): string {
  const name = partInfo(spec.ropeId)?.name ?? spec.ropeId;
  const tail = spec.tail ? `, ${t(`clutch.tail.${spec.tail}` as StringKey)}` : '';
  return `${t('clutch.aria', { label: spec.label, name })}${tail}, ${t(
    open ? 'real.clutch.open' : 'real.clutch.closed',
  )}`;
}

export function createStationDrawing(
  store: Store,
  station: Exclude<StationId, 'helm'>,
  options: StationDrawingOptions,
): StationDrawing {
  const winchId = stationWinch(station) ?? '';
  const specs = tailSpecs().filter((spec) => spec.station === station);
  const rollSpec = specs.find((spec) => spec.bankId === boat.cockpitHardware.jibRollClutch.id);
  const bank = specs.filter((spec) => spec !== rollSpec).sort((a, b) => a.slot - b.slot);

  const clutchTop = (rollSpec ? D.roll.top + D.roll.height + D.ropeIn : D.ropeIn) + 4;
  const clutchBottom = clutchTop + D.clutchHeight;
  const knobY = clutchBottom + D.knobGap;
  const cx = D.width / 2;
  const cy = knobY + D.winch.drop;
  const r = D.winch.radius;
  const height = cy + r + D.bottomPad;
  const hand = { x: cx + D.hand.dx, y: cy + D.hand.dy };
  const button = { x: D.width - D.button.fromRight, y: cy };

  const root = svg('svg', {
    viewBox: `0 0 ${D.width} ${height}`,
    class: 'station-drawing',
    role: 'group',
    'aria-label': t(station === 'port' ? 'real.drawing.port' : 'real.drawing.starboard'),
    'data-testid': `station-drawing-${station}`,
  });
  const notice = el('p', { class: 'station-notice', 'aria-live': 'polite', hidden: '' });
  const element = el('div', { class: 'station-wrap', 'data-station': station }, [root, notice]);

  const nodes: ClutchNode[] = [];
  const unit = (D.width - 2 * D.margin - (bank.length - 1) * D.gap) / bank.length;

  // Clutches of the bank, side by side, ropes arriving from the mast at the top.
  bank.forEach((spec, index) => {
    const x = D.margin + index * (unit + D.gap);
    const mid = x + unit / 2;
    const group = svg('g', {
      class: 'real-clutch',
      role: 'button',
      tabindex: '0',
      'data-drag': `clutch:${spec.key}`,
      'data-key': spec.key,
      'data-rope-id': spec.ropeId,
    });
    const color = ropeColor(spec.ropeId);
    const dash = ROPE_DASH[ropeColorKey(spec.ropeId)];
    const ropeIn = svg('line', {
      x1: mid,
      y1: clutchTop - D.ropeIn,
      x2: mid,
      y2: clutchTop,
      stroke: color,
      'stroke-width': D.ropeWidth,
      'stroke-dasharray': dash,
    });
    const tail = svg('line', {
      x1: mid,
      y1: clutchBottom,
      x2: mid,
      y2: knobY,
      stroke: color,
      'stroke-width': D.ropeWidth,
      'stroke-dasharray': dash,
      class: 'real-tail',
    });
    const knob = svg('circle', {
      cx: mid,
      cy: knobY,
      r: D.knobRadius,
      fill: color,
      class: 'real-knob',
      'data-drag': `tail:${spec.key}`,
    });
    const leverTop = {
      open: clutchTop + D.lever.inset,
      closed: clutchTop + D.lever.inset + D.lever.closedDrop,
    };
    const lever = svg('rect', {
      x: x + D.lever.inset,
      y: leverTop.closed,
      width: unit - 2 * D.lever.inset,
      height: D.lever.height,
      rx: D.lever.height / 2,
      class: 'real-lever',
    });
    const stickerTop = clutchTop + D.sticker.top;
    const stickerWidth = unit - 2 * D.sticker.inset;
    const lines = labelLines(spec.label);
    const fontSize = Math.min(...lines.map((line) => fitFont(line, stickerWidth - 6)));
    // The two furling clutches carry the same label: a small tag says which way each rolls.
    const tag = spec.tail === 'furl' || spec.tail === 'unfurl' ? t(`real.tag.${spec.tail}`) : null;
    const tagSpace = tag ? D.sticker.tagFont * D.sticker.lineGap : 0;
    const labelY = stickerTop + (D.sticker.height - tagSpace) / 2;
    const firstY = labelY - ((lines.length - 1) * fontSize * D.sticker.lineGap) / 2;
    const state = svg(
      'text',
      {
        x: mid,
        y: clutchBottom - D.stateInset,
        class: 'real-clutch-state',
        'text-anchor': 'middle',
      },
      [''],
    );
    group.append(
      svg('rect', {
        x: x - D.gap / 2,
        y: clutchTop - D.ropeIn,
        width: unit + D.gap,
        height: D.clutchHeight + D.ropeIn + 4,
        class: 'clutch-hit',
      }),
      ropeIn,
      svg('rect', {
        x,
        y: clutchTop,
        width: unit,
        height: D.clutchHeight,
        rx: 6,
        class: 'clutch-body',
      }),
      svg('rect', {
        x: x + D.lever.inset - 2,
        y: leverTop.open - 2,
        width: unit - 2 * D.lever.inset + 4,
        height: D.lever.closedDrop + D.lever.height + 4,
        rx: (D.lever.height + 4) / 2,
        class: 'real-lever-slot',
      }),
      lever,
      svg('rect', {
        x: x + D.sticker.inset,
        y: stickerTop,
        width: stickerWidth,
        height: D.sticker.height,
        rx: 4,
        class: `clutch-sticker${spec.controlId ? '' : ' clutch-sticker-plate'}`,
      }),
      ...lines.map((line, index) =>
        svg(
          'text',
          {
            x: mid,
            y: firstY + index * fontSize * D.sticker.lineGap,
            class: 'clutch-label',
            'font-size': fontSize,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
          },
          [line],
        ),
      ),
      ...(tag
        ? [
            svg(
              'text',
              {
                x: mid,
                y: stickerTop + D.sticker.height - tagSpace / 2 - 2,
                class: 'real-clutch-tag',
                'font-size': D.sticker.tagFont,
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
              },
              [tag],
            ),
          ]
        : []),
      state,
    );
    root.append(group);
    if (spec.controlId) root.append(tail, knob);
    nodes.push({ spec, mid, group, lever, state, tail, knob, leverTop, bottom: clutchBottom });
  });

  // JIB ROLL: on the port side deck, further forward, drawn lying down at the top left.
  if (rollSpec) {
    const y = D.roll.top;
    const midY = y + D.roll.height / 2;
    const x = D.margin;
    const w = D.roll.width;
    const color = ropeColor(rollSpec.ropeId);
    const dash = ROPE_DASH[ropeColorKey(rollSpec.ropeId)];
    const group = svg('g', {
      class: 'real-clutch real-clutch-roll',
      role: 'button',
      tabindex: '0',
      'data-drag': `clutch:${rollSpec.key}`,
      'data-key': rollSpec.key,
      'data-rope-id': rollSpec.ropeId,
    });
    const leverTop = { open: y + 2, closed: y + D.roll.height - 2 - 8 };
    const lever = svg('rect', {
      x: x + w - 34,
      y: leverTop.closed,
      width: 26,
      height: 8,
      rx: 4,
      class: 'real-lever',
    });
    const textX = x + w + 2 * D.knobRadius + 18;
    const state = svg('text', { x: textX, y: midY + 12, class: 'real-clutch-state' }, ['']);
    // Its tail lies beside the clutch on the side deck; on the winch it runs aft to the drum.
    const tailX = x + w + 2;
    const knobX = x + w + D.knobRadius + 8;
    const tail = svg('line', {
      x1: tailX,
      y1: midY,
      x2: knobX,
      y2: midY,
      stroke: color,
      'stroke-width': D.ropeWidth,
      'stroke-dasharray': dash,
      class: 'real-tail',
    });
    const knob = svg('circle', {
      cx: knobX,
      cy: midY,
      r: D.knobRadius,
      fill: color,
      class: 'real-knob',
      'data-drag': `tail:${rollSpec.key}`,
    });
    group.append(
      svg('rect', { x: 0, y: 0, width: x + w, height: y + D.roll.height + 4, class: 'clutch-hit' }),
      svg('line', {
        x1: 0,
        y1: midY,
        x2: x,
        y2: midY,
        stroke: color,
        'stroke-width': D.ropeWidth,
        'stroke-dasharray': dash,
      }),
      svg('rect', { x, y, width: w, height: D.roll.height, rx: 6, class: 'clutch-body' }),
      svg('rect', {
        x: x + 6,
        y: y + 6,
        width: w - 48,
        height: D.roll.height - 12,
        rx: 2,
        class: 'clutch-sticker clutch-sticker-plate',
      }),
      svg(
        'text',
        {
          x: x + 6 + (w - 48) / 2,
          y: midY,
          class: 'clutch-label',
          'font-size': fitFont(rollSpec.label, w - 56),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        },
        [rollSpec.label],
      ),
      svg('rect', {
        x: x + w - 36,
        y: y + 1,
        width: 30,
        height: D.roll.height - 2,
        rx: 4,
        class: 'real-lever-slot',
      }),
      lever,
      svg('text', { x: textX, y: midY - 3, class: 'real-caption' }, [t('real.sideDeck')]),
      state,
    );
    // Drawn under the bank, so a tail led to the winch passes beneath the clutches.
    root.prepend(tail);
    root.append(group, knob);
    nodes.push({
      spec: rollSpec,
      mid: tailX,
      group,
      lever,
      state,
      tail,
      knob,
      leverTop,
      bottom: midY,
    });
  }

  // The winch: drum (turns as rings), the self-tailer jaw on top, the button, the hand.
  const winchGroup = svg('g', { class: 'real-winch', 'data-part-id': winchId });
  const ringLayer = svg('g', { class: 'real-rings' });
  const drumHit = svg('circle', {
    cx,
    cy,
    r: r + D.winch.hit,
    class: 'real-drum-hit',
    'data-drag': 'drum',
  });
  const drum = svg('circle', { cx, cy, r, class: 'real-drum' });
  const tick = svg('line', {
    x1: cx,
    y1: cy - D.winch.jaw - 2,
    x2: cx,
    y2: cy - r + 3,
    class: 'real-drum-tick',
  });
  const jaw = svg('circle', { cx, cy, r: D.winch.jaw, class: 'real-jaw' });
  const turnsText = svg(
    'text',
    { x: cx, y: cy + r + 18, class: 'real-turns', 'text-anchor': 'middle' },
    [''],
  );
  const winchCaption = svg(
    'text',
    { x: cx - r - 6, y: cy - r - 8, class: 'clutch-caption', 'text-anchor': 'end' },
    [t(station === 'port' ? 'real.winch.port' : 'real.winch.starboard')],
  );
  const onDrum = svg('path', { class: 'real-on-drum', fill: 'none', 'stroke-width': D.ropeWidth });
  const toTail = svg('line', { class: 'real-tail', 'stroke-width': D.ropeWidth });
  const tailKnob = svg('circle', { r: D.knobRadius, class: 'real-knob', 'data-drag': 'hand' });
  const handText = svg('text', { class: 'real-hand-text', 'text-anchor': 'middle' }, [
    t('real.hand'),
  ]);
  winchGroup.append(
    drumHit,
    ringLayer,
    drum,
    tick,
    jaw,
    onDrum,
    toTail,
    tailKnob,
    handText,
    turnsText,
    winchCaption,
  );

  const buttonGroup = svg('g', {
    class: 'real-button',
    role: 'button',
    tabindex: '0',
    'aria-label': t('real.button.aria'),
    'data-drag': 'button',
    'data-part-id': winchId,
  });
  const buttonDisc = svg('circle', {
    cx: button.x,
    cy: button.y,
    r: D.button.radius,
    class: 'real-button-disc',
  });
  const buttonText = svg(
    'text',
    {
      x: button.x,
      y: button.y + D.button.radius + 14,
      class: 'real-button-text',
      'text-anchor': 'middle',
    },
    [t('real.button.label')],
  );
  buttonGroup.append(
    svg('circle', { cx: button.x, cy: button.y, r: D.button.radius + 8, class: 'clutch-hit' }),
    buttonDisc,
    svg(
      'text',
      {
        x: button.x,
        y: button.y,
        class: 'real-button-icon',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      },
      ['▲'],
    ),
    buttonText,
  );
  // A ghost line while a tail is dragged.
  const ghost = svg('line', {
    class: 'real-ghost',
    'stroke-width': D.ropeWidth,
    visibility: 'hidden',
  });
  root.append(winchGroup, buttonGroup, ghost);

  // --- gestures ---
  const dispatch = (action: RealisticAction) => store.dispatch({ type: 'realistic', action });
  const point = (event: PointerEvent): { x: number; y: number } => {
    const matrix = root.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const nodeFor = (key: string) => nodes.find((node) => node.spec.key === key);
  /** Is the point over the clutch of this rope (where a rope dragged back off the winch goes)? */
  const overClutch = (p: { x: number; y: number }, node: ClutchNode): boolean => {
    if (node.spec === rollSpec) {
      return p.y < D.roll.top + D.roll.height + D.ropeIn && p.x < D.margin + D.roll.width + 8;
    }
    return Math.abs(p.x - node.mid) < unit / 2 + D.gap / 2 && p.y < node.bottom;
  };
  const openClutch = (key: string) => store.getState().realistic.open[key] === true;
  const winchTail = () => store.getState().realistic.winches[winchId]?.tail ?? null;
  const toggleClutch = (key: string) => {
    const open = store.getState().realistic.open[key] === true;
    dispatch({ type: 'clutch', key, open: !open });
  };

  interface Drag {
    kind: string;
    key: string;
    start: { x: number; y: number };
    moved: number;
    /** Circling: angle so far, radians; easing: farthest distance from the drum. */
    angle: number;
    acc: number;
    far: number;
    /** The clutch was already selected when the press began (a tap then opens or closes it). */
    wasSelected: boolean;
  }
  let drag: Drag | null = null;
  let selectedKey: string | null = null;

  // A finger on a part that is dragged must not scroll the panel: the browser would take the
  // touch over and cancel the gesture after a few pixels. `touch-action` does not reach shapes
  // inside an SVG (it failed on a real phone), so the touch itself is claimed. Everything else
  // lets the panel scroll: the body of a clutch (only its lever is dragged), and the area round
  // the winch while no rope is on it.
  root.addEventListener(
    'touchstart',
    (event) => {
      const target = event.target as Element;
      const part = target.closest('[data-drag]');
      const what = part?.getAttribute('data-drag') ?? '';
      if (!part) return;
      if (what.startsWith('clutch:') && !target.closest('.real-lever, .real-lever-slot')) return;
      if (what === 'drum' && !winchTail()) return;
      event.preventDefault();
    },
    { passive: false },
  );

  root.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    const target = (event.target as Element).closest('[data-drag]');
    const what = target?.getAttribute('data-drag');
    if (!what) return;
    const [kind = '', key = ''] = what.split(':');
    const p = point(event);
    if (kind === 'drum' && !winchTail()) return;
    event.preventDefault();
    root.setPointerCapture(event.pointerId);
    drag = {
      kind,
      key,
      start: p,
      moved: 0,
      angle: Math.atan2(p.y - cy, p.x - cx),
      acc: 0,
      far: Math.hypot(p.x - cx, p.y - cy),
      wasSelected: selectedKey === key,
    };
    if (kind === 'button') dispatch({ type: 'button', winch: winchId, held: true });
    // A clutch is selected when the press ends as a tap or a lever drag, not on touching it:
    // a finger that starts a scroll on a clutch body must not select it.
    if (kind === 'tail') options.onSelect(key);
    if (kind === 'hand' || kind === 'jaw' || kind === 'drum') {
      const key = winchTail();
      if (key) options.onSelect(key);
    }
  });

  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = point(event);
    drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.start.x, p.y - drag.start.y));
    if (drag.kind === 'tail' || drag.kind === 'hand' || drag.kind === 'jaw') {
      const from =
        drag.kind === 'tail'
          ? { x: nodeFor(drag.key)?.mid ?? p.x, y: nodeFor(drag.key)?.bottom ?? p.y }
          : { x: cx, y: cy };
      ghost.setAttribute('x1', String(from.x));
      ghost.setAttribute('y1', String(from.y));
      ghost.setAttribute('x2', String(p.x));
      ghost.setAttribute('y2', String(p.y));
      ghost.setAttribute('visibility', 'visible');
    }
    if (drag.kind === 'drum') {
      const angle = Math.atan2(p.y - cy, p.x - cx);
      let delta = angle - drag.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      drag.angle = angle;
      drag.acc += delta;
      // Screen y points down, so a growing angle is clockwise as seen from above.
      while (drag.acc >= D.turnRad) {
        dispatch({ type: 'turn', winch: winchId, delta: 1 });
        drag.acc -= D.turnRad;
      }
      while (drag.acc <= -D.turnRad) {
        dispatch({ type: 'turn', winch: winchId, delta: -1 });
        drag.acc += D.turnRad;
      }
    }
    if (drag.kind === 'hand') {
      // Pulling the tail away from the winch lets rope out (easing by hand), but not while it
      // is on its way back to its clutch (taking it off the winch), and a closed clutch is
      // told at the end of the drag, not on every move.
      const distance = Math.hypot(p.x - cx, p.y - cy);
      if (distance > drag.far) {
        const key = winchTail();
        const node = key ? nodeFor(key) : undefined;
        if (key && node && !overClutch(p, node) && openClutch(key)) {
          dispatch({ type: 'ease', key, metres: (distance - drag.far) * D.easePerUnitM });
        }
        drag.far = distance;
      }
    }
  });

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    ghost.setAttribute('visibility', 'hidden');
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    const p = point(event);
    const overDrum = Math.hypot(p.x - cx, p.y - cy) < r + 18;
    const overJaw = Math.hypot(p.x - cx, p.y - cy) < D.winch.jaw + 14;
    switch (current.kind) {
      case 'button':
        dispatch({ type: 'button', winch: winchId, held: false });
        break;
      case 'clutch': {
        if (cancelled) break;
        const dy = p.y - current.start.y;
        if (dy < -D.leverMove) {
          options.onSelect(current.key);
          dispatch({ type: 'clutch', key: current.key, open: true });
        } else if (dy > D.leverMove) {
          options.onSelect(current.key);
          dispatch({ type: 'clutch', key: current.key, open: false });
        } else if (current.moved < D.tapMove) {
          if (current.wasSelected) toggleClutch(current.key);
          else options.onSelect(current.key);
        }
        break;
      }
      case 'tail':
        if (cancelled || current.moved < D.tapMove) break;
        if (overDrum) dispatch({ type: 'onWinch', key: current.key });
        // Dragged away elsewhere: the hand tries to let the rope out (PT-15: not through a
        // closed clutch).
        else dispatch({ type: 'ease', key: current.key, metres: current.moved * D.easePerUnitM });
        break;
      case 'hand': {
        if (cancelled) break;
        const key = winchTail();
        const node = key ? nodeFor(key) : undefined;
        if (overJaw) dispatch({ type: 'selfTailer', winch: winchId, into: true });
        else if (key && node && current.moved >= D.tapMove) {
          // Back to its clutch: off the winch (only with no turns left on the drum).
          if (overClutch(p, node)) {
            dispatch({ type: 'offWinch', winch: winchId, needZeroTurns: true });
          } else if (!openClutch(key)) {
            dispatch({ type: 'ease', key, metres: current.moved * D.easePerUnitM });
          }
        }
        break;
      }
      case 'jaw': {
        if (cancelled || overJaw || current.moved < D.tapMove) break;
        const key = winchTail();
        const node = key ? nodeFor(key) : undefined;
        // Dragged back to its clutch: the same off-the-winch gesture (it needs no turns, and a
        // rope in the jaw has turns, so it says so). Dragged anywhere else: out of the jaw.
        if (node && overClutch(p, node)) {
          dispatch({ type: 'offWinch', winch: winchId, needZeroTurns: true });
        } else dispatch({ type: 'selfTailer', winch: winchId, into: false });
        break;
      }
      default:
        break;
    }
  };
  root.addEventListener('pointerup', (event) => finish(event, false));
  root.addEventListener('pointercancel', (event) => finish(event, true));

  // Keyboard: Enter / Space selects a clutch (again: opens or closes it), arrows open / close.
  root.addEventListener('keydown', (event) => {
    const target = (event.target as Element).closest('[data-drag]');
    const what = target?.getAttribute('data-drag') ?? '';
    if (what === 'button' && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      if (!event.repeat) dispatch({ type: 'button', winch: winchId, held: true });
      return;
    }
    if (!what.startsWith('clutch:')) return;
    const key = what.slice('clutch:'.length);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selectedKey === key) toggleClutch(key);
      else options.onSelect(key);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      options.onSelect(key);
      dispatch({ type: 'clutch', key, open: event.key === 'ArrowUp' });
    }
  });
  root.addEventListener('keyup', (event) => {
    const target = (event.target as Element).closest('[data-drag]');
    if (
      target?.getAttribute('data-drag') === 'button' &&
      (event.key === ' ' || event.key === 'Enter')
    ) {
      dispatch({ type: 'button', winch: winchId, held: false });
    }
  });
  buttonGroup.addEventListener('blur', () => {
    if (store.getState().realistic.winches[winchId]?.button && !drag) {
      dispatch({ type: 'button', winch: winchId, held: false });
    }
  });

  // --- refresh ---
  const rings: SVGCircleElement[] = [];
  const refresh = (state: AppState, selected: string | null) => {
    selectedKey = selected;
    const real = state.realistic;
    const winch = real.winches[winchId];
    const onWinch = winch?.tail ?? null;
    for (const node of nodes) {
      const { spec } = node;
      const open = real.open[spec.key] === true;
      const report = real.reports[spec.key];
      const y = open ? node.leverTop.open : node.leverTop.closed;
      attr(node.lever, 'y', String(y));
      node.group.classList.toggle('is-open', open);
      node.group.classList.toggle('is-selected', selected === spec.key);
      attr(node.group, 'aria-pressed', String(selected === spec.key));
      const label = clutchAriaLabel(spec, open);
      attr(node.group, 'aria-label', label);
      setText(
        node.state,
        spec.controlId
          ? t(open ? 'real.clutch.openShort' : 'real.clutch.closedShort')
          : t('real.clutch.static'),
      );
      const here = onWinch === spec.key;
      const running = report?.motion === 'running';
      node.tail.classList.toggle('is-running', running);
      const fighting = report !== undefined && report.loadN >= boat.realisticMode.loads.fightingN;
      const color = fighting ? SCENE.ropes.fighting : ropeColor(spec.ropeId);
      attr(node.tail, 'stroke', color);
      // On the winch, the tail is drawn from the clutch to the drum instead of to its knob.
      const x2 = here ? cx - r * 0.72 : Number(node.knob.getAttribute('cx'));
      const y2 = here ? cy - r * 0.72 : Number(node.knob.getAttribute('cy'));
      attr(node.tail, 'x2', String(x2));
      attr(node.tail, 'y2', String(y2));
      attr(node.knob, 'visibility', here ? 'hidden' : 'visible');
      node.knob.classList.toggle('is-selected', selected === spec.key);
    }

    // The rope on the winch: turns as rings, the tail to the jaw or to the hand.
    const spec = onWinch ? specs.find((s) => s.key === onWinch) : undefined;
    const turns = winch?.turns ?? 0;
    const color = spec ? ropeColor(spec.ropeId) : 'none';
    const count = Math.abs(turns);
    while (rings.length < count) {
      const ring = svg('circle', { cx, cy, fill: 'none', 'stroke-width': 3.2 });
      rings.push(ring);
      ringLayer.append(ring);
    }
    rings.forEach((ring, index) => {
      attr(ring, 'visibility', index < count ? 'visible' : 'hidden');
      attr(ring, 'r', String(r + 2 + index * D.winch.ringStep));
      attr(ring, 'stroke', color);
      attr(ring, 'stroke-dasharray', turns < 0 ? '6 4' : 'none');
    });
    const outer = r + 2 + Math.max(0, count - 1) * D.winch.ringStep;
    if (spec) {
      attr(onDrum, 'stroke', color);
      attr(
        onDrum,
        'd',
        `M ${cx - r * 0.72} ${cy - r * 0.72} A ${outer} ${outer} 0 0 ${turns < 0 ? 0 : 1} ${cx} ${cy - outer}`,
      );
      attr(onDrum, 'visibility', 'visible');
      const inJaw = winch?.selfTailer === true;
      const end = inJaw ? { x: cx, y: cy } : hand;
      const start = inJaw ? { x: cx, y: cy - outer } : { x: cx - outer * 0.7, y: cy + outer * 0.7 };
      attr(toTail, 'x1', String(start.x));
      attr(toTail, 'y1', String(start.y));
      attr(toTail, 'x2', String(end.x));
      attr(toTail, 'y2', String(end.y));
      attr(toTail, 'stroke', color);
      attr(toTail, 'visibility', 'visible');
      toTail.classList.toggle('is-running', real.reports[spec.key]?.motion === 'running');
      attr(tailKnob, 'cx', String(end.x));
      attr(tailKnob, 'cy', String(end.y));
      attr(tailKnob, 'r', String(inJaw ? D.winch.jaw - 3 : D.knobRadius));
      attr(tailKnob, 'fill', color);
      attr(tailKnob, 'data-drag', inJaw ? 'jaw' : 'hand');
      attr(tailKnob, 'visibility', 'visible');
      attr(handText, 'x', String(hand.x));
      attr(handText, 'y', String(hand.y + D.knobRadius + 13));
      attr(handText, 'visibility', inJaw ? 'hidden' : 'visible');
      setText(
        turnsText,
        turns === 0
          ? t('real.turns.none')
          : t(turns > 0 ? 'real.turns.cw' : 'real.turns.ccw', { n: count }),
      );
    } else {
      for (const node of [onDrum, toTail, tailKnob, handText]) attr(node, 'visibility', 'hidden');
      setText(turnsText, t('real.winch.empty'));
    }
    turnsText.classList.toggle('is-wrong', turns < 0);
    const angle = winch?.drumAngle ?? 0;
    attr(tick, 'transform', `rotate(${angle.toFixed(1)} ${cx} ${cy})`);

    const pressed = winch?.button === true;
    buttonGroup.classList.toggle('is-pressed', pressed);
    buttonGroup.classList.toggle('is-cut-out', winch?.cutOut === true);
    attr(buttonGroup, 'aria-pressed', String(pressed));
    setText(buttonText, t(winch?.cutOut ? 'real.button.cutOut' : 'real.button.label'));
    drumHit.classList.toggle('is-active', Boolean(onWinch));

    // The last thing that could not be done, written over the drawing.
    const n = real.notice;
    const text = n ? noticeText(n.key, n.tail) : '';
    setText(notice, text);
    notice.hidden = text === '';
  };

  return { element, refresh };
}

/** The message for an action that could not be done. */
export function noticeText(key: string, tail: string | null): string {
  const spec = tail ? tailSpecs().find((s) => s.key === tail) : undefined;
  const label = spec?.label ?? '';
  const station = spec ? t(`real.station.${spec.station}` as StringKey) : '';
  return t(`real.notice.${key}` as StringKey, { label, station });
}
