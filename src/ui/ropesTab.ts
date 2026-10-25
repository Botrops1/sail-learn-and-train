import type { AppState, Store } from '../app/store';
import { entryFor, panelEntries, type PanelEntry } from '../model/panelEntries';
import { SCENE } from '../render3d/sceneConfig';
import { el } from './dom';
import { part, quoted, t, type StringKey } from './i18n';
import {
  CONTROL_VIEWS,
  createControl,
  stateText,
  valueText,
  type ControlView,
} from './ropeControls';
import { createRealisticPanel } from './realisticPanel';
import { ropeColorKey, ROPE_DASH } from './ropeColours';
import { setText } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** True if the Ropes section shows this selection in its strip (the info card can then stay away). */
export function ropesTabShows(selection: string | null): boolean {
  return entryFor(selection) !== undefined;
}

/**
 * The Ropes section (PHASE1_SPEC 7.2; a tab until M27), Easy and Learn: the strip for the
 * selected rope (its slider, or an info line for a rope that is not
 * adjusted), sticky in the stacked layout; then a compact list of all ropes, so every control is
 * reachable (since M48 there is no clutch-bank drawing; each row has its rope's colour; the red "fighting" colour is
 * explained under the "?", M38). The Sails, Autopilot and Engine blocks are
 * sections of their own (panel.ts).
 *
 * The selection is the store's: tapping a list row or a rope in 3D selects the same
 * thing everywhere. Realistic mode (settings.ropesMode, M4b) shows the stations instead, with
 * clutches and winches worked by hand (realisticPanel.ts); the mode chip changes mode.
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
function moreAbout(entry: PanelEntry, openEntry: (id: string) => void): HTMLElement {
  const short = part(entry.selectId)?.short ?? '';
  const learn = el(
    'button',
    { type: 'button', class: 'action-button learn-more', 'data-testid': 'strip-learn' },
    [t('ropes.strip.learn')],
  );
  learn.addEventListener('click', () => openEntry(entry.selectId));
  return el('details', { class: 'strip-more' }, [
    el('summary', {}, [t('ropes.strip.more')]),
    ...(short ? [el('p', {}, [short])] : []),
    ...(ENTRY_HINTS[entry.key] ?? []).map((key) => el('p', {}, [t(key)])),
    learn,
  ]);
}

/** Scrolls the panel to show the strip of the visible Ropes section (the panel calls it after a rope was selected). */
export function revealRopeStrip(): void {
  for (const strip of document.querySelectorAll<HTMLElement>('[data-testid="rope-strip"]')) {
    if (strip.offsetParent !== null) revealStrip(strip);
  }
}

/** `openEntry` opens an entry in the Learn section (the "Read more in Learn" buttons). */
export function createRopesTab(
  store: Store,
  openEntry: (id: string) => void = () => undefined,
  showSection: (id: 'helm') => void = () => undefined,
): HTMLElement[] {
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
      control.element.append(moreAbout(entry, openEntry));
      block = control.element;
      refresh = control.refresh;
    } else {
      const info = part(entry.selectId);
      name = info?.name ?? entry.selectId;
      const labels = info?.boatLabels ?? [];
      block = el('div', { class: 'control control-static', 'data-part-id': entry.selectId }, [
        el('div', { class: 'control-head' }, [el('span', { class: 'control-name' }, [name])]),
        ...(labels.length > 0
          ? [
              el('p', { class: 'control-boat-label' }, [
                t('card.boatLabel', { labels: labels.map(quoted).join(', ') }),
              ]),
            ]
          : []),
        el('p', { class: 'static-note' }, [
          t(entry.staticNote ? `ropes.static.${entry.staticNote}` : 'ropes.static.none'),
        ]),
        moreAbout(entry, openEntry),
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

  const empty = el('p', { class: 'strip-empty' }, [t('ropes.strip.emptyList')]);
  const learnRealistic = el('p', { class: 'hint', 'data-testid': 'ropes-learn-realistic' }, [
    t('ropes.learnRealistic'),
  ]);
  const strip = el(
    'section',
    { class: 'rope-strip', 'data-testid': 'rope-strip', 'aria-label': t('ropes.strip.label') },
    [empty, ...views.map((view) => view.block)],
  );

  /** Learn mode with Realistic ropes: the strip shows the rope's value but cannot move it (6.3). */
  const setReadOnly = (on: boolean) => {
    for (const control of strip.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
      'input, button',
    )) {
      control.disabled = on && control.getAttribute('data-testid') !== 'strip-learn';
    }
    learnRealistic.hidden = !on;
  };

  // The wheel's row is followed by the autopilot and engine blocks in Phase 2; since M27 they are
  // sections of their own (PHASE5_SPEC 8.4).
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
    shown?.refresh(state);
    for (const view of views) setText(view.rowValue, rowText(view, state));
  };
  store.subscribe(refresh);
  refresh(store.getState());

  // The strip and the list come first; the longer
  // explanations follow the list (and fold behind the section's "?").
  // Since M48 no mode draws the clutch banks: the list and the selected rope's strip are the way in.
  const modeParagraph = el('p', { class: 'hint mode-line explain', 'data-testid': 'ropes-mode' }, [
    el('strong', {}, [t('ropes.mode.easy')]),
    ' ',
    t('ropes.mode.easyShortList'),
  ]);
  const easy = el('div', { class: 'ropes-easy', 'data-testid': 'ropes-easy' }, [
    modeParagraph,
    strip,
    learnRealistic,
    el('h3', { class: 'section-title' }, [t('ropes.list.title')]),
    list,
    el('p', { class: 'hint explain' }, [t('ropes.mode.easyHint')]),
    el('p', { class: 'hint explain' }, [t('ropes.fighting')]),
  ]);

  // Realistic mode (M4b): stations, clutches and winches worked by hand.
  const realistic = el('div', { class: 'ropes-realistic', 'data-testid': 'ropes-realistic' }, [
    ...createRealisticPanel(store, openEntry, showSection),
    el('p', { class: 'hint explain' }, [t('ropes.fighting')]),
  ]);

  const showMode = (state: AppState, previous?: AppState) => {
    if (
      previous &&
      state.settings.ropesMode === previous.settings.ropesMode &&
      state.appMode === previous.appMode
    ) {
      return;
    }
    const learn = state.appMode === 'learn';
    const real = state.settings.ropesMode === 'realistic';
    easy.hidden = real && !learn;
    realistic.hidden = !real || learn;
    setReadOnly(real && learn);
    modeParagraph.hidden = real && learn;
  };
  store.subscribe(showMode);
  showMode(store.getState());
  return [easy, realistic];
}

/** Scrolls the open section just enough to show the strip. */
function revealStrip(strip: HTMLElement): void {
  const body = strip.closest('.section-body');
  if (!body || strip.offsetParent === null) return;
  const box = strip.getBoundingClientRect();
  const view = body.getBoundingClientRect();
  if (box.bottom > view.bottom) body.scrollTop += box.bottom - view.bottom;
  else if (box.top < view.top) body.scrollTop -= view.top - box.top;
}
