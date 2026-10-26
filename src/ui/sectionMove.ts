import { registerOverlay } from './chipMenu';
import { el } from './dom';
import { t } from './i18n';
import type { SectionId } from './modes';
import type { SectionView } from './sections';
import { layoutIndex, moveSection, type SectionLayout, type WideSectionId } from './sectionLayout';

/** A pointer must travel this far from the grip before a press becomes a drag, px. */
const DRAG_START_PX = 8;
/** The drop marker's thickness, px. */
const MARKER_PX = 3;
/** Gap between the grip and the menu when the menu opens above it, px. */
const MENU_GAP_PX = 4;

type Column = 0 | 1;
type How = 'up' | 'down' | 'other';

export interface SectionMoveOptions {
  sections: Map<SectionId, SectionView>;
  /** `.panel-body`, `.panel-second`. */
  columns: [HTMLElement, HTMLElement];
  /** panel.ts's current layout. */
  layout(): SectionLayout;
  /** panel.ts: keep, save, place(), reveal, open rules, changed(). */
  apply(next: SectionLayout, moved: WideSectionId): void;
  /** ColumnHandles.isCollapsed. */
  isCollapsed(element: HTMLElement): boolean;
}

/**
 * M54 (issue #110, PHASE8_SPEC 12.2): every section header of the wide layout gets a grip. Drag it
 * (mouse, pen, touch) to another place, tap it for a menu (Move up, Move down, Move to the other
 * column), or use the arrow keys when it has the focus. Moves go through `apply`, which keeps and
 * saves the layout and places the sections; nothing here rebuilds a section. The grips are in the
 * DOM on every layout and hidden by CSS below the wide one.
 */
export function createSectionMove(options: SectionMoveOptions): void {
  const { sections, columns, layout, apply, isCollapsed } = options;
  const host = columns[0].parentElement ?? document.body;

  host.append(
    el('p', { id: 'layout-grip-hint', class: 'visually-hidden' }, [t('layout.gripHint')]),
  );
  const live = el('div', {
    class: 'layout-live visually-hidden',
    'aria-live': 'polite',
    'data-testid': 'layout-live',
  });
  host.append(live);

  const visibleIn = (column: Column, current: SectionLayout = layout()): WideSectionId[] =>
    current.columns[column].filter((id) => {
      const view = sections.get(id);
      return Boolean(view) && !view?.element.hidden;
    });
  const columnOf = (id: WideSectionId): Column => (layout().columns[0].includes(id) ? 0 : 1);
  const withoutId = (list: readonly WideSectionId[], id: WideSectionId) =>
    list.filter((other) => other !== id);

  /** The layout after moving `id` to visible place `visiblePos` of `column`, or null if nothing changes. */
  function movedTo(id: WideSectionId, column: Column, visiblePos: number): SectionLayout {
    const current = layout();
    const rest = withoutId(current.columns[column], id);
    const index = layoutIndex(rest, withoutId(visibleIn(column), id), visiblePos);
    return moveSection(current, id, column, index);
  }

  /** What `how` does to `id` as a layout, or null when it cannot apply. */
  function plan(id: WideSectionId, how: How): SectionLayout | null {
    const column = columnOf(id);
    const visible = visibleIn(column);
    const pos = visible.indexOf(id);
    if (how === 'up') return pos > 0 ? movedTo(id, column, pos - 1) : null;
    if (how === 'down')
      return pos >= 0 && pos < visible.length - 1 ? movedTo(id, column, pos + 1) : null;
    const target = (1 - column) as Column;
    return moveSection(layout(), id, target, layout().columns[target].length);
  }

  /** Arrow left / right: the other column at the same visible place, clamped to its end. */
  function planSideways(id: WideSectionId, to: Column): SectionLayout | null {
    const column = columnOf(id);
    if (column === to) return null;
    const pos = visibleIn(column).indexOf(id);
    return movedTo(id, to, Math.min(Math.max(pos, 0), visibleIn(to).length));
  }

  const grips = new Map<WideSectionId, HTMLButtonElement>();

  function commit(id: WideSectionId, next: SectionLayout, announce: boolean): void {
    apply(next, id);
    grips.get(id)?.focus({ preventScroll: true });
    if (!announce) return;
    const column = columnOf(id);
    const position = visibleIn(column).indexOf(id) + 1;
    live.textContent = t('layout.moved', {
      name: sections.get(id)?.title() ?? id,
      column: column + 1,
      position,
    });
  }

  // ---- The menu -----------------------------------------------------------------------------
  const menu = el('div', {
    class: 'layout-menu',
    role: 'menu',
    'aria-label': t('layout.label'),
    'data-testid': 'layout-menu',
  });
  menu.hidden = true;
  const items: { how: How; button: HTMLButtonElement }[] = (
    [
      ['up', 'layout.up', 'layout-up'],
      ['down', 'layout.down', 'layout-down'],
      ['other', 'layout.other', 'layout-other'],
    ] as const
  ).map(([how, key, testId]) => ({
    how,
    button: el(
      'button',
      { type: 'button', role: 'menuitem', tabindex: '-1', 'data-testid': testId },
      [t(key)],
    ),
  }));
  menu.append(...items.map(({ button }) => button));
  host.append(menu);

  let menuFor: WideSectionId | null = null;
  let release: (() => void) | undefined;

  const onMenuKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    const id = menuFor;
    closeMenu();
    if (id) grips.get(id)?.focus();
  };
  const onMenuPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null;
    if (target && (menu.contains(target) || (menuFor && grips.get(menuFor)?.contains(target)))) {
      return;
    }
    closeMenu();
  };

  function closeMenu(): void {
    if (menuFor === null) return;
    const grip = grips.get(menuFor);
    menuFor = null;
    menu.hidden = true;
    grip?.setAttribute('aria-expanded', 'false');
    release?.();
    release = undefined;
    document.removeEventListener('keydown', onMenuKey, true);
    document.removeEventListener('pointerdown', onMenuPointerDown, true);
  }

  function openMenu(id: WideSectionId): void {
    const grip = grips.get(id);
    if (!grip) return;
    // First closes any chip menu and card that held the overlay slot, then takes it.
    release = registerOverlay(closeMenu);
    menuFor = id;
    for (const { how, button } of items) {
      button.setAttribute('aria-disabled', String(plan(id, how) === null));
    }
    menu.hidden = false;
    grip.setAttribute('aria-expanded', 'true');
    const gripRect = grip.getBoundingClientRect();
    const height = menu.offsetHeight;
    const below = gripRect.bottom;
    // Fixed: opens below the grip, or above it when there is no room.
    const top =
      below + height <= window.innerHeight
        ? below
        : Math.max(0, gripRect.top - height - MENU_GAP_PX);
    menu.style.top = `${top}px`;
    menu.style.left = `${gripRect.left}px`;
    document.addEventListener('keydown', onMenuKey, true);
    document.addEventListener('pointerdown', onMenuPointerDown, true);
    items[0]?.button.focus();
  }

  menu.addEventListener('keydown', (event) => {
    const index = items.findIndex(({ button }) => button === document.activeElement);
    const last = items.length - 1;
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = index >= last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index <= 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Tab') {
      event.preventDefault();
      const id = menuFor;
      closeMenu();
      if (id) grips.get(id)?.focus();
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    items[next]?.button.focus();
  });
  for (const { how, button } of items) {
    button.addEventListener('click', () => {
      const id = menuFor;
      if (id === null) return;
      const next = plan(id, how);
      // A choice that cannot apply does nothing and leaves the menu open.
      if (next === null) return;
      closeMenu();
      commit(id, next, true);
    });
  }
  // A scroll of a column moves the grip away from the menu.
  for (const column of columns) column.addEventListener('scroll', closeMenu, { passive: true });

  // ---- The drop marker and the drag ---------------------------------------------------------
  const marker = el('div', { class: 'drop-marker', 'aria-hidden': 'true' });
  marker.hidden = true;
  host.append(marker);

  interface Drop {
    column: Column;
    /** Visible place in the column (the dragged section left out). */
    visiblePos: number;
    top: number;
    left: number;
    width: number;
  }

  /** Where a drop at (x, y) would land, or null when no column can take it. */
  function dropAt(id: WideSectionId, x: number, y: number): Drop | null {
    const rectOf = (column: Column) => columns[column].getBoundingClientRect();
    const open = ([0, 1] as const).filter((column) => !isCollapsed(columns[column]));
    if (open.length === 0) return null;
    const under = open.find((column) => x >= rectOf(column).left && x < rectOf(column).right);
    const nearest = open.reduce((best, column) =>
      dist(x, rectOf(column)) < dist(x, rectOf(best)) ? column : best,
    );
    const column: Column = under ?? nearest;
    const rect = rectOf(column);
    const others = withoutId(visibleIn(column), id);
    let visiblePos = others.length;
    let top = rect.top;
    for (const [i, other] of others.entries()) {
      const head = sections.get(other)?.element.querySelector<HTMLElement>('.section-head');
      const box = head?.getBoundingClientRect();
      if (box && box.top + box.height / 2 > y) {
        visiblePos = i;
        top = box.top;
        break;
      }
    }
    const lastId = others[others.length - 1];
    if (visiblePos === others.length && lastId !== undefined) {
      const last = sections.get(lastId)?.element.getBoundingClientRect();
      if (last) top = last.bottom;
    }
    return { column, visiblePos, top, left: rect.left, width: rect.width };
  }

  function dist(x: number, rect: DOMRect): number {
    if (x < rect.left) return rect.left - x;
    return x > rect.right ? x - rect.right : 0;
  }

  let swallowClick = false;

  function attachDrag(id: WideSectionId, grip: HTMLButtonElement): void {
    const section = sections.get(id);
    let startX = 0;
    let startY = 0;
    let pointerId: number | null = null;
    let dragging = false;
    let drop: Drop | null = null;

    const showMarker = () => {
      if (!drop) {
        marker.hidden = true;
        return;
      }
      marker.hidden = false;
      marker.style.top = `${drop.top - MARKER_PX / 2}px`;
      marker.style.left = `${drop.left}px`;
      marker.style.width = `${drop.width}px`;
    };

    const finish = (apply: boolean) => {
      document.removeEventListener('keydown', onKey, true);
      if (pointerId !== null && grip.hasPointerCapture(pointerId)) {
        grip.releasePointerCapture(pointerId);
      }
      pointerId = null;
      const target = drop;
      const wasDragging = dragging;
      dragging = false;
      drop = null;
      marker.hidden = true;
      section?.element.classList.remove('is-dragging');
      if (!wasDragging) return;
      // The click that follows a drag must not open the menu.
      swallowClick = true;
      window.setTimeout(() => (swallowClick = false), 0);
      if (apply && target) commit(id, movedTo(id, target.column, target.visiblePos), true);
    };

    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      finish(false);
    }

    grip.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || pointerId !== null) return;
      pointerId = event.pointerId;
      // Captured from the press, so a fast move that leaves the grip still reaches it.
      grip.setPointerCapture(event.pointerId);
      startX = event.clientX;
      startY = event.clientY;
      dragging = false;
    });
    grip.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(event.clientX - startX, event.clientY - startY) <= DRAG_START_PX) return;
        dragging = true;
        closeMenu();
        section?.element.classList.add('is-dragging');
        document.addEventListener('keydown', onKey, true);
      }
      drop = dropAt(id, event.clientX, event.clientY);
      showMarker();
    });
    grip.addEventListener('pointerup', (event) => {
      if (event.pointerId === pointerId) finish(true);
    });
    grip.addEventListener('pointercancel', (event) => {
      if (event.pointerId === pointerId) finish(false);
    });
    grip.addEventListener('lostpointercapture', () => {
      if (dragging) finish(false);
    });
  }

  // ---- The grips ----------------------------------------------------------------------------
  for (const [id, view] of sections) {
    if (id === 'mode' || id === 'settings') continue;
    const wideId = id as WideSectionId;
    const head = view.element.querySelector<HTMLElement>('.section-head');
    if (!head) continue;
    const grip = el(
      'button',
      {
        type: 'button',
        class: 'section-grip',
        'data-testid': `section-grip-${id}`,
        'aria-label': t('layout.grip', { name: view.title() }),
        'aria-describedby': 'layout-grip-hint',
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
      },
      [el('span', { 'aria-hidden': 'true' }, ['⠿'])],
    );
    grips.set(wideId, grip);
    head.prepend(grip);
    attachDrag(wideId, grip);

    grip.addEventListener(
      'click',
      (event) => {
        if (swallowClick) {
          event.stopImmediatePropagation();
          swallowClick = false;
          return;
        }
        if (menuFor === wideId) closeMenu();
        else openMenu(wideId);
      },
      true,
    );
    grip.addEventListener('keydown', (event) => {
      const next =
        event.key === 'ArrowUp'
          ? plan(wideId, 'up')
          : event.key === 'ArrowDown'
            ? plan(wideId, 'down')
            : event.key === 'ArrowLeft'
              ? planSideways(wideId, 0)
              : event.key === 'ArrowRight'
                ? planSideways(wideId, 1)
                : undefined;
      if (next === undefined) return;
      // The arrow keys never scroll the column; a move that cannot happen says nothing.
      event.preventDefault();
      if (next !== null) commit(wideId, next, true);
    });
  }
}
