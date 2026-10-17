import type { AppState, Store } from '../app/store';
import { compassDeg, mpsToKn, wrap180 } from '../model/angles';
import { SAIL_LEARN, wornSail } from '../model/alerts';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';
import { sideLetter } from './autopilotPanel';
import { boat as boatData } from '../model/boat';
import { rpmNumber } from './enginePanel';
import type { LayoutShell } from './layout';

/** Collapses the space left where a wind straight ahead or astern has no side letter. */
function tidy(text: string): string {
  return text.replace(/\s{2,}/g, ' ').replace(/ $/, '');
}

function windText(
  key: 'instruments.true' | 'instruments.apparent',
  angleDeg: number,
  speedKn: number,
): string {
  return tidy(
    t(key, {
      deg: Math.round(Math.abs(wrap180(angleDeg))),
      side: sideLetter(angleDeg),
      speed: Math.round(speedKn),
    }),
  );
}

/**
 * A cell of the strip that keeps its width: `ghost` is the widest text it can show (3-digit
 * angles, 2-digit speeds), drawn invisibly in the same place, so the box does not change width
 * when the numbers do (issue #86). `wideGhost` is a wider text that is reserved beside the panel only.
 */
function cell(ghost: string, content: HTMLElement, wideGhost?: string): HTMLElement {
  const ghosts = [el('span', { class: 'strip-ghost', 'aria-hidden': 'true' }, [ghost])];
  // Reserved only where there is room (beside the panel); a phone's line is full.
  if (wideGhost) {
    ghosts.push(
      el('span', { class: 'strip-ghost strip-ghost-wide', 'aria-hidden': 'true' }, [wideGhost]),
    );
  }
  return el('span', { class: 'strip-cell' }, [...ghosts, content]);
}

/**
 * A badge in the strip that opens a Learn entry (issue #88). A button of its own beside the
 * strip's main button (a button inside a button is not allowed).
 */
function chip(
  className: string,
  testId: string,
  title: string,
  learnId: () => string,
  showLearn: (id: string) => void,
  hidden: boolean,
): HTMLElement {
  const node = el('button', {
    type: 'button',
    class: className,
    'data-testid': testId,
    title,
    ...(hidden ? { hidden: '' } : {}),
  });
  node.addEventListener('click', () => showLearn(learnId()));
  return node;
}

/**
 * The instrument strip over the 3D view (PHASE2_SPEC 6.5), top left, replacing Phase 1's wind
 * chip: speed, heading, heel and the autopilot; true and apparent wind. A tap opens the
 * Conditions section. The text changes only when a displayed value does. The box has one width
 * whatever the numbers (every cell reserves its widest text; M37, issue #86). Below, a row of
 * badges shows only while one applies: a worn sail, a gust, the engine; each opens its Learn entry.
 */
export function createInstrumentStrip(
  host: HTMLElement,
  store: Store,
  openConditions: () => void,
  showLearn: (id: string) => void,
  layout: LayoutShell,
): void {
  const speed = el('span', { class: 'strip-speed', 'data-testid': 'strip-speed' });
  const heading = el('span', { class: 'strip-heading', 'data-testid': 'strip-heading' });
  const heel = el('span', { class: 'strip-heel', 'data-testid': 'strip-heel' });
  const auto = el('span', { class: 'strip-auto', 'data-testid': 'strip-auto' });
  const gust = chip(
    'strip-gust',
    'strip-gust',
    t('instruments.gustTitle'),
    () => 'term_gust',
    showLearn,
    false,
  );
  gust.textContent = t('instruments.gust');
  const engine = chip(
    'strip-engine',
    'strip-engine',
    t('instruments.engineTitle'),
    () => 'engine_control',
    showLearn,
    true,
  );
  // The sail that is worn the most (the main when both are), as the notification centre says.
  let wornId = SAIL_LEARN.main;
  const worn = chip(
    'strip-sail',
    'strip-sail',
    t('trim.badgeTitle'),
    () => wornId,
    showLearn,
    true,
  );
  worn.textContent = t('trim.badge');
  const trueWind = el('span', { 'data-testid': 'strip-true' });
  const apparent = el('span', { 'data-testid': 'strip-apparent' });
  // The badges get a row of their own, only while one shows: the first line is full.
  const flags = el('span', { class: 'strip-line strip-flags' }, [worn, gust, engine]);
  const main = el(
    'button',
    {
      type: 'button',
      class: 'strip-main',
      'data-testid': 'strip-main',
      'aria-label': t('instruments.label'),
    },
    [
      el('span', { class: 'strip-line strip-primary' }, [
        cell('00.0 kn', speed),
        cell('HDG 000°', heading),
        cell('Heel 00° S', heel),
        cell('AUTO 000° S', auto, 'AUTO wind 000° S'),
      ]),
      el('span', { class: 'strip-line strip-winds' }, [
        cell('True 000° S · 00 kn', trueWind),
        cell('App 000° S · 00 kn', apparent),
      ]),
    ],
  );
  const strip = el(
    'div',
    {
      class: 'instrument-strip',
      'data-testid': 'instrument-strip',
      'data-part-id': 'fit_instrument_display',
    },
    [main, flags],
  );
  main.addEventListener('click', openConditions);
  host.append(strip);

  const refresh = (state: AppState) => {
    const { boat, autopilot, rig } = state;
    const kn = Math.round(mpsToKn(boat.speedMps) * 10) / 10;
    const held = boat.mode === 'held';
    speed.classList.toggle('is-held', held);
    setText(
      speed,
      held
        ? t('instruments.held')
        : t('instruments.speed', { speed: (kn === 0 ? 0 : kn).toFixed(1) }),
    );
    setText(
      heading,
      t('instruments.heading', { deg: Math.round(compassDeg(boat.headingDeg)) % 360 }),
    );
    // Heel: how far she leans, and which rail is down. Upright (under 1°) shows nothing.
    const lean = Math.round(Math.abs(boat.heelDeg));
    const leanText =
      lean >= 1 ? t('instruments.heel', { deg: lean, side: sideLetter(boat.heelDeg) }) : '';
    setText(heel, leanText);
    heel.hidden = leanText === '';
    // The autopilot steers only while sailing: held still, no badge.
    let badge = '';
    if (boat.mode === 'held') badge = '';
    else if (autopilot.mode === 'heading') {
      badge = t('instruments.auto.heading', { deg: Math.round(autopilot.targetDeg) % 360 });
    } else if (autopilot.mode === 'wind') {
      const target = Math.round(autopilot.targetDeg);
      // A phone's line is full: "AUTO 150° S" without the word "wind" (the side letter tells it from a heading).
      const key =
        layout.viewport().mode === 'stacked'
          ? 'instruments.auto.windShort'
          : 'instruments.auto.wind';
      badge = tidy(t(key, { deg: Math.abs(target), side: sideLetter(target) }));
    }
    setText(auto, badge);
    auto.hidden = badge === '';
    // GUST: the wind is well above the average the dial sets (gusty mode only; a building wind
    // is not a gust). The speed of time is shown in the time bar (M37, issue #87).
    const gusting =
      state.windMode.mode === 'gusty' &&
      state.wind.twsKn > boatData.windModes.gustBadgeFraction * state.controls.ctl_wind_speed;
    if (gust.hidden === gusting) gust.hidden = !gusting;
    // A sail worn out from flapping (M9).
    const wornSailNow = wornSail(state.sailDamage);
    const wearing = wornSailNow !== null;
    if (wornSailNow) wornId = SAIL_LEARN[wornSailNow];
    if (worn.hidden === wearing) worn.hidden = !wearing;
    // The third row exists only while a badge shows (the first row is full on a phone).
    // The engine's rpm shows while it runs (M12).
    const running = state.engine.running;
    setText(engine, running ? t('instruments.engine', { rpm: rpmNumber(state.engine.rpm) }) : '');
    engine.hidden = !running;
    const flagged = gusting || wearing || running;
    if (flags.hidden === flagged) flags.hidden = !flagged;
    const wind = rig.wind;
    setText(trueWind, windText('instruments.true', wind.twaDeg, wind.twsKn));
    setText(apparent, windText('instruments.apparent', wind.awaDeg, wind.awsKn));
  };
  store.subscribe(refresh);
  layout.onChange(() => refresh(store.getState()));
  refresh(store.getState());
}
