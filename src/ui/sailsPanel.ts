import type { AppState, Store } from '../app/store';
import { boat, hasFeature } from '../model/boat';
import { exerciseDef } from '../model/exercises';
import { gennakerTrimState } from '../model/gennaker';
import { isTorn, sailTrim, type SailName, type TrimState } from '../model/trim';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { controlView, createControl } from './ropeControls';
import { setText } from './stepper';

const SAILS: { sail: SailName; partId: string }[] = [
  { sail: 'main', partId: 'sail_main' },
  { sail: 'jib', partId: 'sail_jib' },
];

/** The sails the boat in use carries (M113: a boat without a jib has the main only). */
function sailsOfBoat(): { sail: SailName; partId: string }[] {
  return SAILS.filter(({ sail }) => sail !== 'jib' || hasFeature('jib'));
}

/** The state chip's colour family: green good, amber luffing, red stalled, grey the rest. */
function tone(state: TrimState | 'torn'): 'good' | 'luffing' | 'stalled' | 'idle' {
  if (state === 'good') return 'good';
  if (state === 'luffing') return 'luffing';
  if (state === 'stalled' || state === 'torn') return 'stalled';
  return 'idle';
}

const GENNAKER_STEPS = [
  'gennaker.step1',
  'gennaker.step2',
  'gennaker.step3',
  'gennaker.step4',
] as const;

/** M108: the running exercise's current step has a gennaker row in its bar, so the block shows at stage 0. */
function exerciseShowsGennaker(state: AppState): boolean {
  const run = state.exercise;
  if (run === null) return false;
  const bar = exerciseDef(run.id)?.steps[run.step]?.bar ?? [];
  return bar.some((row) => row.startsWith('gennaker:'));
}

/**
 * M105: the gennaker's four rigging steps, shown from the first step on (Settings → Gennaker →
 * Rigged is the way in from stowed). Each step is ticked when done, the next one is marked, and
 * two buttons go a step on or undo one (from stage 4 only while the sock is down). At stage 4
 * (M106) the block also holds the trim line, the sock and sheet rows and the Gybe button.
 */
function buildGennakerBlock(store: Store): HTMLElement {
  const items = GENNAKER_STEPS.map((key, index) => {
    const tick = el('span', { class: 'gennaker-tick', 'aria-hidden': 'true' });
    const item = el('li', { class: 'gennaker-step', 'data-testid': `gennaker-step-${index + 1}` }, [
      tick,
      el('span', {}, [t(key)]),
    ]);
    return { item, tick };
  });
  const list = el('ol', { class: 'gennaker-steps', 'data-testid': 'gennaker-steps' }, [
    ...items.map(({ item }) => item),
  ]);
  const back = el('button', { type: 'button', class: 'segment', 'data-testid': 'gennaker-back' }, [
    t('gennaker.back'),
  ]);
  const next = el('button', { type: 'button', class: 'segment', 'data-testid': 'gennaker-next' }, [
    t('gennaker.next'),
  ]);
  back.addEventListener('click', () => store.dispatch({ type: 'gennaker', command: 'back' }));
  next.addEventListener('click', () => store.dispatch({ type: 'gennaker', command: 'next' }));
  const trim = el('p', { class: 'gennaker-trim', 'data-testid': 'gennaker-trim' });
  const sock = createControl(store, controlView('ctl_gennaker_sock'), [], '-sails');
  const sheet = createControl(store, controlView('ctl_gennaker_sheet'), [], '-sails');
  const gybe = el('button', { type: 'button', class: 'segment', 'data-testid': 'gennaker-gybe' }, [
    t('gennaker.gybe'),
  ]);
  gybe.addEventListener('click', () => store.dispatch({ type: 'gennaker', command: 'gybe' }));
  const sheetRow = el('div', { 'data-testid': 'gennaker-sheet-row' }, [sheet.element]);
  // In Realistic ropes the sheet is worked at its winch, not with the stepper (M107).
  const sheetOnWinch = el(
    'p',
    { class: 'hint gennaker-on-winch', 'data-testid': 'gennaker-sheet-winch', hidden: '' },
    [t('gennaker.sheetOnWinch')],
  );
  const sailing = el(
    'div',
    { class: 'gennaker-sailing', 'data-testid': 'gennaker-sailing', hidden: '' },
    [
      trim,
      el('div', { 'data-testid': 'gennaker-sock-row' }, [sock.element]),
      sheetRow,
      sheetOnWinch,
      el('div', { class: 'segments' }, [gybe]),
    ],
  );
  const root = el('div', { class: 'gennaker-block', 'data-testid': 'gennaker-block', hidden: '' }, [
    el('h4', { class: 'gennaker-title' }, [t('gennaker.title')]),
    list,
    el('div', { class: 'segments' }, [back, next]),
    sailing,
  ]);
  const refresh = (state: AppState) => {
    const { stage } = state.gennaker;
    root.hidden = stage < 1 && !exerciseShowsGennaker(state);
    items.forEach(({ item, tick }, index) => {
      const done = stage >= index + 1;
      item.dataset.done = String(done);
      if (index + 1 === stage + 1) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      tick.textContent = done ? '✓' : '';
    });
    back.disabled = stage <= 0 || (stage === 4 && state.controls.ctl_gennaker_sock > 0);
    next.disabled = stage >= 4;
    sailing.hidden = stage < 4;
    if (stage >= 4) {
      const trimState = gennakerTrimState(state.gennaker, state.rig.gennaker);
      setText(trim, t(`gennaker.trim.${trimState}` as StringKey));
      trim.dataset.state = trimState;
      sock.refresh(state);
      sheet.refresh(state);
      const onWinch = state.settings.ropesMode === 'realistic';
      sheetRow.hidden = onWinch;
      sheetOnWinch.hidden = !onWinch;
      gybe.disabled = state.gennaker.crossS > 0;
    }
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}

/**
 * The Sails block of the Ropes tab (PHASE2_SPEC 9.3): one row per sail with its trim state and
 * what to do about it. The wear bars and Repair sails moved to the Status section (M55,
 * `createSailWear`). The words carry the meaning; the colour only helps.
 */
export function createSailsPanel(store: Store): HTMLElement {
  const rows = sailsOfBoat().map(({ sail, partId }) => {
    const chip = el('span', { class: 'trim-chip', 'data-testid': `trim-chip-${sail}` });
    const hint = el('p', { class: 'trim-hint', 'data-testid': `trim-hint-${sail}` });
    const root = el(
      'div',
      { class: 'trim-row', 'data-part-id': partId, 'data-testid': `trim-row-${sail}` },
      [
        el('div', { class: 'trim-head' }, [
          el('span', { class: 'trim-name' }, [t(`trim.${sail}`)]),
          chip,
        ]),
        hint,
      ],
    );
    return { sail, root, chip, hint };
  });

  // The gennaker block only on a boat that can carry one (M113).
  const gennaker = hasFeature('gennaker') ? buildGennakerBlock(store) : null;
  const root = el(
    'section',
    { class: 'sails-panel', 'data-testid': 'sails-panel', 'aria-label': t('trim.label') },
    [
      el('p', { class: 'hint trim-intro explain' }, [t('trim.intro')]),
      ...rows.map((row) => row.root),
      ...(gennaker ? [gennaker] : []),
    ],
  );

  const { tornForceFactor } = boat.physics.trim.flogging;
  const refresh = (state: AppState) => {
    const { awaDeg } = state.rig.wind;
    for (const row of rows) {
      const trim = sailTrim(row.sail, state.rig, awaDeg);
      const torn = isTorn(state.sailDamage, row.sail);
      const label: TrimState | 'torn' = torn && trim.state !== 'furled' ? 'torn' : trim.state;
      setText(row.chip, t(`trim.state.${label}`));
      row.chip.dataset.state = label;
      row.chip.dataset.tone = tone(label);
      setText(
        row.hint,
        label === 'torn'
          ? t('trim.hint.torn', { pct: Math.round(tornForceFactor * 100) })
          : t(`trim.hint.${trim.state}`),
      );
    }
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}

/**
 * The sails' wear for the Status section (M55, moved from `createSailsPanel`): one row per sail
 * with its name and a wear bar once it has flogged, and Repair sails when one is torn.
 */
export function createSailWear(store: Store): HTMLElement {
  const rows = sailsOfBoat().map(({ sail }) => {
    const barFill = el('span', { class: 'trim-wear-fill' });
    const wearText = el('span', { class: 'trim-wear-text' });
    const wear = el('div', { class: 'trim-wear', 'data-testid': `trim-wear-${sail}`, hidden: '' }, [
      el('span', { class: 'trim-name' }, [t(`trim.${sail}`)]),
      el('span', { class: 'trim-wear-bar', 'aria-hidden': 'true' }, [barFill]),
      wearText,
    ]);
    return { sail, wear, barFill, wearText };
  });
  const repair = el(
    'button',
    { type: 'button', class: 'trim-repair', 'data-testid': 'repair-sails', hidden: '' },
    [t('trim.repair')],
  );
  repair.addEventListener('click', () => store.dispatch({ type: 'repairSails' }));
  const root = el('div', { class: 'sail-wear', 'data-testid': 'sail-wear' }, [
    ...rows.map((row) => row.wear),
    repair,
  ]);

  const { warnAt } = boat.physics.trim.flogging;
  const refresh = (state: AppState) => {
    let anyTorn = false;
    for (const row of rows) {
      const torn = isTorn(state.sailDamage, row.sail);
      anyTorn ||= torn;
      const damage = state.sailDamage[row.sail];
      const worn = damage > 0;
      if (row.wear.hidden === worn) row.wear.hidden = !worn;
      if (worn) {
        const pct = Math.floor(Math.min(1, damage) * 100);
        row.barFill.style.width = `${pct}%`;
        row.wear.dataset.level = torn ? 'torn' : damage >= warnAt ? 'warn' : 'low';
        setText(
          row.wearText,
          torn ? t('trim.state.torn') : damage >= warnAt ? t('trim.wear') : `${pct} %`,
        );
        row.wear.setAttribute(
          'aria-label',
          t('trim.wearBar', { sail: t(`trim.${row.sail}`), pct }),
        );
      }
    }
    if (repair.hidden === anyTorn) repair.hidden = !anyTorn;
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return root;
}
