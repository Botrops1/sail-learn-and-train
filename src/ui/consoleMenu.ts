import type { Store } from '../app/store';
import { closeChipOverlays, registerDrawer } from './chipMenu';
import { el, isTypingTarget } from './dom';
import { t } from './i18n';
import type { DrawerId, SectionId } from './modes';

export interface MenuItem {
  id: DrawerId;
  label: string;
  sections: SectionId[];
  shown: () => boolean;
}

export interface ConsoleMenu {
  open(id: DrawerId): void;
  close(): void;
  openId(): DrawerId | null;
  /** Shows or hides the items by `MenuItem.shown()`; a drawer whose item is hidden closes. */
  update(): void;
  onChange(fn: (id: DrawerId | null) => void): void;
  /** The phone layout has no menu: false hides the menu and closes the drawer. */
  setActive(active: boolean): void;
  /** The pane of a drawer inside the drawer body: `panel.ts` puts the drawer's sections there. */
  pane(id: DrawerId): HTMLElement;
}

/**
 * The menu at the top right and its one drawer (PHASE_CONSOLE_SPEC 7.6). The drawer keeps the
 * light look and is not modal; opening it closes an open chip menu or card, and opening a chip
 * menu or card closes it.
 */
export function createMenu(view: HTMLElement, _store: Store, items: MenuItem[]): ConsoleMenu {
  const buttons = new Map<DrawerId, HTMLButtonElement>();
  for (const item of items) {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'console-menu-item',
        'data-testid': `menu-${item.id}`,
        'aria-pressed': 'false',
        'aria-controls': 'console-drawer',
      },
      [item.label],
    );
    button.addEventListener('click', () => (current === item.id ? close(true) : open(item.id)));
    buttons.set(item.id, button);
  }
  const nav = el(
    'nav',
    { class: 'console-menu', 'data-testid': 'console-menu', 'aria-label': t('menu.label') },
    items.map((item) => buttons.get(item.id) as HTMLButtonElement),
  );
  nav.hidden = true;

  const title = el('h2', { id: 'drawer-title', 'data-testid': 'drawer-title', tabindex: '-1' });
  const closeButton = el(
    'button',
    {
      type: 'button',
      class: 'drawer-close',
      'data-testid': 'drawer-close',
      'aria-label': t('drawer.close'),
    },
    ['×'],
  );
  const panes = new Map<DrawerId, HTMLElement>();
  for (const item of items) {
    const pane = el('div', { class: 'drawer-pane', 'data-pane': item.id });
    pane.hidden = true;
    panes.set(item.id, pane);
  }
  const body = el(
    'div',
    { class: 'drawer-body', 'data-testid': 'drawer-body' },
    items.map((item) => panes.get(item.id) as HTMLElement),
  );
  const drawer = el(
    'aside',
    {
      class: 'console-drawer',
      id: 'console-drawer',
      'data-testid': 'drawer',
      role: 'dialog',
      'aria-modal': 'false',
      'aria-labelledby': 'drawer-title',
    },
    [el('div', { class: 'drawer-head' }, [title, closeButton]), body],
  );
  drawer.hidden = true;
  view.append(nav, drawer);

  let current: DrawerId | null = null;
  let active = false;
  const listeners: ((id: DrawerId | null) => void)[] = [];
  const told = () => listeners.forEach((fn) => fn(current));

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || isTypingTarget(event.target)) return;
    close(true);
  };

  function open(id: DrawerId): void {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    if (current === id) return;
    // One overlay at a time: an open chip menu or card closes first.
    closeChipOverlays();
    const wasOpen = current !== null;
    current = id;
    drawer.dataset.drawer = id;
    drawer.hidden = false;
    title.textContent = item.label;
    for (const [paneId, pane] of panes) pane.hidden = paneId !== id;
    for (const [buttonId, button] of buttons) {
      button.setAttribute('aria-pressed', String(buttonId === id));
    }
    if (!wasOpen) document.addEventListener('keydown', onKey);
    title.focus({ preventScroll: true });
    told();
  }

  function close(returnFocus = false): void {
    if (current === null) return;
    const was = current;
    current = null;
    delete drawer.dataset.drawer;
    drawer.hidden = true;
    for (const button of buttons.values()) button.setAttribute('aria-pressed', 'false');
    document.removeEventListener('keydown', onKey);
    if (returnFocus) buttons.get(was)?.focus();
    told();
  }

  closeButton.addEventListener('click', () => close(true));
  registerDrawer(() => close(false));

  function update(): void {
    let any = false;
    for (const item of items) {
      const button = buttons.get(item.id) as HTMLButtonElement;
      const shown = item.shown();
      button.hidden = !shown;
      any = any || shown;
      if (!shown && current === item.id) close(false);
    }
    nav.hidden = !active || !any;
  }

  function setActive(next: boolean): void {
    active = next;
    if (!active) close(false);
    update();
  }

  return {
    open,
    close: () => close(false),
    openId: () => current,
    update,
    setActive,
    onChange: (fn) => listeners.push(fn),
    pane: (id) => panes.get(id) as HTMLElement,
  };
}
