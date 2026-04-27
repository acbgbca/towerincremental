import { describe, it, expect } from 'vitest';
import { computeReward } from '../../src/game/systems/RewardSystem';
import { REWARD_PER_TROOP_DAMAGE, REWARD_PER_TOWER_DAMAGE } from '../../src/config/gameConfig';
import type { MatchState, MatchResult } from '../../src/game/types';

const win: MatchResult = { winner: 'player' };
const loss: MatchResult = { winner: 'enemy' };

function makeMatchState(troopDamageDealt: number, towerDamageDealt: number): MatchState {
  return { money: 0, troopDamageDealt, towerDamageDealt };
}

describe('computeReward', () => {
  it('returns 0 when no damage dealt', () => {
    expect(computeReward(makeMatchState(0, 0), win)).toBe(0);
  });

  it('rewards troop damage only', () => {
    expect(computeReward(makeMatchState(400, 0), win)).toBe(Math.floor(400 * REWARD_PER_TROOP_DAMAGE));
  });

  it('rewards tower damage only', () => {
    expect(computeReward(makeMatchState(0, 100), win)).toBe(Math.floor(100 * REWARD_PER_TOWER_DAMAGE));
  });

  it('combines troop damage and tower damage for a clean win', () => {
    const expected = Math.floor(1600 * REWARD_PER_TROOP_DAMAGE + 500 * REWARD_PER_TOWER_DAMAGE);
    expect(computeReward(makeMatchState(1600, 500), win)).toBe(expected);
  });

  it('result is an integer (Math.floor applied)', () => {
    const reward = computeReward(makeMatchState(1, 1), win);
    expect(Number.isInteger(reward)).toBe(true);
  });

  it('loss still earns money', () => {
    expect(computeReward(makeMatchState(800, 250), loss)).toBeGreaterThan(0);
  });

  it('loss reward matches formula', () => {
    const expected = Math.floor(800 * REWARD_PER_TROOP_DAMAGE + 250 * REWARD_PER_TOWER_DAMAGE);
    expect(computeReward(makeMatchState(800, 250), loss)).toBe(expected);
  });
});
