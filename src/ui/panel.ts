import type { AppState, Store } from '../app/store';
import { entryFor } from '../model/panelEntries';
import { createAnchorPanel } from './anchorPanel';
import { createAutopilotPanel } from './autopilotPanel';
import { createColumnHandles } from './columnHandles';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';
import { createLearnTab } from './learnTab';
import {
  MODE_LAYOUTS,
  SECTION_IDS,
  TAB_OF,
  sectionAvailable,
  type LayoutKind,
  type SectionId,
} from './modes';
import type { ChipCard } from './chipCard';
import { createPanelTabs, type PanelTab } from './panelTabs';
import {
  LAYOUT_KEY,
  completeLayout,
  parseLayout,
  serializeLayout,
  type SectionLayout,
  type WideSectionId,
} from './sectionLayout';
import { createSectionMove } from './sectionMove';
import { createEnginePanel } from './enginePanel';
import { createHarbourPanel } from './harbourPanel';
import { createPlacePanel } from './placePanel';
import { createQuickRow } from './quickRow';
import { createHelmStation } from './realisticPanel';
import { createRopesTab, revealRopeStrip } from './ropesTab';
import { createSailsPanel } from './sailsPanel';
import { createStatusPanel } from './statusPanel';
import { createSection, type SectionView } from './sections';
import { createThrusterPanel } from './thrusterPanel';
import type { Sheet } from './sheet';
import { createWindPanel } from './windPanel';

/** The title of each section (PHASE5_SPEC 8.4). */
const SECTION_TITLES: Record<SectionId, StringKey> = {
  mode: 'mode.label',
  ropes: 'tab.ropes',
  helm: 'real.station.helm',
  sails: 'trim.label',
  autopilot: 'autopilot.label',
  engine: 'engine.label',
  conditions: 'section.conditions',
  learn: 'tab.learn',
  place: 'place.label',
  anchor: 'anchor.label',
  harbour: 'harbour.title',
  status: 'status.label',
  settings: 'settings.title',
};

/**
 * The panel (the sheet on a phone, PHASE5_SPEC 7.5, 8.5): a list of sections that fold: Mode
 * (first), Ropes, Sails, Autopilot, Engine, Conditions (the old Wind tab), Learn, (M42) Place,
 * (M46) Anchor, (M33) Harbour gear and Settings (last). Mode and Settings are on the phone only
 * (M51, M52); elsewhere their chips open cards. The mode (modes.ts) decides their order. On a
 * phone (M51) five tabs under the sheet's handle (panelTabs.ts) decide which sections show
 * (`TAB_OF` in modes.ts). Since M35 all
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
  /** The mode was chosen in the picker (M52): on a phone the Learn tab in Learn mode, else Controls. */
  modeChosen(): void;
  /** Runs after a section opens or folds, the mode changes, the sheet changes height, or the layout changes. */
  onChange(listener: () => void): void;
}

/** M53: the wheel (the rudder, or one of its two fittings) is selected, with Realistic ropes. */
function wheelSelected(state: AppState): boolean {
  return (
    state.settings.ropesMode === 'realistic' &&
    entryFor(state.selection)?.controlId === 'ctl_rudder'
  );
}

/** Scrolls the section's body to its top (the open section is the only part of a column that scrolls). */
export function scrollToSection(element: HTMLElement): void {
  const content = element.querySelector<HTMLElement>('.section-body');
  if (content && element.offsetParent !== null) content.scrollTop = 0;
}

/** M54: the arrangement saved on this device, completed; the default when nothing usable is saved. */
function readArrangement(): SectionLayout {
  try {
    return completeLayout(parseLayout(window.localStorage.getItem(LAYOUT_KEY)));
  } catch {
    return completeLayout(null);
  }
}

function writeArrangement(arrangement: SectionLayout): void {
  try {
    window.localStorage.setItem(LAYOUT_KEY, serializeLayout(arrangement));
  } catch {
    // Private window or blocked storage: the arrangement is just not remembered.
  }
}

export function createPanel(
  host: HTMLElement,
  store: Store,
  sheet: Sheet,
  layout: LayoutShell,
  settingsContent: HTMLElement,
  modePicker: HTMLElement,
  cards: { mode: ChipCard; settings: ChipCard },
  reopen: boolean,
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
  const tabs = createPanelTabs(store);
  sheet.tabs.append(tabs.element);
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
    mode: { content: [modePicker], explain: false },
    ropes: { content: createRopesTab(store, openLearnEntry, showSection), explain: true },
    helm: { content: [createHelmStation(store)], explain: true },
    sails: { content: [createSailsPanel(store)], explain: true },
    autopilot: { content: [createAutopilotPanel(store, { heading: false })], explain: false },
    engine: { content: [createEnginePanel(store), createThrusterPanel(store)], explain: true },
    conditions: { content: createWindPanel(store), explain: true },
    learn: { content: createLearnTab(store, () => showSection('ropes'), sheet), explain: false },
    place: { content: createPlacePanel(store), explain: true },
    anchor: { content: createAnchorPanel(store), explain: true },
    harbour: { content: createHarbourPanel(store), explain: true },
    status: { content: createStatusPanel(store, showLearnEntry), explain: true },
    settings: { content: [settingsContent], explain: false },
  };
  const sections = new Map<SectionId, SectionView>();
  for (const id of SECTION_IDS) {
    const { content, explain } = built[id];
    const section = createSection(id, t(SECTION_TITLES[id]), content, explain);
    section.element.dataset.tabOf = TAB_OF[id];
    // After the section's own handler has folded or opened it.
    section.element.querySelector('.section-toggle')?.addEventListener('click', () => {
      // M51: a section that is alone on its tab stays open while its tab is shown.
      if (layoutKind === 'stacked' && TAB_OF[id] !== 'controls') section.setOpen(true);
      if (!section.isOpen() && lastControls === id) lastControls = null;
      if (section.isOpen()) {
        openOnly(id);
        // M53: opening the Helm section by its title walks to the helm (code that shows it does not).
        if (id === 'helm' && store.getState().realistic.station !== 'helm') {
          store.dispatch({ type: 'realistic', action: { type: 'station', station: 'helm' } });
        }
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
  // M54: where the sections are on the wide layout. Read once here, written only after a move.
  let arrangement = readArrangement();

  const layoutKindNow = (): LayoutKind => {
    const { mode, wide } = layout.viewport();
    return wide ? 'wide' : mode;
  };
  let layoutKind = layoutKindNow();
  /** M51: the Controls section that was open last (the Controls tab opens it again). */
  let lastControls: SectionId | null = null;

  /** M51: the tab state of the body (`data-tab`, which CSS reads, and the tabpanel's label). */
  function syncBody(tab: PanelTab): void {
    body.dataset.tab = tab;
    if (layoutKind === 'stacked') {
      body.setAttribute('role', 'tabpanel');
      body.setAttribute('aria-labelledby', `panel-tab-${tab}`);
    } else {
      body.removeAttribute('role');
      body.removeAttribute('aria-labelledby');
    }
  }
  body.id = 'panel-body';
  syncBody('controls');

  /**
   * Puts each section where the layout says: on the wide layout the two columns hold the saved
   * arrangement (M54, the same in every mode; Mode and Settings are hidden there and stay in
   * column 1); otherwise everything is in column 1, in the mode's order. Moves the elements,
   * never rebuilds them, and keeps the focus where it was.
   */
  function place(state: AppState): void {
    const mode = MODE_LAYOUTS[state.appMode];
    const wide = layoutKind === 'wide';
    const elementOf = (id: SectionId) => sections.get(id)?.element as HTMLElement;
    const focused = document.activeElement;
    const focusedInside =
      focused instanceof HTMLElement &&
      focused !== document.body &&
      SECTION_IDS.some((id) => elementOf(id).contains(focused));

    second.hidden = !wide;
    // M52: the mode picker and the settings are built once. A phone shows them in the Mode and
    // Settings sections (its tabs); elsewhere the cards of the mode chip and the gear hold them.
    const stacked = layoutKind === 'stacked';
    const home = (id: 'mode' | 'settings', card: ChipCard) =>
      stacked ? elementOf(id).querySelector<HTMLElement>('.section-body') : card.body;
    for (const [content, target] of [
      [modePicker, home('mode', cards.mode)],
      [settingsContent, home('settings', cards.settings)],
    ] as const) {
      if (target && content.parentElement !== target) target.append(content);
    }
    if (wide) {
      second.append(...arrangement.columns[1].map(elementOf));
      body.append(
        ...['mode', ...arrangement.columns[0], 'settings'].map((id) => elementOf(id as SectionId)),
      );
    } else {
      body.append(...mode.order.map(elementOf));
    }
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
    if (TAB_OF[id] === 'controls') lastControls = id;
    // M51: the tab and the open section stay in step; the sheet does not move.
    if (layoutKind === 'stacked') {
      syncBody(TAB_OF[id]);
      tabs.select(TAB_OF[id], false);
    }
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

  /** M54: a section was moved (a drag, the menu or the keys). Keeps and saves the arrangement, places the sections. */
  function applyMove(next: SectionLayout, moved: WideSectionId): void {
    arrangement = next;
    writeArrangement(next);
    place(store.getState());
    const view = sections.get(moved);
    if (!view) return;
    columns.reveal(view.element);
    // The moved section wins in its new column.
    if (view.isOpen()) openOnly(moved);
    else keepOneOpenPerColumn();
    changed();
  }
  createSectionMove({
    sections,
    columns: [body, second],
    layout: () => arrangement,
    apply: applyMove,
    isCollapsed: columns.isCollapsed,
  });

  /**
   * Folds every section at the start (M35); a link that names something to look at opens the
   * section that shows it: a Learn entry in Learn mode, a selected rope or the wheel otherwise.
   */
  function applyOpen(state: AppState, fromLink = false): void {
    for (const id of SECTION_IDS) sections.get(id)?.setOpen(false);
    if (fromLink) {
      if (state.appMode === 'learn' && state.learn !== null) openOnly('learn');
      else if (state.appMode === 'harbour') openHarbourFirst(state);
      else if (state.appMode !== 'learn' && wheelSelected(state)) openOnly('helm');
      else if (state.appMode !== 'learn' && entryFor(state.selection)) openOnly('ropes');
      else if (
        state.appMode !== 'learn' &&
        state.settings.ropesMode === 'realistic' &&
        state.realistic.station === 'helm'
      ) {
        openOnly('helm');
      }
    }
    // A new language reloads the page: the Settings tab it was chosen in is open again (M38, M52;
    // on the side and wide layouts the settings card reopens, settingsMenu.ts).
    if (fromLink && reopen && layoutKind === 'stacked') openOnly('settings');
  }

  /**
   * Harbour mode puts the engine and thrusters first (PHASE7_SPEC 7.5): the Engine section, which
   * holds the thrusters under the lever (owner, PR #99), opens; with Realistic ropes, where the
   * engine and thrusters are in the Helm section (M53), that opens in its place.
   */
  function openHarbourFirst(state: AppState): void {
    openOnly(sectionAvailable('engine', state) ? 'engine' : 'helm');
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
      if (section) section.element.hidden = !sectionAvailable(id, state, layoutKind);
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

  /**
   * M51: a tab was chosen (a tap, a key, `showTab`, code that means "go there"). The tab's one
   * section opens (Controls: the one open there last, or none), a sheet at peek goes to half.
   */
  function onTab(tab: PanelTab): void {
    if (layoutKind !== 'stacked') return;
    syncBody(tab);
    if (tab === 'controls') {
      if (lastControls && sectionAvailable(lastControls, store.getState(), layoutKind)) {
        openOnly(lastControls);
      } else {
        for (const id of SECTION_IDS) sections.get(id)?.setOpen(false);
      }
    } else {
      const only = SECTION_IDS.find((id) => TAB_OF[id] === tab);
      if (only) openOnly(only);
    }
    if (sheet.atPeek()) sheet.setHeight('half');
    body.scrollTop = 0;
    for (const id of SECTION_IDS) {
      if (TAB_OF[id] === tab) scrollToId(id);
    }
    changed();
  }
  tabs.onSelect(onTab);

  function showSection(id: SectionId): void {
    const section = sections.get(id);
    if (!section) return;
    const raise = sheet.atPeek();
    // M51: on a phone the section's tab is shown first.
    if (layoutKind === 'stacked') tabs.select(TAB_OF[id], true);
    openOnly(id);
    // Asked for by name (a link in the view, a "?"): a collapsed column opens to show it.
    columns.reveal(section.element);
    if (raise) sheet.setHeight('half');
    scrollToId(id);
    // The sheet may still be growing: scroll again when it has finished.
    scrollTarget = raise ? id : null;
    changed();
  }

  applyAvailable(store.getState());
  applyModeTitle(store.getState());
  applyMode(store.getState(), true);
  if (layoutKind === 'stacked' && !SECTION_IDS.some((id) => sections.get(id)?.isOpen())) {
    // M51: at the start the Learn tab shows an entry, else the Controls tab (nothing open).
    const state = store.getState();
    const tab = state.appMode === 'learn' && state.learn !== null ? 'learn' : 'controls';
    syncBody(tab);
    tabs.select(tab, false);
  }

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
    // M53 (owner, PR 124): with Realistic ropes the Helm camera also walks you to the helm, so the
    // view and the controls agree; the other camera views leave the station alone.
    if (
      state.camera.preset === 'helm' &&
      previous.camera.preset !== 'helm' &&
      state.settings.ropesMode === 'realistic' &&
      state.realistic.station !== 'helm'
    ) {
      store.dispatch({ type: 'realistic', action: { type: 'station', station: 'helm' } });
    }
    // An entry was opened (also while the Learn section is open: this scrolls it to the top).
    if (state.learn !== previous.learn && state.learn !== null && sections.get('learn')?.isOpen()) {
      scrollToId('learn');
    }
    // A rope selected shows it in the Ropes section, the wheel (Realistic ropes) in the Helm
    // section (M53). Easy and Realistic mode only; in Learn mode "Show on the boat" lights the
    // part up and nothing moves. At peek the quick row
    // shows it; Ropes still opens (M35: it is what the sheet shows when it is pulled up).
    if (
      state.selection !== previous.selection &&
      entryFor(state.selection) &&
      state.appMode !== 'learn' &&
      state.appMode !== 'harbour'
    ) {
      if (wheelSelected(state)) openOnly('helm');
      else {
        openOnly('ropes');
        if (!sheet.atPeek()) revealRopeStrip();
      }
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
    if (now === 'stacked') {
      // M51: the tab of the open section, or Controls.
      const open = SECTION_IDS.find((id) => sections.get(id)?.isOpen());
      const tab = open ? TAB_OF[open] : 'controls';
      syncBody(tab);
      tabs.select(tab, false);
    } else {
      syncBody(tabs.current());
    }
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
        (layoutKind !== 'stacked' || tabs.current() === TAB_OF[id]) &&
        !columns.isCollapsed(section.element),
      );
    },
    openLearnEntry,
    showLearnEntry,
    modeChosen: () => {
      if (layoutKind !== 'stacked') return;
      tabs.select(store.getState().appMode === 'learn' ? 'learn' : 'controls', true);
    },
    onChange: (listener) => listeners.push(listener),
  };
}
