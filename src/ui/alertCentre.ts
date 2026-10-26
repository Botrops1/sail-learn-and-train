import type { AppState, Store } from '../app/store';
import {
  ALERT_TAGS,
  alertLearnId,
  alertTag,
  alertTimeText,
  type AlertEntry,
  type AlertKind,
  type AlertSeverity,
  type AlertTag,
} from '../model/alerts';
import { STATION_IDS, stationWinch } from '../model/realistic';
import { damageText } from './damageReport';
import { el } from './dom';
import { gybeReportText } from './gybeReport';
import { part, t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';

/** The message of each kind: the same strings the short alerts over the view use. */
const ALERT_TEXT: Readonly<
  Record<
    Exclude<
      AlertKind,
      'gybe' | 'sailWorn' | 'contact' | 'ropeSlipping' | 'winchCutOut' | 'clutchOnRunning'
    >,
    StringKey
  >
> = {
  tack: 'alert.tack',
  byTheLee: 'alert.byTheLee',
  overpowered: 'alert.overpowered',
  roundUp: 'alert.roundUp',
  tookWheel: 'autopilot.tookWheel',
  fendersOut: 'harbour.fenders.hint',
  anchorAlarm: 'anchor.alarm',
};

/** What an entry says (an accidental or controlled gybe says its report). */
export function alertText(entry: AlertEntry): string {
  if (entry.kind === 'gybe') {
    return entry.report ? gybeReportText(entry.report) : t('alert.gybe');
  }
  if (entry.kind === 'sailWorn') {
    return t(entry.sail === 'jib' ? 'alert.sailWorn.jib' : 'alert.sailWorn.main');
  }
  switch (entry.kind) {
    case 'contact':
      return entry.contact ? damageText(entry.contact) : t('damage.title', { count: 1 });
    case 'ropeSlipping':
      return t('alert.ropeSlipping', {
        rope: entry.rope ? (part(entry.rope)?.name ?? entry.rope) : '',
      });
    case 'winchCutOut': {
      const station = STATION_IDS.find((id) => stationWinch(id) === entry.winch);
      return t('alert.winchCutOut', {
        side: t(station === 'port' ? 'side.port.gen' : 'side.starboard.gen'),
      });
    }
    case 'clutchOnRunning':
      return t('alert.clutchOnRunning');
    default:
      return t(ALERT_TEXT[entry.kind]);
  }
}

/** The history list (M55): used by the Attention card and the Status section. */
export interface AlertListOptions {
  /** A row of tag filter buttons at the top. */
  filter: boolean;
  /** The prefix of the test ids: `alert` (the card) or `status-alert` (the Status section). */
  idPrefix: 'alert' | 'status-alert';
  /** The list is drawn only while this is true (the card draws only while open); `refresh()` draws it now. */
  renderWhen?: () => boolean;
}

export type AlertList = HTMLElement & { refresh(): void };

/**
 * The history as a list, newest first, each row with its time, its tag chip, its text and a "?"
 * that opens its Learn entry (M55). With `filter` it has a row of buttons that show one tag only.
 * It re-draws itself on every history change (when `renderWhen` allows) and when `refresh()` is called.
 */
export function createAlertList(
  store: Store,
  showLearn: (id: string) => void,
  options: AlertListOptions,
): AlertList {
  const { filter, idPrefix, renderWhen } = options;
  const empty = el('p', { class: 'alert-empty', 'data-testid': `${idPrefix}-empty` }, [
    t('alerts.empty'),
  ]);
  const list = el('ol', { class: 'alert-list', 'data-testid': `${idPrefix}-list` });
  let tag: AlertTag | null = null;
  const filterButtons: { id: AlertTag | null; button: HTMLElement }[] = [];
  const children: HTMLElement[] = [];
  if (filter) {
    for (const id of [null, ...ALERT_TAGS]) {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'segment status-filter-button',
          'aria-pressed': String(id === null),
          'data-testid': `status-filter-${id ?? 'all'}`,
        },
        [t(id === null ? 'status.filter.all' : `status.tag.${id}`)],
      );
      button.addEventListener('click', () => {
        tag = id;
        for (const entry of filterButtons) {
          entry.button.setAttribute('aria-pressed', String(entry.id === tag));
        }
        draw(true);
      });
      filterButtons.push({ id, button });
    }
    children.push(
      el(
        'div',
        {
          class: 'status-filter',
          role: 'group',
          'aria-label': t('status.filter'),
          'data-testid': 'status-filter',
        },
        filterButtons.map((entry) => entry.button),
      ),
    );
  }
  const root: AlertList = Object.assign(
    el('div', { class: 'alert-list-box', 'data-testid': `${idPrefix}-box` }, [
      ...children,
      empty,
      list,
    ]),
    { refresh: () => draw(true) },
  );

  let drawnEntries: object | null = null;
  let drawnTag: AlertTag | null | undefined;
  function draw(force: boolean): void {
    if (renderWhen && !renderWhen()) return;
    const { entries } = store.getState().alerts;
    if (!force && drawnEntries === entries && drawnTag === tag) return;
    drawnEntries = entries;
    drawnTag = tag;
    const shown = [...entries].reverse().filter((entry) => tag === null || alertTag(entry) === tag);
    empty.hidden = shown.length > 0;
    empty.textContent = entries.length === 0 ? t('alerts.empty') : t('status.filter.none');
    list.replaceChildren(
      ...shown.map((entry) => {
        const time = alertTimeText(entry.atS);
        const learnId = alertLearnId(entry);
        const entryTag = alertTag(entry);
        const learn = el('button', {
          type: 'button',
          class: 'alert-learn',
          'data-testid': `${idPrefix}-learn`,
          'data-learn': learnId,
          'aria-label': t('alerts.learn'),
        });
        learn.textContent = '?';
        learn.addEventListener('click', () => showLearn(learnId));
        return el(
          'li',
          {
            class: `alert-item is-${entry.severity}`,
            'data-testid': `${idPrefix}-item`,
            'data-kind': entry.kind,
          },
          [
            el('span', { class: 'alert-time', 'aria-label': t('alerts.at', { time }) }, [time]),
            el(
              'span',
              {
                class: `alert-tag alert-tag-${entryTag}`,
                'data-testid': `${idPrefix}-tag`,
                'data-tag': entryTag,
              },
              [t(`status.tag.${entryTag}`)],
            ),
            el('span', { class: 'alert-text' }, [alertText(entry)]),
            learn,
          ],
        );
      }),
    );
  }
  store.subscribe(() => draw(false));
  draw(true);
  return root;
}

/**
 * The notification centre (M36, issue #80): the history of the short messages, so one that
 * showed for a few seconds can be read again. An "Attention" button in the top row (with the
 * number of new entries) opens it as a card over the 3D view. In a wide window (1,280 px or more,
 * panel beside the view) it starts open, as a small overlay at the left; elsewhere it starts
 * folded into the button. Each entry has a "?"
 * that opens its Learn entry (in the Learn section, where it is: the mode stays). The open state is not stored (not in the link).
 */
export function createAlertCentre(
  top: HTMLElement,
  bottom: HTMLElement,
  view: HTMLElement,
  store: Store,
  layout: LayoutShell,
  showLearn: (id: string) => void,
): void {
  const badge = el('span', { class: 'alert-badge', 'data-testid': 'alert-badge' });
  badge.hidden = true;
  const chip = el(
    'button',
    {
      type: 'button',
      class: 'alert-chip',
      'data-testid': 'alert-chip',
      'aria-expanded': 'false',
      'aria-controls': 'alert-centre',
    },
    [
      el('span', { class: 'alert-chip-text' }, [t('alerts.title')]),
      // On a phone the button is a round "!" in the chip row at the bottom of the view (M36).
      el('span', { class: 'alert-chip-icon', 'aria-hidden': 'true' }, ['!']),
      badge,
    ],
  );
  const stacked = () => layout.viewport().mode === 'stacked';
  // Where the button sits: on a phone in the chip row at the bottom of the view, at its right end (M51: the gear is a tab; it stays in the row, hidden)
  // (a button in the top row would make the top area a row taller and shorten the sheet); beside
  // the panel in the top row, before the clock chip.
  const place = () => {
    chip.classList.toggle('view-chip', stacked());
    if (stacked()) {
      const gear = bottom.querySelector('[data-testid="settings-button"]');
      if (chip.parentElement !== bottom || chip.nextElementSibling !== gear) {
        bottom.insertBefore(chip, gear);
      }
    } else if (chip.parentElement !== top) {
      top.insertBefore(chip, top.querySelector('.clock-chip'));
    }
  };
  place();

  const fold = el('button', {
    type: 'button',
    class: 'alert-close',
    'data-testid': 'alert-close',
    'aria-label': t('alerts.collapse'),
  });
  fold.textContent = '×';
  let open = false;
  // Drawn only while the card is open; on a phone a "?" folds the card, the Learn section is under it.
  const list = createAlertList(
    store,
    (id) => {
      showLearn(id);
      if (stacked()) setOpen(false, true);
    },
    { filter: false, idPrefix: 'alert', renderWhen: () => open },
  );
  const card = el(
    'section',
    {
      id: 'alert-centre',
      class: 'alert-centre',
      'data-testid': 'alert-centre',
      'aria-label': t('alerts.label'),
    },
    [
      el('header', { class: 'alert-head' }, [
        el('h2', { class: 'alert-title' }, [t('alerts.title')]),
        fold,
      ]),
      list,
    ],
  );
  card.hidden = true;
  view.append(card);

  // Open at the start only where there is room: a computer window (the wide layout). A phone held
  // sideways or a narrow side-by-side window starts folded, so the card never hides the boat.
  const roomy = () => layout.viewport().wide;
  // Until the viewer folds or opens it, the layout decides (open in a wide window, folded otherwise).
  let touched = false;
  let seen = 0;

  const render = (state: AppState) => {
    const { entries, written } = state.alerts;
    if (open) seen = written;
    const unread = written - seen;
    badge.hidden = unread <= 0;
    badge.textContent = String(unread);
    const newest = entries.filter((entry) => entry.n > seen);
    const worst: AlertSeverity | null = newest.some((entry) => entry.severity === 'danger')
      ? 'danger'
      : newest.some((entry) => entry.severity === 'warning')
        ? 'warning'
        : null;
    if (worst) chip.dataset.new = worst;
    else delete chip.dataset.new;
    chip.setAttribute(
      'aria-label',
      unread > 0 ? t('alerts.chipNewAria', { count: unread }) : t('alerts.chipAria'),
    );
  };

  function setOpen(next: boolean, byViewer: boolean): void {
    if (byViewer) touched = true;
    if (open === next) return;
    open = next;
    card.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
    // On a phone the clock card would sit under this one.
    if (open && stacked()) {
      view.querySelector<HTMLElement>('.clock-card:not([hidden]) .clock-close')?.click();
    }
    render(store.getState());
    list.refresh();
  }

  chip.addEventListener('click', () => setOpen(!open, true));
  fold.addEventListener('click', () => {
    setOpen(false, true);
    chip.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open && !roomy()) setOpen(false, true);
  });
  layout.onChange(() => {
    place();
    if (!touched) setOpen(roomy(), false);
  });
  store.subscribe((state) => render(state));
  setOpen(roomy(), false);
}
