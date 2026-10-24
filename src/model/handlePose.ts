import { boat, type BoatData } from './boat';
import { socketAt, type RealisticState, type StationId } from './realistic';
import { gapFloorY, ropeBinBox } from './ropeBin';
import { vec3, type Vec3 } from './vec3';

/** Where the one winch handle is drawn (M50, PHASE8_SPEC 8.3). Boat frame, metres. */
export interface HandlePose {
  /** Where the spigot (the square end that goes into a socket) is. */
  origin: Vec3;
  /** Unit vector along the arm, from the spigot to the grip. */
  arm: Vec3;
  /** Unit vector along the grip, from the arm out to its free end. */
  grip: Vec3;
  /** The socket it is in (a winch id or 'part_main_furling_gearbox'), or null when lying. */
  socket: string | null;
}

const GEARBOX_ID = 'part_main_furling_gearbox';

/** Null while carried. */
export function handlePose(realistic: RealisticState, data: BoatData = boat): HandlePose | null {
  const h = realistic.handle;
  if (h.place === 'carried') return null;
  if (h.place === 'socket') {
    const socket = socketAt(h.station, data);
    const a = (h.angle * Math.PI) / 180;
    if (socket === GEARBOX_ID) {
      const g = data.rig.mainFurlingGearbox;
      const m = data.modelDetail.mainFurlingGearbox;
      const p = vec3(g.position);
      return {
        origin: [p[0] - (m.drum.depth + m.cap.depth + m.socket.depth), p[1], p[2]],
        arm: [0, Math.cos(a), Math.sin(a)],
        grip: [-1, 0, 0],
        socket: GEARBOX_ID,
      };
    }
    const winch = socket ? data.cockpitHardware.winches.find((w) => w.id === socket) : undefined;
    if (winch) {
      return {
        origin: [winch.x, winch.y + data.modelDetail.winch.height, winch.z],
        arm: [Math.cos(a), 0, Math.sin(a)],
        grip: [0, 1, 0],
        socket: winch.id,
      };
    }
    // A socket at the helm or the bow cannot happen: show the stowed pose of that station.
    return stowedPose(h.station === 'bow' ? 'helm' : h.station, data);
  }
  return stowedPose(h.station, data);
}

function stowedPose(station: StationId, data: BoatData): HandlePose {
  const w = data.modelDetail.winchHandle;
  const length = data.realisticMode.winchHandle.lengthM;
  if (station === 'port' || station === 'starboard') {
    const side = station === 'starboard' ? 1 : -1;
    const box = ropeBinBox(side, data);
    const winch = data.cockpitHardware.winches.find((x) => Math.sign(x.z) === side);
    if (winch) {
      const x = (box.frontX + box.bodyEndX) / 2;
      return {
        origin: [
          x,
          gapFloorY(x, data) + w.gripDiameter / 2,
          winch.z + side * w.rest.sideGapCentreFromWinchZ - (side * length) / 2,
        ],
        arm: [0, 0, side],
        grip: [-1, 0, 0],
        socket: null,
      };
    }
  }
  if (station === 'mast') {
    return {
      origin: [
        w.rest.mast.x - length / 2,
        data.deck.coachroof.topY + w.gripDiameter / 2,
        w.rest.mast.z,
      ],
      arm: [1, 0, 0],
      grip: [0, 0, 1],
      socket: null,
    };
  }
  // The helm (and the bow, which has no slot).
  return {
    origin: [
      w.rest.helm.x - length / 2,
      data.deck.cockpit.soleY + w.gripDiameter / 2,
      w.rest.helm.z,
    ],
    arm: [1, 0, 0],
    grip: [0, 0, 1],
    socket: null,
  };
}
