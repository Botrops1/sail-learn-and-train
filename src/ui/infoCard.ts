import type { Store } from '../app/store';
import { partInfo } from '../model/registry';
import { el } from './dom';
import { t } from './i18n';

/**
 * Tap-to-identify card over the 3D view (PHASE1_SPEC 5.2 and 3, item 9): the part's name,
 * its label as written on the boat (if any) and a one-line explanation from the registry.
 * Closed with × or Escape; tapping the sky closes it too.
 */
export function createInfoCard(host: HTMLElement, store: Store): void {
  const name = el('h2', { class: 'card-name' });
  const label = el('p', { class: 'card-label' });
  const short = el('p', { class: 'card-short' });
  const close = el(
    'button',
    { type: 'button', class: 'card-close', 'aria-label': t('card.close') },
    ['×'],
  );
  const dismiss = () => store.dispatch({ type: 'select', partId: null });
  close.addEventListener('click', dismiss);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && store.getState().selection) dismiss();
  });
  const card = el(
    'section',
    { class: 'info-card', 'data-testid': 'info-card', 'aria-label': t('card.label') },
    [close, name, label, short],
  );
  const live = el('div', { class: 'info-area', 'aria-live': 'polite' }, [card]);
  host.append(live);

  const render = () => {
    const id = store.getState().selection;
    const info = id ? partInfo(id) : undefined;
    card.hidden = !info;
    if (!info) {
      card.removeAttribute('data-part-id');
      return;
    }
    card.setAttribute('data-part-id', info.id);
    name.textContent = info.name;
    label.hidden = info.boatLabels.length === 0;
    label.textContent = t('card.boatLabel', {
      labels: info.boatLabels.map((text) => `“${text}”`).join(', '),
    });
    short.textContent = info.short;
  };
  store.subscribe((state, previous) => {
    if (state.selection !== previous.selection) render();
  });
  render();
}
