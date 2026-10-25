import { registerOverlay } from './chipMenu';
import { el } from './dom';
import { t } from './i18n';

/** A card that opens above its chip, over the 3D view (M52, PHASE8_SPEC 10.3). */
export interface ChipCard {
  /** `section.chip-card[role=dialog][aria-modal=false]`. */
  readonly element: HTMLElement;
  open(): void;
  close(returnFocus?: boolean): void;
  isOpen(): boolean;
  /** The card's own empty body (it scrolls); `place()` puts the picker or the settings into it. */
  readonly body: HTMLElement;
}

/**
 * A card that opens above its chip, over the 3D view (appended to `chip.closest('.view')`): a
 * header (title and a × with class `chip-card-close`, test id `<testId>-close`) and `body`. Not
 * modal: the view and the panel stay usable. Escape and × close it and give the focus back to the
 * chip; a tap outside the card and its chip closes it and leaves the focus where the tap put it.
 * Only one card (or chip menu) is open at a time (`registerOverlay`).
 */
export function createChipCard(
  chip: HTMLButtonElement,
  title: string,
  testId: string,
  titleId: string,
): ChipCard {
  const view = chip.closest('.view');
  const closeButton = el(
    'button',
    {
      type: 'button',
      class: 'chip-card-close',
      'data-testid': `${testId}-close`,
      'aria-label': t('settings.close'),
    },
    ['×'],
  );
  const body = el('div', { class: 'chip-card-body' });
  const element = el(
    'section',
    {
      class: 'chip-card',
      id: testId,
      role: 'dialog',
      'aria-modal': 'false',
      'aria-labelledby': titleId,
      'data-testid': testId,
    },
    [
      el('div', { class: 'chip-card-head' }, [el('h2', { id: titleId }, [title]), closeButton]),
      body,
    ],
  );
  element.hidden = true;
  view?.append(element);

  chip.setAttribute('aria-haspopup', 'dialog');
  chip.setAttribute('aria-controls', testId);
  chip.setAttribute('aria-expanded', 'false');

  let isOpen = false;
  let release: (() => void) | undefined;

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close(true);
  };
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null;
    if (target && (element.contains(target) || chip.contains(target))) return;
    close(false);
  };

  function open(): void {
    if (isOpen) return;
    // First closes any chip menu and the card that held the slot, then takes it.
    release = registerOverlay(() => close(false));
    isOpen = true;
    element.hidden = false;
    chip.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    (body.querySelector<HTMLElement>('[aria-checked="true"]') ?? closeButton).focus();
  }

  function close(returnFocus = false): void {
    if (!isOpen) return;
    isOpen = false;
    release?.();
    release = undefined;
    element.hidden = true;
    chip.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    if (returnFocus) chip.focus();
  }

  closeButton.addEventListener('click', () => close(true));
  chip.addEventListener('click', () => (isOpen ? close(true) : open()));

  return { element, open, close, isOpen: () => isOpen, body };
}
