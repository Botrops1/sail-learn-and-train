import { describe, expect, it } from 'vitest';
import { barRowOf, barRowsFor, isBarRowId } from '../src/app/exerciseBar';
import { dinghyCapsizePilot, pilotActions, pilotFor, type Pilot } from '../src/app/exercisePilots';
import { initialState, reduce, type AppState } from '../src/app/store';
import { DEFAULT_OPTIONS, newRun } from '../src/app/exerciseRun';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { atBoard } from '../src/model/dinghy';
import {
  EXERCISES,
  checkPasses,
  exerciseDef,
  exercisesForBoat,
  type ExerciseCheck,
} from '../src/model/exercises';
import { goodRun, runFrom, withBoatOf } from './harbourPilot';

/**
 * M118 (PHASE_DINGHY_SPEC 12.4): the four dinghy exercises. The browser is not needed for a run:
 * the pilots drive the store as Watch does.
 */
const IDS = ['dinghy-go-stop', 'dinghy-tack', 'dinghy-gybe', 'dinghy-capsize'];

const pilot = (id: string): Pilot => {
  const p = pilotFor(id, 'easy', 'easy');
  if (p === null) throw new Error(`no pilot for ${id}`);
  return p;
};
const started = (id: string): AppState =>
  reduce(parseUrlState(exerciseStartLink(id, initialState(), 'easy')), {
    type: 'exercise',
    command: 'start',
  });
const step = (s: AppState): AppState => reduce(s, { type: 'step', dt: 0.05 });

describe('the dinghy exercises (M118, 12.4)', () => {
  it('1. each pilot completes its exercise without a mistake in under 120 s', () => {
    for (const id of IDS) {
      const result = goodRun(id, 'easy', pilot(id), 120);
      expect(result.status, id).toBe('done');
      expect(result.mistakes, id).toEqual([]);
      expect(
        result.durations.reduce((a, b) => a + b, 0),
        id,
      ).toBeLessThan(120);
    }
  });

  it('2. dinghy-tack: a sailor who stays sitting in after the tack does not pass settle', () => {
    withBoatOf('dinghy-tack', () => {
      const good = pilot('dinghy-tack');
      // The same pilot, but on the new tack he sits in.
      const sitsIn: Pilot = (s, t) => {
        const next = good(s, t);
        return s.exercise?.step === 2
          ? reduce(next, { type: 'dinghy', command: { kind: 'sit', sit: 'in' } })
          : next;
      };
      const result = runFrom(
        started('dinghy-tack'),
        sitsIn,
        (s) => (s.exercise?.step ?? 0) > 2,
        30,
      );
      expect(result.state.exercise?.step).toBe(2);
      expect(result.state.exercise?.status).toBe('running');
      expect(result.state.dinghy.sit).toBe('in');
    });
  });

  it('PT-80 through the tack exercise: she ends on port tack with the sailor on the starboard side', () => {
    withBoatOf('dinghy-tack', () => {
      const result = runFrom(started('dinghy-tack'), pilot('dinghy-tack'), () => false, 60);
      expect(result.state.exercise?.status).toBe('done');
      // Wind over port after the tack: the boom is to starboard, so the sailor sits on port.
      expect(result.state.rig.solution.side).toBe(1);
      expect(result.state.dinghy.sailorSide).toBe(-1);
    });
  });

  it('3. dinghy-capsize: stand before the board is down does not pass; the PT-81 path does', () => {
    withBoatOf('dinghy-capsize', () => {
      let s = started('dinghy-capsize');
      expect(s.dinghy.capsize.phase).toBe('over');
      expect(s.dinghy.boardPct).toBe(0);
      s = reduce(s, { type: 'dinghy', command: { kind: 'capsize', command: 'swim' } });
      let t = 0;
      while (!atBoard(s.dinghy.capsize) && t < 10) {
        s = step(s);
        t += 0.05;
      }
      // Swimming, at the board, the board still up: swim has passed, board has not.
      expect(s.exercise?.step).toBe(1);
      const refused = reduce(s, { type: 'dinghy', command: { kind: 'capsize', command: 'stand' } });
      expect(refused.dinghy.capsize.phase).toBe('swimming');
      const later = step(step(refused));
      expect(later.exercise?.step).toBe(1);
      // The board down, then stand: the run goes on to the last step.
      const down = reduce(later, {
        type: 'dinghy',
        command: { kind: 'capsize', command: 'boardDown' },
      });
      const done = runFrom(
        down,
        dinghyCapsizePilot(),
        (x) => x.dinghy.capsize.phase === 'upright',
        30,
      );
      expect(done.state.exercise?.step).toBe(3);
      expect(done.state.dinghy.capsize.phase).toBe('upright');
    });
  });

  it('4. dinghy-go-stop with the sheet held tight in 16 kn fails with capsized (PT-78)', () => {
    withBoatOf('dinghy-go-stop', () => {
      // A test start: the exercise's own link with 16 kn (the wind of a running exercise cannot
      // be changed), the sheet let out for the two seconds the coach settles, then hauled in and
      // held at 0 %.
      const link = parseUrlState('?boat=dinghy&wd=0&ws=16&hdg=270&ms=100&sp=in&sea=flat');
      let s: AppState = {
        ...link,
        appMode: 'exercise',
        paused: true,
        exercise: newRun('dinghy-go-stop', 0, DEFAULT_OPTIONS),
      };
      s = reduce(s, { type: 'exercise', command: 'start' });
      const holdTight: Pilot = (x, t) =>
        reduce(x, { type: 'setControls', values: { ctl_mainsheet: t < 2 ? 100 : 0 } });
      const result = runFrom(s, holdTight, () => false, 60);
      expect(result.state.exercise?.status).toBe('failed');
      const mistake = result.state.exercise?.log.find((e) => e.kind === 'mistake');
      expect(mistake).toMatchObject({ mistakeId: 'capsized', serious: true });
    });
  });

  it('the gybe finishes with the sheet hauled in to 0, 5 or 10 %, and is accidental from 15 %', () => {
    withBoatOf('dinghy-gybe', () => {
      const good = pilot('dinghy-gybe');
      const withSheet =
        (pct: number): Pilot =>
        (s, t) => {
          const next = good(s, t);
          const step = s.exercise?.step ?? 0;
          return step < 2
            ? reduce(next, { type: 'setControls', values: { ctl_mainsheet: pct } })
            : next;
        };
      for (const pct of [0, 5, 10]) {
        const run = runFrom(started('dinghy-gybe'), withSheet(pct), () => false, 90);
        expect(run.state.exercise?.status, `sheet ${pct} %`).toBe('done');
        expect(run.mistakes, `sheet ${pct} %`).toBe(0);
      }
      const loose = runFrom(started('dinghy-gybe'), withSheet(15), () => false, 90);
      const mistake = loose.state.exercise?.log.find((e) => e.kind === 'mistake');
      expect(mistake).toMatchObject({ mistakeId: 'accidental-gybe' });
    });
  });

  it('5. exercisesForBoat: the four for the dinghy, the 22 for the Hanse 508', () => {
    expect(exercisesForBoat('dinghy').map((e) => e.id)).toEqual(IDS);
    expect(exercisesForBoat('hanse508')).toHaveLength(22);
    expect(EXERCISES).toHaveLength(26);
  });

  it('the dinghy check reads the sit, the board and the capsize phase', () => {
    withBoatOf('dinghy-capsize', () => {
      const s = started('dinghy-capsize');
      const source = { ...s, motion: s.motion ?? ({} as never) };
      const ctx = { events: [], gusts: 0 };
      const pass = (check: ExerciseCheck) => checkPasses(check, source as never, ctx);
      if (s.motion === null) return;
      expect(pass({ dinghy: { capsize: ['over'] } })).toBe(true);
      expect(pass({ dinghy: { capsize: ['upright'] } })).toBe(false);
      expect(pass({ dinghy: { boardPct: [0, 10] } })).toBe(true);
      expect(pass({ dinghy: { boardPct: [50, 100] } })).toBe(false);
      expect(pass({ dinghy: { sit: ['in', 'out'] } })).toBe(true);
      expect(pass({ dinghy: { sit: ['side'] } })).toBe(false);
      // Without a dinghy in the source the check is false.
      expect(
        checkPasses({ dinghy: { sit: ['in'] } }, { ...source, dinghy: undefined } as never, ctx),
      ).toBe(false);
    });
  });

  it('the bar rows are known, and the dinghy actions light them up', () => {
    for (const id of IDS) {
      const def = exerciseDef(id);
      expect(def?.boat, id).toBe('dinghy');
      expect(def?.group, id).toBe('dinghy');
      def?.steps.forEach((_, i) => {
        for (const row of barRowsFor(def, i, 'easy')) expect(isBarRowId(row), row).toBe(true);
      });
    }
    expect(barRowOf({ type: 'dinghy', command: { kind: 'sit', sit: 'out' } })).toEqual([
      'dinghy:sit',
    ]);
    expect(barRowOf({ type: 'dinghy', command: { kind: 'board', pct: 50 } })).toEqual([
      'dinghy:board',
    ]);
    expect(barRowOf({ type: 'dinghy', command: { kind: 'capsize', command: 'swim' } })).toEqual([
      'capsize:steps',
    ]);
    expect(barRowOf({ type: 'dinghy', command: { kind: 'outhaul', pct: 20 } })).toEqual([]);
  });

  it('Watch sees the pilot as commands: swim first in the capsize exercise', () => {
    withBoatOf('dinghy-capsize', () => {
      const actions = pilotActions(pilot('dinghy-capsize'), started('dinghy-capsize'));
      expect(actions).toEqual([{ type: 'dinghy', command: { kind: 'capsize', command: 'swim' } }]);
    });
  });
});
