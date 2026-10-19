import type { AppState, Store } from '../app/store';
import type { ContactReport } from '../model/contact';
import { mpsToKn } from '../model/angles';
import { el } from './dom';
import { part, t } from './i18n';

/** How many reports the list shows (the state keeps 20). */
const LISTED = 5;

/** The report's text (M43, PHASE7_SPEC 9.6): what we hit, where on our hull, how fast, how bad; or a fender torn off. */
export function damageText(r: ContactReport): string {
  if (r.obstacleId === 'fender') {
    return t('damage.fenderLost', {
      side: t(r.part === 'port' ? 'side.port.gen' : 'side.starboard.gen'),
    });
  }
  return t('damage.line', {
    what: part(r.partId)?.name ?? r.partId,
    where: t(`damage.part.${r.part}`),
    speed: mpsToKn(r.impactMps).toFixed(1),
    verdict: t(`damage.severity.${r.severity}`),
  });
}

/**
 * The damage alert in the alert stack over the 3D view: shows the newest report for a few seconds
 * after a contact (or a lost fender), the worst one of those that came while it showed; red for a knock or a hard hit.
 */
export function createDamageAlert(alerts: HTMLElement, store: Store): void {
  const note = el('div', {
    class: 'rig-alert rig-alert-report',
    'data-testid': 'damage-alert',
  });
  note.hidden = true;
  alerts.prepend(note);

  let shown: ContactReport | undefined;
  const refresh = (state: AppState) => {
    const newest = state.contact.notice ?? undefined;
    const visible = newest !== undefined && state.rig.timeS < state.contact.noticeUntilS;
    if (note.hidden === visible) note.hidden = !visible;
    if (visible && newest !== shown) {
      shown = newest;
      note.textContent = damageText(newest);
      note.classList.toggle('is-hit', newest.severity === 'knock' || newest.severity === 'hit');
    }
  };
  store.subscribe(refresh);
  refresh(store.getState());
}

/** The Place section's damage report: the newest few contacts, and a Clear button. */
export function createDamageList(store: Store): HTMLElement {
  const title = el('h3', { class: 'damage-title' });
  const list = el('ul', { class: 'damage-list', 'data-testid': 'damage-list' });
  const none = el('p', { class: 'hint', 'data-testid': 'damage-none' }, [t('damage.none')]);
  const clear = el(
    'button',
    { type: 'button', class: 'segment damage-clear', 'data-testid': 'damage-clear' },
    [t('damage.clear')],
  );
  clear.addEventListener('click', () => store.dispatch({ type: 'clearDamageReport' }));
  const box = el('div', { class: 'field damage-report', 'data-testid': 'damage-report' }, [
    title,
    list,
    none,
    clear,
  ]);

  const sync = (state: AppState, previous?: AppState) => {
    if (previous && state.contact.reports === previous.contact.reports) return;
    const reports = state.contact.reports;
    title.textContent = t('damage.title', { count: reports.length });
    list.replaceChildren(
      ...reports.slice(0, LISTED).map((r) => el('li', { class: 'damage-item' }, [damageText(r)])),
    );
    list.hidden = reports.length === 0;
    none.hidden = reports.length > 0;
    clear.disabled = reports.length === 0;
  };
  store.subscribe(sync);
  sync(store.getState());
  return box;
}
