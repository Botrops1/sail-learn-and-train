import type { Store } from '../app/store';
import { boat } from '../model/boat';
import { el } from './dom';
import { t } from './i18n';

/**
 * The three Helm-camera buttons over the 3D view (M64, PHASE9_SPEC 10.6): Ropes, Panel and Other
 * wheel. Shown only while the camera is on Helm. Ropes and Panel toggle their look; Other wheel
 * moves to the other wheel and keeps the look.
 */
export function createHelmViews(view: HTMLElement, store: Store): HTMLElement {
  const button = (testId: string, text: string, label: string, pressable: boolean) =>
    el(
      'button',
      {
        type: 'button',
        class: 'view-chip helm-view-button',
        'data-testid': testId,
        'aria-label': label,
        ...(pressable ? { 'aria-pressed': 'false' } : {}),
      },
      [text],
    );
  const ropes = button('helm-look-ropes', t('helmView.ropes'), t('helmView.ropesLabel'), true);
  const panel = button('helm-look-panel', t('helmView.panel'), t('helmView.panelLabel'), true);
  const other = button(
    'helm-other-wheel',
    t('helmView.otherWheel'),
    t('helmView.otherWheelLabel'),
    false,
  );
  const group = el(
    'div',
    {
      class: 'helm-views',
      'data-testid': 'helm-views',
      role: 'group',
      'aria-label': t('helmView.group'),
    },
    [ropes, panel, other],
  );
  view.append(group);

  ropes.addEventListener('click', () => {
    const { look } = store.getState().camera.helm;
    store.dispatch({ type: 'setHelmView', look: look === 'ropes' ? 'ahead' : 'ropes' });
  });
  panel.addEventListener('click', () => {
    const { look } = store.getState().camera.helm;
    store.dispatch({ type: 'setHelmView', look: look === 'panel' ? 'ahead' : 'panel' });
  });
  other.addEventListener('click', () => {
    const { wheel } = store.getState().camera.helm;
    store.dispatch({ type: 'setHelmView', wheel: wheel === 'port' ? 'starboard' : 'port' });
  });
  // The other wheel needs a second helm on the boat.
  other.hidden = boat.cockpitHardware.helms.length < 2;

  const sync = () => {
    const { preset, helm } = store.getState().camera;
    group.hidden = preset !== 'helm';
    ropes.setAttribute('aria-pressed', String(helm.look === 'ropes'));
    panel.setAttribute('aria-pressed', String(helm.look === 'panel'));
  };
  store.subscribe((state, previous) => {
    if (
      state.camera.preset === previous.camera.preset &&
      state.camera.helm === previous.camera.helm
    )
      return;
    sync();
  });
  sync();
  return group;
}
