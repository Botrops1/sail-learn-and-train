import type { AppState, Store } from '../app/store';
import { compassDeg, wrap180 } from '../model/angles';
import { controlSpec, normalizeWindFrom, snapControl } from '../model/controls';
import { beaufort, WIND_PRESETS, windSide } from '../model/wind';
import { el } from './dom';
import { t } from './i18n';
import { setText, stepButton } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Wind dial drawing, in SVG units (the dial scales with its box). */
const DIAL = { size: 220, ring: 88, tickOuter: 96, labelRadius: 76, arrowFrom: 104, arrowTo: 50 };

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** Point on the dial for a wind angle: 0 at the top (bow), +90 on the right (starboard). */
function onDial(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [radius * Math.sin(a), -radius * Math.cos(a)];
}

/** "060": a compass bearing with three digits. */
function bearing(deg: number): string {
  return String(Math.round(compassDeg(deg)) % 360).padStart(3, '0');
}

/** "60° to starboard of the bow", "dead ahead": where the wind is, seen from the boat. */
function relativeText(twaDeg: number): string {
  const side = windSide(twaDeg);
  if (side === 'ahead' || side === 'astern') return t(`wind.relative.${side}`);
  return t(`wind.relative.${side}`, { deg: Math.round(Math.abs(twaDeg)) });
}

/**
 * The Wind tab (PHASE1_SPEC 5.2, 6.3, 7.1; PHASE2_SPEC 6.5): the Held still / Sailing switch, a
 * compass (north at the top) with the boat in the middle, turned to her heading, and an arrow
 * from where the true wind comes (draggable), − / + buttons, the speed slider with the Beaufort
 * force, and the five presets, now relative to the bow. The dial and speed carry the test
 * wind's id (`env_wind`).
 */
export function createWindPanel(store: Store): HTMLElement[] {
  // The dial is a compass: its angles are compass bearings, the control stores them signed.
  const setDirection = (value: number) =>
    store.dispatch({
      type: 'setControls',
      values: {
        ctl_wind_dir: snapControl('ctl_wind_dir', wrap180(value), store.getState().settings.step),
      },
    });
  const nudge = (direction: 1 | -1) => {
    const state = store.getState();
    const next = state.controls.ctl_wind_dir + direction * state.settings.step;
    setDirection(normalizeWindFrom(next));
  };

  // The dial.
  const half = DIAL.size / 2;
  const dial = svg('svg', {
    viewBox: `${-half} ${-half} ${DIAL.size} ${DIAL.size}`,
    class: 'wind-dial',
    role: 'slider',
    tabindex: 0,
    'aria-label': t('wind.dial.label'),
    'aria-valuemin': 0,
    'aria-valuemax': 359,
    'data-part-id': 'env_wind',
    'data-testid': 'wind-dial',
  });
  dial.append(svg('circle', { r: DIAL.ring, class: 'dial-ring' }));
  for (let angle = 0; angle < 360; angle += 10) {
    const major = angle % 30 === 0;
    const [x1, y1] = onDial(angle, major ? DIAL.ring - 4 : DIAL.ring);
    const [x2, y2] = onDial(angle, DIAL.tickOuter);
    dial.append(
      svg('line', { x1, y1, x2, y2, class: major ? 'dial-tick dial-tick-major' : 'dial-tick' }),
    );
  }
  for (const [angle, key] of [
    [0, 'wind.dial.north'],
    [90, 'wind.dial.east'],
    [180, 'wind.dial.south'],
    [270, 'wind.dial.west'],
  ] as const) {
    const [x, y] = onDial(angle, DIAL.labelRadius);
    const label = svg('text', { x, y, class: 'dial-label', 'dominant-baseline': 'middle' });
    label.textContent = t(key);
    dial.append(label);
  }
  // The boat from above, turned to her heading; the bow is the pointed end.
  const boatIcon = svg('g', { class: 'dial-boat-icon', 'data-testid': 'dial-boat' });
  boatIcon.append(
    svg('path', {
      d: 'M0,-52 C14,-34 18,-8 17,20 C16,36 14,46 12,50 L-12,50 C-14,46 -16,36 -17,20 C-18,-8 -14,-34 0,-52 Z',
      class: 'dial-boat',
    }),
    svg('line', { x1: 0, y1: -14, x2: 0, y2: 30, class: 'dial-boom' }),
  );
  dial.append(boatIcon);
  const arrow = svg('g', { class: 'dial-arrow' });
  arrow.append(
    svg('line', { x1: 0, y1: -DIAL.arrowFrom, x2: 0, y2: -DIAL.arrowTo - 10 }),
    svg('path', {
      d: `M0,${-DIAL.arrowTo} L-9,${-DIAL.arrowTo - 16} L9,${-DIAL.arrowTo - 16} Z`,
    }),
  );
  dial.append(arrow);

  const angleAt = (event: PointerEvent) => {
    const box = dial.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  };
  let dragging: number | null = null;
  dial.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    dragging = event.pointerId;
    dial.setPointerCapture(event.pointerId);
    setDirection(angleAt(event));
    event.preventDefault();
  });
  dial.addEventListener('pointermove', (event) => {
    if (dragging === event.pointerId) setDirection(angleAt(event));
  });
  const endDrag = (event: PointerEvent) => {
    if (dragging === event.pointerId) dragging = null;
  };
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', endDrag);
  dial.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => nudge(1),
      ArrowUp: () => nudge(1),
      ArrowLeft: () => nudge(-1),
      ArrowDown: () => nudge(-1),
      Home: () => setDirection(0),
      End: () => setDirection(180),
    };
    const handler = keys[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  });

  const directionValue = el('p', { class: 'wind-value', 'aria-hidden': 'true' });
  const directionField = el('fieldset', { class: 'field' }, [
    el('legend', {}, [t('wind.dial.label')]),
    el('p', { class: 'hint' }, [t('wind.dial.hint')]),
    el('div', { class: 'dial-row' }, [
      stepButton('−', t('wind.less'), () => nudge(-1)),
      dial,
      stepButton('+', t('wind.more'), () => nudge(1)),
    ]),
    directionValue,
  ]);

  // Speed.
  const speedSpec = controlSpec('ctl_wind_speed');
  const speed = el('input', {
    type: 'range',
    id: 'wind-speed',
    min: String(speedSpec.min),
    max: String(speedSpec.max),
    step: '1',
    'data-part-id': 'env_wind',
  });
  speed.addEventListener('input', () =>
    store.dispatch({ type: 'setControls', values: { ctl_wind_speed: Number(speed.value) } }),
  );
  const speedValue = el('span', { class: 'control-value' });
  const speedField = el('div', { class: 'field control' }, [
    el('div', { class: 'control-head' }, [
      el('label', { for: 'wind-speed', class: 'control-name' }, [t('wind.speed.label')]),
      speedValue,
    ]),
    el('div', { class: 'control-row' }, [speed]),
  ]);

  // Presets.
  const presets = el('div', { class: 'segments segments-grid' });
  for (const preset of WIND_PRESETS) {
    const button = el('button', { type: 'button', class: 'segment preset' }, [
      t(`wind.preset.${preset.id}`),
    ]);
    button.addEventListener('click', () =>
      store.dispatch({
        type: 'setControls',
        values: {
          // The preset is an angle to the bow: add the heading to get the compass direction.
          ctl_wind_dir: wrap180(store.getState().boat.headingDeg + preset.windFromDeg),
          ctl_wind_speed: preset.speedKn,
        },
      }),
    );
    presets.append(button);
  }
  const presetField = el('fieldset', { class: 'field' }, [
    el('legend', {}, [t('wind.presets.label')]),
    el('p', { class: 'hint' }, [t('wind.presets.hint'), ' ', t('wind.presets.hint2')]),
    presets,
  ]);

  let shownHeading = '';
  const refresh = (state: AppState, previous?: AppState) => {
    const heading = String(Math.round(state.boat.headingDeg * 2) / 2);
    if (heading !== shownHeading) {
      shownHeading = heading;
      boatIcon.setAttribute('transform', `rotate(${heading})`);
    }
    if (
      previous &&
      state.controls === previous.controls &&
      state.boat.headingDeg === previous.boat.headingDeg
    )
      return;
    const from = state.controls.ctl_wind_dir;
    const compass = compassDeg(from);
    const twa = wrap180(from - state.boat.headingDeg);
    const kn = state.controls.ctl_wind_speed;
    arrow.setAttribute('transform', `rotate(${compass})`);
    dial.setAttribute('aria-valuenow', String(Math.round(compass)));
    const text = t('wind.compass', { compass: bearing(compass), relative: relativeText(twa) });
    dial.setAttribute('aria-valuetext', text);
    setText(directionValue, text);
    if (speed.value !== String(kn)) speed.value = String(kn);
    setText(speedValue, t('wind.speed.value', { speed: kn, force: beaufort(kn) }));
  };
  store.subscribe(refresh);
  refresh(store.getState());

  return [
    el('p', { class: 'hint' }, [t('wind.hint')]),
    createBoatModeSwitch(store),
    directionField,
    speedField,
    presetField,
  ];
}

const BOAT_MODES = ['held', 'sailing'] as const;

/** Boat: [Held still] [Sailing] (PHASE2_SPEC 6.5). Held still is Phase 1; Sailing the default. */
function createBoatModeSwitch(store: Store): HTMLElement {
  const options = el('div', { class: 'segments' });
  const inputs = BOAT_MODES.map((mode) => {
    const input = el('input', {
      type: 'radio',
      name: 'boat-mode',
      value: mode,
      'data-testid': `boat-mode-${mode}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setBoatMode', mode });
    });
    options.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`boat.mode.${mode}`)])]),
    );
    return { mode, input };
  });
  const group = el('fieldset', { class: 'field segmented', 'data-testid': 'boat-mode' }, [
    el('legend', {}, [t('boat.mode.label')]),
    el('p', { class: 'hint' }, [t('boat.mode.hint')]),
    options,
  ]);
  const sync = (state: AppState, previous?: AppState) => {
    if (previous && state.boat.mode === previous.boat.mode) return;
    for (const { mode, input } of inputs) input.checked = mode === state.boat.mode;
  };
  store.subscribe(sync);
  sync(store.getState());
  return group;
}
