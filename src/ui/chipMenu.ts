import { el } from './dom';

/** One entry of a chip menu. */
export interface ChipMenuItem {
  id: string;
  testId: string;
  content: (string | HTMLElement)[];
}

export interface ChipMenuOptions {
  /** The menu's accessible name. */
  label: string;
  /** A line of explanation under the items. */
  hint?: string;
  /** `data-testid` of the menu itself. */
  testId?: string;
  /** Extra class of the hint paragraph. */
  hintClass?: string;
}

export interface ChipMenu {
  setChecked(id: string): void;
  close(): void;
}

/** The gap between a chip and the menu above it, and the menu's margin to the view's top, px. */
const MENU_GAP_PX = 8;
const MENU_TOP_MARGIN_PX = 16;

/** The one menu that is open now (only one at a time, PHASE5_SPEC 3.2). */
let openMenu: { close(): void } | undefined;

/** Closes whichever chip menu is open (the settings dialog calls it when it opens). */
export function closeOpenMenus(): void {
  openMenu?.close();
}

/**
 * A menu that opens above a chip over the 3D view (PHASE5_SPEC 3.2): radio items, arrow keys,
 * Escape, outside tap. Used by the camera chip (M25) and, from M27, the mode chip.
 */
export function createChipMenu(
  view: HTMLElement,
  chip: HTMLButtonElement,
  items: ChipMenuItem[],
  onChoose: (id: string) => void,
  options: ChipMenuOptions,
): ChipMenu {
  const buttons = items.map((item) => {
    const button = el(
      'button',
      {
        type: 'button',
        role: 'menuitemradio',
        'aria-checked': 'false',
        tabindex: '-1',
        'data-testid': item.testId,
        'data-item': item.id,
      },
      item.content,
    );
    button.addEventListener('click', () => {
      close();
      chip.focus();
      onChoose(item.id);
    });
    return { id: item.id, button };
  });

  const menu = el('div', { class: 'chip-menu', role: 'menu', 'aria-label': options.label }, []);
  menu.hidden = true;
  if (options.testId) menu.setAttribute('data-testid', options.testId);
  menu.append(...buttons.map(({ button }) => button));
  if (options.hint) {
    menu.append(el('p', { class: `hint ${options.hintClass ?? ''}`.trim() }, [options.hint]));
  }
  view.append(menu);

  chip.setAttribute('aria-haspopup', 'menu');
  chip.setAttribute('aria-expanded', 'false');

  const handle = { close };
  let isOpen = false;

  const onDocumentKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
    chip.focus();
  };
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null;
    if (target && (menu.contains(target) || chip.contains(target))) return;
    close();
  };

  menu.addEventListener('keydown', (event) => {
    const index = buttons.findIndex(({ button }) => button === document.activeElement);
    const last = buttons.length - 1;
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = index >= last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index <= 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Tab') {
      event.preventDefault();
      close();
      chip.focus();
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    buttons[next]?.button.focus();
  });

  chip.addEventListener('click', () => (isOpen ? close() : open()));

  function open(): void {
    closeOpenMenus();
    isOpen = true;
    openMenu = handle;
    menu.hidden = false;
    chip.setAttribute('aria-expanded', 'true');
    place();
    document.addEventListener('keydown', onDocumentKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    (
      buttons.find(({ button }) => button.getAttribute('aria-checked') === 'true') ?? buttons[0]
    )?.button.focus();
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    if (openMenu === handle) openMenu = undefined;
    menu.hidden = true;
    chip.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onDocumentKey, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
  }

  /** Left edge at the chip's, bottom MENU_GAP_PX above the chip's top; scrolls inside when low. */
  function place(): void {
    const viewRect = view.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    menu.style.maxHeight = `${Math.max(0, chipRect.top - viewRect.top - MENU_TOP_MARGIN_PX)}px`;
    menu.style.bottom = `${viewRect.bottom - chipRect.top + MENU_GAP_PX}px`;
    menu.style.left = `${chipRect.left - viewRect.left}px`;
    // Keep the menu inside the view's right edge.
    const overflow = menu.getBoundingClientRect().right - (viewRect.right - MENU_GAP_PX);
    if (overflow > 0) {
      menu.style.left = `${Math.max(MENU_GAP_PX, chipRect.left - viewRect.left - overflow)}px`;
    }
  }

  return {
    setChecked: (id) => {
      for (const { id: itemId, button } of buttons) {
        button.setAttribute('aria-checked', String(itemId === id));
      }
    },
    close,
  };
}
