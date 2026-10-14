import { boat, type BoatData } from './boat';

/**
 * The words printed on the boat for a registry id (PHASE4_SPEC 3.1, owner on PR #54): the labels
 * of the clutches in `content/boat/hanse508.json` that hold this rope (or of the clutch itself), in
 * the order of the banks, each once. The boat file is the only place they are written.
 */
export function boatLabelsFor(id: string, data: BoatData = boat): string[] {
  const { clutchBanks, jibRollClutch } = data.cockpitHardware;
  const labels: string[] = [];
  const add = (label: string) => {
    if (!labels.includes(label)) labels.push(label);
  };
  for (const bank of clutchBanks) {
    for (const clutch of bank.clutches) if (clutch.ropeId === id) add(clutch.label);
  }
  if (jibRollClutch.ropeId === id || jibRollClutch.id === id) add(jibRollClutch.label);
  return labels;
}
