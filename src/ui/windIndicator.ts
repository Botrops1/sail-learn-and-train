import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { el } from './dom';
import { createAnchorAlarmAlert, createDamageAlert } from './damageReport';
import { createGybeReport } from './gybeReport';
import { t } from './i18n';

/** The heel alert shows after she has been over the limit this long, seconds (also when it is written to the alert history). */
const OVERPOWERED_AFTER_S = boat.physics.alerts.overpoweredAfterS;
/** The by-the-lee warning gets stronger after this long, seconds (PHASE2_SPEC 11.3). */
const BY_THE_LEE_STRONG_AFTER_S = 3;

/**
 * Over the 3D view (PHASE1_SPEC 8.1, 8.4; the wind chip became the instrument strip in M6): the
 * short "GYBE" flash after an accidental gybe (wind from behind), a quieter "Tack" note when the
 * boom crosses with the wind from ahead, the "by the lee" warning, the heel and round-up warnings (M8), and the note that the
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
  const roundUp = el(
    'div',
    { class: 'rig-alert rig-alert-gybe', 'data-testid': 'round-up-label' },
    [t('alert.roundUp')],
  );
  const overpowered = el('div', { class: 'rig-alert', 'data-testid': 'overpowered-label' }, [
    t('alert.overpowered'),
  ]);
  const alerts = el('div', { class: 'rig-alerts', 'aria-live': 'polite' }, [
    gybe,
    roundUp,
    tack,
    byTheLee,
    overpowered,
    wheel,
  ]);
  host.append(alerts);
  createGybeReport(alerts, store);
  createDamageAlert(alerts, store);
  createAnchorAlarmAlert(alerts, store);

  const refresh = (state: AppState) => {
    const flashing = state.rig.gybeLabelS > 0;
    if (gybe.hidden === flashing) gybe.hidden = !flashing;
    const tacking = state.rig.tackLabelS > 0 && !flashing;
    if (tack.hidden === tacking) tack.hidden = !tacking;
    const lee = state.rig.solution.byTheLee && !flashing;
    if (byTheLee.hidden === lee) byTheLee.hidden = !lee;
    const strong = state.rig.byTheLeeS > BY_THE_LEE_STRONG_AFTER_S;
    const leeText = t(strong ? 'alert.byTheLeeStrong' : 'alert.byTheLee');
    if (byTheLee.textContent !== leeText) byTheLee.textContent = leeText;
    byTheLee.classList.toggle('rig-alert-gybe', strong);
    // Heeled over for more than 2 s, and the round-up (M8, PHASE2_SPEC 8.4).
    const heavy = state.boat.overpoweredS > OVERPOWERED_AFTER_S;
    if (overpowered.hidden === heavy) overpowered.hidden = !heavy;
    const turning = state.boat.roundUpS > 0;
    if (roundUp.hidden === turning) roundUp.hidden = !turning;
    const tookWheel = state.autopilotNoticeS > 0;
    if (wheel.hidden === tookWheel) wheel.hidden = !tookWheel;
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
