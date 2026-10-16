import type { Store } from '../app/store';
import { el } from './dom';
import { part, quoted, t } from './i18n';
import type { LayoutShell } from './layout';

export interface InfoCardOptions {
  /**
   * True if the panel already shows this part with its name and explanation (the Ropes section's
   * strip). In the stacked layout the card then stays away, leaving the panel its room.
   */
  shownInPanel?: (partId: string) => boolean;
  /** True while the phone sheet sits at its lowest height: the panel shows nothing then. */
  atPeek?: () => boolean;
  /**
   * True while the phone sheet is at full height: the boat is hidden and there is no room above
   * the sheet for the card (it would cover the instruments), so the card waits until the sheet
   * comes down.
   */
  atFull?: () => boolean;
  /** Opens the entry in the Learn section and Learn mode ("More"), also when it is already open there. */
  showLearn?: (id: string) => void;
}

export interface InfoCard {
  /** Shows or hides the card again (e.g. after a section opened or folded). */
  refresh(): void;
}

/**
 * Tap-to-identify card (PHASE1_SPEC 5.2 and 3, item 9): the part's name, its label as written
 * on the boat (if any) and a one-line explanation from the registry. Closed with × or Escape;
 * tapping the sky closes it too.
 *
 * Both layouts: a small card over the 3D view, side by side from the top, stacked just above the
 * chip row (PHASE5_SPEC 7.5). Stacked, it stays away while the sheet shows the same part in the
 * Ropes section (not at the sheet's lowest height, where the panel shows nothing).
 */
export function createInfoCard(
  layout: LayoutShell,
  store: Store,
  options: InfoCardOptions = {},
): InfoCard {
  const name = el('h2', { class: 'card-name' });
  const label = el('p', { class: 'card-label' });
  const short = el('p', { class: 'card-short' });
  const more = el('button', { type: 'button', class: 'card-more', 'data-testid': 'card-more' }, [
    t('card.more'),
  ]);
  more.addEventListener('click', () => {
    const id = store.getState().selection;
    if (!id) return;
    if (options.showLearn) options.showLearn(id);
    else store.dispatch({ type: 'openLearn', id });
  });
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
    [close, el('div', { class: 'card-head' }, [name, label]), short, more],
  );
  const live = el('div', { class: 'info-area', 'aria-live': 'polite' }, [card]);

  layout.view.append(live);
  const render = () => {
    const id = store.getState().selection;
    const info = id ? part(id) : undefined;
    const inPanel = Boolean(
      info &&
      layout.viewport().mode === 'stacked' &&
      !options.atPeek?.() &&
      options.shownInPanel?.(info.id),
    );
    card.hidden = !info || inPanel || Boolean(options.atFull?.());
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
      labels: info.boatLabels.map(quoted).join(', '),
    });
    short.textContent = info.short;
  };
  layout.onChange(render);
  store.subscribe((state, previous) => {
    if (state.selection !== previous.selection) render();
  });
  render();
  return { refresh: render };
}
