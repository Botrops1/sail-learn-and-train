import { recordDone, readProgress } from '../app/exerciseProgress';
import type { ExerciseRun, ExerciseWaypoint } from '../app/exerciseRun';
import { exerciseStartLink, parseUrlState, waypointLink } from '../app/urlState';
import type { AppState, Store } from '../app/store';
import { alertTimeText } from '../model/alerts';
import {
  EXERCISES,
  EXERCISE_SETTINGS,
  exerciseDef,
  exerciseText,
  type ExerciseDef,
  type ExerciseGroup,
} from '../model/exercises';
import { el } from './dom';
import { createDebrief, type DebriefView } from './exerciseDebrief';
import { currentLanguage, t } from './i18n';
import {
  SECTION_IDS,
  SECTION_TITLES,
  sectionAvailable,
  type LayoutKind,
  type SectionId,
} from './modes';
import type { Sheet } from './sheet';
import { createConfirmButton } from './settingsMenu';

const GROUPS: readonly ExerciseGroup[] = ['sailing', 'wind', 'sails'];

/** Whole seconds left of a step's hold (PHASE10_SPEC 6.5). */
export function holdLeftS(run: ExerciseRun, holdS: number): number {
  return Math.ceil(holdS - run.holdS);
}

function groupTitle(group: ExerciseGroup): string {
  // Only the groups that have exercises are shown, so only their strings need to exist.
  return t(`exercise.group.${group}` as 'exercise.group.sailing');
}

/** The load of a link (a start link, or a waypoint link for Try again from a waypoint run). */
function loadLink(store: Store, link: string): void {
  store.dispatch({
    type: 'load',
    state: parseUrlState(link, store.getState().settings.detail),
  });
}

/** A fresh run of the same exercise (PHASE10_SPEC 7.3): from the start, or from the run's first waypoint. */
export function restartLink(state: AppState): string | null {
  const run = state.exercise;
  if (!run) return null;
  const first = run.waypoints[0];
  if (run.startStep > 0 && first) return waypointLink(state, first);
  return exerciseStartLink(run.id, state, state.settings.ropesMode);
}

/** True while the last mistake still shows in the line (the box "Pause" is unticked). */
export function lastMistakeShown(run: ExerciseRun): boolean {
  return (
    run.status === 'running' &&
    run.mistake !== null &&
    run.elapsedS - run.mistake.atS < EXERCISE_SETTINGS.mistakeShowS
  );
}

/** The load that opens an exercise's setup card (PHASE10_SPEC 4.2). */
export function loadExercise(store: Store, id: string, ropes: ExerciseDef['ropes']): void {
  const state = store.getState();
  store.dispatch({
    type: 'load',
    state: parseUrlState(exerciseStartLink(id, state, ropes), state.settings.detail),
  });
}

/**
 * The Exercises section (PHASE10_SPEC 6.5): the list, the setup card, the step card and the done
 * card. Re-rendered only when the render key changes, not every frame.
 */
export function createExercisePanel(
  store: Store,
  panel: { showSection(id: SectionId): void },
  layout: () => LayoutKind,
  sheet: Sheet,
): HTMLElement[] {
  const root = el('div', { class: 'exercise-panel', 'data-testid': 'exercise-panel' });
  let key = '';
  /** "So far" is open, and the debrief's "Show my actions" switch (view states, not in the store). */
  let soFarOpen = false;
  const debriefView: DebriefView = { showActions: false };

  const keyOf = (state: AppState): string => {
    const run = state.exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    const step = run && def ? def.steps[run.step] : undefined;
    const left = run && step && run.holdS > 0 ? holdLeftS(run, step.holdS) : 0;
    const shown = run ? lastMistakeShown(run) : false;
    const debrief = run && (run.status === 'done' || run.status === 'failed' || soFarOpen);
    return `${run?.id}|${debrief ? run?.log.length : ''}|${soFarOpen}|${run?.status}|${run?.step}|${left}|${state.settings.ropesMode}|${currentLanguage()}|${run?.waypoints.length}|${run?.mistake?.atS}|${run?.options.pauseOnMistake}|${run?.options.pauseOnStep}|${shown}`;
  };

  function renderList(): void {
    const progress = readProgress();
    for (const group of GROUPS) {
      const inGroup = EXERCISES.filter((exercise) => exercise.group === group);
      if (inGroup.length === 0) continue;
      root.append(el('h3', { class: 'section-title' }, [groupTitle(group)]));
      for (const def of inGroup) {
        const text = exerciseText(def.id, currentLanguage());
        const done = progress.done[def.id];
        const item = el(
          'button',
          { type: 'button', class: 'exercise-item', 'data-testid': `exercise-item-${def.id}` },
          [
            el('strong', { class: 'exercise-item-title' }, [text.title]),
            el('span', { class: 'hint' }, [text.summary]),
          ],
        );
        if (done) {
          item.append(
            el('span', { class: 'exercise-tick', 'data-testid': `exercise-tick-${def.id}` }, [
              t('exercise.doneBest', { time: alertTimeText(done.bestS) }),
            ]),
          );
        }
        item.addEventListener('click', () => loadExercise(store, def.id, def.ropes));
        root.append(item);
      }
    }
  }

  function stepsList(def: ExerciseDef, run: ExerciseRun | null): HTMLElement {
    const text = exerciseText(def.id, currentLanguage());
    const list = el('ol', { class: 'exercise-steps' });
    def.steps.forEach((step, index) => {
      const done = run !== null && index < run.step;
      const current = run !== null && run.status === 'running' && index === run.step;
      const goal = text.steps[step.id]?.goal ?? step.id;
      const item = el(
        'li',
        { class: [done ? 'done' : '', current ? 'current' : ''].join(' ').trim() },
        [done ? `✓ ${goal}` : goal],
      );
      list.append(item);
    });
    return list;
  }

  function listButton(): HTMLButtonElement {
    const button = el(
      'button',
      { type: 'button', class: 'exercise-button', 'data-testid': 'exercise-list' },
      [t('exercise.list')],
    );
    button.addEventListener('click', () => store.dispatch({ type: 'exercise', command: 'stop' }));
    return button;
  }

  /** Owner, PR 144: which sections the exercise hides and what it sets for you. */
  function sectionNotes(def: ExerciseDef): HTMLElement {
    const hidden = SECTION_IDS.filter(
      (id) =>
        id !== 'mode' &&
        id !== 'exercises' &&
        id !== 'settings' &&
        !(def.sections as readonly string[]).includes(id),
    ).map((id) => t(SECTION_TITLES[id]));
    return el('div', { class: 'exercise-sections' }, [
      el('p', { class: 'hint', 'data-testid': 'exercise-sections-locked' }, [
        t('exercise.sections.locked'),
      ]),
      ...(hidden.length > 0
        ? [
            el('p', { class: 'hint', 'data-testid': 'exercise-sections-hidden' }, [
              t('exercise.sections.hidden', { list: hidden.join(', ') }),
            ]),
          ]
        : []),
    ]);
  }

  function renderSetup(def: ExerciseDef, run: ExerciseRun, state: AppState): void {
    const text = exerciseText(def.id, currentLanguage());
    const card = el('div', { class: 'exercise-card', 'data-testid': 'exercise-setup' }, [
      el('h3', {}, [text.title]),
    ]);
    const parts: [string, string][] = [
      [t('exercise.see'), text.see],
      [t('exercise.happening'), text.happening],
      [t('exercise.action'), text.action],
      [t('exercise.mistake'), text.mistake],
    ];
    for (const [heading, body] of parts) {
      card.append(el('h4', {}, [heading]), el('p', {}, [body]));
    }
    const ropes = el('div', { class: 'exercise-ropes' }, [el('h4', {}, [t('exercise.ropes')])]);
    const choices = el('div', { class: 'exercise-ropes-choices' });
    for (const mode of ['easy', 'realistic'] as const) {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'exercise-button',
          'aria-pressed': String(state.settings.ropesMode === mode),
          'data-testid': `exercise-ropes-${mode}`,
        },
        [t(`mode.${mode}`)],
      );
      button.addEventListener('click', () =>
        store.dispatch({ type: 'exercise', command: { ropes: mode } }),
      );
      choices.append(button);
    }
    ropes.append(choices, el('p', { class: 'hint' }, [t('exercise.ropes.hint')]));
    card.append(ropes, el('h4', {}, [t('exercise.steps')]), stepsList(def, run), sectionNotes(def));
    const box = el('input', {
      type: 'checkbox',
      'data-testid': 'exercise-pause-on-mistake',
    }) as HTMLInputElement;
    box.checked = run.options.pauseOnMistake;
    box.addEventListener('change', () =>
      store.dispatch({ type: 'exercise', command: { options: { pauseOnMistake: box.checked } } }),
    );
    const stepBox = el('input', {
      type: 'checkbox',
      'data-testid': 'exercise-pause-on-step',
    }) as HTMLInputElement;
    stepBox.checked = run.options.pauseOnStep;
    stepBox.addEventListener('change', () =>
      store.dispatch({ type: 'exercise', command: { options: { pauseOnStep: stepBox.checked } } }),
    );
    card.append(
      el('label', { class: 'exercise-check' }, [
        box,
        el('span', {}, [t('exercise.pauseOnMistake')]),
      ]),
      el('p', { class: 'hint' }, [t('exercise.pauseHint')]),
      el('label', { class: 'exercise-check' }, [
        stepBox,
        el('span', {}, [t('exercise.pauseOnStep')]),
      ]),
      el('p', { class: 'hint' }, [t('exercise.pauseOnStepHint')]),
      el('p', { class: 'hint', 'data-testid': 'exercise-mistake-list' }, [
        t('exercise.pauseList', {
          list: def.mistakes.map((m) => text.mistakes[m.id]?.name ?? m.id).join(', '),
        }),
      ]),
    );
    if (run.startStep > 0) {
      card.append(
        el('p', { 'data-testid': 'exercise-from-step' }, [
          t('exercise.fromStep', { n: run.startStep + 1 }),
        ]),
      );
    }
    const start = el(
      'button',
      { type: 'button', class: 'exercise-start', 'data-testid': 'exercise-start' },
      [t('exercise.start')],
    );
    start.addEventListener('click', () => {
      store.dispatch({ type: 'exercise', command: 'start' });
      // On a phone the sheet goes down so the boat shows.
      if (layout() === 'stacked') sheet.setHeight('peek');
    });
    card.append(el('div', { class: 'exercise-buttons' }, [start, listButton()]));
    root.append(card);
  }

  /** The name of a waypoint's row (PHASE10_SPEC 7.5). */
  function waypointName(run: ExerciseRun, wp: ExerciseWaypoint): string {
    return wp.step === 0 && run.startStep === 0
      ? t('exercise.waypointStart')
      : t('exercise.waypointStep', { n: wp.step + 1 });
  }

  /** The waypoints, newest first, each with Go back and a link to copy. */
  function waypointsBlock(run: ExerciseRun, state: AppState): HTMLElement {
    const block = el('div', { class: 'exercise-waypoints', 'data-testid': 'exercise-waypoints' }, [
      el('h4', {}, [t('exercise.waypoints')]),
    ]);
    for (const wp of [...run.waypoints].reverse()) {
      const name = waypointName(run, wp);
      const back = el(
        'button',
        {
          type: 'button',
          class: 'exercise-button',
          'aria-label': t('exercise.waypointBackTo', { name }),
          'data-testid': `exercise-waypoint-back-${wp.step}`,
        },
        [t('exercise.waypointBack')],
      );
      back.addEventListener('click', () =>
        store.dispatch({ type: 'exercise', command: { back: wp.step } }),
      );
      const link = el(
        'a',
        {
          class: 'exercise-button exercise-link',
          'aria-label': t('exercise.waypointLinkTo', { name }),
          href: location.origin + location.pathname + waypointLink(state, wp),
          'data-testid': `exercise-waypoint-link-${wp.step}`,
        },
        [t('exercise.waypointLink')],
      );
      block.append(el('div', { class: 'exercise-waypoint' }, [el('span', {}, [name]), back, link]));
    }
    return block;
  }

  /** The "So far" button and, when open, the debrief up to now (PHASE10_SPEC 8.4). */
  function soFarBlock(def: ExerciseDef, run: ExerciseRun): HTMLElement[] {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'exercise-button',
        'aria-expanded': String(soFarOpen),
        'data-testid': 'exercise-so-far',
      },
      [t('exercise.soFar')],
    );
    button.addEventListener('click', () => {
      soFarOpen = !soFarOpen;
      render(store.getState(), true);
    });
    return soFarOpen ? [button, createDebrief(run, def, debriefView)] : [button];
  }

  /** The red/orange card of a mistake that stopped time, or of a serious one that stopped the run. */
  function renderMistake(def: ExerciseDef, run: ExerciseRun, state: AppState): void {
    const mistake = run.mistake;
    if (!mistake) return;
    const failed = run.status === 'failed';
    const m = exerciseText(def.id, currentLanguage()).mistakes[mistake.mistakeId];
    const last = run.waypoints[run.waypoints.length - 1];
    const back = el(
      'button',
      { type: 'button', class: 'exercise-button', 'data-testid': 'exercise-back' },
      [
        last && last.step === 0 && run.startStep === 0
          ? t('exercise.backToStart')
          : t('exercise.backTo', { n: (last?.step ?? 0) + 1 }),
      ],
    );
    back.addEventListener('click', () =>
      store.dispatch({ type: 'exercise', command: { back: last?.step ?? 0 } }),
    );
    const card = el(
      'div',
      {
        class: `exercise-card exercise-mistake${failed ? ' exercise-failed' : ''}`,
        'data-testid': failed ? 'exercise-failed' : 'exercise-mistake',
      },
      [
        el('h3', {}, [failed ? t('exercise.stopped') : t('exercise.wentWrong')]),
        el('p', {}, [m?.what ?? mistake.mistakeId]),
        el('h4', {}, [t('exercise.why')]),
        el('p', {}, [m?.why ?? '']),
        el('h4', {}, [t('exercise.fix')]),
        el('p', {}, [m?.fix ?? '']),
      ],
    );
    const buttons = el('div', { class: 'exercise-buttons' });
    if (failed) {
      const again = el(
        'button',
        { type: 'button', class: 'exercise-start', 'data-testid': 'exercise-restart' },
        [t('exercise.restart')],
      );
      again.addEventListener('click', () => {
        const link = restartLink(store.getState());
        if (link) loadLink(store, link);
      });
      buttons.append(back, again, listButton());
    } else {
      const go = el(
        'button',
        { type: 'button', class: 'exercise-start', 'data-testid': 'exercise-continue' },
        [t('exercise.continue')],
      );
      go.addEventListener('click', () => store.dispatch({ type: 'exercise', command: 'continue' }));
      buttons.append(go, back);
    }
    card.append(buttons);
    if (failed) card.append(createDebrief(run, def, debriefView));
    else card.append(...soFarBlock(def, run));
    root.append(card);
    if (failed) root.append(waypointsBlock(run, state));
  }

  function renderRunning(def: ExerciseDef, run: ExerciseRun, state: AppState): void {
    const text = exerciseText(def.id, currentLanguage());
    const step = def.steps[run.step];
    if (!step) return;
    if (run.status === 'mistake') renderMistake(def, run, state);
    const card = el('div', { class: 'exercise-card', 'data-testid': 'exercise-step' }, [
      el('p', { class: 'hint' }, [
        t('exercise.stepOf', { n: run.step + 1, total: def.steps.length }),
      ]),
      el('h3', {}, [text.steps[step.id]?.goal ?? step.id]),
    ]);
    if (run.holdS > 0 && step.holdS > 0) {
      card.append(
        el('p', { 'data-testid': 'exercise-hold' }, [
          t('exercise.hold', { s: holdLeftS(run, step.holdS) }),
        ]),
      );
    }
    const how = el(
      'button',
      {
        type: 'button',
        class: 'exercise-button',
        'aria-expanded': String(howOpen),
        'data-testid': 'exercise-how',
      },
      [t('exercise.how')],
    );
    card.append(how);
    if (howOpen) {
      const open = el(
        'button',
        { type: 'button', class: 'exercise-button', 'data-testid': 'exercise-open' },
        [t('exercise.open')],
      );
      open.addEventListener('click', () => {
        let section: SectionId = step.opens;
        // In Realistic ropes the autopilot and the engine live in the Helm section.
        if (
          (section === 'engine' || section === 'autopilot') &&
          !sectionAvailable(section, store.getState(), layout())
        ) {
          section = 'helm';
        }
        panel.showSection(section);
      });
      card.append(
        el('p', { 'data-testid': 'exercise-how-text' }, [text.steps[step.id]?.how ?? '']),
        open,
      );
    }
    how.addEventListener('click', () => {
      howOpen = !howOpen;
      render(store.getState(), true);
    });
    if (lastMistakeShown(run) && run.mistake) {
      const m = text.mistakes[run.mistake.mistakeId];
      const why = el(
        'button',
        {
          type: 'button',
          class: 'exercise-button',
          'aria-expanded': String(whyOpen),
          'data-testid': 'exercise-last-why',
        },
        [t('exercise.lastWhy')],
      );
      why.addEventListener('click', () => {
        whyOpen = !whyOpen;
        render(store.getState(), true);
      });
      card.append(
        el('p', { 'data-testid': 'exercise-last-mistake' }, [
          t('exercise.lastMistake', { what: m?.what ?? run.mistake.mistakeId }),
        ]),
        why,
      );
      if (whyOpen) {
        card.append(
          el('p', { 'data-testid': 'exercise-last-why-text' }, [
            `${m?.why ?? ''} ${m?.fix ?? ''}`.trim(),
          ]),
        );
      }
    }
    if (run.status === 'running') card.append(...soFarBlock(def, run));
    card.append(stepsList(def, run));
    const stop = el(
      'button',
      { type: 'button', class: 'exercise-button', 'data-testid': 'exercise-stop' },
      [t('exercise.stop')],
    );
    createConfirmButton(
      stop,
      { idle: t('exercise.stop'), confirm: t('exercise.stopConfirm') },
      () => store.dispatch({ type: 'exercise', command: 'stop' }),
    );
    card.append(stop);
    root.append(card, waypointsBlock(run, state));
  }

  function renderDone(def: ExerciseDef, run: ExerciseRun, state: AppState): void {
    const text = exerciseText(def.id, currentLanguage());
    const again = el(
      'button',
      { type: 'button', class: 'exercise-start', 'data-testid': 'exercise-again' },
      [t('exercise.again')],
    );
    again.addEventListener('click', () => {
      const link = restartLink(store.getState());
      if (link) loadLink(store, link);
    });
    root.append(
      el('div', { class: 'exercise-card', 'data-testid': 'exercise-done' }, [
        el('h3', {}, [t('exercise.finished')]),
        el('p', {}, [t('exercise.time', { time: alertTimeText(run.elapsedS) })]),
        el('p', {}, [text.done]),
        el('div', { class: 'exercise-buttons' }, [again, listButton()]),
        createDebrief(run, def, debriefView),
      ]),
      waypointsBlock(run, state),
    );
  }

  /** The How? text is open (a view state, not in the store); closed again at every new step. */
  let howOpen = false;
  let howStep = -1;
  /** The Why? text of the last mistake is open; closed again at every new step. */
  let whyOpen = false;

  function render(state: AppState, force = false): void {
    const next = keyOf(state);
    if (!force && next === key) return;
    key = next;
    root.replaceChildren();
    const run = state.exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    if (run && def && run.step !== howStep) {
      howStep = run.step;
      howOpen = false;
      whyOpen = false;
    }
    if (!run || run.status === 'setup') {
      soFarOpen = false;
      debriefView.showActions = false;
    }
    if (!run || !def) renderList();
    else if (run.status === 'setup') renderSetup(def, run, state);
    else if (run.status === 'done') renderDone(def, run, state);
    else if (run.status === 'failed') renderMistake(def, run, state);
    else renderRunning(def, run, state);
  }

  render(store.getState(), true);
  store.subscribe((state, previous) => {
    // The tick is written once, when the run turns done.
    // A run from a waypoint link did not do every step: it leaves no tick (PHASE10_SPEC 7.3).
    if (
      state.exercise?.status === 'done' &&
      previous.exercise?.status !== 'done' &&
      state.exercise.startStep === 0
    ) {
      recordDone(state.exercise.id, state.exercise.elapsedS);
    }
    render(state);
  });
  return [root];
}
