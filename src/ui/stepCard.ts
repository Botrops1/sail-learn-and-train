import type { AppState, Store } from '../app/store';
import { demoCardKind } from '../app/exerciseBar';
import type { ExerciseRun } from '../app/exerciseRun';
import { alertTimeText } from '../model/alerts';
import { controlView } from './ropeControls';
import {
  EXERCISE_SETTINGS,
  checkTargets,
  exerciseDef,
  exerciseText,
  targetReading,
  type ExerciseDef,
  type TargetRow,
} from '../model/exercises';
import { el } from './dom';
import { SCENE } from '../render3d/sceneConfig';
import { currentLanguage, t } from './i18n';
import type { LayoutShell } from './layout';
import { layoutKindOf } from './modes';
import { setText } from './stepper';

/** Remembers on this device whether the hint window is open (a view setting, not in the link). */
export const COACH_KEY = 'sail-learn.coach';

function readOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(COACH_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeOpen(open: boolean): void {
  try {
    globalThis.localStorage?.setItem(COACH_KEY, open ? '1' : '0');
  } catch {
    // Blocked storage: the choice is just not remembered.
  }
}

/** The target of one row in words, without the reading ("Wind 58–72° from the bow"). */
export function targetText(row: TargetRow): string {
  switch (row.kind) {
    case 'twa':
      return t('exercise.target.twa', { min: row.range[0], max: row.range[1] });
    case 'tack':
      return t(`exercise.target.tack.${row.side}` as 'exercise.target.tack.port');
    case 'trim':
      return t('exercise.target.trim', {
        sail: t(`exercise.target.sail.${row.sail}` as 'exercise.target.sail.main'),
        states: row.states
          .map((state) => t(`trim.state.${state}` as 'trim.state.good'))
          .join(t('exercise.target.or')),
      });
    case 'control':
      return t('exercise.target.control', {
        name: t(controlView(row.id).name),
        min: row.range[0],
        max: row.range[1],
      });
    case 'heading':
      return t('exercise.target.heading', { to: pad3(row.to), within: row.within });
    case 'quayGap':
      return t('exercise.target.quayGap', { min: row.range[0], max: row.range[1] });
  }
}

/** 270 → "270", 90 → "090". */
function pad3(n: number): string {
  return String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');
}

/** What the boat shows now for a row ("now 61°"). */
function nowText(row: TargetRow, value: number | string): string {
  if (row.kind === 'twa') return t('exercise.target.nowDeg', { value });
  if (row.kind === 'heading') return t('exercise.target.nowDeg', { value: pad3(Number(value)) });
  if (row.kind === 'quayGap') return t('exercise.target.nowM', { value });
  if (row.kind === 'control') return t('exercise.target.nowPct', { value });
  const word =
    row.kind === 'trim'
      ? t(`trim.state.${String(value)}` as 'trim.state.good')
      : t(`wind.side.${String(value)}` as 'wind.side.port');
  return t('exercise.target.nowWord', { value: word });
}

type Tone = 'none' | 'done' | 'mistake' | 'pause';
type Row = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** What the card shows for a run (PHASE_STEP_CARD_SPEC 4.2): the first row that matches wins. */
function rowOf(state: AppState, run: ExerciseRun): Row {
  const demoCard = demoCardKind(state);
  if (demoCard === 'nowYou') return 1;
  if (demoCard === 'stepDone') return 2;
  if (run.status === 'running' && run.stepPause && state.paused) return 3;
  if (run.status === 'mistake') return 4;
  if (run.status === 'failed') return 5;
  if (run.status === 'done') return 6;
  return 7;
}

/**
 * The step card over the 3D view while an exercise runs (M93, PHASE_STEP_CARD_SPEC): one box for what
 * used to be the step line, the hint window and the demo card. It shows the step (with the hold
 * ring), the step's hint behind a tap, "Step done" and "Now you" with their buttons, and a mistake
 * with why, what to do, Carry on and Back. It is built only from the run state.
 */
export function createStepCard(
  top: HTMLElement,
  store: Store,
  layout: LayoutShell,
  onOpen: () => void,
): void {
  // The remembered choice (side and wide). On a phone (M80) the hint starts folded at every run
  // start and step change; a tap opens it until the next of these and is not remembered.
  let remembered = readOpen();
  let stackedOpen = false;
  const stacked = () => layoutKindOf(layout.viewport()) === 'stacked';
  const isOpen = () => (stacked() ? stackedOpen : remembered);
  let prevStatus = '';
  let prevRun = '';
  let prevStep = -1;
  let lastId = '';
  let lastStep = -1;

  const ring = el('span', {
    class: 'exercise-ring',
    'data-testid': 'exercise-ring',
    'aria-hidden': 'true',
    hidden: '',
  });
  const prefixSpan = el('span', { class: 'step-card-demo', 'data-testid': 'step-card-demo' });
  const label = el('span', { class: 'step-card-text', 'data-testid': 'step-card-text' });
  const chevron = el('span', { class: 'step-card-chevron', 'aria-hidden': 'true' });
  const headButton = el('button', {
    type: 'button',
    class: 'step-card-head',
    'data-testid': 'step-card-head',
  });
  headButton.append(ring, label, chevron);
  const body = el('div', {
    class: 'step-card-body',
    id: 'step-card-body',
    'data-testid': 'step-card-body',
  });
  const root = el(
    'section',
    {
      class: 'step-card',
      'data-testid': 'step-card',
      'aria-label': t('exercise.card.label'),
      hidden: '',
    },
    [headButton, body],
  );
  top.append(root);

  let row: Row = 7;
  let built = '';
  let rows: { row: TargetRow; item: HTMLElement }[] = [];

  /** Rows 1–4 are always open (the learner must see their buttons); row 7 follows the fold. */
  const bodyOpen = () => row <= 4 || (row === 7 && isOpen());
  const showFold = () => {
    const open = bodyOpen();
    if (body.hidden === open) body.hidden = !open;
    if (row === 7) {
      headButton.setAttribute('aria-expanded', String(isOpen()));
      headButton.setAttribute('aria-controls', 'step-card-body');
      setText(chevron, isOpen() ? '▴' : '▾');
    } else {
      headButton.removeAttribute('aria-expanded');
      headButton.removeAttribute('aria-controls');
      setText(chevron, '');
    }
    chevron.hidden = row !== 7;
    fit();
  };
  /**
   * M80 (review): on a phone the open card ends inside the share of the view the camera counts as
   * covered (`maxTopInsetShare`), so the yacht never hides under it; its text scrolls inside and
   * the buttons stay at its foot.
   */
  const fit = () => {
    const view = root.closest('.view');
    if (!stacked() || body.hidden || root.hidden || !view) {
      if (body.style.maxHeight !== '') body.style.maxHeight = '';
      if (body.style.overflowY !== '') body.style.overflowY = '';
      return;
    }
    const viewTop = view.getBoundingClientRect().top;
    const limit = SCENE.camera.maxTopInsetShare * view.clientHeight;
    const used = headButton.getBoundingClientRect().bottom - viewTop;
    const height = `${Math.max(48, Math.floor(limit - used - 4))}px`;
    if (body.style.maxHeight !== height) body.style.maxHeight = height;
    body.style.overflowY = 'auto';
  };
  headButton.addEventListener('click', () => {
    if (row === 5 || row === 6) {
      onOpen();
      return;
    }
    if (row !== 7) return;
    if (stacked()) stackedOpen = !stackedOpen;
    else {
      remembered = !remembered;
      writeOpen(remembered);
    }
    sync(store.getState());
  });

  const flash = () => {
    root.classList.remove('exercise-flash');
    void root.offsetWidth;
    root.classList.add('exercise-flash');
  };

  const button = (
    testid: string,
    text: string,
    primary: boolean,
    onClick: () => void,
  ): HTMLElement => {
    const node = el(
      'button',
      {
        type: 'button',
        class: primary ? 'exercise-start' : 'exercise-button',
        'data-testid': testid,
      },
      [text],
    );
    node.addEventListener('click', onClick);
    return node;
  };
  const buttonsBox = (...nodes: HTMLElement[]) => el('div', { class: 'exercise-buttons' }, nodes);
  const heading = (text: string) => el('p', { class: 'step-card-heading' }, [text]);

  /** The body of one row, built again when its key changes. */
  const buildBody = (def: ExerciseDef, run: ExerciseRun): Node[] => {
    const texts = exerciseText(def.id, currentLanguage());
    if (row === 1) {
      return [
        el('p', { class: 'step-card-how' }, [t('exercise.demo.nowYou')]),
        buttonsBox(
          button('exercise-demo-back', t('exercise.demo.back'), true, () => {
            const now = store.getState().exercise;
            if (now) store.dispatch({ type: 'exercise', command: { back: now.demoStep } });
          }),
        ),
      ];
    }
    if (row === 2) {
      const finished = def.steps[run.step - 1];
      return [
        el('p', { class: 'step-card-how' }, [(finished && texts.steps[finished.id]?.how) || '']),
        buttonsBox(
          button('exercise-demo-next', t('exercise.demo.next'), true, () =>
            store.dispatch({ type: 'setPaused', paused: false }),
          ),
          button('exercise-demo-try', t('exercise.demo.try'), false, () => {
            const now = store.getState().exercise;
            if (now) store.dispatch({ type: 'exercise', command: { back: now.step - 1 } });
          }),
        ),
      ];
    }
    if (row === 3) {
      const next = def.steps[run.step];
      const goal = next ? (texts.steps[next.id]?.goal ?? next.id) : '';
      return [
        el('p', { class: 'step-card-how' }, [t('exercise.card.next', { goal })]),
        buttonsBox(
          button('step-card-next', t('exercise.demo.next'), true, () =>
            store.dispatch({ type: 'setPaused', paused: false }),
          ),
        ),
      ];
    }
    if (row === 4) {
      const m = run.mistake ? texts.mistakes[run.mistake.mistakeId] : undefined;
      const last = run.waypoints[run.waypoints.length - 1];
      return [
        el('p', { class: 'step-card-heading' }, [t('exercise.why')]),
        el('p', { class: 'step-card-how' }, [m?.why ?? '']),
        el('p', { class: 'step-card-heading' }, [t('exercise.fix')]),
        el('p', { class: 'step-card-how' }, [m?.fix ?? '']),
        buttonsBox(
          button('step-card-continue', t('exercise.continue'), true, () =>
            store.dispatch({ type: 'exercise', command: 'continue' }),
          ),
          button(
            'step-card-back',
            last && last.step === 0 && run.startStep === 0
              ? t('exercise.backToStart')
              : t('exercise.backTo', { n: (last?.step ?? 0) + 1 }),
            false,
            () => store.dispatch({ type: 'exercise', command: { back: last?.step ?? 0 } }),
          ),
        ),
      ];
    }
    if (row === 7) {
      const step = def.steps[run.step];
      const text = step ? texts.steps[step.id] : undefined;
      rows = step ? checkTargets(step.check).map((entry) => ({ row: entry, item: el('li') })) : [];
      const list = el('ul', { class: 'step-card-targets', 'data-testid': 'step-card-targets' });
      list.append(...rows.map((entry) => entry.item));
      return [
        el('p', { class: 'step-card-how', 'data-testid': 'step-card-how' }, [text?.how ?? '']),
        ...(rows.length > 0 ? [heading(t('exercise.coach.targets')), list] : []),
        buttonsBox(button('step-card-open', t('exercise.card.open'), false, onOpen)),
      ];
    }
    return [];
  };

  const sync = (state: AppState) => {
    const run = state.exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    const status = run?.status ?? '';
    // M80: a phone folds the hint at every run start and step change (not on coming back from a mistake).
    if (status === 'running') {
      const returning = prevStatus === 'mistake' && prevRun === run?.id && prevStep === run.step;
      if (
        !returning &&
        (prevStatus !== 'running' || prevRun !== run?.id || prevStep !== run.step)
      ) {
        stackedOpen = false;
      }
    }
    prevStatus = status;
    prevRun = run?.id ?? '';
    prevStep = run?.step ?? -1;
    if (
      !run ||
      !def ||
      run.status === 'setup' ||
      (run.status === 'running' && !def.steps[run.step])
    ) {
      if (!root.hidden) root.hidden = true;
      built = '';
      lastStep = -1;
      return;
    }
    const doneNow = run.id === lastId && lastStep >= 0 && run.step > lastStep;
    lastId = run.id;
    lastStep = run.step;
    if (root.hidden) root.hidden = false;
    if (doneNow) flash();

    row = rowOf(state, run);
    const texts = exerciseText(def.id, currentLanguage());
    const what = run.mistake
      ? (texts.mistakes[run.mistake.mistakeId]?.what ?? run.mistake.mistakeId)
      : '';
    let tone: Tone = 'none';
    let text: string;
    switch (row) {
      case 1:
        text = t('exercise.demo.nowYouTitle');
        tone = 'pause';
        break;
      case 2:
      case 3:
        text = t('exercise.demo.stepDone', { n: run.step });
        tone = 'done';
        break;
      case 4:
        text = t('exercise.linePaused', { what });
        tone = 'mistake';
        break;
      case 5:
        text = t('exercise.lineStopped', { what });
        tone = 'mistake';
        break;
      case 6:
        text = t('exercise.lineDone', { time: alertTimeText(run.elapsedS) });
        tone = 'done';
        break;
      default: {
        const step = def.steps[run.step];
        const goal = (step && texts.steps[step.id]?.goal) ?? step?.id ?? '';
        text = t('exercise.line', { n: run.step + 1, total: def.steps.length, goal });
        // Not pausing: the last mistake shows for a few seconds (PHASE10_SPEC 7.5).
        if (run.mistake && run.elapsedS - run.mistake.atS < EXERCISE_SETTINGS.mistakeShowS) {
          text = t('exercise.lineMistake', { what });
          tone = 'mistake';
        }
      }
    }
    if (root.dataset.tone !== tone) root.dataset.tone = tone;
    if (root.dataset.row !== String(row)) root.dataset.row = String(row);

    // The hold countdown as a ring that fills with the seconds in it (owner, PR 148).
    const stepNow = row === 7 && run.holdS > 0 ? def.steps[run.step] : undefined;
    if (stepNow && stepNow.holdS > 0) {
      ring.hidden = false;
      ring.style.setProperty(
        '--fill',
        `${Math.min(100, (100 * run.holdS) / stepNow.holdS).toFixed(0)}%`,
      );
      ring.dataset.s = String(Math.ceil(stepNow.holdS - run.holdS));
    } else if (!ring.hidden) {
      ring.hidden = true;
    }

    // M81: while the app plays (Watch, Show me) every text starts with what it is doing.
    const prefix =
      run.demo === 'watch'
        ? t('exercise.watching')
        : run.demo === 'showMe'
          ? t('exercise.showing')
          : '';
    const shown = `${prefix}|${text}`;
    if (label.dataset.shown !== shown) {
      label.dataset.shown = shown;
      setText(prefixSpan, prefix);
      label.replaceChildren(...(prefix ? [prefixSpan] : []), text);
    }

    const key = [
      row,
      run.id,
      run.step,
      row === 4 ? `${run.mistake?.mistakeId}|${run.waypoints.length}` : '',
      currentLanguage(),
    ].join('|');
    if (key !== built) {
      built = key;
      body.replaceChildren(...buildBody(def, run));
    }
    showFold();
    if (row === 7 && bodyOpen()) {
      for (const { row: target, item } of rows) {
        const reading = targetReading(target, state);
        const mark = reading?.ok ? '✓' : '○';
        const now = reading ? ` · ${nowText(target, reading.value)}` : '';
        setText(item, `${mark} ${targetText(target)}${now}`);
        item.classList.toggle('ok', reading?.ok === true);
      }
    }
  };
  // The strip and the time widget change height (a wrapped badge): the card moves, so it fits again.
  new ResizeObserver(() => requestAnimationFrame(fit)).observe(top);
  sync(store.getState());
  store.subscribe(sync);
  layout.onChange(() => sync(store.getState()));
}
