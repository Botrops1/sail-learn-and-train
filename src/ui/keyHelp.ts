import { el } from './dom';
import { t, type StringKey } from './i18n';

/** The key list dialog (M101, PHASE_FEEDBACK_SPEC 8.4): opened by H, ? or the Settings row. */
export interface KeyHelp {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
}

/** The key caps (never translated) and what they do, one row each. */
const ROWS: readonly (readonly [readonly string[], StringKey])[] = [
  [['←', '→'], 'keys.steer'],
  [['W', 'S'], 'keys.main'],
  [['R', 'F'], 'keys.jib'],
  [['P'], 'keys.autopilot'],
  [['A', 'D'], 'keys.bowThruster'],
  [['J', 'L'], 'keys.sternThruster'],
  [['1–4', 'Space', 'Enter'], 'keys.bar'],
  [['H', '?'], 'keys.help'],
];

/** Made once; the dialog is built each time it opens (as the language dialog is). */
export function createKeyHelp(): KeyHelp {
  let backdrop: HTMLElement | null = null;
  let returnTo: HTMLElement | null = null;
  const inerted: HTMLElement[] = [];

  function close(): void {
    if (!backdrop) return;
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    backdrop = null;
    for (const node of inerted.splice(0)) node.removeAttribute('inert');
    const back = returnTo;
    returnTo = null;
    if (back?.isConnected) back.focus();
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopImmediatePropagation();
    event.preventDefault();
    close();
  }

  function open(): void {
    if (backdrop) return;
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const list = el('dl', { class: 'key-list' });
    for (const [caps, text] of ROWS) {
      list.append(
        el(
          'dt',
          {},
          caps.map((cap) => el('kbd', {}, [cap])),
        ),
        el('dd', {}, [t(text)]),
      );
    }
    const closeButton = el(
      'button',
      { type: 'button', class: 'exercise-button', 'data-testid': 'key-help-close' },
      [t('settings.close')],
    );
    closeButton.addEventListener('click', close);
    const card = el(
      'div',
      {
        class: 'welcome-card language-card key-help-card',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'key-help-title',
        'data-testid': 'key-help',
      },
      [
        el('h2', { class: 'welcome-title', id: 'key-help-title' }, [t('keys.title')]),
        list,
        el('p', { class: 'hint' }, [t('keys.noteRopes')]),
        el('p', { class: 'hint' }, [t('keys.noteOff')]),
        closeButton,
      ],
    );
    const overlay = el('div', { class: 'welcome-backdrop', 'data-testid': 'key-help-backdrop' }, [
      card,
    ]);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    backdrop = overlay;
    document.body.append(overlay);
    for (const node of Array.from(document.body.children)) {
      if (node !== overlay && node instanceof HTMLElement && !node.hasAttribute('inert')) {
        node.setAttribute('inert', '');
        inerted.push(node);
      }
    }
    document.addEventListener('keydown', onKey, true);
    closeButton.focus();
  }

  return {
    open,
    close,
    toggle: () => (backdrop ? close() : open()),
    isOpen: () => backdrop !== null,
  };
}
