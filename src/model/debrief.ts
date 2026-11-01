import { EXERCISE_SETTINGS, type ExerciseLogEntry, type ExerciseSettings } from './exercises';

/**
 * The debrief (PHASE10_SPEC 8.3): the run's log as rows, with the learner's actions just before
 * each mistake. Pure.
 */
export interface DebriefRow {
  entry: ExerciseLogEntry;
  /** For a mistake: the learner's actions in the causeWindowS seconds before it (at most causeMax, oldest first). */
  causes: readonly Extract<ExerciseLogEntry, { kind: 'action' }>[];
}

export function debriefRows(
  log: readonly ExerciseLogEntry[],
  settings: ExerciseSettings = EXERCISE_SETTINGS,
): DebriefRow[] {
  return log.map((entry) => {
    if (entry.kind !== 'mistake') return { entry, causes: [] };
    const causes = log
      .filter(
        (e): e is Extract<ExerciseLogEntry, { kind: 'action' }> =>
          e.kind === 'action' && e.atS >= entry.atS - settings.causeWindowS && e.atS <= entry.atS,
      )
      .slice(-settings.causeMax);
    return { entry, causes };
  });
}

export interface DebriefSummary {
  timeS: number;
  stepsDone: number;
  total: number;
  mistakes: number;
}

/** `timeS` is the finish time, or the run's clock now when it has not finished. */
export function debriefSummary(
  log: readonly ExerciseLogEntry[],
  total: number,
  elapsedS: number,
): DebriefSummary {
  const finish = log.find((e) => e.kind === 'finish');
  const steps = new Set<number>();
  let mistakes = 0;
  for (const entry of log) {
    if (entry.kind === 'step') steps.add(entry.step);
    if (entry.kind === 'mistake') mistakes += 1;
  }
  return { timeS: finish ? finish.atS : elapsedS, stepsDone: steps.size, total, mistakes };
}
