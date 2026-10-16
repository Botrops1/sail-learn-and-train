import type { AppState, Store } from '../app/store';
import { entryFor } from '../model/panelEntries';
import { createAutopilotPanel } from './autopilotPanel';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';
import { createLearnTab } from './learnTab';
import { MODE_LAYOUTS, SECTION_IDS, sectionAvailable, type SectionId } from './modes';
import { createEnginePanel } from './enginePanel';
import { createQuickRow } from './quickRow';
import { createRopeLegend } from './ropeLegend';
import { createRopesTab, revealRopeStrip } from './ropesTab';
import { createSailsPanel } from './sailsPanel';
import { createSection, type SectionView } from './sections';
import type { Sheet } from './sheet';
import { createWindPanel } from './windPanel';

/** The title of each section (PHASE5_SPEC 8.4). */
const SECTION_TITLES: Record<SectionId, StringKey> = {
  ropes: 'tab.ropes',
  sails: 'trim.label',
  autopilot: 'autopilot.label',
  engine: 'engine.label',
  conditions: 'section.conditions',
  learn: 'tab.learn',
  legend: 'legend.title',
};

/**
 * The panel (the sheet on a phone, PHASE5_SPEC 7.5, 8.5): no tabs since M27, but a list of
 * sections that fold: Ropes, Sails, Autopilot, Engine, Conditions (the old Wind tab), Learn and
 * Rope colours. The mode (modes.ts) decides their order and which start open. Each section is
 * built once and never copied. The settings and the camera are in the chip row (PHASE5_SPEC 6.4).
 * Selecting a rope or the wheel anywhere (3D view, link) shows it in the Ropes section.
 */
export interface Panel {
  /** Opens a section, raises a peek sheet to half, and scrolls the section to the top of the panel body. */
  showSection(id: SectionId): void;
  /** True if the section is open, available, and not at peek (PHASE5_SPEC 3.1). */
  shows(id: SectionId): boolean;
  /** setAppMode('learn'), openLearn(id), then showSection('learn'). */
  openLearnEntry(id: string): void;
  /** Runs after a section opens or folds, the mode changes, the sheet changes height, or the layout changes. */
  onChange(listener: () => void): void;
}

export function createPanel(
  host: HTMLElement,
  store: Store,
  sheet: Sheet,
  layout: LayoutShell,
): Panel {
  const body = el('div', { class: 'panel-body' });
  const listeners: (() => void)[] = [];
  const changed = () => listeners.forEach((listener) => listener());

  const openLearnEntry = (id: string) => {
    store.dispatch({ type: 'setAppMode', mode: 'learn' });
    store.dispatch({ type: 'openLearn', id });
    showSection('learn');
  };

  const built: Record<SectionId, { content: HTMLElement[]; explain: boolean }> = {
    ropes: { content: createRopesTab(store, openLearnEntry), explain: true },
    sails: { content: [createSailsPanel(store)], explain: true },
    autopilot: { content: [createAutopilotPanel(store, { heading: false })], explain: false },
    engine: { content: [createEnginePanel(store)], explain: true },
    conditions: { content: createWindPanel(store), explain: true },
    learn: { content: createLearnTab(store, () => showSection('ropes')), explain: false },
    legend: { content: [createRopeLegend()], explain: false },
  };
  const sections = new Map<SectionId, SectionView>();
  for (const id of SECTION_IDS) {
    const { content, explain } = built[id];
    const section = createSection(id, t(SECTION_TITLES[id]), content, explain);
    // After the section's own handler has folded or opened it.
    section.element.querySelector('.section-toggle')?.addEventListener('click', () => changed());
    sections.set(id, section);
  }

  createQuickRow(sheet.head, store, sheet);
  host.append(body);

  const stacked = () => layout.viewport().mode === 'stacked';
  let layoutKind = stacked();

  /** Puts the sections in the mode's order and opens or folds them as the mode says. */
  function applyMode(state: AppState): void {
    const mode = MODE_LAYOUTS[state.appMode];
    body.append(...mode.order.map((id) => sections.get(id)?.element as HTMLElement));
    const open = stacked() ? mode.open : mode.openSide;
    for (const id of SECTION_IDS) {
      const section = sections.get(id);
      section?.setOpen(open.includes(id));
      section?.resetExplain();
    }
    body.scrollTop = 0;
  }

  function applyAvailable(state: AppState): void {
    for (const id of SECTION_IDS) {
      const section = sections.get(id);
      if (section) section.element.hidden = !sectionAvailable(id, state);
    }
  }

  /** The section's top at the top of the panel body (once the sheet has its new height). */
  let scrollTarget: SectionId | null = null;
  function scrollToSection(id: SectionId): void {
    const section = sections.get(id);
    if (!section || section.element.offsetParent === null) return;
    const offset = section.element.getBoundingClientRect().top - body.getBoundingClientRect().top;
    body.scrollTop += offset;
  }

  function showSection(id: SectionId): void {
    const section = sections.get(id);
    if (!section) return;
    section.setOpen(true);
    const raise = sheet.atPeek();
    if (raise) sheet.setHeight('half');
    scrollToSection(id);
    // The sheet may still be growing: scroll again when it has finished.
    scrollTarget = raise ? id : null;
    changed();
  }

  applyAvailable(store.getState());
  applyMode(store.getState());

  store.subscribe((state, previous) => {
    if (
      state.settings.ropesMode !== previous.settings.ropesMode ||
      state.settings.legend !== previous.settings.legend
    ) {
      applyAvailable(state);
      changed();
    }
    if (state.appMode !== previous.appMode) {
      applyMode(state);
      changed();
    }
    // An entry was opened (also while the Learn section is open: this scrolls it to the top).
    if (state.learn !== previous.learn && state.learn !== null && sections.get('learn')?.isOpen()) {
      scrollToSection('learn');
    }
    // A rope or the wheel selected shows it in the Ropes section (Easy and Realistic mode; in
    // Learn mode "Show on the boat" lights the part up and nothing moves). At peek the quick row
    // shows it instead.
    if (
      state.selection !== previous.selection &&
      entryFor(state.selection) &&
      state.appMode !== 'learn' &&
      !sheet.atPeek()
    ) {
      sections.get('ropes')?.setOpen(true);
      revealRopeStrip();
      changed();
    }
  });

  sheet.onChange(() => {
    if (scrollTarget) {
      scrollToSection(scrollTarget);
      scrollTarget = null;
    }
    changed();
  });
  layout.onChange(() => {
    const now = stacked();
    if (now === layoutKind) return;
    layoutKind = now;
    applyMode(store.getState());
    changed();
  });

  return {
    showSection,
    shows: (id) => {
      const section = sections.get(id);
      return Boolean(section && section.isOpen() && !section.element.hidden && !sheet.atPeek());
    },
    openLearnEntry,
    onChange: (listener) => listeners.push(listener),
  };
}
