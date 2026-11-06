import { demoCardKind } from '../app/exerciseBar';
import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * The Resume button over the 3D view (owner, PR 152): when the coach has stopped time, because of
 * a mistake ("Carry on") or because a step is done and "Pause after each step" is on ("Resume"),
 * the learner can go on from here, without opening the Exercises section. On a phone that section
 * is under the sheet, so the button saves a trip there. Hidden at every other time. It does the
 * same as the buttons in the panel: `continue` for a mistake, `setPaused` for a done step.
 */
export function createExerciseResume(view: HTMLElement, store: Store): void {
  const button = el('button', {
    type: 'button',
    class: 'exercise-resume',
    'data-testid': 'exercise-resume',
    hidden: '',
  });
  view.append(button);
  let kind: 'mistake' | 'step' | null = null;
  button.addEventListener('click', () => {
    if (kind === 'mistake') store.dispatch({ type: 'exercise', command: 'continue' });
    else if (kind === 'step') store.dispatch({ type: 'setPaused', paused: false });
  });
  const sync = () => {
    const state = store.getState();
    const run = state.exercise;
    let next: typeof kind = null;
    if (run?.status === 'mistake') next = 'mistake';
    else if (run?.status === 'running' && run.stepPause && state.paused) next = 'step';
    // A demo card (M81) has its own Next step button: no second button over the 3D view.
    if (demoCardKind(state) !== null) next = null;
    if (next === kind) return;
    kind = next;
    button.hidden = next === null;
    if (next !== null)
      button.textContent = next === 'mistake' ? t('exercise.continue') : t('pause.resume');
  };
  sync();
  store.subscribe(sync);
}
