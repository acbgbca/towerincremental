import { REWARD_PER_KILL, REWARD_PER_TOWER_DAMAGE } from '../../config/gameConfig';
import type { MatchState, MatchResult } from '../types';

export function computeReward(matchState: MatchState, _result: MatchResult): number {
  return Math.floor(
    matchState.troopsDefeated * REWARD_PER_KILL
      + matchState.towerDamageDealt * REWARD_PER_TOWER_DAMAGE,
  );
}
