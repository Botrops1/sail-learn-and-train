import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import type { RopeStatus } from '../model/boomSolver';
import { controlSpec, snapControl, type ControlId } from '../model/controls';
import { mainFurlLengths } from '../model/mainFurl';
import { mainsheetPaidOut } from '../model/mainsheet';
import { toppingLiftPaidOut, vangPaidOut } from '../model/pitchLimits';
import { partInfo } from '../model/registry';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText, stepButton } from './stepper';

/**
 * Temporary rope control list for M2 (PHASE1_SPEC 12, M2): the mainsail's ropes as sliders with
 * − / + buttons. Each shows its value, the rope paid out in metres and a state chip
 * (taut / slack / fighting). The clutch-bank drawing replaces this list in M4.
 */

interface RopeControl {
  id: ControlId;
  /** The rope this control moves: its data-part-id (decision 2026-10-08). */
  ropeId: string;
  name: StringKey;
  unit: 'eased' | 'unfurled';
  /** Rope state from the solver, if this rope has one. */
  status?: (state: AppState) => RopeStatus;
  paidOut?: (state: AppState) => number;
}

const ROPE_CONTROLS: RopeControl[] = [
  {
    id: 'ctl_mainsheet',
    ropeId: 'rope_mainsheet',
    name: 'control.mainsheet',
    unit: 'eased',
    status: (s) => s.rig.solution.mainsheet,
    paidOut: (s) => mainsheetPaidOut(s.rig.applied.mainsheet),
  },
  {
    id: 'ctl_vang',
    ropeId: 'rope_vang',
    name: 'control.vang',
    unit: 'eased',
    status: (s) => s.rig.solution.vang,
    paidOut: (s) => vangPaidOut(s.rig.applied.vang),
  },
  {
    id: 'ctl_topping_lift',
    ropeId: 'rope_topping_lift',
    name: 'control.toppingLift',
    unit: 'eased',
    status: (s) => s.rig.solution.toppingLift,
    paidOut: (s) => toppingLiftPaidOut(s.rig.applied.toppingLift),
  },
  {
    id: 'ctl_main_furl',
    ropeId: 'rope_main_furling_line',
    name: 'control.mainFurl',
    unit: 'unfurled',
  },
];

function metres(value: number): string {
  return value.toFixed(1);
}

function stateText(status: RopeStatus): string {
  if (status.state === 'slack' && status.slack >= 0.05) {
    return t('state.slackBy', { m: metres(status.slack) });
  }
  return t(`state.${status.state}`);
}

export function createRopeControls(store: Store): HTMLElement {
  const list = el('div', { class: 'controls', 'data-testid': 'rope-controls' });
  const refreshers: ((state: AppState) => void)[] = [];

  for (const control of ROPE_CONTROLS) {
    const spec = controlSpec(control.id);
    const name = t(control.name);
    const inputId = `control-${control.id}`;
    const labels = partInfo(control.ropeId)?.boatLabels ?? [];
    const set = (value: number) =>
      store.dispatch({
        type: 'setControls',
        values: { [control.id]: snapControl(control.id, value, store.getState().settings.step) },
      });
    const nudge = (direction: 1 | -1) => {
      const state = store.getState();
      set(state.controls[control.id] + direction * state.settings.step);
    };

    const slider = el('input', {
      type: 'range',
      id: inputId,
      min: String(spec.min),
      max: String(spec.max),
      'aria-describedby': `${inputId}-meta`,
    });
    slider.addEventListener('input', () => set(Number(slider.value)));
    const value = el('span', { class: 'control-value' });
    const chip = el('span', { class: 'chip', hidden: '' });
    const meta = el('div', { class: 'control-meta', id: `${inputId}-meta` });

    const row = el('div', { class: 'control', 'data-part-id': control.ropeId }, [
      el('div', { class: 'control-head' }, [
        el('label', { for: inputId, class: 'control-name' }, [name]),
        value,
        chip,
      ]),
      ...(labels.length > 0
        ? [
            el('p', { class: 'control-boat-label' }, [
              t('card.boatLabel', { labels: labels.map((label) => `“${label}”`).join(', ') }),
            ]),
          ]
        : []),
      el('div', { class: 'control-row' }, [
        stepButton('−', t('control.less', { name }), () => nudge(-1)),
        slider,
        stepButton('+', t('control.more', { name }), () => nudge(1)),
      ]),
      meta,
    ]);
    list.append(row);

    const metaLines: HTMLElement[] = [];
    const metaLine = (index: number) => {
      let line = metaLines[index];
      if (!line) {
        line = el('span', { class: 'meta-line' });
        metaLines.push(line);
        meta.append(line);
      }
      return line;
    };

    refreshers.push((state) => {
      const target = state.controls[control.id];
      if (slider.value !== String(target)) slider.value = String(target);
      if (slider.step !== String(state.settings.step)) slider.step = String(state.settings.step);
      setText(value, t(`unit.${control.unit}`, { value: Math.round(target) }));
      if (control.status) {
        const status = control.status(state);
        chip.hidden = false;
        chip.dataset.state = status.state;
        setText(chip, stateText(status));
      }
      const lines: string[] = [];
      if (control.paidOut) lines.push(t('control.paidOut', { m: metres(control.paidOut(state)) }));
      if (control.id === 'ctl_mainsheet') {
        const calm = state.controls.ctl_wind_speed < boat.visual.solver.minWindKn;
        const key = state.rig.solution.furled
          ? 'main.furled'
          : calm
            ? 'main.calm'
            : state.rig.solution.fill < 0.5
              ? 'main.luffing'
              : 'main.filled';
        lines.push(t(key, { angle: Math.round(Math.abs(state.rig.solution.thetaDeg)) }));
      }
      if (control.id === 'ctl_main_furl') {
        const furl = mainFurlLengths(state.rig.applied.mainFurl);
        lines.push(
          t('furl.inTail', { m: metres(furl.inTailPaidOut) }),
          t('furl.outTail', { m: metres(furl.outTailPaidOut) }),
          t('furl.outhaul', { m: metres(furl.outhaulPaidOut) }),
        );
      }
      lines.forEach((text, index) => setText(metaLine(index), text));
    });
  }

  const refresh = (state: AppState) => refreshers.forEach((update) => update(state));
  store.subscribe(refresh);
  refresh(store.getState());

  return el('div', {}, [
    el('p', { class: 'hint' }, [t('ropes.hint')]),
    list,
    el('p', { class: 'hint' }, [t('furl.hint')]),
  ]);
}
