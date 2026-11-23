import { setChosenBoat } from '../app/boatStore';
import type { Store } from '../app/store';
import { boatId } from '../model/boat';
import { exercisesForBoat } from '../model/exercises';
import { el } from './dom';
import { loadExercise } from './exercisePanel';
import { t } from './i18n';
import type { LayoutShell } from './layout';
import type { Sheet } from './sheet';

/** The device remembers that the welcome was closed (PHASE_LAUNCH_SPEC 9.2). */
export const WELCOME_KEY = 'sail-learn.welcome';

/** The welcome shows on a first visit to the bare address (no settings after `?`). */
export function shouldWelcome(search: string, seen: boolean): boolean {
  return search === '' && !seen;
}

/** Whether this device has closed the welcome before (false if storage is blocked). */
export function welcomeSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(WELCOME_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    globalThis.localStorage?.setItem(WELCOME_KEY, '1');
  } catch {
    // Private window or blocked storage: the welcome may show again next time.
  }
}

/**
 * The welcome card (M85, PHASE_LAUNCH_SPEC 9.3): a modal card over the whole window with three
 * ways on: watch the first exercise, look around the boat, start on the training dinghy (M113), or close. Any way of closing it
 * remembers that it was seen. `open()` shows it again (Settings → About).
 */
export function createWelcome(
  store: Store,
  layout: LayoutShell,
  sheet: Sheet,
  canWatch: boolean,
  showLearn: () => void,
): { open(): void } {
  let backdrop: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.stopImmediatePropagation();
    event.preventDefault();
    close();
  };

  function close(): void {
    if (!backdrop) return;
    markSeen();
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    backdrop = null;
    layout.root.removeAttribute('inert');
    returnFocus?.focus?.();
    returnFocus = null;
  }

  function open(): void {
    if (backdrop) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const button = (testid: string, className: string, text: string): HTMLButtonElement =>
      el('button', { type: 'button', class: className, 'data-testid': testid }, [text]);

    // M113: "Watch the first exercise" is the Hanse's; a boat with no exercises has none to watch.
    const watch =
      canWatch && exercisesForBoat(boatId).length > 0
        ? button('welcome-watch', 'exercise-start', t('welcome.watch'))
        : null;
    const look = button('welcome-look', 'exercise-start', t('welcome.look'));
    // M113: start on the Training dinghy (not shown when it is the boat in use).
    const dinghy =
      boatId === 'dinghy' ? null : button('welcome-dinghy', 'exercise-button', t('welcome.dinghy'));
    const closeButton = button('welcome-close', 'exercise-button', t('welcome.close'));

    watch?.addEventListener('click', () => {
      close();
      loadExercise(store, 'points-of-sail', 'easy');
      store.dispatch({ type: 'exercise', command: { demo: 'watch' } });
      store.dispatch({ type: 'exercise', command: 'start' });
      if (layout.viewport().mode === 'stacked') sheet.setHeight('peek');
    });
    look.addEventListener('click', () => {
      close();
      store.dispatch({ type: 'setAppMode', mode: 'learn' });
      showLearn();
    });
    dinghy?.addEventListener('click', () => {
      close();
      setChosenBoat('dinghy');
      // The language lives only in the link: keep it, as the Settings chooser does.
      const { language } = store.getState().settings;
      const langKey = language === 'en' ? '' : `&lang=${language}`;
      window.location.assign(`${window.location.pathname}?v=1&boat=dinghy${langKey}`);
    });
    closeButton.addEventListener('click', close);

    const card = el(
      'div',
      {
        class: 'welcome-card',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'welcome-title',
        'data-testid': 'welcome',
      },
      [
        el('h2', { class: 'welcome-title', id: 'welcome-title' }, [t('welcome.title')]),
        el('p', { class: 'welcome-body' }, [t('welcome.body')]),
        ...(watch ? [watch] : []),
        look,
        ...(dinghy ? [dinghy] : []),
        closeButton,
        el('p', { class: 'welcome-later' }, [t('welcome.later')]),
      ],
    );
    const overlay = el('div', { class: 'welcome-backdrop', 'data-testid': 'welcome-backdrop' }, [
      card,
    ]);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    backdrop = overlay;
    document.body.append(overlay);
    layout.root.setAttribute('inert', '');
    document.addEventListener('keydown', onKey, true);
    (watch ?? look).focus();
  }

  return { open };
}
