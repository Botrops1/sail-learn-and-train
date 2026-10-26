import type { AppState, Store } from '../app/store';
import { thrusterEnds, thrusterSpeedFactor, type ThrustDir } from '../model/thrusters';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText } from './stepper';

/**
 * The thrusters (M41, PHASE7_SPEC 7.6): a left-right joystick for the bow and one for the stern.
 * A thruster acts only while its joystick is held (3.1: pointer down, or Space / Enter on the
 * keyboard) and stops when it is let go, when the page loses focus or goes to the background.
 * The same joystick sits in the Engine section (under the engine lever), the quick row and the
 * Helm station; all follow `state.thrusters`. In Harbour mode the keyboard works both at once
 * (owner, PR #99): A / D push the bow to port / starboard, J / L the stern.
 */
export type JoystickVariant = 'section' | 'quick' | 'helm';

type End = 'bow' | 'stern';

const PARTS: Record<End, string> = { bow: 'part_bow_thruster', stern: 'part_stern_thruster' };
const GROUP_LABELS: Record<End, StringKey> = {
  bow: 'thrusters.bowGroup',
  stern: 'thrusters.sternGroup',
};
const END_LABELS: Record<End, StringKey> = { bow: 'thrusters.bow', stern: 'thrusters.stern' };
const KEY_NAMES: Record<End, Record<'port' | 'starboard', string>> = {
  bow: { port: 'A', starboard: 'D' },
  stern: { port: 'J', starboard: 'L' },
};
const ARIA: Record<End, Record<'port' | 'starboard', StringKey>> = {
  bow: { port: 'thrusters.bowPortAria', starboard: 'thrusters.bowStarboardAria' },
  stern: { port: 'thrusters.sternPortAria', starboard: 'thrusters.sternStarboardAria' },
};
const STATUS_PARTS: Record<End, Record<'port' | 'starboard', StringKey>> = {
  bow: { port: 'thrusters.bowPort', starboard: 'thrusters.bowStarboard' },
  stern: { port: 'thrusters.sternPort', starboard: 'thrusters.sternStarboard' },
};

/** The keys of Harbour mode: [thruster, direction] by `KeyboardEvent.code`. */
const KEYS: Record<string, readonly [End, ThrustDir]> = {
  KeyA: ['bow', -1],
  KeyD: ['bow', 1],
  KeyJ: ['stern', -1],
  KeyL: ['stern', 1],
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
  window.addEventListener('blur', () => {
    held.clear();
    release();
  });

  // Keyboard, Harbour mode only: the keys held now give each thruster's direction, so both can
  // work at once. Typing in a field, or a key with Ctrl, Alt or Meta, is left alone.
  const held = new Set<string>();
  const apply = (end: End) => {
    let dir = 0;
    for (const code of held) {
      const key = KEYS[code];
      if (key && key[0] === end) dir += key[1];
    }
    store.dispatch({ type: 'thruster', which: end, dir: Math.sign(dir) as ThrustDir });
  };
  document.addEventListener('keydown', (event) => {
    if (!(event.code in KEYS) || event.repeat) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (store.getState().appMode !== 'harbour') return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    ) {
      return;
    }
    event.preventDefault();
    held.add(event.code);
    const key = KEYS[event.code];
    if (key) apply(key[0]);
  });
  document.addEventListener('keyup', (event) => {
    if (!held.delete(event.code)) return;
    const key = KEYS[event.code];
    if (key) apply(key[0]);
  });
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
        'aria-keyshortcuts': KEY_NAMES[which][side],
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

/**
 * The joysticks of the thrusters this boat has, side by side, as in the Helm station (none when
 * the boat has no thruster: callers hide their wrapper then, see `hasAnyThruster`).
 */
export function createThrusterPair(store: Store, variant: JoystickVariant): HTMLElement {
  return el(
    'div',
    { class: `thruster-pair thruster-pair-${variant}` },
    thrusterEnds().map((end) => createThrusterJoystick(store, end, variant)),
  );
}

/** Whether the boat has a thruster at all (M57): the blocks that hold joysticks hide when not. */
export function hasAnyThruster(): boolean {
  return thrusterEnds().length > 0;
}

/**
 * The Thrusters block under the engine lever in the Engine section (owner, PR #99): a heading,
 * both joysticks side by side, the status line and the explanation.
 */
export function createThrusterPanel(store: Store): HTMLElement {
  const status = el('p', {
    class: 'thrusters-status',
    'data-testid': 'thrusters-status',
    'aria-live': 'polite',
  });
  const refresh = (state: AppState) => setText(status, thrusterStatusText(state));
  store.subscribe(refresh);
  refresh(store.getState());
  const block = el('section', { class: 'thrusters-block', 'data-testid': 'thrusters-block' }, [
    el('h3', { class: 'thrusters-title' }, [t('thrusters.label')]),
    createThrusterPair(store, 'section'),
    status,
    el('p', { class: 'hint explain' }, [t('thrusters.hint')]),
  ]);
  block.hidden = !hasAnyThruster();
  return block;
}
