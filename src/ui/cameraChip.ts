import type { Store } from '../app/store';
import { CAMERA_PRESETS, type CameraPreset } from '../model/settings';
import { createChipMenu } from './chipMenu';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import type { MapView } from './mapView';

/** The row of chips over the bottom of the 3D view (PHASE5_SPEC 3.2): camera chip, gear. */
export function createViewBottom(view: HTMLElement): HTMLElement {
  const row = el('div', { class: 'view-bottom', 'data-testid': 'view-bottom' });
  view.append(row);
  return row;
}

/**
 * The camera chip ("Port ▾") and its menu of views (PHASE5_SPEC 6.4). It goes before the gear in
 * the chip row. Dragging the 3D view still switches to Free, and the chip then reads "Free".
 * While the map shows, a Close chip (M28) goes back to the view the map was opened from.
 */
export function createCameraChip(row: HTMLElement, store: Store, map: MapView): void {
  const view = row.parentElement;
  if (!view) return;

  const label = el('span', { class: 'chip-label' });
  const chip = el(
    'button',
    { type: 'button', class: 'view-chip camera-chip', 'data-testid': 'camera-chip' },
    [label, el('span', { class: 'chip-caret', 'aria-hidden': 'true' }, ['▾'])],
  );
  const gear = row.querySelector('[data-testid="settings-button"]');
  if (gear) row.insertBefore(chip, gear);
  else row.append(chip);

  const menu = createChipMenu(
    view,
    chip,
    CAMERA_PRESETS.map((preset) => ({
      id: preset,
      testId: `camera-option-${preset}`,
      content: [t(`cam.${preset}` as StringKey)],
    })),
    (id) => store.dispatch({ type: 'setCameraPreset', preset: id as CameraPreset }),
    {
      label: t('cam.label'),
      hint: t('cam.menuHint'),
      testId: 'camera-menu',
      hintClass: 'camera-menu-hint',
    },
  );

  const sync = (state = store.getState(), previous?: typeof state) => {
    if (previous && state.camera.preset === previous.camera.preset) return;
    const preset = state.camera.preset;
    label.textContent = t(`cam.short.${preset}` as StringKey);
    chip.setAttribute('aria-label', t('cam.chip', { name: t(`cam.${preset}` as StringKey) }));
    menu.setChecked(preset);
  };
  store.subscribe(sync);
  sync();

  // The Close chip (M28, PHASE5_SPEC 9.4): hidden unless the map shows. Closing returns to the view
  // the map was opened from (a link that opens on the map has none: Port).
  const close = el(
    'button',
    {
      type: 'button',
      class: 'view-chip map-close',
      'data-testid': 'map-close',
      'aria-label': t('map.close'),
    },
    [el('span', { class: 'chip-label' }, [`× ${t('map.closeShort')}`])],
  );
  close.hidden = store.getState().camera.preset !== 'map';
  if (gear) row.insertBefore(close, gear);
  else row.append(close);
  close.addEventListener('click', () => {
    store.dispatch({ type: 'setCameraPreset', preset: map.before() ?? 'side-port' });
    // The mini-map shows again where it is on; otherwise the camera chip.
    const miniMap = view.querySelector<HTMLElement>('[data-testid="mini-map"]:not([hidden])');
    (miniMap ?? chip).focus();
  });
  store.subscribe((state, previous) => {
    if (state.camera.preset === previous.camera.preset) return;
    close.hidden = state.camera.preset !== 'map';
  });
}
