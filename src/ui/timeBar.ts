import type { AppState, Store } from '../app/store';
import {
  fastestTimeScale,
  pauseAvailable,
  slowestTimeScale,
  stepTimeScale,
  timeScaleText,
  timeSpeedAvailable,
} from '../model/timeScale';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/** How long the note under the "Held still" chip stays, ms. */
const NOTE_SHOWN_MS = 6000;

/** Where the fold of the bar is remembered on this device (not in the link). */
export const FOLD_KEY = 'sail-learn.timeBarFolded';

function readFolded(): boolean {
  try {
    return window.localStorage.getItem(FOLD_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFolded(folded: boolean): void {
  try {
    window.localStorage.setItem(FOLD_KEY, folded ? '1' : '0');
  } catch {
    // Private window or blocked storage: the fold is just not remembered.
  }
}

/**
 * The time bar (PHASE2_SPEC 10.3, issue #25), at the top of the 3D view, replacing the Phase 1
 * Pause button: `Time ×1  [«] [‹] [Pause] [›] [»]`. ‹ and › go one step down and up the list of
 * time scales (¼ … 16), « and » straight to the slowest and the fastest, a tap on the ×1 goes
 * back to normal speed. Pause freezes time, exactly as in Phase 1. The word "Time" folds the
 * bar to the Pause button; folded, the word "Time" has the current speed under it (M37, issue #87);
 * the fold is remembered on the device. The speed part shows only where time changes something (Sailing, or a wind that
 * changes) and while the switch in Settings is on; otherwise only Pause shows. Where nothing
 * changes with time at all (Held still, steady wind, Easy ropes; issue #34) Pause is replaced
 * by a "Held still" chip; a tap on it explains in a small note where to change that.
 */
export function createTimeBar(host: HTMLElement, store: Store): HTMLElement {
  let folded = readFolded();

  const button = (testId: string, label: string, aria: string, action: () => void) => {
    const node = el('button', {
      type: 'button',
      class: 'time-button',
      'data-testid': testId,
      'aria-label': aria,
    });
    node.textContent = label;
    node.addEventListener('click', action);
    return node;
  };
  const setScale = (scale: number) => store.dispatch({ type: 'setTimeScale', scale });
  const step = (direction: -1 | 1) =>
    setScale(stepTimeScale(store.getState().settings.timeScale, direction));

  const fold = el('button', {
    type: 'button',
    class: 'time-label',
    'data-testid': 'time-fold',
    'aria-expanded': 'true',
  });
  const foldSpeed = el('span', { class: 'time-label-speed', 'data-testid': 'time-fold-speed' });
  fold.append(el('span', {}, [t('time.label')]), foldSpeed);
  fold.addEventListener('click', () => {
    folded = !folded;
    writeFolded(folded);
    refresh(store.getState());
  });
  const status = el('button', {
    type: 'button',
    class: 'time-status',
    'data-testid': 'time-status',
  });
  status.addEventListener('click', () => setScale(1));
  const slowest = button('time-slowest', '«', t('time.slowest'), () =>
    setScale(slowestTimeScale()),
  );
  slowest.classList.add('time-jump');
  const slower = button('time-slower', '‹', t('time.slower'), () => step(-1));
  const faster = button('time-faster', '›', t('time.faster'), () => step(1));
  const fastest = button('time-fastest', '»', t('time.fastest'), () =>
    setScale(fastestTimeScale()),
  );
  fastest.classList.add('time-jump');

  // Pause is the Phase 1 button, as it was: the same test id, class and strings.
  const pause = el('button', {
    type: 'button',
    class: 'pause-button',
    'data-testid': 'pause-button',
    'aria-pressed': 'false',
  });
  pause.addEventListener('click', () =>
    store.dispatch({ type: 'setPaused', paused: !store.getState().paused }),
  );

  // Held still, steady wind, Easy ropes: nothing changes with time, so a chip says why.
  const note = el('p', { class: 'time-held-note', role: 'status', 'data-testid': 'held-note' });
  note.hidden = true;
  note.textContent = t('time.held.note');
  let noteTimer: number | undefined;
  const showNote = (visible: boolean) => {
    window.clearTimeout(noteTimer);
    note.hidden = !visible;
    held.setAttribute('aria-expanded', String(visible));
    if (visible) noteTimer = window.setTimeout(() => showNote(false), NOTE_SHOWN_MS);
  };
  const held = el('button', {
    type: 'button',
    class: 'time-held',
    'data-testid': 'held-chip',
    'aria-expanded': 'false',
    'aria-label': t('time.held.aria'),
  });
  held.textContent = t('time.held');
  held.hidden = true;
  held.addEventListener('click', () => showNote(note.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !note.hidden) showNote(false);
  });

  const bar = el(
    'div',
    { class: 'time-bar', role: 'group', 'aria-label': t('time.group'), 'data-testid': 'time-bar' },
    [fold, status, slowest, slower, pause, held, faster, fastest, note],
  );
  host.append(bar);

  let shown = '';
  const refresh = (state: AppState) => {
    const speed = timeSpeedAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar);
    const open = speed && !folded;
    const scale = state.settings.timeScale;
    const pausable = pauseAvailable(
      state.boat.mode,
      state.windMode.mode,
      state.settings.ropesMode,
      state.sea.setting,
    );
    const key = [speed, open, scale, state.paused, pausable].join('|');
    if (key === shown) return;
    shown = key;
    bar.dataset.speed = String(speed);
    bar.dataset.held = String(!pausable);
    pause.hidden = !pausable;
    held.hidden = pausable;
    if (pausable) showNote(false);
    bar.dataset.open = String(open);
    fold.hidden = !speed;
    fold.setAttribute('aria-expanded', String(open));
    fold.setAttribute(
      'aria-label',
      open ? t('time.fold') : t('time.unfoldSpeed', { scale: timeScaleText(scale) }),
    );
    setText(foldSpeed, `×${timeScaleText(scale)}`);
    for (const part of [status, slowest, slower, faster, fastest]) part.hidden = !open;
    setText(status, `×${timeScaleText(scale)}`);
    status.setAttribute('aria-label', t('time.status', { scale: timeScaleText(scale) }));
    slowest.disabled = slower.disabled = scale <= slowestTimeScale();
    faster.disabled = fastest.disabled = scale >= fastestTimeScale();
    pause.setAttribute('aria-pressed', String(state.paused));
    pause.classList.toggle('is-paused', state.paused);
    setText(pause, t(state.paused ? 'pause.resume' : 'pause.pause'));
    pause.setAttribute('aria-label', t(state.paused ? 'pause.resumeAria' : 'pause.pauseAria'));
  };
  store.subscribe((state) => refresh(state));
  refresh(store.getState());
  return bar;
}

/**
 * How far down the 3D picture must start so that the time bar does not cover it, CSS px from
 * the view's top. Where the bar sits beside the strip (wide views, or folded to Pause) the
 * picture fills the view as before (the strip itself overlaps it, as it always did). Where the
 * bar (or the clock chip, M17) wraps under the strip (phones in portrait) the camera frames the
 * boat below it.
 */
export function topClearance(top: HTMLElement): number {
  // The time bar or the clock chip, whichever wraps under the strip (a hidden chip has no height).
  let bottom = 0;
  for (const child of Array.from(top.children) as HTMLElement[]) {
    if (child.offsetHeight === 0 || child.offsetTop < 4) continue;
    bottom = Math.max(bottom, top.offsetTop + child.offsetTop + child.offsetHeight + 4);
  }
  return Math.ceil(bottom);
}

/**
 * Keeps `--view-top-h` on the view: where the top area (instrument strip and time bar) ends, in
 * CSS px from the view's top. The map's controls, the debug box and the alerts sit below it.
 * `onChange` runs when the top area changes size (the bar folds, a badge row appears).
 */
export function trackTopHeight(view: HTMLElement, top: HTMLElement, onChange: () => void): void {
  const update = () => {
    const bottom = Math.ceil(top.offsetTop + top.offsetHeight);
    view.style.setProperty('--view-top-h', `${bottom}px`);
    onChange();
  };
  new ResizeObserver(update).observe(top);
  update();
}
