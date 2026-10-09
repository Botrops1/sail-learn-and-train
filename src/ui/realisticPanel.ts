import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { entryFor } from '../model/panelEntries';
import {
  STATION_IDS,
  runningTails,
  stationWinch,
  tailSpecs,
  winchOf,
  type RealisticAction,
  type StationId,
  type TailReport,
  type TailSpec,
} from '../model/realistic';
import { partInfo } from '../model/registry';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { CONTROL_VIEWS, controlView, createControl, stateText, valueText } from './ropeControls';
import { createStationDrawing, noticeText, type StationDrawing } from './stationDrawing';
import { setText, stepButton } from './stepper';

/**
 * Realistic mode of the Ropes tab (PHASE1_SPEC 7.2.2, M4b): one station at a time (Port,
 * Starboard, Helm), alerts from the others, the station drawing, and a strip for the selected
 * clutch with a button for every gesture (open / close, onto the winch, turns, self-tailer,
 * ease, winch button, pull by hand) and what the rope is doing.
 */

function kn(newtons: number): string {
  return (newtons / 1000).toFixed(1);
}

/** "Genoa sheet (jib sheet)": the label on the boat and our name where it differs. */
export function tailName(spec: TailSpec): string {
  const name = partInfo(spec.ropeId)?.name ?? spec.ropeId;
  const tail = spec.tail ? t(`real.tailShort.${spec.tail}` as StringKey) : '';
  const plain = (text: string) => text.toLowerCase().replace(/\s+/g, '');
  const ours = plain(name) === plain(spec.label) ? '' : name.toLowerCase();
  const extra = [ours, tail].filter(Boolean).join(', ');
  return extra ? `“${spec.label}” (${extra})` : `“${spec.label}”`;
}

/** Lines describing a rope end now: clutch, winch, load and what it is doing. */
function statusLines(state: AppState, spec: TailSpec): { lines: string[]; alert: string | null } {
  const real = state.realistic;
  const open = real.open[spec.key] === true;
  const winchId = winchOf(real, spec.key);
  const winch = winchId ? real.winches[winchId] : undefined;
  const report: TailReport | undefined = real.reports[spec.key];
  const lines: string[] = [];
  lines.push(t(open ? 'real.status.clutchOpen' : 'real.status.clutchClosed'));
  if (winch) {
    const turns = Math.abs(winch.turns);
    const wrap =
      winch.turns === 0
        ? t('real.status.noTurns')
        : t(winch.turns > 0 ? 'real.status.turnsCw' : 'real.status.turnsCcw', { n: turns });
    lines.push(
      t(winch.selfTailer ? 'real.status.onWinchJaw' : 'real.status.onWinchHand', { wrap }),
    );
  } else {
    lines.push(t('real.status.offWinch'));
  }
  if (report) {
    const load = report.loadN;
    if (load >= boat.realisticMode.loads.fightingN) lines.push(t('real.status.loadFighting'));
    else if (load > 0) lines.push(t('real.status.load', { kn: kn(load) }));
    else lines.push(t('real.status.noPull'));
    if (open && Number.isFinite(report.holdN) && report.holdN > 0) {
      lines.push(t('real.status.hold', { kn: kn(report.holdN) }));
    }
  }
  if (spec.controlId) {
    const view = CONTROL_VIEWS.find((candidate) => candidate.id === spec.controlId);
    if (view) {
      const value = valueText(view, state.controls[view.id]);
      const status = view.status?.(state);
      lines.push(
        status ? `${t(view.name)}: ${value} · ${stateText(status)}` : `${t(view.name)}: ${value}`,
      );
    }
  }
  return { lines, alert: report ? motionText(report, state.paused) : null };
}

/** What the rope is doing, as one line (null when it is simply held). */
function motionText(report: TailReport, paused: boolean): string | null {
  const note = report.note;
  if (note === 'cutOutBlocked') {
    const labels = report.blockers
      .map((key) => tailSpecs().find((spec) => spec.key === key))
      .map((spec) =>
        spec ? `“${spec.label}” (${t(`real.station.${spec.station}` as StringKey)})` : '',
      )
      .join(', ');
    return t('real.note.cutOutBlocked', { clutches: labels });
  }
  if (note) return t(`real.note.${note}` as StringKey);
  if (report.motion === 'running')
    return t(paused ? 'real.motion.runningPaused' : 'real.motion.running');
  if (report.motion === 'hauling') return t('real.motion.hauling');
  if (report.motion === 'easing') return t('real.motion.easing');
  return null;
}

interface Alert {
  station: StationId;
  text: string;
}

/** Things happening at the other stations (a rope running, a winch cut out). */
function alertsFor(state: AppState): Alert[] {
  const real = state.realistic;
  const alerts: Alert[] = [];
  for (const spec of runningTails(real)) {
    if (spec.station === real.station) continue;
    alerts.push({
      station: spec.station,
      text: t('real.alert.running', {
        label: spec.label,
        station: t(`real.station.${spec.station}` as StringKey),
      }),
    });
  }
  for (const station of STATION_IDS) {
    if (station === real.station) continue;
    const winch = real.winches[stationWinch(station) ?? ''];
    if (winch?.cutOut) {
      alerts.push({
        station,
        text: t('real.alert.cutOut', { station: t(`real.station.${station}` as StringKey) }),
      });
    }
  }
  return alerts;
}

export function createRealisticPanel(store: Store): HTMLElement[] {
  const dispatch = (action: RealisticAction) => store.dispatch({ type: 'realistic', action });
  let selected: string | null = null;

  // Station buttons (one place at a time).
  const stationBar = el('div', {
    class: 'segments station-bar',
    role: 'group',
    'aria-label': t('real.stations.label'),
    'data-testid': 'station-bar',
  });
  const stationButtons = STATION_IDS.map((station) => {
    const badge = el('span', { class: 'station-badge', hidden: '', 'aria-hidden': 'true' }, ['!']);
    const button = el(
      'button',
      { type: 'button', class: 'station-button', 'data-station': station, 'aria-pressed': 'false' },
      [t(`real.station.${station}` as StringKey), badge],
    );
    button.addEventListener('click', () => dispatch({ type: 'station', station }));
    stationBar.append(button);
    return { station, button, badge };
  });

  const alerts = el('div', {
    class: 'station-alerts',
    'aria-live': 'polite',
    'data-testid': 'station-alerts',
  });
  const pausedLine = el('p', { class: 'paused-line', hidden: '' }, [t('real.paused')]);

  // The two drawings (the helm has the wheel instead).
  const select = (key: string) => {
    const spec = tailSpecs().find((s) => s.key === key);
    if (!spec) return;
    selected = key;
    store.dispatch({ type: 'select', partId: spec.ropeId });
    refresh(store.getState());
  };
  const drawings = new Map<StationId, StationDrawing>();
  for (const station of ['port', 'starboard'] as const) {
    drawings.set(station, createStationDrawing(store, station, { onSelect: select }));
  }
  const wheel = createControl(store, controlView('ctl_rudder'));
  const helm = el('div', { class: 'helm-station', 'data-testid': 'helm-station' }, [
    el('p', { class: 'hint' }, [t('real.helm.hint')]),
    wheel.element,
  ]);

  // The strip for the selected clutch.
  const stripTitle = el('div', { class: 'control-head' }, [el('span', { class: 'control-name' })]);
  const stripStatus = el('div', { class: 'control-meta real-status' });
  const stripAlert = el('p', { class: 'real-alert', 'aria-live': 'polite', hidden: '' });
  const stripOther = el('p', { class: 'hint', hidden: '' });
  const goThere = el('button', { type: 'button', class: 'action-button', hidden: '' });

  const action = (label: StringKey, run: () => void, testid: string) => {
    const button = el('button', { type: 'button', class: 'real-action', 'data-testid': testid }, [
      t(label),
    ]);
    button.addEventListener('click', run);
    return button;
  };
  const winchHere = () => stationWinch(store.getState().realistic.station) ?? '';
  const clutchButton = action(
    'real.action.open',
    () => {
      if (!selected) return;
      dispatch({
        type: 'clutch',
        key: selected,
        open: store.getState().realistic.open[selected] !== true,
      });
    },
    'act-clutch',
  );
  const winchButton = action(
    'real.action.onWinch',
    () => {
      if (!selected) return;
      const real = store.getState().realistic;
      if (winchOf(real, selected)) dispatch({ type: 'offWinch', winch: winchHere() });
      else dispatch({ type: 'onWinch', key: selected });
    },
    'act-winch',
  );
  const addTurn = action(
    'real.action.addTurn',
    () => dispatch({ type: 'turn', winch: winchHere(), delta: 1 }),
    'act-add-turn',
  );
  const removeTurn = action(
    'real.action.removeTurn',
    () => dispatch({ type: 'turn', winch: winchHere(), delta: -1 }),
    'act-remove-turn',
  );
  const jawButton = action(
    'real.action.intoJaw',
    () => {
      const winch = store.getState().realistic.winches[winchHere()];
      dispatch({ type: 'selfTailer', winch: winchHere(), into: !winch?.selfTailer });
    },
    'act-jaw',
  );
  const ease = stepButton(t('real.action.ease'), t('real.action.easeAria'), () => {
    if (selected)
      dispatch({ type: 'ease', key: selected, metres: boat.realisticMode.hand.easeStepM });
  });
  ease.classList.add('real-action');
  ease.classList.remove('step-button');
  ease.dataset.testid = 'act-ease';
  const hold = (label: StringKey, testid: string, down: () => void, up: () => void) => {
    const button = el(
      'button',
      { type: 'button', class: 'real-action real-hold', 'data-testid': testid },
      [t(label)],
    );
    button.addEventListener('pointerdown', (event) => {
      if (event.button > 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      down();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      button.addEventListener(type, up);
    }
    button.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        down();
      }
    });
    button.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') up();
    });
    button.addEventListener('blur', up);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    return button;
  };
  // Let go of the winch that was pressed, even if the user has switched station since.
  let pressedWinch = '';
  const motor = hold(
    'real.action.winch',
    'act-button',
    () => {
      pressedWinch = winchHere();
      dispatch({ type: 'button', winch: pressedWinch, held: true });
    },
    () => {
      const winch = store.getState().realistic.winches[pressedWinch];
      if (winch?.button) dispatch({ type: 'button', winch: pressedWinch, held: false });
    },
  );
  const pull = hold(
    'real.action.pull',
    'act-pull',
    () => {
      if (selected) dispatch({ type: 'pull', key: selected });
    },
    () => {
      if (store.getState().realistic.pull) dispatch({ type: 'pull', key: null });
    },
  );
  const actions = el('div', { class: 'real-actions' }, [
    clutchButton,
    winchButton,
    addTurn,
    removeTurn,
    jawButton,
    ease,
    motor,
    pull,
  ]);
  const more = el('details', { class: 'strip-more' }, [
    el('summary', {}, [t('ropes.strip.more')]),
    el('p', { class: 'real-more-text' }),
  ]);
  const strip = el(
    'section',
    {
      class: 'real-strip',
      'data-testid': 'real-strip',
      'aria-label': t('ropes.strip.label'),
    },
    [stripTitle, stripAlert, stripStatus, stripOther, goThere, actions, more],
  );
  const empty = el('p', { class: 'strip-empty' }, [t('real.strip.empty')]);
  goThere.addEventListener('click', () => {
    const station = goThere.dataset.station;
    if (station === 'port' || station === 'starboard' || station === 'helm') {
      dispatch({ type: 'station', station });
    }
  });

  const howTo = el('details', { class: 'strip-more real-how' }, [
    el('summary', {}, [t('real.how.title')]),
    ...(['real.how.1', 'real.how.2', 'real.how.3', 'real.how.4', 'real.how.5'] as const).map(
      (key) => el('p', {}, [t(key)]),
    ),
  ]);

  const statusNodes: HTMLElement[] = [];
  const refresh = (state: AppState, previous?: AppState) => {
    const real = state.realistic;
    const station = real.station;

    // Keep the selected clutch in step with the store's selection (a rope tapped in 3D).
    const selectedSpec = selected ? tailSpecs().find((s) => s.key === selected) : undefined;
    if (state.selection !== previous?.selection || selectedSpec?.station !== station) {
      const entry = entryFor(state.selection);
      const matches = (spec: TailSpec) =>
        spec.ropeId === state.selection ||
        (entry !== undefined && entry.partIds.includes(spec.ropeId));
      if (!selectedSpec || !matches(selectedSpec) || selectedSpec.station !== station) {
        const atStation = tailSpecs().find((spec) => spec.station === station && matches(spec));
        selected = atStation?.key ?? null;
      }
    }

    for (const { station: id, button } of stationButtons) {
      button.setAttribute('aria-pressed', String(id === station));
    }
    const list = alertsFor(state);
    for (const { station: id, badge } of stationButtons)
      badge.hidden = !list.some((a) => a.station === id);
    const alertText = list.map((a) => a.text).join(' · ');
    if (alerts.textContent !== alertText) {
      alerts.replaceChildren(
        ...list.map((a) => {
          const go = el(
            'button',
            { type: 'button', class: 'station-alert', 'data-station': a.station },
            [a.text],
          );
          go.addEventListener('click', () => dispatch({ type: 'station', station: a.station }));
          return go;
        }),
      );
    }
    alerts.hidden = list.length === 0;
    pausedLine.hidden = !state.paused;

    for (const [id, drawing] of drawings) {
      drawing.element.hidden = id !== station;
      if (id === station) drawing.refresh(state, selected);
    }
    helm.hidden = station !== 'helm';
    if (station === 'helm') wheel.refresh(state);

    // The strip.
    const spec = selected ? tailSpecs().find((s) => s.key === selected) : undefined;
    strip.hidden = station === 'helm';
    empty.hidden = station === 'helm' || Boolean(spec) || Boolean(state.selection && !spec);
    const otherStation =
      !spec && state.selection ? otherStationFor(state.selection, station) : null;
    stripOther.hidden = !otherStation;
    goThere.hidden = !otherStation;
    if (otherStation) {
      const where = t(`real.station.${otherStation}` as StringKey);
      setText(stripOther, t('real.strip.elsewhere', { station: where }));
      setText(goThere, t('real.strip.go', { station: where }));
      goThere.dataset.station = otherStation;
    }
    strip.classList.toggle('is-empty', !spec);
    for (const node of [stripTitle, stripStatus, actions, more]) node.hidden = !spec;
    if (!spec) {
      stripAlert.hidden = true;
      return;
    }
    const name = stripTitle.firstElementChild as HTMLElement;
    setText(name, tailName(spec));
    const isStatic = !spec.controlId;
    const { lines, alert } = isStatic
      ? { lines: [t(`ropes.static.${staticNote(spec.ropeId)}` as StringKey)], alert: null }
      : statusLines(state, spec);
    lines.forEach((text, index) => {
      let node = statusNodes[index];
      if (!node) {
        node = el('span', { class: 'meta-line' });
        statusNodes.push(node);
        stripStatus.append(node);
      }
      node.hidden = false;
      setText(node, text);
    });
    statusNodes.slice(lines.length).forEach((node) => (node.hidden = true));
    const notice =
      real.notice && real.notice.tail === spec.key
        ? noticeText(real.notice.key, real.notice.tail)
        : null;
    const alertLine = alert ?? notice;
    stripAlert.hidden = !alertLine;
    setText(stripAlert, alertLine ?? '');
    stripAlert.classList.toggle('is-running', real.reports[spec.key]?.motion === 'running');

    const open = real.open[spec.key] === true;
    const winchId = stationWinch(station) ?? '';
    const winch = real.winches[winchId];
    const onThis = winch?.tail === spec.key;
    actions.hidden = isStatic;
    setText(clutchButton, t(open ? 'real.action.close' : 'real.action.open'));
    clutchButton.setAttribute('aria-pressed', String(open));
    setText(winchButton, t(onThis ? 'real.action.offWinch' : 'real.action.onWinch'));
    winchButton.disabled = !onThis && Boolean(winch?.tail);
    addTurn.disabled = !onThis;
    removeTurn.disabled = !onThis;
    jawButton.disabled = !onThis;
    setText(
      jawButton,
      t(onThis && winch?.selfTailer ? 'real.action.outOfJaw' : 'real.action.intoJaw'),
    );
    // The strip is about the selected rope: its winch button only hauls that rope.
    motor.disabled = !onThis;
    motor.classList.toggle('is-pressed', winch?.button === true);
    pull.hidden = onThis;
    pull.classList.toggle('is-pressed', real.pull === spec.key);
    const moreText = more.querySelector('.real-more-text');
    if (moreText) setText(moreText, partInfo(spec.ropeId)?.short ?? '');
  };

  store.subscribe(refresh);
  refresh(store.getState());

  return [
    stationBar,
    alerts,
    pausedLine,
    ...[...drawings.values()].map((drawing) => drawing.element),
    helm,
    empty,
    strip,
    howTo,
  ];
}

function staticNote(ropeId: string): string {
  const notes = boat.clutchPanel.staticRopeNotes as Record<string, string | undefined>;
  return notes[ropeId] ?? 'none';
}

/** The station whose clutch holds the selected rope, when it is not this one. */
function otherStationFor(selection: string, station: StationId): StationId | null {
  const entry = entryFor(selection);
  if (entry?.controlId === 'ctl_rudder') return station === 'helm' ? null : 'helm';
  const spec = tailSpecs().find(
    (s) => s.ropeId === selection || (entry !== undefined && entry.partIds.includes(s.ropeId)),
  );
  return spec && spec.station !== station ? spec.station : null;
}
