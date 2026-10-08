import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import type { RopeStatus } from '../model/boomSolver';
import { controlSpec, snapControl, type ControlId } from '../model/controls';
import { mainFurlLengths } from '../model/mainFurl';
import { jibFurlingLinePaidOut, jibSheetPaidOutFor } from '../model/jib';
import { mainsheetPaidOut, sheetPctToClear } from '../model/mainsheet';
import { toppingLiftPaidOut, vangPaidOut } from '../model/pitchLimits';
import { partInfo } from '../model/registry';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText, stepButton } from './stepper';

/**
 * Temporary rope control list (PHASE1_SPEC 12, M2 and M3): the ropes of the mainsail and the
 * jib as sliders with − / + buttons. Each shows its value, the rope paid out in metres and a
 * state chip (taut / slack / fighting). The clutch-bank drawing replaces this list in M4.
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
  {
    id: 'ctl_jib_sheet',
    ropeId: 'rope_jib_sheet',
    name: 'control.jibSheet',
    unit: 'eased',
    status: (s) => s.rig.jibSolution.sheet,
    paidOut: (s) => jibSheetPaidOutFor(s.rig.jibSolution.sheetAvailable),
  },
  {
    id: 'ctl_jib_furl',
    ropeId: 'rope_jib_furling_line',
    name: 'control.jibFurl',
    unit: 'unfurled',
    paidOut: (s) => jibFurlingLinePaidOut(s.rig.jibSolution.unfurled),
  },
];

/** Closer than this to the middle of its track (metres), the car is "in the middle". */
const CAR_MIDDLE_M = 0.05;

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
        // PT-06 / PT-09: a hauled topping lift holds the boom up, so the hauled sheet cannot
        // swing it until it is eased past the boom's height on the lift.
        if (state.rig.solution.mainsheet.state === 'fighting') {
          lines.push(
            t('main.fightingLift', {
              pct: Math.ceil(sheetPctToClear(state.rig.solution.lowerDeg)),
            }),
          );
        }
      }
      if (control.id === 'ctl_jib_sheet') {
        const jib = state.rig.jibSolution;
        const calm = state.controls.ctl_wind_speed < boat.visual.solver.minWindKn;
        const key = jib.furled
          ? 'jib.furled'
          : calm
            ? 'jib.calm'
            : jib.fill < 0.5
              ? 'jib.luffing'
              : 'jib.filled';
        lines.push(t(key, { angle: Math.round(Math.abs(jib.headingDeg)) }));
        if (jib.sheet.state === 'fighting') lines.push(t('jib.sheetFightsFurl'));
        else if (jib.sheetReleased && jib.unfurled < 1) lines.push(t('jib.sheetReleased'));
        const track = boat.rig.selfTackingTrack.halfSpan;
        const side = { side: t(jib.carZ < 0 ? 'wind.side.port' : 'wind.side.starboard') };
        lines.push(
          Math.abs(jib.carZ) >= track - 1e-6
            ? t('jib.carEnd', side)
            : Math.abs(jib.carZ) < CAR_MIDDLE_M
              ? t('jib.carMiddle')
              : t('jib.car', side),
        );
      }
      if (control.id === 'ctl_jib_furl' && state.rig.jibSolution.furlBlocked) {
        lines.push(t('jib.furlBlocked', { pct: Math.round(state.rig.jibSolution.unfurled * 100) }));
      }
      if (control.id === 'ctl_main_furl') {
        const furl = mainFurlLengths(state.rig.applied.mainFurl);
        lines.push(
          t('furl.inTail', { m: metres(furl.inTailPaidOut) }),
          t('furl.outTail', { m: metres(furl.outTailPaidOut) }),
          t('furl.outhaul', { m: metres(furl.outhaulPaidOut) }),
        );
      }
      lines.forEach((text, index) => {
        const line = metaLine(index);
        line.hidden = false;
        setText(line, text);
      });
      // Hints come and go (fighting, furl stopped): hide lines not needed now.
      metaLines.slice(lines.length).forEach((line) => {
        line.hidden = true;
      });
    });
  }

  const refresh = (state: AppState) => refreshers.forEach((update) => update(state));
  store.subscribe(refresh);
  refresh(store.getState());

  return el('div', {}, [
    el('p', { class: 'hint' }, [t('ropes.hint')]),
    list,
    el('p', { class: 'hint' }, [t('furl.hint')]),
    el('p', { class: 'hint' }, [t('jib.hint')]),
  ]);
}
