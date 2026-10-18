import { el } from './dom';
import { t } from './i18n';
import {
  clampColumnWidth,
  COLUMN_DEFAULT_PX,
  COLUMN_KEY_BIG_STEP_PX,
  COLUMN_KEY_STEP_PX,
  COLUMN_MIN_PX,
  effectiveWidths,
  maxColumnWidth,
  parseColumns,
  serializeColumns,
  type ColumnState,
} from './columnWidths';
import type { LayoutShell } from './layout';

/** Where the widths and the folds are remembered on this device (not in the link). */
const COLUMNS_KEY = 'sail-learn.columns';

function readColumns(): ColumnState {
  try {
    return parseColumns(window.localStorage.getItem(COLUMNS_KEY));
  } catch {
    return parseColumns(null);
  }
}

function writeColumns(state: ColumnState): void {
  try {
    window.localStorage.setItem(COLUMNS_KEY, serializeColumns(state));
  } catch {
    // Private window or blocked storage: the widths are just not remembered.
  }
}

export interface ColumnHandles {
  /** Opens the column that holds `element` if it is collapsed. */
  reveal(element: HTMLElement): void;
  /** True if `element` sits in a collapsed column. */
  isCollapsed(element: HTMLElement): boolean;
}

/**
 * The two panel columns of the wide layout can be collapsed with a chip over the 3D view's right
 * border and dragged to a new width (M39, issue #89; PHASE5_SPEC 17). A handle sits on the left
 * edge of each column: a grip (a separator that is dragged, moved with the arrow keys, reset by a
 * double click). The chips (a vertical name and an arrow, one per column) fold and open the
 * columns; a folded column takes no room. Dragging a grip to the left widens the column to its right. The widths go to the shell
 * as `--col1-w` and `--col2-w`, which the wide layout's CSS reads; the camera follows because the
 * view's size changes. Nothing here is visible below the wide layout.
 */
export function createColumnHandles(
  panel: HTMLElement,
  columns: [HTMLElement, HTMLElement],
  layout: LayoutShell,
  onChange: () => void,
): ColumnHandles {
  const state = readColumns();
  const windowWidth = () => layout.viewport().width;
  const widths = () => effectiveWidths(state, windowWidth());

  interface Parts {
    column: HTMLElement;
    handle: HTMLElement;
    grip: HTMLElement;
    chip: HTMLButtonElement;
    arrow: HTMLElement;
  }

  const build = (index: 0 | 1, column: HTMLElement): Parts => {
    const name = index === 0 ? '1' : '2';
    const grip = el('div', {
      class: 'col-grip',
      role: 'separator',
      'aria-orientation': 'vertical',
      tabindex: '0',
      'data-testid': `column-grip-${name}`,
      'aria-label': t(`columns.resize.${name}`),
      title: t('columns.resize.hint'),
    });
    // The chip floats over the 3D view's right border (see `chips` below).
    const arrow = el('span', { class: 'col-chip-arrow', 'aria-hidden': 'true' });
    const chip = el(
      'button',
      { type: 'button', class: 'col-chip', 'data-testid': `column-chip-${name}` },
      [arrow, el('span', { class: 'col-chip-name' }, [t(`columns.name.${name}`)])],
    );
    const handle = el('div', { class: 'col-handle', 'data-col': name }, [grip]);

    chip.addEventListener('click', () => {
      state.collapsed[index] = !state.collapsed[index];
      commit();
    });
    grip.addEventListener('dblclick', () => {
      state.widths[index] = COLUMN_DEFAULT_PX[index];
      commit();
    });
    grip.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? COLUMN_KEY_BIG_STEP_PX : COLUMN_KEY_STEP_PX;
      const [first, second] = widths();
      const now = index === 0 ? first : second;
      const other = index === 0 ? second : first;
      let next: number | undefined;
      // The border moves with the arrow: left widens the column on its right.
      if (event.key === 'ArrowLeft') next = now + step;
      else if (event.key === 'ArrowRight') next = now - step;
      else if (event.key === 'Home') next = COLUMN_MIN_PX;
      else if (event.key === 'End') next = maxColumnWidth(windowWidth(), other);
      if (next === undefined) return;
      event.preventDefault();
      state.widths[index] = clampColumnWidth(next, windowWidth(), other);
      commit();
    });
    grip.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widths()[index] ?? COLUMN_MIN_PX;
      grip.setPointerCapture(event.pointerId);
      layout.root.dataset.resizing = 'true';
      const move = (e: PointerEvent) => {
        const other = widths()[1 - index] ?? COLUMN_MIN_PX;
        state.widths[index] = clampColumnWidth(
          startWidth + (startX - e.clientX),
          windowWidth(),
          other,
        );
        apply();
      };
      const end = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', end);
        grip.removeEventListener('pointercancel', end);
        delete layout.root.dataset.resizing;
        commit();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
    });
    return { column, handle, grip, chip, arrow };
  };

  const parts: [Parts, Parts] = [build(0, columns[0]), build(1, columns[1])];

  // Left to right: the view | grip 1 | column 1 | grip 2 | column 2.
  panel.insertBefore(parts[0].handle, columns[0]);
  columns[0].after(parts[1].handle);
  // Two chips over the right border of the 3D view, one per column; a folded column leaves
  // nothing but its chip, an open one folds with its chip.
  layout.view.append(el('div', { class: 'col-chips' }, [parts[0].chip, parts[1].chip]));

  function apply(): void {
    const [first, second] = widths();
    layout.root.style.setProperty('--col1-w', `${first}px`);
    layout.root.style.setProperty('--col2-w', `${second}px`);
    // Only the wide layout has the columns side by side; elsewhere nothing is collapsed.
    const wide = layout.viewport().wide;
    parts.forEach(({ column, handle, grip, chip, arrow }, index) => {
      const name = index === 0 ? '1' : '2';
      const collapsed = wide && state.collapsed[index];
      column.dataset.collapsed = String(collapsed);
      handle.dataset.collapsed = String(collapsed);
      // A collapsed column is out of reach for the keyboard and for screen readers as well.
      column.toggleAttribute('inert', collapsed);
      const own = index === 0 ? first : second;
      const other = index === 0 ? second : first;
      grip.setAttribute('aria-valuemin', String(COLUMN_MIN_PX));
      grip.setAttribute('aria-valuemax', String(maxColumnWidth(windowWidth(), other)));
      grip.setAttribute('aria-valuenow', String(own));
      grip.tabIndex = collapsed ? -1 : 0;
      const label = t(collapsed ? `columns.show.${name}` : `columns.hide.${name}`);
      chip.setAttribute('aria-label', label);
      chip.setAttribute('aria-expanded', String(!collapsed));
      chip.title = label;
      // The arrow shows where the column goes: out to the left when it is folded away.
      arrow.textContent = collapsed ? '‹' : '›';
    });
    panel.dataset.folded = String(wide && state.collapsed[0] && state.collapsed[1]);
  }

  function commit(): void {
    apply();
    writeColumns(state);
    onChange();
  }

  layout.onChange(apply);
  apply();

  return {
    reveal: (element) => {
      const index = element.closest('.panel-second') ? 1 : 0;
      if (!layout.viewport().wide || !state.collapsed[index]) return;
      state.collapsed[index] = false;
      commit();
    },
    isCollapsed: (element) =>
      layout.viewport().wide && state.collapsed[element.closest('.panel-second') ? 1 : 0],
  };
}
