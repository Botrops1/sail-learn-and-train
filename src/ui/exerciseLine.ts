import type { Store } from '../app/store';
import { alertTimeText } from '../model/alerts';
import { exerciseDef, exerciseText } from '../model/exercises';
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

  let shown = '';
  const sync = () => {
    const run = store.getState().exercise;
    const def = run ? exerciseDef(run.id) : undefined;
    if (!run || !def || run.status === 'setup') {
      if (!line.hidden) line.hidden = true;
      shown = '';
      return;
    }
    let text: string;
    if (run.status === 'done') {
      text = t('exercise.lineDone', { time: alertTimeText(run.elapsedS) });
    } else {
      const step = def.steps[run.step];
      if (!step) return;
      const goal = exerciseText(def.id, currentLanguage()).steps[step.id]?.goal ?? step.id;
      text = t('exercise.line', { n: run.step + 1, total: def.steps.length, goal });
      if (run.holdS > 0 && step.holdS > 0) {
        text += ` ${t('exercise.lineHold', { s: Math.ceil(step.holdS - run.holdS) })}`;
      }
    }
    if (text !== shown) {
      shown = text;
      line.textContent = text;
    }
    if (line.hidden) line.hidden = false;
  };
  sync();
  store.subscribe(sync);
}
