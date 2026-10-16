import { BUILD_INFO, REPO_URL } from '../app/buildInfo';
import type { Store } from '../app/store';
import { serializeUrlState } from '../app/urlState';
import { shareLink } from '../app/urlSync';
import { LANGUAGES, languageName } from '../model/languages';
import { DETAIL_LEVELS, STEP_SIZES } from '../model/settings';
import { closeOpenMenus } from './chipMenu';
import { el } from './dom';
import { t, type StringKey } from './i18n';

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
function gearIcon(): SVGSVGElement {
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

/**
 * The gear in the chip row and the settings dialog it opens (PHASE5_SPEC 6.4): everything the
 * View tab held except the camera, then About (disclaimer, version, source). While the dialog is
 * open, the view and the panel are inert, so it closes with the × or Escape.
 */
export function createSettingsMenu(row: HTMLElement, root: HTMLElement, store: Store): void {
  const gear = el(
    'button',
    {
      type: 'button',
      class: 'view-chip settings-button',
      'data-testid': 'settings-button',
      'aria-label': t('settings.button'),
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
    },
    [],
  );
  gear.append(gearIcon());
  row.append(gear);

  const close = el(
    'button',
    {
      type: 'button',
      class: 'settings-close',
      'data-testid': 'settings-close',
      'aria-label': t('settings.close'),
    },
    ['×'],
  );
  const dialog = el(
    'div',
    {
      class: 'settings-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'settings-title',
      'data-testid': 'settings-dialog',
    },
    [
      el('div', { class: 'settings-head' }, [
        el('h2', { id: 'settings-title' }, [t('settings.title')]),
        close,
      ]),
      el('div', { class: 'settings-body' }, buildSettingsBody(store)),
      el('h3', { class: 'settings-about' }, [t('settings.about')]),
      el('footer', { class: 'footer' }, [
        el('p', { class: 'disclaimer', 'data-testid': 'disclaimer' }, [t('footer.disclaimer')]),
        el('span', { class: 'version', 'data-testid': 'build-version' }, [
          t('footer.version', { hash: BUILD_INFO.shortHash, date: BUILD_INFO.date }),
        ]),
        el('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, [t('footer.source')]),
      ]),
    ],
  );
  dialog.hidden = true;
  root.append(dialog);

  // The view and the panel stay behind the dialog: not tappable, not tabbable, not read out.
  const behind = () => [...root.querySelectorAll(':scope > .view, :scope > .panel')];
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    setOpen(false);
  };

  function setOpen(open: boolean): void {
    if (open === !dialog.hidden) return;
    dialog.hidden = !open;
    gear.setAttribute('aria-expanded', String(open));
    for (const region of behind()) region.toggleAttribute('inert', open);
    if (open) {
      closeOpenMenus();
      document.addEventListener('keydown', onKey, true);
      close.focus();
    } else {
      document.removeEventListener('keydown', onKey, true);
      gear.focus();
    }
  }

  gear.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
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
    legendInput.checked = settings.legend;
    labelsInput.checked = settings.labels;
    timeBarInput.checked = settings.timeBar;
    clockInput.checked = settings.clock;
    miniMapInput.checked = settings.miniMap;
  };
  store.subscribe(sync);
  sync();

  return [
    languageGroup,
    labelsField,
    timeBarField,
    clockField,
    miniMapField,
    stepGroup,
    detailGroup,
    ...buildShareAndReset(store),
    legendField,
    debugField,
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
