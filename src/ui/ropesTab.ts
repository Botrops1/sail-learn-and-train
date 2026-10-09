import type { AppState, Store } from '../app/store';
import { entryFor, panelEntries, type PanelEntry } from '../model/panelEntries';
import { partInfo } from '../model/registry';
import { SCENE } from '../render3d/sceneConfig';
import { ROPES_MODES } from '../model/settings';
import { createClutchDrawing } from './clutchDrawing';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import {
  CONTROL_VIEWS,
  createControl,
  stateText,
  valueText,
  type ControlView,
} from './ropeControls';
import { createRealisticPanel } from './realisticPanel';
import { createRopeLegend, ropeColorKey, ROPE_DASH } from './ropeLegend';
import { setText } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** True if the Ropes tab shows this selection in its strip (the info card can then stay away). */
export function ropesTabShows(selection: string | null): boolean {
  return entryFor(selection) !== undefined;
}

/**
 * The Ropes tab (PHASE1_SPEC 7.2), Easy mode: the clutch-bank drawing; under it the strip for
 * the selected rope (its slider, or an info line for a rope that is not adjusted), sticky in the
 * stacked layout; then a compact list of all ropes, so every control is reachable without the
 * drawing; and the rope colour legend.
 *
 * The selection is the store's: tapping a clutch, a list row or a rope in 3D selects the same
 * thing everywhere. Realistic mode (settings.ropesMode, M4b) shows the stations instead, with
 * clutches and winches worked by hand (realisticPanel.ts); the switch at the top changes mode.
 */

/** Hints shown with an entry, besides its shared-control hint. */
const ENTRY_HINTS: Partial<Record<string, StringKey[]>> = {
  ctl_main_furl: ['furl.hint'],
  ctl_jib_sheet: ['jib.hint'],
  ctl_jib_furl: ['jib.hint'],
};

interface EntryView {
  entry: PanelEntry;
  view?: ControlView;
  name: string;
  /** The block in the strip. */
  block: HTMLElement;
  refresh(state: AppState): void;
  /** The row in the compact list. */
  row: HTMLButtonElement;
  rowValue: HTMLElement;
}

function swatch(entry: PanelEntry): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('viewBox', '0 0 10 28');
  root.setAttribute('class', 'rope-item-swatch');
  root.setAttribute('aria-hidden', 'true');
  const rope = entry.partIds.find((id) => id.startsWith('rope_'));
  if (rope) {
    const key = ropeColorKey(rope);
    const line = document.createElementNS(SVG_NS, 'line');
    for (const [name, value] of Object.entries({
      x1: '5',
      y1: '1',
      x2: '5',
      y2: '27',
      stroke: SCENE.ropes.colors[key],
      'stroke-width': '4.5',
      'stroke-dasharray': ROPE_DASH[key],
    })) {
      line.setAttribute(name, value);
    }
    root.append(line);
  }
  return root;
}

/** "One rope, two ends" / "These work against each other", with the details on a tap. */
function sharedHint(entry: PanelEntry): HTMLElement[] {
  if (!entry.shared) return [];
  return [
    el('details', { class: 'shared-hint', 'data-testid': 'shared-hint' }, [
      el('summary', {}, [t(`ropes.shared.${entry.shared}`)]),
      el('p', {}, [t(`ropes.sharedDetail.${entry.key}` as StringKey)]),
    ]),
  ];
}

/** What the rope does (the registry's one-liner) and the entry's longer hints, folded. */
function moreAbout(entry: PanelEntry): HTMLElement {
  const short = partInfo(entry.selectId)?.short ?? '';
  return el('details', { class: 'strip-more' }, [
    el('summary', {}, [t('ropes.strip.more')]),
    ...(short ? [el('p', {}, [short])] : []),
    ...(ENTRY_HINTS[entry.key] ?? []).map((key) => el('p', {}, [t(key)])),
  ]);
}

export function createRopesTab(store: Store): Element[] {
  const select = (entry: PanelEntry) => store.dispatch({ type: 'select', partId: entry.selectId });

  const ordered: PanelEntry[] = [
    ...CONTROL_VIEWS.flatMap((view) =>
      panelEntries().filter((entry) => entry.controlId === view.id),
    ),
    ...panelEntries().filter((entry) => entry.controlId === null),
  ];

  const views: EntryView[] = ordered.map((entry) => {
    const view = CONTROL_VIEWS.find((candidate) => candidate.id === entry.controlId);
    let block: HTMLElement;
    let refresh: (state: AppState) => void = () => undefined;
    let name: string;
    if (view) {
      name = t(view.name);
      const control = createControl(store, view, sharedHint(entry));
      control.element.append(moreAbout(entry));
      block = control.element;
      refresh = control.refresh;
    } else {
      const info = partInfo(entry.selectId);
      name = info?.name ?? entry.selectId;
      const labels = info?.boatLabels ?? [];
      block = el('div', { class: 'control control-static', 'data-part-id': entry.selectId }, [
        el('div', { class: 'control-head' }, [el('span', { class: 'control-name' }, [name])]),
        ...(labels.length > 0
          ? [
              el('p', { class: 'control-boat-label' }, [
                t('card.boatLabel', { labels: labels.map((label) => `“${label}”`).join(', ') }),
              ]),
            ]
          : []),
        el('p', { class: 'static-note' }, [
          t(entry.staticNote ? `ropes.static.${entry.staticNote}` : 'ropes.static.none'),
        ]),
        moreAbout(entry),
      ]);
    }
    block.hidden = true;
    const rowValue = el('span', { class: 'rope-item-value' });
    const row = el(
      'button',
      {
        type: 'button',
        class: 'rope-item',
        'data-select': entry.selectId,
        'aria-pressed': 'false',
      },
      [
        swatch(entry),
        el('span', { class: 'rope-item-text' }, [
          el('span', { class: 'rope-item-name' }, [name]),
          rowValue,
        ]),
      ],
    );
    row.addEventListener('click', () => select(entry));
    return { entry, view, name, block, refresh, row, rowValue };
  });

  const empty = el('p', { class: 'strip-empty' }, [t('ropes.strip.empty')]);
  const strip = el(
    'section',
    { class: 'rope-strip', 'data-testid': 'rope-strip', 'aria-label': t('ropes.strip.label') },
    [empty, ...views.map((view) => view.block)],
  );

  const drawing = createClutchDrawing(store);
  const legend = createRopeLegend();
  const list = el(
    'div',
    { class: 'rope-list' },
    views.map((view) => view.row),
  );

  const rowText = (view: EntryView, state: AppState): string => {
    if (!view.view) return t('ropes.list.static');
    const value = valueText(view.view, state.controls[view.view.id]);
    const status = view.view.status?.(state);
    return status ? `${value} · ${stateText(status)}` : value;
  };

  let shown: EntryView | undefined;
  const refresh = (state: AppState, previous?: AppState) => {
    if (!previous || state.selection !== previous.selection) {
      const entry = entryFor(state.selection);
      const next = views.find((view) => view.entry === entry);
      if (next !== shown) {
        if (shown) shown.block.hidden = true;
        shown = next;
        if (shown) shown.block.hidden = false;
        empty.hidden = Boolean(shown);
        strip.classList.toggle('is-empty', !shown);
        for (const view of views) view.row.setAttribute('aria-pressed', String(view === shown));
        if (previous) revealStrip(strip);
      }
    }
    if (!previous || state.settings.legend !== previous.settings.legend) {
      legend.hidden = !state.settings.legend;
    }
    shown?.refresh(state);
    drawing.refresh(state, previous);
    for (const view of views) setText(view.rowValue, rowText(view, state));
  };
  store.subscribe(refresh);
  refresh(store.getState());

  // The drawing comes first, so it shows without scrolling on a phone; the longer
  // explanations follow the list.
  const easy = el('div', { class: 'ropes-easy', 'data-testid': 'ropes-easy' }, [
    el('p', { class: 'hint mode-line', 'data-testid': 'ropes-mode' }, [
      el('strong', {}, [t('ropes.mode.easy')]),
      ' ',
      t('ropes.mode.easyShort'),
    ]),
    drawing.element,
    strip,
    el('h3', { class: 'section-title' }, [t('ropes.list.title')]),
    list,
    legend,
    el('h3', { class: 'section-title' }, [t('ropes.about.title')]),
    el('p', { class: 'hint' }, [t('clutch.hint')]),
    el('p', { class: 'hint' }, [t('ropes.mode.easyHint')]),
  ]);

  // Realistic mode (M4b): stations, clutches and winches worked by hand.
  const realLegend = createRopeLegend();
  const realistic = el('div', { class: 'ropes-realistic', 'data-testid': 'ropes-realistic' }, [
    ...createRealisticPanel(store),
    realLegend,
  ]);

  const modes = createModeSwitch(store);
  const showMode = (state: AppState, previous?: AppState) => {
    if (previous && state.settings === previous.settings) return;
    const real = state.settings.ropesMode === 'realistic';
    easy.hidden = real;
    realistic.hidden = !real;
    realLegend.hidden = !state.settings.legend;
  };
  store.subscribe(showMode);
  showMode(store.getState());
  return [modes, easy, realistic];
}

/** Easy / Realistic, always one tap away (PHASE1_SPEC 7.2.1, 7.2.2). */
function createModeSwitch(store: Store): HTMLElement {
  const group = el('fieldset', { class: 'field segmented mode-switch' }, [
    el('legend', { class: 'visually-hidden' }, [t('ropes.mode.label')]),
  ]);
  const options = el('div', { class: 'segments' });
  const inputs = ROPES_MODES.map((mode) => {
    const input = el('input', {
      type: 'radio',
      name: 'ropes-mode',
      value: mode,
      'data-testid': `mode-${mode}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setRopesMode', mode });
    });
    options.append(
      el('label', { class: 'segment' }, [
        input,
        el('span', {}, [t(`ropes.mode.option.${mode}` as StringKey)]),
      ]),
    );
    return { mode, input };
  });
  group.append(options);
  const sync = (state: AppState, previous?: AppState) => {
    if (previous && state.settings === previous.settings) return;
    for (const { mode, input } of inputs) input.checked = mode === state.settings.ropesMode;
  };
  store.subscribe(sync);
  sync(store.getState());
  return group;
}

/** Scrolls the panel just enough to show the strip (it may sit below a tall drawing). */
function revealStrip(strip: HTMLElement): void {
  const body = strip.closest('.panel-body');
  if (!body || strip.offsetParent === null) return;
  const box = strip.getBoundingClientRect();
  const view = body.getBoundingClientRect();
  if (box.bottom > view.bottom) body.scrollTop += box.bottom - view.bottom;
  else if (box.top < view.top) body.scrollTop -= view.top - box.top;
}
