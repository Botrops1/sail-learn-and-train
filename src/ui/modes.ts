import type { AppMode } from '../app/appMode';
import type { AppState } from '../app/store';
import { hasFeature, isDinghy } from '../model/boat';
import { exerciseDef } from '../model/exercises';
import type { StringKey } from './i18n';
import type { Viewport } from './layout';
import type { PanelTab } from './panelTabs';

/**
 * The sections of the panel and what each mode does with them (PHASE5_SPEC 4.4). Pure: the table
 * is the data. Since M35 every section starts folded and one opens at a time, so the table has no
 * "open" lists. Adding a mode later (Phases 7, 8) is a row here, its strings and, for a new kind
 * of block, a `SectionId` with its builder.
 */
export const SECTION_IDS = [
  'mode',
  'exercises',
  'ropes',
  'dinghy',
  'helm',
  'sails',
  'autopilot',
  'engine',
  'conditions',
  'learn',
  'place',
  'anchor',
  'harbour',
  'status',
  'settings',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface ModeLayout {
  /**
   * Every section exactly once, top to bottom (stacked layout; the
   * console's drawers and blocks keep this order).
   */
  order: readonly SectionId[];
}

/**
 * M51 (issue #100 item 7): the phone tab each section is shown under. Mode, Conditions, Learn and
 * Settings are alone on their tab; every other section is under Controls. (`mode` first and
 * `settings` last stay in every order; they are shown on a phone only, M52.)
 */
export const TAB_OF: Readonly<Record<SectionId, PanelTab>> = {
  mode: 'mode',
  exercises: 'controls',
  ropes: 'controls',
  dinghy: 'controls',
  helm: 'controls',
  sails: 'controls',
  autopilot: 'controls',
  engine: 'controls',
  conditions: 'conditions',
  learn: 'learn',
  place: 'controls',
  anchor: 'controls',
  harbour: 'controls',
  status: 'controls',
  settings: 'settings',
};

/** The title of each section (PHASE5_SPEC 8.4). */
export const SECTION_TITLES: Record<SectionId, StringKey> = {
  mode: 'mode.label',
  exercises: 'exercise.label',
  ropes: 'tab.ropes',
  dinghy: 'section.dinghy',
  helm: 'real.station.helm',
  sails: 'trim.label',
  autopilot: 'steering.label',
  engine: 'engine.label',
  conditions: 'section.conditions',
  learn: 'tab.learn',
  place: 'place.label',
  anchor: 'anchor.label',
  harbour: 'harbour.title',
  status: 'status.label',
  settings: 'settings.title',
};

/** The layouts of `src/ui/layoutMode.ts`. */
export type LayoutKind = 'stacked' | 'console';

export function layoutKindOf(viewport: Viewport): LayoutKind {
  return viewport.mode;
}

/** A block of the console's band (PHASE_CONSOLE_SPEC 7.4). */
export type BlockId = 'port' | 'wheel' | 'engine' | 'starboard' | 'harbour' | 'sails';
/** A drawer of the console menu. */
export type DrawerId =
  'exercises' | 'learn' | 'lines' | 'harbour' | 'conditions' | 'place' | 'status';
export type ConsolePlace =
  { block: BlockId } | { drawer: DrawerId } | { replacedBy: BlockId } | null;

/** Where a section is on the console layout (PHASE_CONSOLE_SPEC 7.4). */
export function consolePlace(id: SectionId, ropes: 'easy' | 'realistic'): ConsolePlace {
  switch (id) {
    case 'autopilot':
      return ropes === 'easy' ? { block: 'wheel' } : null;
    case 'helm':
      return ropes === 'realistic' ? { block: 'wheel' } : null;
    case 'engine':
    case 'dinghy':
      return { block: 'engine' };
    case 'sails':
      return { block: 'sails' };
    case 'ropes':
      return { drawer: 'lines' };
    case 'harbour':
    case 'anchor':
      return { drawer: 'harbour' };
    case 'conditions':
    case 'exercises':
    case 'learn':
    case 'place':
    case 'status':
      return { drawer: id };
    case 'mode':
    case 'settings':
      return null;
  }
}

export const MODE_LAYOUTS: Readonly<Record<AppMode, ModeLayout>> = {
  easy: {
    order: [
      'mode',
      'ropes',
      'dinghy',
      'helm',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'learn',
      'place',
      'anchor',
      'harbour',
      'status',
      'exercises',
      'settings',
    ],
  },
  realistic: {
    order: [
      'mode',
      'ropes',
      'dinghy',
      'helm',
      'sails',
      'conditions',
      'learn',
      'autopilot',
      'engine',
      'place',
      'anchor',
      'harbour',
      'status',
      'exercises',
      'settings',
    ],
  },
  learn: {
    order: [
      'mode',
      'learn',
      'ropes',
      'dinghy',
      'helm',
      'sails',
      'autopilot',
      'engine',
      'conditions',
      'place',
      'anchor',
      'harbour',
      'status',
      'exercises',
      'settings',
    ],
  },
  harbour: {
    order: [
      'mode',
      'engine',
      'helm',
      'harbour',
      'status',
      'anchor',
      'place',
      'conditions',
      'sails',
      'ropes',
      'dinghy',
      'autopilot',
      'learn',
      'exercises',
      'settings',
    ],
  },
  exercise: {
    order: [
      'mode',
      'exercises',
      'ropes',
      'dinghy',
      'helm',
      'sails',
      'autopilot',
      'engine',
      'learn',
      'conditions',
      'place',
      'anchor',
      'harbour',
      'status',
      'settings',
    ],
  },
};

/**
 * True if the section is shown at all in this state. The autopilot and the engine have their own
 * sections only in Easy (M53: in Realistic they are in the Helm section, which only Realistic
 * ropes show), the anchor too (M46: the windlass is at the Bow station); the Mode and Settings sections only on a phone (M51: its Mode
 * and Settings tabs; M52: elsewhere the mode chip and the gear open cards). Owner, PR 144: with an
 * exercise loaded only the sections listed in its `sections` stay (besides those three).
 */
export function sectionAvailable(
  id: SectionId,
  state: AppState,
  layout: LayoutKind = 'console',
): boolean {
  // Owner, PR 144: while an exercise is loaded the sections it does not use are hidden.
  if (state.exercise && id !== 'mode' && id !== 'exercises' && id !== 'settings') {
    const kept = exerciseDef(state.exercise.id)?.sections;
    if (kept && !kept.includes(id)) return false;
  }
  // M113 (PHASE_DINGHY_SPEC 7.5): a section for a thing the boat does not have is not shown. The
  // autopilot section is the Steering section: the steering stays whatever the boat has.
  switch (id) {
    case 'autopilot':
      return state.settings.ropesMode === 'easy';
    case 'engine':
      return state.settings.ropesMode === 'easy' && hasFeature('engine');
    case 'anchor':
      return state.settings.ropesMode === 'easy' && hasFeature('anchor');
    case 'place':
    case 'harbour':
      return hasFeature('harbour');
    case 'dinghy':
      return isDinghy();
    case 'helm':
      return state.settings.ropesMode === 'realistic' && hasFeature('winches');
    case 'exercises':
      return state.appMode === 'exercise';
    case 'mode':
    case 'settings':
      return layout === 'stacked';
    default:
      return true;
  }
}
