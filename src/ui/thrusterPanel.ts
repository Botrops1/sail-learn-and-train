import type { AppState, Store } from '../app/store';
import { thrusterSpeedFactor, type ThrustDir } from '../model/thrusters';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText } from './stepper';

/**
 * The thrusters (M41, PHASE7_SPEC 7.6): a left-right joystick for the bow and one for the stern.
 * A thruster acts only while its joystick is held (3.1: pointer down, or Space / Enter on the
 * keyboard) and stops when it is let go, when the page loses focus or goes to the background.
 * The same joystick sits in the Thrusters section, the quick row and the Helm station; all follow
 * `state.thrusters`.
 */
export type JoystickVariant = 'section' | 'quick' | 'helm';

type End = 'bow' | 'stern';

const PARTS: Record<End, string> = { bow: 'part_bow_thruster', stern: 'part_stern_thruster' };
const GROUP_LABELS: Record<End, StringKey> = {
  bow: 'thrusters.bowGroup',
  stern: 'thrusters.sternGroup',
};
const END_LABELS: Record<End, StringKey> = { bow: 'thrusters.bow', stern: 'thrusters.stern' };
const ARIA: Record<End, Record<'port' | 'starboard', StringKey>> = {
  bow: { port: 'thrusters.bowPortAria', starboard: 'thrusters.bowStarboardAria' },
  stern: { port: 'thrusters.sternPortAria', starboard: 'thrusters.sternStarboardAria' },
};
const STATUS_PARTS: Record<End, Record<'port' | 'starboard', StringKey>> = {
  bow: { port: 'thrusters.bowPort', starboard: 'thrusters.bowStarboard' },
  stern: { port: 'thrusters.sternPort', starboard: 'thrusters.sternStarboard' },
};

/** Stores that already let go of both thrusters when the page is hidden or loses focus. */
const guarded = new WeakSet<Store>();

function guardPage(store: Store): void {
  if (guarded.has(store)) return;
  guarded.add(store);
  const release = () => {
    store.dispatch({ type: 'thruster', which: 'bow', dir: 0 });
    store.dispatch({ type: 'thruster', which: 'stern', dir: 0 });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') release();
  });
  window.addEventListener('blur', release);
}

/** One end's joystick. `variant` picks the size and the test ids (`-quick`, `-helm`). */
export function createThrusterJoystick(
  store: Store,
  which: End,
  variant: JoystickVariant,
): HTMLElement {
  guardPage(store);
  const suffix = variant === 'section' ? '' : `-${variant}`;
  const set = (dir: ThrustDir) => store.dispatch({ type: 'thruster', which, dir });

  const half = (side: 'port' | 'starboard') => {
    const dir: ThrustDir = side === 'port' ? -1 : 1;
    const button = el(
      'button',
      {
        type: 'button',
        class: 'joystick-half',
        'data-testid': `thruster-${which}${suffix}-${side}`,
        'aria-label': t(ARIA[which][side]),
        'aria-pressed': 'false',
      },
      [side === 'port' ? '◀' : '▶'],
    );
    const letGo = () => set(0);
    button.addEventListener('pointerdown', (event) => {
      if (event.button > 0) return;
      event.preventDefault();
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // A synthetic or already-ended pointer cannot be captured: the other events still end the hold.
      }
      set(dir);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
      button.addEventListener(type, letGo);
    }
    button.addEventListener('blur', letGo);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat) set(dir);
    });
    button.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') letGo();
    });
    return button;
  };

  const port = half('port');
  const starboard = half('starboard');
  const knob = el('span', { class: 'joystick-knob', 'aria-hidden': 'true' });
  const track = el('div', { class: 'joystick-track' }, [port, knob, starboard]);
  const root = el(
    'div',
    {
      class: `thruster-joystick thruster-joystick-${variant}`,
      'data-testid': `thruster-${which}${suffix}`,
      'data-part-id': PARTS[which],
      'data-dir': '0',
      role: 'group',
      'aria-label': t(GROUP_LABELS[which]),
    },
    variant === 'quick'
      ? [track]
      : [el('span', { class: 'joystick-label' }, [t(END_LABELS[which])]), track],
  );

  const refresh = (state: AppState) => {
    const dir = state.thrusters[which];
    if (root.getAttribute('data-dir') !== String(dir)) root.setAttribute('data-dir', String(dir));
    port.setAttribute('aria-pressed', String(dir === -1));
    starboard.setAttribute('aria-pressed', String(dir === 1));
  };
  store.subscribe((state, previous) => {
    if (state.thrusters[which] !== previous.thrusters[which]) refresh(state);
  });
  refresh(store.getState());
  return root;
}

/** The status line under the joysticks: off, or which parts run, and when they are weak. */
export function thrusterStatusText(state: AppState): string {
  const parts: string[] = [];
  for (const end of ['bow', 'stern'] as const) {
    const dir = state.thrusters[end];
    if (dir !== 0) parts.push(t(STATUS_PARTS[end][dir < 0 ? 'port' : 'starboard']));
  }
  if (parts.length === 0) return t('thrusters.off');
  let text = t('thrusters.on', { parts: parts.join(', ') });
  if (thrusterSpeedFactor(state.boat.speedMps) < 0.65) text += ` ${t('thrusters.weak')}`;
  return text;
}

/** Both joysticks side by side, as in the Helm station. */
export function createThrusterPair(store: Store, variant: JoystickVariant): HTMLElement {
  return el('div', { class: `thruster-pair thruster-pair-${variant}` }, [
    createThrusterJoystick(store, 'bow', variant),
    createThrusterJoystick(store, 'stern', variant),
  ]);
}

/** The Thrusters section: both joysticks, the status line and the explanation. */
export function createThrusterPanel(store: Store): HTMLElement[] {
  const status = el('p', {
    class: 'thrusters-status',
    'data-testid': 'thrusters-status',
    'aria-live': 'polite',
  });
  const refresh = (state: AppState) => setText(status, thrusterStatusText(state));
  store.subscribe(refresh);
  refresh(store.getState());
  return [
    createThrusterJoystick(store, 'bow', 'section'),
    createThrusterJoystick(store, 'stern', 'section'),
    status,
    el('p', { class: 'hint explain' }, [t('thrusters.hint')]),
  ];
}
