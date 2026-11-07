import { getSoundPrefs, onSoundPrefs, setSoundPrefs } from '../audio/prefs';
import { soundSupported } from '../audio/support';
import { GROUP_VOLUME_KEY, type SoundPrefs } from '../audio/types';
import { el } from './dom';
import { t } from './i18n';

/**
 * Settings → Sound (M87, PHASE_AUDIO_SPEC 6.4): Sound on, Music, Surroundings, Boat sounds and
 * Volume. The setting is a device preference (`src/audio/prefs.ts`), not app state: no store
 * action, nothing in the link. The listeners are never removed (the Settings body is built once).
 */

type Group = 'music' | 'surroundings' | 'boat';

/** A 0–100 slider with its value as text, for the overall volume and for each group's balance. */
function volumeSlider(
  id: string,
  testId: string,
  ariaLabel: string | undefined,
  onInput: (value: number) => void,
): { input: HTMLInputElement; value: HTMLElement; row: HTMLElement } {
  const input = el('input', {
    type: 'range',
    id,
    min: '0',
    max: '100',
    step: '5',
    'data-testid': testId,
    class: 'sound-volume',
  });
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
  const value = el('span', { 'data-testid': `${testId}-value` });
  input.addEventListener('input', () => onInput(Number(input.value)));
  return { input, value, row: el('div', { class: 'sound-slider' }, [input, value]) };
}

function toggleField(
  id: string,
  testId: string,
  label: string,
  hint: string | undefined,
  group: boolean,
  slider?: { row: HTMLElement },
): { field: HTMLElement; input: HTMLInputElement } {
  const input = el('input', { type: 'checkbox', id, 'data-testid': testId });
  const children: HTMLElement[] = [
    el('label', { class: 'toggle', for: id }, [input, el('span', {}, [label])]),
  ];
  if (hint) children.push(el('p', { class: 'hint' }, [hint]));
  if (slider) children.push(slider.row);
  return { field: el('div', { class: group ? 'field sound-group' : 'field' }, children), input };
}

export function buildSoundField(): HTMLElement {
  const supported = soundSupported();
  const root = el('fieldset', { class: 'field sound-setting', 'data-testid': 'sound-setting' }, [
    el('legend', {}, [t('sound.label')]),
    el('p', { class: 'hint' }, [t('sound.hint')]),
  ]);
  if (!supported) root.append(el('p', { class: 'hint' }, [t('sound.unsupported')]));

  const main = toggleField('sound-toggle', 'sound-switch', t('sound.on'), undefined, false);
  main.input.addEventListener('change', () => setSoundPrefs({ on: main.input.checked }));

  // One balance slider per group, under its switch (M91, owner request): the group's volume on top of the overall one.
  const sliders = {} as Record<Group, ReturnType<typeof volumeSlider>>;
  const names: Record<Group, string> = {
    music: t('sound.music'),
    surroundings: t('sound.surroundings'),
    boat: t('sound.boat'),
  };
  for (const key of Object.keys(names) as Group[]) {
    sliders[key] = volumeSlider(
      `sound-${key}-volume`,
      `sound-${key}-volume`,
      t('sound.groupVolume', { name: names[key] }),
      (v) => setSoundPrefs({ [GROUP_VOLUME_KEY[key]]: v }),
    );
  }
  const groups: Record<Group, { field: HTMLElement; input: HTMLInputElement }> = {
    music: toggleField(
      'sound-music-toggle',
      'sound-music',
      names.music,
      undefined,
      true,
      sliders.music,
    ),
    surroundings: toggleField(
      'sound-surroundings-toggle',
      'sound-surroundings',
      names.surroundings,
      t('sound.surroundings.hint'),
      true,
      sliders.surroundings,
    ),
    boat: toggleField(
      'sound-boat-toggle',
      'sound-boat',
      names.boat,
      t('sound.boat.hint'),
      true,
      sliders.boat,
    ),
  };
  for (const key of Object.keys(groups) as Group[]) {
    groups[key].input.addEventListener('change', () =>
      setSoundPrefs({ [key]: groups[key].input.checked }),
    );
  }

  const overall = volumeSlider('sound-volume', 'sound-volume', undefined, (v) =>
    setSoundPrefs({ volume: v }),
  );
  const volume = overall.input;
  const volumeValue = overall.value;
  const volumeField = el('div', { class: 'field' }, [
    el('label', { for: 'sound-volume' }, [t('sound.volume')]),
    overall.row,
  ]);

  const inputs = [
    main.input,
    ...Object.values(groups).map((g) => g.input),
    ...Object.values(sliders).map((s) => s.input),
    volume,
  ];
  if (!supported) for (const input of inputs) input.disabled = true;

  const sync = (prefs: SoundPrefs): void => {
    main.input.checked = prefs.on;
    for (const key of Object.keys(groups) as Group[]) groups[key].input.checked = prefs[key];
    volume.value = String(prefs.volume);
    volumeValue.textContent = t('sound.volumeValue', { value: prefs.volume });
    for (const key of Object.keys(sliders) as Group[]) {
      const own = prefs[GROUP_VOLUME_KEY[key]];
      sliders[key].input.value = String(own);
      sliders[key].value.textContent = t('sound.volumeValue', { value: own });
    }
  };
  onSoundPrefs(sync);
  sync(getSoundPrefs());

  root.append(
    main.field,
    groups.music.field,
    groups.surroundings.field,
    groups.boat.field,
    volumeField,
  );
  return root;
}
