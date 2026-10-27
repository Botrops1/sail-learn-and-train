import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import {
  makeSetupFile,
  readSetupFile,
  setupFileName,
  type DeviceSettings,
} from '../src/app/setupFile';
import { HANSE_508 } from '../src/model/boat';
import { makeBoatProfile } from '../src/model/boatProfile';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { defaultColumns } from '../src/ui/columnWidths';
import { DEFAULT_WIDE_LAYOUT, moveSection } from '../src/ui/sectionLayout';

const SAVED_AT = '2026-10-23T10:15:00.000Z';

const device = (): DeviceSettings => ({
  columns: { widths: [450, 320], collapsed: [false, true] },
  timeBarFolded: true,
  layout: moveSection(DEFAULT_WIDE_LAYOUT, 'conditions', 0, 0),
});

const fileText = (patch: Record<string, unknown>): string =>
  JSON.stringify({
    ...makeSetupFile('?v=1&wd=90', { ...device(), layout: null }, SAVED_AT),
    ...patch,
  });

describe('M56: the setup file (PHASE8_SPEC 14.6)', () => {
  it('makeSetupFile → JSON → readSetupFile gives the same link and device', () => {
    const file = makeSetupFile('?v=1&wd=90&ws=16', device(), SAVED_AT);
    expect(file.device.columns).toEqual({ w: [450, 320], c: [0, 1] });
    expect((file.device.layout as { v: number }).v).toBe(1);
    const read = readSetupFile(JSON.stringify(file));
    expect(read).toEqual({ ok: true, link: '?v=1&wd=90&ws=16', device: device() });
  });

  it('names the file with the local date', () => {
    expect(setupFileName(new Date(2026, 9, 3))).toBe('sail-setup-2026-10-03.json');
  });

  it('refuses files that are not setup files', () => {
    expect(readSetupFile('{')).toEqual({ ok: false, problem: 'notJson' });
    expect(readSetupFile('{"app":"x","kind":"setup","version":1}')).toEqual({
      ok: false,
      problem: 'notSetup',
    });
    expect(readSetupFile('[]')).toEqual({ ok: false, problem: 'notSetup' });
    expect(readSetupFile('null')).toEqual({ ok: false, problem: 'notSetup' });
    expect(readSetupFile(fileText({ version: 2 }))).toEqual({ ok: false, problem: 'newer' });
    expect(readSetupFile(fileText({ version: '1' }))).toEqual({ ok: false, problem: 'newer' });
    expect(readSetupFile(fileText({ link: 'v=1' }))).toEqual({ ok: false, problem: 'badLink' });
    expect(readSetupFile(fileText({ link: 5 }))).toEqual({ ok: false, problem: 'badLink' });
    expect(readSetupFile(fileText({ link: `?${'a'.repeat(8000)}` }))).toEqual({
      ok: false,
      problem: 'badLink',
    });
  });

  it('turns a bad or missing device part into the defaults, never an error', () => {
    const garbage = JSON.parse(fileText({}));
    garbage.device.columns = 'garbage';
    garbage.device.layout = { v: 7 };
    garbage.device.timeBarFolded = 'yes';
    const read = readSetupFile(JSON.stringify(garbage));
    expect(read).toEqual({
      ok: true,
      link: '?v=1&wd=90',
      device: { columns: defaultColumns(), timeBarFolded: false, layout: null },
    });

    const bare = JSON.parse(fileText({}));
    delete bare.device.columns;
    delete bare.device.layout;
    delete bare.device.timeBarFolded;
    expect(readSetupFile(JSON.stringify(bare))).toEqual(read);

    const noDevice = JSON.parse(fileText({}));
    delete noDevice.device;
    expect(readSetupFile(JSON.stringify(noDevice))).toEqual(read);
  });

  it('keeps the link of the start state', () => {
    const link = serializeUrlState(initialState());
    const read = readSetupFile(JSON.stringify(makeSetupFile(link, device(), SAVED_AT)));
    if (!read.ok) throw new Error('should read');
    expect(serializeUrlState(parseUrlState(read.link))).toBe(link);
  });
});

describe('M58: the boat in a setup file (PHASE8_SPEC 16.6)', () => {
  const text = (link: string, boatProfile: unknown): string =>
    JSON.stringify({
      ...makeSetupFile(link, { ...device(), layout: null }, SAVED_AT),
      boatProfile,
    });

  it('a valid profile whose id matches the link reads ok and is kept', () => {
    const profile = makeBoatProfile('test-boat', 'Test boat', HANSE_508);
    const file = makeSetupFile('?v=1&boat=test-boat', device(), SAVED_AT, profile);
    const read = readSetupFile(JSON.stringify(file));
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.boatProfile?.id).toBe('test-boat');
  });

  it('a setup without a boat profile has none', () => {
    const read = readSetupFile(JSON.stringify(makeSetupFile('?v=1', device(), SAVED_AT)));
    expect(read.ok && read.boatProfile).toBeUndefined();
  });

  it('a broken profile, the built-in id, or an id the link does not name is badBoat', () => {
    const good = makeBoatProfile('test-boat', 'Test boat', HANSE_508);
    const broken = structuredClone(good);
    broken.boat.dimensions.loa = 99;
    expect(readSetupFile(text('?v=1&boat=test-boat', broken))).toEqual({
      ok: false,
      problem: 'badBoat',
    });
    const builtIn = makeBoatProfile('hanse508', 'Hanse 508', HANSE_508);
    expect(readSetupFile(text('?v=1', builtIn))).toEqual({ ok: false, problem: 'badBoat' });
    expect(readSetupFile(text('?v=1&boat=other', good))).toEqual({ ok: false, problem: 'badBoat' });
    expect(readSetupFile(text('?v=1', good))).toEqual({ ok: false, problem: 'badBoat' });
    expect(readSetupFile(text('?v=1&boat=test-boat', 'x'))).toEqual({
      ok: false,
      problem: 'badBoat',
    });
  });
});
