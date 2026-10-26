import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { isTorn, sailTrim, type SailName, type TrimState } from '../model/trim';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

const SAILS: { sail: SailName; partId: string }[] = [
  { sail: 'main', partId: 'sail_main' },
  { sail: 'jib', partId: 'sail_jib' },
];

/** The state chip's colour family: green good, amber luffing, red stalled, grey the rest. */
function tone(state: TrimState | 'torn'): 'good' | 'luffing' | 'stalled' | 'idle' {
  if (state === 'good') return 'good';
  if (state === 'luffing') return 'luffing';
  if (state === 'stalled' || state === 'torn') return 'stalled';
  return 'idle';
}

/**
 * The Sails block of the Ropes tab (PHASE2_SPEC 9.3): one row per sail with its trim state and
 * what to do about it. The wear bars and Repair sails moved to the Status section (M55,
 * `createSailWear`). The words carry the meaning; the colour only helps.
 */
export function createSailsPanel(store: Store): HTMLElement {
  const rows = SAILS.map(({ sail, partId }) => {
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

  const root = el(
    'section',
    { class: 'sails-panel', 'data-testid': 'sails-panel', 'aria-label': t('trim.label') },
    [
      el('p', { class: 'hint trim-intro explain' }, [t('trim.intro')]),
      ...rows.map((row) => row.root),
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
  const rows = SAILS.map(({ sail }) => {
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
