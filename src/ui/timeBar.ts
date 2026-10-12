import type { AppState, Store } from '../app/store';
import {
  fastestTimeScale,
  slowestTimeScale,
  stepTimeScale,
  timeScaleText,
  timeSpeedAvailable,
} from '../model/timeScale';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/** Where the fold of the bar is remembered on this device (not in the link). */
const FOLD_KEY = 'sail-learn.timeBarFolded';

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
 * bar to the Pause button (and a small "Time" to open it again); the fold is remembered on the
 * device. The speed part shows only where time changes something (Sailing, or a wind that
 * changes) and while the View tab's switch is on; otherwise only Pause shows.
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
  fold.textContent = t('time.label');
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
  const slower = button('time-slower', '‹', t('time.slower'), () => step(-1));
  const faster = button('time-faster', '›', t('time.faster'), () => step(1));
  const fastest = button('time-fastest', '»', t('time.fastest'), () =>
    setScale(fastestTimeScale()),
  );

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

  const bar = el(
    'div',
    { class: 'time-bar', role: 'group', 'aria-label': t('time.group'), 'data-testid': 'time-bar' },
    [fold, status, slowest, slower, pause, faster, fastest],
  );
  host.append(bar);

  let shown = '';
  const refresh = (state: AppState) => {
    const speed = timeSpeedAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar);
    const open = speed && !folded;
    const scale = state.settings.timeScale;
    const key = [speed, open, scale, state.paused].join('|');
    if (key === shown) return;
    shown = key;
    bar.dataset.speed = String(speed);
    bar.dataset.open = String(open);
    fold.hidden = !speed;
    fold.setAttribute('aria-expanded', String(open));
    fold.setAttribute('aria-label', t(open ? 'time.fold' : 'time.unfold'));
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
 * Keeps `--view-top-h` on the view: where the top area (instrument strip and time bar) ends, in
 * CSS px from the view's top. The map's controls, the debug box and the alerts sit below it.
 */
export function trackTopHeight(view: HTMLElement, top: HTMLElement): void {
  const update = () => {
    const bottom = Math.ceil(top.offsetTop + top.offsetHeight);
    view.style.setProperty('--view-top-h', `${bottom}px`);
  };
  new ResizeObserver(update).observe(top);
  update();
}
