import type { Action, AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { snapControl, type ControlId } from '../model/controls';
import { overlayOpen } from './chipMenu';
import { isTypingTarget } from './dom';
import type { KeyHelp } from './keyHelp';

/**
 * Keys on a computer (M101, PHASE_FEEDBACK_SPEC 8): ← → steer, W / S the mainsheet, R / F the
 * jib sheet, P the autopilot, H or ? the key list. Every key sends an action a button already
 * sends; A, D, J and L stay the thruster keys (`thrusterPanel.ts`).
 */
export type KeyResult = Action | 'help' | null;

const SHEET_KEYS: Record<string, readonly [ControlId, 1 | -1]> = {
  KeyW: ['ctl_mainsheet', -1],
  KeyS: ['ctl_mainsheet', 1],
  KeyR: ['ctl_jib_sheet', -1],
  KeyF: ['ctl_jib_sheet', 1],
};

/** What a key press does, or null. Pure: reads the state, dispatches nothing. */
export function keyAction(code: string, key: string, shift: boolean, state: AppState): KeyResult {
  const helpKey = code === 'KeyH' || key === '?';
  if (helpKey) return 'help';
  const run = state.exercise;
  // The app is playing an exercise for the learner: no key but the help key acts.
  if (run !== null && run.demo !== null) return null;

  const step = state.settings.step;
  const setControl = (id: ControlId, direction: 1 | -1): Action | null => {
    const value = snapControl(id, state.controls[id] + direction * step, step);
    return value === state.controls[id] ? null : { type: 'setControls', values: { [id]: value } };
  };

  if (code === 'ArrowLeft' || code === 'ArrowRight') {
    // In an exercise the step bar owns ← and →.
    if (run !== null) return null;
    const direction = code === 'ArrowLeft' ? -1 : 1;
    if (state.autopilot.mode !== 'off') {
      const { smallStepDeg, largeStepDeg } = boat.physics.autopilot;
      const deg = shift ? largeStepDeg : smallStepDeg;
      return { type: 'autopilot', command: { turnDeg: direction * deg } };
    }
    return setControl('ctl_rudder', direction);
  }

  const sheet = SHEET_KEYS[code];
  if (sheet) {
    // In Realistic ropes the sheets are worked at the winches.
    if (state.settings.ropesMode !== 'easy') return null;
    return setControl(sheet[0], sheet[1]);
  }

  if (code === 'KeyP') {
    return { type: 'autopilot', command: state.autopilot.mode === 'off' ? 'heading' : 'off' };
  }
  return null;
}

/** A held key acts again after this much real time (milliseconds, tunable). */
const REPEAT_MS = 150;

/** The one `keydown` listener for the keys above; the key list opens and closes with H and ?. */
export function createKeyboard(store: Store, help: KeyHelp): void {
  const lastActed = new Map<string, number>();
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (isTypingTarget(event.target)) return;
    // Another handler (the exercise bar's) used the key.
    if (event.defaultPrevented) return;

    const result = keyAction(event.code, event.key, event.shiftKey, store.getState());
    if (result === null) return;
    if (result === 'help') {
      // Another dialog (the welcome card, the language dialog) keeps the key list shut.
      if (document.querySelector('.welcome-backdrop:not([data-testid="key-help-backdrop"])')) {
        return;
      }
      event.preventDefault();
      if (!event.repeat) help.toggle();
      return;
    }
    if (document.querySelector('.welcome-backdrop') !== null || overlayOpen()) return;
    // A focused tab row, slider, menu or drawing keeps its own arrows.
    if (
      (event.code === 'ArrowLeft' || event.code === 'ArrowRight') &&
      !(event.target === document.body || event.target instanceof HTMLCanvasElement)
    ) {
      return;
    }
    event.preventDefault();
    if (event.repeat) {
      if (event.code === 'KeyP') return;
      const last = lastActed.get(event.code);
      if (last !== undefined && performance.now() - last < REPEAT_MS) return;
    }
    lastActed.set(event.code, performance.now());
    store.dispatch(result);
  });
  document.addEventListener('keyup', (event) => {
    lastActed.delete(event.code);
  });
}
