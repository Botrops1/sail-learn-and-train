import type { AppState, Store } from '../app/store';
import { entryFor } from '../model/panelEntries';
import { createAnchorPanel } from './anchorPanel';
import { createAutopilotPanel } from './autopilotPanel';
import { createColumnHandles } from './columnHandles';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';
import { createLearnTab } from './learnTab';
import { MODE_LAYOUTS, SECTION_IDS, sectionAvailable, type SectionId } from './modes';
import { createModeSection } from './modeSection';
import { createEnginePanel } from './enginePanel';
import { createHarbourPanel } from './harbourPanel';
import { createPlacePanel } from './placePanel';
import { createQuickRow } from './quickRow';
import { createRopesTab, revealRopeStrip } from './ropesTab';
import { createSailsPanel } from './sailsPanel';
import { createSection, type SectionView } from './sections';
import { createThrusterPanel } from './thrusterPanel';
import { takeOpenAfterReload } from './settingsMenu';
import type { Sheet } from './sheet';
import { createWindPanel } from './windPanel';

/** The title of each section (PHASE5_SPEC 8.4). */
const SECTION_TITLES: Record<SectionId, StringKey> = {
  mode: 'mode.label',
  ropes: 'tab.ropes',
  sails: 'trim.label',
  autopilot: 'autopilot.label',
  engine: 'engine.label',
  conditions: 'section.conditions',
  learn: 'tab.learn',
  place: 'place.label',
  anchor: 'anchor.label',
  harbour: 'harbour.title',
  settings: 'settings.title',
};

/**
 * The panel (the sheet on a phone, PHASE5_SPEC 7.5, 8.5): no tabs since M27, but a list of
 * sections that fold: Ropes, Sails, Autopilot, Engine, Conditions (the old Wind tab), Learn,
 * (M42) Place, (M46) Anchor, (M33) Harbour gear and, on the wide layout only (M38), Mode (first) and Settings (last). The
 * mode (modes.ts) decides their order. Since M35 all
 * start folded (so every title is on screen) and one opens at a time per column: the headers
 * stay above and below the open section, whose body scrolls on its own. Each section is built
 * once and never copied. Elsewhere the mode, the settings and the camera are in the chip row
 * (PHASE5_SPEC 6.4).
 * Selecting a rope or the wheel anywhere (3D view, link) shows it in the Ropes section.
 */
export interface Panel {
  /** Opens a section, raises a peek sheet to half, and scrolls the section to the top of the panel body. */
  showSection(id: SectionId): void;
  /** True if the section is open, available, and not at peek (PHASE5_SPEC 3.1). */
  shows(id: SectionId): boolean;
  /** setAppMode('learn'), openLearn(id), then showSection('learn'). */
  openLearnEntry(id: string): void;
  /** openLearn(id), then showSection('learn'): the mode and the places of the sections stay as they are (M36: the alert history's "?"). */
  showLearnEntry(id: string): void;
  /** Runs after a section opens or folds, the mode changes, the sheet changes height, or the layout changes. */
  onChange(listener: () => void): void;
}

type LayoutKind = 'stacked' | 'side' | 'wide';

/** Scrolls the section's body to its top (the open section is the only part of a column that scrolls). */
export function scrollToSection(element: HTMLElement): void {
  const content = element.querySelector<HTMLElement>('.section-body');
  if (content && element.offsetParent !== null) content.scrollTop = 0;
}

export function createPanel(
  host: HTMLElement,
  store: Store,
  sheet: Sheet,
  layout: LayoutShell,
  settingsContent: HTMLElement,
): Panel {
  const body = el('div', { class: 'panel-body panel-scroll' });
  // The second column of the wide layout (PHASE5_SPEC 10.2): empty and hidden otherwise.
  const second = el('div', {
    class: 'panel-second panel-scroll',
    'data-testid': 'second-column',
    role: 'region',
    'aria-label': t('panel.second'),
    tabindex: '0',
    hidden: '',
  });
  const listeners: (() => void)[] = [];
  const changed = () => listeners.forEach((listener) => listener());

  const openLearnEntry = (id: string) => {
    store.dispatch({ type: 'setAppMode', mode: 'learn' });
    store.dispatch({ type: 'openLearn', id });
    showSection('learn');
  };

  const showLearnEntry = (id: string) => {
    store.dispatch({ type: 'openLearn', id });
    showSection('learn');
  };

  const built: Record<SectionId, { content: HTMLElement[]; explain: boolean }> = {
    mode: { content: createModeSection(store), explain: false },
    ropes: { content: createRopesTab(store, openLearnEntry), explain: true },
    sails: { content: [createSailsPanel(store)], explain: true },
    autopilot: { content: [createAutopilotPanel(store, { heading: false })], explain: false },
    engine: { content: [createEnginePanel(store), createThrusterPanel(store)], explain: true },
    conditions: { content: createWindPanel(store), explain: true },
    learn: { content: createLearnTab(store, () => showSection('ropes')), explain: false },
    place: { content: createPlacePanel(store), explain: true },
    anchor: { content: createAnchorPanel(store), explain: true },
    harbour: { content: createHarbourPanel(store), explain: true },
    settings: { content: [settingsContent], explain: false },
  };
  const sections = new Map<SectionId, SectionView>();
  for (const id of SECTION_IDS) {
    const { content, explain } = built[id];
    const section = createSection(id, t(SECTION_TITLES[id]), content, explain);
    // After the section's own handler has folded or opened it.
    section.element.querySelector('.section-toggle')?.addEventListener('click', () => {
      if (section.isOpen()) {
        openOnly(id);
        // At half height the folded titles leave an open section about 100 px: a tapped title
        // raises the sheet (selections and links keep the height, so the 3D view stays in sight).
        if (layoutKind === 'stacked' && sheet.height() === 'half') sheet.setHeight('full');
      }
      changed();
    });
    sections.set(id, section);
  }

  createQuickRow(sheet.head, store, sheet);
  host.append(body, second);
  // M39: on the wide layout the columns collapse and change width (columnHandles.ts).
  const columns = createColumnHandles(host, [body, second], layout, () => changed());

  const layoutKindNow = (): LayoutKind => {
    const { mode, wide } = layout.viewport();
    return wide ? 'wide' : mode;
  };
  let layoutKind = layoutKindNow();

  /**
   * Puts each section where the layout says: in the wide layout the mode's `second` sections fill
   * column 2 and the rest stay in column 1; otherwise everything is in column 1, in the mode's
   * order. Moves the elements, never rebuilds them, and keeps the focus where it was.
   */
  function place(state: AppState): void {
    const mode = MODE_LAYOUTS[state.appMode];
    const wide = layoutKind === 'wide';
    const inSecond = wide ? mode.second : [];
    const elementOf = (id: SectionId) => sections.get(id)?.element as HTMLElement;
    const focused = document.activeElement;
    const focusedInside =
      focused instanceof HTMLElement &&
      focused !== document.body &&
      SECTION_IDS.some((id) => elementOf(id).contains(focused));

    second.hidden = !wide;
    // The settings dialog (settingsMenu.ts) holds the content everywhere else.
    const settingsBody = elementOf('settings').querySelector('.section-body');
    if (wide && settingsBody && settingsContent.parentElement !== settingsBody) {
      settingsBody.append(settingsContent);
    }
    second.append(...inSecond.map(elementOf));
    body.append(...mode.order.filter((id) => !inSecond.includes(id)).map(elementOf));
    if (focusedInside && document.activeElement !== focused) {
      (focused as HTMLElement).focus({ preventScroll: true });
    }
  }

  /** Opens `id` and folds the other sections of its column (M35: one open at a time). */
  let openCount = 0;
  const openedAt = new Map<SectionId, number>();
  function openOnly(id: SectionId): void {
    const section = sections.get(id);
    if (!section) return;
    section.setOpen(true);
    openedAt.set(id, (openCount += 1));
    for (const other of SECTION_IDS) {
      const view = sections.get(other);
      if (other !== id && view && view.element.parentElement === section.element.parentElement) {
        view.setOpen(false);
      }
    }
  }

  /** After the layout moved sections between columns: in each column only the latest opened stays open. */
  function keepOneOpenPerColumn(): void {
    for (const column of [body, second]) {
      const open = SECTION_IDS.filter((id) => {
        const view = sections.get(id);
        return view?.isOpen() && view.element.parentElement === column;
      }).sort((a, b) => (openedAt.get(b) ?? 0) - (openedAt.get(a) ?? 0));
      for (const id of open.slice(1)) sections.get(id)?.setOpen(false);
    }
  }

  /**
   * Folds every section at the start (M35); a link that names something to look at opens the
   * section that shows it: a Learn entry in Learn mode, a selected rope or the wheel otherwise.
   */
  function applyOpen(state: AppState, fromLink = false): void {
    for (const id of SECTION_IDS) sections.get(id)?.setOpen(false);
    if (fromLink) {
      if (state.appMode === 'learn' && state.learn !== null) openOnly('learn');
      else if (state.appMode === 'harbour') openHarbourFirst(state);
      else if (state.appMode !== 'learn' && entryFor(state.selection)) openOnly('ropes');
    }
    // A new language reloads the page: the Settings section it was chosen in is open again (M38).
    if (fromLink && takeOpenAfterReload() === 'settings' && layoutKind === 'wide') {
      openOnly('settings');
    }
  }

  /**
   * Harbour mode puts the engine and thrusters first (PHASE7_SPEC 7.5): the Engine section, which
   * holds the thrusters under the lever (owner, PR #99), opens; with Realistic ropes, where the
   * engine and thrusters are at the Helm station, Ropes opens in its place.
   */
  function openHarbourFirst(state: AppState): void {
    openOnly(sectionAvailable('engine', state) ? 'engine' : 'ropes');
  }

  /**
   * Puts the sections in place for the mode. At the start every section is folded (M35); a mode
   * chosen later keeps the open section, which moves with its place in the new order.
   */
  function applyMode(state: AppState, atStart = false): void {
    place(state);
    for (const id of SECTION_IDS) sections.get(id)?.resetExplain();
    if (atStart) applyOpen(state, true);
    else if (state.appMode === 'harbour') openHarbourFirst(state);
    else keepOneOpenPerColumn();
    body.scrollTop = 0;
    second.scrollTop = 0;
  }

  function applyAvailable(state: AppState): void {
    for (const id of SECTION_IDS) {
      const section = sections.get(id);
      if (section) section.element.hidden = !sectionAvailable(id, state, layoutKind === 'wide');
    }
  }

  /** The Mode section's title names the mode in force ("Mode: Easy"), so it shows folded too. */
  function applyModeTitle(state: AppState): void {
    const name = t(`mode.${state.appMode}` as const);
    sections.get('mode')?.setTitle(t('mode.section', { name }));
  }

  /** The section's top at the top of its column (once the sheet has its new height). */
  let scrollTarget: SectionId | null = null;
  function scrollToId(id: SectionId): void {
    const section = sections.get(id);
    if (section) scrollToSection(section.element);
  }

  function showSection(id: SectionId): void {
    const section = sections.get(id);
    if (!section) return;
    openOnly(id);
    // Asked for by name (a link in the view, a "?"): a collapsed column opens to show it.
    columns.reveal(section.element);
    const raise = sheet.atPeek();
    if (raise) sheet.setHeight('half');
    scrollToId(id);
    // The sheet may still be growing: scroll again when it has finished.
    scrollTarget = raise ? id : null;
    changed();
  }

  applyAvailable(store.getState());
  applyModeTitle(store.getState());
  applyMode(store.getState(), true);

  store.subscribe((state, previous) => {
    if (state.settings.ropesMode !== previous.settings.ropesMode) {
      applyAvailable(state);
      changed();
    }
    if (state.appMode !== previous.appMode) {
      applyModeTitle(state);
      applyMode(state);
      changed();
    }
    // An entry was opened (also while the Learn section is open: this scrolls it to the top).
    if (state.learn !== previous.learn && state.learn !== null && sections.get('learn')?.isOpen()) {
      scrollToId('learn');
    }
    // A rope or the wheel selected shows it in the Ropes section (Easy and Realistic mode; in
    // Learn mode "Show on the boat" lights the part up and nothing moves). At peek the quick row
    // shows it; Ropes still opens (M35: it is what the sheet shows when it is pulled up).
    if (
      state.selection !== previous.selection &&
      entryFor(state.selection) &&
      state.appMode !== 'learn' &&
      state.appMode !== 'harbour'
    ) {
      openOnly('ropes');
      if (!sheet.atPeek()) revealRopeStrip();
      changed();
    }
  });

  sheet.onChange(() => {
    if (scrollTarget) {
      scrollToId(scrollTarget);
      scrollTarget = null;
    }
    changed();
  });
  layout.onChange(() => {
    const before = layoutKind;
    const now = layoutKindNow();
    if (now === before) return;
    layoutKind = now;
    // Sections follow the layout and keep their open states (a phone turned sideways keeps the
    // open section); only one stays open per column.
    place(store.getState());
    applyAvailable(store.getState());
    keepOneOpenPerColumn();
    changed();
  });

  return {
    showSection,
    shows: (id) => {
      const section = sections.get(id);
      return Boolean(
        section &&
        section.isOpen() &&
        !section.element.hidden &&
        !sheet.atPeek() &&
        !columns.isCollapsed(section.element),
      );
    },
    openLearnEntry,
    showLearnEntry,
    onChange: (listener) => listeners.push(listener),
  };
}
