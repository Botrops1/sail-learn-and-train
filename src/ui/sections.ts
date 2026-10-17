import { el } from './dom';
import { t } from './i18n';
import type { SectionId } from './modes';

export interface SectionView {
  id: SectionId;
  element: HTMLElement;
  /** Opens or folds the section. */
  setOpen(open: boolean): void;
  isOpen(): boolean;
  /** Closes the "?" explanations again. */
  resetExplain(): void;
  /** Changes the title in the fold header (M38: "Mode: Easy"). */
  setTitle(title: string): void;
}

/**
 * A block of the panel with a fold header and, if it has explanations (`.explain` elements), a
 * "?" button that shows them (PHASE5_SPEC 8.4). A folded section's body is `hidden`, so tabbing,
 * the accessibility audit and the browser checks skip it.
 */
export function createSection(
  id: SectionId,
  title: string,
  body: HTMLElement[],
  hasExplain: boolean,
): SectionView {
  const bodyId = `section-body-${id}`;
  const toggle = el(
    'button',
    {
      type: 'button',
      class: 'section-toggle',
      'data-testid': `section-toggle-${id}`,
      'aria-expanded': 'true',
      'aria-controls': bodyId,
    },
    [
      el('span', { class: 'section-head-title' }, [title]),
      el('span', { class: 'section-chevron', 'aria-hidden': 'true' }, ['▾']),
    ],
  );
  const titleText = toggle.querySelector('.section-head-title') as HTMLElement;
  const head = el('div', { class: 'section-head' }, [toggle]);
  const content = el('div', { class: 'section-body', id: bodyId }, body);
  const element = el(
    'section',
    {
      class: 'panel-section',
      'data-section': id,
      'data-testid': `section-${id}`,
      'data-open': 'true',
      'data-explain': 'closed',
    },
    [head, content],
  );

  let open = true;
  const setOpen = (next: boolean) => {
    open = next;
    element.dataset.open = String(next);
    toggle.setAttribute('aria-expanded', String(next));
    content.hidden = !next;
  };
  toggle.addEventListener('click', () => setOpen(!open));

  const explain = el(
    'button',
    {
      type: 'button',
      class: 'section-explain',
      'data-testid': `section-explain-${id}`,
      'aria-pressed': 'false',
      'aria-label': t('section.explain', { name: title }),
    },
    ['?'],
  );
  const setExplain = (shown: boolean) => {
    element.dataset.explain = shown ? 'open' : 'closed';
    explain.setAttribute('aria-pressed', String(shown));
  };
  explain.addEventListener('click', () => setExplain(element.dataset.explain !== 'open'));
  if (hasExplain) head.append(explain);

  return {
    id,
    element,
    setOpen,
    isOpen: () => open,
    resetExplain: () => setExplain(false),
    setTitle: (next) => {
      titleText.textContent = next;
      explain.setAttribute('aria-label', t('section.explain', { name: next }));
    },
  };
}
