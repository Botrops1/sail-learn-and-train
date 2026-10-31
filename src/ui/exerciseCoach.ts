import type { AppState, Store } from '../app/store';
import { controlView } from './ropeControls';
import {
  checkTargets,
  exerciseDef,
  exerciseText,
  targetReading,
  type TargetRow,
} from '../model/exercises';
import { el } from './dom';
import { currentLanguage, t } from './i18n';
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
  }
}

/** What the boat shows now for a row ("now 61°"). */
function nowText(row: TargetRow, value: number | string): string {
  if (row.kind === 'twa') return t('exercise.target.nowDeg', { value });
  if (row.kind === 'control') return t('exercise.target.nowPct', { value });
  const word =
    row.kind === 'trim'
      ? t(`trim.state.${String(value)}` as 'trim.state.good')
      : t(`wind.side.${String(value)}` as 'wind.side.port');
  return t('exercise.target.nowWord', { value: word });
}

/**
 * The hint window over the 3D view while an exercise runs (owner, PR 144): the step's How text and
 * what the boat has to show to pass it (the wind angle, the tack, the trim, the sheets), each row
 * ticked live. It stays open while the learner works the other controls; "Hide hint" folds it to
 * one button, and the choice is remembered on this device.
 */
export function createExerciseCoach(top: HTMLElement, store: Store): void {
  let open = readOpen();
  const toggle = el('button', {
    type: 'button',
    class: 'exercise-coach-toggle',
    'data-testid': 'exercise-coach-toggle',
  });
  const how = el('p', { class: 'exercise-coach-how', 'data-testid': 'exercise-coach-how' });
  const heading = el('p', { class: 'exercise-coach-heading' });
  const list = el('ul', {
    class: 'exercise-coach-targets',
    'data-testid': 'exercise-coach-targets',
  });
  const body = el('div', { class: 'exercise-coach-body' }, [how, heading, list]);
  const root = el(
    'section',
    { class: 'exercise-coach', 'data-testid': 'exercise-coach', hidden: '' },
    [toggle, body],
  );
  top.append(root);

  let built = '';
  let rows: { row: TargetRow; item: HTMLElement }[] = [];

  const showOpen = () => {
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    setText(toggle, t(open ? 'exercise.coach.hide' : 'exercise.coach.show'));
  };
  toggle.addEventListener('click', () => {
    open = !open;
    writeOpen(open);
    showOpen();
  });

  const sync = (state: AppState) => {
    const run = state.exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    const step = run && def ? def.steps[run.step] : undefined;
    if (!run || !def || !step || run.status !== 'running') {
      if (!root.hidden) root.hidden = true;
      built = '';
      return;
    }
    if (root.hidden) root.hidden = false;
    const key = `${run.id}|${run.step}|${currentLanguage()}`;
    if (key !== built) {
      built = key;
      const text = exerciseText(def.id, currentLanguage()).steps[step.id];
      setText(how, text?.how ?? '');
      root.setAttribute('aria-label', t('exercise.coach.label'));
      rows = checkTargets(step.check).map((row) => ({ row, item: el('li') }));
      heading.hidden = rows.length === 0;
      setText(heading, t('exercise.coach.targets'));
      list.replaceChildren(...rows.map((entry) => entry.item));
      showOpen();
    }
    if (!open) return;
    for (const { row, item } of rows) {
      const reading = targetReading(row, state);
      const mark = reading?.ok ? '✓' : '○';
      const now = reading ? ` · ${nowText(row, reading.value)}` : '';
      setText(item, `${mark} ${targetText(row)}${now}`);
      item.classList.toggle('ok', reading?.ok === true);
    }
  };
  sync(store.getState());
  store.subscribe(sync);
}
