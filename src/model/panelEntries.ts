import { boat, type BoatData } from './boat';
import { isControlId, type ControlId } from './controls';

/**
 * What the Ropes tab offers (PHASE1_SPEC 7.2), derived from hanse508.json: one entry per
 * control (the ropes it moves are highlighted together), one per static rope, and the wheel.
 * Pure data, shared by the panel and the 3D highlight.
 */

/** How the clutches of one control relate (PHASE1_SPEC 7.2 hints). */
export type SharedKind = 'twoEnds' | 'workAgainst';

export type StaticNote = 'inMastFurling' | 'notRigged';

export interface PanelEntry {
  /** The control id, or the rope id of a static rope. */
  key: string;
  /** The control this entry moves; null for a static rope. */
  controlId: ControlId | null;
  /** The id selected when the entry is chosen (data-part-id of its control). */
  selectId: string;
  /** Ropes or parts shown highlighted together (3D and drawing). */
  partIds: string[];
  /** Other ids whose selection opens this entry (e.g. the JIB ROLL clutch, the wheels). */
  openedBy: string[];
  /** One rope with an end on each side, or rope ends that work against each other. */
  shared: SharedKind | null;
  /** Why a static rope has no control. */
  staticNote: StaticNote | null;
}

interface RopeListEntry {
  id: string;
  controlId: string | null;
  tails?: string[];
  static?: boolean;
  /** Moved together with another rope's control (the outhaul with the furling line). */
  coupled?: string;
}

function sharedKind(ropes: RopeListEntry[]): SharedKind | null {
  // Two tails that move the sail opposite ways (furl / unfurl), or more than one rope on one
  // control (the outhaul with the furling line): they work against each other.
  if (ropes.length > 1 || ropes.some((rope) => rope.tails?.includes('furl'))) return 'workAgainst';
  // One rope led to both sides of the cockpit.
  if (ropes.some((rope) => (rope.tails?.length ?? 0) > 1)) return 'twoEnds';
  return null;
}

const cache = new WeakMap<BoatData, PanelEntry[]>();

/** Every entry, in the order of hanse508.json → controls.list, then the static ropes. */
export function panelEntries(data: BoatData = boat): PanelEntry[] {
  const cached = cache.get(data);
  if (cached) return cached;
  const ropes = data.ropes.list as RopeListEntry[];
  const entries: PanelEntry[] = [];
  for (const control of data.controls.list) {
    if (!isControlId(control.id)) continue;
    const id = control.id;
    if (id === 'ctl_rudder') {
      // The wheel moves the rudder (decision 2026-10-08: its id is part_rudder) and both wheels.
      const helms = data.cockpitHardware.helms.map((helm) => helm.id);
      entries.push({
        key: id,
        controlId: id,
        selectId: 'part_rudder',
        partIds: ['part_rudder', ...helms],
        openedBy: helms,
        shared: null,
        staticNote: null,
      });
      continue;
    }
    const moved = ropes.filter((rope) => rope.controlId === id);
    // The control belongs to its own rope; a coupled rope (the outhaul) just moves with it.
    const first = moved.find((rope) => !rope.coupled) ?? moved[0];
    if (!first) continue; // the test wind has its own tab
    const partIds = moved.map((rope) => rope.id);
    const roll = data.cockpitHardware.jibRollClutch;
    entries.push({
      key: id,
      controlId: id,
      selectId: first.id,
      partIds,
      openedBy: partIds.includes(roll.ropeId) ? [roll.id] : [],
      shared: sharedKind(moved),
      staticNote: null,
    });
  }
  const notes = data.clutchPanel.staticRopeNotes as Record<string, StaticNote | undefined>;
  for (const rope of ropes.filter((candidate) => candidate.static)) {
    entries.push({
      key: rope.id,
      controlId: null,
      selectId: rope.id,
      partIds: [rope.id],
      openedBy: [],
      shared: null,
      staticNote: notes[rope.id] ?? null,
    });
  }
  cache.set(data, entries);
  return entries;
}

/** The entry a selected id opens (a rope, a part it moves, or a clutch / wheel), if any. */
export function entryFor(selection: string | null, data: BoatData = boat): PanelEntry | undefined {
  if (!selection) return undefined;
  return panelEntries(data).find(
    (entry) => entry.partIds.includes(selection) || entry.openedBy.includes(selection),
  );
}

/** Ids to highlight in 3D for a selection: everything its entry moves, else the part itself. */
export function highlightIds(selection: string | null, data: BoatData = boat): string[] {
  if (!selection) return [];
  const entry = entryFor(selection, data);
  return entry ? [...new Set([selection, ...entry.partIds])] : [selection];
}

export interface ClutchSpot {
  /** Registry id of the bank (clutch_bank_a, clutch_bank_b) or of the single JIB ROLL clutch. */
  bankId: string;
  side: 'port' | 'starboard';
  slot: number;
  /** Label exactly as written on the boat. */
  label: string;
  ropeId: string;
  /** Which end of the rope (mainsheet: port / starboard; furling line: furl / unfurl). */
  tail: string | null;
  /** The halyard clutches are a bigger type (photos). */
  large: boolean;
  /** The entry this clutch opens. */
  entryKey: string | null;
}

/** The clutches as on the boat: bank B (port), bank A (starboard), and JIB ROLL. */
export function clutchSpots(data: BoatData = boat): ClutchSpot[] {
  const large = new Set<string>(data.clutchPanel.largeClutchRopes);
  const keyOf = (ropeId: string) =>
    panelEntries(data).find((entry) => entry.partIds.includes(ropeId))?.key ?? null;
  const spots: ClutchSpot[] = [];
  for (const bank of data.cockpitHardware.clutchBanks) {
    for (const clutch of bank.clutches) {
      spots.push({
        bankId: bank.id,
        side: bank.side === 'port' ? 'port' : 'starboard',
        slot: clutch.slot,
        label: clutch.label,
        ropeId: clutch.ropeId,
        tail: 'tail' in clutch && typeof clutch.tail === 'string' ? clutch.tail : null,
        large: large.has(clutch.ropeId),
        entryKey: keyOf(clutch.ropeId),
      });
    }
  }
  const roll = data.cockpitHardware.jibRollClutch;
  spots.push({
    bankId: roll.id,
    side: 'port',
    slot: 1,
    label: roll.label,
    ropeId: roll.ropeId,
    tail: null,
    large: large.has(roll.ropeId),
    entryKey: keyOf(roll.ropeId),
  });
  return spots;
}
