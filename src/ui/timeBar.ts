import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import {
  pauseAvailable,
  timeLapseAvailable,
  timeScaleText,
  timeSpeedAvailable,
} from '../model/timeScale';
import { demoCardKind } from '../app/exerciseBar';
import { DEMO_MAX_SCALE, exercisePauseBlocked } from '../app/exerciseRun';
import { clockAria, createClockParts } from './clockPanel';
import { el } from './dom';
import type { LayoutShell } from './layout';
import { layoutKindOf } from './modes';
import { t } from './i18n';
import { setText } from './stepper';

/** How long the note under the "Held still" chip stays, ms. */
const NOTE_SHOWN_MS = 6000;

/**
 * Where the fold of the old time bar (M37) was remembered on this device. Since M92 the widget is
 * always compact and nothing reads the fold; the key stays so setup files keep their shape
 * (`device.timeBarFolded`) and Settings → Reset still clears an old value.
 */
export const FOLD_KEY = 'sail-learn.timeBarFolded';

/**
 * The time widget (M92, issue #172; it joins the time bar of PHASE2_SPEC 10.3 and the clock chip
 * of PHASE3_SPEC 9.5) at the top right of the 3D view, two rows high:
 *
 *   | Time ×1 | Pause |
 *   | 12:00   |       |
 *
 * The left part opens the time card under the top area (nearly the view's width on a phone): the
 * time speeds as one row of choices (¼ … 16) and the clock (date, sunrise and sunset, set a time).
 * The right part is the one button for every stop of time: Pause, Resume, or Carry on when an
 * exercise stopped time for a mistake. The speed shows only where time changes something (Sailing,
 * or a wind that changes) and while the Time bar switch in Settings is on; the clock only while
 * the Clock switch is on. Where nothing changes with time at all (Held still, steady wind, Easy
 * ropes, flat water; issue #34) Pause is replaced by a "Held still" chip that explains itself.
 */
export function createTimeBar(
  host: HTMLElement,
  view: HTMLElement,
  store: Store,
  layout: LayoutShell,
): HTMLElement {
  const clock = createClockParts(store);
  const setScale = (scale: number) => store.dispatch({ type: 'setTimeScale', scale });

  // The left part: the speed over the clock; a tap opens the card.
  const speedText = el('span', { class: 'time-status', 'data-testid': 'time-status' });
  const speedLine = el('span', { class: 'time-open-speed' }, [
    el('span', { class: 'time-open-word' }, [t('time.label')]),
    speedText,
  ]);
  const open = el(
    'button',
    {
      type: 'button',
      class: 'time-open',
      'data-testid': 'time-open',
      'aria-expanded': 'false',
      'aria-controls': 'time-card',
    },
    [speedLine, clock.chip],
  );

  // The right part: the one button for every stop of time (Pause, Resume, Carry on).
  const pause = el('button', {
    type: 'button',
    class: 'pause-button',
    'data-testid': 'pause-button',
    'aria-pressed': 'false',
  });
  // The button keeps the width of its widest word (invisible copies in the same grid cell, as the
  // strip's cells do, M37), so the strip beside it does not reflow on Pause / Resume. Carry on
  // (wider) may widen it while a mistake card shows: time is stopped then anyway.
  // The copies are CSS pseudo-elements (`data-ghost-*`), so the button's text is only its word.
  pause.dataset.ghostPause = t('pause.pause');
  pause.dataset.ghostResume = t('pause.resume');
  let pauseDoes: 'pause' | 'resume' | 'carryOn' = 'pause';
  pause.addEventListener('click', () => {
    if (pauseDoes === 'carryOn') store.dispatch({ type: 'exercise', command: 'continue' });
    else store.dispatch({ type: 'setPaused', paused: pauseDoes === 'pause' });
  });

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

  // M81: while the app plays an exercise, time runs at ×4 at most; the widget says so.
  const capped = el('p', { class: 'hint time-demo-capped', 'data-testid': 'time-demo-capped' }, [
    t('exercise.demo.capped'),
  ]);
  capped.hidden = true;
  let cappedTimer: number | undefined;
  let cappedOn = false;
  const showCapped = (on: boolean) => {
    if (on === cappedOn) return;
    cappedOn = on;
    window.clearTimeout(cappedTimer);
    capped.hidden = !on;
    if (on) cappedTimer = window.setTimeout(() => (capped.hidden = true), NOTE_SHOWN_MS);
  };

  const bar = el(
    'div',
    { class: 'time-bar', role: 'group', 'aria-label': t('time.group'), 'data-testid': 'time-bar' },
    [open, pause, held, note, capped],
  );
  host.append(bar);

  // The card: the speeds, then the clock.
  const scaleButton = (scale: number, text: string) => {
    const node = el('button', {
      type: 'button',
      class: 'time-scale',
      'data-testid': `time-scale-${scale}`,
      'aria-pressed': 'false',
      'aria-label': t('time.scaleAria', { scale: timeScaleText(scale) }),
    });
    node.textContent = text;
    node.addEventListener('click', () => setScale(scale));
    return { scale, node };
  };
  const scaleButtons = boat.windModes.timeScales.map((scale) =>
    scaleButton(scale, scale === 1 ? '×1' : timeScaleText(scale)),
  );
  // Time-lapse (M95): ×60 and ×240, only where the boat is held still, anchored or tied up.
  const lapseButtons = boat.windModes.timeLapseScales.map((scale) =>
    scaleButton(scale, `×${timeScaleText(scale)}`),
  );
  scaleButtons.push(...lapseButtons);
  const lapseHeading = el('h3', { class: 'time-card-heading' }, [t('time.lapseHeading')]);
  const lapseRow = el(
    'div',
    {
      class: 'time-scales',
      role: 'group',
      'data-testid': 'time-lapse',
      'aria-label': t('time.lapseHeading'),
    },
    lapseButtons.map((b) => b.node),
  );
  const lapseHint = el('p', { class: 'hint', 'data-testid': 'time-lapse-hint' }, [
    t('time.lapseHint'),
  ]);
  const speedSection = el(
    'section',
    { class: 'time-speed', 'data-testid': 'time-speed', 'aria-label': t('time.speedHeading') },
    [
      el('h3', { class: 'time-card-heading' }, [t('time.speedHeading')]),
      el(
        'div',
        { class: 'time-scales', role: 'group', 'aria-label': t('time.speedHeading') },
        scaleButtons.filter((b) => !lapseButtons.includes(b)).map((b) => b.node),
      ),
      lapseHeading,
      lapseRow,
      lapseHint,
    ],
  );
  const close = el('button', {
    type: 'button',
    class: 'clock-close',
    'data-testid': 'time-card-close',
    'aria-label': t('time.close'),
  });
  close.textContent = '×';
  const card = el(
    'div',
    {
      class: 'time-card',
      id: 'time-card',
      'data-testid': 'time-card',
      role: 'dialog',
      'aria-label': t('time.group'),
    },
    [close, speedSection, clock.section],
  );
  card.hidden = true;
  view.append(card);

  let cardOpen = false;
  const setOpen = (next: boolean) => {
    if (cardOpen === next) return;
    cardOpen = next;
    card.hidden = !next;
    open.setAttribute('aria-expanded', String(next));
    if (next) {
      clock.section.hidden = !clock.shown(store.getState());
      if (!clock.section.hidden) clock.opened();
    }
    refresh(store.getState());
  };
  open.addEventListener('click', () => setOpen(!cardOpen));
  close.addEventListener('click', () => {
    setOpen(false);
    open.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (cardOpen) setOpen(false);
    if (!note.hidden) showNote(false);
  });

  let shown = '';
  const refresh = (state: AppState) => {
    const speed = timeSpeedAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar);
    const lapse = timeLapseAvailable(
      state.boat.mode,
      state.windMode.mode,
      state.settings.timeBar,
      state.anchor.phase,
      state.lines.lines.length,
    );
    const clockShown = clock.shown(state);
    const scale = state.settings.timeScale;
    const pausable = pauseAvailable(
      state.boat.mode,
      state.windMode.mode,
      state.settings.ropesMode,
      state.sea.setting,
    );
    const runStatus = state.exercise?.status;
    // A mistake card: the button carries on (the same as the card's Carry on, PHASE10_SPEC 7.3).
    const mistake = runStatus === 'mistake' && demoCardKind(state) === null;
    // A failed card and the setup card (until Start) decide when time goes on (PHASE10_SPEC 7.3);
    // M81: while Show me's "Now you" card shows, going on from here is a dead end: Back is the way.
    const blocked =
      runStatus === 'failed' ||
      runStatus === 'setup' ||
      (runStatus === 'mistake' && !mistake) ||
      demoCardKind(state) === 'nowYou';
    // Alone (M71): no Pause while the exercise runs; once paused, Resume stays enabled.
    const alone = exercisePauseBlocked(state) && !state.paused;
    const active = runStatus === 'running' || runStatus === 'mistake';
    const demoCapped = active && state.exercise?.demo != null && scale > DEMO_MAX_SCALE;
    const stopped = state.paused || mistake;
    const key = [
      speed,
      lapse,
      clockShown,
      scale,
      stopped,
      mistake,
      pausable,
      blocked,
      alone,
      demoCapped,
      cardOpen,
      clockShown ? clock.chip.textContent : '',
      layoutKindOf(layout.viewport()),
    ].join('|');
    if (key === shown) return;
    shown = key;

    // The notes show for a few seconds: they must not hide the step line.
    showCapped(demoCapped);
    bar.dataset.speed = String(speed);
    bar.dataset.held = String(!pausable);
    bar.dataset.stopped = String(stopped);

    // The left part: the speed line, the clock line, or both; none of them, no left part.
    speedLine.hidden = !speed;
    clock.chip.hidden = !clockShown;
    open.hidden = !speed && !clockShown;
    if (open.hidden) setOpen(false);
    speedSection.hidden = !speed;
    lapseHeading.hidden = !lapse;
    lapseRow.hidden = !lapse;
    lapseHint.hidden = !speed || lapse;
    if (cardOpen) clock.section.hidden = !clockShown;
    setText(speedText, `×${timeScaleText(scale)}`);
    const names: string[] = [];
    if (speed) names.push(t('time.status', { scale: timeScaleText(scale) }));
    if (clockShown) names.push(clockAria(state.clock.utcMs));
    names.push(t('time.openHint'));
    open.setAttribute('aria-label', names.join('. '));
    for (const { scale: value, node } of scaleButtons) {
      node.setAttribute('aria-pressed', String(value === scale));
      node.classList.toggle('is-current', value === scale);
    }

    // The right part.
    pause.hidden = !pausable && !mistake;
    held.hidden = !pause.hidden;
    if (!held.hidden) showNote(false);
    pauseDoes = mistake ? 'carryOn' : state.paused ? 'resume' : 'pause';
    pause.disabled = blocked || alone;
    pause.setAttribute('aria-pressed', String(stopped));
    pause.classList.toggle('is-paused', stopped);
    pause.dataset.does = pauseDoes;
    setText(
      pause,
      t(
        pauseDoes === 'carryOn'
          ? 'exercise.continue'
          : pauseDoes === 'resume'
            ? 'pause.resume'
            : 'pause.pause',
      ),
    );
    const pauseName = alone
      ? t('exercise.alonePause')
      : t(
          pauseDoes === 'carryOn'
            ? 'pause.carryOnAria'
            : pauseDoes === 'resume'
              ? 'pause.resumeAria'
              : 'pause.pauseAria',
        );
    pause.setAttribute('aria-label', pauseName);
    if (alone) pause.title = pauseName;
    else pause.removeAttribute('title');
  };
  store.subscribe((state) => refresh(state));
  layout.onChange(() => refresh(store.getState()));
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
