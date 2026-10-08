import type { Store } from '../app/store';
import { CAMERA_PRESETS } from '../model/settings';
import { el } from './dom';
import { t, type StringKey } from './i18n';

/** Camera preset buttons over the 3D view (PHASE1_SPEC 5.2). Short labels; full name as aria-label. */
export function createCameraBar(host: HTMLElement, store: Store): HTMLElement {
  const bar = el('div', { class: 'camera-bar', role: 'group', 'aria-label': t('cam.barLabel') });
  const buttons = CAMERA_PRESETS.map((preset) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'camera-button',
        'data-preset': preset,
        'aria-label': t(`cam.${preset}` as StringKey),
        title: t(`cam.${preset}` as StringKey),
      },
      [t(`cam.short.${preset}` as StringKey)],
    );
    button.addEventListener('click', () => store.dispatch({ type: 'setCameraPreset', preset }));
    bar.append(button);
    return { preset, button };
  });
  host.append(bar);

  const sync = () => {
    const active = store.getState().camera.preset;
    for (const { preset, button } of buttons) {
      button.setAttribute('aria-pressed', String(preset === active));
    }
  };
  store.subscribe(sync);
  sync();
  return bar;
}
