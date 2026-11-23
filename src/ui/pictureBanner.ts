import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * M109 (PHASE_RIGGING_SPEC 11.5): the card over the 3D view that says what the picture on the boat
 * is ("a symmetric spinnaker, not on this boat") and closes it. It takes the part card's place on
 * each layout and looks like it; hidden when no picture shows. M110 (12.3): the traveller picture
 * adds a slider that moves the car.
 */
export function createPictureBanner(store: Store): HTMLElement {
  const text = el('p', { class: 'card-short picture-banner-text' });
  const close = el(
    'button',
    { type: 'button', class: 'card-more picture-close', 'data-testid': 'picture-close' },
    [t('picture.close')],
  );
  close.addEventListener('click', () => store.dispatch({ type: 'setPicture', picture: null }));
  const slider = el('input', {
    type: 'range',
    id: 'traveller-car',
    min: '-100',
    max: '100',
    step: '5',
    'data-testid': 'traveller-car',
  });
  slider.addEventListener('input', () =>
    store.dispatch({ type: 'setTravellerCar', pct: Number(slider.value) }),
  );
  const sliderLabel = el('label', { class: 'picture-traveller-label', for: 'traveller-car' }, [
    t('picture.travellerCar'),
  ]);
  const sliderRow = el('div', { class: 'picture-traveller' }, [sliderLabel, slider]);
  const card = el(
    'section',
    { class: 'info-card picture-banner', 'data-testid': 'picture-banner', role: 'status' },
    [text, sliderRow, close],
  );
  const area = el('div', { class: 'info-area picture-area' }, [card]);
  const render = () => {
    const { picture, selection } = store.getState();
    // A tapped part of the picture opens the part card in the same place: the banner steps aside.
    card.hidden = picture === null || selection !== null;
    sliderRow.hidden = picture !== 'traveller';
    slider.value = String(store.getState().travellerCarPct);
    if (picture !== null) {
      text.textContent = t(`picture.${picture}`);
      card.setAttribute('data-picture', picture);
      area.setAttribute('data-picture', picture);
    } else {
      card.removeAttribute('data-picture');
      area.removeAttribute('data-picture');
    }
  };
  store.subscribe((state, previous) => {
    if (
      state.picture !== previous.picture ||
      state.selection !== previous.selection ||
      state.travellerCarPct !== previous.travellerCarPct
    )
      render();
  });
  render();
  return area;
}
