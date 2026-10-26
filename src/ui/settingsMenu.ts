import { BUILD_INFO, REPO_URL } from '../app/buildInfo';
import { makeSetupFile, readSetupFile, setupFileName } from '../app/setupFile';
import type { Store } from '../app/store';
import { serializeUrlState } from '../app/urlState';
import { shareLink } from '../app/urlSync';
import { boat, boatId, boatName } from '../model/boat';
import { makeBoatProfile } from '../model/boatProfile';
import { LANGUAGES, languageName } from '../model/languages';
import { DETAIL_LEVELS, STEP_SIZES } from '../model/settings';
import { createChipCard, type ChipCard } from './chipCard';
import { COLUMNS_KEY } from './columnWidths';
import { readDeviceSettings, writeDeviceSettings } from './deviceSettings';
import { el } from './dom';
import { downloadJson, pickJsonFile } from './files';
import { t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';
import { LAYOUT_KEY } from './sectionLayout';
import { FOLD_KEY } from './timeBar';

/** The guide to making a boat profile (M57). */
const BOAT_GUIDE_URL =
  'https://github.com/Botrops1/sail-learn-and-train/blob/main/docs/BOAT_PROFILE.md';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** The gear: eight teeth round a ring (PHASE5_SPEC 6.4). */
export function gearIcon(): SVGSVGElement {
  const icon = svg('svg', {
    viewBox: '-12 -12 24 24',
    width: '24',
    height: '24',
    'aria-hidden': 'true',
    class: 'gear-icon',
  });
  const teeth = svg('g', { fill: 'currentColor' });
  for (let i = 0; i < 8; i += 1) {
    teeth.append(
      svg('rect', {
        x: '-2',
        y: '-11',
        width: '4',
        height: '5',
        rx: '1',
        transform: `rotate(${i * 45})`,
      }),
    );
  }
  icon.append(
    teeth,
    svg('circle', { r: '6.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '3' }),
    svg('circle', { r: '2.2', fill: 'currentColor' }),
  );
  return icon;
}

/** Set before the page reloads for a new language, so the Settings tab or card is open again afterwards (M38, M52). */
const OPEN_AFTER_RELOAD_KEY = 'sail.openSectionAfterReload';

/** The section to open at the start because the page reloaded from it (once), or null. */
export function takeOpenAfterReload(): string | null {
  try {
    const id = window.sessionStorage.getItem(OPEN_AFTER_RELOAD_KEY);
    window.sessionStorage.removeItem(OPEN_AFTER_RELOAD_KEY);
    return id;
  } catch {
    return null;
  }
}

function openAfterReload(id: string): void {
  try {
    window.sessionStorage.setItem(OPEN_AFTER_RELOAD_KEY, id);
  } catch {
    // Private windows may refuse storage: the section simply starts folded.
  }
}

/**
 * Everything the settings hold (PHASE5_SPEC 6.4): the controls (everything the View tab held
 * except the camera), then About (disclaimer, version, source). Built once. On a phone it is the
 * body of the Settings section (the Settings tab); elsewhere the body of the settings card the
 * gear opens (`createSettingsMenu`). `panel.ts` moves it.
 */
export function createSettingsContent(store: Store): HTMLElement {
  return el('div', { class: 'settings-content', 'data-testid': 'settings-content' }, [
    el('div', { class: 'settings-body' }, buildSettingsBody(store)),
    el('h3', { class: 'settings-about' }, [t('settings.about')]),
    el('footer', { class: 'footer' }, [
      el('p', { class: 'disclaimer', 'data-testid': 'disclaimer' }, [t('footer.disclaimer')]),
      el('span', { class: 'version', 'data-testid': 'build-version' }, [
        t('footer.version', { hash: BUILD_INFO.shortHash, date: BUILD_INFO.date }),
      ]),
      el('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, [t('footer.source')]),
    ]),
  ]);
}

/**
 * The gear in the chip row and the settings card it opens (PHASE5_SPEC 6.4; M52, PHASE8_SPEC
 * 10.3) on the side and wide layouts; on a phone the gear is hidden (the Settings tab). The card
 * is not modal. `reopen` opens it at the start (the page reloaded for a new language). Returns the
 * card; `panel.ts` puts the settings into its body.
 */
export function createSettingsMenu(
  row: HTMLElement,
  layout: LayoutShell,
  reopen: boolean,
): ChipCard {
  const gear = el(
    'button',
    {
      type: 'button',
      class: 'view-chip settings-button',
      'data-testid': 'settings-button',
      'aria-label': t('settings.button'),
    },
    [],
  );
  gear.append(gearIcon());
  row.append(gear);
  const card = createChipCard(gear, t('settings.title'), 'settings-card', 'settings-title');

  // A layout change closes the card.
  let kind = `${layout.viewport().mode}${layout.viewport().wide}`;
  layout.onChange((viewport) => {
    const now = `${viewport.mode}${viewport.wide}`;
    if (now !== kind) card.close(false);
    kind = now;
  });
  if (reopen && layout.viewport().mode !== 'stacked') card.open();
  return card;
}

function buildSettingsBody(store: Store): HTMLElement[] {
  // Language (M23, PHASE4_SPEC 9.4): every element is built once with t(), so choosing a language
  // reloads the page on the same link with `lang` changed.
  const languageGroup = el(
    'fieldset',
    { class: 'field segmented', 'data-testid': 'language-setting' },
    [
      el('legend', {}, [t('view.language.label')]),
      el('p', { class: 'hint' }, [t('view.language.hint')]),
    ],
  );
  const languageOptions = el('div', { class: 'segments' });
  const languageInputs = LANGUAGES.map((code) => {
    const input = el('input', {
      type: 'radio',
      name: 'language',
      value: code,
      'data-testid': `language-${code}`,
    });
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const state = store.getState();
      if (code === state.settings.language) return;
      const link = serializeUrlState({ ...state, settings: { ...state.settings, language: code } });
      // In the Settings section or the card the page comes back with it open (M38, M52).
      if (input.closest('[data-section="settings"], .chip-card')) openAfterReload('settings');
      window.location.replace(`${window.location.pathname}${link}${window.location.hash}`);
    });
    languageOptions.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [languageName(code)])]),
    );
    return { code, input };
  });
  languageGroup.append(languageOptions);

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

  const detailGroup = el('fieldset', { class: 'field segmented' }, [
    el('legend', {}, [t('view.detail.label')]),
    el('p', { class: 'hint' }, [t('view.detail.hint')]),
  ]);
  const detailOptions = el('div', { class: 'segments' });
  const detailInputs = DETAIL_LEVELS.map((detail) => {
    const input = el('input', { type: 'radio', name: 'detail', value: detail });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setDetail', detail });
    });
    detailOptions.append(
      el('label', { class: 'segment' }, [
        input,
        el('span', {}, [t(`view.detail.${detail}` as StringKey)]),
      ]),
    );
    return { detail, input };
  });
  detailGroup.append(detailOptions);

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

  const labelsInput = el('input', { type: 'checkbox', id: 'labels-toggle' });
  labelsInput.addEventListener('change', () =>
    store.dispatch({ type: 'setLabels', labels: labelsInput.checked }),
  );
  const labelsField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'labels-toggle' }, [
      labelsInput,
      el('span', {}, [t('view.labels.label')]),
    ]),
    el('p', { class: 'hint' }, [t('view.labels.hint')]),
  ]);

  const timeBarInput = el('input', { type: 'checkbox', id: 'time-bar-toggle' });
  timeBarInput.addEventListener('change', () =>
    store.dispatch({ type: 'setTimeBar', timeBar: timeBarInput.checked }),
  );
  const timeBarField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'time-bar-toggle' }, [
      timeBarInput,
      el('span', {}, [t('view.timeBar.label')]),
    ]),
    el('p', { class: 'hint' }, [t('view.timeBar.hint')]),
  ]);

  const clockInput = el('input', {
    type: 'checkbox',
    id: 'clock-toggle',
    'data-testid': 'clock-switch',
  });
  clockInput.addEventListener('change', () =>
    store.dispatch({ type: 'setClockShown', shown: clockInput.checked }),
  );
  const clockField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'clock-toggle' }, [
      clockInput,
      el('span', {}, [t('view.clock.label')]),
    ]),
    el('p', { class: 'hint' }, [t('view.clock.hint')]),
  ]);

  const miniMapInput = el('input', {
    type: 'checkbox',
    id: 'mini-map-toggle',
    'data-testid': 'mini-map-switch',
  });
  miniMapInput.addEventListener('change', () =>
    store.dispatch({ type: 'setMiniMap', miniMap: miniMapInput.checked }),
  );
  const miniMapField = el('div', { class: 'field' }, [
    el('label', { class: 'toggle', for: 'mini-map-toggle' }, [
      miniMapInput,
      el('span', {}, [t('settings.miniMap.label')]),
    ]),
    el('p', { class: 'hint' }, [t('settings.miniMap.hint')]),
  ]);

  const sync = (state = store.getState(), previous?: typeof state) => {
    if (previous && state.settings === previous.settings) return;
    const { settings } = state;
    for (const { code, input } of languageInputs) input.checked = code === settings.language;
    for (const { step, input } of stepInputs) input.checked = step === settings.step;
    for (const { detail, input } of detailInputs) input.checked = detail === settings.detail;
    debugInput.checked = settings.debug;
    labelsInput.checked = settings.labels;
    timeBarInput.checked = settings.timeBar;
    clockInput.checked = settings.clock;
    miniMapInput.checked = settings.miniMap;
  };
  store.subscribe(sync);
  sync();

  return [
    languageGroup,
    buildBoatField(),
    labelsField,
    timeBarField,
    clockField,
    miniMapField,
    stepGroup,
    detailGroup,
    buildLayoutReset(store),
    buildSetupFile(store),
    ...buildShareAndReset(store),
    debugField,
  ];
}

/** How long a two-tap button waits for the second tap, ms. */
const RESET_ARM_MS = 4000;

/**
 * A button that asks for a second tap (M54: Reset, Reset layout; later M58's Remove): the first
 * tap shows the confirm label and sets `data-armed="true"`, the second runs `onConfirm`; after
 * `RESET_ARM_MS` without one the idle label comes back.
 */
export function createConfirmButton(
  button: HTMLButtonElement,
  labels: { idle: string; confirm: string },
  onConfirm: () => void,
): void {
  let armed: number | undefined;
  const disarm = () => {
    window.clearTimeout(armed);
    armed = undefined;
    button.textContent = labels.idle;
    button.removeAttribute('data-armed');
  };
  button.addEventListener('click', () => {
    if (armed === undefined) {
      button.textContent = labels.confirm;
      button.setAttribute('data-armed', 'true');
      armed = window.setTimeout(disarm, RESET_ARM_MS);
      return;
    }
    disarm();
    onConfirm();
  });
}

/**
 * M57 (PHASE8_SPEC 15.4): Boat. The boat's name, a button that downloads its profile (every
 * number of the boat in one file) and a link to the guide for making a similar boat.
 */
function buildBoatField(): HTMLElement {
  const download = el(
    'button',
    { type: 'button', class: 'action-button', 'data-testid': 'boat-download' },
    [t('boat.download')],
  );
  download.addEventListener('click', () => {
    downloadJson(`${boatId}.boat.json`, makeBoatProfile(boatId, boatName, boat));
  });
  return el('div', { class: 'field', 'data-testid': 'boat-field' }, [
    el('p', { class: 'field-title' }, [t('boat.label')]),
    el('p', { class: 'boat-name', 'data-testid': 'boat-name' }, [boatName]),
    el('div', { class: 'actions' }, [download]),
    el('p', { class: 'hint' }, [t('boat.hint')]),
    el(
      'a',
      {
        class: 'boat-guide',
        href: BOAT_GUIDE_URL,
        target: '_blank',
        rel: 'noopener',
        'data-testid': 'boat-guide',
      },
      [t('boat.guide')],
    ),
  ]);
}

/**
 * M56 (PHASE8_SPEC 14.4): Your setup. Save writes the link and what this device remembers into a
 * file; Load reads one back, writes the device part to storage and loads the page again on the
 * file's link (a full load, no history entry: the device settings are read at the start). The
 * file input has one permanent `change` listener; the Load button only opens the file chooser.
 */
function buildSetupFile(store: Store): HTMLElement {
  const status = el('p', {
    class: 'hint',
    role: 'status',
    'aria-live': 'polite',
    'data-testid': 'setup-status',
  });
  const save = el(
    'button',
    { type: 'button', class: 'action-button', 'data-testid': 'setup-save' },
    [t('setup.save')],
  );
  const load = el(
    'button',
    { type: 'button', class: 'action-button', 'data-testid': 'setup-load' },
    [t('setup.load')],
  );
  const input = el('input', {
    type: 'file',
    accept: '.json,application/json',
    hidden: '',
    tabindex: '-1',
    'aria-hidden': 'true',
    'data-testid': 'setup-file',
  });

  save.addEventListener('click', () => {
    const now = new Date();
    const name = setupFileName(now);
    // The address bar can lag the store by 300 ms, so the link is built from the store.
    const link = serializeUrlState(store.getState());
    downloadJson(name, makeSetupFile(link, readDeviceSettings(), now.toISOString()));
    status.textContent = t('setup.saved', { name });
  });
  load.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    void (async () => {
      const text = await pickJsonFile(input);
      if (text === null) return;
      if (text === 'tooBig') {
        status.textContent = t('setup.problem.tooBig');
        return;
      }
      const read = readSetupFile(text);
      if (!read.ok) {
        status.textContent = t(`setup.problem.${read.problem}` as StringKey);
        return;
      }
      writeDeviceSettings(read.device);
      window.location.replace(`${window.location.pathname}${read.link}`);
    })();
  });

  return el('div', { class: 'field', 'data-testid': 'setup-field' }, [
    el('p', { class: 'field-title' }, [t('setup.label')]),
    el('div', { class: 'actions' }, [save, load]),
    input,
    el('p', { class: 'hint' }, [t('setup.hint')]),
    status,
  ]);
}

/**
 * M54 (PHASE8_SPEC 12.2): Reset layout puts the sections, the column widths and folds and the time
 * bar back as at the start. Built always; CSS shows it on the wide layout only. The page loads
 * again, as a change of language does, with the Settings reopened.
 */
function buildLayoutReset(store: Store): HTMLElement {
  const button = el(
    'button',
    {
      type: 'button',
      class: 'action-button action-reset',
      'data-testid': 'layout-reset',
    },
    [t('layout.reset')],
  );
  createConfirmButton(
    button,
    { idle: t('layout.reset'), confirm: t('layout.resetConfirm') },
    () => {
      try {
        for (const key of [LAYOUT_KEY, COLUMNS_KEY, FOLD_KEY]) window.localStorage.removeItem(key);
      } catch {
        // Private window: nothing was remembered.
      }
      openAfterReload('settings');
      // The address bar can lag the store by 300 ms, so the link is built from the store.
      const link = serializeUrlState(store.getState());
      window.location.replace(`${window.location.pathname}${link}${window.location.hash}`);
    },
  );
  return el('div', { class: 'field', 'data-testid': 'layout-field' }, [
    el('p', { class: 'field-title' }, [t('layout.label')]),
    el('div', { class: 'actions' }, [button]),
    el('p', { class: 'hint' }, [t('layout.resetHint')]),
  ]);
}

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
  createConfirmButton(
    reset,
    { idle: t('view.reset.button'), confirm: t('view.reset.confirm') },
    () => {
      store.dispatch({ type: 'reset' });
      linkField.hidden = true;
      status.textContent = t('view.reset.done');
    },
  );

  return [
    el('div', { class: 'field' }, [
      el('div', { class: 'actions' }, [share, reset]),
      el('p', { class: 'hint' }, [t('view.share.hint')]),
      linkField,
      status,
    ]),
  ];
}
