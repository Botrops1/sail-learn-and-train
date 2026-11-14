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

  it('names every exercise once, grouped as the panel lists them', () => {
    const ids = exerciseItemTestIds();
    expect(ids).toHaveLength(EXERCISES.length);
    expect(new Set(ids).size).toBe(ids.length);
    const expected = EXERCISE_GROUP_ORDER.flatMap((group) =>
      EXERCISES.filter((exercise) => exercise.group === group).map(
        (exercise) => `exercise-item-${exercise.id}`,
      ),
    );
    expect(ids).toEqual(expected);
  });
});
