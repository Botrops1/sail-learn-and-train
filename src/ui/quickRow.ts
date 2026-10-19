import type { AppState, Store } from '../app/store';
import { snapControl, type ControlId } from '../model/controls';
import { gearOf } from '../model/engine';
import { entryFor } from '../model/panelEntries';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { leverText } from './enginePanel';
import { nameOf } from './learnTab';
import { controlView, valueText } from './ropeControls';
import type { Sheet } from './sheet';
import { setText, stepButton } from './stepper';
import { createThrusterJoystick } from './thrusterPanel';

/**
 * The quick row in the sheet's head (PHASE5_SPEC 8.5): what the sheet shows at its lowest height,
 * under the handle. Easy: the selected rope's name and value with − and + (same steps as the
 * slider). Harbour (M41, PHASE7_SPEC 7.6) with Easy ropes: the engine lever's − and + and the two
 * thruster joysticks. Realistic and Learn: one line of advice, or in Learn the open entry with a
 * Read button. CSS alone shows it at peek (`.quick-row` is `display: none` otherwise); the content
 * follows the store.
 */
export function createQuickRow(head: HTMLElement, store: Store, sheet: Sheet): void {
  const hint = el('p', { class: 'quick-hint', 'data-testid': 'quick-hint' });
  const name = el('span', { class: 'quick-name', 'data-testid': 'quick-name' });
  const value = el('span', { class: 'quick-value', 'data-testid': 'quick-value' });
  const read = el(
    'button',
    { type: 'button', class: 'action-button quick-read', 'data-testid': 'quick-read' },
    [t('quick.read')],
  );
  read.addEventListener('click', () => sheet.setHeight('half'));

  let controlId: ControlId | null = null;
  const nudge = (direction: 1 | -1) => {
    if (!controlId) return;
    const state = store.getState();
    store.dispatch({
      type: 'setControls',
      values: {
        [controlId]: snapControl(
          controlId,
          state.controls[controlId] + direction * state.settings.step,
          state.settings.step,
        ),
      },
    });
  };
  const less = stepButton('−', '', () => nudge(-1));
  const more = stepButton('+', '', () => nudge(1));
  const buttons = el('span', { class: 'quick-buttons' }, [less, more]);

  // Harbour mode: [−] value [+] and the two compact joysticks (44 + 40 + 44 + 88 + 88 + 4 gaps of 8 = 336 px).
  const leverStep = (direction: 1 | -1) => {
    const { engine } = store.getState();
    if (!engine.running) return;
    store.dispatch({
      type: 'engine',
      command: { leverPct: Math.max(-100, Math.min(100, engine.leverPct + direction * 10)) },
    });
  };
  const leverLess = stepButton('−', t('engine.lever.less'), () => leverStep(-1));
  const leverMore = stepButton('+', t('engine.lever.more'), () => leverStep(1));
  leverLess.dataset.testid = 'quick-lever-less';
  leverMore.dataset.testid = 'quick-lever-more';
  const leverValue = el('span', { class: 'quick-lever-value', 'data-testid': 'quick-lever-value' });
  // A small tag over each group names it (owner, PR #99).
  const tagged = (tag: StringKey, testId: string, parts: HTMLElement[]) =>
    el('div', { class: 'quick-group', 'data-testid': testId }, [
      el('span', { class: 'quick-tag' }, [t(tag)]),
      el('div', { class: 'quick-group-row' }, parts),
    ]);
  const harbour = el('div', { class: 'quick-harbour', 'data-testid': 'quick-harbour' }, [
    tagged('quick.harbour.engine', 'quick-engine', [leverLess, leverValue, leverMore]),
    tagged('quick.harbour.thrusters', 'quick-thrusters', [
      createThrusterJoystick(store, 'bow', 'quick'),
      createThrusterJoystick(store, 'stern', 'quick'),
    ]),
  ]);

  const root = el('div', { class: 'quick-row', 'data-testid': 'quick-row' }, [
    hint,
    name,
    value,
    buttons,
    read,
    harbour,
  ]);
  head.append(root);

  const render = (state: AppState) => {
    controlId = null;
    let text = '';
    let showControl = false;
    let showRead = false;
    let showHarbour = false;
    if (state.appMode === 'easy') {
      const id = entryFor(state.selection)?.controlId ?? null;
      if (id) {
        controlId = id;
        showControl = true;
        const view = controlView(id);
        const label = t(view.name);
        setText(name, label);
        setText(value, valueText(view, state.controls[id]));
        const wheel = view.unit === 'rudder';
        less.setAttribute('aria-label', t(wheel ? 'wheel.less' : 'control.less', { name: label }));
        more.setAttribute('aria-label', t(wheel ? 'wheel.more' : 'control.more', { name: label }));
      } else {
        text = t('quick.easy');
      }
    } else if (state.appMode === 'harbour' && state.settings.ropesMode === 'easy') {
      showHarbour = true;
      const { engine } = state;
      leverLess.disabled = leverMore.disabled = !engine.running;
      if (engine.running) {
        const lever = engine.leverPct;
        const arrow = lever > 0 ? '▲' : '▼';
        setText(
          leverValue,
          gearOf(lever) === 'neutral'
            ? t('quick.harbour.short', { arrow: '', n: 'N' })
            : t('quick.harbour.short', { arrow, n: Math.round(Math.abs(lever)) }),
        );
        leverValue.setAttribute('aria-label', leverText(lever));
      } else {
        setText(leverValue, '–');
        leverValue.setAttribute('aria-label', t('quick.harbour.engineOff'));
      }
    } else if (state.appMode === 'realistic' || state.appMode === 'harbour') {
      text = t('quick.realistic');
    } else if (state.learn) {
      showRead = true;
      setText(name, nameOf(state.learn));
    } else {
      text = t('quick.learn');
    }
    hint.hidden = text === '';
    setText(hint, text);
    name.hidden = !showControl && !showRead;
    value.hidden = !showControl;
    buttons.hidden = !showControl;
    read.hidden = !showRead;
    harbour.hidden = !showHarbour;
  };
  store.subscribe(render);
  render(store.getState());
}
