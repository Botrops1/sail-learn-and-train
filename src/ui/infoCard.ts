import type { Store } from '../app/store';
import { partInfo } from '../model/registry';
import { el } from './dom';
import { t } from './i18n';
import type { LayoutShell } from './layout';

export interface InfoCardOptions {
  /**
   * True if the panel already shows this part with its name and explanation (the Ropes tab's
   * strip). In the stacked layout the card then stays away, leaving the panel its room.
   */
  shownInPanel?: (partId: string) => boolean;
}

export interface InfoCard {
  /** Shows or hides the card again (e.g. after the panel switched tabs). */
  refresh(): void;
}

/**
 * Tap-to-identify card (PHASE1_SPEC 5.2 and 3, item 9): the part's name, its label as written
 * on the boat (if any) and a one-line explanation from the registry. Closed with × or Escape;
 * tapping the sky closes it too.
 *
 * Side-by-side layout: a small card over the top of the 3D view. Stacked (portrait) layout: a
 * compact strip at the top of the panel, so it never covers the boat; not shown while the
 * Ropes tab shows the same rope. It moves when the layout switches.
 */
export function createInfoCard(
  layout: LayoutShell,
  store: Store,
  options: InfoCardOptions = {},
): InfoCard {
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
    [close, el('div', { class: 'card-head' }, [name, label]), short],
  );
  const live = el('div', { class: 'info-area', 'aria-live': 'polite' }, [card]);

  const place = (mode: 'stacked' | 'side') => {
    if (mode === 'stacked' && live.parentElement !== layout.panel) layout.panel.prepend(live);
    if (mode === 'side' && live.parentElement !== layout.view) layout.view.append(live);
  };
  const render = () => {
    const id = store.getState().selection;
    const info = id ? partInfo(id) : undefined;
    const inPanel = Boolean(
      info && layout.viewport().mode === 'stacked' && options.shownInPanel?.(info.id),
    );
    card.hidden = !info || inPanel;
    // The selection is still the card's (a tap found it); the panel shows it instead.
    card.toggleAttribute('data-in-panel', inPanel);
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
  place(layout.viewport().mode);
  layout.onChange((viewport) => {
    place(viewport.mode);
    render();
  });
  store.subscribe((state, previous) => {
    if (state.selection !== previous.selection) render();
  });
  render();
  return { refresh: render };
}
