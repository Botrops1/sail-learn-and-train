import type { AppMode } from '../app/appMode';
import type { AppState } from '../app/store';

/**
 * The sections of the panel and what each mode does with them (PHASE5_SPEC 4.4). Pure: the table
 * is the data. Since M35 every section starts folded and one opens at a time, so the table has no
 * "open" lists. Adding a mode later (Phases 7, 8) is a row here, its strings and, for a new kind
 * of block, a `SectionId` with its builder.
 */
export const SECTION_IDS = [
  'mode',
  'ropes',
  'sails',
  'autopilot',
  'engine',
  'conditions',
  'learn',
  'harbour',
  'settings',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface ModeLayout {
  /** Every section exactly once, top to bottom (stacked layout, and column 1 of the side layout). */
  order: readonly SectionId[];
  /** Wide layout (M29): these leave column 1 and fill column 2, in this order. */
  second: readonly SectionId[];
}

/**
 * M38 (issues #91, #93): on the wide layout the mode picker is the first section of column 1 and
 * Settings the last, in every mode; elsewhere the mode chip and the gear in the chip row do their
 * work and these two sections are not shown.
 */
export const WIDE_ONLY_SECTIONS: readonly SectionId[] = ['mode', 'settings'];

export const MODE_LAYOUTS: Readonly<Record<AppMode, ModeLayout>> = {
  easy: {
    order: [
      'mode',
      'ropes',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'learn',
      'harbour',
      'settings',
    ],
    second: ['conditions', 'learn'],
  },
  realistic: {
    order: [
      'mode',
      'ropes',
      'sails',
      'conditions',
      'learn',
      'autopilot',
      'engine',
      'harbour',
      'settings',
    ],
    second: ['conditions', 'learn'],
  },
  learn: {
    order: [
      'mode',
      'learn',
      'ropes',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'harbour',
      'settings',
    ],
    second: ['conditions', 'ropes'],
  },
  harbour: {
    order: [
      'mode',
      'engine',
      'harbour',
      'conditions',
      'sails',
      'ropes',
      'autopilot',
      'learn',
      'settings',
    ],
    second: ['conditions', 'learn'],
  },
};

/**
 * True if the section is shown at all in this state. The autopilot and the engine have their own
 * sections only in Easy (in Realistic they are at the Helm station); the Mode and Settings
 * sections only on the wide layout (`wide`).
 */
export function sectionAvailable(id: SectionId, state: AppState, wide = false): boolean {
  switch (id) {
    case 'autopilot':
    case 'engine':
      return state.settings.ropesMode === 'easy';
    case 'mode':
    case 'settings':
      return wide;
    default:
      return true;
  }
}
