import { el } from './dom';

/** Press-and-hold on a − / + button (PHASE1_SPEC 7.1): first repeat, then faster and faster. */
const HOLD_FIRST_DELAY_MS = 420;
const HOLD_REPEAT_MS = 160;
const HOLD_FASTEST_MS = 45;
const HOLD_ACCELERATION = 0.85;

/**
 * A − or + button that acts once per tap or key press and repeats, accelerating, while it is
 * held down.
 */
export function stepButton(
  label: string,
  ariaLabel: string,
  action: () => void,
): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'step-button', 'aria-label': ariaLabel }, [
    label,
  ]);
  let timer: number | undefined;
  let delay = HOLD_REPEAT_MS;
  const stop = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  const tick = () => {
    action();
    delay = Math.max(HOLD_FASTEST_MS, delay * HOLD_ACCELERATION);
    timer = window.setTimeout(tick, delay);
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    event.preventDefault();
    stop();
    action();
    delay = HOLD_REPEAT_MS;
    timer = window.setTimeout(tick, HOLD_FIRST_DELAY_MS);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur'] as const) {
    button.addEventListener(type, stop);
  }
  // Keyboard (Enter / Space) gives a click without a pointer press.
  button.addEventListener('click', (event) => {
    if (event.detail === 0) action();
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  return button;
}

/** Sets text only when it changed (the panel refreshes every frame). */
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
