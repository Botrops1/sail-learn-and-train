import type { Store } from '../app/store';
import { entryFor } from '../model/panelEntries';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { createLearnTab } from './learnTab';
import { createRopesTab } from './ropesTab';
import type { Sheet } from './sheet';
import { createWindPanel } from './windPanel';

export const TAB_IDS = ['ropes', 'wind', 'learn'] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, StringKey> = {
  ropes: 'tab.ropes',
  wind: 'tab.wind',
  learn: 'tab.learn',
};

/**
 * The panel (the sheet on a phone, PHASE5_SPEC 7.5): three tabs (Ropes, Wind, Learn). The old View tab and the footer moved to the
 * settings dialog and the camera to the camera chip (PHASE5_SPEC 6.4).
 * Ropes: the clutch-bank drawing and the rope controls (Easy mode). Wind: the test-wind dial,
 * speed and presets. Learn: the glossary.
 * Selecting a rope or the wheel anywhere (3D view, link) opens the Ropes tab.
 */
export interface Panel {
  activeTab(): TabId;
  /** Opens a tab (the instrument strip opens the Wind tab). */
  showTab(id: TabId): void;
  onTabChange(listener: (tab: TabId) => void): void;
}

export function createPanel(host: HTMLElement, store: Store, sheet: Sheet): Panel {
  /** A tab the user chose raises a sheet that sits at its lowest height. */
  const raiseSheet = () => {
    if (sheet.atPeek()) sheet.setHeight('half');
  };
  const tabList = el('div', {
    class: 'tabs',
    role: 'tablist',
    'aria-label': t('panel.tabsLabel'),
  });
  const body = el('div', { class: 'panel-body' });

  const tabs = new Map<TabId, HTMLButtonElement>();
  const panes = new Map<TabId, HTMLElement>();
  const tabListeners: ((tab: TabId) => void)[] = [];
  let active: TabId = 'ropes';

  for (const id of TAB_IDS) {
    const tab = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `tab-${id}`,
        class: 'tab',
        'data-testid': `tab-${id}`,
        'aria-controls': `pane-${id}`,
      },
      [t(TAB_LABELS[id])],
    );
    const pane = el('div', {
      role: 'tabpanel',
      id: `pane-${id}`,
      class: 'pane',
      'aria-labelledby': `tab-${id}`,
      tabindex: '0',
    });
    tab.addEventListener('click', () => {
      select(id);
      raiseSheet();
    });
    tab.addEventListener('keydown', (event) => onTabKey(event, id));
    tabs.set(id, tab);
    panes.set(id, pane);
    tabList.append(tab);
    body.append(pane);
  }

  panes.get('ropes')?.append(...createRopesTab(store, () => select('learn')));
  panes.get('wind')?.append(...createWindPanel(store));
  panes.get('learn')?.append(...createLearnTab(store, (tab) => select(tab)));

  sheet.head.append(tabList);
  host.append(body);
  select('ropes');
  if (store.getState().learn !== null) select('learn');

  store.subscribe((state, previous) => {
    // An entry was opened (also while the Learn tab is open: this scrolls it to the top).
    if (state.learn !== previous.learn && state.learn !== null) select('learn');
    // A rope or the wheel selected opens the Ropes tab, except from the Learn tab: "Show on the
    // boat" lights the part up and stays there.
    if (state.selection === previous.selection || !entryFor(state.selection)) return;
    if (active !== 'ropes' && active !== 'learn') select('ropes');
  });

  function select(id: TabId, focus = false): void {
    for (const tabId of TAB_IDS) {
      const current = tabId === id;
      const tab = tabs.get(tabId);
      const pane = panes.get(tabId);
      if (!tab || !pane) continue;
      tab.setAttribute('aria-selected', String(current));
      tab.tabIndex = current ? 0 : -1;
      pane.hidden = !current;
      if (current && focus) tab.focus();
    }
    body.scrollTop = 0;
    if (id !== active) {
      active = id;
      tabListeners.forEach((listener) => listener(id));
    }
  }

  return {
    activeTab: () => active,
    showTab: (id) => {
      select(id);
      raiseSheet();
    },
    onTabChange: (listener) => tabListeners.push(listener),
  };

  function onTabKey(event: KeyboardEvent, id: TabId): void {
    const index = TAB_IDS.indexOf(id);
    const last = TAB_IDS.length - 1;
    const target: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = TAB_IDS[target[event.key] ?? -1];
    if (next) {
      event.preventDefault();
      select(next, true);
      raiseSheet();
    }
  }
}
