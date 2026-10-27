import type { AppState, Store } from '../app/store';
import { rollerPoint, scopeNeededM, type WindlassMotion } from '../model/anchor';
import { pointToMap } from '../model/lowSpeed';
import { depthAt } from '../model/seabed';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/**
 * The Anchor section (M46, PHASE7_SPEC 12.6): the windlass buttons (held to act, like the
 * thrusters: pointer down, or Space / Enter, and let go when released, when the page loses focus
 * or goes to the background), the chain counter, the status, the scope check of PT-31 and the
 * alarm. The Bow station of Realistic mode shows the same block (`suffix` `-bow`), the Helm
 * station only the buttons and the counter (`compact`, `-helm`, the remote).
 */

/** Stores that already let go of the windlass when the page is hidden or loses focus. */
const guarded = new WeakSet<Store>();

function guardPage(store: Store): void {
  if (guarded.has(store)) return;
  guarded.add(store);
  const release = () => store.dispatch({ type: 'windlass', motion: 'off' });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') release();
  });
  window.addEventListener('blur', release);
}

/** The Anchor section's status line: the phase, and the extra words while she drags or the windlass has cut out (also the Status section, M55). */
export function anchorStatusText(state: AppState): string {
  const { anchor } = state;
  const text = [t(`anchor.phase.${anchor.phase}`)];
  if (anchor.dragging) text.push(t('anchor.dragging'));
  if (anchor.cutOut) text.push(t('anchor.cutOut'));
  return text.join(' ');
}

/** The depth the scope check uses: at the anchor on the bottom, under the roller otherwise. */
function checkedDepthM(state: AppState): number {
  const { anchor } = state;
  if (anchor.phase === 'bottom' || anchor.phase === 'set') {
    return depthAt(anchor.eastM, anchor.northM);
  }
  const roller = rollerPoint();
  const [east, north] = pointToMap(state.boat, roller.x, roller.z);
  return depthAt(east, north);
}

/** The arrow keys that work either windlass button (M59). */
const ARROW_MOTION: Partial<Record<string, Exclude<WindlassMotion, 'off'>>> = {
  ArrowDown: 'down',
  ArrowUp: 'up',
};

function holdButton(
  store: Store,
  motion: Exclude<WindlassMotion, 'off'>,
  testId: string,
  partId: string,
): HTMLButtonElement {
  const button = el(
    'button',
    {
      type: 'button',
      class: 'real-action real-hold windlass-button',
      'data-testid': testId,
      'data-part-id': partId,
      'aria-pressed': 'false',
    },
    [t(motion === 'down' ? 'anchor.down' : 'anchor.up')],
  );
  const hold = () => store.dispatch({ type: 'windlass', motion });
  const letGo = () => store.dispatch({ type: 'windlass', motion: 'off' });
  button.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    event.preventDefault();
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic or already-ended pointer cannot be captured: the other events still end the hold.
    }
    hold();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
    button.addEventListener(type, letGo);
  }
  button.addEventListener('blur', letGo);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  button.addEventListener('keydown', (event) => {
    const arrow = ARROW_MOTION[event.key];
    if (arrow !== undefined) {
      // M59: ArrowDown pays the chain out and ArrowUp brings it in, on either button.
      event.preventDefault();
      if (!event.repeat) store.dispatch({ type: 'windlass', motion: arrow });
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) hold();
  });
  button.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter' || ARROW_MOTION[event.key] !== undefined) {
      letGo();
    }
  });
  return button;
}

export function createAnchorPanel(store: Store, suffix = '', compact = false): HTMLElement[] {
  guardPage(store);
  const id = (name: string) => `${name}${suffix}`;
  const partId = suffix === '-helm' ? 'fit_windlass_remote' : 'fit_anchor_windlass';
  const down = holdButton(store, 'down', id('windlass-down'), partId);
  const up = holdButton(store, 'up', id('windlass-up'), partId);
  const buttons = el('div', { class: 'windlass-buttons real-actions' }, [down, up]);
  const counter = el('p', {
    class: 'chain-counter',
    'data-testid': id('chain-counter'),
    'aria-live': 'off',
  });

  const status = el('p', {
    class: 'hint',
    'data-testid': id('anchor-status'),
    'aria-live': 'polite',
  });
  const scope = el('p', { class: 'hint', 'data-testid': id('anchor-scope') });
  const check = el('p', { class: 'anchor-check', 'data-testid': id('anchor-check') });
  const alarm = el(
    'p',
    { class: 'anchor-alarm', 'data-testid': id('anchor-alarm'), role: 'alert' },
    [t('anchor.alarm')],
  );
  const silence = el(
    'button',
    { type: 'button', class: 'segment', 'data-testid': id('alarm-silence') },
    [t('anchor.silence')],
  );
  silence.addEventListener('click', () => store.dispatch({ type: 'silenceAnchorAlarm' }));
  const alarmRow = el('div', { class: 'anchor-alarm-row' }, [alarm, silence]);
  const hint = el('p', { class: 'hint explain' }, [t('anchor.hint')]);

  let last: AppState | undefined;
  const sync = (state: AppState) => {
    const { anchor } = state;
    const moved = last === undefined || anchor !== last.anchor;
    const wind =
      last === undefined || state.controls.ctl_wind_speed !== last.controls.ctl_wind_speed;
    const boatMoved = last === undefined || state.boat !== last.boat;
    last = state;
    if (moved) {
      down.setAttribute('aria-pressed', String(anchor.windlass === 'down'));
      up.setAttribute('aria-pressed', String(anchor.windlass === 'up'));
      down.classList.toggle('is-pressed', anchor.windlass === 'down');
      up.classList.toggle('is-pressed', anchor.windlass === 'up');
      setText(counter, t('anchor.counter', { m: Math.round(anchor.chainOutM) }));
    }
    if (compact) return;
    if (!moved && !wind && !(boatMoved && anchor.phase === 'hanging')) return;
    setText(status, anchorStatusText(state));
    const down1 = anchor.phase !== 'stowed';
    scope.hidden = !down1;
    check.hidden = !down1;
    if (down1) {
      const depth = checkedDepthM(state);
      const eff = depth + rollerPoint().y;
      setText(
        scope,
        t('anchor.scope', {
          depth: depth.toFixed(1),
          eff: eff.toFixed(1),
          ratio: (eff > 0 ? anchor.chainOutM / eff : 0).toFixed(1),
        }),
      );
      const needed = scopeNeededM(depth, state.controls.ctl_wind_speed);
      const enough = anchor.chainOutM >= needed;
      setText(
        check,
        enough
          ? t('anchor.enough')
          : t('anchor.more', {
              m: Math.ceil(needed - anchor.chainOutM),
              need: Math.round(needed),
            }),
      );
      check.classList.toggle('is-short', !enough);
    }
    alarmRow.hidden = !anchor.alarm;
  };
  store.subscribe(sync);
  sync(store.getState());
  return compact ? [buttons, counter] : [buttons, counter, status, scope, check, alarmRow, hint];
}
