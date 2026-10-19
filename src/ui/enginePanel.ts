import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { gearOf } from '../model/engine';
import { el } from './dom';
import { formatThousands, t } from './i18n';
import { setText, stepButton } from './stepper';

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

function setAttr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

const ENGINE = boat.physics.engine;

/** The tachometer scale: 0 … 3,000 rpm over a half circle, red from the sticker's 2,500. */
const TACH = { maxRpm: 3000, width: 120, height: 70, radius: 50, needle: 44, centreY: 60 } as const;

/** "1,850": rpm rounded to 10 so the text does not change every frame. */
export function rpmNumber(rpm: number): string {
  return formatThousands(Math.round(rpm / 10) * 10);
}

/** "1,850 rpm". */
export function rpmText(rpm: number): string {
  return t('engine.rpm', { rpm: rpmNumber(rpm) });
}

/** The engine's state in words: stopped, or which gear it is in. */
function gearText(state: AppState): string {
  const { engine } = state;
  if (!engine.running) return t('engine.stopped');
  if (engine.gear === 'neutral') {
    // The lever is on a side but the gearbox has not engaged yet: it is shifting.
    const wanted = gearOf(engine.leverPct);
    return t(wanted === 'neutral' ? 'engine.gear.neutral' : 'engine.gear.shifting');
  }
  return t(engine.gear === 'ahead' ? 'engine.gear.ahead' : 'engine.gear.astern');
}

/** Point on the tachometer arc: angle 0 = 0 rpm (left), 180° = full scale (right). */
function tachPoint(rpm: number, radius: number): [number, number] {
  const angle = Math.PI * (1 - Math.min(rpm, TACH.maxRpm) / TACH.maxRpm);
  return [TACH.width / 2 + radius * Math.cos(angle), TACH.centreY - radius * Math.sin(angle)];
}

function arc(fromRpm: number, toRpm: number): string {
  const [x1, y1] = tachPoint(fromRpm, TACH.radius);
  const [x2, y2] = tachPoint(toRpm, TACH.radius);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${TACH.radius} ${TACH.radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

interface Tach {
  element: SVGSVGElement;
  update(rpm: number): void;
}

/** The small tachometer arc with its needle. */
function createTach(): Tach {
  const needle = svg('line', {
    x1: TACH.width / 2,
    y1: TACH.centreY,
    x2: tachPoint(0, TACH.needle)[0],
    y2: tachPoint(0, TACH.needle)[1],
    class: 'tach-needle',
  });
  const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000].map((rpm) => {
    const [x1, y1] = tachPoint(rpm, TACH.radius - 2);
    const [x2, y2] = tachPoint(rpm, TACH.radius + 5);
    return svg('line', {
      x1: x1.toFixed(1),
      y1: y1.toFixed(1),
      x2: x2.toFixed(1),
      y2: y2.toFixed(1),
      class: rpm >= ENGINE.maxRpm ? 'tach-tick is-red' : 'tach-tick',
    });
  });
  const element = svg(
    'svg',
    {
      class: 'engine-tach',
      viewBox: `0 0 ${TACH.width} ${TACH.height}`,
      width: TACH.width,
      height: TACH.height,
      role: 'img',
      'data-testid': 'engine-tach',
    },
    [
      svg('path', { d: arc(0, ENGINE.maxRpm), class: 'tach-arc' }),
      svg('path', { d: arc(ENGINE.maxRpm, TACH.maxRpm), class: 'tach-arc is-red' }),
      ...ticks,
      needle,
      svg('circle', { cx: TACH.width / 2, cy: TACH.centreY, r: 4, class: 'tach-hub' }),
    ],
  );
  return {
    element,
    update(rpm) {
      const [x, y] = tachPoint(rpm, TACH.needle);
      setAttr(needle, 'x2', x.toFixed(1));
      setAttr(needle, 'y2', y.toFixed(1));
      setAttr(
        element,
        'aria-label',
        t('engine.tach', {
          rpm: formatThousands(Math.round(rpm / 10) * 10),
          max: formatThousands(ENGINE.maxRpm),
        }),
      );
    },
  };
}

function startStopButton(store: Store): {
  button: HTMLButtonElement;
  /** M44: "The propeller is fouled by a line: clear it first.", beside the button while a line is round the propeller. */
  note: HTMLElement;
  update(s: AppState): void;
} {
  const note = el('p', { class: 'hint', 'data-testid': 'engine-fouled' }, [t('engine.fouled')]);
  note.hidden = true;
  const button = el('button', {
    type: 'button',
    class: 'engine-startstop',
    'data-testid': 'engine-startstop',
  });
  button.addEventListener('click', () =>
    store.dispatch({
      type: 'engine',
      command: store.getState().engine.running ? 'stop' : 'start',
    }),
  );
  return {
    button,
    note,
    update(state) {
      const running = state.engine.running;
      setAttr(button, 'aria-pressed', String(running));
      setText(button, t(running ? 'engine.stop' : 'engine.start'));
      // A line round the propeller: Start waits until a diver has cleared it (M44).
      const fouled = state.lines.fouled;
      if (button.disabled !== (fouled && !running)) button.disabled = fouled && !running;
      if (note.hidden === fouled) note.hidden = !fouled;
    },
  };
}

/** A lever position as text, e.g. "Ahead 65 %", "Neutral", "Astern 40 %". */
export function leverText(leverPct: number): string {
  const pct = Math.round(Math.abs(leverPct));
  if (gearOf(leverPct) === 'neutral') return t('engine.neutral');
  return `${t(leverPct > 0 ? 'engine.ahead' : 'engine.astern')} ${pct} %`;
}

/**
 * The engine in the Ropes tab, Easy mode (PHASE2_SPEC 12.3), under the autopilot: a Start / Stop
 * button, the lever as a slider from −100 (astern) to +100 (ahead) with the neutral band shaded,
 * and the rpm on a small tachometer. The arrow keys move the lever by the step.
 */
export function createEnginePanel(store: Store): HTMLElement {
  const sliderId = 'engine-lever';
  const startStop = startStopButton(store);
  const tach = createTach();
  const rpm = el('span', { class: 'engine-rpm', 'data-testid': 'engine-rpm' });
  const status = el('p', { class: 'engine-status', 'data-testid': 'engine-status' });
  const value = el('span', { class: 'control-value', 'data-testid': 'engine-lever-value' });

  const set = (leverPct: number) => store.dispatch({ type: 'engine', command: { leverPct } });
  const nudge = (direction: 1 | -1) => {
    const state = store.getState();
    set(state.engine.leverPct + direction * state.settings.step);
  };
  const slider = el('input', {
    type: 'range',
    id: sliderId,
    min: '-100',
    max: '100',
    step: '1',
    'data-testid': 'engine-lever',
    'aria-describedby': 'engine-status',
  });
  slider.addEventListener('input', () => set(Number(slider.value)));
  // The neutral band is shaded behind the labels under the slider.
  const band = el('span', { class: 'engine-band', 'aria-hidden': 'true' });
  band.style.width = `${ENGINE.neutralBandPct}%`;
  band.style.left = `${50 - ENGINE.neutralBandPct / 2}%`;
  status.id = 'engine-status';

  const root = el(
    'section',
    {
      class: 'engine-panel',
      'data-part-id': 'engine_control',
      'data-testid': 'engine-panel',
      'aria-label': t('engine.label'),
    },
    [
      el('div', { class: 'engine-head' }, [startStop.button, startStop.note]),
      el('div', { class: 'engine-gauge' }, [
        tach.element,
        el('div', { class: 'engine-readout' }, [rpm, status]),
      ]),
      el('div', { class: 'control-head' }, [
        el('label', { for: sliderId, class: 'control-name' }, [t('engine.lever')]),
        value,
      ]),
      el('div', { class: 'control-row' }, [
        stepButton('−', t('engine.lever.less'), () => nudge(-1)),
        slider,
        stepButton('+', t('engine.lever.more'), () => nudge(1)),
      ]),
      el('div', { class: 'engine-scale' }, [
        band,
        el('span', {}, [t('engine.astern')]),
        el('span', { class: 'engine-scale-neutral' }, [t('engine.neutral')]),
        el('span', {}, [t('engine.ahead')]),
      ]),
      el('p', { class: 'hint explain' }, [t('engine.hint')]),
    ],
  );

  const refresh = (state: AppState) => {
    startStop.update(state);
    const lever = String(state.engine.leverPct);
    if (slider.value !== lever) slider.value = lever;
    setText(value, leverText(state.engine.leverPct));
    setText(rpm, rpmText(state.engine.rpm));
    setText(status, gearText(state));
    tach.update(state.engine.rpm);
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}

/** The lever drawing at the Helm station, in drawing units (about 1 CSS px). */
const L = {
  width: 112,
  height: 232,
  trackX: 56,
  top: 30,
  bottom: 202,
  knob: { w: 76, h: 40 },
} as const;

/** Lever position (−100 … 100) → y in the drawing: ahead (forward) at the top. */
function leverY(leverPct: number): number {
  const mid = (L.top + L.bottom) / 2;
  return mid - (leverPct / 100) * ((L.bottom - L.top) / 2);
}

/**
 * The engine control at the Helm station, Realistic mode (PHASE2_SPEC 12.3): the single lever
 * on the side of the pedestal (photo `engine-control.jpg`), forward = ahead, back = astern,
 * dragged with a finger; the Start / Stop button, the tachometer and the rpm beside it. The
 * lever is also a keyboard slider (arrows, by the step).
 */
export function createEngineLever(store: Store): HTMLElement {
  const startStop = startStopButton(store);
  const tach = createTach();
  const rpm = el('span', { class: 'engine-rpm', 'data-testid': 'engine-rpm' });
  const status = el('p', { class: 'engine-status', 'data-testid': 'engine-status' });
  const value = el('p', { class: 'engine-lever-value', 'data-testid': 'engine-lever-value' });

  const set = (leverPct: number) => store.dispatch({ type: 'engine', command: { leverPct } });

  const bandTop = leverY(ENGINE.neutralBandPct);
  const bandBottom = leverY(-ENGINE.neutralBandPct);
  const knob = svg('g', { class: 'engine-knob' }, [
    svg('rect', {
      x: L.trackX - L.knob.w / 2,
      y: -L.knob.h / 2,
      width: L.knob.w,
      height: L.knob.h,
      rx: 10,
      class: 'engine-knob-body',
    }),
    svg('line', {
      x1: L.trackX - L.knob.w / 2 + 12,
      x2: L.trackX + L.knob.w / 2 - 12,
      y1: 0,
      y2: 0,
      class: 'engine-knob-grip',
    }),
  ]);
  const label = (text: string, y: number, className = '') =>
    svg('text', { x: L.trackX, y, 'text-anchor': 'middle', class: `engine-label ${className}` }, [
      text,
    ]);
  const lever = svg(
    'svg',
    {
      class: 'engine-lever-drawing',
      viewBox: `0 0 ${L.width} ${L.height}`,
      width: L.width,
      height: L.height,
      role: 'slider',
      tabindex: '0',
      'aria-label': t('engine.lever'),
      'aria-valuemin': '-100',
      'aria-valuemax': '100',
      'data-testid': 'engine-lever-drawing',
    },
    [
      svg('rect', {
        x: L.trackX - 10,
        y: L.top - 8,
        width: 20,
        height: L.bottom - L.top + 16,
        rx: 10,
        class: 'engine-track',
      }),
      svg('rect', {
        x: L.trackX - 26,
        y: bandTop,
        width: 52,
        height: bandBottom - bandTop,
        class: 'engine-band-drawing',
      }),
      label(t('engine.ahead'), 14),
      label(t('engine.neutral'), (bandTop + bandBottom) / 2 + 5, 'is-neutral'),
      label(t('engine.astern'), L.height - 6),
      knob,
    ],
  );

  const fromPointer = (event: PointerEvent): number => {
    const box = lever.getBoundingClientRect();
    const scale = box.height / L.height;
    const y = (event.clientY - box.top) / scale;
    const mid = (L.top + L.bottom) / 2;
    const pct = ((mid - y) / ((L.bottom - L.top) / 2)) * 100;
    return Math.max(-100, Math.min(100, Math.round(pct)));
  };
  let dragging = false;
  lever.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    dragging = true;
    lever.setPointerCapture(event.pointerId);
    lever.focus();
    set(fromPointer(event));
  });
  lever.addEventListener('pointermove', (event) => {
    if (dragging) set(fromPointer(event));
  });
  for (const type of ['pointerup', 'pointercancel'] as const) {
    lever.addEventListener(type, () => {
      dragging = false;
    });
  }
  lever.addEventListener('keydown', (event) => {
    const state = store.getState();
    const step = state.settings.step;
    const keys: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
    };
    const delta = keys[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    set(state.engine.leverPct + delta);
  });

  const root = el(
    'section',
    {
      class: 'engine-helm',
      'data-part-id': 'engine_control',
      'data-testid': 'engine-helm',
      'aria-label': t('engine.label'),
    },
    [
      el('h3', { class: 'section-title' }, [t('engine.label')]),
      el('div', { class: 'engine-helm-body' }, [
        lever,
        el('div', { class: 'engine-helm-side' }, [
          startStop.button,
          startStop.note,
          tach.element,
          rpm,
          value,
          status,
        ]),
      ]),
      el('p', { class: 'hint' }, [t('engine.hint')]),
    ],
  );

  const refresh = (state: AppState) => {
    startStop.update(state);
    const pct = state.engine.leverPct;
    setAttr(knob, 'transform', `translate(0 ${leverY(pct).toFixed(1)})`);
    setAttr(lever, 'aria-valuenow', String(pct));
    setAttr(lever, 'aria-valuetext', leverText(pct));
    setText(value, leverText(pct));
    setText(rpm, rpmText(state.engine.rpm));
    setText(status, gearText(state));
    tach.update(state.engine.rpm);
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}
