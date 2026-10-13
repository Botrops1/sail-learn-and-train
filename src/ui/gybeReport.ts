import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import type { GybeReport } from '../model/gybe';
import { el } from './dom';
import { t } from './i18n';

/** Standard gravity, to say the load as tonnes-force ("about 1.3 tonnes"). */
const G = boat.physics.constants.gravityMps2;

/** The report text for one gybe (PHASE2_SPEC 11.3). */
export function gybeReportText(report: GybeReport): string {
  const speed = report.endSpeedMps.toFixed(1);
  const load = (report.peakRopeN / 1000).toFixed(1);
  if (!report.accidental) return t('gybe.controlled', { speed, load });
  return t('gybe.accidental', {
    speed,
    energy: (report.energyJ / 1000).toFixed(1),
    load,
    tonnes: (report.peakRopeN / G / 1000).toFixed(1),
  });
}

/**
 * The gybe report, in the alert stack over the 3D view: for `reportS` seconds after each gybe,
 * how fast the boom end moved, its energy and the peak load on the main sheet.
 */
export function createGybeReport(alerts: HTMLElement, store: Store): void {
  const note = el('div', { class: 'rig-alert rig-alert-report', 'data-testid': 'gybe-report' });
  note.hidden = true;
  alerts.prepend(note);

  let shown: GybeReport | null = null;
  const refresh = (state: AppState) => {
    const last = state.rig.lastGybe;
    const visible = last !== null && state.rig.timeS - last.atS < boat.physics.gybe.reportS;
    if (note.hidden === visible) note.hidden = !visible;
    if (visible && last !== shown) {
      shown = last;
      note.textContent = gybeReportText(last);
      note.classList.toggle('is-accidental', last.accidental);
    }
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
