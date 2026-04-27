import type { TroopStats, TroopType } from '../game/types';
import { TROOP_TYPES, UNLOCK_COSTS } from './troopTypes';

export const BOARD_WIDTH = 1280;
export const BOARD_HEIGHT = 720;

export const TOWER_WIDTH = 60;
export const TOWER_HEIGHT = 200;
export const TOWER_MARGIN = 20;

export const INCOME_RATE = 10; // money per second

export const TROOP_BASE: TroopStats = TROOP_TYPES.base;

export const TOWER = {
  maxHp: 500,
  attackTargetingMargin: 4,
};

export const ENEMY_LEVEL_STAT_STEP = { hp: 25, damage: 5 };

export const REWARD_PER_TROOP_DAMAGE = 0.05;
export const REWARD_PER_TOWER_DAMAGE = 0.2;

export const PRESTIGE_COST = 1000;

export const UNLOCK_COST_ARCHER = UNLOCK_COSTS.archer!;
export const UNLOCK_COST_TANK = UNLOCK_COSTS.tank!;

export function effectivePlayerStats(type: TroopType, prestigeTier: number): TroopStats {
  const base = TROOP_TYPES[type];
  return {
    ...base,
    hp: base.hp + prestigeTier * ENEMY_LEVEL_STAT_STEP.hp,
    damage: base.damage + prestigeTier * ENEMY_LEVEL_STAT_STEP.damage,
  };
}

export function effectiveEnemyStats(type: TroopType, enemyLevel: number): TroopStats {
  const base = TROOP_TYPES[type];
  return {
    ...base,
    hp: base.hp + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.hp,
    damage: base.damage + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.damage,
  };
}
