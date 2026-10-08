import { BUILD_INFO, REPO_URL } from '../app/buildInfo';
import type { Store } from '../app/store';
import { shareLink } from '../app/urlSync';
import { entryFor } from '../model/panelEntries';
import { CAMERA_PRESETS, STEP_SIZES } from '../model/settings';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { createRopesTab } from './ropesTab';
import { createWindPanel } from './windPanel';

export const TAB_IDS = ['ropes', 'wind', 'view'] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, StringKey> = {
  ropes: 'tab.ropes',
  wind: 'tab.wind',
  view: 'tab.view',
};

/**
 * The panel: three tabs (Ropes, Wind, View) and the footer line (PHASE1_SPEC 5.2).
 * Ropes: the clutch-bank drawing and the rope controls (Easy mode). Wind: the test-wind dial,
 * speed and presets. View: camera presets, step size, legend and debug toggles, Share, Reset.
 * Selecting a rope or the wheel anywhere (3D view, link) opens the Ropes tab.
 */
export interface Panel {
  activeTab(): TabId;
  onTabChange(listener: (tab: TabId) => void): void;
}

export function createPanel(host: HTMLElement, store: Store): Panel {
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

  panes.get('ropes')?.append(...createRopesTab(store));
  panes.get('wind')?.append(...createWindPanel(store));
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

  store.subscribe((state, previous) => {
    if (state.selection === previous.selection || !entryFor(state.selection)) return;
    if (active !== 'ropes') select('ropes');
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
    }
  }
}

function buildViewTab(store: Store): HTMLElement[] {
  const cameraGroup = el('fieldset', { class: 'field segmented' }, [
    el('legend', {}, [t('cam.label')]),
    el('p', { class: 'hint' }, [t('cam.hint')]),
  ]);
  const cameraOptions = el('div', { class: 'segments segments-grid' });
  const cameraInputs = CAMERA_PRESETS.map((preset) => {
    const input = el('input', { type: 'radio', name: 'camera', value: preset });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setCameraPreset', preset });
    });
    cameraOptions.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`cam.${preset}` as StringKey)])]),
    );
    return { preset, input };
  });
  cameraGroup.append(cameraOptions);

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

  const legendInput = el('input', { type: 'checkbox', id: 'legend-toggle' });
  legendInput.addEventListener('change', () =>
    store.dispatch({ type: 'setLegend', legend: legendInput.checked }),
  );
  const legendField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'legend-toggle' }, [
      legendInput,
      el('span', {}, [t('view.legend.label')]),
    ]),
    el('p', { class: 'hint' }, [t('view.legend.hint')]),
  ]);

  const sync = (state = store.getState(), previous?: typeof state) => {
    if (previous && state.settings === previous.settings && state.camera === previous.camera) {
      return;
    }
    const { settings, camera } = state;
    for (const { preset, input } of cameraInputs) input.checked = preset === camera.preset;
    for (const { step, input } of stepInputs) input.checked = step === settings.step;
    debugInput.checked = settings.debug;
    legendInput.checked = settings.legend;
  };
  store.subscribe(sync);
  sync();

  return [
    cameraGroup,
    stepGroup,
    ...buildShareAndReset(store),
    legendField,
    debugField,
    el('p', { class: 'placeholder' }, [t('view.placeholder')]),
  ];
}

/** How long Reset waits for the second tap, ms. */
const RESET_ARM_MS = 4000;

/**
 * Share copies a link to exactly what is shown (PHASE1_SPEC 9.2); if the browser does not allow
 * copying, the link is shown selected so it can be copied by hand. Reset asks for a second tap,
 * so a stray tap does not lose the settings.
 */
function buildShareAndReset(store: Store): HTMLElement[] {
  const status = el('p', { class: 'hint action-status', 'aria-live': 'polite' });
  const linkField = el('input', {
    type: 'text',
    readonly: '',
    class: 'share-link',
    'aria-label': t('view.share.fieldLabel'),
    'data-testid': 'share-link',
    hidden: '',
  });
  const share = el(
    'button',
    { type: 'button', class: 'action-button', 'data-testid': 'share-button' },
    [t('view.share.button')],
  );
  share.addEventListener('click', () => {
    const link = shareLink(store.getState());
    linkField.value = link;
    const manual = () => {
      linkField.hidden = false;
      linkField.focus();
      linkField.select();
      status.textContent = t('view.share.manual');
    };
    if (!navigator.clipboard?.writeText) {
      manual();
      return;
    }
    navigator.clipboard.writeText(link).then(() => {
      linkField.hidden = true;
      status.textContent = t('view.share.copied');
    }, manual);
  });

  const reset = el(
    'button',
    { type: 'button', class: 'action-button action-reset', 'data-testid': 'reset-button' },
    [t('view.reset.button')],
  );
  let armed: number | undefined;
  const disarm = () => {
    window.clearTimeout(armed);
    armed = undefined;
    reset.textContent = t('view.reset.button');
    reset.removeAttribute('data-armed');
  };
  reset.addEventListener('click', () => {
    if (armed === undefined) {
      reset.textContent = t('view.reset.confirm');
      reset.setAttribute('data-armed', 'true');
      armed = window.setTimeout(disarm, RESET_ARM_MS);
      return;
    }
    disarm();
    store.dispatch({ type: 'reset' });
    linkField.hidden = true;
    status.textContent = t('view.reset.done');
  });

  return [
    el('div', { class: 'field' }, [
      el('div', { class: 'actions' }, [share, reset]),
      el('p', { class: 'hint' }, [t('view.share.hint')]),
      linkField,
      status,
    ]),
  ];
}
