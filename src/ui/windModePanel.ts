import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { compassDeg } from '../model/angles';
import {
  LOCAL_WIND_IDS,
  SEED_MAX,
  SEED_MIN,
  WIND_MODE_IDS,
  sizeRange,
  type WindModeId,
} from '../model/windModes';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/** "060": a compass bearing with three digits. */
function bearing(deg: number): string {
  return String(Math.round(compassDeg(deg)) % 360).padStart(3, '0');
}

/** A new random pattern: a seed from 1 to 99,999 (the model stays free of randomness). */
function newSeed(): number {
  return SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
}

/** Slider step by mode (presentation): gust % in 5s, degrees and knots in 1s. */
const SIZE_STEP: Record<WindModeId, number> = {
  steady: 1,
  gusty: 5,
  shifty: 1,
  building: 1,
  dying: 1,
  summer: 1,
  bura: 1,
  jugo: 1,
};

/**
 * The wind modes of the Wind tab (PHASE2_SPEC 10.3), under the speed slider: `Wind changes`
 * [Steady] [Gusty] [Shifty] [Building] [Dying], a slider for the size of the pattern, `New
 * pattern`. (The time scale is in the time bar over the 3D view.) All carry the test wind's id (`env_wind`).
 */
export function createWindModePanel(store: Store): HTMLElement[] {
  // The five modes, and the three local winds (M94) in a second row of the same radio group.
  const modeOptions = el('div', { class: 'segments segments-wrap' });
  const localOptions = el('div', { class: 'segments segments-wrap' });
  const modeInputs = [...WIND_MODE_IDS, ...LOCAL_WIND_IDS].map((mode) => {
    const input = el('input', {
      type: 'radio',
      name: 'wind-mode',
      value: mode,
      'data-testid': `wind-mode-${mode}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setWindMode', mode });
    });
    const row = (LOCAL_WIND_IDS as readonly WindModeId[]).includes(mode)
      ? localOptions
      : modeOptions;
    row.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`wind.mode.${mode}`)])]),
    );
    return { mode, input };
  });
  const modeHint = el('p', { class: 'hint', 'data-testid': 'wind-mode-hint' });
  const modes = el(
    'fieldset',
    { class: 'field segmented', 'data-part-id': 'env_wind', 'data-testid': 'wind-modes' },
    [
      el('legend', {}, [t('wind.modes.label')]),
      el('p', { class: 'hint explain' }, [t('wind.modes.hint')]),
      modeOptions,
      modeHint,
    ],
  );

  const local = el(
    'fieldset',
    { class: 'field segmented', 'data-part-id': 'env_wind', 'data-testid': 'wind-local' },
    [
      el('legend', {}, [t('wind.local.label')]),
      el('p', { class: 'hint explain' }, [t('wind.local.hint')]),
      localOptions,
    ],
  );

  // The size of the pattern.
  const size = el('input', {
    type: 'range',
    id: 'wind-size',
    step: '1',
    'data-part-id': 'env_wind',
    'data-testid': 'wind-size',
  });
  size.addEventListener('input', () =>
    store.dispatch({ type: 'setWindSize', size: Number(size.value) }),
  );
  const sizeName = el('label', {
    for: 'wind-size',
    class: 'control-name',
    'data-testid': 'wind-size-name',
  });
  const newPattern = el(
    'button',
    { type: 'button', class: 'segment', 'data-testid': 'wind-new-pattern' },
    [t('wind.newPattern')],
  );
  newPattern.addEventListener('click', () =>
    store.dispatch({ type: 'newWindPattern', seed: newSeed() }),
  );
  const sizeField = el('div', { class: 'field control', 'data-testid': 'wind-size-field' }, [
    el('div', { class: 'control-head' }, [sizeName]),
    el('div', { class: 'control-row' }, [size]),
    el('p', { class: 'hint explain' }, [t('wind.newPattern.hint')]),
    newPattern,
  ]);

  let shownMode: WindModeId | undefined;
  const refresh = (state: AppState, previous?: AppState) => {
    const { windMode } = state;
    if (!previous || windMode.mode !== previous.windMode.mode) {
      for (const { mode, input } of modeInputs) input.checked = mode === windMode.mode;
      setText(modeHint, t(`wind.mode.${windMode.mode}.hint`));
    }
    const range = sizeRange(windMode.mode);
    sizeField.hidden = range === null;
    if (range) {
      if (shownMode !== windMode.mode) {
        size.min = String(range.min);
        size.max = String(range.max);
        size.step = String(SIZE_STEP[windMode.mode]);
      }
      if (size.value !== String(windMode.size)) size.value = String(windMode.size);
      const rampS =
        windMode.mode === 'dying' ? boat.windModes.dying.rampS : boat.windModes.building.rampS;
      setText(
        sizeName,
        t(`wind.size.${windMode.mode as Exclude<WindModeId, 'steady'>}`, {
          value: windMode.size,
          min: Math.round(rampS / 60),
        }),
      );
    }
    shownMode = windMode.mode;
  };
  store.subscribe(refresh);
  refresh(store.getState());

  return [modes, local, sizeField];
}

/** "Wind now: 17 kn from 070°": the true wind with the pattern, under the compass dial. */
export function windNowText(state: AppState): string {
  return t('wind.now', {
    speed: Math.round(state.wind.twsKn),
    compass: bearing(state.wind.dirDeg),
  });
}
