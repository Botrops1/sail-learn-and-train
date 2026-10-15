import { el } from './dom';
import { t } from './i18n';
import type { LayoutShell } from './layout';
import {
  SHEET,
  cameraInsetPx,
  sheetHeightPx,
  snapSheet,
  stepSheet,
  tapSheet,
  type SheetHeight,
  type SheetSpace,
} from './sheetGeometry';

export interface Sheet {
  height(): SheetHeight;
  /** Animates to a height (stacked layout; ignored in the side layout). */
  setHeight(height: SheetHeight): void;
  /** Runs after a height change has finished animating (and on a layout change). */
  onChange(listener: (height: SheetHeight) => void): void;
  /** The head row under the handle (M26: the tabs; M27: the quick row). */
  head: HTMLElement;
  /** Stacked layout and height 'peek' (PHASE5_SPEC 3.1). */
  atPeek(): boolean;
  /** Stacked layout and height 'full': the sheet covers the boat and the room above the chip row. */
  atFull(): boolean;
  /**
   * The bottom inset for the 3D framing: `cameraInsetPx(height, space)` plus the sheet's bottom
   * padding (the phone's safe area). Stacked layout only; 0 in the side layout.
   */
  cameraInset(): number;
}

/** The longest a height change may stay `moving` without a `transitionend`, ms. */
const FALLBACK_MAX_MS = 2000;

/** One pointer sample of a drag: when, and the sheet's height then (CSS px). */
interface Sample {
  time: number;
  px: number;
}

/**
 * The phone panel as a sheet pulled up from the bottom (PHASE5_SPEC 7.5): three heights, moved by
 * dragging or tapping its handle (or the arrow keys). The panel element itself is the sheet; the
 * 3D canvas keeps filling the whole view behind it, so dragging never resizes it. The sheet
 * writes `--sheet-h` and `--view-bottom-inset` on the shell. In the side layout the handle is
 * hidden and the panel is docked as before.
 */
export function createSheet(layout: LayoutShell, view: HTMLElement, topArea: HTMLElement): Sheet {
  const sheet = layout.panel;
  const shell = layout.root;
  sheet.classList.add('sheet');
  sheet.setAttribute('data-testid', 'sheet');

  const handle = el('button', {
    type: 'button',
    class: 'sheet-handle',
    'data-testid': 'sheet-handle',
  });
  const head = el('div', { class: 'sheet-head' });
  sheet.prepend(handle, head);

  let height: SheetHeight = 'half';
  const listeners: ((height: SheetHeight) => void)[] = [];
  const stacked = () => layout.viewport().mode === 'stacked';

  const space = (): SheetSpace => ({
    viewHeightPx: view.clientHeight,
    topAreaPx: topArea.offsetTop + topArea.offsetHeight,
  });
  /** The phone's bottom safe area, which the sheet pads itself with. */
  const safeBottom = () => parseFloat(getComputedStyle(sheet).paddingBottom) || 0;

  function writeSize(px: number): void {
    shell.style.setProperty('--sheet-h', `${px}px`);
    shell.style.setProperty('--view-bottom-inset', `${px}px`);
  }

  /** Writes the current height's size, without animation. */
  function place(): void {
    if (stacked()) writeSize(sheetHeightPx(height, space()) + safeBottom());
    else {
      shell.style.removeProperty('--sheet-h');
      shell.style.setProperty('--view-bottom-inset', '0px');
    }
  }

  function setMoving(moving: boolean): void {
    sheet.dataset.sheetMoving = String(moving);
    shell.dataset.sheetMoving = String(moving);
  }

  function labelHandle(): void {
    handle.setAttribute(
      'aria-label',
      t('sheet.handle', { height: t(`sheet.height.${height}` as const) }),
    );
  }

  /** Counts height changes; a change that is still moving has `pending` set. */
  let changeId = 0;
  let pending = false;

  /** Ends a height change once: moving off, listeners run. */
  function endMoving(): void {
    if (!pending) return;
    pending = false;
    setMoving(false);
    listeners.forEach((listener) => listener(height));
  }

  /**
   * If `transitionend` never comes, the change ends `transitionMs + 100` after it began. A busy
   * main thread (a slow phone, software drawing) can start the animation late, so while the sheet
   * is still animating the end waits for `transitionend`, but never longer than `fallbackMaxMs`.
   */
  function armFallback(id: number, began: number): void {
    setTimeout(() => {
      if (id !== changeId) return;
      const running = sheet.getAnimations().length > 0;
      if (running && performance.now() - began < FALLBACK_MAX_MS) armFallback(id, began);
      else endMoving();
    }, SHEET.transitionMs + 100);
  }

  function go(next: SheetHeight): void {
    if (!stacked()) return;
    // A newer change takes over from one still moving: only its end counts.
    const id = ++changeId;
    const before = parseFloat(shell.style.getPropertyValue('--sheet-h'));
    height = next;
    sheet.dataset.sheet = next;
    labelHandle();
    const px = sheetHeightPx(next, space()) + safeBottom();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Nothing to animate: same size, or the user asks for less motion.
    const animated = !reduced && before !== px;
    setMoving(true);
    writeSize(px);
    pending = true;
    if (animated) armFallback(id, performance.now());
    else endMoving();
  }

  sheet.addEventListener('transitionend', (event) => {
    if (event.target === sheet && event.propertyName === 'height') endMoving();
  });
  sheet.addEventListener('transitioncancel', (event) => {
    // A newer change cancels the slide it takes over from: that one is still moving, so only
    // a cancel with nothing left animating ends it.
    if (event.target !== sheet || event.propertyName !== 'height') return;
    if (sheet.getAnimations().length === 0) endMoving();
  });

  // --- The handle: drag, tap, keys -------------------------------------------------------------
  let drag:
    | { startY: number; start: SheetHeight; startPx: number; px: number; samples: Sample[] }
    | undefined;

  const bounds = () => {
    const current = space();
    return { min: sheetHeightPx('peek', current), max: sheetHeightPx('full', current) };
  };

  handle.addEventListener('pointerdown', (event) => {
    if (!stacked() || event.button > 0) return;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone: the drag still follows the events the handle gets.
    }
    let px = sheetHeightPx(height, space());
    if (pending) {
      // Grabbed in the middle of a slide: the drag starts from where the sheet is now, with the
      // slide stopped there (a transition left on would make the sheet trail the finger).
      px = sheet.offsetHeight - safeBottom();
      changeId += 1;
      pending = false;
      setMoving(false);
      writeSize(px + safeBottom());
    }
    drag = {
      startY: event.clientY,
      start: height,
      startPx: px,
      px,
      samples: [{ time: event.timeStamp, px }],
    };
  });

  handle.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { min, max } = bounds();
    drag.px = Math.min(max, Math.max(min, drag.startPx + (drag.startY - event.clientY)));
    drag.samples.push({ time: event.timeStamp, px: drag.px });
    if (Math.abs(event.clientY - drag.startY) >= SHEET.tapMaxMovePx) {
      sheet.dataset.dragging = 'true';
    }
    writeSize(drag.px + safeBottom());
  });

  function release(event: PointerEvent, cancelled: boolean): void {
    if (!drag) return;
    const current = drag;
    drag = undefined;
    delete sheet.dataset.dragging;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (!cancelled && Math.abs(event.clientY - current.startY) < SHEET.tapMaxMovePx) {
      go(tapSheet(current.start));
      return;
    }
    let velocity = 0;
    if (!cancelled) {
      // Rate of growth over the last `velocityWindowMs` of the drag (or since the start).
      const old = current.samples.filter(
        (sample) => sample.time <= event.timeStamp - SHEET.velocityWindowMs,
      );
      const from = old.length > 0 ? old[old.length - 1] : current.samples[0];
      if (from) {
        velocity = (current.px - from.px) / Math.max(1, event.timeStamp - from.time);
      }
    }
    go(snapSheet(current.start, current.px, velocity, space()));
  }
  handle.addEventListener('pointerup', (event) => release(event, false));
  handle.addEventListener('pointercancel', (event) => release(event, true));

  // Keyboard: Enter and Space arrive as a click without a pointer (`detail` 0); pointer taps are
  // handled on pointerup, so the click that follows them is ignored.
  handle.addEventListener('click', (event) => {
    if (event.detail === 0) go(tapSheet(height));
  });
  handle.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      go(stepSheet(height, 1));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      go(stepSheet(height, -1));
    }
  });

  // --- Layout and size changes -----------------------------------------------------------------
  function onLayout(): void {
    handle.hidden = !stacked();
    place();
    listeners.forEach((listener) => listener(height));
  }
  layout.onChange(onLayout);
  // The sheet's size follows the view and the top area, without animation.
  const observer = new ResizeObserver(() => {
    if (!drag) place();
  });
  observer.observe(view);
  observer.observe(topArea);

  sheet.dataset.sheet = height;
  setMoving(false);
  labelHandle();
  handle.hidden = !stacked();
  place();

  return {
    height: () => height,
    setHeight: go,
    onChange: (listener) => listeners.push(listener),
    head,
    atPeek: () => stacked() && height === 'peek',
    atFull: () => stacked() && height === 'full',
    cameraInset: () => (stacked() ? cameraInsetPx(height, space()) + safeBottom() : 0),
  };
}
