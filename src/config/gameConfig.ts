import type { TroopStats } from '../game/types';

export const BOARD_WIDTH = 1280;
export const BOARD_HEIGHT = 720;

export const TOWER_WIDTH = 60;
export const TOWER_HEIGHT = 200;
export const TOWER_MARGIN = 20;

export const TROOP_BASE: TroopStats = {
  walkSpeed: 80,
  width: 24,
  height: 36,
  hp: 100,
  damage: 20,
  attackInterval: 500,
};
