import type { AppState, Store } from '../app/store';
import { anchorStatusText } from './anchorPanel';
import { createAlertList } from './alertCentre';
import { createDamageList } from './damageReport';
import { el } from './dom';
import { fenderStatusText } from './harbourPanel';
import { t } from './i18n';
import { createSailWear } from './sailsPanel';
import { setText } from './stepper';

/**
 * The Status section (M55, issue #109): the boat's condition in one place, in four blocks. Sails
 * (the wear bars and Repair), Gear (fenders, anchor, propeller), Damage (the report of what was
 * hit) and What happened (the alert history with its tag filter). `showLearn` opens a history
 * entry's Learn entry, as the Attention card's "?" does.
 */
export function createStatusPanel(store: Store, showLearn: (id: string) => void): HTMLElement[] {
  const heading = (key: 'status.sails' | 'status.gear' | 'status.damage' | 'status.history') =>
    el('h3', { class: 'section-title' }, [t(key)]);

  const sailsGood = el('p', { class: 'hint', 'data-testid': 'status-sails-good' }, [
    t('status.sailsGood'),
  ]);
  const fenders = el('p', { class: 'status-line', 'data-testid': 'status-fenders' });
  const anchor = el('p', { class: 'status-line', 'data-testid': 'status-anchor' });
  const propeller = el('p', { class: 'status-line', 'data-testid': 'status-propeller' });

  const refresh = (state: AppState) => {
    const unworn = state.sailDamage.main === 0 && state.sailDamage.jib === 0;
    if (sailsGood.hidden === unworn) sailsGood.hidden = !unworn;
    setText(fenders, fenderStatusText(state.harbour));
    setText(
      anchor,
      state.anchor.phase === 'stowed' ? t('status.anchor.stowed') : anchorStatusText(state),
    );
    setText(propeller, state.lines.fouled ? t('lines.fouled') : t('status.propeller.clear'));
  };
  store.subscribe(refresh);
  refresh(store.getState());

  return [
    el('p', { class: 'hint explain' }, [t('status.hint')]),
    heading('status.sails'),
    createSailWear(store),
    sailsGood,
    heading('status.gear'),
    fenders,
    anchor,
    propeller,
    heading('status.damage'),
    createDamageList(store),
    heading('status.history'),
    createAlertList(store, showLearn, { filter: true, idPrefix: 'status-alert' }),
  ];
}
