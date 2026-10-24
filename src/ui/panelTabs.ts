import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import { gearIcon } from './settingsMenu';

/**
 * The phone's tab row (M51, issue #100 item 7), under the sheet's handle: Mode (named after the
 * mode in force), Controls, Conditions, Learn ("?") and Settings (the gear). It only says which
 * tab is chosen; `panel.ts` decides what each tab shows (`TAB_OF` in `modes.ts`) and moves the
 * sheet. UI state: never in the store or the link.
 */
export const PANEL_TABS = ['mode', 'controls', 'conditions', 'learn', 'settings'] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

export interface PanelTabs {
  /** The tab row, `div.panel-tabs[role=tablist]`. */
  readonly element: HTMLElement;
  current(): PanelTab;
  /**
   * Shows the tab. notify = true (a tap, a key, `showTab`, code that means "go there"): runs the
   * listeners, also for the tab already shown. notify = false (`openOnly`, a layout change): only
   * the tab state (`aria-selected`, `data-tab`), no listeners, so the sheet does not move.
   */
  select(tab: PanelTab, notify?: boolean): void;
  onSelect(listener: (tab: PanelTab, previous: PanelTab) => void): void;
}

export function createPanelTabs(store: Store): PanelTabs {
  let current: PanelTab = 'controls';
  const listeners: ((tab: PanelTab, previous: PanelTab) => void)[] = [];

  const modeLabel = el('span', { class: 'panel-tab-label' });
  const learnMark = el('span', { class: 'panel-tab-q', 'aria-hidden': 'true' }, ['?']);
  const content: Record<PanelTab, Node> = {
    mode: modeLabel,
    controls: document.createTextNode(t('tab.controls')),
    conditions: document.createTextNode(t('section.conditions')),
    learn: learnMark,
    settings: gearIcon(),
  };
  const labels: Partial<Record<PanelTab, string>> = {
    learn: t('tab.learn'),
    settings: t('settings.title'),
  };

  const buttons = PANEL_TABS.map((tab) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'panel-tab',
        role: 'tab',
        id: `panel-tab-${tab}`,
        'data-tab': tab,
        'data-testid': `panel-tab-${tab}`,
        'aria-selected': 'false',
        'aria-controls': 'panel-body',
        tabindex: '-1',
      },
      [content[tab]],
    );
    const label = labels[tab];
    if (label) button.setAttribute('aria-label', label);
    return { tab, button };
  });

  const element = el(
    'div',
    { class: 'panel-tabs', role: 'tablist', 'aria-label': t('tabs.label'), 'data-tab': current },
    buttons.map(({ button }) => button),
  );

  function select(tab: PanelTab, notify = false): void {
    const previous = current;
    current = tab;
    element.dataset.tab = tab;
    for (const { tab: id, button } of buttons) {
      button.setAttribute('aria-selected', String(id === tab));
      button.tabIndex = id === tab ? 0 : -1;
    }
    if (notify) listeners.forEach((listener) => listener(tab, previous));
  }

  for (const { tab, button } of buttons) {
    button.addEventListener('click', () => select(tab, true));
  }
  element.addEventListener('keydown', (event) => {
    const index = PANEL_TABS.indexOf(current);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % PANEL_TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + PANEL_TABS.length) % PANEL_TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = PANEL_TABS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const tab = PANEL_TABS[next] as PanelTab;
    select(tab, true);
    buttons[next]?.button.focus();
  });

  // The mode tab reads the mode in force ("Easy"), not the word "Mode".
  const syncMode = () => {
    const name = t(`mode.${store.getState().appMode}` as const);
    modeLabel.textContent = name;
    buttons[0]?.button.setAttribute('aria-label', t('mode.section', { name }));
  };
  store.subscribe((state, previous) => {
    if (state.appMode !== previous.appMode) syncMode();
  });
  syncMode();
  select(current);

  return {
    element,
    current: () => current,
    select,
    onSelect: (listener) => listeners.push(listener),
  };
}
