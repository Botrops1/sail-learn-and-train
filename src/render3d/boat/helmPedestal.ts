import * as THREE from 'three';
import { boat } from '../../model/boat';
import { handleRest, helmPedestal, type HelmPedestalGeometry } from '../../model/helmPedestal';
import type { PanelReadings } from '../../model/helmPanel';
import { thrusterEnds } from '../../model/thrusters';
import type { Detail } from '../../model/settings';
import { DEG } from '../../model/angles';
import { vec3, type Vec3 } from '../../model/vec3';
import { SCENE } from '../sceneConfig';
import type { BoatMaterials } from './materials';
import {
  boxAt,
  cylinderBetween,
  partMesh,
  roundedBoxAt,
  smallPartMesh,
  type PickSegment,
} from './parts';
import {
  drawCompass,
  drawKeypad,
  drawTach,
  drawWind,
  makeFaceCanvas,
  type FaceCanvas,
  type FaceContext,
} from './panelFaces';

export interface HelmPedestals {
  objects: THREE.Object3D[];
  /** Hides each panel's instrument meshes when `eye` (boat frame) is farther than SCENE.helmPanel.showWithinM from its pod. */
  setEye(eye: Vec3): void;
  /** Redraws the faces and poses the lever and joysticks (M62 calls it once with PANEL_AT_REST). */
  show(readings: PanelReadings): void;
  /** While on, every instrument mesh is visible and setEye hides nothing; off hands visibility back to setEye. */
  reveal(on: boolean): void;
}

interface Instrument {
  canvas: FaceCanvas | null;
  texture: THREE.CanvasTexture<FaceCanvas> | null;
}

function instrument(width: number, height: number): Instrument {
  const canvas = makeFaceCanvas(width, height);
  if (!canvas) return { canvas: null, texture: null };
  const texture = new THREE.CanvasTexture<FaceCanvas>(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, texture };
}

function faceMaterial(texture: THREE.CanvasTexture<FaceCanvas> | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    // A face with no canvas (Node) stays a plain grey disc rather than white.
    color: texture ? '#ffffff' : '#555a60',
  });
}

/** The matrix that turns local x, y, z into the frame's u, v, w and moves the origin to `at`. */
function frameMatrix(g: HelmPedestalGeometry, at: Vec3): THREE.Matrix4 {
  const { u, v, w } = g.pod;
  return new THREE.Matrix4()
    .makeBasis(new THREE.Vector3(...u), new THREE.Vector3(...v), new THREE.Vector3(...w))
    .setPosition(...at);
}

/**
 * A pedestal, panel and guard rail at each wheel, and the winch handle's rest between them
 * (PHASE9_SPEC 8.4, M62). The faces are drawn on canvas textures shared by both panels.
 */
export function buildHelmPedestals(materials: BoatMaterials, detail: Detail): HelmPedestals {
  const p = boat.modelDetail.helmPedestal;
  const cfg = SCENE.helmPanel;
  const compass = instrument(cfg.facePx, cfg.facePx);
  const wind = instrument(cfg.facePx, cfg.facePx);
  const tach = instrument(cfg.facePx, cfg.facePx);
  const keypad = instrument(256, 110);
  const objects: THREE.Object3D[] = [];

  interface Panel {
    pod: Vec3;
    meshes: THREE.Mesh[];
    levers: THREE.Group[];
    joysticks: { end: 'bow' | 'stern'; pivot: THREE.Group }[];
  }
  const panels: Panel[] = [];

  for (const helm of boat.cockpitHardware.helms) {
    const g = helmPedestal(helm.id);
    const w = new THREE.Vector3(...g.pod.w);
    const proud = (point: Vec3): Vec3 => [
      point[0] + w.x * p.faces.proudM,
      point[1] + w.y * p.faces.proudM,
      point[2] + w.z * p.faces.proudM,
    ];
    const panel: Panel = { pod: g.pod.centre, meshes: [], levers: [], joysticks: [] };

    // Column, pod and rail always show.
    objects.push(
      partMesh(
        'fit_helm_pedestal',
        [roundedBoxAt(g.column.centre, g.column.size, p.column.edgeRadiusM, detail)],
        materials.dark,
      ),
      partMesh(
        'fit_helm_pedestal',
        [
          roundedBoxAt([0, 0, 0], g.pod.size, p.pod.edgeRadiusM, detail).applyMatrix4(
            frameMatrix(g, g.pod.centre),
          ),
        ],
        materials.gelcoat,
      ),
    );
    const railSides = detail === 'high' ? cfg.segments.railHigh : cfg.segments.railLow;
    const railSegments: PickSegment[] = g.guardRail
      .slice(1)
      .map((b, i) => [g.guardRail[i] as Vec3, b]);
    objects.push(
      partMesh(
        'fit_helm_pedestal',
        railSegments.map(([a, b]) => cylinderBetween(a, b, p.guardRail.tubeRadiusM, railSides)),
        materials.chrome,
        railSegments,
      ),
    );

    // The four faces, turned into the face plane.
    const round = (point: Vec3, diameterM: number) =>
      new THREE.CircleGeometry(diameterM / 2, cfg.segments.round).applyMatrix4(
        frameMatrix(g, proud(point)),
      );
    const plane = (point: Vec3, width: number, height: number) =>
      new THREE.PlaneGeometry(width, height).applyMatrix4(frameMatrix(g, proud(point)));
    const faces: [string, THREE.BufferGeometry, Instrument, Vec3][] = [
      ['fit_compass', round(g.compass, p.faces.compass.diameterM), compass, g.compass],
      [
        'fit_instrument_display',
        plane(g.wind, p.faces.wind.sizeM, p.faces.wind.sizeM),
        wind,
        g.wind,
      ],
      ['engine_control', round(g.tachometer, p.faces.tachometer.diameterM), tach, g.tachometer],
      [
        'fit_autopilot_control',
        plane(g.keypad, p.faces.keypad.widthM, p.faces.keypad.heightM),
        keypad,
        g.keypad,
      ],
    ];
    for (const [id, geometry, source, centre] of faces) {
      const mesh = smallPartMesh(id, [geometry], faceMaterial(source.texture), [proud(centre)]);
      mesh.renderOrder = 1;
      panel.meshes.push(mesh);
      objects.push(mesh);
    }

    // The engine lever: a base on the face and an arm that leans ahead (towards v) with the lever.
    const lv = p.faces.lever;
    const leverBase = vec3(lv.baseM);
    const lever = new THREE.Group();
    lever.name = `${helm.id}Lever`;
    lever.applyMatrix4(frameMatrix(g, proud(g.lever)));
    const base = smallPartMesh(
      'engine_control',
      [boxAt([0, 0, leverBase[2] / 2], leverBase)],
      materials.dark,
      [[0, 0, leverBase[2] + lv.armLengthM]],
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, leverBase[2]);
    const arm = smallPartMesh(
      'engine_control',
      [
        cylinderBetween([0, 0, 0], [0, 0, lv.armLengthM], lv.armRadiusM, 8),
        new THREE.SphereGeometry(lv.knobRadiusM, ...cfg.segments.knob).translate(
          0,
          0,
          lv.armLengthM,
        ),
      ],
      materials.dark,
      [[0, 0, lv.armLengthM]],
    );
    pivot.add(arm);
    lever.add(base, pivot);
    panel.meshes.push(base, arm);
    panel.levers.push(pivot);
    objects.push(lever);

    // The thruster joysticks, one for each thruster the boat has.
    const js = p.faces.joysticks;
    for (const end of thrusterEnds()) {
      const at = end === 'bow' ? g.joystickBow : g.joystickStern;
      const group = new THREE.Group();
      group.name = `${helm.id}Joystick-${end}`;
      group.applyMatrix4(frameMatrix(g, proud(at)));
      const disc = smallPartMesh(
        'fit_thruster_joysticks',
        [cylinderBetween([0, 0, 0], [0, 0, js.baseThicknessM], js.baseRadiusM, 12)],
        materials.dark,
        [[0, 0, js.baseThicknessM + js.stickLengthM]],
      );
      const stickPivot = new THREE.Group();
      stickPivot.position.set(0, 0, js.baseThicknessM);
      const stick = smallPartMesh(
        'fit_thruster_joysticks',
        [
          cylinderBetween([0, 0, 0], [0, 0, js.stickLengthM], js.stickRadiusM, 8),
          new THREE.SphereGeometry(js.knobRadiusM, ...cfg.segments.knob).translate(
            0,
            0,
            js.stickLengthM,
          ),
        ],
        materials.dark,
        [[0, 0, js.stickLengthM]],
      );
      stickPivot.add(stick);
      group.add(disc, stickPivot);
      panel.meshes.push(disc, stick);
      panel.joysticks.push({ end, pivot: stickPivot });
      objects.push(group);
    }
    panels.push(panel);
  }

  // The winch handle's rest between the wheels: a pad and two stops.
  const rest = handleRest();
  const q = p.handleRest;
  objects.push(
    smallPartMesh(
      'fit_winch_handle_rest',
      [
        roundedBoxAt(rest.pad.centre, rest.pad.size, q.padEdgeM, detail),
        ...rest.stops.map((s) => roundedBoxAt(s.centre, s.size, q.stopEdgeM, detail)),
      ],
      materials.dark,
      [rest.pad.centre],
    ),
  );

  let revealed = false;
  let lastEye: Vec3 | null = null;
  const apply = (): void => {
    for (const panel of panels) {
      const near =
        revealed ||
        lastEye === null ||
        Math.hypot(
          lastEye[0] - panel.pod[0],
          lastEye[1] - panel.pod[1],
          lastEye[2] - panel.pod[2],
        ) <= cfg.showWithinM;
      // picking.ts checks each mesh's own `visible`, so every mesh is set, not only a group.
      for (const mesh of panel.meshes) mesh.visible = near;
    }
  };

  const draw = (source: Instrument, paint: (ctx: FaceContext) => void): void => {
    const ctx = source.canvas?.getContext('2d') as FaceContext | null | undefined;
    if (!ctx || !source.texture) return;
    paint(ctx);
    source.texture.needsUpdate = true;
  };

  return {
    objects,
    setEye(eye) {
      lastEye = eye;
      apply();
    },
    reveal(on) {
      revealed = on;
      apply();
    },
    show(readings) {
      draw(compass, (ctx) => drawCompass(ctx, readings.headingDeg));
      draw(wind, (ctx) => drawWind(ctx, readings.awaDeg, readings.awsKn));
      draw(tach, (ctx) => drawTach(ctx, readings.rpm, readings.running));
      draw(keypad, (ctx) => drawKeypad(ctx, readings.autopilot, readings.courseText));
      const lever = (readings.leverPct / 100) * p.faces.lever.maxDeg;
      for (const panel of panels) {
        for (const pivot of panel.levers) pivot.rotation.x = -lever * DEG;
        for (const { end, pivot } of panel.joysticks) {
          pivot.rotation.y = readings[end] * p.faces.joysticks.maxTiltDeg * DEG;
        }
      }
    },
  };
}
