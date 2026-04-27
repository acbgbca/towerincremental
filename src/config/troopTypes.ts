import type { TroopType, TroopStats } from '../game/types';

export const TROOP_TYPES: Record<TroopType, TroopStats> = {
  base:   { walkSpeed: 80, hp: 100, damage: 20, attackInterval: 500, cost: 25, width: 24, height: 36, range: 60  },
  archer: { walkSpeed: 80, hp: 80,  damage: 15, attackInterval: 350, cost: 35, width: 18, height: 30, range: 280 },
  tank:   { walkSpeed: 50, hp: 250, damage: 30, attackInterval: 800, cost: 60, width: 32, height: 48, range: 50  },
};

export const UNLOCK_COSTS: Partial<Record<TroopType, number>> = {
  archer: 200,
  tank:   400,
};

export const TROOP_LABELS: Record<TroopType, string> = {
  base:   'Base',
  archer: 'Archer',
  tank:   'Tank',
};
