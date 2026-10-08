import type { AppState, Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';
import { windFromText } from './windPanel';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Over the 3D view (PHASE1_SPEC 5.2, 8.1, 8.4): a compact wind indicator (arrow, "from 60° stbd,
 * 12 kn"), the short "GYBE" flash after an accidental gybe (wind from behind), a quieter "Tack"
 * note when the boom crosses with the wind from ahead, and the "by the lee" warning.
 */
export function createWindIndicator(host: HTMLElement, store: Store): void {
  // Arrow on a bow-up compass: it points where the wind blows to (down = from ahead).
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '-12 -12 24 24');
  icon.setAttribute('class', 'wind-chip-arrow');
  icon.setAttribute('aria-hidden', 'true');
  const arrow = document.createElementNS(SVG_NS, 'path');
  arrow.setAttribute('d', 'M0,10 L-6,1 L-2,1 L-2,-10 L2,-10 L2,1 L6,1 Z');
  icon.append(arrow);
  const text = el('span');
  const chip = el('div', { class: 'wind-chip', 'data-testid': 'wind-chip' }, [icon, text]);

  const gybe = el('div', { class: 'rig-alert rig-alert-gybe', 'data-testid': 'gybe-label' }, [
    t('alert.gybe'),
  ]);
  const byTheLee = el('div', { class: 'rig-alert', 'data-testid': 'by-the-lee-label' }, [
    t('alert.byTheLee'),
  ]);
  const tack = el('div', { class: 'rig-alert rig-alert-tack', 'data-testid': 'tack-label' }, [
    t('alert.tack'),
  ]);
  const alerts = el('div', { class: 'rig-alerts', 'aria-live': 'polite' }, [gybe, tack, byTheLee]);
  host.append(chip, alerts);

  const refresh = (state: AppState) => {
    const { ctl_wind_dir: from, ctl_wind_speed: speed } = state.controls;
    const turn = `rotate(${from}deg)`;
    if (icon.style.transform !== turn) icon.style.transform = turn;
    setText(text, t('wind.chip', { from: windFromText(from, true), speed }));
    const flashing = state.rig.gybeLabelS > 0;
    if (gybe.hidden === flashing) gybe.hidden = !flashing;
    const tacking = state.rig.tackLabelS > 0 && !flashing;
    if (tack.hidden === tacking) tack.hidden = !tacking;
    const lee = state.rig.solution.byTheLee && !flashing;
    if (byTheLee.hidden === lee) byTheLee.hidden = !lee;
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
