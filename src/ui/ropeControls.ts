import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import type { RopeStatus } from '../model/boomSolver';
import { controlSpec, snapControl, type ControlId } from '../model/controls';
import { mainFurlLengths } from '../model/mainFurl';
import { jibFurlingLinePaidOut, jibSheetPaidOutFor } from '../model/jib';
import { mainsheetPaidOut, sheetPctToClear } from '../model/mainsheet';
import { toppingLiftPaidOut, vangPaidOut } from '../model/pitchLimits';
import { partInfo } from '../model/registry';
import { wheelTurns } from '../model/steering';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText, stepButton } from './stepper';

/**
 * One control (PHASE1_SPEC 7.1): a slider with − / + buttons (press and hold repeats), its value,
 * the rope paid out in metres and a state chip (taut / slack / fighting), plus the lines that
 * explain what the rope is doing. Easy mode of the Ropes tab shows the selected one.
 */

export interface ControlView {
  id: ControlId;
  /** data-part-id of the control: its rope's id, or part_rudder for the wheel. */
  partId: string;
  name: StringKey;
  unit: 'eased' | 'unfurled' | 'rudder';
  /** Rope state from the solver, if this rope has one. */
  status?: (state: AppState) => RopeStatus;
  paidOut?: (state: AppState) => number;
}

export const CONTROL_VIEWS: readonly ControlView[] = [
  {
    id: 'ctl_mainsheet',
    partId: 'rope_mainsheet',
    name: 'control.mainsheet',
    unit: 'eased',
    status: (s) => s.rig.solution.mainsheet,
    paidOut: (s) => mainsheetPaidOut(s.rig.applied.mainsheet),
  },
  {
    id: 'ctl_vang',
    partId: 'rope_vang',
    name: 'control.vang',
    unit: 'eased',
    status: (s) => s.rig.solution.vang,
    paidOut: (s) => vangPaidOut(s.rig.applied.vang),
  },
  {
    id: 'ctl_topping_lift',
    partId: 'rope_topping_lift',
    name: 'control.toppingLift',
    unit: 'eased',
    status: (s) => s.rig.solution.toppingLift,
    paidOut: (s) => toppingLiftPaidOut(s.rig.applied.toppingLift),
  },
  {
    id: 'ctl_main_furl',
    partId: 'rope_main_furling_line',
    name: 'control.mainFurl',
    unit: 'unfurled',
  },
  {
    id: 'ctl_jib_sheet',
    partId: 'rope_jib_sheet',
    name: 'control.jibSheet',
    unit: 'eased',
    status: (s) => s.rig.jibSolution.sheet,
    paidOut: (s) => jibSheetPaidOutFor(s.rig.jibSolution.sheetAvailable),
  },
  {
    id: 'ctl_jib_furl',
    partId: 'rope_jib_furling_line',
    name: 'control.jibFurl',
    unit: 'unfurled',
    paidOut: (s) => jibFurlingLinePaidOut(s.rig.jibSolution.unfurled),
  },
  {
    id: 'ctl_rudder',
    partId: 'part_rudder',
    name: 'control.wheel',
    unit: 'rudder',
  },
];

export function controlView(id: ControlId): ControlView {
  const view = CONTROL_VIEWS.find((candidate) => candidate.id === id);
  if (!view) throw new Error(`No panel view for ${id}.`);
  return view;
}

function metres(value: number): string {
  return value.toFixed(1);
}

export function stateText(status: RopeStatus): string {
  if (status.state === 'slack' && status.slack >= 0.05) {
    return t('state.slackBy', { m: metres(status.slack) });
  }
  return t(`state.${status.state}`);
}

/** "35 % eased", "80 % unfurled", "10° to starboard". */
export function valueText(view: ControlView, value: number): string {
  if (view.unit !== 'rudder') return t(`unit.${view.unit}`, { value: Math.round(value) });
  const deg = Math.round(Math.abs(value));
  if (deg === 0) return t('wheel.centred');
  return t(value > 0 ? 'wheel.starboard' : 'wheel.port', { deg });
}

/** The explaining lines under a control (the M2 and M3 hints, metres paid out, …). */
function metaLines(view: ControlView, state: AppState): string[] {
  const lines: string[] = [];
  if (view.paidOut) lines.push(t('control.paidOut', { m: metres(view.paidOut(state)) }));
  const calm = state.controls.ctl_wind_speed < boat.visual.solver.minWindKn;
  switch (view.id) {
    case 'ctl_mainsheet': {
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
          t('main.fightingLift', { pct: Math.ceil(sheetPctToClear(state.rig.solution.lowerDeg)) }),
        );
      }
      break;
    }
    case 'ctl_jib_sheet': {
      const jib = state.rig.jibSolution;
      const key = jib.furled
        ? 'jib.furled'
        : calm
          ? 'jib.calm'
          : jib.fill < 0.5
            ? 'jib.luffing'
            : 'jib.filled';
      lines.push(t(key, { angle: Math.round(Math.abs(jib.headingDeg)) }));
      if (
        !calm &&
        !jib.furled &&
        Math.abs(state.controls.ctl_wind_dir) >= boat.visual.jibWindShadowNoteFromDeg
      ) {
        lines.push(t('jib.windShadow'));
      }
      if (jib.sheet.state === 'fighting') lines.push(t('jib.sheetFightsFurl'));
      else if (jib.sheetReleased && jib.unfurled < 1) lines.push(t('jib.sheetReleased'));
      const track = boat.rig.selfTackingTrack.halfSpan;
      const side = { side: t(jib.carZ < 0 ? 'wind.side.port' : 'wind.side.starboard') };
      lines.push(
        Math.abs(jib.carZ) >= track - 1e-6
          ? t('jib.carEnd', side)
          : Math.abs(jib.carZ) < boat.visual.jibCarMiddleM
            ? t('jib.carMiddle')
            : t('jib.car', side),
      );
      break;
    }
    case 'ctl_jib_furl':
      if (state.rig.jibSolution.furlBlocked) {
        lines.push(t('jib.furlBlocked', { pct: Math.round(state.rig.jibSolution.unfurled * 100) }));
      }
      break;
    case 'ctl_main_furl': {
      const furl = mainFurlLengths(state.rig.applied.mainFurl);
      lines.push(
        t('furl.inTail', { m: metres(furl.inTailPaidOut) }),
        t('furl.outTail', { m: metres(furl.outTailPaidOut) }),
        t('furl.outhaul', { m: metres(furl.outhaulPaidOut) }),
      );
      break;
    }
    case 'ctl_rudder': {
      const rudder = state.rig.applied.rudder;
      const turns = Math.abs(wheelTurns(rudder));
      if (Math.round(Math.abs(rudder)) > 0) {
        lines.push(
          t(rudder > 0 ? 'wheel.turnsClockwise' : 'wheel.turnsAnticlockwise', {
            turns: turns.toFixed(1),
          }),
        );
      }
      lines.push(t('wheel.visualOnly'));
      break;
    }
    default:
      break;
  }
  return lines;
}

export interface ControlElement {
  element: HTMLElement;
  refresh(state: AppState): void;
}

/** Builds one control. `extra` goes between the head and the slider (e.g. a shared-control hint). */
export function createControl(
  store: Store,
  view: ControlView,
  extra: HTMLElement[] = [],
): ControlElement {
  const spec = controlSpec(view.id);
  const name = t(view.name);
  const inputId = `control-${view.id}`;
  const labels = partInfo(view.partId)?.boatLabels ?? [];
  const set = (value: number) =>
    store.dispatch({
      type: 'setControls',
      values: { [view.id]: snapControl(view.id, value, store.getState().settings.step) },
    });
  const nudge = (direction: 1 | -1) => {
    const state = store.getState();
    set(state.controls[view.id] + direction * state.settings.step);
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

  const element = el('div', { class: 'control', 'data-part-id': view.partId }, [
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
    ...extra,
    el('div', { class: 'control-row' }, [
      stepButton('−', t(view.unit === 'rudder' ? 'wheel.less' : 'control.less', { name }), () =>
        nudge(-1),
      ),
      slider,
      stepButton('+', t(view.unit === 'rudder' ? 'wheel.more' : 'control.more', { name }), () =>
        nudge(1),
      ),
    ]),
    meta,
  ]);

  const lines: HTMLElement[] = [];
  const line = (index: number) => {
    let node = lines[index];
    if (!node) {
      node = el('span', { class: 'meta-line' });
      lines.push(node);
      meta.append(node);
    }
    return node;
  };

  const refresh = (state: AppState) => {
    const target = state.controls[view.id];
    if (slider.value !== String(target)) slider.value = String(target);
    if (slider.step !== String(state.settings.step)) slider.step = String(state.settings.step);
    setText(value, valueText(view, target));
    if (view.status) {
      const status = view.status(state);
      chip.hidden = false;
      chip.dataset.state = status.state;
      setText(chip, stateText(status));
    }
    const texts = metaLines(view, state);
    texts.forEach((text, index) => {
      const node = line(index);
      node.hidden = false;
      setText(node, text);
    });
    // Hints come and go (fighting, furl stopped): hide lines not needed now.
    lines.slice(texts.length).forEach((node) => {
      node.hidden = true;
    });
  };
  return { element, refresh };
}
