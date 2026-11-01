import type { Store } from '../app/store';
import { alertTimeText } from '../model/alerts';
import { EXERCISE_SETTINGS, exerciseDef, exerciseText } from '../model/exercises';
import { el } from './dom';
import { currentLanguage, t } from './i18n';

/**
 * The step line over the 3D view (PHASE10_SPEC 6.5): "2/5 · Close reach: …", in the row of its own
 * under the strip and the time bar. Hidden unless a run is going or done. A tap opens the Exercises
 * section.
 */
export function createExerciseLine(top: HTMLElement, store: Store, onOpen: () => void): void {
  const line = el('button', {
    type: 'button',
    class: 'exercise-line',
    'data-testid': 'exercise-line',
    hidden: '',
  });
  line.addEventListener('click', onOpen);
  top.append(line);
  // Owner, PR 148: the hold countdown as a ring that fills with the seconds in it, and a green
  // flash when a step is done (the line and the hint window), so a change of step is easy to see.
  const label = el('span', { class: 'exercise-line-text' });
  const ring = el('span', {
    class: 'exercise-ring',
    'data-testid': 'exercise-ring',
    'aria-hidden': 'true',
    hidden: '',
  });
  line.append(ring, label);
  const flash = (node: Element) => {
    node.classList.remove('exercise-flash');
    void (node as HTMLElement).offsetWidth;
    node.classList.add('exercise-flash');
  };

  let shown = '';
  let lastStep = -1;
  let lastId = '';
  const sync = () => {
    const run = store.getState().exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    if (!run || !def || run.status === 'setup') {
      if (!line.hidden) line.hidden = true;
      shown = '';
      lastStep = -1;
      return;
    }
    const doneNow = run.id === lastId && lastStep >= 0 && run.step > lastStep;
    lastId = run.id;
    lastStep = run.step;
    if (doneNow) flash(line);
    let text: string;
    let kind = '';
    const what = run.mistake
      ? (exerciseText(def.id, currentLanguage()).mistakes[run.mistake.mistakeId]?.what ??
        run.mistake.mistakeId)
      : '';
    if (run.status === 'mistake') {
      text = t('exercise.linePaused', { what });
      kind = 'paused';
    } else if (run.status === 'failed') {
      text = t('exercise.lineStopped', { what });
      kind = 'paused';
    } else if (run.status === 'done') {
      text = t('exercise.lineDone', { time: alertTimeText(run.elapsedS) });
    } else {
      const step = def.steps[run.step];
      if (!step) return;
      const goal = exerciseText(def.id, currentLanguage()).steps[step.id]?.goal ?? step.id;
      text = t('exercise.line', { n: run.step + 1, total: def.steps.length, goal });
      if (run.stepPause && store.getState().paused) {
        text = t('exercise.linePausedStep', { n: run.step });
        kind = 'step-paused';
      }
      // Not pausing: the last mistake shows for a few seconds (PHASE10_SPEC 7.5).
      if (run.mistake && run.elapsedS - run.mistake.atS < EXERCISE_SETTINGS.mistakeShowS) {
        text = t('exercise.lineMistake', { what });
        kind = 'mistake';
      }
    }
    const holding = run.status === 'running' && run.holdS > 0;
    const stepNow = holding ? def.steps[run.step] : undefined;
    if (stepNow && stepNow.holdS > 0) {
      const left = Math.ceil(stepNow.holdS - run.holdS);
      ring.hidden = false;
      ring.style.setProperty(
        '--fill',
        `${Math.min(100, (100 * run.holdS) / stepNow.holdS).toFixed(0)}%`,
      );
      ring.dataset.s = String(left);
    } else if (!ring.hidden) {
      ring.hidden = true;
    }
    line.classList.toggle('exercise-line-mistake', kind === 'mistake');
    line.classList.toggle('exercise-line-step-paused', kind === 'step-paused');
    line.classList.toggle('exercise-line-paused', kind === 'paused');
    if (text !== shown) {
      shown = text;
      label.textContent = text;
    }
    if (line.hidden) line.hidden = false;
  };
  sync();
  store.subscribe(sync);
}
