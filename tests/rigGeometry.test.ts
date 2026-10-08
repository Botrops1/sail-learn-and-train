import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import {
  boomEnd,
  boomPoint,
  jibCentrelineClew,
  jibCorners,
  mainSailCorners,
  selfTackingTrackPoints,
} from '../src/model/rigGeometry';
import { distance, vec3 } from '../src/model/vec3';

describe('static rig geometry (M1)', () => {
  it('boom on the centreline points straight aft from the gooseneck', () => {
    const end = boomEnd();
    const [gx, gy] = boat.rig.boom.gooseneck;
    expect(end[0]).toBeCloseTo((gx ?? 0) - boat.rig.boom.length, 6);
    expect(end[1]).toBeCloseTo(gy ?? 0, 6);
    expect(end[2]).toBeCloseTo(0, 6);
  });

  it('boom point follows the sign conventions: + swing = starboard, + pitch = end up', () => {
    expect(boomPoint(3, { thetaDeg: 30, psiDeg: 0 })[2]).toBeGreaterThan(0);
    expect(boomPoint(3, { thetaDeg: -30, psiDeg: 0 })[2]).toBeLessThan(0);
    expect(boomPoint(3, { thetaDeg: 0, psiDeg: 10 })[1]).toBeGreaterThan(
      boat.rig.boom.gooseneck[1] ?? 0,
    );
  });

  it('jib on the centreline keeps its side lengths and lies in the centre plane', () => {
    const clew = jibCentrelineClew();
    const { tack, head, lengths } = boat.sails.jib;
    expect(clew[2]).toBeCloseTo(0, 6);
    expect(distance(clew, vec3(tack))).toBeCloseTo(lengths.foot, 1);
    expect(distance(clew, vec3(head))).toBeCloseTo(lengths.leech, 1);
    // The clew stays aft of the tack, near the mast (about 0.4 m forward of it).
    expect(clew[0]).toBeGreaterThan(boat.rig.mast.x);
    expect(clew[0]).toBeLessThan(1.5);
  });

  it('furling moves the jib clew towards the tack along the foot', () => {
    const full = jibCorners(1);
    const half = jibCorners(0.5);
    const tack = vec3(boat.sails.jib.tack);
    expect(distance(half.clew, tack)).toBeCloseTo(distance(full.clew, tack) / 2, 6);
  });

  it('mainsail: luff up the mast to headY, clew on the boom at f · footLength', () => {
    const main = mainSailCorners(1);
    expect(main.head[1]).toBe(boat.sails.main.headY);
    expect(main.tack[0]).toBeCloseTo(main.head[0], 6);
    expect(distance(main.tack, main.clew)).toBeCloseTo(boat.sails.main.footLength, 6);
    expect(distance(mainSailCorners(0.5).tack, mainSailCorners(0.5).clew)).toBeCloseTo(
      boat.sails.main.footLength / 2,
      6,
    );
  });

  it('self-tacking track: arc around the jib tack, centre at centreX, ends at ±halfSpan', () => {
    const points = selfTackingTrackPoints();
    const track = boat.rig.selfTackingTrack;
    const tack = vec3(boat.sails.jib.tack);
    const radius = tack[0] - track.centreX;
    for (const p of points) {
      expect(Math.hypot(p[0] - tack[0], p[2] - tack[2])).toBeCloseTo(radius, 6);
    }
    expect(points[0]?.[2]).toBeCloseTo(-track.halfSpan, 6);
    expect(points[points.length - 1]?.[2]).toBeCloseTo(track.halfSpan, 6);
    expect(points[Math.floor(points.length / 2)]?.[0]).toBeCloseTo(track.centreX, 6);
  });
});
