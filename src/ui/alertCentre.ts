import type { AppState, Store } from '../app/store';
import {
  alertLearnId,
  alertTimeText,
  type AlertEntry,
  type AlertKind,
  type AlertSeverity,
} from '../model/alerts';
import { el } from './dom';
import { gybeReportText } from './gybeReport';
import { t, type StringKey } from './i18n';
import type { LayoutShell } from './layout';

/** The message of each kind: the same strings the short alerts over the view use. */
const ALERT_TEXT: Readonly<Record<Exclude<AlertKind, 'gybe' | 'sailWorn'>, StringKey>> = {
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
  return t(ALERT_TEXT[entry.kind]);
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
  // Where the button sits: on a phone in the chip row at the bottom of the view, before the gear
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
  const list = el('ol', { class: 'alert-list', 'data-testid': 'alert-list' });
  const empty = el('p', { class: 'alert-empty', 'data-testid': 'alert-empty' }, [
    t('alerts.empty'),
  ]);
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
      empty,
      list,
    ],
  );
  card.hidden = true;
  view.append(card);

  // Open at the start only where there is room: a computer window (the wide layout). A phone held
  // sideways or a narrow side-by-side window starts folded, so the card never hides the boat.
  const roomy = () => layout.viewport().wide;
  let open = false;
  // Until the viewer folds or opens it, the layout decides (open in a wide window, folded otherwise).
  let touched = false;
  let seen = 0;
  let drawn: object | null = null;

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
    if (!open || drawn === entries) return;
    drawn = entries;
    empty.hidden = entries.length > 0;
    list.replaceChildren(
      ...[...entries].reverse().map((entry) => {
        const time = alertTimeText(entry.atS);
        const learnId = alertLearnId(entry);
        const learn = el('button', {
          type: 'button',
          class: 'alert-learn',
          'data-testid': 'alert-learn',
          'data-learn': learnId,
          'aria-label': t('alerts.learn'),
        });
        learn.textContent = '?';
        learn.addEventListener('click', () => {
          showLearn(learnId);
          // On a phone the card would cover the Learn section the sheet is about to show.
          if (stacked()) setOpen(false, true);
        });
        return el(
          'li',
          {
            class: `alert-item is-${entry.severity}`,
            'data-testid': 'alert-item',
            'data-kind': entry.kind,
          },
          [
            el('span', { class: 'alert-time', 'aria-label': t('alerts.at', { time }) }, [time]),
            el('span', { class: 'alert-text' }, [alertText(entry)]),
            learn,
          ],
        );
      }),
    );
  };

  function setOpen(next: boolean, byViewer: boolean): void {
    if (byViewer) touched = true;
    if (open === next) return;
    open = next;
    card.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
    drawn = null;
    // On a phone the clock card would sit under this one.
    if (open && stacked()) {
      view.querySelector<HTMLElement>('.clock-card:not([hidden]) .clock-close')?.click();
    }
    render(store.getState());
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
