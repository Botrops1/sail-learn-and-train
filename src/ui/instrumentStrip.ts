import type { AppState, Store } from '../app/store';
import { compassDeg, mpsToKn, wrap180 } from '../model/angles';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';
import { sideLetter } from './autopilotPanel';

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
 * The instrument strip over the 3D view (PHASE2_SPEC 6.5), top left, replacing Phase 1's wind
 * chip: speed, heading and the autopilot on the first line; true and apparent wind on the
 * second. A tap opens the Wind tab. The text changes only when a displayed value does.
 */
export function createInstrumentStrip(
  host: HTMLElement,
  store: Store,
  openWindTab: () => void,
): void {
  const speed = el('span', { class: 'strip-speed', 'data-testid': 'strip-speed' });
  const heading = el('span', { class: 'strip-heading', 'data-testid': 'strip-heading' });
  const auto = el('span', { class: 'strip-auto', 'data-testid': 'strip-auto' });
  const trueWind = el('span', { 'data-testid': 'strip-true' });
  const apparent = el('span', { 'data-testid': 'strip-apparent' });
  const strip = el(
    'button',
    {
      type: 'button',
      class: 'instrument-strip',
      'data-testid': 'instrument-strip',
      'data-part-id': 'fit_instrument_display',
      'aria-label': t('instruments.label'),
    },
    [
      el('span', { class: 'strip-line' }, [speed, heading, auto]),
      el('span', { class: 'strip-line strip-winds' }, [trueWind, apparent]),
    ],
  );
  strip.addEventListener('click', openWindTab);
  host.append(strip);

  const refresh = (state: AppState) => {
    const { boat, autopilot, rig } = state;
    const kn = Math.round(mpsToKn(boat.speedMps) * 10) / 10;
    setText(
      speed,
      boat.mode === 'held'
        ? t('instruments.held')
        : t('instruments.speed', { speed: (kn === 0 ? 0 : kn).toFixed(1) }),
    );
    setText(
      heading,
      t('instruments.heading', { deg: Math.round(compassDeg(boat.headingDeg)) % 360 }),
    );
    // The autopilot steers only while sailing: held still, no badge.
    let badge = '';
    if (boat.mode === 'held') badge = '';
    else if (autopilot.mode === 'heading') {
      badge = t('instruments.auto.heading', { deg: Math.round(autopilot.targetDeg) % 360 });
    } else if (autopilot.mode === 'wind') {
      const target = Math.round(autopilot.targetDeg);
      badge = tidy(t('instruments.auto.wind', { deg: Math.abs(target), side: sideLetter(target) }));
    }
    setText(auto, badge);
    auto.hidden = badge === '';
    const wind = rig.wind;
    setText(trueWind, windText('instruments.true', wind.twaDeg, wind.twsKn));
    setText(apparent, windText('instruments.apparent', wind.awaDeg, wind.awsKn));
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
