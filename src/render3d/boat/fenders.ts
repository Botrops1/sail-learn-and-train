import * as THREE from 'three';
import { boat } from '../../model/boat';
import { ballFenderPlace, fenderPlaces } from '../../model/mooringFittings';
import type { Detail } from '../../model/settings';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { asThin, cylinderBetween, partMesh } from './parts';

/** Ring radius and tube radius of the eye a fender's line is tied to, metres (PHASE6_SPEC 9.5). */
const EYE_RADIUS = 0.02;
const EYE_TUBE = 0.006;

export interface Fenders {
  objects: THREE.Object3D[];
  /** Shows the fenders hanging over the side (true) or hides them: they are in the locker. */
  setOut(out: boolean): void;
}

/**
 * Eight fenders and the ball fender (M33, PHASE6_SPEC 9.5). Static, and hidden until `setOut(true)`:
 * a hidden mesh is neither drawn nor found by a tap (picking skips invisible objects).
 */
export function buildFenders(materials: BoatMaterials, detail: Detail = 'high'): Fenders {
  const high = detail === 'high';
  const f = boat.deckFittings.fenders;
  const radial = high ? 10 : 6;
  const eyeTube = high ? 4 : 3;
  const lathe = high ? 24 : 12;

  /** An eye at `at`, in the x–y plane. */
  const eye = (at: Vec3): THREE.BufferGeometry =>
    new THREE.TorusGeometry(EYE_RADIUS, EYE_TUBE, eyeTube, radial).translate(...at);

  // `profile` is [radius, distance down]; a lathe wants (radius, height) from bottom to top.
  const profile = f.profile.map(([r = 0, down = 0]) => new THREE.Vector2(r, -down)).reverse();
  const places = fenderPlaces();
  const bodies = places.map((p) => new THREE.LatheGeometry(profile, lathe).translate(...p.top));
  const lines = places.flatMap((p) => [
    eye([p.top[0], p.top[1] + EYE_RADIUS, p.top[2]]),
    cylinderBetween(
      [p.top[0], p.top[1] + 2 * EYE_RADIUS, p.top[2]],
      p.lineEnd,
      f.lineRadius,
      radial,
    ),
  ]);

  const ball = ballFenderPlace();
  const r = boat.deckFittings.ballFender.diameter / 2;
  const ballBody = new THREE.SphereGeometry(r, high ? 16 : 10, high ? 12 : 8).translate(
    ...ball.centre,
  );
  const ballLine = [
    eye([ball.centre[0], ball.centre[1] + r + EYE_RADIUS, ball.centre[2]]),
    cylinderBetween(
      [ball.centre[0], ball.centre[1] + r + 2 * EYE_RADIUS, ball.centre[2]],
      ball.lineEnd,
      f.lineRadius,
      radial,
    ),
  ];

  const objects = [
    partMesh('fit_fender', bodies, materials.fender),
    asThin(partMesh('fit_fender', lines, materials.fenderLine)),
    partMesh('fit_fender_ball', [ballBody], materials.fender),
    asThin(partMesh('fit_fender_ball', ballLine, materials.fenderLine)),
  ];
  const setOut = (out: boolean) => {
    for (const object of objects) object.visible = out;
  };
  setOut(false);
  return { objects, setOut };
}
