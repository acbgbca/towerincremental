import { describe, it, expect } from 'vitest';
import { computeReward } from '../../src/game/systems/RewardSystem';
import { REWARD_PER_KILL, REWARD_PER_TOWER_DAMAGE } from '../../src/config/gameConfig';
import type { MatchState, MatchResult } from '../../src/game/types';

const win: MatchResult = { winner: 'player' };
const loss: MatchResult = { winner: 'enemy' };

function makeMatchState(troopsDefeated: number, towerDamageDealt: number): MatchState {
  return { money: 0, troopsDefeated, towerDamageDealt };
}

describe('computeReward', () => {
  it('returns 0 when no kills and no tower damage', () => {
    expect(computeReward(makeMatchState(0, 0), win)).toBe(0);
  });

  it('rewards kills only', () => {
    expect(computeReward(makeMatchState(4, 0), win)).toBe(4 * REWARD_PER_KILL);
  });

  it('rewards tower damage only', () => {
    expect(computeReward(makeMatchState(0, 100), win)).toBe(Math.floor(100 * REWARD_PER_TOWER_DAMAGE));
  });

  it('combines kills and tower damage for a clean win', () => {
    const expected = Math.floor(16 * REWARD_PER_KILL + 500 * REWARD_PER_TOWER_DAMAGE);
    expect(computeReward(makeMatchState(16, 500), win)).toBe(expected);
  });

  it('result is an integer (Math.floor applied)', () => {
    const reward = computeReward(makeMatchState(1, 1), win);
    expect(Number.isInteger(reward)).toBe(true);
  });

  it('loss still earns money', () => {
    expect(computeReward(makeMatchState(8, 250), loss)).toBeGreaterThan(0);
  });

  it('loss reward matches formula', () => {
    const expected = Math.floor(8 * REWARD_PER_KILL + 250 * REWARD_PER_TOWER_DAMAGE);
    expect(computeReward(makeMatchState(8, 250), loss)).toBe(expected);
  });
});
