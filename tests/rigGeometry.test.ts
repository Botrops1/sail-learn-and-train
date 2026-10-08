import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import {
  boomEnd,
  boomPoint,
  jibCentrelineClew,
  jibCorners,
  mainSailCorners,
  selfTackingTrackEnds,
  vangStrutEnds,
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

  it('self-tacking track: straight across the deck at centreX, ends at ±halfSpan', () => {
    const [port, starboard] = selfTackingTrackEnds();
    const track = boat.rig.selfTackingTrack;
    expect(port).toEqual([track.centreX, track.y, -track.halfSpan]);
    expect(starboard).toEqual([track.centreX, track.y, track.halfSpan]);
    expect(distance(port, starboard)).toBeCloseTo(2.8, 1);
  });

  it('rigid vang strut runs from the mast foot to the boom and follows the boom', () => {
    const [mastEnd, boomEnd] = vangStrutEnds();
    expect(mastEnd).toEqual(vec3(boat.rig.vang.mastPoint));
    expect(boomEnd).toEqual(boomPoint(boat.rig.vang.boomDistance));
    const lifted = vangStrutEnds({ thetaDeg: 0, psiDeg: 8 })[1];
    expect(lifted[1]).toBeGreaterThan(boomEnd[1]);
    expect(distance(mastEnd, lifted)).toBeGreaterThan(distance(mastEnd, boomEnd));
  });
});
