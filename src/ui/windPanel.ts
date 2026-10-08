import type { AppState, Store } from '../app/store';
import { controlSpec, normalizeWindFrom, snapControl } from '../model/controls';
import { beaufort, WIND_PRESETS, windSide } from '../model/wind';
import { el } from './dom';
import { t, type StringKey } from './i18n';
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

/** "from 60° starboard" style text for a wind direction. */
export function windFromText(windFromDeg: number, short = false): string {
  const side = windSide(windFromDeg);
  const key = `wind.side${short ? '.short' : ''}.${side}` as StringKey;
  return t('wind.from', { deg: Math.round(Math.abs(windFromDeg)), side: t(key) });
}

/**
 * The Wind tab (PHASE1_SPEC 5.2, 6.3, 7.1): a draggable dial with the boat in the middle and an
 * arrow from where the wind comes, − / + buttons, the speed slider with the Beaufort force, and
 * the five presets. The dial and speed carry the test wind's id (`env_wind`).
 */
export function createWindPanel(store: Store): HTMLElement[] {
  const dirSpec = controlSpec('ctl_wind_dir');
  const setDirection = (value: number) =>
    store.dispatch({
      type: 'setControls',
      values: {
        ctl_wind_dir: snapControl('ctl_wind_dir', value, store.getState().settings.step),
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
    'aria-valuemin': dirSpec.min,
    'aria-valuemax': dirSpec.max,
    'data-part-id': 'env_wind',
    'data-testid': 'wind-dial',
  });
  dial.append(svg('circle', { r: DIAL.ring, class: 'dial-ring' }));
  for (let angle = -150; angle <= 180; angle += 30) {
    const [x1, y1] = onDial(angle, DIAL.ring);
    const [x2, y2] = onDial(angle, DIAL.tickOuter);
    dial.append(svg('line', { x1, y1, x2, y2, class: 'dial-tick' }));
  }
  for (const [angle, text] of [
    [0, '0'],
    [90, '90'],
    [180, '180'],
    [-90, '−90'],
  ] as const) {
    const [x, y] = onDial(angle, DIAL.labelRadius);
    const label = svg('text', { x, y, class: 'dial-label', 'dominant-baseline': 'middle' });
    label.textContent = text;
    dial.append(label);
  }
  // The boat from above, bow up: port on the left, starboard on the right.
  dial.append(
    svg('path', {
      d: 'M0,-52 C14,-34 18,-8 17,20 C16,36 14,46 12,50 L-12,50 C-14,46 -16,36 -17,20 C-18,-8 -14,-34 0,-52 Z',
      class: 'dial-boat',
    }),
    svg('line', { x1: 0, y1: -14, x2: 0, y2: 30, class: 'dial-boom' }),
  );
  for (const [x, text] of [
    [-34, t('wind.dial.port')],
    [34, t('wind.dial.starboard')],
  ] as const) {
    const label = svg('text', { x, y: 0, class: 'dial-side', 'dominant-baseline': 'middle' });
    label.textContent = text;
    dial.append(label);
  }
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
        values: { ctl_wind_dir: preset.windFromDeg, ctl_wind_speed: preset.speedKn },
      }),
    );
    presets.append(button);
  }
  const presetField = el('fieldset', { class: 'field' }, [
    el('legend', {}, [t('wind.presets.label')]),
    el('p', { class: 'hint' }, [t('wind.presets.hint')]),
    presets,
  ]);

  const refresh = (state: AppState, previous?: AppState) => {
    if (previous && state.controls === previous.controls) return;
    const from = state.controls.ctl_wind_dir;
    const kn = state.controls.ctl_wind_speed;
    arrow.setAttribute('transform', `rotate(${from})`);
    dial.setAttribute('aria-valuenow', String(from));
    dial.setAttribute('aria-valuetext', windFromText(from));
    setText(directionValue, windFromText(from));
    if (speed.value !== String(kn)) speed.value = String(kn);
    setText(speedValue, t('wind.speed.value', { speed: kn, force: beaufort(kn) }));
  };
  store.subscribe(refresh);
  refresh(store.getState());

  return [el('p', { class: 'hint' }, [t('wind.hint')]), directionField, speedField, presetField];
}
