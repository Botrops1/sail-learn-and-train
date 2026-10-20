import type { AppState, Store } from '../app/store';
import { area } from '../model/area';
import { fenderHintShown } from '../model/harbour';
import { marinaGeometry } from '../model/marina';
import {
  BAY_LINE_CODES,
  canTake,
  canTighten,
  MARINA_LINE_CODES,
  lineTension,
  type LineCode,
  type LinesInputs,
} from '../model/mooringLines';
import { el } from './dom';
import { setText } from './stepper';
import { t, type StringKey } from './i18n';

/** Eight fenders at the stations and the ball fender (PHASE7_SPEC 4.1). */
const FENDER_COUNT = 9;

const FENDER_OPTIONS = [
  { value: 'stowed', out: false },
  { value: 'out', out: true },
] as const;

/**
 * The Harbour gear section (M33, PHASE6_SPEC 9.4): the fenders, In the locker or Out, and a hint
 * while they are out and the boat sails. Built like the Held still / Sailing switch.
 */
export function createHarbourPanel(store: Store): HTMLElement[] {
  const options = el('div', { class: 'segments' });
  const inputs = FENDER_OPTIONS.map(({ value, out }) => {
    const input = el('input', {
      type: 'radio',
      name: 'fenders',
      value,
      'data-testid': `fenders-${value}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setFenders', out });
    });
    options.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`harbour.fenders.${value}`)])]),
    );
    return { out, input };
  });
  const group = el('fieldset', { class: 'field segmented', 'data-testid': 'fenders' }, [
    el('legend', {}, [t('harbour.fenders')]),
    el('p', { class: 'hint explain' }, [t('harbour.fenders.explain')]),
    options,
  ]);
  const hint = el('p', { class: 'hint', 'data-testid': 'fenders-hint' }, [
    t('harbour.fenders.hint'),
  ]);
  // How many are over the side, and how many were torn off while sailing (M43).
  const status = el('p', { class: 'hint', 'data-testid': 'fenders-status', 'aria-live': 'polite' });
  const sync = (state: AppState, previous?: AppState) => {
    if (
      previous &&
      state.harbour.fendersOut === previous.harbour.fendersOut &&
      state.harbour.fendersLost === previous.harbour.fendersLost &&
      state.boat.mode === previous.boat.mode
    ) {
      return;
    }
    for (const { out, input } of inputs) input.checked = out === state.harbour.fendersOut;
    hint.hidden = !fenderHintShown(state.harbour, state.boat.mode);
    const lost = state.harbour.fendersLost.length;
    status.textContent = state.harbour.fendersOut
      ? [
          t('harbour.fenders.status.out', { count: FENDER_COUNT - lost }),
          lost > 0 ? t('harbour.fenders.status.lost', { count: lost }) : '',
        ]
          .join(' ')
          .trim()
      : t('harbour.fenders.status.in');
  };
  store.subscribe(sync);
  sync(store.getState());
  return [group, hint, status, ...createLinesBlock(store)];
}

/** The rope id (registry) of each line code: a row names it so a tap on the row can explain it. */
const LINE_ROPE_IDS: Record<LineCode, string> = {
  sp: 'rope_stern_line_port',
  ss: 'rope_stern_line_starboard',
  ll: 'rope_lazy_line',
  bl: 'rope_bow_line',
  sl: 'rope_shore_line',
};

function linesInputs(state: AppState): LinesInputs {
  return {
    lines: state.lines,
    boat: state.boat,
    harbour: state.harbour,
    geometry: marinaGeometry(state.harbour.layout, state.harbour.traffic),
    engine: state.engine,
    area,
  };
}

/**
 * One mooring line's row (M44, PHASE7_SPEC 10.5): its name and status, and either the button that
 * takes it (with the reason when it cannot be taken) or Tighten, Ease and Let go. `suffix` is
 * added to every test id so a second row (the Bow station, M46) can sit beside this one.
 */
export function createLineRow(store: Store, code: LineCode, suffix = ''): HTMLElement {
  const id = (name: string) => `line-${code}-${name}${suffix}`;
  const button = (
    name: string,
    label: StringKey,
    command: 'take' | 'tighten' | 'ease' | 'letGo',
  ) => {
    const node = el('button', { type: 'button', class: 'segment', 'data-testid': id(name) }, [
      t(label),
    ]);
    node.addEventListener('click', () => store.dispatch({ type: 'line', code, command }));
    return node;
  };
  const status = el('p', { class: 'hint', 'data-testid': id('status'), 'aria-live': 'polite' });
  const take = button('take', `lines.take.${code}` as StringKey, 'take');
  const tighten = button('tighten', 'lines.tighten', 'tighten');
  const ease = button('ease', 'lines.ease', 'ease');
  const letGo = button('letGo', 'lines.letGo', 'letGo');
  const reason = el('p', { class: 'hint', 'data-testid': id('reason') });
  const actions = el('div', { class: 'segments' }, [take, tighten, ease, letGo]);
  const row = el(
    'div',
    {
      class: 'line-row field',
      'data-testid': `line-${code}${suffix}`,
      'data-part-id': LINE_ROPE_IDS[code],
    },
    [
      el('h4', { class: 'line-name' }, [t(`lines.name.${code}` as StringKey)]),
      status,
      actions,
      reason,
    ],
  );

  const sync = (state: AppState, previous?: AppState) => {
    if (
      previous &&
      state.lines === previous.lines &&
      state.boat === previous.boat &&
      state.harbour.place === previous.harbour.place
    ) {
      return;
    }
    const inputs = linesInputs(state);
    const line = state.lines.lines.find((candidate) => candidate.code === code);
    const walking = state.lines.crew?.code === code ? state.lines.crew : null;
    let reasonText = '';
    if (line) {
      const { tensionN } = lineTension(line, state.boat);
      setText(
        status,
        t('lines.on', { length: line.lengthM.toFixed(1), kN: (tensionN / 1000).toFixed(1) }),
      );
      if (!canTighten(code, inputs)) reasonText = t('lines.tooTight');
    } else if (walking) {
      setText(
        status,
        t(code === 'sl' ? 'lines.swimming' : 'lines.walking', {
          seconds: Math.ceil(walking.remainingS - 1e-9),
        }),
      );
    } else {
      setText(status, t('lines.off'));
      const can = canTake(code, inputs);
      take.disabled = !can.ok;
      if (!can.ok) reasonText = t(can.reason as StringKey, can.params);
    }
    take.hidden = line !== undefined || walking !== null;
    // While the crew walks the lazy line the only thing to do is let it go.
    for (const node of [tighten, ease]) node.hidden = line === undefined;
    letGo.hidden = line === undefined && walking === null;
    tighten.disabled = line === undefined || !canTighten(code, inputs);
    setText(reason, reasonText);
    reason.hidden = reasonText === '';
  };
  store.subscribe(sync);
  sync(store.getState());
  return row;
}

/** The Lines block of the Harbour gear section: a row per line of the place (the marina's three, the bay's two), the fouled propeller (M44, M45). */
function createLinesBlock(store: Store): HTMLElement[] {
  const title = el('h3', { class: 'lines-title' }, [t('lines.title')]);
  const marinaRows = MARINA_LINE_CODES.map((code) => createLineRow(store, code));
  const bayRows = BAY_LINE_CODES.map((code) => createLineRow(store, code));
  const hint = el('p', { class: 'hint explain', 'data-testid': 'lines-hint' }, [t('lines.hint')]);
  const bayHint = el('p', { class: 'hint explain', 'data-testid': 'lines-hint-bay' }, [
    t('lines.hint.bay'),
  ]);
  const notHere = el('p', { class: 'hint', 'data-testid': 'lines-place' }, [
    t('lines.reason.place'),
  ]);
  const fouled = el('p', { class: 'hint', 'data-testid': 'prop-fouled', 'aria-live': 'polite' }, [
    t('lines.fouled'),
  ]);
  const clear = el('button', { type: 'button', class: 'segment', 'data-testid': 'prop-clear' }, [
    t('lines.clearProp'),
  ]);
  clear.addEventListener('click', () => store.dispatch({ type: 'clearPropeller' }));
  const sync = (state: AppState, previous?: AppState) => {
    if (
      previous &&
      state.lines.fouled === previous.lines.fouled &&
      state.harbour.place === previous.harbour.place
    ) {
      return;
    }
    const marina = state.harbour.place === 'marina';
    const bay = state.harbour.place === 'bay';
    for (const row of marinaRows) row.hidden = !marina;
    for (const row of bayRows) row.hidden = !bay;
    hint.hidden = !marina;
    bayHint.hidden = !bay;
    notHere.hidden = marina || bay;
    fouled.hidden = !state.lines.fouled;
    clear.hidden = !state.lines.fouled;
  };
  store.subscribe(sync);
  sync(store.getState());
  return [title, notHere, ...marinaRows, ...bayRows, hint, bayHint, fouled, clear];
}
