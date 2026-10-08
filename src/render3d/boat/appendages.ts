import * as THREE from 'three';
import { boat } from '../../model/boat';
import { keelLineAt } from '../../model/hullShape';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, extrudeProfile, partMesh } from './parts';

/** How far a part reaches into the hull so no gap shows at the joint, metres. */
const OVERLAP = 0.1;

/** L-keel: a tapered fin and a bulb that extends aft (PHASE1_SPEC 6.1). */
export function buildKeel(materials: BoatMaterials): THREE.Object3D {
  const { finRoot, finTip, bulb } = boat.hull.keel;
  const detail = boat.modelDetail;
  const fin = extrudeProfile(
    [
      [finRoot.fwdX, finRoot.y + OVERLAP],
      [finTip.fwdX, finTip.y - OVERLAP],
      [finTip.aftX, finTip.y - OVERLAP],
      [finRoot.aftX, finRoot.y + OVERLAP],
    ],
    detail.keelFinThickness,
  );
  // Bulb: rounded nose and a tapered tail, both sized by the bulb height.
  const h = bulb.topY - bulb.bottomY;
  const mid = (bulb.topY + bulb.bottomY) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(bulb.fwdX, bulb.topY);
  shape.quadraticCurveTo(bulb.fwdX, bulb.bottomY, bulb.fwdX - h, bulb.bottomY);
  shape.lineTo(bulb.aftX + h, bulb.bottomY);
  shape.lineTo(bulb.aftX, mid);
  shape.lineTo(bulb.aftX + h, bulb.topY);
  shape.closePath();
  const bevel = Math.min(h / 3, detail.keelBulbWidth / 4);
  const depth = detail.keelBulbWidth - 2 * bevel;
  const bulbGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    // Keep the outline where the data puts it: the bevel rounds the edges inwards.
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  bulbGeometry.translate(0, 0, -depth / 2);
  const tipMid = (finTip.fwdX + finTip.aftX) / 2;
  const rootMid = (finRoot.fwdX + finRoot.aftX) / 2;
  return partMesh('part_keel', [fin, bulbGeometry], materials.appendage, [
    [
      [rootMid, finRoot.y, 0],
      [tipMid, finTip.y, 0],
    ],
    [
      [bulb.fwdX, mid, 0],
      [bulb.aftX, mid, 0],
    ],
  ]);
}

/**
 * Spade rudder on a vertical stock. Returns the pivot group (at the stock, on the waterline)
 * so the rudder angle can be set later by rotating it around y.
 */
export function buildRudder(materials: BoatMaterials): THREE.Group {
  const r = boat.hull.rudder;
  const balance = boat.modelDetail.rudderBalance;
  const blade = extrudeProfile(
    [
      [balance * r.chordTop, r.topY + OVERLAP],
      [balance * r.chordBottom, r.bottomY],
      [-(1 - balance) * r.chordBottom, r.bottomY],
      [-(1 - balance) * r.chordTop, r.topY + OVERLAP],
    ],
    boat.modelDetail.rudderThickness,
  );
  const mesh = partMesh('part_rudder', [blade], materials.appendage, [
    [
      [0, r.topY, 0],
      [0, r.bottomY, 0],
    ],
  ]);
  const pivot = new THREE.Group();
  pivot.name = 'rudderPivot';
  pivot.position.set(r.stockX, 0, 0);
  pivot.add(mesh);
  return pivot;
}

/** Saildrive leg and two-blade propeller under the hull. */
export function buildSaildrive(materials: BoatMaterials): THREE.Object3D {
  const s = boat.hull.saildrive;
  const leg = boat.modelDetail.saildriveLeg;
  const top = keelLineAt(s.x) + OVERLAP;
  const bottom = s.propY - leg.thickness;
  const legGeometry = boxAt([s.x, (top + bottom) / 2, 0], [leg.chord, top - bottom, leg.thickness]);
  const radius = s.propDiameter / 2;
  const hubX = s.x - leg.chord / 2;
  const hub = cylinderBetween(
    [s.x, s.propY, 0],
    [hubX - leg.thickness, s.propY, 0],
    leg.thickness / 2,
  );
  const blades = Array.from({ length: s.blades }, (_, i) => {
    const angle = (2 * Math.PI * i) / s.blades;
    return cylinderBetween(
      [hubX, s.propY, 0],
      [hubX, s.propY + radius * Math.cos(angle), radius * Math.sin(angle)],
      leg.thickness / 3,
      6,
    );
  });
  return partMesh('part_saildrive', [legGeometry, hub, ...blades], materials.appendage, [
    [
      [s.x, top, 0],
      [s.x, s.propY, 0],
    ],
  ]);
}
