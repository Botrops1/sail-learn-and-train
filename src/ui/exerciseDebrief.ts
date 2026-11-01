import type { ExerciseRun } from '../app/exerciseRun';
import { alertTimeText } from '../model/alerts';
import { debriefRows, debriefSummary } from '../model/debrief';
import {
  EXERCISE_SETTINGS,
  exerciseText,
  type ExerciseDef,
  type LoggedAction,
} from '../model/exercises';
import { tailSpec } from '../model/realistic';
import { alertText } from './alertCentre';
import { el } from './dom';
import { currentLanguage, t, type StringKey } from './i18n';

/** Where the "Show my actions" switch is kept between re-renders (the panel's closure). */
export interface DebriefView {
  showActions: boolean;
}

const CONTROL_NAME: Readonly<Record<string, StringKey>> = {
  ctl_mainsheet: 'control.mainsheet',
  ctl_jib_sheet: 'control.jibSheet',
  ctl_vang: 'control.vang',
  ctl_topping_lift: 'control.toppingLift',
  ctl_main_furl: 'control.mainFurl',
  ctl_jib_furl: 'control.jibFurl',
};

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

function sideOf(winch: string | null): string {
  if (winch?.endsWith('_port')) return t('side.port.gen');
  if (winch?.endsWith('_starboard')) return t('side.starboard.gen');
  return '';
}

/** The words for one logged action (PHASE10_SPEC 8.4). */
export function actionText(action: LoggedAction): string {
  switch (action.type) {
    case 'control': {
      if (action.id === 'ctl_rudder') {
        return t('debrief.wheel', { from: signed(action.from), to: signed(action.to) });
      }
      const key = CONTROL_NAME[action.id];
      return t('debrief.control', {
        name: key ? t(key) : action.id,
        from: action.from,
        to: action.to,
      });
    }
    case 'autopilot':
      if (action.command === 'turn') {
        return action.turnDeg < 0
          ? t('debrief.ap.turnPort', { deg: Math.abs(action.turnDeg) })
          : t('debrief.ap.turnStarboard', { deg: Math.abs(action.turnDeg) });
      }
      return t(`debrief.ap.${action.command}` as 'debrief.ap.off');
    case 'engine':
      if (action.command === 'lever') return t('debrief.engine.lever', { pct: action.leverPct });
      return t(action.command === 'start' ? 'debrief.engine.start' : 'debrief.engine.stop');
    case 'realistic': {
      const target = action.target;
      const label = (target !== null ? tailSpec(target)?.label : undefined) ?? target ?? '';
      const side = sideOf(target);
      const station = target ? t(`debrief.station.${target}` as 'debrief.station.port') : '';
      switch (action.gesture) {
        case 'station':
          return t('debrief.rope.station', { station });
        case 'clutch':
          return t(action.on ? 'debrief.rope.clutchOpen' : 'debrief.rope.clutchClose', { label });
        case 'onWinch':
          return t('debrief.rope.onWinch', { label });
        case 'offWinch':
          return t('debrief.rope.offWinch', { side });
        case 'turn':
          return t('debrief.rope.turn', { side });
        case 'selfTailer':
          return t(action.on ? 'debrief.rope.selfTailerIn' : 'debrief.rope.selfTailerOut', {
            side,
          });
        case 'button':
          return t(action.on ? 'debrief.rope.buttonHeld' : 'debrief.rope.buttonLet', { side });
        case 'ease':
          return t('debrief.rope.ease', { label });
        case 'pull':
          return t('debrief.rope.pull', {
            label: target === null ? t('debrief.rope.nothing') : label,
          });
        case 'handle':
          return t('debrief.rope.handle');
        case 'crank':
          return t('debrief.rope.crank');
        case 'gearbox':
          return t('debrief.rope.gearbox');
        default:
          return '';
      }
    }
  }
}

/**
 * The debrief of a run (PHASE10_SPEC 8.4): a summary line, a switch for the learner's actions and
 * the log as a list, with the actions just before each mistake.
 */
export function createDebrief(
  run: ExerciseRun,
  def: ExerciseDef,
  view: DebriefView = { showActions: false },
): HTMLElement {
  const text = exerciseText(def.id, currentLanguage());
  const summary = debriefSummary(run.log, def.steps.length, run.elapsedS);
  const rows = debriefRows(run.log);
  const root = el('div', { class: 'exercise-debrief', 'data-testid': 'exercise-debrief' });
  const toggle = el(
    'button',
    {
      type: 'button',
      class: 'exercise-button',
      'aria-pressed': String(view.showActions),
      'data-testid': 'debrief-actions-toggle',
    },
    [t('debrief.actions')],
  );
  const list = el('ol', { class: 'debrief-list', 'data-testid': 'debrief-list' });

  function fill(): void {
    list.replaceChildren();
    for (const row of rows) {
      const entry = row.entry;
      if (entry.kind === 'action' && !view.showActions) continue;
      const item = el('li', { 'data-testid': 'debrief-row', 'data-kind': entry.kind }, [
        el('span', { class: 'debrief-time' }, [alertTimeText(entry.atS)]),
      ]);
      const body = el('div', { class: 'debrief-body' });
      switch (entry.kind) {
        case 'start':
          body.append(
            entry.step === 0 ? t('debrief.start') : t('debrief.startAt', { n: entry.step + 1 }),
          );
          break;
        case 'step':
          body.append(
            el('span', { class: 'debrief-tick' }, ['✓']),
            ' ',
            t('debrief.step', {
              n: entry.step + 1,
              goal: text.steps[entry.stepId]?.goal ?? entry.stepId,
            }),
          );
          break;
        case 'finish':
          body.append(t('debrief.finish'));
          break;
        case 'back':
          body.append(t('debrief.back', { n: entry.step + 1 }));
          break;
        case 'event':
          body.append(alertText(entry.entry));
          break;
        case 'action':
          body.append(actionText(entry.action));
          break;
        case 'mistake': {
          const m = text.mistakes[entry.mistakeId];
          body.append(
            m?.what ?? entry.mistakeId,
            el('p', {}, [m?.why ?? '']),
            el('p', {}, [m?.fix ?? '']),
            el('p', { class: 'debrief-just-before' }, [
              row.causes.length > 0
                ? t('debrief.justBefore')
                : t('debrief.noCause', { s: EXERCISE_SETTINGS.causeWindowS }),
            ]),
          );
          if (row.causes.length > 0) {
            body.append(
              el(
                'ul',
                { class: 'debrief-causes' },
                row.causes.map((cause) =>
                  el('li', {}, [
                    el('span', { class: 'debrief-time' }, [alertTimeText(cause.atS)]),
                    actionText(cause.action),
                  ]),
                ),
              ),
            );
          }
          item.classList.add(entry.serious ? 'debrief-serious' : 'debrief-mistake');
          break;
        }
      }
      item.append(body);
      list.append(item);
    }
  }
  toggle.addEventListener('click', () => {
    view.showActions = !view.showActions;
    toggle.setAttribute('aria-pressed', String(view.showActions));
    fill();
  });
  fill();
  root.append(
    el('h4', {}, [t('debrief.title')]),
    el('p', { 'data-testid': 'debrief-summary' }, [
      t('debrief.summary', {
        time: alertTimeText(summary.timeS),
        done: summary.stepsDone,
        total: summary.total,
        mistakes: summary.mistakes,
      }),
    ]),
    toggle,
    list,
  );
  return root;
}
