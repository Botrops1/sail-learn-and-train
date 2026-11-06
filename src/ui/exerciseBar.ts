import {
  BAR_LEVER_STEP_PCT,
  BAR_TURNS_BEFORE_TAILER,
  barRowStation,
  barRowsAt,
  barShown,
  barStationsFor,
  demoCardKind,
  parseRealisticRow,
  rowMatches,
  type BarRowId,
} from '../app/exerciseBar';
import { pilotFor } from '../app/exercisePilots';
import type { AppState, Store } from '../app/store';
import { snapControl, type ControlId } from '../model/controls';
import { boat } from '../model/boat';
import { exerciseDef, exerciseText, type ExerciseDef } from '../model/exercises';
import type { LineCode } from '../model/mooringLines';
import { tailSpec, type RealisticAction, type StationId } from '../model/realistic';
import { anchorStatusText, holdButton } from './anchorPanel';
import { sideLetter } from './autopilotPanel';
import { overlayOpen } from './chipMenu';
import { el } from './dom';
import { controlsSectionFor } from './exercisePanel';
import { currentLanguage, t, type StringKey } from './i18n';
import { createStartStopButton, leverText, rpmText } from './enginePanel';
import { createLineRow, fenderStatusText } from './harbourPanel';
import type { LayoutShell } from './layout';
import { layoutKindOf, type SectionId } from './modes';
import { controlView, valueText } from './ropeControls';
import type { Sheet } from './sheet';
import { noticeText } from './stationDrawing';
import { setText, stepButton } from './stepper';
import type { ExerciseDemo } from './exerciseDemo';
import { createThrusterPair, hasAnyThruster, thrusterStatusText } from './thrusterPanel';

/**
 * The step bar (PHASE10_PHONE_SPEC 6.5): over the bottom of the 3D view while an exercise runs,
 * the controls the current step needs, so a phone never has to open the panel. The rows come from
 * the step's `bar` data (`barRowsFor`); each row is built once and refreshed on every store change.
 * On a computer each row has a number and the keys 1–4, ← →, Space work it.
 */

/** What a key does on a row: `down` is false on key-up (it matters only for holds). */
interface RowKeys {
  left?(down: boolean): void;
  right?(down: boolean): void;
  space?(down: boolean): void;
}

interface Row {
  id: string;
  element: HTMLElement;
  keys: RowKeys;
  refresh(state: AppState): void;
  /** M82: lets go of a hold this row started (the winch button); a rebuild and a blur call it. */
  release?(): void;
}

const SAFE_ID = (id: string) => id.replace(/[^a-z0-9_]+/gi, '-');

/** The text of the small line under a row's name. */
const small = (text: string) => el('span', { class: 'bar-row-small' }, [text]);

export function createExerciseBar(
  view: HTMLElement,
  store: Store,
  layout: LayoutShell,
  sheet: Sheet,
  panel: { showSection(id: SectionId): void },
  onStackResize: () => void,
  demo: ExerciseDemo,
): void {
  const bar = el('section', {
    class: 'exercise-bar',
    'data-testid': 'exercise-bar',
    'aria-label': t('exercise.bar.aria'),
  });
  // M81: the demo card stands first (above the bar); the stack's height counts it, so the framing does.
  const card = el('div', {
    class: 'exercise-demo-card',
    'data-testid': 'exercise-demo-card',
    hidden: '',
  });
  const stack = el('div', { class: 'exercise-stack', 'data-testid': 'exercise-stack' }, [
    card,
    bar,
  ]);
  view.append(stack);

  const all = el(
    'button',
    { type: 'button', class: 'exercise-bar-all', 'data-testid': 'exercise-bar-all' },
    [t('exercise.bar.all')],
  );
  const headLabel = el('span', { class: 'exercise-bar-label' }, [t('exercise.bar.label')]);
  const showMe = el(
    'button',
    {
      type: 'button',
      class: 'exercise-bar-showme',
      'data-testid': 'exercise-bar-showme',
      hidden: '',
    },
    [t('exercise.bar.showMe')],
  );
  const stopDemo = el(
    'button',
    {
      type: 'button',
      class: 'exercise-bar-stopdemo',
      'data-testid': 'exercise-bar-stopdemo',
      hidden: '',
    },
    [t('exercise.bar.stopDemo')],
  );
  const head = el('div', { class: 'exercise-bar-head' }, [headLabel, showMe, stopDemo, all]);
  // M82: the station switch and its notes (Realistic ropes, Setting and Furling the sails): Port,
  // Starboard and Helm; the autopilot and engine rows stand under Helm.
  const stationsBox = el('div', {
    class: 'bar-stations',
    'data-row': 'stations',
    'data-testid': 'bar-stations',
    role: 'group',
    'aria-label': t('real.stations.label'),
    hidden: '',
  });
  const stationButtons = new Map<string, { button: HTMLButtonElement; dot: HTMLElement }>();
  for (const station of ['port', 'starboard', 'helm'] as const) {
    const dot = el('span', { class: 'bar-station-dot', 'aria-hidden': 'true', hidden: '' });
    const button = el(
      'button',
      {
        type: 'button',
        class: 'segment bar-mode',
        'aria-pressed': 'false',
        'data-testid': `bar-station-${station}`,
      },
      [t(`real.station.${station}`), dot],
    );
    button.addEventListener('click', () =>
      store.dispatch({ type: 'realistic', action: { type: 'station', station } }),
    );
    stationButtons.set(station, { button, dot });
    stationsBox.append(button);
  }
  const otherStation = el(
    'p',
    { class: 'bar-nothing', 'data-testid': 'bar-other-station', hidden: '' },
    [t('exercise.bar.otherStation')],
  );
  const noticeLine = el('p', {
    class: 'bar-notice',
    'data-testid': 'bar-notice',
    'aria-live': 'polite',
    hidden: '',
  });
  const rowsBox = el('div', { class: 'bar-rows' });
  const nothing = el('p', { class: 'bar-nothing', 'data-testid': 'bar-nothing', hidden: '' }, [
    t('exercise.bar.nothing'),
  ]);
  const keysHint = el('p', { class: 'bar-keys', 'data-testid': 'bar-keys', hidden: '' }, [
    t('exercise.bar.keys'),
  ]);
  bar.append(head, stationsBox, otherStation, rowsBox, noticeLine, nothing, keysHint);

  const kind = () => layoutKindOf(layout.viewport());

  // ---- the rows ---------------------------------------------------------------------------

  const nameBlock = (rowId: string, name: string, line: HTMLElement | null) => {
    const label = el('span', { class: 'bar-row-title', id: `bar-name-${SAFE_ID(rowId)}` }, [name]);
    const block = el('div', { class: 'bar-row-name' }, [label]);
    if (line) block.append(line);
    return { block, label };
  };
  const rowElement = (rowId: string, name: HTMLElement, controls: HTMLElement[]) => {
    const node = el(
      'div',
      {
        class: 'bar-row',
        'data-row': rowId,
        'data-testid': `bar-row-${rowId.replace(/:/g, '-')}`,
        role: 'group',
        'aria-labelledby': `bar-name-${SAFE_ID(rowId)}`,
      },
      [name, ...controls],
    );
    return node;
  };
  const buttonsBox = (buttons: HTMLElement[]) => el('div', { class: 'bar-buttons' }, buttons);

  const controlRow = (id: ControlId): Row => {
    const rowId = `control:${id}`;
    const view = controlView(id);
    const name = t(view.name);
    const lineKey: StringKey =
      id === 'ctl_rudder'
        ? 'exercise.bar.rudder'
        : id === 'ctl_main_furl' || id === 'ctl_jib_furl'
          ? 'exercise.bar.furl'
          : 'exercise.bar.sheet';
    const nudge = (direction: 1 | -1) => {
      const state = store.getState();
      store.dispatch({
        type: 'setControls',
        values: {
          [id]: snapControl(
            id,
            state.controls[id] + direction * state.settings.step,
            state.settings.step,
          ),
        },
      });
    };
    const less = stepButton('−', t('exercise.bar.lessAria', { name }), () => nudge(-1));
    const more = stepButton('+', t('exercise.bar.moreAria', { name }), () => nudge(1));
    less.dataset.testid = `bar-${SAFE_ID(id)}-less`;
    more.dataset.testid = `bar-${SAFE_ID(id)}-more`;
    const value = el('span', { class: 'bar-value', 'data-testid': `bar-value-${SAFE_ID(id)}` });
    const { block } = nameBlock(rowId, name, small(t(lineKey)));
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([less, value, more])]),
      keys: {
        left: (down) => down && nudge(-1),
        right: (down) => down && nudge(1),
      },
      refresh: (state) => setText(value, valueText(view, state.controls[id])),
    };
  };

  const apText = (state: AppState): string => {
    const { autopilot } = state;
    if (autopilot.mode === 'heading') {
      const deg = Math.round(((autopilot.targetDeg % 360) + 360) % 360);
      return t('exercise.bar.ap.heading', { deg });
    }
    if (autopilot.mode === 'wind') {
      return t('exercise.bar.ap.wind', {
        deg: Math.round(Math.abs(autopilot.targetDeg)),
        side: sideLetter(autopilot.targetDeg),
      });
    }
    return t('exercise.bar.ap.off');
  };
  const held = (state: AppState) => state.boat.mode === 'held';

  const autopilotTurnRow = (): Row => {
    const rowId = 'autopilot:turn';
    const large = boat.physics.autopilot.largeStepDeg;
    const turn = (deg: number) => store.dispatch({ type: 'autopilot', command: { turnDeg: deg } });
    const port = el(
      'button',
      {
        type: 'button',
        class: 'step-button bar-wide',
        'data-testid': 'bar-ap-port',
        'aria-label': t('exercise.bar.ap.portAria', { deg: large }),
      },
      [`◀ ${large}°`],
    );
    const starboard = el(
      'button',
      {
        type: 'button',
        class: 'step-button bar-wide',
        'data-testid': 'bar-ap-starboard',
        'aria-label': t('exercise.bar.ap.starboardAria', { deg: large }),
      },
      [`${large}° ▶`],
    );
    port.addEventListener('click', () => turn(-large));
    starboard.addEventListener('click', () => turn(large));
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.autopilot'), line);
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([port, starboard])]),
      keys: {
        left: (down) => down && !port.disabled && turn(-large),
        right: (down) => down && !starboard.disabled && turn(large),
      },
      refresh(state) {
        setText(line, apText(state));
        port.disabled = starboard.disabled = held(state) || state.autopilot.mode === 'off';
      },
    };
  };

  const autopilotModeRow = (): Row => {
    const rowId = 'autopilot:mode';
    const modes = ['off', 'heading', 'wind'] as const;
    const buttons = modes.map((mode) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'segment bar-mode',
          'aria-pressed': 'false',
          'data-testid': `bar-ap-${mode}`,
        },
        [t(`autopilot.${mode}` as StringKey)],
      );
      button.addEventListener('click', () => store.dispatch({ type: 'autopilot', command: mode }));
      return button;
    });
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.autopilot'), line);
    const move = (delta: number) => {
      const index = modes.indexOf(store.getState().autopilot.mode);
      const next = modes[Math.max(0, Math.min(modes.length - 1, index + delta))];
      if (next !== undefined && !held(store.getState()))
        store.dispatch({ type: 'autopilot', command: next });
    };
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox(buttons)]),
      keys: { left: (down) => down && move(-1), right: (down) => down && move(1) },
      refresh(state) {
        setText(line, apText(state));
        buttons.forEach((button, i) => {
          button.setAttribute('aria-pressed', String(state.autopilot.mode === modes[i]));
          button.disabled = held(state);
        });
      },
    };
  };

  const autopilotTackRow = (): Row => {
    const rowId = 'autopilot:tack';
    const button = el('button', {
      type: 'button',
      class: 'segment bar-mode',
      'data-testid': 'bar-ap-tack',
    });
    const tack = () => {
      if (!button.disabled) store.dispatch({ type: 'autopilot', command: 'tack' });
    };
    button.addEventListener('click', tack);
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.autopilot'), line);
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([button])]),
      keys: { space: (down) => down && tack() },
      refresh(state) {
        setText(line, apText(state));
        button.disabled = held(state) || state.autopilot.mode === 'off';
        setText(
          button,
          t(Math.abs(state.rig.wind.twaDeg) < 90 ? 'autopilot.tack' : 'autopilot.gybe'),
        );
      },
    };
  };

  const engineRow = (): Row => {
    const rowId = 'engine';
    const lever = (direction: 1 | -1) => {
      const { engine } = store.getState();
      if (!engine.running) return;
      store.dispatch({
        type: 'engine',
        command: {
          leverPct: Math.max(-100, Math.min(100, engine.leverPct + direction * BAR_LEVER_STEP_PCT)),
        },
      });
    };
    const astern = stepButton(t('exercise.bar.astern'), t('exercise.bar.asternAria'), () =>
      lever(-1),
    );
    const ahead = stepButton(t('exercise.bar.ahead'), t('exercise.bar.aheadAria'), () => lever(1));
    astern.classList.add('bar-wide');
    ahead.classList.add('bar-wide');
    astern.dataset.testid = 'bar-lever-astern';
    ahead.dataset.testid = 'bar-lever-ahead';
    const startStop = createStartStopButton(store, '-bar');
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.engine'), line);
    block.append(startStop.note);
    const toggle = () => startStop.button.click();
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([astern, ahead, startStop.button])]),
      keys: {
        left: (down) => down && lever(-1),
        right: (down) => down && lever(1),
        space: (down) => down && toggle(),
      },
      refresh(state) {
        const { engine } = state;
        setText(
          line,
          engine.running
            ? `${leverText(engine.leverPct)} · ${rpmText(engine.rpm)}`
            : leverText(engine.leverPct),
        );
        astern.disabled = ahead.disabled = !engine.running;
        startStop.update(state);
      },
    };
  };

  const thrustersRow = (): Row => {
    const rowId = 'thrusters';
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.thrusters'), line);
    const element = rowElement(rowId, block, [buttonsBox([createThrusterPair(store, 'bar')])]);
    element.hidden = !hasAnyThruster();
    return {
      id: rowId,
      element,
      keys: {},
      refresh: (state) => setText(line, thrusterStatusText(state)),
    };
  };

  const lineRow = (code: LineCode): Row => {
    const rowId = `line:${code}`;
    const row = createLineRow(store, code, '-bar');
    const element = el(
      'div',
      {
        class: 'bar-row bar-row-line',
        'data-row': rowId,
        'data-testid': `bar-row-line-${code}`,
        role: 'group',
      },
      [row],
    );
    const enabled = () =>
      [...row.querySelectorAll<HTMLButtonElement>('.segment')].filter(
        (button) => !button.hidden && !button.disabled,
      );
    return {
      id: rowId,
      element,
      keys: {
        left: (down) => down && enabled()[0]?.click(),
        right: (down) => down && enabled().at(-1)?.click(),
        // Space: the line's one main action: take it, or let it go (decided in the M79 PR).
        space: (down) =>
          down &&
          (
            [`line-${code}-take-bar`, `line-${code}-letGo-bar`]
              .map((id) => row.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`))
              .find((button) => button && !button.hidden && !button.disabled) ?? undefined
          )?.click(),
      },
      refresh: () => {},
    };
  };

  const fendersRow = (): Row => {
    const rowId = 'fenders';
    const make = (out: boolean) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'segment bar-mode',
          'aria-pressed': 'false',
          'data-testid': out ? 'bar-fenders-out' : 'bar-fenders-in',
        },
        [t(out ? 'exercise.bar.fendersOut' : 'exercise.bar.fendersIn')],
      );
      button.addEventListener('click', () => store.dispatch({ type: 'setFenders', out }));
      return button;
    };
    const inside = make(false);
    const outside = make(true);
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.fenders'), line);
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([inside, outside])]),
      keys: {
        left: (down) => down && store.dispatch({ type: 'setFenders', out: false }),
        right: (down) => down && store.dispatch({ type: 'setFenders', out: true }),
      },
      refresh(state) {
        setText(line, fenderStatusText(state.harbour));
        inside.setAttribute('aria-pressed', String(!state.harbour.fendersOut));
        outside.setAttribute('aria-pressed', String(state.harbour.fendersOut));
      },
    };
  };

  const windlassRow = (): Row => {
    const rowId = 'windlass';
    const partId = 'fit_anchor_windlass';
    const down = holdButton(store, 'down', 'windlass-down-bar', partId);
    const up = holdButton(store, 'up', 'windlass-up-bar', partId);
    const line = small('');
    const { block } = nameBlock(rowId, t('exercise.bar.windlass'), line);
    const motion = (which: 'down' | 'up') => (pressed: boolean) =>
      store.dispatch({ type: 'windlass', motion: pressed ? which : 'off' });
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([down, up])]),
      keys: { left: motion('down'), right: motion('up') },
      refresh: (state) =>
        setText(
          line,
          `${anchorStatusText(state)} · ${t('anchor.counter', { m: Math.round(state.anchor.chainOutM) })}`,
        ),
    };
  };

  // ---- Realistic ropes: clutches and winches (M82, PHASE10_PHONE_SPEC 9.3) ---------------------

  /** A rope end's name: the clutch's printed label and, where the station drawing adds one, its tag. */
  const ropeName = (key: string): string => {
    const spec = tailSpec(key);
    if (!spec) return key;
    const tag = spec.tail === 'furl' || spec.tail === 'unfurl' ? t(`real.tag.${spec.tail}`) : null;
    return tag ? `${spec.label} · ${tag}` : spec.label;
  };
  const gesture = (action: RealisticAction) => store.dispatch({ type: 'realistic', action });
  const textButton = (label: string, testId: string) =>
    el(
      'button',
      { type: 'button', class: 'action-button bar-text-button', 'data-testid': testId },
      [label],
    );

  const clutchRow = (station: StationId, key: string): Row => {
    const rowId = `clutch:${station}:${key}`;
    const line = small('');
    const { block } = nameBlock(rowId, ropeName(key), line);
    const button = textButton(t('exercise.bar.open'), `bar-clutch-${key}`);
    const toggle = () =>
      gesture({ type: 'clutch', key, open: !store.getState().realistic.open[key] });
    button.addEventListener('click', toggle);
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([button])]),
      keys: { space: (down) => down && toggle() },
      refresh(state) {
        const open = state.realistic.open[key] === true;
        setText(line, t(open ? 'exercise.bar.clutchOpen' : 'exercise.bar.clutchClosed'));
        setText(button, t(open ? 'exercise.bar.close' : 'exercise.bar.open'));
        button.setAttribute('aria-pressed', String(open));
      },
    };
  };

  const winchRow = (station: StationId, winchId: string, key: string): Row => {
    const rowId = `winch:${station}:${winchId}:${key}`;
    const line = small('');
    const { block } = nameBlock(rowId, t(`real.winch.${station as 'port' | 'starboard'}`), line);
    const on = textButton(
      t('exercise.bar.onWinch', { rope: ropeName(key) }),
      `bar-winch-${winchId}-on`,
    );
    const turn = textButton(t('exercise.bar.addTurn'), `bar-winch-${winchId}-turn`);
    const off = textButton(t('exercise.bar.offWinch'), `bar-winch-${winchId}-off`);
    const tail = textButton(t('exercise.bar.tail'), `bar-winch-${winchId}-tail`);
    const hold = textButton(t('exercise.bar.hold'), `bar-winch-${winchId}-hold`);
    on.addEventListener('click', () => gesture({ type: 'onWinch', key }));
    turn.addEventListener('click', () => gesture({ type: 'turn', winch: winchId, delta: 1 }));
    off.addEventListener('click', () => gesture({ type: 'offWinch', winch: winchId }));
    tail.addEventListener('click', () =>
      gesture({ type: 'selfTailer', winch: winchId, into: true }),
    );
    // The motor button is a hold. Only a press that started a hold ends it (as the windlass does).
    let holding = false;
    const press = () => {
      holding = true;
      gesture({ type: 'button', winch: winchId, held: true });
    };
    const letGo = () => {
      if (!holding) return;
      holding = false;
      gesture({ type: 'button', winch: winchId, held: false });
    };
    hold.setAttribute('aria-pressed', 'false');
    hold.addEventListener('pointerdown', (event) => {
      if (event.button > 0) return;
      event.preventDefault();
      try {
        hold.setPointerCapture(event.pointerId);
      } catch {
        // A synthetic or already-ended pointer cannot be captured: the other events still end the hold.
      }
      press();
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
      hold.addEventListener(type, letGo);
    }
    hold.addEventListener('blur', letGo);
    hold.addEventListener('contextmenu', (event) => event.preventDefault());
    hold.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        press();
      }
    });
    hold.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') letGo();
    });
    const all = [on, turn, tail, hold, off];
    const usable = () => all.filter((button) => !button.hidden && !button.disabled);
    const act = (button: HTMLButtonElement | undefined, down: boolean) => {
      if (!button) return;
      if (button === hold) {
        if (down) press();
        else letGo();
      } else if (down) button.click();
    };
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox(all)]),
      keys: {
        left: (down) => act(usable()[0], down),
        right: (down) => act(usable().at(-1), down),
        space: (down) => act(usable()[0], down),
      },
      release: letGo,
      refresh(state) {
        const winch = state.realistic.winches[winchId];
        const rope = winch?.tail ?? null;
        const turns = winch?.turns ?? 0;
        const mine = rope === key;
        const parts =
          rope === null
            ? [t('real.winch.empty')]
            : [ropeName(rope), t('exercise.bar.turns', { n: turns })];
        if (rope !== null && winch?.selfTailer) parts.push(t('exercise.bar.tailed'));
        if (winch?.cutOut) parts.push(t('exercise.bar.cutOut'));
        setText(line, parts.join(' · '));
        const wrongWay = mine && turns < 0;
        const tailed = mine && !wrongWay && winch?.selfTailer === true;
        const visible = new Set<HTMLButtonElement>();
        if (rope === null) visible.add(on);
        else if (!mine || wrongWay) visible.add(off);
        else if (tailed) [hold, off].forEach((b) => visible.add(b));
        else if (turns >= BAR_TURNS_BEFORE_TAILER) [tail, off].forEach((b) => visible.add(b));
        else [turn, off].forEach((b) => visible.add(b));
        for (const button of all) {
          const show = visible.has(button);
          if (button.hidden === show) button.hidden = !show;
        }
        hold.setAttribute('aria-pressed', String(winch?.button === true));
      },
    };
  };

  const ropesRow = (): Row => {
    const rowId = 'ropes';
    const button = el(
      'button',
      {
        type: 'button',
        class: 'action-button bar-text-button',
        'data-testid': 'bar-ropes-stations',
      },
      [t('exercise.bar.stations')],
    );
    const open = () => panel.showSection('ropes');
    button.addEventListener('click', open);
    const { block } = nameBlock(rowId, t('exercise.bar.ropesRealistic'), null);
    return {
      id: rowId,
      element: rowElement(rowId, block, [buttonsBox([button])]),
      keys: { space: (down) => down && open() },
      refresh: () => {},
    };
  };

  // Rows are built once, the first time a step needs them, and kept (they follow the store).
  const cache = new Map<string, Row>();
  const buildRow = (id: BarRowId): Row | null => {
    let row = cache.get(id);
    if (row) return row;
    let made: Row | null = null;
    if (id.startsWith('control:')) made = controlRow(id.slice(8) as ControlId);
    else if (id.startsWith('line:')) made = lineRow(id.slice(5) as LineCode);
    else if (id === 'autopilot:turn') made = autopilotTurnRow();
    else if (id === 'autopilot:mode') made = autopilotModeRow();
    else if (id === 'autopilot:tack') made = autopilotTackRow();
    else if (id === 'engine') made = engineRow();
    else if (id === 'thrusters') made = thrustersRow();
    else if (id === 'fenders') made = fendersRow();
    else if (id === 'windlass') made = windlassRow();
    else if (id === 'ropes') made = ropesRow();
    else if (id.startsWith('clutch:') || id.startsWith('winch:')) {
      const parsed = parseRealisticRow(id);
      if (parsed?.kind === 'clutch') made = clutchRow(parsed.station, parsed.key);
      else if (parsed?.kind === 'winch') made = winchRow(parsed.station, parsed.winch, parsed.key);
    }
    if (made) cache.set(id, made);
    row = made ?? undefined;
    return row ?? null;
  };

  // ---- state ------------------------------------------------------------------------------

  let renderKey = '';
  /** M82: the stations (port / starboard) that have a rope row in this step, for the dots. */
  let stepStations = new Set<string>();
  let shown: Row[] = [];
  let selected = 0;
  let currentDef: ExerciseDef | undefined;

  const select = (index: number) => {
    selected = Math.max(0, Math.min(shown.length - 1, index));
    const keyed = kind() !== 'stacked';
    shown.forEach((row, i) =>
      row.element.classList.toggle('bar-row-selected', keyed && i === selected),
    );
  };

  const rebuild = (state: AppState) => {
    const run = state.exercise;
    currentDef = run ? exerciseDef(run.id) : undefined;
    const here = state.realistic.station;
    const stations =
      run && currentDef ? barStationsFor(currentDef, run.step, state.settings.ropesMode) : [];
    // M82: a step with stations shows only the rows of the station the learner is at.
    const ids =
      run && currentDef ? barRowsAt(currentDef, run.step, state.settings.ropesMode, here) : [];
    stepStations = new Set<string>(stations);
    stationsBox.hidden = stations.length === 0;
    otherStation.hidden = stations.length === 0 || ids.some((id) => barRowStation(id) === here);
    const keyed = kind() !== 'stacked';
    releaseHolds();
    shown = [];
    rowsBox.replaceChildren();
    ids.forEach((id) => {
      const row = buildRow(id);
      if (!row) return;
      // The number before the name, on a computer only.
      row.element.querySelector('.bar-key')?.remove();
      if (keyed) {
        const key = el('span', { class: 'bar-key', 'aria-hidden': 'true' }, [
          String(shown.length + 1),
        ]);
        row.element.prepend(key);
      }
      shown.push(row);
      rowsBox.append(row.element);
    });
    nothing.hidden = shown.length > 0 || stations.length > 0;
    keysHint.hidden = !keyed || shown.length === 0;
    select(0);
  };

  /** Lets go of every hold a row started (the winch button): a rebuild, a blur, a hidden page. */
  const releaseHolds = () => {
    for (const row of cache.values()) row.release?.();
  };

  const atPeek = () => kind() !== 'stacked' || sheet.height() === 'peek';
  const visible = (state: AppState) => barShown(state) && atPeek();

  // ---- Watch and Show me (M81) ------------------------------------------------------------

  const demoOn = () => store.getState().exercise?.demo != null;

  /** The row the app just worked lights up for 600 ms; a rebuild drops it. */
  const FLASH_MS = 600;
  const flashes = new Map<string, { timer: number; element: HTMLElement }>();
  const clearFlashes = () => {
    for (const { timer, element } of flashes.values()) {
      window.clearTimeout(timer);
      element.classList.remove('bar-row-flash');
    }
    flashes.clear();
  };
  demo.onActions((rows) => {
    for (const worked of rows) {
      // M82: a winch gesture names the winch (`:*`), the station switch flashes for a walk.
      const targets: Array<[string, HTMLElement]> =
        worked === 'stations'
          ? stationsBox.hidden
            ? []
            : [['stations', stationsBox]]
          : shown.filter((r) => rowMatches(r.id, worked)).map((r) => [r.id, r.element]);
      for (const [id, element] of targets) {
        window.clearTimeout(flashes.get(id)?.timer);
        element.classList.add('bar-row-flash');
        flashes.set(id, {
          element,
          timer: window.setTimeout(() => {
            element.classList.remove('bar-row-flash');
            flashes.delete(id);
          }, FLASH_MS),
        });
      }
    }
  });

  /**
   * While the app plays, the row buttons are disabled. `releaseRows` gives back what this switched
   * off (before the rows refresh, so a button a row switches off itself stays off); `lockRows`
   * then switches off every button that is still on (after the rows refreshed).
   */
  const releaseRows = () => {
    for (const box of [rowsBox, stationsBox]) {
      for (const button of box.querySelectorAll<HTMLButtonElement>('button[data-demo-off]')) {
        button.disabled = false;
        delete button.dataset.demoOff;
      }
    }
  };
  const lockRows = () => {
    for (const box of [rowsBox, stationsBox]) {
      for (const button of box.querySelectorAll<HTMLButtonElement>('button')) {
        if (button.disabled) continue;
        button.disabled = true;
        button.dataset.demoOff = '1';
      }
    }
  };

  let cardKey = '';
  const renderCard = (state: AppState) => {
    const run = state.exercise;
    const cardKind = atPeek() ? demoCardKind(state) : null;
    const def = run ? exerciseDef(run.id) : undefined;
    const key = `${cardKind}|${run?.id}|${run?.step}|${currentLanguage()}`;
    card.hidden = cardKind === null || !run || !def;
    if (cardKind === null || !run || !def) {
      cardKey = '';
      if (card.childElementCount > 0) card.replaceChildren();
      return;
    }
    if (key === cardKey) return;
    cardKey = key;
    if (cardKind === 'stepDone') {
      const finished = def.steps[run.step - 1];
      const how = finished ? exerciseText(def.id, currentLanguage()).steps[finished.id]?.how : '';
      const next = el(
        'button',
        {
          type: 'button',
          class: 'exercise-start',
          'data-testid': 'exercise-demo-next',
        },
        [t('exercise.demo.next')],
      );
      next.addEventListener('click', () => store.dispatch({ type: 'setPaused', paused: false }));
      const tryIt = el(
        'button',
        { type: 'button', class: 'exercise-button', 'data-testid': 'exercise-demo-try' },
        [t('exercise.demo.try')],
      );
      tryIt.addEventListener('click', () => {
        const now = store.getState().exercise;
        if (now) store.dispatch({ type: 'exercise', command: { back: now.step - 1 } });
      });
      card.replaceChildren(
        el('h3', {}, [t('exercise.demo.stepDone', { n: run.step })]),
        el('p', {}, [how ?? '']),
        el('div', { class: 'exercise-buttons' }, [next, tryIt]),
      );
    } else {
      const back = el(
        'button',
        { type: 'button', class: 'exercise-start', 'data-testid': 'exercise-demo-back' },
        [t('exercise.demo.back')],
      );
      back.addEventListener('click', () => {
        const now = store.getState().exercise;
        if (now) store.dispatch({ type: 'exercise', command: { back: now.demoStep } });
      });
      card.replaceChildren(
        el('h3', {}, [t('exercise.demo.nowYouTitle')]),
        el('p', {}, [t('exercise.demo.nowYou')]),
        el('div', { class: 'exercise-buttons' }, [back]),
      );
    }
  };

  showMe.addEventListener('click', () =>
    store.dispatch({ type: 'exercise', command: { demo: 'showMe' } }),
  );
  stopDemo.addEventListener('click', () =>
    store.dispatch({ type: 'exercise', command: { demo: null } }),
  );

  /** The station switch (pressed = where the learner stands; a dot = a row waits at the other one) and the notice. */
  const refreshStations = (state: AppState) => {
    const at = state.realistic.station;
    for (const [station, { button, dot }] of stationButtons) {
      button.setAttribute('aria-pressed', String(at === station));
      const wanted = stepStations.has(station) && at !== station;
      if (dot.hidden === wanted) dot.hidden = !wanted;
    }
    const real = state.realistic;
    const text =
      real.notice !== null
        ? noticeText(real.notice)
        : real.handle.place === 'carried'
          ? t('real.notice.handleInHand')
          : '';
    const wanted = text !== '' && !stationsBox.hidden;
    setText(noticeLine, wanted ? text : '');
    if (noticeLine.hidden === wanted) noticeLine.hidden = !wanted;
  };

  const refresh = (state: AppState) => {
    const run = state.exercise;
    // M82: a step with stations also rebuilds when the learner walks to another station.
    const def = run ? exerciseDef(run.id) : undefined;
    const ropeStep =
      run !== undefined &&
      run !== null &&
      def !== undefined &&
      barStationsFor(def, run.step, state.settings.ropesMode).length > 0;
    const key = run
      ? `${run.id}|${run.step}|${state.settings.ropesMode}|${kind()}|${currentLanguage()}${
          ropeStep ? `|${state.realistic.station}` : ''
        }`
      : '';
    if (key !== renderKey) {
      renderKey = key;
      clearFlashes();
      rebuild(state);
    }
    renderCard(state);
    const show = visible(state);
    if (bar.hidden === show) bar.hidden = !show;
    if (!show) return;
    const playing = run?.demo != null;
    headLabel.textContent = playing ? t('exercise.bar.demoLabel') : t('exercise.bar.label');
    showMe.hidden =
      playing ||
      run?.status !== 'running' ||
      pilotFor(run.id, run.options.level, state.settings.ropesMode) === null;
    stopDemo.hidden = !playing;
    releaseRows();
    for (const row of shown) row.refresh(state);
    refreshStations(state);
    if (playing) lockRows();
  };

  store.subscribe(refresh);
  layout.onChange(() => refresh(store.getState()));
  sheet.onChange(() => refresh(store.getState()));

  all.addEventListener('click', () => {
    const state = store.getState();
    const run = state.exercise;
    const step = run && currentDef ? currentDef.steps[run.step] : undefined;
    if (step) panel.showSection(controlsSectionFor(step, state, kind()));
  });

  // ---- height: the rest of the view keeps clear of the stack ---------------------------------

  // On a phone the stack stands over the sheet and the chip row and the mini-map move up above it
  // (`--exercise-stack-h`). On a computer (owner, PR 168) nothing moves: the bar takes the bottom row
  // between the mini-map and the chips when there is room (`data-place="row"`), else it stands
  // over that row (`data-place="above"`), which stays where it is.
  const ROW_MIN_PX = 400;
  const visibleBox = (node: Element | null): DOMRect | null => {
    if (!(node instanceof HTMLElement) || node.hidden || node.offsetParent === null) return null;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  };
  let lastSignature = '';
  const measure = () => {
    const stacked = kind() === 'stacked';
    let place = 'stacked';
    let left = '';
    let right = '';
    let bottom = '';
    if (!stacked) {
      const box = view.getBoundingClientRect();
      const mini = visibleBox(view.querySelector('[data-testid="mini-map"]'));
      const chips = [...(view.querySelector('.view-bottom')?.children ?? [])]
        .map((child) => visibleBox(child))
        .filter((rect): rect is DOMRect => rect !== null);
      const from = mini ? mini.right - box.left + 8 : 8;
      const to =
        chips.length > 0 ? Math.min(...chips.map((r) => r.left)) - box.left - 8 : box.width - 8;
      if (to - from >= ROW_MIN_PX) {
        place = 'row';
        left = `${Math.round(from)}px`;
        right = `${Math.round(box.width - to)}px`;
      } else {
        place = 'above';
        const tops = [mini, ...chips].filter((rect): rect is DOMRect => rect !== null);
        if (tops.length > 0)
          bottom = `${Math.round(box.bottom - Math.min(...tops.map((r) => r.top)) + 8)}px`;
      }
    }
    stack.dataset.place = place;
    stack.style.left = left;
    stack.style.right = right;
    stack.style.bottom = bottom;
    const px = stack.offsetHeight > 0 ? stack.offsetHeight + 8 : 0;
    const value = stacked ? `${px}px` : '0px';
    const signature = `${place}|${left}|${right}|${bottom}|${value}|${stack.offsetHeight}`;
    if (view.style.getPropertyValue('--exercise-stack-h') !== value) {
      view.style.setProperty('--exercise-stack-h', value);
    }
    if (signature === lastSignature) return;
    lastSignature = signature;
    onStackResize();
  };
  const watcher = new ResizeObserver(measure);
  watcher.observe(stack);
  watcher.observe(view);
  const chipRow = view.querySelector('.view-bottom');
  if (chipRow) watcher.observe(chipRow);
  const miniMap = view.querySelector('[data-testid="mini-map"]');
  if (miniMap) watcher.observe(miniMap);
  layout.onChange(measure);

  // ---- keys (side and wide layouts) -----------------------------------------------------------

  // A mouse click leaves the focus on the button, and a focused button handles its own keys, so the
  // bar's keys (1–4, ← →, Space) would do nothing after the first click (owner, PR 174). A click
  // with a mouse or finger (`detail` > 0) lets go of the focus; a key press (`detail` 0) keeps it.
  bar.addEventListener('click', (event) => {
    if (event.detail > 0 && event.target instanceof Element) {
      event.target.closest('button')?.blur();
    }
  });

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName));
  const KEY_SLOT: Record<string, 'left' | 'right' | 'space'> = {
    ArrowLeft: 'left',
    '-': 'left',
    ArrowRight: 'right',
    '+': 'right',
    '=': 'right',
    ' ': 'space',
  };
  /** Keys that started something, so their key-up ends it (the holds). */
  const down = new Map<string, () => void>();
  const keysOn = () => !bar.hidden && kind() !== 'stacked' && !overlayOpen();
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || typing(event.target)) return;
    if (!keysOn()) return;
    // Enter presses Show me (M81); while the app plays, the bar's keys do nothing.
    if (demoOn()) return;
    if (event.key === 'Enter' && !showMe.hidden) {
      event.preventDefault();
      showMe.click();
      return;
    }
    if (/^[1-4]$/.test(event.key)) {
      if (Number(event.key) <= shown.length) {
        event.preventDefault();
        select(Number(event.key) - 1);
      }
      return;
    }
    const slot = KEY_SLOT[event.key];
    const row = shown[selected];
    const action = slot && row ? row.keys[slot] : undefined;
    if (!slot || !row || !action) return;
    event.preventDefault();
    // A hold starts once; a tap row repeats with the key.
    if (event.repeat && row.id === 'windlass') return;
    action.call(row.keys, true);
    down.set(event.key, () => action.call(row.keys, false));
  });
  document.addEventListener('keyup', (event) => {
    const end = down.get(event.key);
    if (!end) return;
    down.delete(event.key);
    end();
  });
  const releaseAll = () => {
    for (const end of down.values()) end();
    down.clear();
    releaseHolds();
  };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') releaseAll();
  });

  refresh(store.getState());
}
