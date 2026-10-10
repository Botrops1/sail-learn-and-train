import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialHandle, type HandleState } from '../src/model/realistic';
import { crankTracker, slotMode, tapSlot } from '../src/ui/handleDrawing';

/**
 * The winch handle's slot (owner, after M4c): every station has one, always; the handle comes
 * out of a socket only when its grip is dropped on the slot, never by the crank itself.
 */

const at = (patch: Partial<HandleState>): HandleState => ({ ...initialHandle(), ...patch });

describe('the handle slot at each station', () => {
  it('shows where the handle is: resting here, carried, in this socket, or elsewhere', () => {
    expect(slotMode(at({}), 'port')).toBe('rest');
    expect(slotMode(at({}), 'starboard')).toBe('away');
    expect(slotMode(at({}), 'mast')).toBe('away');
    expect(slotMode(at({}), 'helm')).toBe('away');
    expect(slotMode(at({ station: 'mast', place: 'socket' }), 'mast')).toBe('socket');
    expect(slotMode(at({ station: 'mast', place: 'socket' }), 'port')).toBe('away');
    // Carried: the same at every station.
    for (const station of ['port', 'starboard', 'helm', 'mast'] as const) {
      expect(slotMode(at({ station: 'starboard', place: 'carried' }), station)).toBe('carried');
    }
  });

  it('a tap takes the handle, lays a carried one down, and does nothing to a handle in its socket', () => {
    expect(tapSlot('rest')).toBe('carry');
    expect(tapSlot('carried')).toBe('stow');
    expect(tapSlot('socket')).toBeNull();
    // Elsewhere: the tap is answered with "the handle is at …" by the model.
    expect(tapSlot('away')).toBe('carry');
  });
});

describe('cranking never takes the handle out', () => {
  afterEach(() => vi.useRealTimers());

  const ARM = 50;
  const ring = (radius: number, turns: number, steps = 24) =>
    Array.from({ length: steps }, (_, i) => {
      const a = -Math.PI / 2 + (turns * 2 * Math.PI * (i + 1)) / steps;
      return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
    });

  function run(points: { x: number; y: number }[]) {
    vi.useFakeTimers();
    const sent: number[] = [];
    const tracker = crankTracker(
      () => ({ x: 0, y: 0 }),
      (turnsPerS) => sent.push(turnsPerS),
      ARM,
    );
    tracker.start(0, -ARM, 0);
    let time = 0;
    const outside: boolean[] = [];
    for (const p of points) {
      time += 40;
      outside.push(tracker.move(p.x, p.y, time));
    }
    tracker.end();
    return { sent, outside };
  }

  it('a finger circling the grip gives a clockwise crank and is never outside the circle', () => {
    const { sent, outside } = run(ring(ARM, 2));
    expect(Math.max(...sent)).toBeGreaterThan(0.5);
    expect(outside.every((o) => !o)).toBe(true);
  });

  it('a sloppy, wide circle stops the crank while the finger is outside, and starts it again inside', () => {
    // Round the crank circle, out to 3 arms, and back round it.
    const { sent, outside } = run([...ring(ARM, 1), ...ring(3 * ARM, 1), ...ring(ARM, 1)]);
    expect(outside.slice(0, 24).every((o) => !o)).toBe(true);
    expect(outside.slice(24, 48).every((o) => o)).toBe(true);
    expect(outside.slice(48).every((o) => !o)).toBe(true);
    // It stopped (0 sent) and then turned again.
    const stop = sent.indexOf(0);
    expect(stop).toBeGreaterThan(0);
    expect(Math.max(...sent.slice(stop + 1))).toBeGreaterThan(0.5);
  });

  it('the finger stays "outside" only beyond two arms: the old removal distance (1.7) is inside now', () => {
    const { outside } = run(ring(1.9 * ARM, 1));
    expect(outside.every((o) => !o)).toBe(true);
  });
});
