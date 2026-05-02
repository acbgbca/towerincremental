import { describe, it, expect } from 'vitest';
import { distanceToNearEdge, pickTarget } from '../../src/game/systems/CombatSystem';

interface Mover {
  x: number;
  y: number;
  range: number;
}

interface Target {
  x: number;
  y: number;
  width: number;
  alive: boolean;
}

function self(x: number, y: number, range: number = 1000): Mover {
  return { x, y, range };
}

function target(x: number, y: number, width: number = 60, alive: boolean = true): Target {
  return { x, y, width, alive };
}

function asRangeTarget(t: Target) {
  return {
    x: t.x,
    y: t.y,
    width: t.width,
    isAlive: () => t.alive,
    takeDamage: () => {},
  };
}

describe('distanceToNearEdge', () => {
  it('matches 1D behaviour when both are at the same Y', () => {
    const s = self(100, 360);
    const t = target(200, 360, 60);
    // dx = 100, dy = 0 -> hypot = 100 -> 100 - 30 = 70
    expect(distanceToNearEdge(s, t)).toBe(70);
  });

  it('returns greater distance when target is offset in Y', () => {
    const s = self(100, 360);
    const sameY = target(200, 360, 60);
    const offsetY = target(200, 410, 60);
    expect(distanceToNearEdge(s, offsetY)).toBeGreaterThan(distanceToNearEdge(s, sameY));
  });

  it('uses Math.hypot for the diagonal', () => {
    const s = self(0, 0);
    const t = target(30, 40, 0);
    // 3-4-5 triangle, hypot = 50, width/2 = 0
    expect(distanceToNearEdge(s, t)).toBeCloseTo(50);
  });
});

describe('pickTarget', () => {
  it('picks the target that is closer in 2D, even if X is farther', () => {
    const attacker = self(100, 360, 500);
    const xNearYFar = target(150, 460, 0); // dx=50, dy=100 -> ~111.8
    const xFarYNear = target(180, 360, 0); // dx=80, dy=0   -> 80
    const tower = {
      x: 9999,
      y: 360,
      width: 60,
      isAlive: () => true,
      takeDamage: () => {},
    };
    const candidates = [asRangeTarget(xNearYFar), asRangeTarget(xFarYNear)];
    const picked = pickTarget(attacker, candidates, tower);
    expect(picked).toBe(candidates[1]);
  });

  it('returns null when no candidate is within range', () => {
    const attacker = self(100, 360, 50);
    const far = target(500, 360, 0);
    const tower = {
      x: 5000,
      y: 360,
      width: 60,
      isAlive: () => true,
      takeDamage: () => {},
    };
    expect(pickTarget(attacker, [asRangeTarget(far)], tower)).toBeNull();
  });

  it('picks tower when troops are out of range and tower is in range', () => {
    const attacker = self(100, 360, 200);
    const farTroop = target(500, 360, 0);
    const tower = {
      x: 250,
      y: 360,
      width: 60,
      isAlive: () => true,
      takeDamage: () => {},
    };
    const picked = pickTarget(attacker, [asRangeTarget(farTroop)], tower);
    expect(picked).toBe(tower);
  });

  it('skips dead troops', () => {
    const attacker = self(100, 360, 500);
    const dead = target(150, 360, 0, false);
    const alive = target(180, 360, 0, true);
    const tower = {
      x: 9999,
      y: 360,
      width: 60,
      isAlive: () => true,
      takeDamage: () => {},
    };
    const candidates = [asRangeTarget(dead), asRangeTarget(alive)];
    const picked = pickTarget(attacker, candidates, tower);
    expect(picked).toBe(candidates[1]);
  });
});
