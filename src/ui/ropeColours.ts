import { boat } from '../model/boat';
import { SCENE } from '../render3d/sceneConfig';

export type RopeColorKey = keyof typeof SCENE.ropes.colors;

/**
 * The teaching colours of the ropes (PHASE1_SPEC 7.3), each paired with a dash pattern so colour
 * is never the only signal. The Ropes list, the clutch drawing and the stations use the same
 * colours and patterns. Until M38 a "Rope colours" section listed them; the Ropes list shows
 * every rope's colour, so the section is gone (issue #90).
 */
export const ROPE_DASH: Record<RopeColorKey, string> = {
  mainsheet: 'none',
  jibsheet: '9 3',
  control: '2 3',
  furling: '7 3 2 3',
  halyard: '4 4',
};

export function ropeColorKey(ropeId: string): RopeColorKey {
  const key = boat.ropes.list.find((rope) => rope.id === ropeId)?.colorKey;
  if (!key || !(key in SCENE.ropes.colors)) throw new Error(`No rope colour for ${ropeId}.`);
  return key as RopeColorKey;
}
