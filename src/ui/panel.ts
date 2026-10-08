import { BUILD_INFO, REPO_URL } from '../app/buildInfo';
import type { Store } from '../app/store';
import { STEP_SIZES } from '../model/settings';
import { el } from './dom';
import { t, type StringKey } from './i18n';

export const TAB_IDS = ['ropes', 'wind', 'view'] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, StringKey> = {
  ropes: 'tab.ropes',
  wind: 'tab.wind',
  view: 'tab.view',
};

/**
 * The panel: three tabs (Ropes, Wind, View) and the footer line (PHASE1_SPEC 5.2).
 * In M0 the Ropes and Wind tabs are placeholders; View has the step size and debug toggle.
 */
export function createPanel(host: HTMLElement, store: Store): void {
  const tabList = el('div', {
    class: 'tabs',
    role: 'tablist',
    'aria-label': t('panel.tabsLabel'),
  });
  const body = el('div', { class: 'panel-body' });

  const tabs = new Map<TabId, HTMLButtonElement>();
  const panes = new Map<TabId, HTMLElement>();

  for (const id of TAB_IDS) {
    const tab = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `tab-${id}`,
        class: 'tab',
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
    tab.addEventListener('click', () => select(id));
    tab.addEventListener('keydown', (event) => onTabKey(event, id));
    tabs.set(id, tab);
    panes.set(id, pane);
    tabList.append(tab);
    body.append(pane);
  }

  panes.get('ropes')?.append(el('p', { class: 'placeholder' }, [t('ropes.placeholder')]));
  panes.get('wind')?.append(el('p', { class: 'placeholder' }, [t('wind.placeholder')]));
  panes.get('view')?.append(...buildViewTab(store));

  const footer = el('footer', { class: 'footer' }, [
    el('span', { class: 'version', 'data-testid': 'build-version' }, [
      t('footer.version', { hash: BUILD_INFO.shortHash, date: BUILD_INFO.date }),
    ]),
    el('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, [t('footer.source')]),
  ]);
  body.append(footer);

  host.append(tabList, body);
  select('ropes');

  function select(id: TabId, focus = false): void {
    for (const tabId of TAB_IDS) {
      const active = tabId === id;
      const tab = tabs.get(tabId);
      const pane = panes.get(tabId);
      if (!tab || !pane) continue;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      pane.hidden = !active;
      if (active && focus) tab.focus();
    }
    body.scrollTop = 0;
  }

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
    }
  }
}

function buildViewTab(store: Store): HTMLElement[] {
  const stepGroup = el('fieldset', { class: 'field segmented' }, [
    el('legend', {}, [t('view.step.label')]),
    el('p', { class: 'hint' }, [t('view.step.hint')]),
  ]);
  const stepOptions = el('div', { class: 'segments' });
  const stepInputs = STEP_SIZES.map((step) => {
    const input = el('input', { type: 'radio', name: 'step', value: String(step) });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setStep', step });
    });
    stepOptions.append(
      el('label', { class: 'segment' }, [
        input,
        el('span', {}, [t('view.step.option', { value: step })]),
      ]),
    );
    return { step, input };
  });
  stepGroup.append(stepOptions);

  const debugInput = el('input', { type: 'checkbox', id: 'debug-toggle' });
  debugInput.addEventListener('change', () =>
    store.dispatch({ type: 'setDebug', debug: debugInput.checked }),
  );
  const debugField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'debug-toggle' }, [
      debugInput,
      el('span', {}, [t('view.debug.label')]),
    ]),
    el('p', { class: 'hint' }, [t('view.debug.hint')]),
  ]);

  const sync = () => {
    const { settings } = store.getState();
    for (const { step, input } of stepInputs) input.checked = step === settings.step;
    debugInput.checked = settings.debug;
  };
  store.subscribe(sync);
  sync();

  return [stepGroup, debugField, el('p', { class: 'placeholder' }, [t('view.placeholder')])];
}
