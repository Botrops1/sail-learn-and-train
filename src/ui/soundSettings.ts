import { getSoundPrefs, onSoundPrefs, setSoundPrefs } from '../audio/prefs';
import { soundSupported } from '../audio/support';
import type { SoundPrefs } from '../audio/types';
import { el } from './dom';
import { t } from './i18n';

/**
 * Settings → Sound (M87, PHASE_AUDIO_SPEC 6.4): Sound on, Music, Surroundings, Boat sounds and
 * Volume. The setting is a device preference (`src/audio/prefs.ts`), not app state: no store
 * action, nothing in the link. The listeners are never removed (the Settings body is built once).
 */

type Group = 'music' | 'surroundings' | 'boat';

function toggleField(
  id: string,
  testId: string,
  label: string,
  hint: string | undefined,
  group: boolean,
): { field: HTMLElement; input: HTMLInputElement } {
  const input = el('input', { type: 'checkbox', id, 'data-testid': testId });
  const children: HTMLElement[] = [
    el('label', { class: 'toggle', for: id }, [input, el('span', {}, [label])]),
  ];
  if (hint) children.push(el('p', { class: 'hint' }, [hint]));
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

  const groups: Record<Group, { field: HTMLElement; input: HTMLInputElement }> = {
    music: toggleField('sound-music-toggle', 'sound-music', t('sound.music'), undefined, true),
    surroundings: toggleField(
      'sound-surroundings-toggle',
      'sound-surroundings',
      t('sound.surroundings'),
      t('sound.surroundings.hint'),
      true,
    ),
    boat: toggleField(
      'sound-boat-toggle',
      'sound-boat',
      t('sound.boat'),
      t('sound.boat.hint'),
      true,
    ),
  };
  for (const key of Object.keys(groups) as Group[]) {
    groups[key].input.addEventListener('change', () =>
      setSoundPrefs({ [key]: groups[key].input.checked }),
    );
  }

  const volume = el('input', {
    type: 'range',
    id: 'sound-volume',
    min: '0',
    max: '100',
    step: '5',
    'data-testid': 'sound-volume',
    class: 'sound-volume',
  });
  const volumeValue = el('span', { 'data-testid': 'sound-volume-value' });
  volume.addEventListener('input', () => setSoundPrefs({ volume: Number(volume.value) }));
  const volumeField = el('div', { class: 'field' }, [
    el('label', { for: 'sound-volume' }, [t('sound.volume')]),
    volume,
    volumeValue,
  ]);

  const inputs = [main.input, ...Object.values(groups).map((g) => g.input), volume];
  if (!supported) for (const input of inputs) input.disabled = true;

  const sync = (prefs: SoundPrefs): void => {
    main.input.checked = prefs.on;
    for (const key of Object.keys(groups) as Group[]) groups[key].input.checked = prefs[key];
    volume.value = String(prefs.volume);
    volumeValue.textContent = t('sound.volumeValue', { value: prefs.volume });
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
