import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { defaultControls } from '../src/model/controls';
import type { CameraPreset } from '../src/model/settings';
import { initialRig } from '../src/model/sim';
import { buildBoat } from '../src/render3d/boat';
import { presetPose } from '../src/render3d/cameraPresets';
import { createPicker } from '../src/render3d/picking';
import { SCENE } from '../src/render3d/sceneConfig';

/** Small fittings with an enlarged hit area, by the side of the boat they are on. */
const CENTRELINE = [
  'part_gooseneck',
  'part_main_furling_gearbox',
  'fit_self_tacking_car',
  'fit_mainsheet_boom_blocks',
  'fit_mainsheet_deck_blocks',
  'fit_mast_base_turning_blocks',
  'part_jib_furler',
];
const PORT = ['clutch_bank_b', 'clutch_jib_roll', 'winch_primary_port'];
const STARBOARD = ['clutch_bank_a', 'winch_primary_starboard'];

const VIEWS: { preset: CameraPreset; expected: string[] }[] = [
  { preset: 'side-port', expected: [...CENTRELINE, ...PORT] },
  { preset: 'side-starboard', expected: [...CENTRELINE, ...STARBOARD] },
  { preset: 'top', expected: [...CENTRELINE, ...PORT, ...STARBOARD] },
];
const SCREENS = [
  { name: 'phone 3D view', width: 390, height: 380, topBowUp: true },
  { name: 'foldable 3D view', width: 500, height: 940, topBowUp: false },
  { name: 'desktop 3D view', width: 1008, height: 840, topBowUp: false },
];

describe('tap-to-identify: small fittings', () => {
  const model = buildBoat();
  const water = new THREE.Group();

  it('hit areas are at least about a fingertip (44 px) across', () => {
    expect(2 * SCENE.picking.smallPartRadiusPx).toBeGreaterThanOrEqual(44);
  });

  for (const screen of SCREENS) {
    for (const view of VIEWS) {
      it(`${screen.name}, ${view.preset}: a tap on each small fitting finds it`, () => {
        const lens = {
          verticalFovDeg: SCENE.camera.verticalFovDeg,
          aspect: screen.width / screen.height,
        };
        const pose = presetPose(view.preset, lens, { topBowUp: screen.topBowUp });
        const camera = new THREE.PerspectiveCamera(pose.fovDeg, lens.aspect, 0.1, 1000);
        camera.position.set(...pose.position);
        camera.lookAt(...pose.target);
        camera.updateMatrixWorld();
        const picker = createPicker(camera, model.root, water);
        const centres = picker.hitCentres(screen.width, screen.height);
        for (const id of view.expected) {
          const found = centres
            .filter((c) => c.partId === id)
            .some((c) => picker.pick(c.x, c.y, screen.width, screen.height) === id);
          expect(found, id).toBe(true);
        }
      });
    }
  }

  it('an isolated small fitting still responds to a tap 20 px away (phone, side view)', () => {
    // Wind from port: the jib swings to starboard, away from the camera, so nothing covers the
    // furler drum (with the default wind the jib's foot lies in front of it from the port side).
    const fromPort = { ...defaultControls(), ctl_wind_dir: -60 };
    const clear = buildBoat(fromPort, initialRig(fromPort));
    const screen = SCREENS[0] ?? { width: 390, height: 380 };
    const lens = {
      verticalFovDeg: SCENE.camera.verticalFovDeg,
      aspect: screen.width / screen.height,
    };
    const pose = presetPose('side-port', lens);
    const camera = new THREE.PerspectiveCamera(pose.fovDeg, lens.aspect, 0.1, 1000);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const picker = createPicker(camera, clear.root, water);
    const furler = picker
      .hitCentres(screen.width, screen.height)
      .find((c) => c.partId === 'part_jib_furler');
    expect(furler).toBeDefined();
    for (const [dx, dy] of [
      [20, 0],
      [0, -20],
      [-14, 14],
    ] as const) {
      const x = (furler?.x ?? 0) + dx;
      const y = (furler?.y ?? 0) + dy;
      expect(picker.pick(x, y, screen.width, screen.height), `${dx},${dy}`).toBe('part_jib_furler');
    }
  });
});
