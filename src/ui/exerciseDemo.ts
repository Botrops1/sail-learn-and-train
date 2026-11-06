import { barRowOf, type BarRowId } from '../app/exerciseBar';
import { pilotActions, pilotFor, type Pilot } from '../app/exercisePilots';
import type { Action, AppState, Store } from '../app/store';

/**
 * Watch and Show me (M81, PHASE10_PHONE_SPEC 8.5): the app plays the exercise by dispatching what
 * a learner could. The pilot is a closure, so it lives here, never in `AppState`; `app.ts` calls
 * `frame()` before each 0.05 s part of a frame while `run.demo` is set.
 */
export interface ExerciseDemo {
  /** Called by app.ts before each 0.05 s part of a frame while run.demo !== null. */
  frame(): void;
  /** The rows each dispatched demo batch worked (barRowOf of its actions), for the bar's flash. */
  onActions(cb: (rows: BarRowId[]) => void): void;
}

/** One `demo` batch that lets go of every hold the pilot may have left (thrusters, windlass, winch button). */
function releases(state: AppState): Action[] {
  const out: Action[] = [];
  for (const which of ['bow', 'stern'] as const) {
    if (state.thrusters[which] !== 0) out.push({ type: 'thruster', which, dir: 0 });
  }
  if (state.anchor.windlass !== 'off') out.push({ type: 'windlass', motion: 'off' });
  // M82: a Realistic winch button the pilot was holding.
  for (const [winch, winchState] of Object.entries(state.realistic.winches)) {
    if (winchState.button) {
      out.push({ type: 'realistic', action: { type: 'button', winch, held: false } });
    }
  }
  return out;
}

export function createExerciseDemo(store: Store): ExerciseDemo {
  let pilot: Pilot | null = null;
  const listeners: Array<(rows: BarRowId[]) => void> = [];

  store.subscribe((state) => {
    const run = state.exercise;
    const demo = run?.demo ?? null;
    const alive = run !== null && (run.status === 'running' || run.status === 'mistake');
    if (run !== null && demo !== null && alive) {
      if (pilot === null) pilot = pilotFor(run.id, run.options.level, state.settings.ropesMode);
      return;
    }
    if (pilot !== null) {
      // The demo ended (or the run did): let go of whatever the pilot was holding.
      pilot = null;
      const actions = releases(state);
      if (actions.length > 0) store.dispatch({ type: 'demo', actions });
    }
  });

  return {
    frame() {
      const state = store.getState();
      const run = state.exercise;
      if (pilot === null || run === null || run.status !== 'running' || state.paused) return;
      if (run.demo !== 'watch' && !(run.demo === 'showMe' && run.step === run.demoStep)) return;
      const actions = pilotActions(pilot, state);
      if (actions.length === 0) return;
      store.dispatch({ type: 'demo', actions });
      const rows = [...new Set(actions.flatMap((a) => barRowOf(a)))];
      for (const cb of listeners) cb(rows);
    },
    onActions(cb) {
      listeners.push(cb);
    },
  };
}
