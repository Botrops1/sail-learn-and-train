import { boat, type BoatData } from './boat';
import { roundCorners } from './ropeSmooth';
import { add, cross, scale, vec3, type Vec3 } from './vec3';
import { DEG } from './angles';

/** A point and three unit vectors: u to the helmsman's right, v up, w out towards the helmsman. u × v = w. */
export interface PanelFrame {
  /** A point (the pod's middle, or the face's middle). */
  centre: Vec3;
  u: Vec3;
  v: Vec3;
  w: Vec3;
}

export interface HelmPedestalGeometry {
  helmId: string;
  side: 1 | -1;
  /** Axis-aligned: centre and size (x, y, z). */
  column: { centre: Vec3; size: Vec3 };
  /** The pod box: its middle and frame; size along u, v, w. */
  pod: PanelFrame & { size: Vec3 };
  /** The face (the pod's side towards the helmsman): pod.centre + w·thickness/2, same u, v, w. */
  face: PanelFrame;
  /** The middle of each instrument on the face plane (proudM not added). */
  compass: Vec3;
  wind: Vec3;
  tachometer: Vec3;
  keypad: Vec3;
  lever: Vec3;
  joystickBow: Vec3;
  joystickStern: Vec3;
  /** The guard rail's centre line, corners rounded. */
  guardRail: Vec3[];
}

/** A point on a frame's plane: centre + u·du + v·dv + w·dw. */
export function framePoint(frame: PanelFrame, du: number, dv: number, dw = 0): Vec3 {
  return add(add(frame.centre, scale(frame.u, du)), add(scale(frame.v, dv), scale(frame.w, dw)));
}

function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Every position and frame of one pedestal and its panel (PHASE9_SPEC 8.3). Throws for an unknown helm. */
export function helmPedestal(helmId: string, data: BoatData = boat): HelmPedestalGeometry {
  const helm = data.cockpitHardware.helms.find((h) => h.id === helmId);
  if (!helm) throw new Error(`no helm ${helmId} in the boat data`);
  const p = data.modelDetail.helmPedestal;
  const side: 1 | -1 = helm.z >= 0 ? 1 : -1;
  const hub = data.cockpitHardware.wheelHubY;
  const sole = data.deck.cockpit.soleY;
  const topY = hub + p.column.topAboveHubM;
  const columnX = helm.x + p.column.aheadOfWheelM;
  const column = {
    centre: [columnX, (sole + topY) / 2, helm.z] as Vec3,
    size: [p.column.lengthM, topY - sole, p.column.widthM] as Vec3,
  };

  const podCentre: Vec3 = [columnX, topY + p.pod.aboveColumnM, helm.z - side * p.pod.inboardM];
  const e = p.pod.faceElevationDeg * DEG;
  const yaw = p.pod.faceYawOutboardDeg * DEG;
  const w: Vec3 = [-Math.cos(e) * Math.cos(yaw), Math.sin(e), side * Math.cos(e) * Math.sin(yaw)];
  const u = normalize(cross([0, 1, 0], w));
  const v = cross(w, u);
  const pod = {
    centre: podCentre,
    u,
    v,
    w,
    size: [p.pod.widthM, p.pod.heightM, p.pod.thicknessM] as Vec3,
  };
  const face: PanelFrame = { centre: add(podCentre, scale(w, p.pod.thicknessM / 2)), u, v, w };
  const f = p.faces;

  // The guard rail: an inverted U on the cockpit floor ahead of the pedestal, round the panel.
  const rx = columnX + p.column.lengthM / 2 + p.guardRail.aheadOfColumnM;
  const half = p.pod.widthM / 2 + p.guardRail.sideClearanceM;
  const zA = podCentre[2] - half;
  const zB = podCentre[2] + half;
  let top = -Infinity;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      for (const sw of [-1, 1]) {
        top = Math.max(
          top,
          framePoint(
            pod,
            (su * pod.size[0]) / 2,
            (sv * pod.size[1]) / 2,
            (sw * pod.size[2]) / 2,
          )[1],
        );
      }
    }
  }
  const yTop = top + p.guardRail.topAbovePodM;
  const raw: Vec3[] = [
    [rx, sole, zA],
    [rx, yTop, zA],
    [rx, yTop, zB],
    [rx, sole, zB],
  ];
  return {
    helmId,
    side,
    column,
    pod,
    face,
    compass: framePoint(face, f.compass.u, f.compass.v),
    wind: framePoint(face, f.wind.u, f.wind.v),
    tachometer: framePoint(face, f.tachometer.u, f.tachometer.v),
    keypad: framePoint(face, f.keypad.u, f.keypad.v),
    lever: framePoint(face, f.lever.u, f.lever.v),
    joystickBow: framePoint(face, f.joysticks.bow.u, f.joysticks.bow.v),
    joystickStern: framePoint(face, f.joysticks.stern.u, f.joysticks.stern.v),
    guardRail: roundCorners(raw, p.guardRail.bendRadiusM, 4, 0.45),
  };
}

/** The winch handle's rest between the wheels: the pad and the two stops, axis-aligned boxes. */
export function handleRest(data: BoatData = boat): {
  pad: { centre: Vec3; size: Vec3 };
  stops: { centre: Vec3; size: Vec3 }[];
} {
  const r = data.modelDetail.winchHandle.rest.helm;
  const length = data.realisticMode.winchHandle.lengthM;
  const grip = data.modelDetail.winchHandle.gripLength;
  const q = data.modelDetail.helmPedestal.handleRest;
  const sole = data.deck.cockpit.soleY;
  const z = r.z + grip / 2;
  const pad = vec3(q.padM);
  const stop = vec3(q.stopM);
  return {
    pad: { centre: [r.x, sole + pad[1] / 2, z], size: pad },
    stops: [-1, 1].map((s) => ({
      centre: [r.x + s * (length / 2 + q.stopGapM), sole + stop[1] / 2, z] as Vec3,
      size: stop,
    })),
  };
}
