import type { AppState, Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * Over the 3D view (PHASE1_SPEC 8.1, 8.4; the wind chip became the instrument strip in M6): the
 * short "GYBE" flash after an accidental gybe (wind from behind), a quieter "Tack" note when the
 * boom crosses with the wind from ahead, the "by the lee" warning, and the note that the
 * autopilot went to Standby because the wheel was turned.
 */
export function createWindIndicator(host: HTMLElement, store: Store): void {
  const gybe = el('div', { class: 'rig-alert rig-alert-gybe', 'data-testid': 'gybe-label' }, [
    t('alert.gybe'),
  ]);
  const byTheLee = el('div', { class: 'rig-alert', 'data-testid': 'by-the-lee-label' }, [
    t('alert.byTheLee'),
  ]);
  const tack = el('div', { class: 'rig-alert rig-alert-tack', 'data-testid': 'tack-label' }, [
    t('alert.tack'),
  ]);
  const wheel = el('div', { class: 'rig-alert', 'data-testid': 'autopilot-notice' }, [
    t('autopilot.tookWheel'),
  ]);
  const alerts = el('div', { class: 'rig-alerts', 'aria-live': 'polite' }, [
    gybe,
    tack,
    byTheLee,
    wheel,
  ]);
  host.append(alerts);

  const refresh = (state: AppState) => {
    const flashing = state.rig.gybeLabelS > 0;
    if (gybe.hidden === flashing) gybe.hidden = !flashing;
    const tacking = state.rig.tackLabelS > 0 && !flashing;
    if (tack.hidden === tacking) tack.hidden = !tacking;
    const lee = state.rig.solution.byTheLee && !flashing;
    if (byTheLee.hidden === lee) byTheLee.hidden = !lee;
    const tookWheel = state.autopilotNoticeS > 0;
    if (wheel.hidden === tookWheel) wheel.hidden = !tookWheel;
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
