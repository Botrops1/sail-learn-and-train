import type { AppState, Store } from '../app/store';
import { wrap180 } from '../model/angles';
import { boat } from '../model/boat';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/** S / P / nothing for a wind angle to the bow (straight ahead or astern has no side). */
export function sideLetter(angleDeg: number): string {
  const a = Math.round(wrap180(angleDeg));
  if (a === 0 || Math.abs(a) === 180) return '';
  return t(a > 0 ? 'instruments.side.s' : 'instruments.side.p');
}

const MODES = ['off', 'heading', 'wind'] as const;

/**
 * The autopilot block (PHASE2_SPEC 6.5; owner: the boat's B&G holds the compass heading or the
 * true wind angle): Standby / Heading / Wind, then −10 −1 +1 +10 and Tack (Gybe when the wind
 * is behind). It sits in the Ropes tab under the wheel and at the Helm station.
 */
export function createAutopilotPanel(store: Store): HTMLElement {
  const small = boat.physics.autopilot.smallStepDeg;
  const large = boat.physics.autopilot.largeStepDeg;
  const modeButtons = MODES.map((mode) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'segment autopilot-mode',
        'aria-pressed': 'false',
        'data-testid': `autopilot-${mode}`,
      },
      [t(`autopilot.${mode}`)],
    );
    button.addEventListener('click', () => store.dispatch({ type: 'autopilot', command: mode }));
    return { mode, button };
  });

  const turnButtons = (
    [
      [-large, 'autopilot.minus10', `−${large}`],
      [-small, 'autopilot.minus1', `−${small}`],
      [small, 'autopilot.plus1', `+${small}`],
      [large, 'autopilot.plus10', `+${large}`],
    ] as const
  ).map(([turnDeg, label, text]) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'segment autopilot-turn',
        'aria-label': t(label),
        'data-testid': `autopilot-turn-${turnDeg}`,
      },
      [text],
    );
    button.addEventListener('click', () =>
      store.dispatch({ type: 'autopilot', command: { turnDeg } }),
    );
    return button;
  });
  const tack = el('button', {
    type: 'button',
    class: 'segment autopilot-tack',
    'data-testid': 'autopilot-tack',
  });
  tack.addEventListener('click', () => store.dispatch({ type: 'autopilot', command: 'tack' }));

  const status = el('p', { class: 'autopilot-status', 'data-testid': 'autopilot-status' });
  const notice = el('p', { class: 'autopilot-notice', role: 'status', hidden: '' }, [
    t('autopilot.tookWheel'),
  ]);
  const root = el(
    'section',
    {
      class: 'autopilot',
      'data-part-id': 'fit_autopilot_control',
      'data-testid': 'autopilot',
      'aria-label': t('autopilot.label'),
    },
    [
      el('h3', { class: 'section-title' }, [t('autopilot.label')]),
      el(
        'div',
        { class: 'segments autopilot-modes' },
        modeButtons.map((m) => m.button),
      ),
      el('div', { class: 'segments autopilot-turns' }, [...turnButtons, tack]),
      status,
      notice,
    ],
  );

  const refresh = (state: AppState) => {
    const { autopilot, boat: boatState } = state;
    const held = boatState.mode === 'held';
    for (const { mode, button } of modeButtons) {
      button.setAttribute('aria-pressed', String(autopilot.mode === mode));
      button.disabled = held;
    }
    const off = held || autopilot.mode === 'off';
    for (const button of turnButtons) button.disabled = off;
    tack.disabled = off;
    // Tack with the wind ahead of the beam, Gybe with it behind.
    const twa = state.rig.wind.twaDeg;
    setText(tack, t(Math.abs(twa) < 90 ? 'autopilot.tack' : 'autopilot.gybe'));
    let text: string;
    if (held) text = t('autopilot.heldStill');
    else if (autopilot.mode === 'heading') {
      text = t('autopilot.holdingHeading', { deg: Math.round(autopilot.targetDeg) % 360 });
    } else if (autopilot.mode === 'wind') {
      const target = Math.round(autopilot.targetDeg);
      text = t('autopilot.holdingWind', {
        deg: Math.abs(target),
        side: t(target < 0 ? 'wind.side.port' : 'wind.side.starboard'),
      });
    } else text = t('autopilot.standby');
    setText(status, text);
    const showNotice = state.autopilotNoticeS > 0 && !held;
    if (notice.hidden === showNotice) notice.hidden = !showNotice;
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}
