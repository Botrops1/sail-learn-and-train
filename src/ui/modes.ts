import type { AppMode } from '../app/appMode';
import type { AppState } from '../app/store';
import type { PanelTab } from './panelTabs';

/**
 * The sections of the panel and what each mode does with them (PHASE5_SPEC 4.4). Pure: the table
 * is the data. Since M35 every section starts folded and one opens at a time, so the table has no
 * "open" lists. Adding a mode later (Phases 7, 8) is a row here, its strings and, for a new kind
 * of block, a `SectionId` with its builder.
 */
export const SECTION_IDS = [
  'mode',
  'ropes',
  'helm',
  'sails',
  'autopilot',
  'engine',
  'conditions',
  'learn',
  'place',
  'anchor',
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
 * M51 (issue #100 item 7): the phone tab each section is shown under. Mode, Conditions, Learn and
 * Settings are alone on their tab; every other section is under Controls. (`mode` first and
 * `settings` last stay in every order; they are shown on a phone only, M52.)
 */
export const TAB_OF: Readonly<Record<SectionId, PanelTab>> = {
  mode: 'mode',
  ropes: 'controls',
  helm: 'controls',
  sails: 'controls',
  autopilot: 'controls',
  engine: 'controls',
  conditions: 'conditions',
  learn: 'learn',
  place: 'controls',
  anchor: 'controls',
  harbour: 'controls',
  settings: 'settings',
};

/** The layouts of `src/ui/layoutMode.ts` (with the wide one told apart). */
export type LayoutKind = 'stacked' | 'side' | 'wide';

export const MODE_LAYOUTS: Readonly<Record<AppMode, ModeLayout>> = {
  easy: {
    order: [
      'mode',
      'ropes',
      'helm',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'learn',
      'place',
      'anchor',
      'harbour',
      'settings',
    ],
    second: ['conditions', 'learn'],
  },
  realistic: {
    order: [
      'mode',
      'ropes',
      'helm',
      'sails',
      'conditions',
      'learn',
      'autopilot',
      'engine',
      'place',
      'anchor',
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
      'helm',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'place',
      'anchor',
      'harbour',
      'settings',
    ],
    second: ['conditions', 'ropes'],
  },
  harbour: {
    order: [
      'mode',
      'engine',
      'helm',
      'harbour',
      'anchor',
      'place',
      'conditions',
      'sails',
      'ropes',
      'autopilot',
      'learn',
      'settings',
    ],
    second: ['place', 'conditions'],
  },
};

/**
 * True if the section is shown at all in this state. The autopilot and the engine have their own
 * sections only in Easy (M53: in Realistic they are in the Helm section, which only Realistic
 * ropes show), the anchor too (M46: the windlass is at the Bow station); the Mode and Settings sections only on a phone (M51: its Mode
 * and Settings tabs; M52: elsewhere the mode chip and the gear open cards).
 */
export function sectionAvailable(
  id: SectionId,
  state: AppState,
  layout: LayoutKind = 'side',
): boolean {
  switch (id) {
    case 'autopilot':
    case 'engine':
    case 'anchor':
      return state.settings.ropesMode === 'easy';
    case 'helm':
      return state.settings.ropesMode === 'realistic';
    case 'mode':
    case 'settings':
      return layout === 'stacked';
    default:
      return true;
  }
}
