import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOAT_KEY,
  BOATS_KEY,
  MAX_BOATS,
  chosenBoat,
  linkBoatId,
  removeBoat,
  saveBoat,
  setChosenBoat,
  startBoatId,
  storedBoats,
} from '../src/app/boatStore';
import { HANSE_508 } from '../src/model/boat';
import { makeBoatProfile } from '../src/model/boatProfile';

/** A stand-in for `localStorage` on `globalThis`. */
class FakeStorage {
  data = new Map<string, string>();
  fail = false;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail) throw new Error('quota');
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

let fake: FakeStorage;
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

beforeEach(() => {
  fake = new FakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
});

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

const boatOf = (id: string) => makeBoatProfile(id, `Boat ${id}`, HANSE_508);

describe('M58: boats kept on the device (PHASE8_SPEC 16.8)', () => {
  it('1. nothing stored: no boats, the Hanse 508 chosen', () => {
    expect(storedBoats()).toEqual([]);
    expect(chosenBoat()).toBe('hanse508');
  });

  it('2. saveBoat stores a checked profile once; saving it again replaces it', () => {
    expect(saveBoat(boatOf('test-boat'))).toBe('ok');
    expect(storedBoats()).toHaveLength(1);
    const changed = boatOf('test-boat');
    changed.name = 'Renamed';
    expect(saveBoat(changed)).toBe('ok');
    expect(storedBoats()).toHaveLength(1);
    expect(storedBoats()[0].name).toBe('Renamed');
  });

  it('3. the built-in id, an eleventh boat and a refusing store', () => {
    expect(saveBoat(boatOf('hanse508'))).toBe('builtIn');
    for (let i = 0; i < MAX_BOATS; i += 1) expect(saveBoat(boatOf(`b${i}`))).toBe('ok');
    expect(saveBoat(boatOf('one-too-many'))).toBe('full');
    expect(saveBoat(boatOf('b3'))).toBe('ok');
    fake.fail = true;
    expect(saveBoat(boatOf('b4'))).toBe('storage');
  });

  it('4. a stored entry that fails the checks is dropped', () => {
    saveBoat(boatOf('good'));
    saveBoat(boatOf('bad'));
    const list = JSON.parse(fake.data.get(BOATS_KEY) ?? '[]') as Array<{
      id: string;
      boat: { dimensions: { loa: number } };
    }>;
    list.find((b) => b.id === 'bad')!.boat.dimensions.loa = 99;
    fake.data.set(BOATS_KEY, JSON.stringify(list));
    expect(storedBoats().map((b) => b.id)).toEqual(['good']);
    fake.data.set(BOATS_KEY, 'not json');
    expect(storedBoats()).toEqual([]);
    fake.data.set(BOATS_KEY, '{}');
    expect(storedBoats()).toEqual([]);
  });

  it('5. startBoatId reads the link, or the boat chosen last when there is no query', () => {
    saveBoat(boatOf('test-boat'));
    setChosenBoat('test-boat');
    expect(startBoatId('')).toBe('test-boat');
    expect(startBoatId('?v=1')).toBe('hanse508');
    expect(startBoatId('?v=1&boat=test-boat')).toBe('test-boat');
    expect(startBoatId('?boat=Bad%20Id')).toBe('hanse508');
  });

  it('linkBoatId is pure and checks the pattern', () => {
    expect(linkBoatId('?v=1&boat=a-b')).toBe('a-b');
    expect(linkBoatId('?v=1')).toBe('hanse508');
    expect(linkBoatId('?boat=A B')).toBe('hanse508');
  });

  it('a chosen id that is not stored starts the Hanse 508', () => {
    setChosenBoat('gone');
    expect(fake.data.get(BOAT_KEY)).toBe('gone');
    expect(startBoatId('')).toBe('hanse508');
  });

  it('removeBoat removes one boat only', () => {
    saveBoat(boatOf('a'));
    saveBoat(boatOf('b'));
    removeBoat('a');
    expect(storedBoats().map((b) => b.id)).toEqual(['b']);
  });

  it('works with no storage at all', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(storedBoats()).toEqual([]);
    expect(chosenBoat()).toBe('hanse508');
    expect(saveBoat(boatOf('x'))).toBe('storage');
    expect(() => setChosenBoat('x')).not.toThrow();
  });

  it('the start-up files import only the modules allowed (16.2)', () => {
    const imports = (file: string): string[] =>
      [...readFileSync(file, 'utf8').matchAll(/^import[^;]*?from\s+'([^']+)'/gms)].map((m) => m[1]);
    expect(imports('src/app/boatStore.ts').sort()).toEqual(
      ['../model/boat', '../model/boatProfile'].sort(),
    );
    expect(imports('src/model/boatProfile.ts')).toEqual(['./boat']);
  });
});
