import type { AppState, Store } from '../app/store';
import { compassDeg } from '../model/angles';
import { boat } from '../model/boat';
import { significantHeightM, waveTrains, type SeaSetting } from '../model/waves';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

const SETTINGS = boat.waves.settings as readonly SeaSetting[];

/** "045": a compass bearing with three digits (as windPanel writes them). */
function bearing(deg: number): string {
  return String(Math.round(compassDeg(deg)) % 360).padStart(3, '0');
}

/** The status line under the Waves buttons (PHASE3_SPEC 6.5). */
export function seaStatusText(state: AppState): string {
  if (state.sea.setting === 'flat') return t('waves.statusFlat');
  const trains = waveTrains(state.sea);
  const main = trains[0];
  if (!main) return t('waves.statusCalm');
  return t('waves.status', {
    height: significantHeightM(trains).toFixed(1),
    period: main.periodS.toFixed(1),
    compass: bearing(state.sea.dirDeg),
  });
}

/**
 * The Waves block of the Wind tab (PHASE3_SPEC 6.5), built like the wind-mode block:
 * [Flat] [Sheltered] [Coastal] [Open sea], what the waves are now, and a hint. It carries the
 * water's id (`env_water`).
 */
export function createWavesPanel(store: Store): HTMLElement {
  const options = el('div', { class: 'segments segments-wrap' });
  const inputs = SETTINGS.map((setting) => {
    const input = el('input', {
      type: 'radio',
      name: 'sea-setting',
      value: setting,
      'data-testid': `sea-${setting}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setSeaSetting', setting });
    });
    options.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`waves.${setting}`)])]),
    );
    return { setting, input };
  });
  const status = el('p', { class: 'hint', 'data-testid': 'sea-status', 'aria-live': 'polite' });
  const group = el(
    'fieldset',
    { class: 'field segmented', 'data-part-id': 'env_water', 'data-testid': 'sea-setting' },
    [
      el('legend', {}, [t('waves.label')]),
      options,
      status,
      el('p', { class: 'hint' }, [`${t('waves.hint')} ${t('waves.effects')}`]),
    ],
  );

  const refresh = (state: AppState, previous?: AppState) => {
    if (!previous || state.sea.setting !== previous.sea.setting) {
      for (const { setting, input } of inputs) input.checked = setting === state.sea.setting;
    }
    // The wind's lag moves the sea a little every frame: the text is rebuilt only when it changes.
    if (!previous || state.sea !== previous.sea) setText(status, seaStatusText(state));
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return group;
}
