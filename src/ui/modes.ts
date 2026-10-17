import type { AppMode } from '../app/appMode';
import type { AppState } from '../app/store';

/**
 * The sections of the panel and what each mode does with them (PHASE5_SPEC 4.4). Pure: the table
 * is the data. Since M35 every section starts folded and one opens at a time, so the table has no
 * "open" lists. Adding a mode later (Phases 7, 8) is a row here, its strings and, for a new kind
 * of block, a `SectionId` with its builder.
 */
export const SECTION_IDS = [
  'ropes',
  'sails',
  'autopilot',
  'engine',
  'conditions',
  'learn',
  'legend',
  'harbour',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface ModeLayout {
  /** Every section exactly once, top to bottom (stacked layout, and column 1 of the side layout). */
  order: readonly SectionId[];
  /** Wide layout (M29): these leave column 1 and fill column 2, in this order. */
  second: readonly SectionId[];
}

export const MODE_LAYOUTS: Readonly<Record<AppMode, ModeLayout>> = {
  easy: {
    order: ['ropes', 'sails', 'autopilot', 'engine', 'conditions', 'learn', 'legend', 'harbour'],
    second: ['conditions', 'learn'],
  },
  realistic: {
    order: ['ropes', 'sails', 'conditions', 'learn', 'legend', 'autopilot', 'engine', 'harbour'],
    second: ['conditions', 'learn'],
  },
  learn: {
    order: ['learn', 'legend', 'ropes', 'sails', 'autopilot', 'engine', 'conditions', 'harbour'],
    second: ['conditions', 'ropes'],
  },
};

/**
 * True if the section is shown at all in this state. The autopilot and the engine have their own
 * sections only in Easy (in Realistic they are at the Helm station); the legend follows its
 * setting.
 */
export function sectionAvailable(id: SectionId, state: AppState): boolean {
  switch (id) {
    case 'autopilot':
    case 'engine':
      return state.settings.ropesMode === 'easy';
    case 'legend':
      return state.settings.legend;
    default:
      return true;
  }
}
