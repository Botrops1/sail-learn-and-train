import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * M109 (PHASE_RIGGING_SPEC 11.5): the card over the 3D view that says what the picture on the boat
 * is ("a symmetric spinnaker, not on this boat") and closes it. It takes the part card's place on
 * each layout and looks like it; hidden when no picture shows.
 */
export function createPictureBanner(store: Store): HTMLElement {
  const text = el('p', { class: 'card-short picture-banner-text' });
  const close = el(
    'button',
    { type: 'button', class: 'card-more picture-close', 'data-testid': 'picture-close' },
    [t('picture.close')],
  );
  close.addEventListener('click', () => store.dispatch({ type: 'setPicture', picture: null }));
  const card = el(
    'section',
    { class: 'info-card picture-banner', 'data-testid': 'picture-banner', role: 'status' },
    [text, close],
  );
  const area = el('div', { class: 'info-area picture-area' }, [card]);
  const render = () => {
    const { picture, selection } = store.getState();
    // A tapped part of the picture opens the part card in the same place: the banner steps aside.
    card.hidden = picture === null || selection !== null;
    if (picture !== null) {
      text.textContent = t(`picture.${picture}`);
      card.setAttribute('data-picture', picture);
    } else card.removeAttribute('data-picture');
  };
  store.subscribe((state, previous) => {
    if (state.picture !== previous.picture || state.selection !== previous.selection) render();
  });
  render();
  return area;
}
