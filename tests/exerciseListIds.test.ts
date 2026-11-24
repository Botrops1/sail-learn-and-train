import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXERCISE_GROUP_ORDER, exerciseItemTestIds } from '../scripts/ui.mjs';
import { EXERCISES } from '../src/model/exercises';

describe('exerciseItemTestIds (the list the browser checks expect)', () => {
  it('uses the panel group order', () => {
    const source = readFileSync('src/ui/exercisePanel.ts', 'utf8');
    const match = /const GROUPS[^=]*=\s*\[([^\]]*)\]/.exec(source);
    expect(match).not.toBeNull();
    const panelOrder = [...(match?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(EXERCISE_GROUP_ORDER).toEqual(panelOrder);
  });

  it('names every exercise of a boat once, grouped as the panel lists them', () => {
    for (const boat of ['hanse508', 'dinghy']) {
      const own = EXERCISES.filter((exercise) => (exercise.boat ?? 'hanse508') === boat);
      const ids = exerciseItemTestIds(boat);
      expect(ids, boat).toHaveLength(own.length);
      expect(new Set(ids).size).toBe(ids.length);
      const expected = EXERCISE_GROUP_ORDER.flatMap((group) =>
        own
          .filter((exercise) => exercise.group === group)
          .map((exercise) => `exercise-item-${exercise.id}`),
      );
      expect(ids, boat).toEqual(expected);
    }
    // The Hanse's list is the default and never holds a dinghy exercise (M118).
    expect(exerciseItemTestIds()).toEqual(exerciseItemTestIds('hanse508'));
    expect(exerciseItemTestIds()).toHaveLength(22);
    expect(exerciseItemTestIds('dinghy')).toHaveLength(4);
  });
});
