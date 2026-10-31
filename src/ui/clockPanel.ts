import type { AppState, Store } from '../app/store';
import { area } from '../model/area';
import {
  clockParam,
  daylight,
  defaultClockUtcMs,
  localParts,
  parseClockParam,
  type LocalParts,
} from '../model/clock';
import { sunPosition, sunTimes } from '../model/sun';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText } from './stepper';

const pad2 = (value: number) => String(value).padStart(2, '0');

const timeText = (parts: LocalParts) => `${pad2(parts.hour)}:${pad2(parts.minute)}`;

/** `Monday 1 June 2026`. */
function dateText(parts: LocalParts): string {
  const weekday = t(`clock.weekday.${parts.weekday}` as StringKey);
  const month = t(`clock.month.${parts.month}` as StringKey);
  return t('clock.date', { weekday, day: parts.day, month, year: parts.year });
}

/** The local `HH:MM` of a time, rounded to the nearest minute (the chip and the link floor). */
function roundedTime(utcMs: number): string {
  return timeText(localParts(Math.round(utcMs / 60_000) * 60_000));
}

/**
 * The clock (PHASE3_SPEC 9.5, issue #26): a chip with the local time over the 3D view (in `top`,
 * beside the time bar) and a card that the chip opens with the date, the area, sunrise and sunset,
 * the light, and buttons to set the time. The card's open state is not stored.
 */
export function createClockPanel(top: HTMLElement, view: HTMLElement, store: Store): void {
  const chip = el('button', {
    type: 'button',
    class: 'clock-chip',
    'data-testid': 'clock-chip',
    'aria-expanded': 'false',
  });
  // Before the time bar: on a phone the chip then sits at the right of the instrument strip's
  // row instead of taking a row of its own (the side-by-side layout puts it after the bar).
  const bar = top.querySelector('.time-bar');
  if (bar) top.insertBefore(chip, bar);
  else top.append(chip);

  const text = (testId: string) => el('p', { class: 'clock-line', 'data-testid': testId });
  const dateLine = text('clock-date');
  dateLine.classList.add('clock-first');
  const zoneLine = el('p', { class: 'clock-line' });
  const sunLine = text('clock-sun');
  const lightLine = el('p', { class: 'clock-line' });

  const button = (testId: string, label: string, action: () => void) => {
    const node = el('button', { type: 'button', class: 'clock-button', 'data-testid': testId });
    node.textContent = label;
    node.addEventListener('click', action);
    return node;
  };
  const now = button('clock-now', t('clock.now'), () =>
    store.dispatch({ type: 'setClock', utcMs: Date.now() }),
  );
  const noon = button('clock-default', t('clock.default'), () =>
    store.dispatch({ type: 'setClock', utcMs: defaultClockUtcMs() }),
  );

  const dateInput = el('input', {
    type: 'date',
    class: 'clock-input',
    min: '1900-01-01',
    max: '2100-12-31',
    'aria-label': t('clock.dateAria'),
    'data-testid': 'clock-date-input',
  });
  const timeInput = el('input', {
    type: 'time',
    class: 'clock-input',
    step: '60',
    'aria-label': t('clock.timeAria'),
    'data-testid': 'clock-time-input',
  });
  const set = button('clock-set', t('clock.set'), () => {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.value);
    const time = /^(\d{2}):(\d{2})/.exec(timeInput.value);
    if (!date || !time) return;
    const utcMs = parseClockParam(`${date[1]}${date[2]}${date[3]}${time[1]}${time[2]}`);
    if (utcMs !== null) store.dispatch({ type: 'setClock', utcMs });
  });
  // An exercise sets the time (PHASE10_SPEC 6.5).
  const lockedNote = el(
    'p',
    { class: 'clock-hint', 'data-testid': 'exercise-locked-clock', hidden: '' },
    [t('exercise.locked')],
  );
  const close = el('button', {
    type: 'button',
    class: 'clock-close',
    'data-testid': 'clock-close',
    'aria-label': t('clock.close'),
  });
  close.textContent = '×';

  const card = el(
    'section',
    { class: 'clock-card', 'data-testid': 'clock-card', 'aria-label': t('clock.label') },
    [
      close,
      dateLine,
      zoneLine,
      sunLine,
      lightLine,
      el('div', { class: 'clock-row' }, [now, noon]),
      el('p', { class: 'clock-line clock-set-label' }, [t('clock.setLabel')]),
      el('div', { class: 'clock-row' }, [dateInput, timeInput, set]),
      el('p', { class: 'clock-hint' }, [t('clock.hint')]),
      lockedNote,
    ],
  );
  card.hidden = true;
  view.append(card);

  let open = false;
  const setOpen = (next: boolean) => {
    if (open === next) return;
    open = next;
    card.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
    if (open) {
      // The inputs start at the time on board when the card opens, and are left alone after.
      const parts = localParts(store.getState().clock.utcMs);
      dateInput.value = `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
      timeInput.value = timeText(parts);
      refreshCard(store.getState());
    }
  };
  chip.addEventListener('click', () => setOpen(!open));
  close.addEventListener('click', () => {
    setOpen(false);
    chip.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  let cardKey = '';
  const refreshCard = (state: AppState) => {
    const key = clockParam(state.clock.utcMs);
    if (key === cardKey) return;
    cardKey = key;
    const parts = localParts(state.clock.utcMs);
    setText(dateLine, `${dateText(parts)} · ${timeText(parts)}`);
    const abbr = parts.summer
      ? area.timeZone.summerAbbreviation
      : area.timeZone.standardAbbreviation;
    setText(
      zoneLine,
      t('clock.zone', {
        area: t(`area.${area.id}` as StringKey),
        abbr,
        hours: parts.offsetMin / 60,
      }),
    );
    const { latitudeDeg, longitudeDeg } = area.position;
    const sun = sunTimes(parts.year, parts.month, parts.day, latitudeDeg, longitudeDeg);
    if (sun.polar === 'day') setText(sunLine, t('clock.polarDay'));
    else if (sun.polar === 'night') setText(sunLine, t('clock.polarNight'));
    else if (sun.sunriseUtcMs !== null && sun.sunsetUtcMs !== null) {
      setText(
        sunLine,
        t('clock.sun', { rise: roundedTime(sun.sunriseUtcMs), set: roundedTime(sun.sunsetUtcMs) }),
      );
    }
    const { elevationDeg } = sunPosition(state.clock.utcMs, latitudeDeg, longitudeDeg);
    setText(
      lightLine,
      t('clock.light', { light: t(`clock.light.${daylight(elevationDeg)}` as StringKey) }),
    );
  };

  let chipKey = '';
  const refresh = (state: AppState) => {
    const locked = state.exercise !== null;
    for (const control of [now, noon, set, dateInput, timeInput]) control.disabled = locked;
    lockedNote.hidden = !locked;
    const shown = state.settings.clock;
    chip.hidden = !shown;
    if (!shown) setOpen(false);
    const key = clockParam(state.clock.utcMs);
    if (key !== chipKey) {
      chipKey = key;
      const parts = localParts(state.clock.utcMs);
      setText(chip, timeText(parts));
      chip.setAttribute(
        'aria-label',
        t('clock.chipAria', { time: timeText(parts), date: dateText(parts) }),
      );
    }
    if (open) refreshCard(state);
  };
  store.subscribe((state) => refresh(state));
  refresh(store.getState());
}
