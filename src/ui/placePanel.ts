import type { AppState, Store } from '../app/store';
import { MARINA_LAYOUT_IDS, TRAFFIC_IDS } from '../model/marina';
import { PLACE_IDS } from '../model/places';
import { createDamageList } from './damageReport';
import { el } from './dom';
import { t } from './i18n';

/** A row of buttons, one pressed (the same look as the autopilot's modes). */
function choiceRow<T extends string>(
  testId: string,
  buttonPrefix: string,
  label: string,
  ids: readonly T[],
  text: (id: T) => string,
  onChoose: (id: T) => void,
): { row: HTMLElement; sync(current: T): void } {
  const buttons = ids.map((id) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'segment place-choice',
        'aria-pressed': 'false',
        'data-testid': `${buttonPrefix}-${id}`,
      },
      [text(id)],
    );
    button.addEventListener('click', () => onChoose(id));
    return { id, button };
  });
  const row = el('div', { class: 'field place-field', 'data-testid': testId }, [
    el('span', { class: 'place-label' }, [label]),
    el(
      'div',
      { class: 'segments', role: 'group', 'aria-label': label },
      buttons.map((entry) => entry.button),
    ),
  ]);
  return {
    row,
    sync(current) {
      for (const { id, button } of buttons)
        button.setAttribute('aria-pressed', String(id === current));
    },
  };
}

/**
 * The Place section (M42, PHASE7_SPEC 8.6): Open water or Marina, and in the marina its layout
 * how many other yachts lie there, and the arrow over our berth. Choosing a place puts the boat there ready for harbour
 * work (also choosing the one she is in: back to the start). M43 adds the damage report here.
 */
export function createPlacePanel(store: Store): HTMLElement[] {
  const places = choiceRow(
    'place-choice',
    'place',
    t('place.label'),
    PLACE_IDS,
    (id) => t(`place.${id}`),
    (place) => store.dispatch({ type: 'goToPlace', place }),
  );
  const layouts = choiceRow(
    'marina-layout',
    'marina-layout',
    t('place.layout'),
    MARINA_LAYOUT_IDS,
    (id) => t(`place.layout.${id}`),
    (layout) => store.dispatch({ type: 'setMarinaLayout', layout }),
  );
  const traffic = choiceRow(
    'marina-traffic',
    'marina-traffic',
    t('place.traffic'),
    TRAFFIC_IDS,
    (id) => t(`place.traffic.${id}`),
    (value) => store.dispatch({ type: 'setTraffic', traffic: value }),
  );
  const arrowBox = el('input', { type: 'checkbox', 'data-testid': 'berth-arrow' });
  arrowBox.addEventListener('change', () =>
    store.dispatch({ type: 'setBerthArrow', on: arrowBox.checked }),
  );
  const arrow = el('label', { class: 'toggle', 'data-testid': 'berth-arrow-row' }, [
    arrowBox,
    el('span', {}, [t('place.berthArrow')]),
  ]);
  const status = el('p', { class: 'hint', 'data-testid': 'place-status', 'aria-live': 'polite' });
  const hint = el('p', { class: 'hint explain' }, [t('place.hint')]);

  const sync = (state: AppState, previous?: AppState) => {
    if (previous && state.harbour === previous.harbour) return;
    const { place, layout, traffic: level } = state.harbour;
    places.sync(place);
    layouts.sync(layout);
    traffic.sync(level);
    layouts.row.hidden = place !== 'marina';
    traffic.row.hidden = place !== 'marina';
    arrow.hidden = place !== 'marina';
    arrowBox.checked = state.harbour.berthArrow;
    status.textContent = t(`place.status.${place}`);
  };
  store.subscribe(sync);
  sync(store.getState());
  return [places.row, layouts.row, traffic.row, arrow, status, createDamageList(store), hint];
}
